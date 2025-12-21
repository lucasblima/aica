/**
 * useAutoSave - Auto-save hook with debounce
 * Automatically saves workspace state changes to Supabase with 2-second debounce
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { PodcastWorkspaceState } from '@/modules/studio/types';

interface UseAutoSaveOptions {
  state: PodcastWorkspaceState;
  enabled?: boolean;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

/**
 * Sanitiza o payload removendo/convertendo valores inválidos para o PostgreSQL
 *
 * Estratégia: Converte TODAS strings vazias para null, exceto campos que
 * explicitamente podem ter string vazia (campos de texto livre).
 *
 * Razões:
 * - TIME/DATE/INTEGER/BOOLEAN não aceitam string vazia
 * - Campos com CHECK constraints (ex: guest_email) não aceitam string vazia
 * - É mais seguro converter tudo para null do que listar cada campo problemático
 */
function sanitizePayload(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  // Campos que PODEM ser string vazia (texto livre sem constraints)
  // Todos os outros campos vazios serão convertidos para null
  const allowEmptyString = [
    'guest_name',           // Nome do convidado (pode ser preenchido depois)
    'guest_reference',      // Referência do convidado (opcional)
    'episode_theme',        // Tema do episódio (pode ser preenchido depois)
    'recording_file_path',  // Caminho do arquivo (será preenchido quando gravar)
    'transcript',           // Transcrição (será preenchida depois)
    'blog_post_url',        // URL do post (será preenchida depois)
  ];

  const convertedFields: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    // Converter string vazia para null, exceto campos permitidos
    if (value === '' && !allowEmptyString.includes(key)) {
      sanitized[key] = null;
      convertedFields.push(key);
    } else {
      sanitized[key] = value;
    }
  }

  // Log de debug mostrando quais campos foram convertidos
  if (convertedFields.length > 0) {
    console.log('[sanitizePayload] Fields converted from "" to null:', convertedFields);
  }

  return sanitized;
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
      console.log('[useAutoSave] Saving workspace state for episode:', currentState.episodeId);

      // Save episode data (setup + production ONLY)
      // Note: Research data (biography, technical_sheet, etc.) belongs in podcast_guest_research table
      // Note: season, location, scheduled_date fields don't exist in podcast_episodes schema
      const episodeUpdate = {
        // Setup fields (only fields that exist in podcast_episodes)
        guest_name: currentState.setup.guestName,
        guest_reference: currentState.setup.guestReference,
        guest_phone: currentState.setup.phone,
        guest_email: currentState.setup.email,
        episode_theme: currentState.setup.theme, // Added: migration 20251221
        scheduled_time: currentState.setup.scheduledTime,

        // Production fields
        recording_duration: currentState.production.duration,
        recording_started_at: currentState.production.startedAt?.toISOString() || null,
        recording_finished_at: currentState.production.finishedAt?.toISOString() || null,
        recording_file_path: currentState.production.recordingFilePath,

        // Metadata
        updated_at: new Date().toISOString(),
      };

      console.log('[useAutoSave] Updating episode with data (before sanitization):', episodeUpdate);

      // Sanitize payload to convert empty strings to null for TIME/DATE/INTEGER fields
      const sanitizedUpdate = sanitizePayload(episodeUpdate);
      console.log('[useAutoSave] Sanitized payload:', sanitizedUpdate);

      const { error: episodeError } = await supabase
        .from('podcast_episodes')
        .update(sanitizedUpdate)
        .eq('id', currentState.episodeId);

      if (episodeError) {
        console.error('[useAutoSave] Episode update failed:', episodeError);
        throw episodeError;
      }

      console.log('[useAutoSave] Episode update successful');

      // Save topics (if changed)
      const topicsChanged =
        currentState.pauta.topics.length !== previousStateRef.current.pauta.topics.length ||
        currentState.pauta.topics.some((t, i) =>
          JSON.stringify(t) !== JSON.stringify(previousStateRef.current.pauta.topics[i])
        );

      if (topicsChanged) {
        console.log('[useAutoSave] Topics changed, updating...');

        // Delete all existing topics for this episode (simpler than selective update)
        const { error: deleteError } = await supabase
          .from('podcast_topics')
          .delete()
          .eq('episode_id', currentState.episodeId);

        if (deleteError) {
          console.error('[useAutoSave] Topics delete failed:', deleteError);
          throw deleteError;
        }

        // Insert updated topics
        if (currentState.pauta.topics.length > 0) {
          const topicsToInsert = currentState.pauta.topics.map((topic, index) => ({
            id: topic.id,
            episode_id: currentState.episodeId,
            category: topic.categoryId || null,  // ✅ FIX: Use 'category' TEXT field instead of 'category_id' UUID
            question_text: topic.text,
            completed: topic.completed,
            order: index,
            archived: topic.archived || false,
            sponsor_script: topic.sponsorScript || null,
          }));

          console.log('[useAutoSave] Inserting topics:', topicsToInsert);

          const { error: insertError } = await supabase
            .from('podcast_topics')
            .insert(topicsToInsert);

          if (insertError) {
            console.error('[useAutoSave] Topics insert failed:', insertError);
            throw insertError;
          }

          console.log('[useAutoSave] Topics insert successful');
        }
      }

      // Save categories (if changed)
      const categoriesChanged =
        currentState.pauta.categories.length !== previousStateRef.current.pauta.categories.length ||
        currentState.pauta.categories.some((c, i) =>
          JSON.stringify(c) !== JSON.stringify(previousStateRef.current.pauta.categories[i])
        );

      if (categoriesChanged) {
        console.log('[useAutoSave] Categories changed, updating...');

        // Delete existing categories
        const { error: deleteCatError } = await supabase
          .from('podcast_topic_categories')
          .delete()
          .eq('episode_id', currentState.episodeId);

        if (deleteCatError) {
          console.error('[useAutoSave] Categories delete failed:', deleteCatError);
          throw deleteCatError;
        }

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

          console.log('[useAutoSave] Inserting categories:', categoriesToInsert);

          const { error: insertCatError } = await supabase
            .from('podcast_topic_categories')
            .insert(categoriesToInsert);

          if (insertCatError) {
            console.error('[useAutoSave] Categories insert failed:', insertCatError);
            throw insertCatError;
          }

          console.log('[useAutoSave] Categories insert successful');
        }
      }

      console.log('[useAutoSave] Save successful');
      previousStateRef.current = currentState;
      onSaveSuccess?.();

    } catch (error: any) {
      console.error('[useAutoSave] Save failed:', error);
      console.error('[useAutoSave] Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        statusCode: error?.statusCode,
      });
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
