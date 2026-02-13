/**
 * Configuração centralizada de modelos Gemini
 *
 * Define quais modelos usar para cada tipo de tarefa,
 * padronizando em todo o projeto.
 */

export const GEMINI_MODELS = {
  // Modelo rápido para tarefas simples (< 10s)
  fast: 'gemini-2.5-flash',

  // Modelo inteligente para tarefas complexas
  smart: 'gemini-2.5-flash',

  // Modelo avançado para raciocínio complexo
  pro: 'gemini-2.5-pro',

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
  'research_guest': 'smart',

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
  'extract_task_from_voice': 'fast',

  // Analytics
  'weekly_summary': 'smart',
  'sentiment_analysis': 'fast',

  // Journey (Minha Jornada)
  'analyze_moment_sentiment': 'fast',  // Real-time sentiment analysis (< 10s)
  'generate_weekly_summary': 'smart',   // Complex weekly summary (~8s)
  'generate_daily_question': 'fast',    // AI-driven contextual daily questions (< 3s)

  // Grounded Search (Google Search)
  'grounded_search': 'smart',           // Real-time web search with citations

  // Agent System
  'chat_with_agent': 'smart',           // Module-specific AI agents

  // ADK Multi-Agent (proxied to Cloud Run)
  'agent_chat': 'smart',               // ADK coordinator agent
}

/**
 * Retorna o modelo recomendado para um caso de uso
 */
export function getModelForUseCase(useCase: string): GeminiModel {
  return USE_CASE_TO_MODEL[useCase] || 'fast'
}

// ============================================================================
// MODEL ROUTER — Complexity-based model selection
// Mirrors _shared/model-router.ts for frontend awareness
// @see docs/OPENCLAW_ADAPTATION.md Section 3
// @issue #252
// ============================================================================

export type ComplexityLevel = 'low' | 'medium' | 'high'

export const USE_CASE_TO_COMPLEXITY: Record<string, ComplexityLevel> = {
  // LOW — Fast, simple tasks (< 200ms target)
  'categorize_task': 'low',
  'suggest_priority': 'low',
  'generate_tags': 'low',
  'analyze_moment_sentiment': 'low',
  'extract_task_from_voice': 'low',
  'sentiment_analysis': 'low',

  // MEDIUM — Standard tasks (< 3s target)
  'chat_aica': 'medium',
  'finance_chat': 'medium',
  'extract_insights': 'medium',
  'generate_daily_question': 'medium',
  'suggest_guest': 'medium',
  'suggest_topic': 'medium',
  'analyze_news': 'medium',
  'refine_pauta_section': 'medium',
  'contact_context': 'medium',
  'analyze_moment': 'medium',
  'evaluate_quality': 'medium',
  'chat_with_agent': 'medium',

  // HIGH — Complex reasoning (< 15s target)
  'run_life_council': 'high',
  'synthesize_patterns': 'high',
  'generate_field_content': 'high',
  'generate_dossier': 'high',
  'generate_weekly_summary': 'high',
  'generate_pauta_outline': 'high',
  'generate_pauta_questions': 'high',
  'enrich_pauta_with_sources': 'high',
  'deep_research': 'high',
  'research_guest': 'high',
  'analyze_spending': 'high',
  'predict_expenses': 'high',
  'parse_statement': 'high',
  'daily_report': 'high',
  'weekly_summary': 'high',
  'grounded_search': 'high',
  'agent_chat': 'high',
}

export function getComplexityForUseCase(useCase: string): ComplexityLevel {
  return USE_CASE_TO_COMPLEXITY[useCase] || 'medium'
}
