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
  'deep_research': 'deep-research'
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
   */
  private async handleError(response: Response): Promise<GeminiError> {
    const body = await response.json().catch(() => ({}))

    let code: GeminiError['code']
    switch (response.status) {
      case 401:
        code = 'UNAUTHORIZED'
        break
      case 429:
        code = 'RATE_LIMITED'
        break
      case 500:
      case 502:
      case 503:
        code = 'SERVER_ERROR'
        break
      default:
        code = 'NETWORK_ERROR'
    }

    const error = new (GeminiError as any)(
      body.error || response.statusText,
      code,
      response.status
    ) as GeminiError

    return error
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
