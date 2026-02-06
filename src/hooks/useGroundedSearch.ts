import { useState, useCallback } from 'react'
import { GeminiClient } from '@/lib/gemini'

interface GroundedSource {
  title: string
  url: string
}

interface GroundedCitation {
  text: string
  startIndex?: number
  endIndex?: number
  confidence: number
  sourceIndices: number[]
}

export interface GroundedSearchResult {
  text: string
  sources: GroundedSource[]
  citations: GroundedCitation[]
  searchQueries: string[]
}

interface UseGroundedSearchReturn {
  search: (query: string, options?: { context?: string; module?: string; systemPrompt?: string }) => Promise<GroundedSearchResult>
  isSearching: boolean
  error: string | null
  lastResult: GroundedSearchResult | null
  clearError: () => void
}

/**
 * Hook para busca com Google Search grounding via Gemini.
 *
 * Conecta o Gemini a resultados de busca em tempo real,
 * retornando respostas com fontes verificaveis e citacoes.
 *
 * @example
 * ```tsx
 * const { search, isSearching, lastResult } = useGroundedSearch()
 *
 * const handleSearch = async () => {
 *   const result = await search('Editais FAPERJ abertos para IA')
 *   console.log(result.text, result.sources)
 * }
 * ```
 */
export function useGroundedSearch(): UseGroundedSearchReturn {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<GroundedSearchResult | null>(null)

  const geminiClient = GeminiClient.getInstance()

  const search = useCallback(async (
    query: string,
    options?: { context?: string; module?: string; systemPrompt?: string }
  ): Promise<GroundedSearchResult> => {
    setIsSearching(true)
    setError(null)

    try {
      const response = await geminiClient.call({
        action: 'grounded_search',
        payload: {
          query,
          context: options?.context,
          module: options?.module,
          systemPrompt: options?.systemPrompt,
        },
        model: 'smart',
      })

      const data = response.result

      const result: GroundedSearchResult = {
        text: data.text || '',
        sources: (data.sources || []).map((s: any) => ({
          title: s.title || 'Fonte',
          url: s.url || '',
        })),
        citations: (data.citations || []).map((c: any) => ({
          text: c.text || '',
          startIndex: c.startIndex,
          endIndex: c.endIndex,
          confidence: c.confidence || 0,
          sourceIndices: c.sourceIndices || [],
        })),
        searchQueries: data.searchQueries || [],
      }

      setLastResult(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Busca falhou'
      setError(message)
      throw err
    } finally {
      setIsSearching(false)
    }
  }, [geminiClient])

  const clearError = useCallback(() => setError(null), [])

  return { search, isSearching, error, lastResult, clearError }
}
