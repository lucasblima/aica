/**
 * Cliente centralizado para integração com Gemini API via backend
 *
 * Este cliente faz todas as chamadas através do backend (Edge Functions ou Python),
 * nunca diretamente ao Gemini, garantindo segurança da API Key.
 */

import { supabase } from '@/services/supabaseClient'
import { callWithRetry, type RetryOptions } from './retry'
import { getModelForUseCase } from './models'
import { GeminiError } from './types'
import type {
  GeminiAction,
  GeminiChatRequest,
  GeminiChatResponse,
  StreamOptions
} from './types'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('GeminiClient')

/**
 * URLs dos backends
 */
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`
  : 'http://localhost:54321/functions/v1/gemini-chat'

/**
 * Ações que possuem Edge Functions dedicadas (não vão para gemini-chat)
 */
const DEDICATED_EDGE_FUNCTIONS: Record<string, string> = {
  'deep_research': 'deep-research',
  // File Search V1 (legacy)
  'create_store': 'file-search',
  'upload_document': 'file-search',
  'search_documents': 'file-search',
  'delete_store': 'file-search',
  'list_stores': 'file-search',
  // File Search V2 (native @google/genai SDK)
  'create_store_v2': 'file-search-v2',
  'upload_document_v2': 'file-search-v2',
  'query_v2': 'file-search-v2',
  'delete_document_v2': 'file-search-v2',
  'delete_store_v2': 'file-search-v2',
  'list_stores_v2': 'file-search-v2',
  // ADK Multi-Agent System (proxied to Cloud Run)
  'agent_chat': 'agent-proxy',
  // Context Caching (Task #36 - Token Optimization)
  'cache_get_or_create': 'context-cache',
  'cache_get_stats': 'context-cache',
  'cache_invalidate': 'context-cache',
  'cache_refresh': 'context-cache',
  // OpenClaw Adaptation (#251)
  'run_life_council': 'run-life-council',
  'synthesize_patterns': 'synthesize-user-patterns',
}

/**
 * Cliente Gemini singleton
 */
export class GeminiClient {
  private static instance: GeminiClient

  private constructor() { }

  /**
   * Obtém instância única do cliente
   */
  static getInstance(): GeminiClient {
    if (!GeminiClient.instance) {
      GeminiClient.instance = new GeminiClient()
    }
    return GeminiClient.instance
  }

  /**
   * Faz chamada ao Gemini através do backend apropriado
   *
   * @example
   * ```ts
   * const client = GeminiClient.getInstance()
   * const result = await client.call({
   *   action: 'suggest_guest',
   *   payload: {}
   * })
   * ```
   */
  async call(
    request: GeminiChatRequest,
    options?: RetryOptions
  ): Promise<GeminiChatResponse> {
    // Determinar endpoint apropriado
    let endpoint = EDGE_FUNCTION_URL

    // Se a ação tem Edge Function dedicada, usar ela
    if (DEDICATED_EDGE_FUNCTIONS[request.action]) {
      const functionName = DEDICATED_EDGE_FUNCTIONS[request.action]
      endpoint = import.meta.env.VITE_SUPABASE_URL
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`
        : `http://localhost:54321/functions/v1/${functionName}`
    }

    // Auto-selecionar modelo se não especificado
    if (!request.model) {
      request.model = getModelForUseCase(request.action)
    }

    // Fazer chamada com retry
    return callWithRetry(async () => {
      return this.makeRequest(endpoint, request)
    }, options)
  }

  /**
   * Faz chamada streaming ao Gemini
   *
   * @example
   * ```ts
   * const client = GeminiClient.getInstance()
   * await client.stream(
   *   { action: 'finance_chat', payload: { message: 'Oi' } },
   *   {
   *     onChunk: (text) => console.log(text),
   *     onComplete: () => console.log('Done'),
   *     onError: (err) => console.error(err)
   *   }
   * )
   * ```
   */
  async stream(
    request: GeminiChatRequest,
    streamOptions: StreamOptions
  ): Promise<void> {
    // Determinar endpoint apropriado
    let endpoint = EDGE_FUNCTION_URL

    // Se a ação tem Edge Function dedicada, usar ela
    if (DEDICATED_EDGE_FUNCTIONS[request.action]) {
      const functionName = DEDICATED_EDGE_FUNCTIONS[request.action]
      endpoint = import.meta.env.VITE_SUPABASE_URL
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`
        : `http://localhost:54321/functions/v1/${functionName}`
    }

    if (!request.model) {
      request.model = getModelForUseCase(request.action)
    }

    const token = await this.getAuthToken()

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...request, stream: true })
      })

      if (!response.ok) {
        throw await this.handleError(response)
      }

      // Processar stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          streamOptions.onComplete()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        streamOptions.onChunk(chunk)
      }
    } catch (error) {
      streamOptions.onError(error as Error)
    }
  }

  /**
   * Faz request HTTP ao backend
   */
  private async makeRequest(
    endpoint: string,
    request: GeminiChatRequest
  ): Promise<GeminiChatResponse> {
    const token = await this.getAuthToken()

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw await this.handleError(response)
    }

    return response.json()
  }

  /**
   * Obtém token de autenticação do Supabase
   */
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('User not authenticated')
    }

    return session.access_token
  }

  /**
   * Trata erros HTTP convertendo para GeminiError
   *
   * Detecta errorCode do backend para erros especificos como API_KEY_EXPIRED
   */
  private async handleError(response: Response): Promise<GeminiError> {
    const body = await response.json().catch(() => ({}))

    // Priorizar errorCode do backend se disponivel
    let code: GeminiError['code']
    if (body.errorCode) {
      // Map backend errorCode to GeminiError code
      const backendCodeMap: Record<string, GeminiError['code']> = {
        'API_KEY_EXPIRED': 'API_KEY_EXPIRED',
        'RATE_LIMITED': 'RATE_LIMITED',
        'PERMISSION_DENIED': 'PERMISSION_DENIED',
        'VALIDATION_ERROR': 'VALIDATION_ERROR',
        'SERVER_ERROR': 'SERVER_ERROR'
      }
      code = backendCodeMap[body.errorCode] || this.mapStatusToCode(response.status)
    } else {
      code = this.mapStatusToCode(response.status)
    }

    const error = new (GeminiError as any)(
      body.error || response.statusText,
      code,
      response.status
    ) as GeminiError

    // Log critico para API_KEY_EXPIRED para facilitar diagnostico
    if (code === 'API_KEY_EXPIRED') {
      log.error(
        'CRITICAL: Gemini API key is expired or invalid! ' +
        'See docs/GEMINI_API_SETUP.md for renewal instructions. ' +
        'Quick fix: npx supabase secrets set GEMINI_API_KEY=<new-key>'
      )
    }

    return error
  }

  /**
   * Mapeia status HTTP para codigo de erro GeminiError
   */
  private mapStatusToCode(status: number): GeminiError['code'] {
    switch (status) {
      case 401:
        return 'UNAUTHORIZED'
      case 403:
        return 'PERMISSION_DENIED'
      case 429:
        return 'RATE_LIMITED'
      case 500:
      case 502:
      case 503:
        return 'SERVER_ERROR'
      default:
        return 'NETWORK_ERROR'
    }
  }
}

/**
 * Hook React para usar o cliente Gemini
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const gemini = useGemini()
 *
 *   const handleSuggest = async () => {
 *     const result = await gemini.call({
 *       action: 'suggest_guest',
 *       payload: {}
 *     })
 *   }
 * }
 * ```
 */
export function useGemini() {
  return GeminiClient.getInstance()
}
