import React, { useEffect, useState } from 'react';
import { ArrowLeft, DollarSign, RefreshCw } from 'lucide-react';
import { MonthlyCostCard } from './MonthlyCostCard';
import { BudgetAlertBanner } from './BudgetAlertBanner';
import { BudgetMonitor } from './BudgetMonitor';
import { CostTrendChart } from './CostTrendChart';
import { OperationBreakdownChart } from './OperationBreakdownChart';
import { ModelBreakdownChart } from './ModelBreakdownChart';
import { TopExpensiveOperationsTable } from './TopExpensiveOperationsTable';
import { BudgetSettingsModal } from './BudgetSettingsModal';
import {
  getDailyAICosts,
  getOperationCostBreakdown,
  getModelCostBreakdown,
  getTopExpensiveOperations,
  getMonthlyCostSummary
} from '../../services/aiCostAnalyticsService';
import { getUserAIBudget } from '../../services/userSettingsService';
import type {
  DailyCostSummary,
  OperationCostBreakdown,
  ModelCostBreakdown,
  TopExpensiveOperation,
  MonthlyCostSummary
} from '../../types/aiCost';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('AICostDashboard');

interface AICostDashboardProps {
  userId: string;
  onBack?: () => void;
}

export const AICostDashboard: React.FC<AICostDashboardProps> = ({ userId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budget, setBudget] = useState(0);
  const [summary, setSummary] = useState<MonthlyCostSummary | null>(null);
  const [dailyCosts, setDailyCosts] = useState<DailyCostSummary[]>([]);
  const [operationBreakdown, setOperationBreakdown] = useState<OperationCostBreakdown[]>([]);
  const [modelBreakdown, setModelBreakdown] = useState<ModelCostBreakdown[]>([]);
  const [topOperations, setTopOperations] = useState<TopExpensiveOperation[]>([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load budget
      const userBudget = await getUserAIBudget();
      setBudget(userBudget);

      // Load all data in parallel
      const [monthlySummary, daily, operations, models, top] = await Promise.all([
        getMonthlyCostSummary(userId, userBudget),
        getDailyAICosts(userId, 30),
        getOperationCostBreakdown(userId, 30),
        getModelCostBreakdown(userId, 30),
        getTopExpensiveOperations(userId, 5)
      ]);

      setSummary(monthlySummary);
      setDailyCosts(daily);
      setOperationBreakdown(operations);
      setModelBreakdown(models);
      setTopOperations(top);
    } catch (error) {
      log.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleBudgetUpdate = async (newBudget: number) => {
    setBudget(newBudget);
    setShowBudgetModal(false);
    await loadData(true);
  };

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return (
      <div className="h-screen bg-ceramic-base flex items-center justify-center">
        <div className="animate-pulse space-y-4 p-8">
          <div className="h-8 bg-ceramic-cool rounded w-48 mb-6" />
          <div className="h-32 bg-ceramic-cool rounded-2xl mb-4" />
          <div className="h-64 bg-ceramic-cool rounded-2xl" />
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
              Dashboard
            </p>
            <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">
              Custos de IA
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ceramic-card px-4 py-2 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 text-ceramic-accent ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-bold text-ceramic-text-primary hidden md:inline">
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </span>
            </button>
            <button
              onClick={() => setShowBudgetModal(true)}
              className="ceramic-card px-4 py-2 hover:scale-105 transition-transform flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4 text-ceramic-accent" />
              <span className="text-sm font-bold text-ceramic-text-primary hidden md:inline">
                Orçamento
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
        {/* Budget Monitor - Real-time budget tracking with alerts */}
        <BudgetMonitor
          userId={userId}
          onConfigureBudget={() => setShowBudgetModal(true)}
        />

        {/* Budget Alert */}
        {summary && budget > 0 && summary.percentage_used >= 80 && (
          <BudgetAlertBanner summary={summary} />
        )}

        {/* Monthly Summary */}
        {summary && (
          <MonthlyCostCard summary={summary} onEditBudget={() => setShowBudgetModal(true)} />
        )}

        {/* Daily Trend Chart */}
        <CostTrendChart data={dailyCosts} />

        {/* Breakdowns - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OperationBreakdownChart data={operationBreakdown} />
          <ModelBreakdownChart data={modelBreakdown} />
        </div>

        {/* Top Expensive Operations */}
        <TopExpensiveOperationsTable operations={topOperations} />
      </main>

      {/* Budget Settings Modal */}
      {showBudgetModal && (
        <BudgetSettingsModal
          currentBudget={budget}
          onSave={handleBudgetUpdate}
          onClose={() => setShowBudgetModal(false)}
        />
      )}
    </div>
  );
};
