// =====================================================
// Finance Module Types - Complete Type Definitions
// =====================================================

// =====================================================
// Transaction Types
// =====================================================

export interface FinanceTransaction {
  id: string;
  user_id: string;
  statement_id?: string;
  description: string;
  original_description?: string;
  normalized_description?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  merchant_name?: string;
  merchant_category?: string;
  transaction_date: string;
  is_recurring: boolean;
  hash_id?: string;
  tags?: string[];
  notes?: string;
  ai_categorized?: boolean;
  ai_confidence?: number;
  balance_after?: number;
  reference_number?: string;
  created_at: string;
  updated_at?: string;
}

// =====================================================
// Statement Types
// =====================================================

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';

export interface FinanceStatement {
  id: string;
  user_id: string;
  file_name: string;
  file_size_bytes?: number;
  file_hash?: string;
  storage_path?: string;
  bank_name?: string;
  account_type?: AccountType;
  statement_period_start?: string;
  statement_period_end?: string;
  currency: string;
  processing_status: ProcessingStatus;
  processing_error?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  opening_balance?: number;
  closing_balance?: number;
  total_credits?: number;
  total_debits?: number;
  transaction_count: number;
  markdown_content?: string;
  markdown_generated_at?: string;
  ai_summary?: string;
  ai_insights?: AIInsight[];
  ai_analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AIInsight {
  type: 'warning' | 'suggestion' | 'pattern' | 'anomaly';
  title: string;
  description: string;
  category?: string;
  amount?: number;
  confidence: number;
}

// =====================================================
// Agent & Conversation Types
// =====================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface FinanceAgentMessage {
  id: string;
  user_id: string;
  session_id: string;
  title?: string;
  role: MessageRole;
  content: string;
  referenced_transactions?: string[];
  referenced_statements?: string[];
  date_range_context?: {
    start: string;
    end: string;
  };
  tokens_used?: number;
  model_used?: string;
  response_time_ms?: number;
  created_at: string;
}

export interface AgentSession {
  id: string;
  userId: string;
  title?: string;
  messages: FinanceAgentMessage[];
  context?: AgentContext;
  createdAt: string;
  lastMessageAt: string;
}

export interface AgentContext {
  transactions: FinanceTransaction[];
  statements?: FinanceStatement[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    topCategories: { category: string; amount: number }[];
    periodStart: string;
    periodEnd: string;
    transactionCount: number;
  };
}

// =====================================================
// Category Types
// =====================================================

export type CategoryType = 'income' | 'expense' | 'transfer' | 'investment';

export interface FinanceCategory {
  id: string;
  user_id?: string | null;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color: string;
  parent_id?: string | null;
  category_type: CategoryType;
  keywords: string[];
  merchant_patterns: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Budget Types
// =====================================================

export interface FinanceBudget {
  id: string;
  user_id: string;
  category: string;
  budget_amount: number;
  month: number;
  year: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetSummaryRow {
  category: string;
  budget_amount: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface MonthlyBudgetSummary {
  year: number;
  month: number;
  totalBudget: number;
  totalSpent: number;
  rows: BudgetSummaryRow[];
}

export interface GoalProgress {
  id: string;
  title: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  progress_pct: number;
  deadline: string | null;
  category: string | null;
  is_active: boolean;
}

export interface RecurringSummaryItem {
  description: string;
  count: number;
  average_amount: number;
  total_amount: number;
  last_date: string;
}

// =====================================================
// Summary & Analytics Types
// =====================================================

export interface FinanceSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
}

export interface BurnRateData {
  averageMonthlyExpense: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageChange: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  income: number;
  expenses: number;
  balance: number;
}

// =====================================================
// PDF Processing Types
// =====================================================

export interface PDFExtractionResult {
  rawText: string;
  pageCount: number;
  extractedAt: string;
}

export interface ParsedStatement {
  bankName: string;
  accountType: AccountType;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  transactions: ParsedTransaction[];
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  balance?: number;
  suggestedCategory?: string;
}

// =====================================================
// Filter & Query Types
// =====================================================

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  type?: 'income' | 'expense';
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
  statementId?: string;
}

export interface DateRange {
  start: string;
  end: string;
}

// =====================================================
// Upload & Progress Types
// =====================================================

export interface UploadProgress {
  stage: 'uploading' | 'extracting' | 'parsing' | 'saving' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface StatementUploadResult {
  statement: FinanceStatement;
  transactions: FinanceTransaction[];
  insights?: AIInsight[];
}

// =====================================================
// Error Types
// =====================================================

export interface FinanceError {
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, unknown>;
}

export const FINANCE_ERROR_CODES = {
  PDF_EXTRACTION_FAILED: 'PDF_001',
  AI_PARSING_FAILED: 'AI_001',
  DUPLICATE_STATEMENT: 'DUP_001',
  STORAGE_UPLOAD_FAILED: 'STORAGE_001',
  INVALID_FILE_TYPE: 'FILE_001',
  FILE_TOO_LARGE: 'FILE_002',
  NETWORK_ERROR: 'NET_001',
} as const;

// =====================================================
// Constants
// =====================================================

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = ['application/pdf'];
export const DEFAULT_CURRENCY = 'BRL';

export const TRANSACTION_CATEGORIES = [
  'housing',
  'food',
  'transport',
  'health',
  'education',
  'entertainment',
  'shopping',
  'salary',
  'freelance',
  'investment',
  'transfer',
  'other',
] as const;

export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];

// =====================================================
// Account Types
// =====================================================

export interface FinanceAccount {
  id: string;
  user_id: string;
  account_name: string;
  bank_name: string | null;
  account_type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';
  is_default: boolean;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Goal Types
// =====================================================

export interface FinanceGoal {
  id: string;
  user_id: string;
  title: string;
  goal_type: 'savings' | 'debt_payoff' | 'investment' | 'emergency_fund' | 'custom';
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalTypeLabel = {
  [K in FinanceGoal['goal_type']]: string;
};

export const GOAL_TYPE_LABELS: GoalTypeLabel = {
  savings: 'Poupanca',
  debt_payoff: 'Quitar Divida',
  investment: 'Investimento',
  emergency_fund: 'Reserva de Emergencia',
  custom: 'Personalizado',
};

// =====================================================
// Budget Alert Types
// =====================================================

export interface BudgetAlert {
  id: string;
  type: 'exceeded' | 'warning' | 'unusual' | 'recurring_missed';
  category: string;
  message: string;
  amount?: number;
  threshold?: number;
  created_at: string;
}
