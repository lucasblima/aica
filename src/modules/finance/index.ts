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

// =====================================================
// Components
// =====================================================
export { FinanceCard } from './components/FinanceCard';
export { StatementUpload } from './components/StatementUpload';
export { AgentChat } from './components/FinanceAgent/AgentChat';
export { ExpenseChart } from './components/Charts/ExpenseChart';
export { IncomeVsExpense } from './components/Charts/IncomeVsExpense';

// =====================================================
// Views
// =====================================================
export { FinanceDashboard } from './views/FinanceDashboard';
export { FinanceAgentView } from './views/FinanceAgentView';

// =====================================================
// Hooks
// =====================================================
export { useFinanceStatements } from './hooks/useFinanceStatements';
export { useFinanceAgent } from './hooks/useFinanceAgent';
export { useTransactions } from './hooks/useTransactions';
