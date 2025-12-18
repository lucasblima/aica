/**
 * Configuração centralizada de modelos Gemini
 *
 * Define quais modelos usar para cada tipo de tarefa,
 * padronizando em todo o projeto.
 */

export const GEMINI_MODELS = {
  // Modelo rápido para tarefas simples (< 10s)
  fast: 'gemini-2.0-flash',

  // Modelo inteligente para tarefas complexas
  smart: 'gemini-2.5-flash',

  // Modelo experimental para recursos novos
  experimental: 'gemini-2.0-flash-exp',

  // Modelo para embeddings (RAG)
  embedding: 'text-embedding-004',
} as const

export type GeminiModel = keyof typeof GEMINI_MODELS

/**
 * Mapeamento de casos de uso para modelos recomendados
 */
export const USE_CASE_TO_MODEL: Record<string, GeminiModel> = {
  // Podcast
  'suggest_guest': 'fast',
  'suggest_topic': 'fast',
  'generate_dossier': 'smart',
  'analyze_news': 'fast',
  'chat_aica': 'fast',
  'deep_research': 'smart',

  // Pauta Generation (NotebookLM-style)
  'generate_pauta_outline': 'smart',
  'generate_pauta_questions': 'smart',
  'enrich_pauta_with_sources': 'smart',
  'refine_pauta_section': 'fast',

  // Finance
  'finance_chat': 'fast',
  'analyze_spending': 'smart',
  'predict_expenses': 'smart',
  'suggest_savings': 'smart',
  'parse_statement': 'smart',

  // Memory
  'extract_insights': 'fast',
  'daily_report': 'smart',
  'contact_context': 'fast',

  // Atlas (novos)
  'categorize_task': 'fast',
  'suggest_priority': 'fast',

  // Analytics
  'weekly_summary': 'smart',
  'sentiment_analysis': 'fast',

  // Journey (Minha Jornada)
  'analyze_moment_sentiment': 'fast',  // Real-time sentiment analysis (< 10s)
  'generate_weekly_summary': 'smart',   // Complex weekly summary (~8s)
  'generate_daily_question': 'fast',    // AI-driven contextual daily questions (< 3s)
}

/**
 * Retorna o modelo recomendado para um caso de uso
 */
export function getModelForUseCase(useCase: string): GeminiModel {
  return USE_CASE_TO_MODEL[useCase] || 'fast'
}
