/**
 * useWorkspaceState - Hook to load and hydrate podcast workspace state
 * Loads episode data from Supabase and initializes workspace context
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { PodcastWorkspaceState, WorkspaceLoadResult } from '@/modules/studio/types';
import { createInitialState } from '@/modules/studio/context/PodcastWorkspaceContext';
import type { Topic, TopicCategory } from '@/modules/studio/types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useWorkspaceState');

interface UseWorkspaceStateOptions {
  episodeId: string;
  showId: string;
  showTitle: string;
  onLoad?: (state: PodcastWorkspaceState) => void;
}

export function useWorkspaceState({
  episodeId,
  showId,
  showTitle,
  onLoad,
}: UseWorkspaceStateOptions): WorkspaceLoadResult {
  const [state, setState] = useState<PodcastWorkspaceState>(() =>
    createInitialState(episodeId, showId, showTitle)
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEpisodeData() {
      try {
        setIsLoading(true);
        setError(null);

        log.debug('[useWorkspaceState] Loading episode:', episodeId);

        // Load episode data
        const { data: episode, error: episodeError } = await supabase
          .from('podcast_episodes')
          .select('*')
          .eq('id', episodeId)
          .single();

        log.debug('[useWorkspaceState] Episode query result:', { episode, episodeError });
        log.debug('[useWorkspaceState] Episode biography:', episode?.biography);
        log.debug('[useWorkspaceState] Episode data:', JSON.stringify(episode, null, 2));

        if (episodeError) throw episodeError;
        if (!episode) throw new Error('Episode not found');

        // Load topics
        const { data: topics, error: topicsError } = await supabase
          .from('podcast_topics')
          .select('*')
          .eq('episode_id', episodeId)
          .eq('archived', false)
          .order('order', { ascending: true });

        if (topicsError) throw topicsError;

        // Load categories
        const { data: categories, error: categoriesError } = await supabase
          .from('podcast_topic_categories')
          .select('*')
          .eq('episode_id', episodeId);

        if (categoriesError) throw categoriesError;

        // Map database episode to workspace state
        const hydratedState: PodcastWorkspaceState = {
          ...createInitialState(episodeId, showId, showTitle),

          // Setup stage
          setup: {
            guestType: episode.guest_name ? 'public_figure' : null, // Infer from data
            guestName: episode.guest_name || '',
            guestReference: episode.guest_reference || '',
            // guestBio is a temporary UI-only field, not loaded from DB
            // The actual biography comes from research.dossier.biography
            guestBio: '',
            guestContactId: episode.guest_contact_id || null,
            phone: episode.guest_phone || '',
            email: '',
            theme: episode.episode_theme || '',
            themeMode: 'manual',
            season: episode.season || '',
            location: episode.location || '',
            scheduledDate: episode.scheduled_date || '',
            scheduledTime: episode.scheduled_time || '',
            isSearching: false,
            searchResults: null,
          },

          // Research stage
          research: {
            dossier: episode.biography ? {
              guestName: episode.guest_name || '',
              episodeTheme: episode.episode_theme || '',
              biography: episode.biography || '',
              technicalSheet: episode.technical_sheet || undefined,
              controversies: episode.controversies || [],
              suggestedTopics: episode.suggested_topics || [],
              iceBreakers: episode.ice_breakers || [],
            } : null,
            customSources: [], // Not persisted in DB
            isGenerating: false,
            lastGenerated: episode.biography ? new Date(episode.updated_at) : null,
            error: null,
            deepResearch: episode.deep_research || null,
            suggestionCards: [],
            isAnalyzingGaps: false,
            fileSearchStoreId: null,
            chatOpen: false,
          },

          // Pauta stage
          pauta: {
            topics: (topics || []).map((t: any) => ({
              id: t.id,
              text: t.question_text,
              completed: t.completed,
              order: t.order,
              archived: t.archived,
              categoryId: t.category_id,
              sponsorScript: t.sponsor_script,
            })),
            categories: (categories || []).map((c: any) => ({
              id: c.id,
              episode_id: c.episode_id,
              name: c.name,
              color: c.color,
              description: c.description,
              icon: c.icon,
            })),
            savedPautas: [], // Will be loaded separately if needed
            activePautaId: null,
            isGenerating: false,
          },

          // Production stage
          production: {
            isRecording: false,
            isPaused: false,
            duration: episode.recording_duration || 0,
            startedAt: episode.recording_started_at ? new Date(episode.recording_started_at) : null,
            finishedAt: episode.recording_finished_at ? new Date(episode.recording_finished_at) : null,
            currentTopicId: null,
            recordingFilePath: episode.recording_file_path || null,
          },

          // Determine initial stage based on data
          currentStage: determineInitialStage(episode, topics),
          visitedStages: determineVisitedStages(episode, topics),
        };

        log.debug('[useWorkspaceState] Hydrated state:', {
          currentStage: hydratedState.currentStage,
          visitedStages: hydratedState.visitedStages,
          hasDossier: !!hydratedState.research.dossier,
          hasTopics: hydratedState.pauta.topics.length,
          isLoading: false
        });
        log.debug('[useWorkspaceState] Should transition to:', episode?.biography ? 'research' : 'setup');

        setState(hydratedState);
        onLoad?.(hydratedState);

      } catch (err: any) {
        log.error('[useWorkspaceState] Error loading episode:', err);
        setError(err.message || 'Failed to load episode data');
      } finally {
        setIsLoading(false);
      }
    }

    loadEpisodeData();
  }, [episodeId, showId, showTitle, onLoad]);

  return {
    state: {
      ...state,
      isLoading,
      error,
    },
    error,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determines the initial stage to show based on episode data
 *
 * Fix for #663: Previously only checked biography to skip past setup,
 * which forced users back to "Configuracao" even when guest_name and theme
 * were already filled in from the wizard. Now checks guest_name + theme
 * as a signal that setup is complete.
 */
function determineInitialStage(episode: any, topics: any[]): 'setup' | 'research' | 'pauta' | 'production' {
  // If recording started, go to production
  if (episode.recording_started_at) {
    return 'production';
  }

  // If topics exist, go to pauta
  if (topics && topics.length > 0) {
    return 'pauta';
  }

  // If dossier exists, go to research (user can review/regenerate)
  if (episode.biography) {
    return 'research';
  }

  // If guest name and theme are set (from wizard), skip setup to research
  // so the user isn't forced to redo configuration (#663)
  if (episode.guest_name?.trim() && episode.episode_theme?.trim()) {
    return 'research';
  }

  // Otherwise start at setup
  return 'setup';
}

/**
 * Determines which stages have been visited based on episode data
 */
function determineVisitedStages(episode: any, topics: any[]): ('setup' | 'research' | 'pauta' | 'production')[] {
  const visited: ('setup' | 'research' | 'pauta' | 'production')[] = ['setup'];

  // Mark research as visited if biography exists OR if setup was completed (guest_name + theme)
  if (episode.biography || (episode.guest_name?.trim() && episode.episode_theme?.trim())) {
    if (!visited.includes('research')) visited.push('research');
  }

  if (topics && topics.length > 0) {
    if (!visited.includes('pauta')) visited.push('pauta');
  }

  if (episode.recording_started_at) {
    if (!visited.includes('production')) visited.push('production');
  }

  return visited;
}
