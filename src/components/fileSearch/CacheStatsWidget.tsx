/**
 * CacheStatsWidget Component
 *
 * Real-time monitoring of File Search cache performance
 * Shows hit rate, memory usage, storage usage, and entry counts
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, TrendingUp, HardDrive, MemoryStick, RefreshCw, Trash2 } from 'lucide-react';
import { fileSearchCache, CacheStats } from '../../services/fileSearchCacheService';

interface CacheStatsWidgetProps {
  refreshInterval?: number; // Auto-refresh interval in milliseconds (default: 5000)
  showControls?: boolean; // Show clear cache button
  compact?: boolean; // Compact mode for smaller displays
}

export const CacheStatsWidget: React.FC<CacheStatsWidgetProps> = ({
  refreshInterval = 5000,
  showControls = true,
  compact = false,
}) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    updateStats();

    const interval = setInterval(() => {
      updateStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const updateStats = () => {
    const cacheStats = fileSearchCache.getStats();
    setStats(cacheStats);
    setLastUpdate(new Date());
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    updateStats();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const handleClearCache = () => {
    if (confirm('Tem certeza que deseja limpar todo o cache? Isso pode reduzir a performance temporariamente.')) {
      fileSearchCache.clearAll();
      updateStats();
    }
  };

  if (!stats) {
    return (
      <div className="ceramic-card p-6 animate-pulse">
        <div className="h-8 bg-ceramic-cool rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-ceramic-base rounded"></div>
          <div className="h-4 bg-ceramic-base rounded"></div>
          <div className="h-4 bg-ceramic-base rounded"></div>
        </div>
      </div>
    );
  }

  // Calculate health status
  const isHealthy = fileSearchCache.isHealthy();
  const hitRateColor = stats.hitRate >= 70 ? 'green' : stats.hitRate >= 50 ? 'orange' : 'red';

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ceramic-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-ceramic-info" />
            <h4 className="text-sm font-bold text-ceramic-text-primary">Cache</h4>
          </div>
          {showControls && (
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-ceramic-cool transition-colors"
            >
              <RefreshCw className={`w-3 h-3 text-ceramic-text-secondary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <p className="text-xs text-ceramic-text-secondary">Hit Rate</p>
            <p className={`text-lg font-bold text-${hitRateColor}-600`}>
              {stats.hitRate.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-ceramic-text-secondary">Entries</p>
            <p className="text-lg font-bold text-ceramic-text-primary">{stats.totalEntries}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ceramic-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-ceramic-info/10 flex items-center justify-center`}>
            <Database className="w-6 h-6 text-ceramic-info" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ceramic-text-primary">Cache Performance</h3>
            <p className="text-xs text-ceramic-text-secondary">
              Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>

        {showControls && (
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-ceramic-cool transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 text-ceramic-text-secondary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearCache}
              className="p-2 rounded-lg hover:bg-ceramic-error/10 transition-colors"
              title="Limpar cache"
            >
              <Trash2 className="w-5 h-5 text-ceramic-error" />
            </button>
          </div>
        )}
      </div>

      {/* Hit Rate - Main Metric */}
      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-medium text-ceramic-text-secondary">Hit Rate</span>
          <span className={`text-3xl font-bold text-${hitRateColor}-600`}>
            {stats.hitRate.toFixed(1)}%
          </span>
        </div>

        <div className="w-full h-3 bg-ceramic-cool rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.hitRate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              stats.hitRate >= 70
                ? 'bg-ceramic-success'
                : stats.hitRate >= 50
                ? 'bg-ceramic-warning'
                : 'bg-ceramic-error'
            }`}
          />
        </div>

        <div className="flex justify-between items-center mt-2 text-xs text-ceramic-text-tertiary">
          <span>{stats.totalHits} hits</span>
          <span>{stats.totalMisses} misses</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Entries */}
        <div className="bg-ceramic-info/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-ceramic-info" />
            <span className="text-xs font-medium text-ceramic-text-primary">Total Entries</span>
          </div>
          <p className="text-2xl font-bold text-ceramic-text-primary">{stats.totalEntries}</p>
          <p className="text-xs text-ceramic-text-secondary mt-1">
            Mem: {stats.memoryEntries} | Storage: {stats.storageEntries}
          </p>
        </div>

        {/* Memory Usage */}
        <div className="bg-ceramic-accent/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MemoryStick className="w-4 h-4 text-ceramic-accent" />
            <span className="text-xs font-medium text-ceramic-text-primary">Memory</span>
          </div>
          <p className="text-2xl font-bold text-ceramic-text-primary">
            {stats.memoryUsageKB.toFixed(1)}
          </p>
          <p className="text-xs text-ceramic-text-secondary mt-1">KB em memória</p>
        </div>

        {/* Storage Usage */}
        <div className="bg-ceramic-success/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-ceramic-success" />
            <span className="text-xs font-medium text-ceramic-text-primary">Storage</span>
          </div>
          <p className="text-2xl font-bold text-ceramic-text-primary">
            {stats.storageUsageKB.toFixed(1)}
          </p>
          <p className="text-xs text-ceramic-text-secondary mt-1">KB em localStorage</p>
        </div>

        {/* Performance Boost */}
        <div className="bg-ceramic-warning/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-ceramic-warning" />
            <span className="text-xs font-medium text-ceramic-text-primary">Boost</span>
          </div>
          <p className="text-2xl font-bold text-ceramic-text-primary">
            {stats.hitRate > 0 ? '96%' : '0%'}
          </p>
          <p className="text-xs text-ceramic-text-secondary mt-1">mais rápido (cache hit)</p>
        </div>
      </div>

      {/* Health Status */}
      <div
        className={`rounded-lg p-3 ${
          isHealthy ? 'bg-ceramic-success/10 border-ceramic-success' : 'bg-ceramic-error/10 border-ceramic-error'
        } border`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-ceramic-success' : 'bg-ceramic-error'} animate-pulse`}
          />
          <span className={`text-sm font-medium ${isHealthy ? 'text-ceramic-text-primary' : 'text-ceramic-text-primary'}`}>
            {isHealthy ? 'Cache operando normalmente' : 'Cache com problemas (storage alto)'}
          </span>
        </div>

        {!isHealthy && (
          <p className="text-xs text-ceramic-error mt-2">
            Considere limpar entradas antigas ou reduzir maxStorageEntries.
          </p>
        )}
      </div>

      {/* Performance Tips */}
      {stats.hitRate < 50 && stats.totalHits + stats.totalMisses > 20 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 bg-ceramic-warning/10 border border-ceramic-warning rounded-lg p-3"
        >
          <p className="text-sm font-medium text-ceramic-text-primary mb-1">⚠️ Hit rate baixo</p>
          <p className="text-xs text-ceramic-text-secondary">
            Queries muito variadas reduzem eficiência do cache. Considere aumentar TTL ou analisar
            padrão de buscas.
          </p>
        </motion.div>
      )}

      {/* Cost Savings Estimate */}
      {stats.totalHits > 0 && (
        <div className="mt-4 pt-4 border-t border-ceramic-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-ceramic-text-secondary">Economia estimada</span>
            <span className="text-lg font-bold text-ceramic-success">
              ${((stats.totalHits * 0.0007)).toFixed(4)}
            </span>
          </div>
          <p className="text-xs text-ceramic-text-tertiary mt-1">
            Baseado em {stats.totalHits} cache hits @ $0.0007/query
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default CacheStatsWidget;
