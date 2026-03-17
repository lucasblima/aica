/**
 * Hook for searching editals and funding opportunities
 * using Google Search grounding via Gemini.
 *
 * Provides real-time search for open editals from FAPERJ,
 * FINEP, CNPq, CAPES, FAPESP and other Brazilian funding agencies.
 *
 * @example
 * ```tsx
 * const { searchEditals, isSearching, results } = useGrantsGroundedSearch()
 *
 * await searchEditals('inteligencia artificial')
 * // results.text contains the answer
 * // results.sources contains verified links
 * ```
 */

import { useState, useCallback } from 'react'
import { GeminiClient } from '@/lib/gemini'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useGrantsGroundedSearch')

export interface GrantSearchResult {
  text: string
  sources: Array<{ title: string; url: string }>
  searchQueries: string[]
  citations: Array<{ text: string; confidence: number }>
}

interface UseGrantsGroundedSearchReturn {
  searchEditals: (topic: string, agencies?: string[]) => Promise<GrantSearchResult>
  findSimilarEditals: (editalTitle: string, editalSummary: string) => Promise<GrantSearchResult>
  isSearching: boolean
  error: string | null
  lastResult: GrantSearchResult | null
  clearError: () => void
}

export function useGrantsGroundedSearch(): UseGrantsGroundedSearchReturn {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<GrantSearchResult | null>(null)

  const performSearch = useCallback(async (
    query: string,
    context?: string
  ): Promise<GrantSearchResult> => {
    setIsSearching(true)
    setError(null)

    try {
      const client = GeminiClient.getInstance()
      const response = await client.call({
        action: 'grounded_search',
        payload: {
          query,
          context,
          module: 'captacao',
          systemPrompt: `Você e um especialista em editais de fomento a pesquisa no Brasil.
Busque editais abertos e oportunidades de financiamento.
Priorize informações de fontes oficiais (FAPERJ, FINEP, CNPq, CAPES, FAPESP).
Inclua: nome do edital, agencia, prazo de submissao, valor disponível, areas contempladas.
Responda sempre em portugues brasileiro.
Se não encontrar editais abertos, mencione editais recentes e indique quando novos podem abrir.`,
        },
      })

      const result: GrantSearchResult = {
        text: response.result?.text || '',
        sources: response.result?.sources || [],
        searchQueries: response.result?.searchQueries || [],
        citations: response.result?.citations || [],
      }

      setLastResult(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar editais'
      setError(message)
      log.error('[useGrantsGroundedSearch] Search failed:', err)
      throw err
    } finally {
      setIsSearching(false)
    }
  }, [])

  const searchEditals = useCallback(async (
    topic: string,
    agencies?: string[]
  ): Promise<GrantSearchResult> => {
    const agencyFilter = agencies?.length
      ? ` nas agencias: ${agencies.join(', ')}`
      : ' em agencias brasileiras de fomento (FAPERJ, FINEP, CNPq, CAPES, FAPESP)'

    const query = `Editais de fomento abertos para pesquisa em ${topic}${agencyFilter}. Quais estão com inscricoes abertas em 2026?`

    return performSearch(query)
  }, [performSearch])

  const findSimilarEditals = useCallback(async (
    editalTitle: string,
    editalSummary: string
  ): Promise<GrantSearchResult> => {
    const query = `Encontre editais de fomento similares a: "${editalTitle}". Contexto: ${editalSummary}. Busque editais abertos com requisitos e areas tematicas semelhantes.`

    return performSearch(query, `Edital de referência: ${editalTitle}`)
  }, [performSearch])

  const clearError = useCallback(() => setError(null), [])

  return {
    searchEditals,
    findSimilarEditals,
    isSearching,
    error,
    lastResult,
    clearError,
  }
}
