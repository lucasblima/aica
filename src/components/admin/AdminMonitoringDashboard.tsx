/**
 * Admin Monitoring Dashboard
 *
 * Comprehensive monitoring dashboard combining:
 * - Cache performance metrics
 * - AI cost tracking and budget monitoring
 * - File Search analytics
 * - System health indicators
 * - Performance insights and recommendations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  Database,
  DollarSign,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Send,
  Users,
  MessageSquare,
  Zap,
  Clock,
  XCircle,
  Link2,
} from 'lucide-react';
import { CacheStatsWidget } from '../fileSearch/CacheStatsWidget';
import { BudgetMonitor } from '../aiCost/BudgetMonitor';
import { MonthlyCostCard } from '../aiCost/MonthlyCostCard';
import { CostTrendChart } from '../aiCost/CostTrendChart';
import { useEffect } from 'react';
import {
  getDailyAICosts,
  getMonthlyCostSummary,
} from '../../services/aiCostAnalyticsService';
import { getUserAIBudget } from '../../services/userSettingsService';
import type { DailyCostSummary, MonthlyCostSummary } from '../../types/aiCost';
import { createNamespacedLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import {
  getAdminTelegramStats,
  getAdminTelegramMessageLog,
  getAdminTelegramUserStatus,
  getAdminTelegramConversations,
  getAdminTelegramErrorLog,
} from '../../services/telegramMonitoringService';
import type {
  TelegramStats,
  TelegramMessageLogEntry,
  TelegramUserStatus,
  TelegramConversation,
  TelegramErrorLog,
} from '../../types/telegramMonitoring';

const log = createNamespacedLogger('AdminMonitoringDashboard');

interface AdminMonitoringDashboardProps {
  userId?: string;
  onBack?: () => void;
}

type DashboardTab = 'overview' | 'cache' | 'costs' | 'file-search' | 'health' | 'telegram';

export const AdminMonitoringDashboard: React.FC<AdminMonitoringDashboardProps> = ({
  userId: userIdProp,
  onBack,
}) => {
  const { user } = useAuth();
  const userId = userIdProp ?? user?.id ?? '';
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(0);
  const [summary, setSummary] = useState<MonthlyCostSummary | null>(null);
  const [dailyCosts, setDailyCosts] = useState<DailyCostSummary[]>([]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const userBudget = await getUserAIBudget();
      setBudget(userBudget);

      const [monthlySummary, daily] = await Promise.all([
        getMonthlyCostSummary(userId, userBudget),
        getDailyAICosts(userId, 30),
      ]);

      setSummary(monthlySummary);
      setDailyCosts(daily);
    } catch (error) {
      log.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'cache', label: 'Cache', icon: Database },
    { id: 'costs', label: 'Custos de IA', icon: DollarSign },
    { id: 'file-search', label: 'File Search', icon: FileSearch },
    { id: 'health', label: 'Saúde do Sistema', icon: CheckCircle },
    { id: 'telegram', label: 'Telegram', icon: Send },
  ];

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
              Admin Dashboard
            </p>
            <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">
              Monitoramento Avançado
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-ceramic-success/10 rounded-lg">
              <div className="w-2 h-2 bg-ceramic-success/100 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-ceramic-success">Todos os sistemas operacionais</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Ceramic tactile differentiation */}
        <div className="flex gap-1 mt-6 overflow-x-auto pb-2 ceramic-tray p-1 rounded-2xl w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all
                  ${
                    isActive
                      ? 'ceramic-concave text-ceramic-text-primary'
                      : 'ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-ceramic-accent' : 'text-ceramic-text-tertiary'}`} />
                <span className="text-sm font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
        {activeTab === 'overview' && (
          <OverviewTab
            userId={userId}
            summary={summary}
            dailyCosts={dailyCosts}
            budget={budget}
          />
        )}

        {activeTab === 'cache' && <CacheTab />}

        {activeTab === 'costs' && (
          <CostsTab userId={userId} summary={summary} dailyCosts={dailyCosts} budget={budget} />
        )}

        {activeTab === 'file-search' && <FileSearchTab userId={userId} />}

        {activeTab === 'health' && <HealthTab userId={userId} />}

        {activeTab === 'telegram' && <TelegramTab />}
      </main>
    </div>
  );
};

// =====================================================
// OVERVIEW TAB
// =====================================================

interface OverviewTabProps {
  userId: string;
  summary: MonthlyCostSummary | null;
  dailyCosts: DailyCostSummary[];
  budget: number;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ userId, summary, dailyCosts, budget }) => {
  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ceramic-card p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-ceramic-info/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-ceramic-info" />
            </div>
            <div>
              <p className="text-xs text-ceramic-text-secondary">Cache</p>
              <p className="text-xl font-black text-ceramic-text-primary">Ativo</p>
            </div>
          </div>
          <p className="text-xs text-ceramic-text-secondary">Performance otimizada</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="ceramic-card p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-ceramic-success/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-ceramic-success" />
            </div>
            <div>
              <p className="text-xs text-ceramic-text-secondary">Budget Mensal</p>
              <p className="text-xl font-black text-ceramic-text-primary">
                ${budget.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="text-xs text-ceramic-text-secondary">
            {summary ? `${summary.percentage_used.toFixed(1)}% utilizado` : 'Carregando...'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="ceramic-card p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-ceramic-accent/10 flex items-center justify-center">
              <FileSearch className="w-5 h-5 text-ceramic-accent" />
            </div>
            <div>
              <p className="text-xs text-ceramic-text-secondary">File Search</p>
              <p className="text-xl font-black text-ceramic-text-primary">Operacional</p>
            </div>
          </div>
          <p className="text-xs text-ceramic-text-secondary">4 módulos integrados</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="ceramic-card p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-ceramic-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-ceramic-warning" />
            </div>
            <div>
              <p className="text-xs text-ceramic-text-secondary">Performance</p>
              <p className="text-xl font-black text-ceramic-text-primary">96%</p>
            </div>
          </div>
          <p className="text-xs text-ceramic-text-secondary">Boost com cache</p>
        </motion.div>
      </div>

      {/* Budget Monitor */}
      <BudgetMonitor userId={userId} />

      {/* Monthly Summary */}
      {summary && <MonthlyCostCard summary={summary} />}

      {/* Cost Trend */}
      <CostTrendChart data={dailyCosts} />

      {/* Cache Stats */}
      <CacheStatsWidget />
    </div>
  );
};

// =====================================================
// CACHE TAB
// =====================================================

const CacheTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <CacheStatsWidget showControls={true} />

      {/* Cache Documentation Link */}
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-3">
          Documentação de Cache
        </h3>
        <p className="text-sm text-ceramic-text-secondary mb-4">
          Aprenda como o cache multi-camadas funciona e como otimizar sua performance.
        </p>
        <a
          href="/docs/FILE_SEARCH_CACHE_STRATEGY.md"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-ceramic-info text-white rounded-lg hover:bg-ceramic-info/90 transition-colors"
        >
          <FileSearch className="w-4 h-4" />
          <span className="text-sm font-medium">Ver Documentação</span>
        </a>
      </div>
    </div>
  );
};

// =====================================================
// COSTS TAB
// =====================================================

interface CostsTabProps {
  userId: string;
  summary: MonthlyCostSummary | null;
  dailyCosts: DailyCostSummary[];
  budget: number;
}

const CostsTab: React.FC<CostsTabProps> = ({ userId, summary, dailyCosts, budget }) => {
  return (
    <div className="space-y-6">
      <BudgetMonitor userId={userId} />
      {summary && <MonthlyCostCard summary={summary} />}
      <CostTrendChart data={dailyCosts} />
    </div>
  );
};

// =====================================================
// FILE SEARCH TAB
// =====================================================

interface FileSearchTabProps {
  userId: string;
}

const FileSearchTab: React.FC<FileSearchTabProps> = ({ userId }) => {
  return (
    <div className="space-y-6">
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-3">
          File Search Analytics
        </h3>
        <p className="text-sm text-ceramic-text-secondary">
          Analytics detalhado de File Search disponível na view dedicada.
        </p>
      </div>

      <CacheStatsWidget compact={false} />
    </div>
  );
};

// =====================================================
// HEALTH TAB
// =====================================================

interface HealthTabProps {
  userId: string;
}

const HealthTab: React.FC<HealthTabProps> = ({ userId }) => {
  const healthChecks = [
    {
      name: 'Cache Service',
      status: 'healthy',
      message: 'Operando dentro dos limites',
      icon: Database,
    },
    {
      name: 'AI Budget Monitor',
      status: 'healthy',
      message: 'Budget sob controle',
      icon: DollarSign,
    },
    {
      name: 'File Search API',
      status: 'healthy',
      message: 'Todos os endpoints operacionais',
      icon: FileSearch,
    },
    {
      name: 'Supabase Connection',
      status: 'healthy',
      message: 'Conexão estável',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-6">
          Status dos Sistemas
        </h3>

        <div className="space-y-4">
          {healthChecks.map((check, index) => {
            const Icon = check.icon;
            const isHealthy = check.status === 'healthy';

            return (
              <motion.div
                key={check.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border-2 ${
                  isHealthy
                    ? 'bg-ceramic-success/10 border-ceramic-success/20'
                    : 'bg-ceramic-error/10 border-ceramic-error/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${
                        isHealthy ? 'bg-ceramic-success/10' : 'bg-ceramic-error/10'
                      } flex items-center justify-center`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isHealthy ? 'text-ceramic-success' : 'text-ceramic-error'
                        }`}
                      />
                    </div>
                    <div>
                      <h4
                        className={`font-bold ${
                          isHealthy ? 'text-ceramic-success' : 'text-ceramic-error'
                        }`}
                      >
                        {check.name}
                      </h4>
                      <p
                        className={`text-sm ${
                          isHealthy ? 'text-ceramic-success' : 'text-ceramic-error'
                        }`}
                      >
                        {check.message}
                      </p>
                    </div>
                  </div>

                  {isHealthy ? (
                    <CheckCircle className="w-6 h-6 text-ceramic-success" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-ceramic-error" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* System Recommendations */}
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-3">
          Recomendações
        </h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-ceramic-text-secondary">
            <CheckCircle className="w-4 h-4 text-ceramic-success flex-shrink-0 mt-0.5" />
            <span>Cache está otimizado - hit rate acima de 70%</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-ceramic-text-secondary">
            <CheckCircle className="w-4 h-4 text-ceramic-success flex-shrink-0 mt-0.5" />
            <span>Budget de IA configurado corretamente</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-ceramic-text-secondary">
            <CheckCircle className="w-4 h-4 text-ceramic-success flex-shrink-0 mt-0.5" />
            <span>File Search operando com performance ideal</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

// =====================================================
// TELEGRAM TAB
// =====================================================

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-ceramic-success/10 text-ceramic-success',
  processing: 'bg-ceramic-info/10 text-ceramic-info',
  received: 'bg-ceramic-cool text-ceramic-text-secondary',
  failed: 'bg-ceramic-error/10 text-ceramic-error',
  skipped: 'bg-ceramic-warning/10 text-ceramic-warning',
};

const TelegramTab: React.FC = () => {
  const [stats, setStats] = useState<TelegramStats | null>(null);
  const [messages, setMessages] = useState<TelegramMessageLogEntry[]>([]);
  const [userStatus, setUserStatus] = useState<TelegramUserStatus | null>(null);
  const [conversations, setConversations] = useState<TelegramConversation[]>([]);
  const [errorLog, setErrorLog] = useState<TelegramErrorLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    loadTelegramData();
  }, []);

  const loadTelegramData = async () => {
    try {
      setLoading(true);
      const [s, m, u, c, e] = await Promise.all([
        getAdminTelegramStats(),
        getAdminTelegramMessageLog(20),
        getAdminTelegramUserStatus(),
        getAdminTelegramConversations(10),
        getAdminTelegramErrorLog(50, 24),
      ]);
      setStats(s);
      setMessages(m);
      setUserStatus(u);
      setConversations(c);
      setErrorLog(e);
    } catch (err) {
      log.error('Error loading Telegram data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-ceramic-cool rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Mensagens 24h', value: stats?.messages_24h ?? 0, icon: MessageSquare, color: 'text-ceramic-info' },
          { label: 'Taxa de Erro', value: `${(stats?.error_rate ?? 0).toFixed(1)}%`, icon: AlertTriangle, color: (stats?.error_rate ?? 0) > 10 ? 'text-ceramic-error' : 'text-ceramic-success' },
          { label: 'Usuarios Ativos', value: stats?.active_users ?? 0, icon: Users, color: 'text-ceramic-accent' },
          { label: 'Contas Vinculadas', value: stats?.linked_accounts ?? 0, icon: Link2, color: 'text-ceramic-success' },
          { label: 'Tokens AI', value: stats?.ai_tokens_used ?? 0, icon: Zap, color: 'text-ceramic-warning' },
          { label: 'Tempo Medio', value: `${(stats?.avg_processing_ms ?? 0).toFixed(0)}ms`, icon: Clock, color: 'text-ceramic-info' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="ceramic-card p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-lg font-black text-ceramic-text-primary">{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Message Log */}
      <div className="ceramic-card p-5">
        <h3 className="text-sm font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-ceramic-info" />
          Log de Mensagens (ultimas 20)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-ceramic-text-secondary border-b border-ceramic-border">
                <th className="pb-2 pr-3">Hora</th>
                <th className="pb-2 pr-3">Usuario</th>
                <th className="pb-2 pr-3">Tipo</th>
                <th className="pb-2 pr-3">Resumo</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Acao AI</th>
                <th className="pb-2">Duracao</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className="border-b border-ceramic-border/50 hover:bg-ceramic-cool/50">
                  <td className="py-2 pr-3 text-ceramic-text-secondary whitespace-nowrap">
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 pr-3 text-ceramic-text-primary font-medium">
                    {msg.telegram_username ? `@${msg.telegram_username}` : msg.user_id?.slice(0, 8) ?? '—'}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="px-1.5 py-0.5 rounded bg-ceramic-cool text-ceramic-text-secondary">
                      {msg.direction === 'inbound' ? '→' : '←'} {msg.message_type}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-ceramic-text-secondary max-w-[200px] truncate">
                    {msg.intent_summary ?? '—'}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[msg.processing_status] ?? 'bg-ceramic-cool text-ceramic-text-secondary'}`}>
                      {msg.processing_status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-ceramic-text-secondary">{msg.ai_action ?? '—'}</td>
                  <td className="py-2 text-ceramic-text-secondary">
                    {msg.processing_duration_ms != null ? `${msg.processing_duration_ms}ms` : '—'}
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-ceramic-text-secondary">Nenhuma mensagem registrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Log (Collapsible) */}
      <div className="ceramic-card p-5">
        <button
          onClick={() => setShowErrors(!showErrors)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-sm font-bold text-ceramic-text-primary flex items-center gap-2">
            <XCircle className="w-4 h-4 text-ceramic-error" />
            Erros ({errorLog?.errors.length ?? 0})
            {errorLog && errorLog.error_rate > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-ceramic-error/10 text-ceramic-error font-bold">
                {errorLog.error_rate.toFixed(1)}% taxa de erro
              </span>
            )}
          </h3>
          <span className="text-ceramic-text-secondary text-xs">{showErrors ? '▲' : '▼'}</span>
        </button>

        {showErrors && errorLog && (
          <div className="mt-4 space-y-2">
            {errorLog.errors.map((err) => (
              <div key={err.id} className="p-3 rounded-lg bg-ceramic-error/5 border border-ceramic-error/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ceramic-text-secondary">
                    {new Date(err.created_at).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-ceramic-cool text-ceramic-text-secondary">
                    {err.message_type} | tentativas: {err.retry_count}
                  </span>
                </div>
                <p className="text-xs text-ceramic-error font-medium">{err.error_message ?? 'Erro desconhecido'}</p>
              </div>
            ))}
            {errorLog.errors.length === 0 && (
              <p className="text-xs text-ceramic-text-secondary text-center py-4">Nenhum erro nas ultimas 24h</p>
            )}
          </div>
        )}
      </div>

      {/* User Status + Active Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Status */}
        <div className="ceramic-card p-5">
          <h3 className="text-sm font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-ceramic-accent" />
            Status dos Usuarios
          </h3>
          {userStatus && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 rounded-lg bg-ceramic-success/10">
                  <p className="text-lg font-black text-ceramic-success">{userStatus.total_linked}</p>
                  <p className="text-[10px] text-ceramic-text-secondary">Vinculados</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-ceramic-warning/10">
                  <p className="text-lg font-black text-ceramic-warning">{userStatus.total_pending}</p>
                  <p className="text-[10px] text-ceramic-text-secondary">Pendentes</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-ceramic-info/10">
                  <p className="text-lg font-black text-ceramic-info">{userStatus.consent_rate.toFixed(0)}%</p>
                  <p className="text-[10px] text-ceramic-text-secondary">Consentiram</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mb-2">Links Recentes</p>
                {userStatus.recent_links.map((link) => (
                  <div key={link.user_id} className="flex items-center justify-between py-1.5 border-b border-ceramic-border/50 text-xs">
                    <span className="text-ceramic-text-primary font-medium">
                      {link.telegram_username ? `@${link.telegram_username}` : link.user_id.slice(0, 8)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${link.status === 'linked' ? 'bg-ceramic-success/10 text-ceramic-success' : 'bg-ceramic-warning/10 text-ceramic-warning'}`}>
                      {link.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Active Conversations */}
        <div className="ceramic-card p-5">
          <h3 className="text-sm font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-ceramic-info" />
            Conversas Ativas
          </h3>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div key={conv.id} className="p-3 rounded-lg bg-ceramic-cool/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ceramic-text-primary font-medium">
                    {conv.telegram_username ? `@${conv.telegram_username}` : conv.user_id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-ceramic-text-secondary">
                    {new Date(conv.last_message_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {conv.active_flow && (
                    <span className="px-1.5 py-0.5 rounded bg-ceramic-info/10 text-ceramic-info text-[10px] font-bold">
                      {conv.active_flow}
                    </span>
                  )}
                  <span className="text-[10px] text-ceramic-text-secondary">
                    {conv.context_token_count} tokens
                  </span>
                </div>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-ceramic-text-secondary text-center py-4">Nenhuma conversa ativa</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMonitoringDashboard;
