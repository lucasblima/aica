import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  Coins,
  CreditCard,
  Gift,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { PageShell } from '@/components/ui';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useUserCredits } from '@/hooks/useUserCredits';
import { UsageStatsCard } from '../components/UsageStatsCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsageLog {
  id: string;
  action: string;
  module: string | null;
  model_used: string | null;
  tokens_input: number;
  tokens_output: number;
  credits_used: number;
  created_at: string;
}

interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface DailyUsageSummary {
  interactions_today: number;
  daily_limit: number;
  plan_name: string;
  total_credits_30d: number;
  total_interactions_30d: number;
}

interface DailyChartBar {
  date: string;       // "DD/MM"
  isoDate: string;    // "YYYY-MM-DD" — used as key
  count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTERACTIONS_PAGE_SIZE = 50;
const TRANSACTIONS_PAGE_SIZE = 30;
const CHART_DAYS = 14;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    daily_claim: 'Resgate Diario',
    earn: 'Ganho',
    spend: 'Gasto',
    bonus: 'Bonus',
    refund: 'Reembolso',
    purchase: 'Compra',
  };
  return map[type] || type;
}

function transactionTypeColor(type: string): string {
  if (type === 'spend') return 'text-ceramic-error';
  if (type === 'daily_claim' || type === 'earn' || type === 'bonus')
    return 'text-ceramic-success';
  return 'text-ceramic-text-primary';
}

/** Returns an array of the last N days (today last), each with isoDate + formatted label. */
function buildDateRange(days: number): { isoDate: string; label: string }[] {
  const result: { isoDate: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const isoDate = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    result.push({ isoDate, label });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsageDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, canClaimDaily, claimDaily } = useUserCredits();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const [summary, setSummary] = useState<DailyUsageSummary>({
    interactions_today: 0,
    daily_limit: 50,
    plan_name: 'Free',
    total_credits_30d: 0,
    total_interactions_30d: 0,
  });

  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [usageLogsOffset, setUsageLogsOffset] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [isLoadingMoreLogs, setIsLoadingMoreLogs] = useState(false);

  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [txOffset, setTxOffset] = useState(0);
  const [hasMoreTx, setHasMoreTx] = useState(false);
  const [isLoadingMoreTx, setIsLoadingMoreTx] = useState(false);

  const [dailyChart, setDailyChart] = useState<DailyChartBar[]>([]);

  // -------------------------------------------------------------------------
  // Data Loading — initial / refresh
  // -------------------------------------------------------------------------

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!user) return;

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        // Reset pagination on refresh
        setUsageLogsOffset(0);
        setTxOffset(0);

        // --- Usage logs (first page) ---
        const { data: logs } = await supabase
          .from('usage_logs')
          .select('id, action, module, model_used, tokens_input, tokens_output, credits_used, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(0, INTERACTIONS_PAGE_SIZE); // fetch one extra to detect hasMore

        if (logs) {
          setHasMoreLogs(logs.length > INTERACTIONS_PAGE_SIZE);
          setUsageLogs((logs as UsageLog[]).slice(0, INTERACTIONS_PAGE_SIZE));
          setUsageLogsOffset(INTERACTIONS_PAGE_SIZE);
        }

        // --- Credit transactions (first page) ---
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('id, transaction_type, amount, balance_after, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(0, TRANSACTIONS_PAGE_SIZE);

        if (transactions) {
          setHasMoreTx(transactions.length > TRANSACTIONS_PAGE_SIZE);
          setCreditTransactions((transactions as CreditTransaction[]).slice(0, TRANSACTIONS_PAGE_SIZE));
          setTxOffset(TRANSACTIONS_PAGE_SIZE);
        }

        // --- Today's interactions ---
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: todayCount } = await supabase
          .from('usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', todayStart.toISOString());

        // --- 30-day cost + count ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: costData } = await supabase
          .from('usage_logs')
          .select('credits_used')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const totalCredits30d = costData?.reduce((sum, row) => sum + (row.credits_used || 0), 0) ?? 0;
        const totalInteractions30d = costData?.length ?? 0;

        // --- Plan info ---
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('plan_id, daily_interaction_limit')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        const planNames: Record<string, string> = {
          free: 'Free',
          pro: 'Pro',
          max: 'Max',
        };

        setSummary({
          interactions_today: todayCount ?? 0,
          daily_limit: subscription?.daily_interaction_limit ?? 50,
          plan_name: planNames[subscription?.plan_id ?? 'free'] ?? 'Free',
          total_credits_30d: totalCredits30d,
          total_interactions_30d: totalInteractions30d,
        });

        // --- Daily chart (last 14 days) ---
        const chartFrom = new Date();
        chartFrom.setDate(chartFrom.getDate() - (CHART_DAYS - 1));
        chartFrom.setHours(0, 0, 0, 0);

        const { data: chartRaw } = await supabase
          .from('usage_logs')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', chartFrom.toISOString())
          .order('created_at', { ascending: true });

        // Build count-per-day map
        const countByDay: Record<string, number> = {};
        chartRaw?.forEach((row) => {
          const dayKey = new Date(row.created_at).toISOString().slice(0, 10);
          countByDay[dayKey] = (countByDay[dayKey] ?? 0) + 1;
        });

        const dateRange = buildDateRange(CHART_DAYS);
        setDailyChart(
          dateRange.map(({ isoDate, label }) => ({
            isoDate,
            date: label,
            count: countByDay[isoDate] ?? 0,
          }))
        );
      } catch {
        // Silently handle errors — data will show defaults
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------------------
  // Pagination — load more interactions
  // -------------------------------------------------------------------------

  const loadMoreLogs = async () => {
    if (!user || isLoadingMoreLogs) return;
    setIsLoadingMoreLogs(true);

    try {
      const { data: more } = await supabase
        .from('usage_logs')
        .select('id, action, module, model_used, tokens_input, tokens_output, credits_used, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(usageLogsOffset, usageLogsOffset + INTERACTIONS_PAGE_SIZE);

      if (more) {
        setHasMoreLogs(more.length > INTERACTIONS_PAGE_SIZE);
        setUsageLogs((prev) => [...prev, ...(more as UsageLog[]).slice(0, INTERACTIONS_PAGE_SIZE)]);
        setUsageLogsOffset((prev) => prev + INTERACTIONS_PAGE_SIZE);
      }
    } finally {
      setIsLoadingMoreLogs(false);
    }
  };

  // -------------------------------------------------------------------------
  // Pagination — load more transactions
  // -------------------------------------------------------------------------

  const loadMoreTx = async () => {
    if (!user || isLoadingMoreTx) return;
    setIsLoadingMoreTx(true);

    try {
      const { data: more } = await supabase
        .from('credit_transactions')
        .select('id, transaction_type, amount, balance_after, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(txOffset, txOffset + TRANSACTIONS_PAGE_SIZE);

      if (more) {
        setHasMoreTx(more.length > TRANSACTIONS_PAGE_SIZE);
        setCreditTransactions((prev) => [
          ...prev,
          ...(more as CreditTransaction[]).slice(0, TRANSACTIONS_PAGE_SIZE),
        ]);
        setTxOffset((prev) => prev + TRANSACTIONS_PAGE_SIZE);
      }
    } finally {
      setIsLoadingMoreTx(false);
    }
  };

  // -------------------------------------------------------------------------
  // Daily claim handler
  // -------------------------------------------------------------------------

  const handleClaimDaily = async () => {
    setIsClaiming(true);
    setClaimMessage(null);

    try {
      const result = await claimDaily();
      if (result.success) {
        setClaimMessage(`+${result.creditsEarned} creditos resgatados!`);
        await loadData(true);
      } else {
        setClaimMessage(result.message);
      }
      setTimeout(() => setClaimMessage(null), 4000);
    } finally {
      setIsClaiming(false);
    }
  };

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <PageShell title="Uso e Consumo" onBack={() => navigate(-1)}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </PageShell>
    );
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const usagePercent =
    summary.daily_limit > 0
      ? Math.min((summary.interactions_today / summary.daily_limit) * 100, 100)
      : 0;

  const chartMax = Math.max(...dailyChart.map((d) => d.count), 1);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <PageShell
      title="Uso e Consumo"
      onBack={() => navigate(-1)}
      rightAction={
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="p-2 rounded-full hover:bg-ceramic-text-secondary/10 transition-colors"
          aria-label="Atualizar dados"
        >
          <RefreshCw
            className={`w-5 h-5 text-ceramic-text-secondary ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
        </button>
      }
    >
      {/* Claim Message */}
      {claimMessage && (
        <div className="bg-ceramic-success/10 border border-ceramic-success/20 text-ceramic-success rounded-xl p-3 text-sm font-medium text-center">
          {claimMessage}
        </div>
      )}

      {/* Stats Cards — credits only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UsageStatsCard
          title="Interacoes Hoje"
          value={`${summary.interactions_today} / ${summary.daily_limit}`}
          subtitle={`${usagePercent.toFixed(0)}% utilizado`}
          icon={<Activity className="w-5 h-5 text-amber-600" />}
        />
        <UsageStatsCard
          title="Creditos"
          value={balance}
          subtitle={canClaimDaily ? 'Bonus disponivel!' : 'Resgatado hoje'}
          icon={<Coins className="w-5 h-5 text-amber-600" />}
        />
        <UsageStatsCard
          title="Plano"
          value={summary.plan_name}
          subtitle="Ativo"
          icon={<CreditCard className="w-5 h-5 text-amber-600" />}
        />
        <UsageStatsCard
          title="Creditos Usados (30d)"
          value={summary.total_credits_30d}
          subtitle={`${summary.total_interactions_30d} interacoes`}
          icon={<Coins className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Usage Progress Bar */}
      <div className="bg-ceramic-50 rounded-xl p-5 shadow-ceramic-emboss">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
            Uso Diario de Interacoes
          </span>
          <span className="text-xs font-bold text-ceramic-text-primary">
            {summary.interactions_today} de {summary.daily_limit}
          </span>
        </div>
        <div className="h-3 bg-ceramic-text-secondary/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usagePercent >= 90
                ? 'bg-ceramic-error'
                : usagePercent >= 70
                ? 'bg-ceramic-warning'
                : 'bg-amber-500'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Daily Claim Button */}
      {canClaimDaily && (
        <div className="flex justify-center">
          <button
            onClick={handleClaimDaily}
            disabled={isClaiming}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isClaiming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Gift className="w-5 h-5" />
            )}
            Resgatar Creditos Diarios
          </button>
        </div>
      )}

      {/* Daily Usage Bar Chart — last 14 days */}
      <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">
            Interacoes por Dia — Ultimos {CHART_DAYS} dias
          </h3>
        </div>

        {dailyChart.every((d) => d.count === 0) ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-ceramic-text-secondary italic">
              Nenhuma interacao nos ultimos {CHART_DAYS} dias.
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-1 h-40" aria-label="Grafico de interacoes diarias">
            {dailyChart.map((bar) => {
              const heightPct = chartMax > 0 ? (bar.count / chartMax) * 100 : 0;
              const isToday = bar.isoDate === new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={bar.isoDate}
                  className="flex flex-col items-center gap-1 flex-1 min-w-0 group"
                >
                  {/* Value label — shown on hover */}
                  <span
                    className={`text-[10px] font-bold text-amber-600 transition-opacity ${
                      bar.count > 0 ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
                    }`}
                    aria-hidden="true"
                  >
                    {bar.count}
                  </span>

                  {/* Bar */}
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isToday ? 'bg-amber-500' : 'bg-amber-300 group-hover:bg-amber-400'
                      } ${bar.count === 0 ? 'opacity-20' : ''}`}
                      style={{ height: bar.count === 0 ? '4px' : `${heightPct}%` }}
                      title={`${bar.date}: ${bar.count} interacoes`}
                    />
                  </div>

                  {/* Date label */}
                  <span
                    className={`text-[9px] leading-none truncate w-full text-center ${
                      isToday
                        ? 'text-amber-600 font-bold'
                        : 'text-ceramic-text-secondary'
                    }`}
                  >
                    {bar.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Chart legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ceramic-text-secondary/10">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-[10px] text-ceramic-text-secondary">Hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-300" />
            <span className="text-[10px] text-ceramic-text-secondary">Dias anteriores</span>
          </div>
          <span className="ml-auto text-[10px] text-ceramic-text-secondary">
            Pico: {chartMax} interacoes
          </span>
        </div>
      </div>

      {/* Recent Interactions Table */}
      <div className="bg-ceramic-50 rounded-xl shadow-ceramic-emboss overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">
            Log de Interacoes
          </h3>
          <span className="text-xs text-ceramic-text-secondary">
            {usageLogs.length} registros exibidos
          </span>
        </div>

        {usageLogs.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-ceramic-text-secondary italic">
              Nenhuma interacao registrada ainda.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ceramic-text-secondary/10">
                    <th className="text-left px-5 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Acao
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Modulo
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Creditos
                    </th>
                    <th className="text-right px-5 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usageLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-ceramic-text-secondary/5 hover:bg-ceramic-text-secondary/5 transition-colors"
                    >
                      <td className="px-5 py-3 text-ceramic-text-primary font-medium truncate max-w-[160px]">
                        {log.action}
                      </td>
                      <td className="px-3 py-3 text-ceramic-text-secondary">
                        {log.module ?? '-'}
                      </td>
                      <td className="px-3 py-3 text-amber-600 text-right font-bold">
                        {log.credits_used || 1}
                      </td>
                      <td className="px-5 py-3 text-ceramic-text-secondary text-right text-xs">
                        {formatTimestamp(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMoreLogs && (
              <div className="p-4 border-t border-ceramic-text-secondary/10 flex justify-center">
                <button
                  onClick={loadMoreLogs}
                  disabled={isLoadingMoreLogs}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoadingMoreLogs ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {isLoadingMoreLogs ? 'Carregando...' : `Ver mais ${INTERACTIONS_PAGE_SIZE} registros`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Credit Transactions Table */}
      <div className="bg-ceramic-50 rounded-xl shadow-ceramic-emboss overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">
            Transacoes de Creditos
          </h3>
          <span className="text-xs text-ceramic-text-secondary">
            {creditTransactions.length} registros exibidos
          </span>
        </div>

        {creditTransactions.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-ceramic-text-secondary italic">
              Nenhuma transacao registrada ainda.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ceramic-text-secondary/10">
                    <th className="text-left px-5 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Tipo
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Valor
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Saldo
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary hidden md:table-cell">
                      Descricao
                    </th>
                    <th className="text-right px-5 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {creditTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-ceramic-text-secondary/5 hover:bg-ceramic-text-secondary/5 transition-colors"
                    >
                      <td className="px-5 py-3 text-ceramic-text-primary font-medium">
                        {formatTransactionType(tx.transaction_type)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-bold ${transactionTypeColor(
                          tx.transaction_type
                        )}`}
                      >
                        {tx.amount > 0 ? '+' : ''}
                        {tx.amount}
                      </td>
                      <td className="px-3 py-3 text-ceramic-text-secondary text-right">
                        {tx.balance_after}
                      </td>
                      <td className="px-3 py-3 text-ceramic-text-secondary hidden md:table-cell truncate max-w-[200px]">
                        {tx.description ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-ceramic-text-secondary text-right text-xs">
                        {formatTimestamp(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMoreTx && (
              <div className="p-4 border-t border-ceramic-text-secondary/10 flex justify-center">
                <button
                  onClick={loadMoreTx}
                  disabled={isLoadingMoreTx}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoadingMoreTx ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {isLoadingMoreTx ? 'Carregando...' : `Ver mais ${TRANSACTIONS_PAGE_SIZE} registros`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

export default UsageDashboardPage;
