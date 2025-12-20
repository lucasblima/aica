/**
 * Transcript Indexing Service
 *
 * Serviço para indexação automática de transcrições de episódios usando File Search.
 * Permite busca semântica no conteúdo das transcrições.
 */

import { supabase } from '../../../../src/services/supabaseClient';
import type { FileSearchDocument } from '../../../../src/types/fileSearch';

/**
 * Opções para indexação de transcrição
 */
export interface IndexTranscriptionOptions {
  episodeId: string;
  transcription: string;
  episodeTitle: string;
  guestName?: string;
  episodeTheme?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Interface do hook usePodcastFileSearch (para evitar importação circular)
 */
interface PodcastFileSearchHook {
  indexTranscription: (
    transcription: string,
    episodeTitle: string,
    metadata?: Record<string, any>
  ) => Promise<FileSearchDocument>;
  hasIndexedTranscriptions: () => boolean;
}

/**
 * Indexa transcrição de episódio e atualiza campos no banco de dados
 *
 * Este serviço é chamado automaticamente após a geração de transcrição
 * e garante que o conteúdo seja indexado para busca semântica.
 *
 * @param options - Opções de indexação
 * @param fileSearchHook - Hook usePodcastFileSearch instanciado
 * @returns Documento indexado no File Search
 *
 * @example
 * ```tsx
 * const { indexTranscription } = usePodcastFileSearch({ episodeId: 'ep-123' });
 *
 * await indexEpisodeTranscription({
 *   episodeId: 'ep-123',
 *   transcription: transcriptText,
 *   episodeTitle: 'Episódio #42',
 *   guestName: 'João Silva',
 *   episodeTheme: 'IA e o Futuro',
 *   duration: 3600
 * }, { indexTranscription, hasIndexedTranscriptions: () => false });
 * ```
 */
export async function indexEpisodeTranscription(
  options: IndexTranscriptionOptions,
  fileSearchHook: PodcastFileSearchHook
): Promise<FileSearchDocument> {
  const {
    episodeId,
    transcription,
    episodeTitle,
    guestName,
    episodeTheme,
    duration,
    metadata = {},
  } = options;

  console.log('[TranscriptIndexing] Starting indexation for episode:', episodeId);

  try {
    // 1. Validar transcrição
    if (!transcription || transcription.trim().length < 100) {
      throw new Error('Transcrição muito curta para indexação. Mínimo: 100 caracteres');
    }

    // 2. Indexar no File Search usando o hook
    console.log('[TranscriptIndexing] Indexing transcript in File Search...');
    const indexed = await fileSearchHook.indexTranscription(
      transcription,
      episodeTitle,
      {
        guest_name: guestName,
        episode_theme: episodeTheme,
        duration_seconds: duration,
        character_count: transcription.length,
        word_count: transcription.split(/\s+/).length,
        ...metadata,
      }
    );

    console.log('[TranscriptIndexing] Transcript indexed:', indexed.id);

    // 3. Atualizar timestamp de indexação no banco de dados
    const { error: updateError } = await supabase
      .from('podcast_episodes')
      .update({
        transcript_generated_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    if (updateError) {
      console.warn('[TranscriptIndexing] Failed to update timestamp:', updateError);
      // Não falha a operação, apenas loga o warning
    }

    console.log('[TranscriptIndexing] Indexation complete!', {
      episodeId,
      fileSearchDocId: indexed.id,
      characterCount: transcription.length,
    });

    return indexed;
  } catch (error) {
    console.error('[TranscriptIndexing] Indexation failed:', error);
    throw error;
  }
}

/**
 * Salva transcrição no banco E indexa automaticamente
 *
 * Função helper que combina:
 * 1. Save da transcrição em podcast_episodes.transcript
 * 2. Indexação automática no File Search
 *
 * @param options - Opções de save e indexação
 * @param fileSearchHook - Hook usePodcastFileSearch instanciado
 * @returns Documento indexado
 *
 * @example
 * ```tsx
 * const hook = usePodcastFileSearch({ episodeId: 'ep-123' });
 *
 * const indexed = await saveAndIndexTranscription({
 *   episodeId: 'ep-123',
 *   transcription: generatedTranscript,
 *   episodeTitle: 'Episódio #42',
 *   guestName: 'João Silva'
 * }, hook);
 * ```
 */
export async function saveAndIndexTranscription(
  options: IndexTranscriptionOptions,
  fileSearchHook: PodcastFileSearchHook
): Promise<{
  saved: boolean;
  indexed: FileSearchDocument;
}> {
  const { episodeId, transcription } = options;

  console.log('[TranscriptIndexing] Saving and indexing transcript for:', episodeId);

  try {
    // 1. Salvar transcrição no banco de dados
    console.log('[TranscriptIndexing] Step 1: Saving transcript to database...');
    const { error: saveError } = await supabase
      .from('podcast_episodes')
      .update({
        transcript: transcription,
        transcript_generated_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    if (saveError) {
      throw new Error(`Failed to save transcript: ${saveError.message}`);
    }

    console.log('[TranscriptIndexing] Transcript saved to database');

    // 2. Indexar no File Search
    console.log('[TranscriptIndexing] Step 2: Indexing in File Search...');
    const indexed = await indexEpisodeTranscription(options, fileSearchHook);

    console.log('[TranscriptIndexing] Save and indexation complete!');

    return {
      saved: true,
      indexed,
    };
  } catch (error) {
    console.error('[TranscriptIndexing] Save and indexation failed:', error);
    throw error;
  }
}

/**
 * Re-indexa todas as transcrições existentes que ainda não foram indexadas
 *
 * Útil para migração ou recuperação de dados.
 *
 * @param fileSearchHook - Hook usePodcastFileSearch instanciado (sem episodeId específico)
 * @param limit - Número máximo de episódios a processar
 * @returns Array de documentos indexados
 *
 * @example
 * ```tsx
 * const hook = usePodcastFileSearch({ showId: 'show-123' });
 * const results = await reindexExistingTranscriptions(hook, 50);
 * console.log(`Re-indexed ${results.length} transcriptions`);
 * ```
 */
export async function reindexExistingTranscriptions(
  fileSearchHook: PodcastFileSearchHook,
  limit: number = 50
): Promise<FileSearchDocument[]> {
  console.log('[TranscriptIndexing] Starting bulk re-indexation...');

  try {
    // Buscar episódios com transcrição mas sem indexação recente
    const { data: episodes, error } = await supabase
      .from('podcast_episodes')
      .select('id, title, guest_name, episode_theme, transcript, duration_minutes')
      .not('transcript', 'is', null)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch episodes: ${error.message}`);
    }

    if (!episodes || episodes.length === 0) {
      console.log('[TranscriptIndexing] No episodes to re-index');
      return [];
    }

    console.log(`[TranscriptIndexing] Found ${episodes.length} episodes to re-index`);

    const results: FileSearchDocument[] = [];

    for (const episode of episodes) {
      try {
        console.log(`[TranscriptIndexing] Re-indexing episode: ${episode.id}`);

        const indexed = await indexEpisodeTranscription(
          {
            episodeId: episode.id,
            transcription: episode.transcript,
            episodeTitle: episode.title,
            guestName: episode.guest_name,
            episodeTheme: episode.episode_theme,
            duration: episode.duration_minutes ? episode.duration_minutes * 60 : undefined,
          },
          fileSearchHook
        );

        results.push(indexed);
        console.log(`[TranscriptIndexing] ✓ Re-indexed: ${episode.id}`);
      } catch (episodeError) {
        console.error(`[TranscriptIndexing] ✗ Failed to re-index ${episode.id}:`, episodeError);
        // Continue com próximo episódio
      }
    }

    console.log(`[TranscriptIndexing] Bulk re-indexation complete: ${results.length}/${episodes.length} successful`);

    return results;
  } catch (error) {
    console.error('[TranscriptIndexing] Bulk re-indexation failed:', error);
    throw error;
  }
}
