/**
 * Finance Dashboard View
 *
 * Main view for the Finance module showing overview, upload, and agent access.
 */

import { useTourAutoStart } from '@/hooks/useTourAutoStart';
import { createNamespacedLogger } from '@/lib/logger';
import React, { useEffect, useState, useMemo } from 'react';

const log = createNamespacedLogger('FinanceDashboard');
import { ArrowLeft, Upload, Eye, EyeOff, Loader2, Target, BarChart3, List, GitCompare, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { Logo } from '@/components/ui';
import { StatementUpload } from '../components/StatementUpload';
import { CSVUpload } from '../components/CSVUpload';
import { ExpenseChart } from '../components/Charts/ExpenseChart';
import { IncomeVsExpense } from '../components/Charts/IncomeVsExpense';
import { BudgetView } from './BudgetView';
import { MonthlyDigestCard } from '../components/MonthlyDigestCard';
import { FinanceEmptyState } from '../components/FinanceEmptyState';
import { FinanceNotificationCard } from '../components/FinanceNotificationCard';
import { TransactionListView } from '../components/TransactionListView';
import { MonthComparisonView } from '../components/MonthComparisonView';
import { LossFramingBanner } from '../components/LossFramingBanner';
import { AccountManagement } from '../components/AccountManagement';
import { getAllTimeSummary, getBurnRate, getAllTimeCategoryBreakdown, getTransactionsByDateRange, getCategorySuggestions, applyCategorySuggestions, recategorizeAllTransactions } from '../services/financeService';
import type { CategorySuggestion } from '../services/financeService';
import { RecategorizationReview } from '../components/RecategorizationReview';
import { FinanceProvider, useFinanceContext } from '../contexts/FinanceContext';
import { FinancialHealthCard } from '../components/FinancialHealthCard';
import { useFinancialHealth } from '../hooks/useFinancialHealth';
import type { FinanceSummary, BurnRateData, CategoryBreakdown, FinanceStatement, BudgetAlert, FinanceTransaction } from '../types';

// =====================================================
// Types
// =====================================================

interface FinanceDashboardProps {
  userId: string;
  onBack?: () => void;
}

type DashboardView = 'panorama' | 'transactions' | 'budget' | 'analysis' | 'settings';

interface ViewTab {
  key: DashboardView;
  label: string;
  icon: React.ElementType;
}

const VIEW_TABS: ViewTab[] = [
  { key: 'panorama', label: 'Panorama', icon: BarChart3 },
  { key: 'transactions', label: 'Transações', icon: List },
  { key: 'budget', label: 'Orçamento', icon: Target },
  { key: 'analysis', label: 'Análise', icon: GitCompare },
  { key: 'settings', label: 'Configuração', icon: Settings },
];

// =====================================================
// Component
// =====================================================

/* data-tour markers: finance-header, balance-overview, income-expenses, budget-categories, transaction-list, upload-statement, ai-insights, goals-tracking */
export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ userId, onBack }) => {
  return (
    <FinanceProvider userId={userId}>
      <FinanceDashboardInner userId={userId} onBack={onBack} />
    </FinanceProvider>
  );
};

const FinanceDashboardInner: React.FC<FinanceDashboardProps> = ({
  userId,
  onBack,
}) => {
  // Auto-start tour on first visit (Phase 2 - Organic Onboarding)
  useTourAutoStart('finance-first-visit');

  // Shared state from FinanceContext
  const {
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    statements,
    refreshAll,
  } = useFinanceContext();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [allTransactions, setAllTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [isValuesVisible, setIsValuesVisible] = useState(() => {
    const saved = localStorage.getItem('finance_values_visible');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [activeView, setActiveView] = useState<DashboardView>('panorama');

  // Financial Health Score
  const { result: healthResult, loading: healthLoading, compute: computeHealth } = useFinancialHealth();

  // Persist visibility toggle
  useEffect(() => {
    localStorage.setItem('finance_values_visible', JSON.stringify(isValuesVisible));
  }, [isValuesVisible]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Build a 2-year date range for trend data (supports historical navigation)
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
      const trendStart = twoYearsAgo.toISOString().split('T')[0];
      const trendEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Statements are loaded by FinanceContext — only fetch local analytics here
      const [summaryData, burnRateData, categoryData, trendTransactions] = await Promise.all([
        getAllTimeSummary(userId),
        getBurnRate(userId),
        getAllTimeCategoryBreakdown(userId),
        getTransactionsByDateRange(userId, trendStart, trendEnd),
      ]);

      setSummary(summaryData);
      setBurnRate(burnRateData);
      setCategoryBreakdown(categoryData);
      setAllTransactions(trendTransactions);
    } catch (error) {
      log.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (_statement: FinanceStatement) => {
    setShowUpload(false);
    refreshAll(); // Refresh context (statements, categories, accounts)
    loadData(); // Refresh local analytics
  };

  const formatCurrency = (value: number) => {
    if (!isValuesVisible) {
      return 'R$ ••••••';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const toggleVisibility = () => {
    setIsValuesVisible(!isValuesVisible);
  };

  // Build trend data for TrendLineChart from last 6 months of transactions
  const trendData = useMemo(() => {
    const now = new Date();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const points: { month: string; income: number; expense: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${monthNames[month]}`;

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const firstStr = firstDay.toISOString().split('T')[0];
      const lastStr = lastDay.toISOString().split('T')[0];

      let income = 0;
      let expense = 0;

      for (const tx of allTransactions) {
        if (tx.transaction_date >= firstStr && tx.transaction_date <= lastStr) {
          if (tx.type === 'income') {
            income += Math.abs(Number(tx.amount));
          } else {
            expense += Math.abs(Number(tx.amount));
          }
        }
      }

      points.push({ month: label, income, expense });
    }

    return points;
  }, [allTransactions]);

  // Generate budget alerts from category breakdown vs rough budget thresholds
  const budgetAlerts = useMemo((): BudgetAlert[] => {
    if (!summary || !categoryBreakdown || categoryBreakdown.length === 0) return [];

    const alerts: BudgetAlert[] = [];
    const avgPerCategory = summary.totalExpenses / Math.max(categoryBreakdown.length, 1);

    categoryBreakdown.forEach((cat) => {
      if (cat.amount > avgPerCategory * 2) {
        alerts.push({
          id: `alert-${cat.category}`,
          type: 'warning',
          category: cat.category,
          message: `${cat.category} representa ${cat.percentage.toFixed(0)}% das despesas`,
          amount: cat.amount,
          threshold: avgPerCategory,
          created_at: new Date().toISOString(),
        });
      }
    });

    return alerts;
  }, [summary, categoryBreakdown]);

  // Compute all available year-months from statements
  const availableMonths = useMemo(() => {
    if (!statements || statements.length === 0) return [];
    const months = new Set<string>();
    statements.forEach((s) => {
      if (s.statement_period_start) {
        const [y, m] = s.statement_period_start.split('-');
        months.add(`${y}-${m}`);
      } else if (allTransactions.length > 0) {
        // Infer period from transactions when period_start is null
        const stmtTransactions = allTransactions.filter(t => t.statement_id === s.id);
        if (stmtTransactions.length > 0) {
          const dates = stmtTransactions.map(t => new Date(t.transaction_date));
          const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
          const y = earliest.getFullYear().toString();
          const m = (earliest.getMonth() + 1).toString().padStart(2, '0');
          months.add(`${y}-${m}`);
          log.info('[FinanceDashboard] Inferred period for statement', s.id, `${y}-${m}`);
        } else {
          log.warn('[FinanceDashboard] Statement has no period_start and no transactions:', s.id);
        }
      }
    });
    return Array.from(months)
      .map(key => { const [y, m] = key.split('-'); return { year: parseInt(y), month: parseInt(m) }; })
      .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
  }, [statements, allTransactions]);

  // Transactions for selected month
  // Parse date string directly to avoid timezone shift (new Date('2026-03-01') → Feb 28 in BRT)
  const selectedMonthTransactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter(t => {
      const [y, m] = t.transaction_date.split('-').map(Number);
      return y === selectedYear && m === selectedMonth;
    });
  }, [allTransactions, selectedYear, selectedMonth]);

  // Summary for selected month — statement metadata is the source of truth (from bank PDF)
  // Transaction sums are fallback only (can be incomplete due to query limits or dedup)
  const selectedMonthSummary = useMemo(() => {
    // Find statement(s) whose period overlaps the selected month
    const monthPadded = String(selectedMonth).padStart(2, '0');
    const firstOfMonth = `${selectedYear}-${monthPadded}-01`;
    const lastOfMonth = `${selectedYear}-${monthPadded}-31`;

    const monthStatements = statements
      .filter(s =>
        s.processing_status === 'completed' &&
        s.statement_period_start &&
        s.statement_period_end &&
        s.statement_period_start <= lastOfMonth &&
        s.statement_period_end >= firstOfMonth
      )
      .sort((a, b) => (b.statement_period_end || '').localeCompare(a.statement_period_end || ''));

    const monthStatement = monthStatements[0];

    // Prefer statement metadata (authoritative, from bank PDF)
    // Fall back to transaction sums when no statement exists
    const txIncome = selectedMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const txExpenses = selectedMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const income = monthStatement?.total_credits != null ? Number(monthStatement.total_credits) : txIncome;
    const expenses = monthStatement?.total_debits != null ? Number(monthStatement.total_debits) : txExpenses;
    const balance = monthStatement?.closing_balance != null ? Number(monthStatement.closing_balance) : income - expenses;

    return { income, expenses, balance, count: selectedMonthTransactions.length, hasStatement: !!monthStatement };
  }, [selectedMonthTransactions, statements, selectedYear, selectedMonth]);

  // Trigger Financial Health Score computation when monthly summary data is available
  useEffect(() => {
    if (!summary || summary.transactionCount === 0) return;
    if (selectedMonthSummary.income === 0 && selectedMonthSummary.expenses === 0) return;

    const monthlyIncome = selectedMonthSummary.income;
    const monthlyExpenses = selectedMonthSummary.expenses;
    const savingsRate = monthlyIncome > 0
      ? Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome)
      : 0;

    computeHealth({
      monthlyIncome,
      monthlyExpenses,
      billsOnTimeRate: 1.0, // Not tracked yet — assume on-time
      emergencyFundMonths: 0, // Not tracked yet
      savingsRate,
      debtToIncomeRatio: 0, // Not tracked yet
      creditUtilization: 0, // Not tracked yet
      hasInsurance: false, // Not tracked yet
      retirementSaving: false, // Not tracked yet
      hasEmergencyFund: false, // Not tracked yet
    });
  }, [summary, selectedMonthSummary, computeHealth]);

  // Poorly categorized transactions for selected month
  const poorlyCategorized = useMemo(() => {
    return selectedMonthTransactions.filter(
      t => t.type === 'expense' && (t.category === 'transfer' || t.category === 'other' || !t.category)
    );
  }, [selectedMonthTransactions]);

  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const [isApplyingSuggestions, setIsApplyingSuggestions] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySuggestion[] | null>(null);

  const handleRecategorize = async () => {
    try {
      setIsRecategorizing(true);
      const { suggestions, error } = await getCategorySuggestions(userId, selectedMonth, selectedYear);
      if (error) {
        log.error('Recategorization error:', error);
        return;
      }
      if (suggestions.length === 0) {
        log.info('No suggestions from AI');
        return;
      }
      setCategorySuggestions(suggestions);
    } catch (err) {
      log.error('Recategorization failed:', err);
    } finally {
      setIsRecategorizing(false);
    }
  };

  const [isBulkRecategorizing, setIsBulkRecategorizing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  const handleBulkRecategorize = async () => {
    try {
      setIsBulkRecategorizing(true);
      setBulkProgress('Iniciando...');
      const { updated, total, error } = await recategorizeAllTransactions(
        userId,
        (done, totalTx) => setBulkProgress(`${done}/${totalTx} transações processadas`)
      );
      if (error) {
        log.error('Bulk recategorization error:', error);
        setBulkProgress(`Erro: ${error}`);
      } else {
        setBulkProgress(`${updated} de ${total} transações re-categorizadas`);
        await refreshAll();
        await loadData();
      }
    } catch (err) {
      log.error('Bulk recategorization failed:', err);
      setBulkProgress('Erro inesperado');
    } finally {
      setIsBulkRecategorizing(false);
    }
  };

  const handleApplySuggestions = async (reviewed: CategorySuggestion[]) => {
    try {
      setIsApplyingSuggestions(true);
      const { updated, error } = await applyCategorySuggestions(reviewed);
      if (error) {
        log.error('Apply suggestions error:', error);
      } else {
        log.info(`Applied ${updated} category changes`);
        await refreshAll();
        await loadData();
      }
      setCategorySuggestions(null);
    } catch (err) {
      log.error('Apply suggestions failed:', err);
    } finally {
      setIsApplyingSuggestions(false);
    }
  };

  // Check if there's data to show
  const hasData = summary && summary.transactionCount > 0;

  if (loading) {
    return (
      <div className="h-screen bg-ceramic-base flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-6">
          <div className="h-8 bg-ceramic-cool rounded w-48" />
          <div className="h-32 bg-ceramic-cool rounded-2xl" />
          <div className="h-64 bg-ceramic-cool rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Render function for sub-views that replace the main content ──
  const renderSubView = () => {
    switch (activeView) {
      case 'budget':
        return (
          <div className="flex-1 overflow-hidden">
            <BudgetView userId={userId} onBack={onBack} />
          </div>
        );
      case 'transactions':
        return (
          <div className="flex-1 overflow-y-auto px-6 pb-40">
            <TransactionListView userId={userId} />
          </div>
        );
      case 'analysis':
        return (
          <div className="flex-1 overflow-y-auto px-6 pb-40">
            <MonthComparisonView userId={userId} />
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 overflow-y-auto px-6 pb-40">
            <AccountManagement userId={userId} />
          </div>
        );
      default:
        return null;
    }
  };

  // ── Non-history views get a shared shell ──
  if (activeView !== 'panorama') {
    return (
      <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
        {/* Navigation Header */}
        <div className="pt-6 px-6 lg:px-12 pb-4 flex-shrink-0 border-b border-ceramic-border/40">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 ceramic-inset flex items-center justify-center hover:scale-105 transition-transform"
              >
                <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
              </button>
            )}
            <Logo variant="default" width={36} className="rounded-lg hidden lg:block" />
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-ceramic-text-primary text-etched leading-tight">
                Finanças
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary hidden lg:block">
                AICA Life OS
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 lg:gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveView(tab.key)}
                  className={`
                    flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-full text-xs lg:text-sm font-bold
                    whitespace-nowrap transition-all duration-200 flex-shrink-0
                    ${isActive
                      ? 'bg-ceramic-accent/10 text-ceramic-accent shadow-sm'
                      : 'text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-ceramic-cool'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-view Content */}
        {renderSubView()}

      </div>
    );
  }

  // ── History / Overview view ──
  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-6 px-6 lg:px-12 pb-4 flex-shrink-0 border-b border-ceramic-border/40">
        {/* Top Row: Logo + Title + Period Navigator + Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 ceramic-inset flex items-center justify-center hover:scale-105 transition-transform"
              >
                <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
              </button>
            )}
            <Logo variant="default" width={36} className="rounded-lg hidden lg:block" />
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-ceramic-text-primary text-etched leading-tight">
                Finanças
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary hidden lg:block">
                AICA Life OS
              </p>
            </div>
          </div>

          {/* Period Navigator */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="ceramic-inset w-7 h-8 flex items-center justify-center hover:scale-105 transition-transform"
              title="Ano anterior"
            >
              <span className="text-xs font-black text-ceramic-text-secondary">«</span>
            </button>
            <button
              onClick={() => {
                const prev = selectedMonth === 1
                  ? { month: 12, year: selectedYear - 1 }
                  : { month: selectedMonth - 1, year: selectedYear };
                setSelectedMonth(prev.month);
                setSelectedYear(prev.year);
              }}
              className="ceramic-inset w-7 h-8 flex items-center justify-center hover:scale-105 transition-transform"
              title="Mês anterior"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-ceramic-text-secondary" />
            </button>
            <span className="text-sm font-bold text-ceramic-text-primary min-w-[100px] text-center">
              {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={() => {
                const next = selectedMonth === 12
                  ? { month: 1, year: selectedYear + 1 }
                  : { month: selectedMonth + 1, year: selectedYear };
                setSelectedMonth(next.month);
                setSelectedYear(next.year);
              }}
              className="ceramic-inset w-7 h-8 flex items-center justify-center hover:scale-105 transition-transform"
              title="Próximo mês"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-ceramic-text-secondary rotate-180" />
            </button>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="ceramic-inset w-7 h-8 flex items-center justify-center hover:scale-105 transition-transform"
              title="Próximo ano"
            >
              <span className="text-xs font-black text-ceramic-text-secondary">»</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={toggleVisibility} className="ceramic-concave p-2 hover:scale-95 transition-transform" title={isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}>
              {isValuesVisible ? <EyeOff className="w-4 h-4 text-ceramic-text-secondary" /> : <Eye className="w-4 h-4 text-ceramic-text-secondary" />}
            </button>
            <button onClick={() => setShowUpload(!showUpload)} className="ceramic-card p-2 hover:scale-105 transition-transform" title="Upload de Extrato">
              <Upload className="w-4 h-4 text-ceramic-text-primary" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 lg:gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={`
                  flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 lg:py-2.5 rounded-full text-xs lg:text-sm font-bold
                  whitespace-nowrap transition-all duration-200 flex-shrink-0
                  ${isActive
                    ? 'bg-ceramic-accent/10 text-ceramic-accent shadow-sm'
                    : 'text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-ceramic-cool'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      {hasData && (
        <div className="px-6 lg:px-12 py-4">
          <div className="max-w-7xl mx-auto grid grid-cols-3 gap-3 lg:gap-4">
            <div className="ceramic-tray p-3 lg:p-4 text-center">
              <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">Receita</p>
              <p className="text-lg lg:text-2xl font-black text-ceramic-success">{formatCurrency(selectedMonthSummary.income)}</p>
            </div>
            <div className="ceramic-tray p-3 lg:p-4 text-center">
              <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">Despesa</p>
              <p className="text-lg lg:text-2xl font-black text-ceramic-error">{formatCurrency(selectedMonthSummary.expenses)}</p>
            </div>
            <div className="ceramic-tray p-3 lg:p-4 text-center">
              <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                {selectedMonthSummary.hasStatement ? 'Saldo Final' : 'Resultado'}
              </p>
              <p className={`text-lg lg:text-2xl font-black ${selectedMonthSummary.balance >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}>{formatCurrency(selectedMonthSummary.balance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 lg:px-12 pb-40 space-y-6">
        {/* Upload Section (Collapsible) */}
        {showUpload && (
          <div className="max-w-7xl mx-auto ceramic-card p-6">
            <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">
              Upload de Extrato
            </h3>
            <StatementUpload
              userId={userId}
              onUploadComplete={handleUploadComplete}
              onError={(error) => log.error(error)}
            />
          </div>
        )}

        {/* CSV Upload Modal */}
        {showCSVUpload && (
          <CSVUpload
            userId={userId}
            onSuccess={() => { refreshAll(); loadData(); setShowCSVUpload(false); }}
            onClose={() => setShowCSVUpload(false)}
          />
        )}

        {/* Empty State - when no transactions */}
        {!hasData && (
          <FinanceEmptyState
            onUploadPDF={() => setShowUpload(true)}
            onUploadCSV={() => setShowCSVUpload(true)}
            onNavigateBudget={() => setActiveView('budget')}
          />
        )}

        {/* Everything below only shows when there's data */}
        {hasData && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Financial Health Score */}
            {healthResult && !healthLoading && (
              <FinancialHealthCard
                result={healthResult}
                trend={burnRate?.trend === 'decreasing' ? 'improving' : burnRate?.trend === 'increasing' ? 'declining' : 'stable'}
              />
            )}

            {/* Behavioral Economics — Loss Framing Nudge */}
            {selectedMonthSummary && selectedMonthSummary.income > 0 && (
              <LossFramingBanner
                monthlySavings={selectedMonthSummary.income - selectedMonthSummary.expenses}
                mode="savings"
              />
            )}

            {/* Row 1: Alerts — side by side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Digest — AI Insights */}
              <MonthlyDigestCard userId={userId} />

              {/* Proactive Categorization Alert OR Budget Alerts */}
              <div className="space-y-6">
                {poorlyCategorized.length > 0 && (
                  <div className="ceramic-card p-5 border-l-4 border-amber-400">
                    <div className="flex items-start gap-3">
                      <div className="ceramic-concave w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-ceramic-text-primary">
                          {poorlyCategorized.length} {poorlyCategorized.length === 1 ? 'transacao precisa' : 'transacoes precisam'} de categorizacao
                        </h3>
                        <p className="text-xs text-ceramic-text-secondary mt-1">
                          Transacoes classificadas como &quot;transfer&quot; ou &quot;other&quot; podem ser re-categorizadas pela IA.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={handleRecategorize}
                            disabled={isRecategorizing || isBulkRecategorizing}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            {isRecategorizing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Re-categorizando...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                Este mês
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleBulkRecategorize}
                            disabled={isRecategorizing || isBulkRecategorizing}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            {isBulkRecategorizing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {bulkProgress}
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                Todos os meses
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {budgetAlerts.length > 0 && (
                  <FinanceNotificationCard alerts={budgetAlerts} />
                )}
              </div>
            </div>

            {/* Row 2: Main Charts — side by side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IncomeVsExpense income={summary!.totalIncome} expenses={summary!.totalExpenses} monthlyTrend={trendData} />
              <ExpenseChart data={categoryBreakdown} totalExpenses={summary!.totalExpenses} />
            </div>

          </div>
        )}

        {/* Processing Statements (if any) */}
        {statements.some(s => s.processing_status === 'processing') && (
          <div className="max-w-7xl mx-auto ceramic-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-ceramic-info animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ceramic-text-primary">
                  Processando Extratos
                </h3>
                <p className="text-xs text-ceramic-text-secondary">
                  {statements.filter(s => s.processing_status === 'processing').length} {statements.filter(s => s.processing_status === 'processing').length === 1 ? 'extrato' : 'extratos'} em processamento
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {statements
                .filter(s => s.processing_status === 'processing')
                .slice(0, 3)
                .map((statement) => (
                  <div
                    key={statement.id}
                    className="ceramic-tray p-4 flex items-center gap-3"
                  >
                    <Loader2 className="w-4 h-4 text-ceramic-info animate-spin flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ceramic-text-primary truncate">
                        {statement.file_name || 'Processando...'}
                      </p>
                      <p className="text-xs text-ceramic-info">
                        A IA está analisando este extrato...
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}


      </main>

      {/* Interactive Recategorization Review Modal */}
      {categorySuggestions && (
        <RecategorizationReview
          suggestions={categorySuggestions}
          onApply={handleApplySuggestions}
          onClose={() => setCategorySuggestions(null)}
          isApplying={isApplyingSuggestions}
        />
      )}

    </div>
  );
};

export default FinanceDashboard;
