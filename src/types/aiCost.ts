/**
 * AI Cost Analytics Types
 *
 * Type definitions for AI usage tracking and cost analytics dashboard.
 */

// =====================================================
// Core Types
// =====================================================

export type AIOperationType =
  | 'text_generation'
  | 'image_generation'
  | 'video_generation'
  | 'audio_generation'
  | 'transcription'
  | 'file_indexing'
  | 'file_search_query'
  | 'image_analysis'
  | 'embedding';

export type ModuleType = 'grants' | 'journey' | 'podcast' | 'finance' | 'atlas' | 'chat' | 'connections' | 'flux' | 'studio';

export type AlertLevel = 'ok' | 'warning' | 'critical' | 'danger' | 'none';

// =====================================================
// Database Record Types
// =====================================================

export interface AIUsageRecord {
  id: string;
  user_id: string;
  operation_type: AIOperationType;
  ai_model: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  duration_seconds?: number;
  input_cost_usd?: number;
  output_cost_usd?: number;
  total_cost_usd: number;
  module_type?: ModuleType;
  module_id?: string;
  asset_id?: string;
  request_metadata?: Record<string, any>;
  created_at: string;
}

// =====================================================
// Aggregated Analytics Types
// =====================================================

export interface CostByOperation {
  operation_type: AIOperationType;
  ai_model: string;
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface DailyCostSummary {
  date: string;
  total_cost_usd: number;
  total_requests: number;
}

export interface ModelCostBreakdown {
  ai_model: string;
  total_requests: number;
  total_cost_usd: number;
  percentage: number;
}

export interface OperationCostBreakdown {
  operation_type: AIOperationType;
  total_cost_usd: number;
  percentage: number;
  count: number;
}

export interface TopExpensiveOperation {
  id: string;
  operation_type: AIOperationType;
  ai_model: string;
  total_cost_usd: number;
  created_at: string;
  module_type?: ModuleType;
  request_metadata?: Record<string, any>;
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
  monthly_ai_budget_usd: number;
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

export const OPERATION_TYPE_LABELS: Record<AIOperationType, string> = {
  text_generation: 'Geração de Texto',
  image_generation: 'Geração de Imagem',
  video_generation: 'Geração de Vídeo',
  audio_generation: 'Geração de Áudio',
  transcription: 'Transcrição',
  file_indexing: 'Indexação de Arquivos',
  file_search_query: 'Busca em Arquivos',
  image_analysis: 'Análise de Imagem',
  embedding: 'Embeddings'
};

// =====================================================
// Color Palette for Charts
// =====================================================

export const OPERATION_COLORS: Record<AIOperationType, string> = {
  text_generation: '#3b82f6',   // blue-500
  image_generation: '#8b5cf6',  // purple-500
  video_generation: '#ec4899',  // pink-500
  audio_generation: '#f59e0b',  // amber-500
  transcription: '#10b981',     // green-500
  file_indexing: '#06b6d4',     // cyan-500
  file_search_query: '#6366f1', // indigo-500
  image_analysis: '#a855f7',    // violet-500
  embedding: '#84cc16'          // lime-500
};

// =====================================================
// AI Model Display Names
// =====================================================

export const AI_MODEL_LABELS: Record<string, string> = {
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
 * Get display label for operation type
 */
export function getOperationLabel(operationType: AIOperationType): string {
  return OPERATION_TYPE_LABELS[operationType] || operationType;
}

/**
 * Get color for operation type
 */
export function getOperationColor(operationType: AIOperationType): string {
  return OPERATION_COLORS[operationType] || '#6b7280'; // gray-500 fallback
}

/**
 * Get display label for AI model
 */
export function getModelLabel(model: string): string {
  return AI_MODEL_LABELS[model] || model;
}

/**
 * Format USD currency
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

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
      return `Você ultrapassou seu orçamento mensal em ${formatPercentage(percentage - 100)}!`;
    case 'critical':
      return `Você está usando ${formatPercentage(percentage)} do seu orçamento mensal!`;
    case 'warning':
      return `Atenção: ${formatPercentage(percentage)} do orçamento mensal usado.`;
    case 'ok':
      return `Você está usando ${formatPercentage(percentage)} do seu orçamento.`;
    default:
      return 'Nenhum orçamento definido.';
  }
}
