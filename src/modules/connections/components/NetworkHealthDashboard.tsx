/**
 * NetworkHealthDashboard Component
 * Sprint 4: Connections — Network-level metrics overview
 *
 * Shows effective network size, constraint, diversity index,
 * and Dunbar layer distribution in a dashboard layout.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Network,
  Shuffle,
  BarChart3,
  RefreshCw,
  Loader2,
  Users,
  TrendingUp,
} from 'lucide-react';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import { useNetworkMetrics } from '../hooks/useNetworkMetrics';
import type { DunbarLayer } from '../services/networkScoring';

// ============================================================================
// TYPES
// ============================================================================

interface NetworkHealthDashboardProps {
  className?: string;
  compact?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getConstraintLevel(constraint: number): { label: string; color: string } {
  if (constraint <= 0.3) return { label: 'Baixa (bom)', color: '#6B7B5C' };
  if (constraint <= 0.6) return { label: 'Moderada', color: '#D97706' };
  return { label: 'Alta (atencao)', color: '#9B4D3A' };
}

function getDiversityLevel(index: number): { label: string; color: string } {
  if (index >= 0.7) return { label: 'Alta', color: '#6B7B5C' };
  if (index >= 0.4) return { label: 'Moderada', color: '#D97706' };
  return { label: 'Baixa', color: '#9B4D3A' };
}

const LAYER_LABELS: Record<DunbarLayer, string> = {
  5: 'Intimo',
  15: 'Simpatia',
  50: 'Proximo',
  150: 'Ativo',
  500: 'Conhecido',
};

const LAYER_COLORS: Record<DunbarLayer, string> = {
  5: '#D97706',
  15: '#C4883A',
  50: '#8B7355',
  150: '#7B8FA2',
  500: '#948D82',
};

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color?: string;
}

function MetricCard({ icon, label, value, sublabel, color }: MetricCardProps) {
  return (
    <div className="ceramic-inset p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-ceramic-text-secondary">{icon}</span>
        <span className="text-xs font-medium text-ceramic-text-secondary">{label}</span>
      </div>
      <p className="text-2xl font-bold text-ceramic-text-primary">{value}</p>
      {sublabel && (
        <p className="text-xs mt-1" style={{ color: color ?? '#948D82' }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// LAYER DISTRIBUTION BAR
// ============================================================================

function LayerDistributionBar({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const layers: DunbarLayer[] = [5, 15, 50, 150, 500];
  const total = layers.reduce((s, l) => s + (distribution[l] ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
        Distribuicao por Camada
      </p>
      <div className="flex h-4 rounded-full overflow-hidden bg-ceramic-base">
        {layers.map((layer) => {
          const count = distribution[layer] ?? 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <motion.div
              key={layer}
              className="h-full"
              style={{ backgroundColor: LAYER_COLORS[layer], width: `${pct}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              title={`${LAYER_LABELS[layer]}: ${count} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-1">
        {layers.map((layer) => {
          const count = distribution[layer] ?? 0;
          if (count === 0) return null;
          return (
            <div key={layer} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: LAYER_COLORS[layer] }}
              />
              <span className="text-[10px] text-ceramic-text-secondary">
                {LAYER_LABELS[layer]}: {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NetworkHealthDashboard({
  className = '',
  compact = false,
}: NetworkHealthDashboardProps) {
  const { metrics, isLoading, isRefreshing, error, refresh, lastComputedAt } = useNetworkMetrics();

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 text-ceramic-accent animate-spin" />
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className={`ceramic-inset p-6 rounded-xl text-center ${className}`}>
        <Network className="w-10 h-10 text-ceramic-text-secondary/30 mx-auto mb-3" />
        <p className="text-sm text-ceramic-text-secondary">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 px-4 py-2 ceramic-card rounded-xl text-sm font-bold text-ceramic-accent"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`ceramic-inset p-6 rounded-xl text-center ${className}`}>
        <Network className="w-10 h-10 text-ceramic-text-secondary/30 mx-auto mb-3" />
        <p className="text-sm text-ceramic-text-secondary">
          Nenhuma metrica de rede calculada ainda.
        </p>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="mt-3 px-4 py-2 ceramic-card rounded-xl text-sm font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
        >
          {isRefreshing ? 'Calculando...' : 'Calcular Agora'}
        </button>
      </div>
    );
  }

  const constraintInfo = getConstraintLevel(metrics.networkConstraint);
  const diversityInfo = getDiversityLevel(metrics.diversityIndex);

  return (
    <motion.div
      className={`bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss space-y-5 ${className}`}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave p-2 rounded-lg">
            <Network className="w-5 h-5 text-ceramic-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Saude da Rede
            </h3>
            {lastComputedAt && (
              <p className="text-xs text-ceramic-text-secondary">
                Atualizado {new Date(lastComputedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="ceramic-inset p-2 rounded-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
          aria-label="Recalcular metricas"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 text-ceramic-accent animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 text-ceramic-text-secondary" />
          )}
        </button>
      </div>

      {/* Metrics Grid */}
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'} gap-3`}>
        <MetricCard
          icon={<Users className="w-4 h-4" />}
          label="Contatos Ativos"
          value={String(metrics.totalContacts)}
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Tamanho Efetivo"
          value={metrics.effectiveSize.toFixed(1)}
          sublabel={`de ${metrics.totalContacts} contatos`}
        />
        <MetricCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Restricao de Rede"
          value={(metrics.networkConstraint * 100).toFixed(0) + '%'}
          sublabel={constraintInfo.label}
          color={constraintInfo.color}
        />
        <MetricCard
          icon={<Shuffle className="w-4 h-4" />}
          label="Diversidade"
          value={(metrics.diversityIndex * 100).toFixed(0) + '%'}
          sublabel={diversityInfo.label}
          color={diversityInfo.color}
        />
      </div>

      {/* Layer Distribution */}
      {!compact && (
        <LayerDistributionBar distribution={metrics.layerDistribution} />
      )}
    </motion.div>
  );
}

export default NetworkHealthDashboard;
