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
      <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 rounded"></div>
          <div className="h-4 bg-gray-100 rounded"></div>
          <div className="h-4 bg-gray-100 rounded"></div>
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
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-bold text-gray-900">Cache</h4>
          </div>
          {showControls && (
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <p className="text-xs text-gray-500">Hit Rate</p>
            <p className={`text-lg font-bold text-${hitRateColor}-600`}>
              {stats.hitRate.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Entries</p>
            <p className="text-lg font-bold text-gray-900">{stats.totalEntries}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center`}>
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Cache Performance</h3>
            <p className="text-xs text-gray-500">
              Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>

        {showControls && (
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearCache}
              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
              title="Limpar cache"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
          </div>
        )}
      </div>

      {/* Hit Rate - Main Metric */}
      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-medium text-gray-700">Hit Rate</span>
          <span className={`text-3xl font-bold text-${hitRateColor}-600`}>
            {stats.hitRate.toFixed(1)}%
          </span>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.hitRate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              stats.hitRate >= 70
                ? 'bg-green-500'
                : stats.hitRate >= 50
                ? 'bg-orange-500'
                : 'bg-red-500'
            }`}
          />
        </div>

        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>{stats.totalHits} hits</span>
          <span>{stats.totalMisses} misses</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Entries */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Total Entries</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.totalEntries}</p>
          <p className="text-xs text-blue-600 mt-1">
            Mem: {stats.memoryEntries} | Storage: {stats.storageEntries}
          </p>
        </div>

        {/* Memory Usage */}
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MemoryStick className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">Memory</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {stats.memoryUsageKB.toFixed(1)}
          </p>
          <p className="text-xs text-purple-600 mt-1">KB em memória</p>
        </div>

        {/* Storage Usage */}
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Storage</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {stats.storageUsageKB.toFixed(1)}
          </p>
          <p className="text-xs text-green-600 mt-1">KB em localStorage</p>
        </div>

        {/* Performance Boost */}
        <div className="bg-orange-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-700">Boost</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {stats.hitRate > 0 ? '96%' : '0%'}
          </p>
          <p className="text-xs text-orange-600 mt-1">mais rápido (cache hit)</p>
        </div>
      </div>

      {/* Health Status */}
      <div
        className={`rounded-lg p-3 ${
          isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        } border`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
          />
          <span className={`text-sm font-medium ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
            {isHealthy ? 'Cache operando normalmente' : 'Cache com problemas (storage alto)'}
          </span>
        </div>

        {!isHealthy && (
          <p className="text-xs text-red-600 mt-2">
            Considere limpar entradas antigas ou reduzir maxStorageEntries.
          </p>
        )}
      </div>

      {/* Performance Tips */}
      {stats.hitRate < 50 && stats.totalHits + stats.totalMisses > 20 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3"
        >
          <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ Hit rate baixo</p>
          <p className="text-xs text-yellow-700">
            Queries muito variadas reduzem eficiência do cache. Considere aumentar TTL ou analisar
            padrão de buscas.
          </p>
        </motion.div>
      )}

      {/* Cost Savings Estimate */}
      {stats.totalHits > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Economia estimada</span>
            <span className="text-lg font-bold text-green-600">
              ${((stats.totalHits * 0.0007)).toFixed(4)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Baseado em {stats.totalHits} cache hits @ $0.0007/query
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default CacheStatsWidget;
