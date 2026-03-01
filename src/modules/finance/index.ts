/**
 * Finance Module - Public API
 *
 * Re-exports all public components, services, hooks, and types
 * for the Finance Module.
 */

// =====================================================
// Types
// =====================================================
export * from './types';

// =====================================================
// Services
// =====================================================
export { financeService } from './services/financeService';
export { pdfProcessingService, PDFProcessingService } from './services/pdfProcessingService';
export { financeAgentService, FinanceAgentService } from './services/financeAgentService';
export { statementService } from './services/statementService';
export { getMonthlyDigest, clearDigestCache } from './services/financeDigestService';
export {
  prospectTheoryValue,
  scoreSpend,
  scoreSave,
  scoreBorrow,
  scorePlan,
  computeFinHealthScore,
  presentBiasUtility,
  correctSavingsProjection,
  assessBrazilianRatios,
  frameSavingsMessage,
  frameGoalProgress,
  storeFinancialHealth,
  getLatestFinancialHealth,
  getFinancialHealthHistory,
  TIER_LABELS,
  TIER_COLORS,
  COMPONENT_LABELS,
} from './services/financialHealthScoring';

export type {
  FinHealthTier,
  FinHealthScore,
  FinancialHealthResult,
  BrazilianRatioAssessment,
  SavingsProjection,
  LossFrameMessage,
} from './services/financialHealthScoring';

// =====================================================
// Components
// =====================================================
export { FinanceCard } from './components/FinanceCard';
export { StatementUpload } from './components/StatementUpload';
export { ExpenseChart } from './components/Charts/ExpenseChart';
export { IncomeVsExpense } from './components/Charts/IncomeVsExpense';
export { MonthlyDigestCard } from './components/MonthlyDigestCard';
export { FinancialHealthCard } from './components/FinancialHealthCard';
export { LossFramingBanner } from './components/LossFramingBanner';
export { SavingsGoalProjection } from './components/SavingsGoalProjection';

// =====================================================
// Views
// =====================================================
export { FinanceDashboard } from './views/FinanceDashboard';

// =====================================================
// Hooks
// =====================================================
export { useFinanceStatements } from './hooks/useFinanceStatements';
export { useTransactions } from './hooks/useTransactions';
export { useFinancialHealth } from './hooks/useFinancialHealth';
export { useLossFraming } from './hooks/useLossFraming';
