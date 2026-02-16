/**
 * AI Cost Analytics Types
 *
 * Type definitions for AI usage tracking and cost analytics dashboard.
 * Reads from `usage_logs` table (populated by `log_interaction` RPC).
 */

// =====================================================
// Core Types
// =====================================================

/**
 * Action names from usage_logs. Uses `string` to accommodate
 * all actions logged by gemini-chat and other Edge Functions.
 */
export type AIOperationType = string;

export type ModuleType = 'grants' | 'journey' | 'podcast' | 'finance' | 'atlas' | 'chat' | 'connections' | 'flux' | 'studio';

export type AlertLevel = 'ok' | 'warning' | 'critical' | 'danger' | 'none';

// =====================================================
// Database Record Types
// =====================================================

export interface AIUsageRecord {
  id: string;
  user_id: string;
  action: string;
  model: string;
  module?: string;
  tokens_input: number;
  tokens_output: number;
  cost_brl: number;
  credit_deducted?: boolean;
  created_at: string;
}

// =====================================================
// Aggregated Analytics Types
// =====================================================

export interface CostByOperation {
  action: string;
  model: string;
  total_requests: number;
  total_tokens: number;
  total_cost_brl: number;
}

export interface DailyCostSummary {
  date: string;
  total_cost_brl: number;
  total_requests: number;
}

export interface ModelCostBreakdown {
  ai_model: string;
  total_requests: number;
  total_cost_brl: number;
  percentage: number;
}

export interface OperationCostBreakdown {
  operation_type: string;
  total_cost_brl: number;
  percentage: number;
  count: number;
}

export interface TopExpensiveOperation {
  id: string;
  action: string;
  model: string;
  cost_brl: number;
  created_at: string;
  module?: string;
}

// =====================================================
// Budget & Alert Types
// =====================================================

export interface MonthlyCostSummary {
  current_month_cost: number;
  budget: number;
  percentage_used: number;
  days_remaining: number;
  projected_month_end_cost: number;
  is_over_budget: boolean;
}

export interface BudgetAlert {
  level: AlertLevel;
  message: string;
  percentage: number;
}

export interface UserAIBudget {
  monthly_ai_budget_brl: number;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// Chart Data Types
// =====================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TrendChartDataPoint {
  date: string;
  cost: number;
  requests: number;
}

// =====================================================
// Operation Type Display Names
// =====================================================

/**
 * Known action labels (Portuguese). Falls back to the raw action name
 * for any action not listed here.
 */
export const OPERATION_TYPE_LABELS: Record<string, string> = {
  text_generation: 'Geracao de Texto',
  image_generation: 'Geracao de Imagem',
  video_generation: 'Geracao de Video',
  audio_generation: 'Geracao de Audio',
  transcription: 'Transcricao',
  file_indexing: 'Indexacao de Arquivos',
  file_search_query: 'Busca em Arquivos',
  image_analysis: 'Analise de Imagem',
  embedding: 'Embeddings',
  chat: 'Chat',
  suggest_guest_name: 'Sugestao de Convidado',
  generate_briefing: 'Geracao de Briefing',
  analyze_moment: 'Analise de Momento',
  generate_report: 'Geracao de Relatorio',
  life_council: 'Conselho de Vida',
  pattern_synthesis: 'Sintese de Padroes',
  build_contact_dossier: 'Dossie de Contato',
  build_conversation_threads: 'Threads de Conversa',
  route_entities_to_modules: 'Roteamento de Entidades',
  classify_intent: 'Classificacao de Intencao',
};

// =====================================================
// Color Palette for Charts
// =====================================================

/**
 * Known action colors. Falls back to gray for unknown actions.
 */
export const OPERATION_COLORS: Record<string, string> = {
  text_generation: '#3b82f6',
  image_generation: '#8b5cf6',
  video_generation: '#ec4899',
  audio_generation: '#f59e0b',
  transcription: '#10b981',
  file_indexing: '#06b6d4',
  file_search_query: '#6366f1',
  image_analysis: '#a855f7',
  embedding: '#84cc16',
  chat: '#3b82f6',
  suggest_guest_name: '#8b5cf6',
  generate_briefing: '#ec4899',
  analyze_moment: '#f59e0b',
  generate_report: '#10b981',
  life_council: '#06b6d4',
  pattern_synthesis: '#6366f1',
  build_contact_dossier: '#a855f7',
  classify_intent: '#84cc16',
};

// Fallback colors for unknown actions (cycle through)
const FALLBACK_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
];

// =====================================================
// AI Model Display Names
// =====================================================

export const AI_MODEL_LABELS: Record<string, string> = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'veo-2': 'Veo 2',
  'imagen-3': 'Imagen 3',
  'whisper-large-v3': 'Whisper Large v3',
  'text-embedding-004': 'Text Embedding 004'
};

// =====================================================
// Utility Functions
// =====================================================

/**
 * Get display label for action type
 */
export function getOperationLabel(actionType: string): string {
  return OPERATION_TYPE_LABELS[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get color for action type
 */
let fallbackColorIndex = 0;
const assignedFallbackColors = new Map<string, string>();

export function getOperationColor(actionType: string): string {
  if (OPERATION_COLORS[actionType]) return OPERATION_COLORS[actionType];

  // Assign a stable fallback color for unknown actions
  if (!assignedFallbackColors.has(actionType)) {
    assignedFallbackColors.set(actionType, FALLBACK_COLORS[fallbackColorIndex % FALLBACK_COLORS.length]);
    fallbackColorIndex++;
  }
  return assignedFallbackColors.get(actionType) || '#6b7280';
}

/**
 * Get display label for AI model
 */
export function getModelLabel(model: string): string {
  return AI_MODEL_LABELS[model] || model;
}

/**
 * Format BRL currency
 */
export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount);
}

/**
 * @deprecated Use formatBRL instead. Kept for backward compatibility.
 */
export const formatUSD = formatBRL;

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get alert level from percentage
 */
export function getAlertLevelFromPercentage(percentage: number): AlertLevel {
  if (percentage >= 100) return 'danger';
  if (percentage >= 90) return 'critical';
  if (percentage >= 80) return 'warning';
  return 'ok';
}

/**
 * Get alert message
 */
export function getAlertMessage(level: AlertLevel, percentage: number): string {
  switch (level) {
    case 'danger':
      return `Voce ultrapassou seu orcamento mensal em ${formatPercentage(percentage - 100)}!`;
    case 'critical':
      return `Voce esta usando ${formatPercentage(percentage)} do seu orcamento mensal!`;
    case 'warning':
      return `Atencao: ${formatPercentage(percentage)} do orcamento mensal usado.`;
    case 'ok':
      return `Voce esta usando ${formatPercentage(percentage)} do seu orcamento.`;
    default:
      return 'Nenhum orcamento definido.';
  }
}
