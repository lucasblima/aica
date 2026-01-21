/**
 * Moment Indexing Service
 *
 * Serviço para indexação automática de momentos e memórias usando File Search.
 * Permite busca semântica no conteúdo dos momentos.
 */

import { supabase } from '../../../services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { FileSearchDocument } from '../../../types/fileSearch';
import type { Moment } from '../types/moment';

const log = createNamespacedLogger('MomentIndexing');

/**
 * Opções para indexação de momento
 */
export interface IndexMomentOptions {
  moment: Moment;
  metadata?: Record<string, any>;
}

/**
 * Interface do hook useJourneyFileSearch (para evitar importação circular)
 */
interface JourneyFileSearchHook {
  indexMoment: (
    moment: Moment,
    metadata?: Record<string, any>
  ) => Promise<FileSearchDocument>;
  indexMoments: (moments: Moment[]) => Promise<FileSearchDocument[]>;
  hasIndexedMoments: () => boolean;
}

/**
 * Indexa um momento no File Search
 *
 * @param options - Opções de indexação
 * @param fileSearchHook - Hook useJourneyFileSearch instanciado
 * @returns Documento indexado no File Search
 *
 * @example
 * ```tsx
 * const hook = useJourneyFileSearch({ userId: 'user-123' });
 *
 * await indexJourneyMoment({
 *   moment: myMoment
 * }, hook);
 * ```
 */
export async function indexJourneyMoment(
  options: IndexMomentOptions,
  fileSearchHook: JourneyFileSearchHook
): Promise<FileSearchDocument> {
  const { moment, metadata = {} } = options;

  log.debug('[MomentIndexing] Starting indexation for moment:', moment.id);

  try {
    // 1. Validar que há conteúdo para indexar
    if (!moment.content || moment.content.trim().length < 10) {
      throw new Error('Momento não tem conteúdo suficiente para indexação. Mínimo: 10 caracteres');
    }

    // 2. Indexar no File Search usando o hook
    log.debug('[MomentIndexing] Indexing moment in File Search...');
    const indexed = await fileSearchHook.indexMoment(moment, metadata);

    log.debug('[MomentIndexing] Moment indexed:', indexed.id);

    // 3. Opcional: Atualizar flag de indexação no banco (se existir uma coluna)
    // Se você adicionar uma coluna `indexed_at` em `moments`, pode atualizar aqui

    log.debug('[MomentIndexing] Indexation complete!', {
      momentId: moment.id,
      fileSearchDocId: indexed.id,
      characterCount: moment.content.length,
    });

    return indexed;
  } catch (error) {
    log.error('[MomentIndexing] Indexation failed:', error);
    throw error;
  }
}

/**
 * Salva momento no banco E indexa automaticamente
 *
 * Função helper que combina:
 * 1. Criação/atualização do momento em `moments`
 * 2. Indexação automática no File Search
 *
 * Esta função deve ser chamada após criar um momento
 *
 * @param moment - Momento criado/atualizado
 * @param fileSearchHook - Hook useJourneyFileSearch instanciado
 * @returns Documento indexado
 *
 * @example
 * ```tsx
 * const hook = useJourneyFileSearch({ userId: 'user-123' });
 *
 * // Após criar momento
 * const newMoment = await createMoment(momentData);
 * const indexed = await autoIndexAfterCreate(newMoment, hook);
 * ```
 */
export async function autoIndexAfterCreate(
  moment: Moment,
  fileSearchHook: JourneyFileSearchHook
): Promise<FileSearchDocument> {
  log.debug('[MomentIndexing] Auto-indexing after create:', moment.id);

  try {
    // Validar que o momento tem conteúdo
    if (!moment.content || moment.content.trim().length < 10) {
      log.warn('[MomentIndexing] Moment has insufficient content, skipping indexation');
      throw new Error('Momento não tem conteúdo suficiente');
    }

    // Indexar
    return await indexJourneyMoment({ moment }, fileSearchHook);
  } catch (error) {
    log.error('[MomentIndexing] Auto-indexing failed:', error);
    throw error;
  }
}

/**
 * Re-indexa todos os momentos existentes que ainda não foram indexados
 *
 * Útil para migração ou recuperação de dados.
 *
 * @param userId - ID do usuário
 * @param fileSearchHook - Hook useJourneyFileSearch instanciado
 * @param limit - Número máximo de momentos a processar
 * @returns Array de documentos indexados
 *
 * @example
 * ```tsx
 * const hook = useJourneyFileSearch({ userId: 'user-123' });
 * const results = await reindexExistingMoments('user-123', hook, 100);
 * log.debug(`Re-indexed ${results.length} moments`);
 * ```
 */
export async function reindexExistingMoments(
  userId: string,
  fileSearchHook: JourneyFileSearchHook,
  limit: number = 100
): Promise<FileSearchDocument[]> {
  log.debug('[MomentIndexing] Starting bulk re-indexation for user:', userId);

  try {
    // Buscar momentos do usuário que tenham conteúdo
    const { data: moments, error } = await supabase
      .from('moments')
      .select('*')
      .eq('user_id', userId)
      .not('content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch moments: ${error.message}`);
    }

    if (!moments || moments.length === 0) {
      log.debug('[MomentIndexing] No moments to re-index');
      return [];
    }

    log.debug(`[MomentIndexing] Found ${moments.length} moments to re-index`);

    // Usar indexMoments (batch) do hook para maior eficiência
    const results = await fileSearchHook.indexMoments(moments as Moment[]);

    log.debug(`[MomentIndexing] Bulk re-indexation complete: ${results.length}/${moments.length} successful`);

    return results;
  } catch (error) {
    log.error('[MomentIndexing] Bulk re-indexation failed:', error);
    throw error;
  }
}

/**
 * Indexa momentos de um período específico
 *
 * @param userId - ID do usuário
 * @param startDate - Data inicial
 * @param endDate - Data final
 * @param fileSearchHook - Hook useJourneyFileSearch instanciado
 * @returns Array de documentos indexados
 *
 * @example
 * ```tsx
 * const hook = useJourneyFileSearch({ userId: 'user-123' });
 * const start = new Date('2024-01-01');
 * const end = new Date('2024-12-31');
 * const results = await indexMomentsByPeriod('user-123', start, end, hook);
 * ```
 */
export async function indexMomentsByPeriod(
  userId: string,
  startDate: Date,
  endDate: Date,
  fileSearchHook: JourneyFileSearchHook
): Promise<FileSearchDocument[]> {
  log.debug('[MomentIndexing] Indexing moments by period:', {
    userId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  try {
    // Buscar momentos do período
    const { data: moments, error } = await supabase
      .from('moments')
      .select('*')
      .eq('user_id', userId)
      .not('content', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch moments: ${error.message}`);
    }

    if (!moments || moments.length === 0) {
      log.debug('[MomentIndexing] No moments found in period');
      return [];
    }

    log.debug(`[MomentIndexing] Found ${moments.length} moments in period`);

    // Indexar em lote
    const results = await fileSearchHook.indexMoments(moments as Moment[]);

    log.debug(`[MomentIndexing] Period indexation complete: ${results.length}/${moments.length} successful`);

    return results;
  } catch (error) {
    log.error('[MomentIndexing] Period indexation failed:', error);
    throw error;
  }
}

/**
 * Indexa momentos com uma emoção específica
 *
 * Útil para criar corpus temáticos (ex: apenas momentos felizes)
 *
 * @param userId - ID do usuário
 * @param emotion - Emoção a filtrar
 * @param fileSearchHook - Hook useJourneyFileSearch instanciado
 * @param limit - Número máximo de momentos
 * @returns Array de documentos indexados
 *
 * @example
 * ```tsx
 * const hook = useJourneyFileSearch({ userId: 'user-123' });
 * const results = await indexMomentsByEmotion('user-123', 'happy', hook, 50);
 * ```
 */
export async function indexMomentsByEmotion(
  userId: string,
  emotion: string,
  fileSearchHook: JourneyFileSearchHook,
  limit: number = 50
): Promise<FileSearchDocument[]> {
  log.debug('[MomentIndexing] Indexing moments by emotion:', { userId, emotion });

  try {
    // Buscar momentos com a emoção
    const { data: moments, error } = await supabase
      .from('moments')
      .select('*')
      .eq('user_id', userId)
      .eq('emotion', emotion)
      .not('content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch moments: ${error.message}`);
    }

    if (!moments || moments.length === 0) {
      log.debug('[MomentIndexing] No moments found with emotion:', emotion);
      return [];
    }

    log.debug(`[MomentIndexing] Found ${moments.length} moments with emotion: ${emotion}`);

    // Indexar em lote
    const results = await fileSearchHook.indexMoments(moments as Moment[]);

    log.debug(`[MomentIndexing] Emotion indexation complete: ${results.length}/${moments.length} successful`);

    return results;
  } catch (error) {
    log.error('[MomentIndexing] Emotion indexation failed:', error);
    throw error;
  }
}

/**
 * Indexa momentos com uma tag específica
 *
 * @param userId - ID do usuário
 * @param tag - Tag a filtrar (com ou sem #)
 * @param fileSearchHook - Hook useJourneyFileSearch instanciado
 * @param limit - Número máximo de momentos
 * @returns Array de documentos indexados
 *
 * @example
 * ```tsx
 * const hook = useJourneyFileSearch({ userId: 'user-123' });
 * const results = await indexMomentsByTag('user-123', '#trabalho', hook, 50);
 * ```
 */
export async function indexMomentsByTag(
  userId: string,
  tag: string,
  fileSearchHook: JourneyFileSearchHook,
  limit: number = 50
): Promise<FileSearchDocument[]> {
  const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
  log.debug('[MomentIndexing] Indexing moments by tag:', { userId, tag: cleanTag });

  try {
    // Buscar momentos com a tag
    const { data: moments, error } = await supabase
      .from('moments')
      .select('*')
      .eq('user_id', userId)
      .contains('tags', [cleanTag])
      .not('content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch moments: ${error.message}`);
    }

    if (!moments || moments.length === 0) {
      log.debug('[MomentIndexing] No moments found with tag:', cleanTag);
      return [];
    }

    log.debug(`[MomentIndexing] Found ${moments.length} moments with tag: ${cleanTag}`);

    // Indexar em lote
    const results = await fileSearchHook.indexMoments(moments as Moment[]);

    log.debug(`[MomentIndexing] Tag indexation complete: ${results.length}/${moments.length} successful`);

    return results;
  } catch (error) {
    log.error('[MomentIndexing] Tag indexation failed:', error);
    throw error;
  }
}

/**
 * Verifica se um momento já foi indexado
 *
 * @param momentId - ID do momento
 * @param fileSearchHook - Hook useJourneyFileSearch instanciado
 * @returns True se já está indexado
 */
export async function isMomentIndexed(
  momentId: string,
  fileSearchHook: JourneyFileSearchHook
): Promise<boolean> {
  try {
    // Verificação simplificada
    return fileSearchHook.hasIndexedMoments();
  } catch (error) {
    log.error('[MomentIndexing] Error checking indexation status:', error);
    return false;
  }
}
