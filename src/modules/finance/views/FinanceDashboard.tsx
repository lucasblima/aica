/**
 * Finance Dashboard View
 *
 * Main view for the Finance module showing overview, upload, and agent access.
 */

import { useTourAutoStart } from '@/hooks/useTourAutoStart';
import { createNamespacedLogger } from '@/lib/logger';
import React, { useEffect, useState, useMemo } from 'react';

const log = createNamespacedLogger('FinanceDashboard');
import { ArrowLeft, MessageSquare, Upload, FileText, TrendingUp, Wallet, Trash2, Calendar, CheckCircle2, Eye, EyeOff, Loader2, Building2, ChevronRight, LayoutDashboard, Target, FileSpreadsheet } from 'lucide-react';
import { StatementUpload } from '../components/StatementUpload';
import { CSVUpload } from '../components/CSVUpload';
import { ExpenseChart } from '../components/Charts/ExpenseChart';
import { IncomeVsExpense } from '../components/Charts/IncomeVsExpense';
import { BudgetView } from './BudgetView';
import { FinanceSearchPanel } from '../components/FinanceSearchPanel';
import { getAllTimeSummary, getBurnRate, getAllTimeCategoryBreakdown } from '../services/financeService';
import { statementService } from '../services/statementService';
import { useFinanceFileSearch } from '../hooks/useFinanceFileSearch';
import type { FinanceSummary, BurnRateData, CategoryBreakdown, FinanceStatement } from '../types';

// =====================================================
// Types
// =====================================================

interface FinanceDashboardProps {
  userId: string;
  onNavigateToAgent: () => void;
  onBack?: () => void;
}

interface MonthData {
  month: number;
  monthName: string;
  year: number;
  hasData: boolean;
  transactionCount: number;
  statementCount: number;
  openingBalance: number;
  closingBalance: number;
  processingStatus: 'completed' | 'processing' | 'failed' | 'empty';
}

// =====================================================
// Component
// =====================================================

/* data-tour markers: finance-header, balance-overview, income-expenses, budget-categories, transaction-list, upload-statement, ai-insights, goals-tracking */
export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  userId,
  onNavigateToAgent,
  onBack,
}) => {
  // Auto-start tour on first visit (Phase 2 - Organic Onboarding)
  useTourAutoStart('finance-first-visit');

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [isValuesVisible, setIsValuesVisible] = useState(false);
  const [activeView, setActiveView] = useState<'budget' | 'history'>('history');

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
  } = useFinanceFileSearch({ userId, autoLoad: true });

  const hasIndexedStatements = documents.length > 0;

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, burnRateData, categoryData, statementsData] = await Promise.all([
        getAllTimeSummary(userId),
        getBurnRate(userId),
        getAllTimeCategoryBreakdown(userId),
        statementService.getStatements(userId),
      ]);

      setSummary(summaryData);
      setBurnRate(burnRateData);
      setCategoryBreakdown(categoryData);
      setStatements(statementsData);
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
    if (!confirm('Tem certeza que deseja deletar este extrato? Esta ação não pode ser desfeita.')) {
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
    if (!confirm(`Tem certeza que deseja deletar TODOS os ${statements.length} extratos? Esta ação não pode ser desfeita.`)) {
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
      alert('Erro ao deletar extratos. Alguns podem não ter sido deletados.');
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

  // Process statements into monthly data
  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Create map of month -> data with balances
    const monthMap = new Map<string, {
      transactionCount: number;
      statementCount: number;
      openingBalance: number;
      closingBalance: number;
      statements: FinanceStatement[];
    }>();

    log.debug('[FinanceDashboard] Processing statements for monthly data:', statements?.length || 0);

    // Handle empty statements array
    if (!statements || statements.length === 0) {
      log.debug('[FinanceDashboard] No statements, returning empty month data');
      const months: MonthData[] = [];
      for (let month = 1; month <= 12; month++) {
        months.push({
          month,
          monthName: monthNames[month - 1],
          year: currentYear,
          hasData: false,
          transactionCount: 0,
          statementCount: 0,
          openingBalance: 0,
          closingBalance: 0,
          processingStatus: 'empty',
        });
      }
      return months;
    }

    statements.forEach((statement) => {
      log.debug('[FinanceDashboard] Statement:', {
        id: statement.id,
        file_name: statement.file_name,
        statement_period_start: statement.statement_period_start,
        transaction_count: statement.transaction_count,
        processing_status: statement.processing_status,
      });

      if (statement.statement_period_start) {
        // Parse date carefully to avoid timezone issues
        const dateStr = statement.statement_period_start;
        const [yearStr, monthStr] = dateStr.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const key = `${year}-${month}`;

        log.debug('[FinanceDashboard] Parsed date:', { dateStr, year, month, key });

        const existing = monthMap.get(key) || {
          transactionCount: 0,
          statementCount: 0,
          openingBalance: 0,
          closingBalance: 0,
          statements: []
        };

        existing.statements.push(statement);

        monthMap.set(key, {
          transactionCount: existing.transactionCount + (statement.transaction_count || 0),
          statementCount: existing.statementCount + 1,
          openingBalance: existing.openingBalance,
          closingBalance: existing.closingBalance,
          statements: existing.statements,
        });
      } else {
        log.warn('[FinanceDashboard] Statement missing period_start:', statement.id);
      }
    });

    // Calculate opening and closing balances for each month
    monthMap.forEach((data, key) => {
      // Sort statements by period start to get first statement
      const sortedStatements = data.statements.sort((a, b) =>
        (a.statement_period_start || '').localeCompare(b.statement_period_start || '')
      );

      // Opening balance is from the first statement
      data.openingBalance = sortedStatements[0]?.opening_balance || 0;

      // Closing balance is from the last statement (or could be calculated from opening + credits - debits)
      data.closingBalance = sortedStatements[sortedStatements.length - 1]?.closing_balance || 0;
    });

    log.debug('[FinanceDashboard] Month map:', Array.from(monthMap.entries()));

    // Generate 12 months for current year
    const months: MonthData[] = [];
    for (let month = 1; month <= 12; month++) {
      const key = `${currentYear}-${month}`;
      const data = monthMap.get(key);

      // Determine processing status
      let processingStatus: 'completed' | 'processing' | 'failed' | 'empty' = 'empty';
      if (data && data.statements.length > 0) {
        const hasProcessing = data.statements.some(s => s.processing_status === 'processing');
        const hasFailed = data.statements.some(s => s.processing_status === 'failed');
        const hasCompleted = data.statements.some(s => s.processing_status === 'completed');

        if (hasProcessing) {
          processingStatus = 'processing';
        } else if (hasFailed) {
          processingStatus = 'failed';
        } else if (hasCompleted) {
          processingStatus = 'completed';
        }
      }

      months.push({
        month,
        monthName: monthNames[month - 1],
        year: currentYear,
        hasData: !!data,
        transactionCount: data?.transactionCount || 0,
        statementCount: data?.statementCount || 0,
        openingBalance: data?.openingBalance || 0,
        closingBalance: data?.closingBalance || 0,
        processingStatus,
      });
    }

    log.debug('[FinanceDashboard] Monthly data generated:', months);

    return months;
  }, [statements]);

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

  // Render Budget View if active
  if (activeView === 'budget') {
    return (
      <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
        {/* Navigation Header */}
        <div className="pt-8 px-6 pb-4 flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
            </button>
          )}

          {/* View Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveView('history')}
              className="ceramic-tray px-4 py-2 hover:scale-105 transition-transform flex items-center gap-2 opacity-60 hover:opacity-100"
            >
              <Calendar className="w-4 h-4 text-ceramic-text-primary" />
              <span className="text-sm font-bold text-ceramic-text-primary">Calendário & Extratos</span>
            </button>
            <button
              className="ceramic-concave px-4 py-2 flex items-center gap-2 bg-gradient-to-br from-ceramic-info-bg to-transparent"
            >
              <Target className="w-4 h-4 text-ceramic-info" />
              <span className="text-sm font-bold text-ceramic-info">Orçamento</span>
            </button>
          </div>
        </div>

        {/* Budget View Content */}
        <div className="flex-1 overflow-hidden">
          <BudgetView userId={userId} onBack={onBack} />
        </div>
      </div>
    );
  }

  // Otherwise render History/Dashboard view
  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-8 px-6 pb-6 flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
          </button>
        )}

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            className="ceramic-concave px-4 py-2 flex items-center gap-2 bg-gradient-to-br from-ceramic-info-bg to-transparent"
          >
            <Calendar className="w-4 h-4 text-ceramic-info" />
            <span className="text-sm font-bold text-ceramic-info">Calendário & Extratos</span>
          </button>
          <button
            onClick={() => setActiveView('budget')}
            className="ceramic-tray px-4 py-2 hover:scale-105 transition-transform flex items-center gap-2 opacity-60 hover:opacity-100"
          >
            <Target className="w-4 h-4 text-ceramic-text-primary" />
            <span className="text-sm font-bold text-ceramic-text-primary">Orçamento</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1">
              Modulo
            </p>
            <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">
              Financas
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleVisibility}
              className="ceramic-concave p-3 hover:scale-95 transition-transform"
              title={isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
            >
              {isValuesVisible ? (
                <EyeOff className="w-5 h-5 text-ceramic-text-secondary" />
              ) : (
                <Eye className="w-5 h-5 text-ceramic-text-secondary" />
              )}
            </button>
            <button
              onClick={() => {
                log.debug('=== DEBUG: All Statements ===');
                console.table(statements.map(s => ({
                  file_name: s.file_name,
                  bank_name: s.bank_name,
                  period_start: s.statement_period_start,
                  period_end: s.statement_period_end,
                  transactions: s.transaction_count,
                  status: s.processing_status,
                })));
              }}
              className="ceramic-card p-3 hover:scale-105 transition-transform"
              title="Debug Statements"
            >
              <span className="text-xs font-bold text-ceramic-error">DEBUG</span>
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="ceramic-card p-3 hover:scale-105 transition-transform"
              title="Upload de Extrato"
            >
              <Upload className="w-5 h-5 text-ceramic-text-primary" />
            </button>
            <button
              onClick={onNavigateToAgent}
              className="ceramic-card p-3 hover:scale-105 transition-transform"
              title="Assistente Financeiro"
            >
              <MessageSquare className="w-5 h-5 text-ceramic-accent" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
        {/* Upload Section (Collapsible) */}
        {showUpload && (
          <div className="ceramic-card p-6">
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
            onSuccess={handleUploadComplete}
            onClose={() => setShowCSVUpload(false)}
          />
        )}

        {/* Summary Section */}
        {summary && summary.transactionCount > 0 ? (
          <div className="ceramic-card p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-ceramic-text-secondary/10">
              <div>
                <h3 className="text-lg font-black text-ceramic-text-primary text-etched">
                  Resumo Financeiro
                </h3>
                <p className="text-xs text-ceramic-text-secondary mt-1">
                  Visão consolidada de todos os períodos
                </p>
              </div>
              <div className="ceramic-concave w-12 h-12 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-ceramic-text-primary" />
              </div>
            </div>

            {/* Main Balance */}
            <div className="ceramic-tray p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-2">
                Saldo Acumulado
              </p>
              <p
                className={`text-5xl font-black text-etched ${
                  summary.currentBalance >= 0 ? 'text-ceramic-positive' : 'text-ceramic-negative'
                }`}
              >
                {formatCurrency(summary.currentBalance)}
              </p>
              {isValuesVisible && (
                <p className="text-xs text-ceramic-text-secondary mt-3">
                  {summary.transactionCount} transações processadas
                </p>
              )}
            </div>

            {/* Income & Expenses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="ceramic-inset w-8 h-8 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-ceramic-success" />
                  </div>
                  <span className="text-xs font-medium text-ceramic-text-secondary">
                    Receitas
                  </span>
                </div>
                <p className="text-2xl font-bold text-ceramic-success">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="ceramic-inset w-8 h-8 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-ceramic-error rotate-180" />
                  </div>
                  <span className="text-xs font-medium text-ceramic-text-secondary">
                    Despesas
                  </span>
                </div>
                <p className="text-2xl font-bold text-ceramic-error">
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Charts */}
        {summary && isValuesVisible && (
          <>
            <IncomeVsExpense income={summary.totalIncome} expenses={summary.totalExpenses} />

            <ExpenseChart data={categoryBreakdown} totalExpenses={summary.totalExpenses} />
          </>
        )}

        {/* Burn Rate */}
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
                    {burnRate.trend === 'decreasing' ? '↓' : '↑'}{' '}
                    {Math.abs(burnRate.percentageChange).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly Coverage Calendar */}
        <div className="ceramic-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-ceramic-text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ceramic-text-primary">
                  Cobertura {new Date().getFullYear()}
                </h3>
                <p className="text-xs text-ceramic-text-secondary">
                  {monthlyData.filter(m => m.hasData).length} de 12 meses com dados
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="ceramic-card px-4 py-2 hover:scale-105 transition-transform flex items-center gap-2"
                title="Upload PDF"
              >
                <FileText className="w-3.5 h-3.5 text-ceramic-accent" />
                <span className="text-xs font-bold text-ceramic-accent">PDF</span>
              </button>
              <button
                onClick={() => setShowCSVUpload(true)}
                className="ceramic-card px-4 py-2 hover:scale-105 transition-transform flex items-center gap-2"
                title="Upload CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-ceramic-success" />
                <span className="text-xs font-bold text-ceramic-success">CSV</span>
              </button>
            </div>
          </div>

          {/* Monthly Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {monthlyData.map((monthData) => {
              const isProcessing = monthData.processingStatus === 'processing';
              const isCompleted = monthData.processingStatus === 'completed';
              const isFailed = monthData.processingStatus === 'failed';
              const isEmpty = monthData.processingStatus === 'empty';

              return (
                <button
                  key={monthData.month}
                  onClick={() => isEmpty && setShowUpload(true)}
                  className={`
                    ceramic-tray p-4 transition-all duration-200 relative overflow-hidden
                    ${isCompleted
                      ? 'bg-gradient-to-br from-ceramic-success/10 to-transparent hover:scale-105'
                      : isProcessing
                      ? 'bg-gradient-to-br from-ceramic-info/10 to-transparent animate-pulse'
                      : isFailed
                      ? 'bg-gradient-to-br from-ceramic-error/10 to-transparent hover:scale-105'
                      : 'hover:scale-105 hover:bg-ceramic-highlight'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    {/* Month Icon/Status */}
                    {isCompleted && (
                      <div className="ceramic-concave w-12 h-12 flex items-center justify-center bg-ceramic-success/10 shadow-ceramic-elevated">
                        <CheckCircle2 className="w-6 h-6 text-ceramic-success" />
                      </div>
                    )}
                    {isProcessing && (
                      <div className="ceramic-concave w-12 h-12 flex items-center justify-center bg-ceramic-info/10 shadow-ceramic-elevated">
                        <Loader2 className="w-6 h-6 text-ceramic-info animate-spin" />
                      </div>
                    )}
                    {isFailed && (
                      <div className="ceramic-concave w-12 h-12 flex items-center justify-center bg-ceramic-error/10 shadow-ceramic-elevated">
                        <svg className="w-6 h-6 text-ceramic-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    {isEmpty && (
                      <div className="ceramic-inset w-12 h-12 flex items-center justify-center opacity-40">
                        <Upload className="w-5 h-5 text-ceramic-text-secondary" />
                      </div>
                    )}

                    {/* Month Name */}
                    <div className="text-center w-full">
                      <p className={`text-sm font-black mb-1 ${
                        isCompleted ? 'text-ceramic-success' :
                        isProcessing ? 'text-ceramic-info' :
                        isFailed ? 'text-ceramic-error' :
                        'text-ceramic-text-secondary'
                      }`}>
                        {monthData.monthName}
                      </p>

                      {/* Status Message */}
                      {isProcessing && (
                        <p className="text-[11px] font-bold text-ceramic-info mb-2">
                          Processando...
                        </p>
                      )}
                      {isFailed && (
                        <p className="text-[11px] font-bold text-ceramic-error mb-2">
                          Erro
                        </p>
                      )}
                      {isEmpty && (
                        <p className="text-[11px] text-ceramic-text-secondary opacity-60">
                          Sem dados
                        </p>
                      )}

                      {/* Transaction Count - Highlighted */}
                      {isCompleted && (
                        <div className="ceramic-card px-2 py-1 mb-2 bg-ceramic-base/80">
                          <p className="text-[11px] font-black text-ceramic-success">
                            {monthData.transactionCount} {monthData.transactionCount === 1 ? 'transação' : 'transações'}
                          </p>
                        </div>
                      )}

                      {/* Balances - Highlighted */}
                      {isCompleted && (
                        <div className="space-y-1 mt-2">
                          <div className="ceramic-inset px-2 py-1 rounded">
                            <p className="text-[9px] text-ceramic-text-secondary uppercase tracking-wide">Inicial</p>
                            <p className="text-[11px] font-black text-ceramic-text-primary">
                              {formatCurrency(monthData.openingBalance)}
                            </p>
                          </div>
                          <div className="ceramic-concave px-2 py-1 rounded bg-ceramic-success/10">
                            <p className="text-[9px] text-ceramic-success uppercase tracking-wide">Final</p>
                            <p className="text-[11px] font-black text-ceramic-success">
                              {formatCurrency(monthData.closingBalance)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ceramic-text-secondary">
                  Progresso anual
                </p>
                {monthlyData.filter(m => m.processingStatus === 'processing').length > 0 && (
                  <p className="text-[10px] font-bold text-ceramic-info flex items-center gap-1 mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {monthlyData.filter(m => m.processingStatus === 'processing').length} {monthlyData.filter(m => m.processingStatus === 'processing').length === 1 ? 'mês processando' : 'meses processando'}
                  </p>
                )}
              </div>
              <p className="text-xs font-bold text-ceramic-text-primary">
                {Math.round((monthlyData.filter(m => m.processingStatus === 'completed').length / 12) * 100)}%
              </p>
            </div>
            <div className="ceramic-trough p-1 rounded-full">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-ceramic-success to-ceramic-success/80 transition-all duration-500"
                style={{ width: `${(monthlyData.filter(m => m.processingStatus === 'completed').length / 12) * 100}%` }}
              />
            </div>
          </div>

          {/* Call to Action for Empty Months */}
          {monthlyData.some(m => !m.hasData) && (
            <div className="ceramic-tray p-4 text-center">
              <p className="text-xs text-ceramic-text-secondary mb-3">
                Complete sua visão financeira fazendo upload dos extratos faltantes
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="ceramic-card px-6 py-2.5 hover:scale-105 transition-transform"
              >
                <span className="text-sm font-bold text-ceramic-accent">Enviar Extratos</span>
              </button>
            </div>
          )}
        </div>

        {/* Processing Statements (if any) */}
        {statements.some(s => s.processing_status === 'processing') && (
          <div className="ceramic-card p-6 space-y-4">
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
          <div className="ceramic-card p-6 space-y-4">
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
                    {statements.length} {statements.length === 1 ? 'extrato' : 'extratos'} • Clique para expandir
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

                {/* Statements List */}
                <div className="space-y-3">
                  {statements.map((statement) => {
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

                            {/* Metrics Row */}
                            <div className="flex items-center gap-4 flex-wrap">
                              {/* Transaction Count */}
                              <div className="ceramic-inset px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-ceramic-accent" />
                                <span className="text-xs font-bold text-ceramic-text-primary">
                                  {statement.transaction_count || 0}
                                </span>
                                <span className="text-[10px] text-ceramic-text-secondary">
                                  {statement.transaction_count === 1 ? 'transação' : 'transações'}
                                </span>
                              </div>

                              {/* Opening Balance */}
                              <div className="ceramic-inset px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
                                <span className="text-[10px] text-ceramic-text-secondary">
                                  Inicial:
                                </span>
                                <span className="text-xs font-bold text-ceramic-text-primary">
                                  {formatCurrency(statement.opening_balance || 0)}
                                </span>
                              </div>

                              {/* Closing Balance */}
                              <div className="ceramic-inset px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
                                <span className="text-[10px] text-ceramic-text-secondary">
                                  Final:
                                </span>
                                <span className="text-xs font-bold text-ceramic-success">
                                  {formatCurrency(statement.closing_balance || 0)}
                                </span>
                              </div>

                              {/* File Name (truncated) */}
                              {statement.file_name && (
                                <div className="flex items-center gap-1.5">
                                  <ChevronRight className="w-3 h-3 text-ceramic-text-secondary opacity-50" />
                                  <span className="text-[10px] text-ceramic-text-secondary truncate max-w-[200px]">
                                    {statement.file_name}
                                  </span>
                                </div>
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
          <div className="ceramic-card p-6">
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
              hasDocuments={hasIndexedStatements}
            />
          </div>
        )}

        {/* AI Agent CTA */}
        <button
          onClick={onNavigateToAgent}
          className="w-full ceramic-card p-6 flex items-center gap-4 hover:scale-[1.01] transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-ceramic-accent/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-ceramic-accent" />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-lg font-semibold text-ceramic-text-primary">
              Assistente Financeiro
            </h3>
            <p className="text-sm text-ceramic-text-secondary">
              Converse com a IA sobre suas financas
            </p>
          </div>
          <ArrowLeft className="w-5 h-5 text-ceramic-text-secondary rotate-180" />
        </button>
      </main>
    </div>
  );
};

export default FinanceDashboard;
