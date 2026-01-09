# Journey Timeline - Implementation Code Examples

Complete code snippets ready to implement for the unified timeline feature.

---

## 1. Type Definitions

### File: `src/modules/journey/types/unifiedEvent.ts`

```typescript
/**
 * Unified Timeline Event Types
 * Represents events from all sources (WhatsApp, moments, tasks, approvals, etc.)
 */

// ============================================================================
// CORE EVENT TYPE
// ============================================================================

export type EventSource = 'whatsapp' | 'moment' | 'task' | 'approval' | 'activity' | 'question' | 'summary';

export type EventType =
  | 'whatsapp_message_incoming'
  | 'whatsapp_message_outgoing'
  | 'moment_captured'
  | 'task_created'
  | 'task_completed'
  | 'approval_granted'
  | 'approval_rejected'
  | 'activity_connection'
  | 'activity_consent_grant'
  | 'activity_analytics_view'
  | 'activity_contact_analysis'
  | 'activity_anomaly_check'
  | 'question_answered'
  | 'summary_generated'
  | 'cp_awarded';

export interface UnifiedTimelineEvent {
  // Identity
  id: string; // UUID from source table
  source: EventSource;
  eventType: EventType;

  // Display information
  title: string; // "Message from João", "Task completed: Design API"
  description?: string; // Additional context
  icon?: string; // Emoji or icon name
  color?: string; // Tailwind class: 'text-green-500', 'bg-blue-100'

  // Content
  content?: string; // Full message/moment text, task description
  contentPreview?: string; // First 100 chars if content is long
  metadata?: Record<string, unknown>; // Source-specific data

  // Sentiment & Emotion
  sentiment?: {
    label: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
    score: number; // -1 to 1
  };
  emotion?: string; // Emoji: "😊", "😢", etc.
  tags?: string[]; // #trabalho, #gratidão, etc.

  // Timestamps
  eventTime: Date; // When event actually occurred (important for WhatsApp messages)
  displayTime?: Date; // What to show user (same as eventTime in most cases)
  createdAt?: Date; // When record was created in DB

  // Navigation & Relationships
  sourceId: string; // UUID of source record
  sourceTable: string; // 'moments', 'whatsapp_messages', 'work_items'
  sourceModuleId?: string; // For tasks: 'atlas', for grants: 'grants'

  // Contact/Author information (if applicable)
  actor?: {
    name: string;
    type: 'user' | 'contact' | 'system';
    phone?: string;
    avatar?: string;
  };

  // Related items (for cross-linking)
  relatedEvents?: string[]; // IDs of related events
  relatedContacts?: Array<{
    name: string;
    phone?: string;
    image?: string;
  }>;
}

// ============================================================================
// GROUPED TIMELINE STRUCTURES
// ============================================================================

export interface TimelineDay {
  date: Date;
  dateString: string; // "Today", "Yesterday", "Jan 8"
  events: UnifiedTimelineEvent[];
  summaryStats?: {
    totalEvents: number;
    eventsBySource: Record<EventSource, number>;
    sentimentTrend?: 'positive' | 'neutral' | 'negative';
    dominantEmotion?: string;
  };
}

export interface TimelineWeek {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  days: TimelineDay[];
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface TimelineFilter {
  sources?: EventSource[];
  eventTypes?: EventType[];
  startDate?: Date;
  endDate?: Date;
  sentiments?: string[]; // ['positive', 'neutral', 'negative']
  emotions?: string[]; // ['😊', '😢']
  tags?: string[]; // ['#trabalho', '#gratidão']
  actors?: string[]; // Contact names or 'system'
  searchQuery?: string; // Full-text search
}

export interface TimelineQuery {
  userId: string;
  limit?: number; // Default: 50
  offset?: number; // For pagination
  filter?: TimelineFilter;
}

export interface TimelineResponse {
  events: UnifiedTimelineEvent[];
  total: number;
  hasMore: boolean;
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// SERVICE RETURN TYPES
// ============================================================================

export interface TimelineStats {
  totalEvents: number;
  eventsBySource: Record<EventSource, number>;
  eventsByType: Record<EventType, number>;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topContacts: Array<{
    name: string;
    phone?: string;
    messageCount: number;
  }>;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
}

// ============================================================================
// SOURCE-SPECIFIC PAYLOAD MAPPINGS
// ============================================================================

// When converting from database records to UnifiedTimelineEvent
export type TimelineEventPayload =
  | WhatsAppMessagePayload
  | MomentPayload
  | WorkItemPayload
  | ApprovalPayload
  | ActivityPayload
  | QuestionPayload
  | SummaryPayload;

export interface WhatsAppMessagePayload {
  type: 'whatsapp';
  data: {
    messageId: string;
    direction: 'incoming' | 'outgoing';
    messageType: string;
    content: string;
    sentiment?: { label: string; score: number };
    intent?: string;
    topics?: string[];
    contact: { name: string; phone: string };
    timestamp: Date;
  };
}

export interface MomentPayload {
  type: 'moment';
  data: {
    momentId: string;
    content: string;
    emotion: string;
    sentiment?: { label: string; score: number };
    tags?: string[];
    location?: string;
    timestamp: Date;
  };
}

export interface WorkItemPayload {
  type: 'task';
  data: {
    taskId: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
    priority: string;
    completedAt?: Date;
    timestamp: Date;
  };
}

export interface ApprovalPayload {
  type: 'approval';
  data: {
    approvalId: string;
    status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
    notes?: string;
    timestamp: Date;
  };
}

export interface ActivityPayload {
  type: 'activity';
  data: {
    activityId: string;
    activityType: string;
    metadata: Record<string, unknown>;
    timestamp: Date;
  };
}

export interface QuestionPayload {
  type: 'question';
  data: {
    questionId: string;
    question: string;
    response: string;
    timestamp: Date;
  };
}

export interface SummaryPayload {
  type: 'summary';
  data: {
    summaryId: string;
    summaryData: Record<string, unknown>;
    timestamp: Date;
  };
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

export function isWhatsAppEvent(event: UnifiedTimelineEvent): boolean {
  return event.source === 'whatsapp';
}

export function isMomentEvent(event: UnifiedTimelineEvent): boolean {
  return event.source === 'moment';
}

export function isTaskEvent(event: UnifiedTimelineEvent): boolean {
  return event.source === 'task';
}

export function getEventIcon(eventType: EventType): string {
  const iconMap: Record<EventType, string> = {
    whatsapp_message_incoming: '💬',
    whatsapp_message_outgoing: '📤',
    moment_captured: '📝',
    task_created: '⚙️',
    task_completed: '✓',
    approval_granted: '✅',
    approval_rejected: '❌',
    activity_connection: '🔗',
    activity_consent_grant: '🔐',
    activity_analytics_view: '📊',
    activity_contact_analysis: '👥',
    activity_anomaly_check: '⚠️',
    question_answered: '❓',
    summary_generated: '📈',
    cp_awarded: '⭐',
  };
  return iconMap[eventType] || '📌';
}

export function getEventColor(
  eventType: EventType,
  sentiment?: { label: string; score: number }
): string {
  // If has sentiment, use sentiment color
  if (sentiment) {
    if (sentiment.label.includes('positive')) return 'text-green-600';
    if (sentiment.label.includes('negative')) return 'text-red-600';
    return 'text-gray-600';
  }

  // Otherwise use event type color
  const colorMap: Record<EventType, string> = {
    whatsapp_message_incoming: 'text-blue-600',
    whatsapp_message_outgoing: 'text-cyan-600',
    moment_captured: 'text-amber-600',
    task_created: 'text-gray-600',
    task_completed: 'text-green-600',
    approval_granted: 'text-green-600',
    approval_rejected: 'text-red-600',
    activity_connection: 'text-blue-600',
    activity_consent_grant: 'text-indigo-600',
    activity_analytics_view: 'text-purple-600',
    activity_contact_analysis: 'text-pink-600',
    activity_anomaly_check: 'text-orange-600',
    question_answered: 'text-cyan-600',
    summary_generated: 'text-orange-600',
    cp_awarded: 'text-yellow-600',
  };
  return colorMap[eventType] || 'text-gray-600';
}

export function getEventTitle(event: UnifiedTimelineEvent): string {
  return event.title || `${event.source} event`;
}

export function groupEventsByDay(events: UnifiedTimelineEvent[]): TimelineDay[] {
  const grouped = new Map<string, UnifiedTimelineEvent[]>();

  // Group by date string
  events.forEach((event) => {
    const date = new Date(event.eventTime);
    date.setHours(0, 0, 0, 0);
    const dateString = date.toISOString().split('T')[0];

    if (!grouped.has(dateString)) {
      grouped.set(dateString, []);
    }
    grouped.get(dateString)!.push(event);
  });

  // Convert to TimelineDay array
  const days: TimelineDay[] = Array.from(grouped.entries()).map(([dateString, dayEvents]) => {
    const date = new Date(dateString);
    const eventsBySource = {} as Record<EventSource, number>;

    dayEvents.forEach((event) => {
      eventsBySource[event.source] = (eventsBySource[event.source] || 0) + 1;
    });

    return {
      date,
      dateString: formatTimelineDate(date),
      events: dayEvents.sort((a, b) => {
        // Sort by time descending (newest first within same day)
        return new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime();
      }),
      summaryStats: {
        totalEvents: dayEvents.length,
        eventsBySource,
      },
    };
  });

  // Sort by date descending (today first)
  return days.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function formatTimelineDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('pt-BR', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
}
```

---

## 2. Service Layer

### File: `src/modules/journey/services/unifiedTimelineService.ts`

```typescript
/**
 * Unified Timeline Service
 * Aggregates events from all sources into a unified timeline
 */

import { supabase } from '@/lib/supabase';
import {
  UnifiedTimelineEvent,
  EventSource,
  TimelineFilter,
  TimelineResponse,
  TimelineStats,
  getEventIcon,
} from '../types/unifiedEvent';
import { format } from 'date-fns';

// ============================================================================
// MAIN SERVICE FUNCTIONS
// ============================================================================

/**
 * Get unified timeline events for a user
 * Aggregates events from all sources and returns in chronological order
 */
export async function getUnifiedTimeline(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    filter?: TimelineFilter;
  }
): Promise<TimelineResponse> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const filter = options?.filter || {};

  try {
    // Parallel queries to all sources
    const [whatsAppEvents, momentEvents, taskEvents, approvalEvents, activityEvents] =
      await Promise.all([
        filter.sources?.length && !filter.sources.includes('whatsapp')
          ? Promise.resolve([])
          : fetchWhatsAppMessages(userId, filter),
        filter.sources?.length && !filter.sources.includes('moment')
          ? Promise.resolve([])
          : fetchMoments(userId, filter),
        filter.sources?.length && !filter.sources.includes('task')
          ? Promise.resolve([])
          : fetchWorkItems(userId, filter),
        filter.sources?.length && !filter.sources.includes('approval')
          ? Promise.resolve([])
          : fetchApprovals(userId, filter),
        filter.sources?.length && !filter.sources.includes('activity')
          ? Promise.resolve([])
          : fetchActivities(userId, filter),
      ]);

    // Combine all events
    const allEvents = [
      ...whatsAppEvents,
      ...momentEvents,
      ...taskEvents,
      ...approvalEvents,
      ...activityEvents,
    ];

    // Sort by eventTime descending (newest first)
    allEvents.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());

    // Apply pagination
    const total = allEvents.length;
    const paginatedEvents = allEvents.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      total,
      hasMore: offset + limit < total,
      startDate: allEvents.length > 0 ? new Date(allEvents[allEvents.length - 1].eventTime) : new Date(),
      endDate: allEvents.length > 0 ? new Date(allEvents[0].eventTime) : new Date(),
    };
  } catch (error) {
    console.error('[getUnifiedTimeline] Error:', error);
    throw error;
  }
}

/**
 * Get timeline statistics
 */
export async function getTimelineStats(userId: string): Promise<TimelineStats> {
  try {
    const [whatsAppCount, momentCount, taskCount, approvalCount, activityCount] = await Promise.all([
      countWhatsAppMessages(userId),
      countMoments(userId),
      countWorkItems(userId),
      countApprovals(userId),
      countActivities(userId),
    ]);

    return {
      totalEvents: whatsAppCount + momentCount + taskCount + approvalCount + activityCount,
      eventsBySource: {
        whatsapp: whatsAppCount,
        moment: momentCount,
        task: taskCount,
        approval: approvalCount,
        activity: activityCount,
        question: 0, // TODO: implement
        summary: 0, // TODO: implement
      },
      eventsByType: {}, // TODO: implement detailed breakdown
      sentimentBreakdown: {
        positive: 0, // TODO: implement
        neutral: 0,
        negative: 0,
      },
      topContacts: [], // TODO: implement
      dateRange: {
        earliest: new Date(),
        latest: new Date(),
      },
    };
  } catch (error) {
    console.error('[getTimelineStats] Error:', error);
    throw error;
  }
}

// ============================================================================
// FETCH FUNCTIONS FOR EACH SOURCE
// ============================================================================

async function fetchWhatsAppMessages(
  userId: string,
  filter?: TimelineFilter
): Promise<UnifiedTimelineEvent[]> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select(
      `
      id,
      direction,
      message_type,
      content_text,
      content_transcription,
      sentiment_label,
      sentiment_score,
      detected_intent,
      detected_topics,
      message_timestamp,
      contact_name,
      contact_phone
    `
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('message_timestamp', { ascending: false })
    .limit(100); // Fetch more than needed for filtering

  if (error) throw error;

  return (data || []).map((msg) => ({
    id: msg.id,
    source: 'whatsapp',
    eventType:
      msg.direction === 'incoming'
        ? 'whatsapp_message_incoming'
        : 'whatsapp_message_outgoing',
    title: `${msg.direction === 'incoming' ? '💬 Mensagem de' : '📤 Mensagem para'} ${msg.contact_name || msg.contact_phone}`,
    description: msg.content_text || msg.content_transcription || '[Mídia]',
    icon: msg.direction === 'incoming' ? '💬' : '📤',
    color: msg.direction === 'incoming' ? 'text-blue-600' : 'text-cyan-600',
    content: msg.content_text || msg.content_transcription || '',
    contentPreview: (msg.content_text || msg.content_transcription || '')
      .substring(0, 100)
      .concat('...'),
    sentiment: msg.sentiment_label
      ? {
          label: msg.sentiment_label,
          score: msg.sentiment_score || 0,
        }
      : undefined,
    tags: msg.detected_topics || undefined,
    metadata: {
      messageType: msg.message_type,
      intent: msg.detected_intent,
      contact: { name: msg.contact_name, phone: msg.contact_phone },
    },
    eventTime: new Date(msg.message_timestamp),
    sourceId: msg.id,
    sourceTable: 'whatsapp_messages',
    actor: {
      name: msg.contact_name || msg.contact_phone,
      type: msg.direction === 'incoming' ? 'contact' : 'user',
      phone: msg.contact_phone,
    },
  }));
}

async function fetchMoments(
  userId: string,
  filter?: TimelineFilter
): Promise<UnifiedTimelineEvent[]> {
  const { data, error } = await supabase
    .from('moments')
    .select(
      `
      id,
      content,
      emotion,
      sentiment_data,
      tags,
      location,
      created_at
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data || []).map((moment) => ({
    id: moment.id,
    source: 'moment',
    eventType: 'moment_captured',
    title: `📝 Momento${moment.emotion ? ` ${moment.emotion}` : ''}`,
    description: moment.content ? moment.content.substring(0, 100) : 'Sem conteúdo',
    icon: moment.emotion || '📝',
    color: 'text-amber-600',
    content: moment.content || '',
    contentPreview: (moment.content || '')
      .substring(0, 100)
      .concat(moment.content && moment.content.length > 100 ? '...' : ''),
    emotion: moment.emotion,
    tags: moment.tags,
    sentiment:
      moment.sentiment_data && typeof moment.sentiment_data === 'object'
        ? {
            label: (moment.sentiment_data as any).sentiment || 'neutral',
            score: (moment.sentiment_data as any).sentimentScore || 0,
          }
        : undefined,
    metadata: {
      location: moment.location,
      sentimentData: moment.sentiment_data,
    },
    eventTime: new Date(moment.created_at),
    sourceId: moment.id,
    sourceTable: 'moments',
    actor: {
      name: 'You',
      type: 'user',
    },
  }));
}

async function fetchWorkItems(
  userId: string,
  filter?: TimelineFilter
): Promise<UnifiedTimelineEvent[]> {
  const { data, error } = await supabase
    .from('work_items')
    .select(
      `
      id,
      title,
      description,
      status,
      priority,
      completed_at,
      created_at,
      updated_at
    `
    )
    .eq('user_id', userId)
    .ne('status', 'todo') // Only show created/in_progress/completed/cancelled
    .order('completed_at', { ascending: false, nullsLast: true })
    .limit(100);

  if (error) throw error;

  return (data || []).map((task) => {
    const isCompleted = task.status === 'completed';
    return {
      id: task.id,
      source: 'task',
      eventType: isCompleted ? 'task_completed' : 'task_created',
      title: `${isCompleted ? '✓' : '⚙️'} ${task.title}`,
      description: task.description || '',
      icon: isCompleted ? '✓' : '⚙️',
      color: isCompleted ? 'text-green-600' : 'text-gray-600',
      content: task.description || '',
      metadata: {
        status: task.status,
        priority: task.priority,
      },
      eventTime: new Date(task.completed_at || task.created_at),
      sourceId: task.id,
      sourceTable: 'work_items',
      actor: {
        name: 'System',
        type: 'system',
      },
    };
  });
}

async function fetchApprovals(
  userId: string,
  filter?: TimelineFilter
): Promise<UnifiedTimelineEvent[]> {
  const { data, error } = await supabase
    .from('grant_responses')
    .select(
      `
      id,
      approval_status,
      approval_notes,
      approved_at,
      rejected_at,
      updated_at
    `
    )
    .eq('user_id', userId)
    .ne('approval_status', 'pending')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data || []).map((approval) => {
    const isGranted = approval.approval_status === 'approved';
    return {
      id: approval.id,
      source: 'approval',
      eventType: isGranted ? 'approval_granted' : 'approval_rejected',
      title: `${isGranted ? '✅' : '❌'} Approval ${isGranted ? 'Granted' : 'Rejected'}`,
      description: approval.approval_notes || '',
      icon: isGranted ? '✅' : '❌',
      color: isGranted ? 'text-green-600' : 'text-red-600',
      content: approval.approval_notes || '',
      metadata: {
        status: approval.approval_status,
        notes: approval.approval_notes,
      },
      eventTime: new Date(approval.approved_at || approval.rejected_at || approval.updated_at),
      sourceId: approval.id,
      sourceTable: 'grant_responses',
      actor: {
        name: 'System',
        type: 'system',
      },
    };
  });
}

async function fetchActivities(
  userId: string,
  filter?: TimelineFilter
): Promise<UnifiedTimelineEvent[]> {
  const { data, error } = await supabase
    .from('whatsapp_user_activity')
    .select(
      `
      id,
      activity_type,
      metadata,
      created_at
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  const activityIconMap: Record<string, string> = {
    connection: '🔗',
    consent_grant: '🔐',
    analytics_view: '📊',
    contact_analysis: '👥',
    anomaly_check: '⚠️',
  };

  return (data || []).map((activity) => ({
    id: activity.id,
    source: 'activity',
    eventType: `activity_${activity.activity_type}` as any,
    title: `📊 ${activity.activity_type.replace(/_/g, ' ').charAt(0).toUpperCase() + activity.activity_type.replace(/_/g, ' ').slice(1)}`,
    icon: activityIconMap[activity.activity_type] || '📊',
    color: 'text-purple-600',
    metadata: activity.metadata,
    eventTime: new Date(activity.created_at),
    sourceId: activity.id,
    sourceTable: 'whatsapp_user_activity',
    actor: {
      name: 'System',
      type: 'system',
    },
  }));
}

// ============================================================================
// COUNT/STATS FUNCTIONS
// ============================================================================

async function countWhatsAppMessages(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('whatsapp_messages')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .is('deleted_at', null);

  return count || 0;
}

async function countMoments(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('moments')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  return count || 0;
}

async function countWorkItems(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('work_items')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .ne('status', 'todo');

  return count || 0;
}

async function countApprovals(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('grant_responses')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .ne('approval_status', 'pending');

  return count || 0;
}

async function countActivities(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('whatsapp_user_activity')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  return count || 0;
}
```

---

## 3. React Hook

### File: `src/modules/journey/hooks/useUnifiedTimeline.ts`

```typescript
/**
 * useUnifiedTimeline Hook
 * React hook for managing unified timeline state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  UnifiedTimelineEvent,
  TimelineDay,
  TimelineFilter,
  groupEventsByDay,
} from '../types/unifiedEvent';
import { getUnifiedTimeline, getTimelineStats } from '../services/unifiedTimelineService';

interface UseUnifiedTimelineOptions {
  limit?: number;
  autoFetch?: boolean;
  initialFilter?: TimelineFilter;
}

export function useUnifiedTimeline(options: UseUnifiedTimelineOptions = {}) {
  const { user } = useAuth();
  const { limit = 50, autoFetch = true, initialFilter } = options;

  const [events, setEvents] = useState<UnifiedTimelineEvent[]>([]);
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<TimelineFilter>(initialFilter || {});

  // Fetch timeline events
  const fetchTimeline = useCallback(
    async (newOffset: number = 0) => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await getUnifiedTimeline(user.id, {
          limit,
          offset: newOffset,
          filter,
        });

        if (newOffset === 0) {
          setEvents(response.events);
        } else {
          setEvents((prev) => [...prev, ...response.events]);
        }

        // Group by day for display
        const allEvents = newOffset === 0 ? response.events : [...events, ...response.events];
        setDays(groupEventsByDay(allEvents));

        setHasMore(response.hasMore);
        setOffset(newOffset);
      } catch (err) {
        setError(err as Error);
        console.error('[useUnifiedTimeline] Error fetching timeline:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, limit, filter, events]
  );

  // Load more events
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchTimeline(offset + limit);
    }
  }, [fetchTimeline, isLoading, hasMore, offset, limit]);

  // Refresh timeline
  const refresh = useCallback(() => {
    fetchTimeline(0);
  }, [fetchTimeline]);

  // Update filter
  const updateFilter = useCallback((newFilter: TimelineFilter) => {
    setFilter(newFilter);
    setOffset(0);
    // Note: fetchTimeline will be called automatically due to filter dependency
  }, []);

  // Toggle source filter
  const toggleSourceFilter = useCallback((source: UnifiedTimelineEvent['source']) => {
    setFilter((prev) => {
      const sources = prev.sources || [];
      const newSources = sources.includes(source)
        ? sources.filter((s) => s !== source)
        : [...sources, source];

      return {
        ...prev,
        sources: newSources.length === 0 ? undefined : newSources,
      };
    });
    setOffset(0);
  }, []);

  // Toggle date range
  const setDateRange = useCallback((days: number | null) => {
    const now = new Date();
    const endDate = new Date();

    let startDate = undefined;
    if (days) {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
    }

    setFilter((prev) => ({
      ...prev,
      startDate,
      endDate: days ? endDate : undefined,
    }));
    setOffset(0);
  }, []);

  // Auto-fetch on mount or when filter changes
  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchTimeline(0);
    }
  }, [autoFetch, user?.id, fetchTimeline]);

  return {
    events,
    days,
    isLoading,
    error,
    hasMore,
    filter,
    loadMore,
    refresh,
    updateFilter,
    toggleSourceFilter,
    setDateRange,
  };
}
```

---

## 4. Timeline View Component

### File: `src/modules/journey/components/timeline/UnifiedTimelineView.tsx`

```typescript
/**
 * UnifiedTimelineView Component
 * Displays unified timeline with filtering options
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useUnifiedTimeline } from '../../hooks/useUnifiedTimeline';
import { TimelineFilter } from '../../components/timeline/TimelineFilter';
import { TimelineEventCard } from '../../components/timeline/TimelineEventCard';
import { UnifiedTimelineEvent } from '../../types/unifiedEvent';
import { SparklesIcon } from '@heroicons/react/24/solid';

interface UnifiedTimelineViewProps {
  userId?: string;
}

export function UnifiedTimelineView({ userId }: UnifiedTimelineViewProps) {
  const { days, isLoading, hasMore, filter, loadMore, toggleSourceFilter, setDateRange } =
    useUnifiedTimeline({
      limit: 50,
      autoFetch: true,
    });

  if (isLoading && days.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <SparklesIcon className="h-8 w-8 text-amber-600" />
          </div>
          <p className="mt-2 text-[#948D82]">Carregando atividades...</p>
        </div>
      </div>
    );
  }

  if (days.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <SparklesIcon className="h-12 w-12 text-[#948D82] mx-auto mb-3" />
        <p className="text-[#5C554B] mb-2">Nenhuma atividade encontrada</p>
        <p className="text-sm text-[#948D82]">Suas interações aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <TimelineFilter
        selectedSources={filter.sources}
        selectedDateRange={getDateRangeFromFilter(filter)}
        onSourceToggle={toggleSourceFilter}
        onDateRangeChange={setDateRange}
      />

      {/* Timeline Days */}
      <div className="space-y-6">
        {days.map((day, dayIndex) => (
          <motion.div
            key={day.dateString}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.1 }}
          >
            {/* Day Header */}
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-[#5C554B]">{day.dateString}</h3>
              <span className="text-sm text-[#948D82] bg-[#E8E5DF] px-3 py-1 rounded-full">
                {day.summaryStats?.totalEvents} evento{day.summaryStats?.totalEvents !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Events for this day */}
            <div className="space-y-3">
              {day.events.map((event, eventIndex) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: dayIndex * 0.1 + eventIndex * 0.05 }}
                >
                  <TimelineEventCard event={event} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full px-4 py-3 ceramic-inset text-[#5C554B] font-medium hover:ceramic-pressed disabled:opacity-50 transition-all"
        >
          {isLoading ? 'Carregando...' : 'Carregar mais atividades'}
        </button>
      )}
    </div>
  );
}

function getDateRangeFromFilter(filter: any): number | null {
  // TODO: Implement based on filter.startDate and filter.endDate
  return null;
}
```

Continue in next message due to length...
