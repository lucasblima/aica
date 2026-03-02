/**
 * Singleton client for external API integrations
 *
 * Routes API calls through Supabase Edge Functions to keep
 * third-party API keys secure on the backend.
 *
 * Pattern mirrors GeminiClient singleton from lib/gemini/client.ts.
 *
 * @module lib/external-api
 */

import { supabase } from '@/services/supabaseClient'
import type { ExternalApiName, ExternalApiResponse } from './types'
import { ExternalApiError } from './types'

/**
 * Maps each API name to its corresponding Edge Function
 */
const EDGE_FUNCTION_MAP: Record<ExternalApiName, string> = {
  'holidays': 'external-holidays',
  'weather': 'external-weather',
  'geolocation': 'external-geolocation',
  'brasil-cep': 'external-brasil',
  'brasil-cnpj': 'external-brasil',
  'brasil-banks': 'external-brasil',
  'brasil-ddd': 'external-brasil',
  'turnstile-verify': 'external-turnstile-verify',
}

/**
 * Maps Brasil API sub-routes to action names sent to the shared Edge Function
 */
const BRASIL_ACTION_MAP: Record<string, string> = {
  'brasil-cep': 'cep',
  'brasil-cnpj': 'cnpj',
  'brasil-banks': 'banks',
  'brasil-ddd': 'ddd',
}

/**
 * Centralized client for all external API calls
 *
 * @example
 * ```ts
 * const client = ExternalApiClient.getInstance()
 * const result = await client.call<HolidayData[]>('holidays', { year: 2026 })
 * ```
 */
export class ExternalApiClient {
  private static instance: ExternalApiClient

  private constructor() {}

  /**
   * Returns the singleton instance
   */
  static getInstance(): ExternalApiClient {
    if (!ExternalApiClient.instance) {
      ExternalApiClient.instance = new ExternalApiClient()
    }
    return ExternalApiClient.instance
  }

  /**
   * Calls an external API through the corresponding Edge Function
   *
   * @param api - The API to call (e.g. 'holidays', 'brasil-cep')
   * @param params - Parameters forwarded to the Edge Function body
   * @returns Typed response from the Edge Function
   * @throws ExternalApiError on unknown API or Edge Function failure
   */
  async call<T>(
    api: ExternalApiName,
    params: Record<string, unknown> = {}
  ): Promise<ExternalApiResponse<T>> {
    const functionName = EDGE_FUNCTION_MAP[api]
    if (!functionName) {
      throw new ExternalApiError(`Unknown API: ${api}`, api)
    }

    // Brasil APIs share one Edge Function — inject the action discriminator
    let body = { ...params }
    const brasilAction = BRASIL_ACTION_MAP[api]
    if (brasilAction) {
      body = { action: brasilAction, ...params }
    }

    const { data, error } = await supabase.functions.invoke(functionName, { body })

    if (error) {
      throw new ExternalApiError(
        error.message || 'Edge function call failed',
        api
      )
    }

    return data as ExternalApiResponse<T>
  }
}

/**
 * React convenience — returns the singleton without needing to import the class
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const api = useExternalApi()
 *   // ...
 * }
 * ```
 */
export function useExternalApi() {
  return ExternalApiClient.getInstance()
}
