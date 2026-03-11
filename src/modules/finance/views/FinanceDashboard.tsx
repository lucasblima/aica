/**
 * Finance Dashboard View
 *
 * Main view for the Finance module showing overview, upload, and agent access.
 */

import { useTourAutoStart } from '@/hooks/useTourAutoStart';
import { createNamespacedLogger } from '@/lib/logger';
import React, { useEffect, useState, useMemo } from 'react';

const log = createNamespacedLogger('FinanceDashboard');
import { ArrowLeft, Upload, FileText, TrendingUp, Trash2, Calendar, CheckCircle2, Eye, EyeOff, Loader2, Building2, ChevronRight, Target, BarChart3, List, GitCompare, Trophy, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/ui';
import { StatementUpload } from '../components/StatementUpload';
import { CSVUpload } from '../components/CSVUpload';
import { ExpenseChart } from '../components/Charts/ExpenseChart';
import { IncomeVsExpense } from '../components/Charts/IncomeVsExpense';
import { TrendLineChart } from '../components/Charts/TrendLineChart';
import { BudgetView } from './BudgetView';
import { FinanceSearchPanel } from '../components/FinanceSearchPanel';
import { MonthlyDigestCard } from '../components/MonthlyDigestCard';
import { FinanceEmptyState } from '../components/FinanceEmptyState';
import { FinanceNotificationCard } from '../components/FinanceNotificationCard';
import { TransactionListView } from '../components/TransactionListView';
import { MonthComparisonView } from '../components/MonthComparisonView';
import { GoalTracker } from '../components/GoalTracker';
import { AccountManagement } from '../components/AccountManagement';
import { getAllTimeSummary, getBurnRate, getAllTimeCategoryBreakdown, getTransactionsByDateRange, getCategorySuggestions, applyCategorySuggestions, recategorizeAllTransactions } from '../services/financeService';
import type { CategorySuggestion } from '../services/financeService';
import { RecategorizationReview } from '../components/RecategorizationReview';
import { statementService } from '../services/statementService';
import { useFinanceFileSearch } from '../hooks/useFinanceFileSearch';
import type { FinanceSummary, BurnRateData, CategoryBreakdown, FinanceStatement, BudgetAlert, FinanceTransaction } from '../types';

// =====================================================
// Types
// =====================================================

interface FinanceDashboardProps {
  userId: string;
  onBack?: () => void;
}

type DashboardView = 'history' | 'budget' | 'transactions' | 'comparison' | 'goals' | 'accounts';

interface ViewTab {
  key: DashboardView;
  label: string;
  icon: React.ElementType;
}

const VIEW_TABS: ViewTab[] = [
  { key: 'history', label: 'Visão Geral', icon: BarChart3 },
  { key: 'transactions', label: 'Transações', icon: List },
  { key: 'budget', label: 'Orçamento', icon: Target },
  { key: 'comparison', label: 'Comparativo', icon: GitCompare },
  { key: 'goals', label: 'Metas', icon: Trophy },
  { key: 'accounts', label: 'Contas', icon: Building2 },
];

// =====================================================
// Component
// =====================================================

/* data-tour markers: finance-header, balance-overview, income-expenses, budget-categories, transaction-list, upload-statement, ai-insights, goals-tracking */
export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  userId,
  onBack,
}) => {
  // Auto-start tour on first visit (Phase 2 - Organic Onboarding)
  useTourAutoStart('finance-first-visit');

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [allTransactions, setAllTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [isValuesVisible, setIsValuesVisible] = useState(() => {
    const saved = localStorage.getItem('finance_values_visible');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [activeView, setActiveView] = useState<DashboardView>('history');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Persist visibility toggle
  useEffect(() => {
    localStorage.setItem('finance_values_visible', JSON.stringify(isValuesVisible));
  }, [isValuesVisible]);

  // File Search integration
  const {
    searchInStatements,
    findByCategory,
    findByMerchant,
    findAnomalies,
    findExpensePatterns,
    searchResults,
    isSearching,
    documents,
    clearSearchResults,
  } = useFinanceFileSearch({ userId, autoLoad: false });

  const hasIndexedStatements = documents.length > 0;

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

      const [summaryData, burnRateData, categoryData, statementsData, trendTransactions] = await Promise.all([
        getAllTimeSummary(userId),
        getBurnRate(userId),
        getAllTimeCategoryBreakdown(userId),
        statementService.getStatements(userId),
        getTransactionsByDateRange(userId, trendStart, trendEnd),
      ]);

      setSummary(summaryData);
      setBurnRate(burnRateData);
      setCategoryBreakdown(categoryData);
      setStatements(statementsData);
      setAllTransactions(trendTransactions);
    } catch (error) {
      log.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (statement: FinanceStatement) => {
    setStatements((prev) => [statement, ...prev]);
    setShowUpload(false);
    loadData(); // Refresh all data
  };

  const handleDelete = async (statementId: string) => {
    if (!confirm('Tem certeza que deseja deletar este extrato? Esta acao nao pode ser desfeita.')) {
      return;
    }

    try {
      setDeletingId(statementId);
      await statementService.deleteStatement(statementId);
      setStatements((prev) => prev.filter((s) => s.id !== statementId));
      loadData(); // Refresh summary
    } catch (error) {
      log.error('Error deleting statement:', error);
      alert('Erro ao deletar extrato. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Tem certeza que deseja deletar TODOS os ${statements.length} extratos? Esta acao nao pode ser desfeita.`)) {
      return;
    }

    try {
      setDeletingAll(true);

      // Delete all statements sequentially
      for (const statement of statements) {
        await statementService.deleteStatement(statement.id);
      }

      setStatements([]);
      loadData(); // Refresh summary
      setShowManagement(false);
      alert('Todos os extratos foram deletados com sucesso!');
    } catch (error) {
      log.error('Error deleting all statements:', error);
      alert('Erro ao deletar extratos. Alguns podem nao ter sido deletados.');
    } finally {
      setDeletingAll(false);
    }
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    const startMonth = start.toLocaleDateString('pt-BR', { month: 'short' });
    const endMonth = end.toLocaleDateString('pt-BR', { month: 'short' });
    const year = start.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} ${year}`;
    }

    return `${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} - ${endMonth.charAt(0).toUpperCase() + endMonth.slice(1)} ${year}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          text: 'Processado',
          className: 'bg-ceramic-success/10 text-ceramic-success border-ceramic-success/20',
          icon: <CheckCircle2 className="w-3 h-3" />
        };
      case 'processing':
        return {
          text: 'Processando',
          className: 'bg-ceramic-info/10 text-ceramic-info border-ceramic-info/20',
          icon: <Loader2 className="w-3 h-3 animate-spin" />
        };
      case 'failed':
        return {
          text: 'Erro',
          className: 'bg-ceramic-error/10 text-ceramic-error border-ceramic-error/20',
          icon: null
        };
      default:
        return {
          text: 'Pendente',
          className: 'bg-ceramic-base text-ceramic-text-primary border-ceramic-border',
          icon: null
        };
    }
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
      case 'comparison':
        return (
          <div className="flex-1 overflow-y-auto px-6 pb-40">
            <MonthComparisonView userId={userId} />
          </div>
        );
      case 'goals':
        return (
          <div className="flex-1 overflow-y-auto px-6 pb-40">
            <GoalTracker userId={userId} />
          </div>
        );
      case 'accounts':
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
  if (activeView !== 'history') {
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
            onSuccess={() => { loadData(); setShowCSVUpload(false); }}
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

            {/* Row 3: Trend Line — full width */}
            {trendData.some(d => d.income > 0 || d.expense > 0) && (
              <TrendLineChart data={trendData} />
            )}

            {/* Row 4: Goals + Burn Rate — side by side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GoalTracker userId={userId} />

              {burnRate && burnRate.averageMonthlyExpense > 0 && (
                <div className="ceramic-card p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-ceramic-text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ceramic-text-primary">
                        Burn Rate Mensal
                      </h3>
                      <p className="text-xs text-ceramic-text-secondary">
                        Média dos últimos 3 meses
                      </p>
                    </div>
                  </div>

                  <div className="ceramic-tray px-6 py-4 flex items-center justify-between">
                    <p className="text-3xl font-black text-ceramic-text-primary text-etched">
                      {formatCurrency(burnRate.averageMonthlyExpense)}
                    </p>
                    {isValuesVisible && burnRate.trend !== 'stable' && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`ceramic-inset px-3 py-1.5 text-xs font-bold ${
                            burnRate.trend === 'decreasing'
                              ? 'text-ceramic-success'
                              : 'text-ceramic-error'
                          }`}
                        >
                          {burnRate.trend === 'decreasing' ? '\u2193' : '\u2191'}{' '}
                          {Math.abs(burnRate.percentageChange).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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

        {/* Manage Statements */}
        {statements.length > 0 && (
          <div className="max-w-7xl mx-auto ceramic-card p-6 space-y-4">
            <button
              onClick={() => setShowManagement(!showManagement)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-ceramic-text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-ceramic-text-primary">
                    Gerenciar Extratos
                  </h3>
                  <p className="text-xs text-ceramic-text-secondary">
                    {statements.length} {statements.length === 1 ? 'extrato' : 'extratos'} - Clique para expandir
                  </p>
                </div>
              </div>
              <div className={`transition-transform ${showManagement ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-ceramic-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showManagement && (
              <div className="space-y-3 pt-2">
                {/* Delete All Button */}
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="w-full ceramic-tray p-3 flex items-center justify-center gap-2 hover:bg-ceramic-error/10 transition-colors disabled:opacity-50"
                >
                  {deletingAll ? (
                    <Loader2 className="w-4 h-4 text-ceramic-error animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-ceramic-error" />
                  )}
                  <span className="text-sm font-bold text-ceramic-error">
                    {deletingAll ? 'Deletando...' : 'Deletar Todos os Extratos'}
                  </span>
                </button>

                {/* Missing Months Alert */}
                {(() => {
                  const sorted = [...statements]
                    .filter(s => s.statement_period_start)
                    .sort((a, b) => (a.statement_period_start || '').localeCompare(b.statement_period_start || ''));
                  if (sorted.length < 2) return null;

                  const missingMonths: string[] = [];
                  const firstDate = new Date(sorted[0].statement_period_start + 'T00:00:00');
                  const lastDate = new Date(sorted[sorted.length - 1].statement_period_start + 'T00:00:00');
                  const coveredMonths = new Set(sorted.map(s => s.statement_period_start!.substring(0, 7)));

                  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
                  const end = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
                  while (cursor <= end) {
                    const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
                    if (!coveredMonths.has(ym)) missingMonths.push(ym);
                    cursor.setMonth(cursor.getMonth() + 1);
                  }

                  if (missingMonths.length === 0) return null;

                  const formatMonth = (ym: string) => {
                    const [y, m] = ym.split('-');
                    const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    return `${names[parseInt(m) - 1]} ${y}`;
                  };

                  return (
                    <div className="ceramic-inset rounded-xl p-4 flex items-start gap-3 border border-amber-200/50">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-ceramic-text-primary">
                          {missingMonths.length === 1 ? '1 mês sem extrato' : `${missingMonths.length} meses sem extrato`}
                        </p>
                        <p className="text-xs text-ceramic-text-secondary">
                          Importe os extratos faltantes para ter uma visão completa das suas finanças.
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {missingMonths.map(ym => (
                            <span key={ym} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[11px] font-semibold">
                              {formatMonth(ym)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Statements List */}
                <div className="space-y-3">
                  {[...statements].sort((a, b) => (b.statement_period_start || '').localeCompare(a.statement_period_start || '')).map((statement) => {
                    const statusBadge = getStatusBadge(statement.processing_status || 'pending');

                    return (
                      <div
                        key={statement.id}
                        className="ceramic-card p-5 hover:scale-[1.01] transition-all duration-200 group"
                      >
                        <div className="flex items-start gap-4">
                          {/* Bank Icon */}
                          <div className="ceramic-concave w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <Building2 className="w-6 h-6 text-ceramic-accent" />
                          </div>

                          {/* Main Info */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Header: Bank Name + Status Badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-black text-ceramic-text-primary text-etched">
                                {statement.bank_name || 'Banco Desconhecido'}
                              </h4>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadge.className}`}>
                                {statusBadge.icon}
                                {statusBadge.text}
                              </span>
                            </div>

                            {/* Period */}
                            {statement.statement_period_start && statement.statement_period_end && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                                <span className="text-xs font-medium text-ceramic-text-secondary">
                                  {formatPeriod(statement.statement_period_start, statement.statement_period_end)}
                                </span>
                              </div>
                            )}

                            {/* Financial Flow: Inicial → Receita / Despesa → Final */}
                            <div className="grid grid-cols-4 gap-2">
                              <div className="ceramic-inset px-2.5 py-2 rounded-lg text-center">
                                <p className="text-[10px] text-ceramic-text-secondary">Inicial</p>
                                <p className="text-xs font-bold text-ceramic-text-primary">{formatCurrency(statement.opening_balance || 0)}</p>
                              </div>
                              <div className="ceramic-inset px-2.5 py-2 rounded-lg text-center">
                                <p className="text-[10px] text-ceramic-text-secondary">Receita</p>
                                <p className="text-xs font-bold text-ceramic-success">{formatCurrency(statement.total_credits || 0)}</p>
                              </div>
                              <div className="ceramic-inset px-2.5 py-2 rounded-lg text-center">
                                <p className="text-[10px] text-ceramic-text-secondary">Despesa</p>
                                <p className="text-xs font-bold text-ceramic-error">{formatCurrency(statement.total_debits || 0)}</p>
                              </div>
                              <div className="ceramic-inset px-2.5 py-2 rounded-lg text-center">
                                <p className="text-[10px] text-ceramic-text-secondary">Final</p>
                                <p className="text-xs font-bold text-ceramic-success">{formatCurrency(statement.closing_balance || 0)}</p>
                              </div>
                            </div>

                            {/* Transaction count + file name */}
                            <div className="flex items-center gap-3 text-[10px] text-ceramic-text-secondary">
                              <span className="inline-flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {statement.transaction_count || 0} {(statement.transaction_count || 0) === 1 ? 'transação' : 'transações'}
                              </span>
                              {statement.file_name && (
                                <span className="truncate max-w-[200px]">
                                  {statement.file_name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(statement.id)}
                            disabled={deletingId === statement.id || deletingAll}
                            className="ceramic-inset w-9 h-9 flex items-center justify-center hover:scale-110 hover:bg-ceramic-error/10 transition-all disabled:opacity-50 flex-shrink-0 group"
                            title="Deletar extrato"
                          >
                            {deletingId === statement.id ? (
                              <Loader2 className="w-4 h-4 text-ceramic-error animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-ceramic-error group-hover:scale-110 transition-transform" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* File Search Integration - Only show if statements are indexed */}
        {hasIndexedStatements && statements.length > 0 && (
          <div className="max-w-7xl mx-auto ceramic-card p-6">
            <FinanceSearchPanel
              onSearch={async (query) => {
                const results = await searchInStatements(query, 10);
                return results;
              }}
              onSearchCategory={async (category) => {
                const results = await findByCategory(category, 10);
                return results;
              }}
              onSearchMerchant={async (merchant) => {
                const results = await findByMerchant(merchant, 10);
                return results;
              }}
              onSearchAnomalies={async () => {
                const results = await findAnomalies(10);
                return results;
              }}
              onSearchPatterns={async (pattern) => {
                const results = await findExpensePatterns(pattern, 10);
                return results;
              }}
              results={searchResults}
              isSearching={isSearching}
              hasStatements={hasIndexedStatements}
            />
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
