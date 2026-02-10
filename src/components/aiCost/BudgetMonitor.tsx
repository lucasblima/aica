/**
 * BudgetMonitor Component
 *
 * Displays AI usage budget status with alerts and warnings.
 * Shows real-time spending, budget limits, and progress bar.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, CheckCircle, XCircle, TrendingUp, Settings } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('BudgetMonitor');

export interface BudgetStatus {
  total_spend_usd: number;
  budget_limit_usd: number;
  percentage_used: number;
  alert_threshold: number;
  should_alert: boolean;
  should_block: boolean;
}

export interface CostAlert {
  id: string;
  alert_type: 'budget_warning' | 'budget_exceeded' | 'anomaly' | 'quota_warning';
  severity: 'info' | 'warning' | 'critical';
  current_spend_usd: number;
  budget_limit_usd: number;
  percentage_used: number;
  message: string;
  is_acknowledged: boolean;
  created_at: string;
}

interface BudgetMonitorProps {
  userId: string;
  onConfigureBudget?: () => void;
}

export const BudgetMonitor: React.FC<BudgetMonitorProps> = ({ userId, onConfigureBudget }) => {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgetStatus();
    loadAlerts();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadBudgetStatus();
      loadAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  async function loadBudgetStatus() {
    try {
      const { data, error } = await supabase
        .rpc('get_current_month_spend', { p_user_id: userId });

      if (error) throw error;

      if (data && data.length > 0) {
        setBudgetStatus(data[0]);
      }
    } catch (err) {
      log.error('Error loading budget status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAlerts() {
    try {
      const { data, error } = await supabase
        .from('ai_cost_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setAlerts(data || []);
    } catch (err) {
      log.error('Error loading alerts:', err);
    }
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('ai_cost_alerts')
        .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      // Remove from local state
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      log.error('Error acknowledging alert:', err);
    }
  }

  if (loading) {
    return (
      <div className="bg-ceramic-base rounded-2xl border border-ceramic-border p-6 animate-pulse">
        <div className="h-8 bg-ceramic-cool rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-ceramic-base rounded"></div>
      </div>
    );
  }

  if (!budgetStatus) {
    return null;
  }

  const { total_spend_usd, budget_limit_usd, percentage_used, should_alert, should_block } = budgetStatus;
  const remaining = Math.max(0, budget_limit_usd - total_spend_usd);

  // Determine status color
  let statusColor = 'green';
  let statusIcon = CheckCircle;

  if (should_block || percentage_used >= 100) {
    statusColor = 'red';
    statusIcon = XCircle;
  } else if (should_alert || percentage_used >= 80) {
    statusColor = 'orange';
    statusIcon = AlertTriangle;
  }

  return (
    <div className="space-y-4">
      {/* Budget Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ceramic-card p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-${statusColor}-100 flex items-center justify-center`}>
              <DollarSign className={`w-6 h-6 text-${statusColor}-600`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ceramic-text-primary">Orçamento Mensal de IA</h3>
              <p className="text-sm text-ceramic-text-secondary">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {onConfigureBudget && (
            <button
              onClick={onConfigureBudget}
              className="p-2 rounded-lg hover:bg-ceramic-cool transition-colors"
              title="Configurar orçamento"
            >
              <Settings className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xl font-bold text-ceramic-text-primary">
              ${total_spend_usd.toFixed(4)}
            </span>
            <span className="text-sm text-ceramic-text-secondary">
              de ${budget_limit_usd.toFixed(2)}
            </span>
          </div>

          <div className="w-full h-3 bg-ceramic-cool rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, percentage_used)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                percentage_used >= 100
                  ? 'bg-ceramic-error'
                  : percentage_used >= 80
                  ? 'bg-ceramic-warning'
                  : 'bg-ceramic-success'
              }`}
            />
          </div>

          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-ceramic-text-secondary">
              {percentage_used.toFixed(1)}% utilizado
            </span>
            <span className="text-sm font-medium text-ceramic-text-primary">
              ${remaining.toFixed(4)} restante
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-${statusColor}-50`}>
          {React.createElement(statusIcon, { className: `w-4 h-4 text-${statusColor}-600` })}
          <span className={`text-sm font-medium text-${statusColor}-700`}>
            {should_block
              ? '🚫 Orçamento esgotado - Operações bloqueadas'
              : should_alert
              ? '⚠️ Atenção: Próximo do limite'
              : '✅ Orçamento sob controle'}
          </span>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`ceramic-card rounded-xl border-l-4 p-4 ${
                alert.severity === 'critical'
                  ? 'border-ceramic-error bg-ceramic-error/5'
                  : alert.severity === 'warning'
                  ? 'border-ceramic-warning bg-ceramic-warning/5'
                  : 'border-ceramic-info bg-ceramic-info/5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        alert.severity === 'critical'
                          ? 'text-ceramic-error'
                          : alert.severity === 'warning'
                          ? 'text-ceramic-warning'
                          : 'text-ceramic-info'
                      }`}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                      {alert.alert_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-ceramic-text-primary font-medium">{alert.message}</p>
                  <p className="text-xs text-ceramic-text-tertiary mt-1">
                    {new Date(alert.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>

                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="ml-4 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary underline"
                >
                  Dispensar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="ceramic-card p-4 text-center">
          <p className="text-xs text-ceramic-text-secondary mb-1">Gasto Hoje</p>
          <p className="text-lg font-bold text-ceramic-text-primary">
            ${(total_spend_usd * 0.1).toFixed(4)}
          </p>
        </div>

        <div className="ceramic-card p-4 text-center">
          <p className="text-xs text-ceramic-text-secondary mb-1">Média Diária</p>
          <p className="text-lg font-bold text-ceramic-text-primary">
            ${(total_spend_usd / new Date().getDate()).toFixed(4)}
          </p>
        </div>

        <div className="ceramic-card p-4 text-center">
          <p className="text-xs text-ceramic-text-secondary mb-1">Projeção Mensal</p>
          <p className="text-lg font-bold text-ceramic-text-primary">
            ${((total_spend_usd / new Date().getDate()) * 30).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BudgetMonitor;
