/**
 * Biblioteca centralizada para integração com Gemini API
 *
 * Esta biblioteca padroniza todas as chamadas ao Gemini através do backend,
 * garantindo segurança, performance e conformidade com LGPD.
 *
 * @module lib/gemini
 */

export { GeminiClient } from './client'
export { GEMINI_MODELS, type GeminiModel } from './models'
export { callWithRetry, type RetryOptions } from './retry'
export type {
  GeminiChatRequest,
  GeminiChatResponse,
  GeminiAction
} from './types'
