/**
 * Tipos TypeScript para integração com Gemini
 */

import type { GeminiModel } from './models'

/**
 * Ações disponíveis na API de backend
 */
export type GeminiAction =
  // Podcast
  | 'suggest_guest'
  | 'suggest_topic'
  | 'generate_dossier'
  | 'analyze_news'
  | 'suggest_dynamic_topic'
  | 'generate_ice_breakers'
  | 'chat_aica'
  | 'deep_research'
  | 'intelligent_search'
  | 'research_guest'
  // Pauta Generation (NotebookLM-style)
  | 'generate_pauta_outline'
  | 'generate_pauta_questions'
  | 'enrich_pauta_with_sources'
  | 'refine_pauta_section'

  // Finance
  | 'finance_chat'
  | 'analyze_spending'
  | 'predict_expenses'
  | 'suggest_savings'
  | 'identify_anomalies'
  | 'parse_statement'

  // Memory
  | 'extract_insights'
  | 'generate_embedding'
  | 'generate_daily_report'
  | 'extract_contact_context'
  | 'extract_work_items'

  // Atlas
  | 'categorize_task'
  | 'suggest_priority'
  | 'extract_task_from_voice'

  // Analytics
  | 'weekly_summary'
  | 'sentiment_analysis'

  // Journey (Minha Jornada)
  | 'analyze_moment_sentiment'
  | 'generate_weekly_summary'
  | 'analyze_content_realtime'
  | 'generate_post_capture_insight'
  | 'cluster_moments_by_theme'
  | 'generate_daily_question'
  | 'transcribe_audio'
  | 'generate_tags'
  | 'analyze_moment'
  | 'evaluate_quality'

  // Grants (Módulo Captação)
  | 'generate_field_content'
  | 'analyze_edital_structure'
  | 'extract_edital_text'

  // Grounded Search (Google Search integration)
  | 'grounded_search'

  // File-Search V1 (RAG - legacy)
  | 'create_store'
  | 'upload_document'
  | 'search_documents'
  | 'delete_store'
  | 'list_stores'

  // File-Search V2 (native @google/genai SDK)
  | 'create_store_v2'
  | 'upload_document_v2'
  | 'query_v2'
  | 'delete_document_v2'
  | 'delete_store_v2'
  | 'list_stores_v2'

  // Agent System
  | 'chat_with_agent'

  // ADK Multi-Agent (proxied to Cloud Run)
  | 'agent_chat'

  // Context Caching (Task #36)
  | 'cache_get_or_create'
  | 'cache_get_stats'
  | 'cache_invalidate'
  | 'cache_refresh'

  // OpenClaw Adaptation (#251)
  | 'run_life_council'
  | 'synthesize_patterns'

/**
 * Request base para chamadas ao Gemini
 */
export interface GeminiChatRequest {
  action: GeminiAction
  payload: Record<string, any>
  model?: GeminiModel
  stream?: boolean
  agent?: 'atlas' | 'captacao' | 'studio' | 'journey' | 'finance' | 'connections' | 'coordinator'
}

/**
 * Response padrão do Gemini
 */
export interface GeminiChatResponse {
  result: any
  cached?: boolean
  tokensUsed?: {
    input: number
    output: number
  }
  latencyMs?: number
}

/**
 * Códigos de erro possíveis da API Gemini
 */
export type GeminiErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'API_KEY_EXPIRED'
  | 'PERMISSION_DENIED'

/**
 * Erro customizado para operações Gemini
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public code: GeminiErrorCode,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'GeminiError'
  }

  /**
   * Verifica se o erro é devido a uma API key expirada ou inválida
   */
  isApiKeyError(): boolean {
    return this.code === 'API_KEY_EXPIRED'
  }

  /**
   * Verifica se o erro é recuperável (vale tentar novamente)
   */
  isRetryable(): boolean {
    return this.code === 'RATE_LIMITED' || this.code === 'SERVER_ERROR' || this.code === 'NETWORK_ERROR'
  }
}

/**
 * Opções para chamadas streaming
 */
export interface StreamOptions {
  onChunk: (chunk: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

/**
 * Tipos específicos para File-Search
 */
export type FileSearchCategory =
  | 'financial'
  | 'documents'
  | 'personal'
  | 'business'
  | 'grants'
  | 'podcast_transcripts'
  | 'habitat_documents'
  | 'venture_documents'
  | 'academia_documents'
  | 'tribo_documents'
  | 'onboarding_resources';

export interface FileSearchResult {
  answer: string;
  citations?: Array<{
    uri?: string;
    title?: string;
  }>;
  model: string;
}

export interface FileSearchStoreInfo {
  id: string;
  user_id: string;
  store_name: string;
  store_category: FileSearchCategory;
  display_name: string;
  created_at: string;
}

/**
 * Context Cache Types (Task #36)
 *
 * Context caching reduces token costs by caching user profile and
 * system instructions. Provides up to 90% savings on repeated context.
 */

export interface ContextCacheStats {
  cacheName: string | null;
  cachedTokens: number;
  totalTokensSaved: number;
  cacheHits: number;
  createdAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  savingsPercentage: number;
  estimatedCostSavingsUsd: number;
}

export interface ContextCacheResult {
  cacheName: string | null;
  fromCache: boolean;
  tokenCount: number;
}

export interface ContextCacheOptions {
  systemInstruction: string;
  extraContext?: string;
  ttlSeconds?: number;
}
