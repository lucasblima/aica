import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Coins,
  CreditCard,
  DollarSign,
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
  cost_brl: number;
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
  total_cost_30d: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(4).replace('.', ',')}`;
}

function formatCurrencyShort(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

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
    total_cost_30d: 0,
  });
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);

  // -------------------------------------------------------------------------
  // Data Loading
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

        // Fetch usage logs (last 20)
        const { data: logs } = await supabase
          .from('ai_usage_logs')
          .select('id, action, module, model_used, tokens_input, tokens_output, cost_brl, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (logs) {
          setUsageLogs(logs as UsageLog[]);
        }

        // Fetch credit transactions (last 10)
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('id, transaction_type, amount, balance_after, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (transactions) {
          setCreditTransactions(transactions as CreditTransaction[]);
        }

        // Calculate today's interactions
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: todayCount } = await supabase
          .from('ai_usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', todayStart.toISOString());

        // Calculate 30-day cost
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: costData } = await supabase
          .from('ai_usage_logs')
          .select('cost_brl')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const totalCost30d = costData?.reduce((sum, row) => sum + (row.cost_brl || 0), 0) ?? 0;

        // Fetch plan info
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('plan_id, daily_interaction_limit')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        const planNames: Record<string, string> = {
          free: 'Free',
          pro: 'Pro',
          teams: 'Teams',
        };

        setSummary({
          interactions_today: todayCount ?? 0,
          daily_limit: subscription?.daily_interaction_limit ?? 50,
          plan_name: planNames[subscription?.plan_id ?? 'free'] ?? 'Free',
          total_cost_30d: totalCost30d,
        });
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
  // Handlers
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
  // Render
  // -------------------------------------------------------------------------

  const usagePercent =
    summary.daily_limit > 0
      ? Math.min((summary.interactions_today / summary.daily_limit) * 100, 100)
      : 0;

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

      {/* Stats Cards */}
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
          title="Custo (30d)"
          value={formatCurrencyShort(summary.total_cost_30d)}
          subtitle="Ultimos 30 dias"
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
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

      {/* Usage Chart Placeholder */}
      <div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary mb-4">
          Grafico de Uso
        </h3>
        <div className="h-48 flex items-center justify-center border-2 border-dashed border-ceramic-text-secondary/20 rounded-lg">
          <p className="text-sm text-ceramic-text-secondary">
            Grafico de uso semanal (implementacao futura)
          </p>
        </div>
      </div>

      {/* Recent Interactions Table */}
      <div className="bg-ceramic-50 rounded-xl shadow-ceramic-emboss overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">
            Interacoes Recentes
          </h3>
        </div>

        {usageLogs.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-ceramic-text-secondary italic">
              Nenhuma interacao registrada ainda.
            </p>
          </div>
        ) : (
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
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary hidden md:table-cell">
                    Modelo
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary hidden md:table-cell">
                    Tokens
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                    Custo
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
                    <td className="px-3 py-3 text-ceramic-text-secondary hidden md:table-cell">
                      {log.model_used ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-ceramic-text-secondary text-right hidden md:table-cell">
                      {(log.tokens_input + log.tokens_output).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-3 text-ceramic-text-primary text-right font-medium">
                      {formatCurrency(log.cost_brl)}
                    </td>
                    <td className="px-5 py-3 text-ceramic-text-secondary text-right text-xs">
                      {formatTimestamp(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit Transactions Table */}
      <div className="bg-ceramic-50 rounded-xl shadow-ceramic-emboss overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">
            Transacoes de Creditos
          </h3>
        </div>

        {creditTransactions.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-ceramic-text-secondary italic">
              Nenhuma transacao registrada ainda.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </PageShell>
  );
}

export default UsageDashboardPage;
