import { useState, useCallback } from 'react'
import { supabase } from '@/services/supabaseClient'
import type { FileSearchCategory } from '@/lib/gemini/types'

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-search-v2`
  : 'http://localhost:54321/functions/v1/file-search-v2'

// ============================================================================
// Types
// ============================================================================

export interface FileSearchStore {
  id: string
  category: FileSearchCategory
  displayName: string
  documentCount: number
  createdAt: string
}

export interface FileSearchDocument {
  id: string
  fileName: string
  status: string
  storeId: string
}

export interface FileSearchQueryResult {
  answer: string
  sources: Array<{ title: string; uri: string }>
  citations: Array<{
    text: string
    startIndex?: number
    endIndex?: number
    sourceIndices: number[]
    confidence: number[]
  }>
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

interface UseFileSearchV2Return {
  isLoading: boolean
  error: string | null
  clearError: () => void

  createStore: (category: FileSearchCategory, displayName?: string) => Promise<FileSearchStore>
  uploadDocument: (params: {
    storeId?: string
    category?: FileSearchCategory
    file: File
    metadata?: Record<string, string>
  }) => Promise<FileSearchDocument>
  query: (params: {
    storeId?: string
    categories?: FileSearchCategory[]
    question: string
    maxResults?: number
    systemPrompt?: string
  }) => Promise<FileSearchQueryResult>
  deleteDocument: (documentId: string) => Promise<void>
  deleteStore: (storeName: string) => Promise<void>
  listStores: () => Promise<FileSearchStore[]>
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook para File Search V2 - RAG gerenciado pelo Google.
 *
 * Usa o SDK nativo @google/genai via Edge Function.
 * Suporta upload de documentos, queries com citações e gerenciamento de stores.
 *
 * @example
 * ```tsx
 * const { query, uploadDocument, isLoading } = useFileSearchV2()
 *
 * // Upload de edital
 * await uploadDocument({
 *   category: 'grants',
 *   file: pdfFile,
 *   metadata: { edital: 'FAPERJ APQ1 2026' },
 * })
 *
 * // Query com RAG
 * const result = await query({
 *   categories: ['grants'],
 *   question: 'Quais sao os requisitos do edital?',
 * })
 * console.log(result.answer, result.sources)
 * ```
 */
export function useFileSearchV2(): UseFileSearchV2Return {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const callEdgeFunction = useCallback(async (
    action: string,
    payload: Record<string, any>
  ): Promise<any> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Usuario não autenticado')

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Request falhou: ${response.statusText}`)
    }

    return data.result
  }, [])

  const withLoadingState = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createStore = useCallback(async (
    category: FileSearchCategory,
    displayName?: string
  ): Promise<FileSearchStore> => {
    return withLoadingState(async () => {
      const result = await callEdgeFunction('create_store', { category, displayName })
      return {
        id: result.id,
        category,
        displayName: result.displayName,
        documentCount: 0,
        createdAt: new Date().toISOString(),
      }
    })
  }, [callEdgeFunction, withLoadingState])

  const uploadDocument = useCallback(async (params: {
    storeId?: string
    category?: FileSearchCategory
    file: File
    metadata?: Record<string, string>
  }): Promise<FileSearchDocument> => {
    return withLoadingState(async () => {
      // Convert file to base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(params.file)
      })

      const result = await callEdgeFunction('upload_document', {
        storeId: params.storeId,
        category: params.category,
        fileName: params.file.name,
        fileContent,
        mimeType: params.file.type,
        metadata: params.metadata,
      })

      return {
        id: result.id,
        fileName: result.fileName,
        status: result.status,
        storeId: result.storeId,
      }
    })
  }, [callEdgeFunction, withLoadingState])

  const query = useCallback(async (params: {
    storeId?: string
    categories?: FileSearchCategory[]
    question: string
    maxResults?: number
    systemPrompt?: string
  }): Promise<FileSearchQueryResult> => {
    return withLoadingState(async () => {
      return await callEdgeFunction('query', params)
    })
  }, [callEdgeFunction, withLoadingState])

  const deleteDocument = useCallback(async (documentId: string): Promise<void> => {
    return withLoadingState(async () => {
      await callEdgeFunction('delete_document', { documentId })
    })
  }, [callEdgeFunction, withLoadingState])

  const deleteStore = useCallback(async (storeName: string): Promise<void> => {
    return withLoadingState(async () => {
      await callEdgeFunction('delete_store', { storeName })
    })
  }, [callEdgeFunction, withLoadingState])

  const listStores = useCallback(async (): Promise<FileSearchStore[]> => {
    return withLoadingState(async () => {
      return await callEdgeFunction('list_stores', {})
    })
  }, [callEdgeFunction, withLoadingState])

  const clearError = useCallback(() => setError(null), [])

  return {
    isLoading,
    error,
    clearError,
    createStore,
    uploadDocument,
    query,
    deleteDocument,
    deleteStore,
    listStores,
  }
}
