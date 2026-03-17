/**
 * Journey File Search V2 Hook
 *
 * Wraps useFileSearchV2 with journey-specific functionality
 * for indexing and querying moments/reflections using
 * Google's native File Search API (managed RAG).
 *
 * Replaces the legacy corpus-based approach with V2 stores.
 *
 * @example
 * ```tsx
 * const { indexMoment, queryMoments, isLoading } = useJourneyFileSearchV2()
 *
 * // Index a new moment
 * await indexMoment(moment)
 *
 * // Query across all moments
 * const result = await queryMoments('Quais padrões emocionais apareceram esta semana?')
 * console.log(result.answer, result.sources)
 * ```
 */

import { useCallback } from 'react'
import { useFileSearchV2 } from '@/hooks/useFileSearchV2'
import type { Moment } from '../types/moment'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useJourneyFileSearchV2')

interface JourneyQueryResult {
  answer: string
  sources: Array<{ title: string; uri: string }>
  citations: Array<{
    text: string
    sourceIndices: number[]
    confidence: number[]
  }>
}

interface UseJourneyFileSearchV2Return {
  /** Index a single moment into the journey File Search V2 store */
  indexMoment: (moment: Moment) => Promise<void>
  /** Index multiple moments in batch */
  indexMoments: (moments: Moment[]) => Promise<void>
  /** Query across all indexed moments with RAG */
  queryMoments: (question: string, systemPrompt?: string) => Promise<JourneyQueryResult>
  /** Whether an operation is in progress */
  isLoading: boolean
  /** Current error */
  error: string | null
  /** Clear error state */
  clearError: () => void
}

/**
 * Format a moment as a structured markdown document for indexing
 */
function formatMomentForIndexing(moment: Moment): string {
  const parts: string[] = []

  parts.push(`# Momento - ${moment.created_at}`)
  parts.push('')

  if (moment.emotion) {
    parts.push(`**Emoção:** ${moment.emotion}`)
  }

  if (moment.tags?.length) {
    parts.push(`**Tags:** ${moment.tags.join(', ')}`)
  }

  if (moment.sentiment_data) {
    const sd = moment.sentiment_data
    parts.push(`**Sentimento:** ${sd.sentiment || 'não analisado'} (score: ${sd.sentimentScore ?? 'N/A'})`)
    if (sd.emotions?.length) {
      parts.push(`**Emoções detectadas:** ${sd.emotions.join(', ')}`)
    }
  }

  parts.push('')
  parts.push('## Conteúdo')
  parts.push(moment.content)

  return parts.join('\n')
}

export function useJourneyFileSearchV2(): UseJourneyFileSearchV2Return {
  const { uploadDocument, query, isLoading, error, clearError } = useFileSearchV2()

  const indexMoment = useCallback(async (moment: Moment): Promise<void> => {
    if (!moment.content || moment.content.trim().length < 10) {
      log.warn('[useJourneyFileSearchV2] Moment too short to index:', moment.id)
      return
    }

    const content = formatMomentForIndexing(moment)
    const blob = new Blob([content], { type: 'text/markdown' })
    const file = new File([blob], `moment-${moment.id}.md`, { type: 'text/markdown' })

    const metadata: Record<string, string> = {
      moment_id: moment.id,
      emotion: moment.emotion || '',
      created_at: moment.created_at,
    }

    if (moment.tags?.length) {
      metadata.tags = moment.tags.join(',')
    }

    await uploadDocument({
      category: 'journey_moments',
      file,
      metadata,
    })

    log.debug('[useJourneyFileSearchV2] Moment indexed:', moment.id)
  }, [uploadDocument])

  const indexMoments = useCallback(async (moments: Moment[]): Promise<void> => {
    const validMoments = moments.filter(m => m.content && m.content.trim().length >= 10)
    log.debug(`[useJourneyFileSearchV2] Indexing ${validMoments.length} moments`)

    for (const moment of validMoments) {
      try {
        await indexMoment(moment)
      } catch (err) {
        log.error(`[useJourneyFileSearchV2] Failed to index moment ${moment.id}:`, err)
      }
    }
  }, [indexMoment])

  const queryMoments = useCallback(async (
    question: string,
    systemPrompt?: string
  ): Promise<JourneyQueryResult> => {
    const defaultPrompt = `Você e o agente de autoconhecimento do Aica Life OS.
Análise os momentos e reflexoes do usuario para responder a pergunta.
Identifique padrões emocionais, temas recorrentes e evolucao ao longo do tempo.
Responda em portugues brasileiro com empatia e sem julgamento.
Cite momentos especificos quando relevante.`

    const result = await query({
      categories: ['journey_moments'],
      question,
      systemPrompt: systemPrompt || defaultPrompt,
      maxResults: 10,
    })

    return {
      answer: result.answer,
      sources: result.sources,
      citations: result.citations,
    }
  }, [query])

  return {
    indexMoment,
    indexMoments,
    queryMoments,
    isLoading,
    error,
    clearError,
  }
}
