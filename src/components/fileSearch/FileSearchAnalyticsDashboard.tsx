/**
 * File Search Analytics Dashboard
 *
 * Dashboard visual para exibir estatísticas e métricas de uso
 * do File Search em todos os módulos.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  useFileSearchAnalytics,
  type ModuleStats,
  type RecentDocument,
} from '../../hooks/useFileSearchAnalytics';

export interface FileSearchAnalyticsDashboardProps {
  userId?: string;
  className?: string;
}

// Mapeamento de módulos para ícones e cores
const MODULE_CONFIG: Record<
  string,
  {
    icon: string;
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  grants: {
    icon: '📝',
    label: 'Grants',
    color: 'text-ceramic-info',
    bgColor: 'bg-ceramic-info/10',
  },
  podcast: {
    icon: '🎙️',
    label: 'Podcast',
    color: 'text-ceramic-accent',
    bgColor: 'bg-ceramic-accent/10',
  },
  finance: {
    icon: '💰',
    label: 'Finance',
    color: 'text-ceramic-success',
    bgColor: 'bg-ceramic-success/10',
  },
  journey: {
    icon: '🧭',
    label: 'Journey',
    color: 'text-ceramic-warning',
    bgColor: 'bg-ceramic-warning/10',
  },
  atlas: {
    icon: '🗺️',
    label: 'Atlas',
    color: 'text-ceramic-error',
    bgColor: 'bg-ceramic-error/10',
  },
  chat: {
    icon: '💬',
    label: 'Chat',
    color: 'text-ceramic-accent',
    bgColor: 'bg-ceramic-accent/10',
  },
  whatsapp: {
    icon: '📱',
    label: 'WhatsApp',
    color: 'text-ceramic-success',
    bgColor: 'bg-ceramic-success/10',
  },
};

/**
 * Card de estatística individual
 */
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: string;
}> = ({ title, value, subtitle, icon, color = 'text-ceramic-info' }) => (
  <motion.div
    className="ceramic-card rounded-xl shadow-sm p-6 border border-ceramic-border"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-ceramic-text-secondary">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-ceramic-text-secondary mt-1">{subtitle}</p>}
      </div>
      {icon && <span className="text-3xl opacity-20">{icon}</span>}
    </div>
  </motion.div>
);

/**
 * Barra de progresso de módulo
 */
const ModuleBar: React.FC<{
  moduleStats: ModuleStats;
  percentage: number;
  index: number;
}> = ({ moduleStats, percentage, index }) => {
  const config = MODULE_CONFIG[moduleStats.module_type] || {
    icon: '📄',
    label: moduleStats.module_type,
    color: 'text-ceramic-text-secondary',
    bgColor: 'bg-ceramic-base',
  };

  return (
    <motion.div
      className="ceramic-card rounded-lg p-4 border border-ceramic-border"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className={`font-semibold ${config.color}`}>{config.label}</p>
            <p className="text-xs text-ceramic-text-secondary">
              {moduleStats.document_count} documento{moduleStats.document_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${config.color}`}>{percentage.toFixed(1)}%</p>
          <p className="text-xs text-ceramic-text-secondary">
            {(moduleStats.total_size_bytes / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-2 bg-ceramic-base rounded-full overflow-hidden">
        <motion.div
          className={`${config.bgColor} h-full`}
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${config.bgColor} 0%, ${config.color.replace('text-', 'bg-')} 100%)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-ceramic-text-secondary">
        <span>{moduleStats.corpus_count} corpus</span>
        {moduleStats.last_indexed_at && (
          <span>
            Última indexação:{' '}
            {new Date(moduleStats.last_indexed_at).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Lista de documentos recentes
 */
const RecentDocumentsList: React.FC<{
  documents: RecentDocument[];
}> = ({ documents }) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-ceramic-text-tertiary">
        <p>Nenhum documento indexado ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc, index) => {
        const config = MODULE_CONFIG[doc.module_type] || {
          icon: '📄',
          label: doc.module_type,
          color: 'text-ceramic-text-secondary',
          bgColor: 'bg-ceramic-base',
        };

        const statusConfig = {
          pending: { label: 'Pendente', color: 'text-ceramic-warning', bg: 'bg-ceramic-warning/10' },
          active: { label: 'Ativo', color: 'text-ceramic-success', bg: 'bg-ceramic-success/10' },
          failed: { label: 'Falhou', color: 'text-ceramic-error', bg: 'bg-ceramic-error/10' },
        };

        const status = statusConfig[doc.indexing_status as keyof typeof statusConfig] || statusConfig.pending;

        return (
          <motion.div
            key={doc.id}
            className="ceramic-card rounded-lg p-3 border border-ceramic-border hover:shadow-sm transition-shadow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-ceramic-text-primary truncate">
                    {doc.display_name}
                  </p>
                  <p className="text-xs text-ceramic-text-secondary">
                    {new Date(doc.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {doc.file_size_bytes && (
                  <span className="text-xs text-ceramic-text-tertiary">
                    {(doc.file_size_bytes / 1024).toFixed(1)} KB
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.color} font-medium`}
                >
                  {status.label}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

/**
 * Dashboard principal
 */
export const FileSearchAnalyticsDashboard: React.FC<FileSearchAnalyticsDashboardProps> = ({
  userId,
  className = '',
}) => {
  const {
    stats,
    recentDocuments,
    isLoading,
    error,
    getModuleUsagePercentage,
    getModulesByUsage,
    getIndexingSuccessRate,
    refresh,
  } = useFileSearchAnalytics({ userId, autoLoad: true });

  // Loading state
  if (isLoading && !stats) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-ceramic-cool rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-ceramic-cool rounded-xl"></div>
            <div className="h-24 bg-ceramic-cool rounded-xl"></div>
            <div className="h-24 bg-ceramic-cool rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-ceramic-error/10 border border-ceramic-error/20 rounded-xl p-6 text-center">
          <p className="text-ceramic-error font-medium">Erro ao carregar estatísticas</p>
          <p className="text-ceramic-error/80 text-sm mt-2">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-ceramic-error text-white rounded-lg hover:bg-ceramic-error/90 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!stats || stats.total_documents === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-ceramic-base border border-ceramic-border rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-xl font-semibold text-ceramic-text-primary">Nenhum documento indexado</p>
          <p className="text-ceramic-text-secondary mt-2">
            Comece a indexar documentos nos módulos para visualizar estatísticas aqui
          </p>
        </div>
      </div>
    );
  }

  const modulesByUsage = getModulesByUsage();
  const successRate = getIndexingSuccessRate();

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ceramic-text-primary">File Search Analytics</h2>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            Visualize o uso do File Search em todos os módulos
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="px-4 py-2 bg-ceramic-info text-white rounded-lg hover:bg-ceramic-info/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>{isLoading ? '🔄' : '↻'}</span>
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total de Documentos"
          value={stats.total_documents}
          subtitle={`Em ${stats.total_corpora} corpus`}
          icon="📄"
          color="text-ceramic-info"
        />
        <StatCard
          title="Tamanho Total"
          value={`${stats.total_size_mb.toFixed(2)} MB`}
          subtitle="Dados indexados"
          icon="💾"
          color="text-ceramic-success"
        />
        <StatCard
          title="Taxa de Sucesso"
          value={`${successRate.toFixed(1)}%`}
          subtitle={`${stats.documents_by_status.active} ativos, ${stats.documents_by_status.failed} falhas`}
          icon="✅"
          color="text-ceramic-accent"
        />
        <StatCard
          title="Módulos Ativos"
          value={stats.module_stats.length}
          subtitle={`${modulesByUsage[0]?.module_type || 'N/A'} é o mais usado`}
          icon="🔌"
          color="text-ceramic-warning"
        />
      </div>

      {/* Module Usage Breakdown */}
      <div className="ceramic-card rounded-xl shadow-sm p-6 border border-ceramic-border">
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Uso por Módulo</h3>
        <div className="space-y-3">
          {modulesByUsage.map((moduleStats, index) => (
            <ModuleBar
              key={moduleStats.module_type}
              moduleStats={moduleStats}
              percentage={getModuleUsagePercentage(moduleStats.module_type)}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Recent Documents */}
      <div className="ceramic-card rounded-xl shadow-sm p-6 border border-ceramic-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ceramic-text-primary">Documentos Recentes</h3>
          <span className="text-sm text-ceramic-text-secondary">
            {recentDocuments.length} documento{recentDocuments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <RecentDocumentsList documents={recentDocuments} />
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          className="bg-ceramic-success/10 rounded-xl p-6 border border-ceramic-success/15"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ceramic-success">Ativos</p>
              <p className="text-2xl font-bold text-ceramic-success mt-1">
                {stats.documents_by_status.active}
              </p>
            </div>
            <span className="text-4xl opacity-20">✅</span>
          </div>
        </motion.div>

        <motion.div
          className="bg-ceramic-warning/10 rounded-xl p-6 border border-ceramic-warning/15"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ceramic-warning">Pendentes</p>
              <p className="text-2xl font-bold text-ceramic-warning mt-1">
                {stats.documents_by_status.pending}
              </p>
            </div>
            <span className="text-4xl opacity-20">⏳</span>
          </div>
        </motion.div>

        <motion.div
          className="bg-ceramic-error/10 rounded-xl p-6 border border-ceramic-error/15"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ceramic-error">Falhas</p>
              <p className="text-2xl font-bold text-ceramic-error mt-1">
                {stats.documents_by_status.failed}
              </p>
            </div>
            <span className="text-4xl opacity-20">❌</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
