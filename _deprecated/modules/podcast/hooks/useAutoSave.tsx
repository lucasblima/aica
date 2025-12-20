/**
 * useAutoSave - Auto-save hook with debounce
 * Automatically saves workspace state changes to Supabase with 2-second debounce
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../../src/services/supabaseClient';
import type { PodcastWorkspaceState } from '../types/workspace';

interface UseAutoSaveOptions {
  state: PodcastWorkspaceState;
  enabled?: boolean;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useAutoSave({
  state,
  enabled = true,
  debounceMs = 2000,
  onSaveStart,
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousStateRef = useRef<PodcastWorkspaceState>(state);
  const isSavingRef = useRef(false);

  const saveToDatabase = useCallback(async (currentState: PodcastWorkspaceState) => {
    if (isSavingRef.current) {
      console.log('[useAutoSave] Save already in progress, skipping');
      return;
    }

    isSavingRef.current = true;
    onSaveStart?.();

    try {
      console.log('[useAutoSave] Saving workspace state...');

      // Save episode data (setup + research + production)
      const episodeUpdate = {
        // Setup fields
        guest_name: currentState.setup.guestName,
        guest_reference: currentState.setup.guestReference,
        guest_bio: currentState.setup.guestBio,
        guest_phone: currentState.setup.phone,
        guest_email: currentState.setup.email,
        episode_theme: currentState.setup.theme,
        season: currentState.setup.season,
        location: currentState.setup.location,
        scheduled_date: currentState.setup.scheduledDate,
        scheduled_time: currentState.setup.scheduledTime,

        // Research fields
        biography: currentState.research.dossier?.biography || '',
        technical_sheet: currentState.research.dossier?.technicalSheet || null,
        controversies: currentState.research.dossier?.controversies || [],
        ice_breakers: currentState.research.dossier?.iceBreakers || [],
        suggested_topics: currentState.research.dossier?.suggestedTopics || [],

        // Production fields
        recording_duration: currentState.production.duration,
        recording_started_at: currentState.production.startedAt?.toISOString() || null,
        recording_finished_at: currentState.production.finishedAt?.toISOString() || null,
        recording_file_path: currentState.production.recordingFilePath,

        // Metadata
        updated_at: new Date().toISOString(),
      };

      const { error: episodeError } = await supabase
        .from('podcast_episodes')
        .update(episodeUpdate)
        .eq('id', currentState.episodeId);

      if (episodeError) throw episodeError;

      // Save topics (if changed)
      const topicsChanged =
        currentState.pauta.topics.length !== previousStateRef.current.pauta.topics.length ||
        currentState.pauta.topics.some((t, i) =>
          JSON.stringify(t) !== JSON.stringify(previousStateRef.current.pauta.topics[i])
        );

      if (topicsChanged) {
        // Delete all existing topics for this episode (simpler than selective update)
        const { error: deleteError } = await supabase
          .from('podcast_topics')
          .delete()
          .eq('episode_id', currentState.episodeId);

        if (deleteError) throw deleteError;

        // Insert updated topics
        if (currentState.pauta.topics.length > 0) {
          const topicsToInsert = currentState.pauta.topics.map((topic, index) => ({
            id: topic.id,
            episode_id: currentState.episodeId,
            category_id: topic.categoryId || null,
            question_text: topic.text,
            completed: topic.completed,
            order: index,
            archived: topic.archived || false,
            sponsor_script: topic.sponsorScript || null,
          }));

          const { error: insertError } = await supabase
            .from('podcast_topics')
            .insert(topicsToInsert);

          if (insertError) throw insertError;
        }
      }

      // Save categories (if changed)
      const categoriesChanged =
        currentState.pauta.categories.length !== previousStateRef.current.pauta.categories.length ||
        currentState.pauta.categories.some((c, i) =>
          JSON.stringify(c) !== JSON.stringify(previousStateRef.current.pauta.categories[i])
        );

      if (categoriesChanged) {
        // Delete existing categories
        const { error: deleteCatError } = await supabase
          .from('podcast_topic_categories')
          .delete()
          .eq('episode_id', currentState.episodeId);

        if (deleteCatError) throw deleteCatError;

        // Insert updated categories
        if (currentState.pauta.categories.length > 0) {
          const categoriesToInsert = currentState.pauta.categories.map(cat => ({
            id: cat.id,
            episode_id: currentState.episodeId,
            name: cat.name,
            color: cat.color,
            description: cat.description || null,
            icon: cat.icon || null,
          }));

          const { error: insertCatError } = await supabase
            .from('podcast_topic_categories')
            .insert(categoriesToInsert);

          if (insertCatError) throw insertCatError;
        }
      }

      console.log('[useAutoSave] Save successful');
      previousStateRef.current = currentState;
      onSaveSuccess?.();

    } catch (error: any) {
      console.error('[useAutoSave] Save failed:', error);
      onSaveError?.(error);
    } finally {
      isSavingRef.current = false;
    }
  }, [onSaveStart, onSaveSuccess, onSaveError]);

  useEffect(() => {
    if (!enabled || !state.isDirty) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveToDatabase(state);
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, enabled, debounceMs, saveToDatabase]);

  // Manual save function (can be called directly)
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return saveToDatabase(state);
  }, [state, saveToDatabase]);

  return { saveNow };
}
