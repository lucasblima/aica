/**
 * useContextSource Hook
 * Track 3: Context Logic - FASE 2.2
 *
 * Intelligent context source hook that determines what question/prompt to show in the ContextCard
 * based on user state. Follows a 3-tier priority hierarchy:
 *
 * 1. Event-based: Upcoming calendar event in next 2 hours
 * 2. Journey-based: Active journey with blocked/incomplete state
 * 3. Daily Question: AI-generated or fallback question
 *
 * @see src/components/ContextCard/ContextCard.tsx
 * @see src/modules/journey/services/dailyQuestionService.ts
 * @see src/modules/journey/hooks/useJourneyValidation.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getDailyQuestionWithContext,
  saveDailyResponse,
} from '@/modules/journey/services/dailyQuestionService';
import { useJourneyValidation } from '@/modules/journey/hooks/useJourneyValidation';
import { getJourneySchema } from '@/data/journeySchemas';

// =====================================================
// TYPES
// =====================================================

export interface ContextSource {
  question: string;
  source: 'event' | 'journey' | 'daily';
  sourceLabel: string;
  metadata?: {
    eventId?: string;
    journeyId?: string;
    questionId?: string;
    eventTime?: Date;
  };
  onRespond: (response: string) => Promise<void>;
  onDismiss: () => void;
}

export interface UseContextSourceOptions {
  userId: string;
  eventLookahead?: number; // default: 2 hours
  enableAI?: boolean; // default: true
  activeJourneyId?: string;
}

export interface UseContextSourceReturn {
  context: ContextSource | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate unique ID for each context type to track dismissals
 */
function getContextId(context: ContextSource): string {
  if (context.source === 'event' && context.metadata?.eventId) {
    return `event-${context.metadata.eventId}`;
  }
  if (context.source === 'journey' && context.metadata?.journeyId) {
    return `journey-${context.metadata.journeyId}`;
  }
  if (context.source === 'daily' && context.metadata?.questionId) {
    return `daily-${context.metadata.questionId}`;
  }
  return `${context.source}-${Date.now()}`;
}

/**
 * PRIORITY 1: Check for upcoming calendar events
 * Returns event-based context if event exists within time window
 */
async function checkUpcomingEvents(
  userId: string,
  hoursAhead: number
): Promise<ContextSource | null> {
  try {
    console.log('[useContextSource] Checking upcoming events...');

    const now = new Date();
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    // Check if calendar_events table exists - graceful fallback
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time, description')
      .eq('user_id', userId)
      .gte('start_time', now.toISOString())
      .lte('start_time', futureTime.toISOString())
      .order('start_time', { ascending: true })
      .limit(1);

    if (error) {
      // Table might not exist - graceful fallback
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('[useContextSource] calendar_events table not found - skipping event check');
        return null;
      }
      throw error;
    }

    if (events && events.length > 0) {
      const event = events[0];
      const eventTime = new Date(event.start_time);
      const minutesUntil = Math.round((eventTime.getTime() - now.getTime()) / (60 * 1000));

      console.log('[useContextSource] Upcoming event found:', {
        title: event.title,
        minutesUntil,
      });

      return {
        question: `Você tem "${event.title}" em ${minutesUntil} minutos. Como você está se preparando?`,
        source: 'event',
        sourceLabel: 'Evento Próximo',
        metadata: {
          eventId: event.id,
          eventTime,
        },
        onRespond: async (response: string) => {
          console.log('[useContextSource] Event response:', response);
          // Save response to event_responses table
          await supabase.from('event_responses').insert({
            user_id: userId,
            event_id: event.id,
            response_text: response,
            responded_at: new Date().toISOString(),
          });
        },
        onDismiss: () => {
          console.log('[useContextSource] Event context dismissed');
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[useContextSource] Error checking upcoming events:', error);
    return null;
  }
}

/**
 * PRIORITY 2: Create journey-based context from validation results
 * Returns journey context if active journey is blocked
 */
function createJourneyContext(
  validation: { isBlocked: boolean; nextRequiredField: any },
  journey: { id: string; name: string },
  userId: string
): ContextSource | null {
  try {
    if (!validation.isBlocked || !validation.nextRequiredField) {
      return null;
    }

    const field = validation.nextRequiredField;
    console.log('[useContextSource] Creating journey context:', {
      journeyId: journey.id,
      field: field.key,
    });

    // Generate contextual question based on field
    const question = field.description
      ? `Para continuar sua trilha "${journey.name}", precisamos saber: ${field.description}`
      : `${field.label}?`;

    return {
      question,
      source: 'journey',
      sourceLabel: `Trilha: ${journey.name}`,
      metadata: {
        journeyId: journey.id,
      },
      onRespond: async (response: string) => {
        console.log('[useContextSource] Journey response:', {
          journeyId: journey.id,
          fieldKey: field.key,
          response,
        });

        // Fetch existing context to merge
        const { data: existingContext } = await supabase
          .from('journey_context')
          .select('data')
          .eq('user_id', userId)
          .eq('journey_id', journey.id)
          .single();

        // Merge new field with existing data
        const updatedData = {
          ...(existingContext?.data || {}),
          [field.key]: response,
        };

        // Save to journey_context table
        const { error } = await supabase
          .from('journey_context')
          .upsert({
            user_id: userId,
            journey_id: journey.id,
            data: updatedData,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,journey_id',
          });

        if (error) {
          console.error('[useContextSource] Error saving journey context:', error);
          throw error;
        }
      },
      onDismiss: () => {
        console.log('[useContextSource] Journey context dismissed');
      },
    };
  } catch (error) {
    console.error('[useContextSource] Error creating journey context:', error);
    return null;
  }
}

/**
 * PRIORITY 3: Fetch daily question (AI-driven or fallback)
 * Returns daily question as final fallback
 */
async function fetchDailyQuestion(
  userId: string,
  enableAI: boolean
): Promise<ContextSource | null> {
  try {
    console.log('[useContextSource] Fetching daily question...');

    const result = await getDailyQuestionWithContext(userId);

    console.log('[useContextSource] Daily question received:', {
      source: result.source,
      question: result.question.question_text,
    });

    return {
      question: result.question.question_text,
      source: 'daily',
      sourceLabel: result.source === 'ai' ? 'Reflexão IA' : 'Reflexão Diária',
      metadata: {
        questionId: result.question.id,
      },
      onRespond: async (response: string) => {
        console.log('[useContextSource] Daily question response:', response);
        await saveDailyResponse(
          userId,
          result.question.id,
          response,
          result.source
        );
      },
      onDismiss: () => {
        console.log('[useContextSource] Daily question dismissed');
      },
    };
  } catch (error) {
    console.error('[useContextSource] Error fetching daily question:', error);
    return null;
  }
}

// =====================================================
// MAIN HOOK
// =====================================================

export function useContextSource({
  userId,
  eventLookahead = 2,
  enableAI = true,
  activeJourneyId,
}: UseContextSourceOptions): UseContextSourceReturn {
  const [context, setContext] = useState<ContextSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Use existing validation hook for active journey
  const { isBlocked, nextRequiredField, schema } = useJourneyValidation(
    activeJourneyId || 'default',
    null,
    { autoValidate: !!activeJourneyId }
  );

  // Main fetch function - implements 3-tier priority cascade
  const fetchContext = useCallback(async () => {
    if (!userId) {
      console.log('[useContextSource] No userId provided');
      setContext(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useContextSource] Fetching context with priority cascade...');

      // PRIORITY 1: Check calendar events
      const eventContext = await checkUpcomingEvents(userId, eventLookahead);
      if (eventContext && !dismissed.includes(getContextId(eventContext))) {
        console.log('[useContextSource] Using event-based context');
        setContext({
          ...eventContext,
          onDismiss: () => {
            eventContext.onDismiss();
            setDismissed(prev => [...prev, getContextId(eventContext)]);
            // Re-fetch to get next priority
            fetchContext();
          },
        });
        return;
      }

      // PRIORITY 2: Check blocked journeys
      if (activeJourneyId && isBlocked && schema) {
        const journeyName = schema.journeyName || activeJourneyId;
        const journeyContext = createJourneyContext(
          { isBlocked, nextRequiredField },
          { id: activeJourneyId, name: journeyName },
          userId
        );

        if (journeyContext && !dismissed.includes(getContextId(journeyContext))) {
          console.log('[useContextSource] Using journey-based context');
          setContext({
            ...journeyContext,
            onDismiss: () => {
              journeyContext.onDismiss();
              setDismissed(prev => [...prev, getContextId(journeyContext)]);
              // Re-fetch to get next priority
              fetchContext();
            },
          });
          return;
        }
      }

      // PRIORITY 3: Daily question
      const dailyContext = await fetchDailyQuestion(userId, enableAI);
      if (dailyContext && !dismissed.includes(getContextId(dailyContext))) {
        console.log('[useContextSource] Using daily question context');
        setContext({
          ...dailyContext,
          onDismiss: () => {
            dailyContext.onDismiss();
            setDismissed(prev => [...prev, getContextId(dailyContext)]);
            setContext(null); // No more fallbacks
          },
        });
        return;
      }

      // No context available
      console.log('[useContextSource] No context available');
      setContext(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching context';
      console.error('[useContextSource] Error:', err);
      setError(errorMessage);
      setContext(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, eventLookahead, activeJourneyId, dismissed, isBlocked, nextRequiredField, schema, enableAI]);

  // Fetch context on mount and when dependencies change
  useEffect(() => {
    console.log('[useContextSource] Effect triggered - fetching context');
    fetchContext();
  }, [fetchContext]);

  // Refresh function for manual re-fetch
  const refresh = useCallback(async () => {
    console.log('[useContextSource] Manual refresh triggered');
    setDismissed([]); // Clear dismissed list on manual refresh
    await fetchContext();
  }, [fetchContext]);

  return {
    context,
    isLoading,
    error,
    refresh,
  };
}
