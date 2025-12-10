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
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  podcast: {
    icon: '🎙️',
    label: 'Podcast',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  finance: {
    icon: '💰',
    label: 'Finance',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  journey: {
    icon: '🧭',
    label: 'Journey',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  atlas: {
    icon: '🗺️',
    label: 'Atlas',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  chat: {
    icon: '💬',
    label: 'Chat',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
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
}> = ({ title, value, subtitle, icon, color = 'text-blue-600' }) => (
  <motion.div
    className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
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
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  };

  return (
    <motion.div
      className="bg-white rounded-lg p-4 border border-gray-100"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className={`font-semibold ${config.color}`}>{config.label}</p>
            <p className="text-xs text-gray-500">
              {moduleStats.document_count} documento{moduleStats.document_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${config.color}`}>{percentage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">
            {(moduleStats.total_size_bytes / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
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

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
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
      <div className="text-center py-8 text-gray-400">
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
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
        };

        const statusConfig = {
          pending: { label: 'Pendente', color: 'text-yellow-600', bg: 'bg-yellow-50' },
          active: { label: 'Ativo', color: 'text-green-600', bg: 'bg-green-50' },
          failed: { label: 'Falhou', color: 'text-red-600', bg: 'bg-red-50' },
        };

        const status = statusConfig[doc.indexing_status as keyof typeof statusConfig] || statusConfig.pending;

        return (
          <motion.div
            key={doc.id}
            className="bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-shadow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {doc.display_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {doc.file_size_bytes && (
                  <span className="text-xs text-gray-400">
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
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Erro ao carregar estatísticas</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-xl font-semibold text-gray-700">Nenhum documento indexado</p>
          <p className="text-gray-500 mt-2">
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
          <h2 className="text-2xl font-bold text-gray-900">File Search Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">
            Visualize o uso do File Search em todos os módulos
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          color="text-blue-600"
        />
        <StatCard
          title="Tamanho Total"
          value={`${stats.total_size_mb.toFixed(2)} MB`}
          subtitle="Dados indexados"
          icon="💾"
          color="text-green-600"
        />
        <StatCard
          title="Taxa de Sucesso"
          value={`${successRate.toFixed(1)}%`}
          subtitle={`${stats.documents_by_status.active} ativos, ${stats.documents_by_status.failed} falhas`}
          icon="✅"
          color="text-purple-600"
        />
        <StatCard
          title="Módulos Ativos"
          value={stats.module_stats.length}
          subtitle={`${modulesByUsage[0]?.module_type || 'N/A'} é o mais usado`}
          icon="🔌"
          color="text-orange-600"
        />
      </div>

      {/* Module Usage Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso por Módulo</h3>
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
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Documentos Recentes</h3>
          <span className="text-sm text-gray-500">
            {recentDocuments.length} documento{recentDocuments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <RecentDocumentsList documents={recentDocuments} />
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          className="bg-green-50 rounded-xl p-6 border border-green-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Ativos</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {stats.documents_by_status.active}
              </p>
            </div>
            <span className="text-4xl opacity-20">✅</span>
          </div>
        </motion.div>

        <motion.div
          className="bg-yellow-50 rounded-xl p-6 border border-yellow-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">
                {stats.documents_by_status.pending}
              </p>
            </div>
            <span className="text-4xl opacity-20">⏳</span>
          </div>
        </motion.div>

        <motion.div
          className="bg-red-50 rounded-xl p-6 border border-red-100"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Falhas</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
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
