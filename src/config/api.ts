/**
 * Configuração centralizada de URLs de API
 */

/**
 * URL do servidor Python PDF Extractor
 * Em produção: https://project-management-docker.w9jo16.easypanel.host
 */
export const PDF_EXTRACTOR_URL = import.meta.env.VITE_PDF_EXTRACTOR_URL || 'http://localhost:8000'

/**
 * URL do servidor Python LLM (alias para PDF_EXTRACTOR_URL)
 * @deprecated Use PDF_EXTRACTOR_URL instead
 */
export const LLM_API_URL = PDF_EXTRACTOR_URL

/**
 * URL das Edge Functions do Supabase
 */
export const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : 'http://localhost:54321/functions/v1'

/**
 * Timeout padrão para chamadas ao LLM (em ms)
 */
export const LLM_TIMEOUT = {
  fast: 10000,      // 10s para Edge Functions
  slow: 300000,     // 5min para Python server (Deep Research, PDFs)
}

/**
 * Rate limits do cliente (frontend)
 * Limites reais são aplicados no backend
 */
export const RATE_LIMITS = {
  llm_calls_per_hour: 100,
  llm_calls_per_day: 1000,
}
