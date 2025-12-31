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

  // Grants (Módulo Captação)
  | 'generate_field_content'
  | 'analyze_edital_structure'
  | 'extract_edital_text'

  // File-Search (RAG)
  | 'create_store'
  | 'upload_document'
  | 'search_documents'
  | 'delete_store'
  | 'list_stores'

/**
 * Request base para chamadas ao Gemini
 */
export interface GeminiChatRequest {
  action: GeminiAction
  payload: Record<string, any>
  model?: GeminiModel
  stream?: boolean
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
 * Erro customizado para operações Gemini
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'NETWORK_ERROR',
    public statusCode?: number
  ) {
    super(message)
    this.name = 'GeminiError'
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
