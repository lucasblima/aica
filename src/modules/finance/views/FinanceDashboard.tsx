/**
 * Finance Dashboard View
 *
 * Main view for the Finance module showing overview, upload, and agent access.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, MessageSquare, Upload, FileText, TrendingUp, Wallet, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { StatementUpload } from '../components/StatementUpload';
import { ExpenseChart } from '../components/Charts/ExpenseChart';
import { IncomeVsExpense } from '../components/Charts/IncomeVsExpense';
import { getAllTimeSummary, getBurnRate, getAllTimeCategoryBreakdown } from '../services/financeService';
import { statementService } from '../services/statementService';
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
}

// =====================================================
// Component
// =====================================================

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
  userId,
  onNavigateToAgent,
  onBack,
}) => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [statements, setStatements] = useState<FinanceStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

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
      console.error('Error loading finance data:', error);
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
      console.error('Error deleting statement:', error);
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
      console.error('Error deleting all statements:', error);
      alert('Erro ao deletar extratos. Alguns podem não ter sido deletados.');
    } finally {
      setDeletingAll(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Process statements into monthly data
  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Create map of month -> data
    const monthMap = new Map<string, { transactionCount: number; statementCount: number }>();

    console.log('[FinanceDashboard] Processing statements for monthly data:', statements?.length || 0);

    // Handle empty statements array
    if (!statements || statements.length === 0) {
      console.log('[FinanceDashboard] No statements, returning empty month data');
      const months: MonthData[] = [];
      for (let month = 1; month <= 12; month++) {
        months.push({
          month,
          monthName: monthNames[month - 1],
          year: currentYear,
          hasData: false,
          transactionCount: 0,
          statementCount: 0,
        });
      }
      return months;
    }

    statements.forEach((statement) => {
      console.log('[FinanceDashboard] Statement:', {
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

        console.log('[FinanceDashboard] Parsed date:', { dateStr, year, month, key });

        const existing = monthMap.get(key) || { transactionCount: 0, statementCount: 0 };
        monthMap.set(key, {
          transactionCount: existing.transactionCount + (statement.transaction_count || 0),
          statementCount: existing.statementCount + 1,
        });
      } else {
        console.warn('[FinanceDashboard] Statement missing period_start:', statement.id);
      }
    });

    console.log('[FinanceDashboard] Month map:', Array.from(monthMap.entries()));

    // Generate 12 months for current year
    const months: MonthData[] = [];
    for (let month = 1; month <= 12; month++) {
      const key = `${currentYear}-${month}`;
      const data = monthMap.get(key);

      months.push({
        month,
        monthName: monthNames[month - 1],
        year: currentYear,
        hasData: !!data,
        transactionCount: data?.transactionCount || 0,
        statementCount: data?.statementCount || 0,
      });
    }

    console.log('[FinanceDashboard] Monthly data generated:', months);

    return months;
  }, [statements]);

  if (loading) {
    return (
      <div className="h-screen bg-ceramic-base flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

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
              onClick={() => {
                console.log('=== DEBUG: All Statements ===');
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
              <span className="text-xs font-bold text-red-600">DEBUG</span>
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
              <MessageSquare className="w-5 h-5 text-purple-600" />
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
              onError={(error) => console.error(error)}
            />
          </div>
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
              <p className="text-xs text-ceramic-text-secondary mt-3">
                {summary.transactionCount} transações processadas
              </p>
            </div>

            {/* Income & Expenses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="ceramic-inset w-8 h-8 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-ceramic-text-secondary">
                    Receitas
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="ceramic-inset w-8 h-8 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                  </div>
                  <span className="text-xs font-medium text-ceramic-text-secondary">
                    Despesas
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Charts */}
        {summary && (
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
              {burnRate.trend !== 'stable' && (
                <div className="flex items-center gap-2">
                  <div
                    className={`ceramic-inset px-3 py-1.5 text-xs font-bold ${
                      burnRate.trend === 'decreasing'
                        ? 'text-green-700'
                        : 'text-red-700'
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
            <button
              onClick={() => setShowUpload(true)}
              className="ceramic-card px-4 py-2 hover:scale-105 transition-transform"
            >
              <span className="text-xs font-bold text-ceramic-accent">+ Upload</span>
            </button>
          </div>

          {/* Monthly Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {monthlyData.map((monthData) => (
              <button
                key={monthData.month}
                onClick={() => !monthData.hasData && setShowUpload(true)}
                className={`
                  ceramic-tray p-4 transition-all duration-200
                  ${monthData.hasData
                    ? 'bg-gradient-to-br from-green-50 to-transparent hover:scale-105'
                    : 'hover:scale-105 hover:bg-ceramic-highlight'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  {/* Month Icon/Status */}
                  {monthData.hasData ? (
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center bg-green-100">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="ceramic-inset w-10 h-10 flex items-center justify-center opacity-40">
                      <Upload className="w-5 h-5 text-ceramic-text-secondary" />
                    </div>
                  )}

                  {/* Month Name */}
                  <div className="text-center">
                    <p className={`text-xs font-bold ${monthData.hasData ? 'text-green-700' : 'text-ceramic-text-secondary'}`}>
                      {monthData.monthName}
                    </p>
                    {monthData.hasData && (
                      <p className="text-[10px] text-green-600 mt-0.5">
                        {monthData.transactionCount} {monthData.transactionCount === 1 ? 'transação' : 'transações'}
                      </p>
                    )}
                    {!monthData.hasData && (
                      <p className="text-[10px] text-ceramic-text-secondary opacity-60 mt-0.5">
                        Sem dados
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ceramic-text-secondary">
                Progresso anual
              </p>
              <p className="text-xs font-bold text-ceramic-text-primary">
                {Math.round((monthlyData.filter(m => m.hasData).length / 12) * 100)}%
              </p>
            </div>
            <div className="ceramic-trough p-1 rounded-full">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${(monthlyData.filter(m => m.hasData).length / 12) * 100}%` }}
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
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
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
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ceramic-text-primary truncate">
                        {statement.file_name || 'Processando...'}
                      </p>
                      <p className="text-xs text-blue-600">
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
                  className="w-full ceramic-tray p-3 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingAll ? (
                    <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm font-bold text-red-600">
                    {deletingAll ? 'Deletando...' : 'Deletar Todos os Extratos'}
                  </span>
                </button>

                {/* Statements List */}
                <div className="space-y-2">
                  {statements.map((statement) => (
                    <div
                      key={statement.id}
                      className="ceramic-tray p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="ceramic-concave w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-ceramic-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ceramic-text-primary truncate">
                            {statement.bank_name || 'Banco'}
                          </p>
                          <p className="text-xs text-ceramic-text-secondary">
                            {statement.statement_period_start && statement.statement_period_end
                              ? `${formatDate(statement.statement_period_start)} - ${formatDate(statement.statement_period_end)}`
                              : formatDate(statement.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-ceramic-text-primary">
                            {statement.transaction_count || 0}
                          </p>
                          <p className="text-xs text-ceramic-text-secondary">
                            {statement.processing_status === 'completed'
                              ? 'processado'
                              : statement.processing_status === 'failed'
                              ? 'falhou'
                              : 'processando'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(statement.id)}
                          disabled={deletingId === statement.id || deletingAll}
                          className="ceramic-inset w-8 h-8 flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                          title="Deletar extrato"
                        >
                          {deletingId === statement.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Agent CTA */}
        <button
          onClick={onNavigateToAgent}
          className="w-full ceramic-card p-6 flex items-center gap-4 hover:scale-[1.01] transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-purple-600" />
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
