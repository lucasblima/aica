/**
 * HealthScoreCard Component
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * Detailed card showing health score with components breakdown.
 * Shows frequency, recency, sentiment, reciprocity, and depth scores.
 *
 * @example
 * <HealthScoreCard contactId="uuid" />
 * <HealthScoreCard score={75} components={...} showRecalculate />
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Clock,
  Heart,
  ArrowLeftRight,
  MessageSquare,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import { HealthScoreCircle } from './HealthScoreBadge';
import {
  getRiskLevel,
  getRiskColor,
  getAlertMessage,
  type HealthScoreComponents,
  type HealthScoreTrend,
  type HealthAlertType,
} from '@/types/healthScore';

// ============================================================================
// TYPES
// ============================================================================

interface HealthScoreCardProps {
  /** Health score value (0-100) */
  score: number | null;
  /** Previous score for comparison */
  previousScore?: number | null;
  /** Score components breakdown */
  components?: HealthScoreComponents | null;
  /** Score trend direction */
  trend?: HealthScoreTrend | null;
  /** Alert type if any */
  alertType?: HealthAlertType | null;
  /** Last updated timestamp */
  updatedAt?: string | null;
  /** Contact name for display */
  contactName?: string;
  /** Whether recalculation is in progress */
  isRecalculating?: boolean;
  /** Show recalculate button */
  showRecalculate?: boolean;
  /** Recalculate callback */
  onRecalculate?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ComponentBarProps {
  label: string;
  value: number;
  maxValue: number;
  icon: React.ReactNode;
  color: string;
}

function ComponentBar({ label, value, maxValue, icon, color }: ComponentBarProps) {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-ceramic-text-secondary">{icon}</span>
          <span className="text-xs font-medium text-ceramic-text-secondary">
            {label}
          </span>
        </div>
        <span className="text-xs font-bold text-ceramic-text-primary">
          {value.toFixed(1)}/{maxValue}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function TrendIndicator({ trend, delta }: { trend: HealthScoreTrend; delta?: number | null }) {
  const config = {
    improving: {
      icon: TrendingUp,
      color: '#22C55E',
      label: 'Melhorando',
    },
    declining: {
      icon: TrendingDown,
      color: '#EF4444',
      label: 'Declinando',
    },
    stable: {
      icon: Minus,
      color: '#6B7280',
      label: 'Estável',
    },
    new: {
      icon: Sparkles,
      color: '#8B5CF6',
      label: 'Novo',
    },
  };

  const { icon: Icon, color, label } = config[trend];

  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-sm font-medium" style={{ color }}>
        {label}
        {delta !== null && delta !== undefined && (
          <span className="ml-1">
            ({delta > 0 ? '+' : ''}{delta})
          </span>
        )}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HealthScoreCard({
  score,
  previousScore,
  components,
  trend,
  alertType,
  updatedAt,
  contactName,
  isRecalculating = false,
  showRecalculate = true,
  onRecalculate,
  className = '',
}: HealthScoreCardProps) {
  const scoreDelta = score !== null && previousScore !== null
    ? score - previousScore
    : null;

  const riskLevel = score !== null ? getRiskLevel(score) : null;
  const riskColor = riskLevel ? getRiskColor(riskLevel) : '#9CA3AF';

  // Component colors
  const componentColors = {
    frequency: '#3B82F6',   // blue-500
    recency: '#10B981',     // emerald-500
    sentiment: '#EC4899',   // pink-500
    reciprocity: '#F59E0B', // amber-500
    depth: '#8B5CF6',       // violet-500
  };

  return (
    <motion.div
      className={`ceramic-card p-6 rounded-3xl space-y-6 ${className}`}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="ceramic-concave p-3 rounded-xl">
            <Activity className="w-5 h-5 text-ceramic-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Score de Saúde
            </h3>
            {contactName && (
              <p className="text-sm text-ceramic-text-secondary">
                {contactName}
              </p>
            )}
          </div>
        </div>

        {/* Recalculate Button */}
        {showRecalculate && onRecalculate && (
          <button
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="ceramic-inset p-2 rounded-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            aria-label="Recalcular score"
          >
            {isRecalculating ? (
              <Loader2 className="w-4 h-4 text-ceramic-accent animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 text-ceramic-text-secondary" />
            )}
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {alertType && (
        <div
          className="p-3 rounded-xl flex items-center gap-3"
          style={{ backgroundColor: `${riskColor}15` }}
        >
          <AlertTriangle className="w-5 h-5" style={{ color: riskColor }} />
          <span className="text-sm font-medium" style={{ color: riskColor }}>
            {getAlertMessage(alertType)}
          </span>
        </div>
      )}

      {/* Main Score Display */}
      <div className="ceramic-inset p-6 rounded-xl">
        <div className="flex items-center justify-between">
          {/* Score Circle */}
          <div className="flex items-center gap-6">
            <HealthScoreCircle
              score={score}
              size={80}
              strokeWidth={6}
              showScore={true}
            />

            <div className="space-y-2">
              {/* Trend */}
              {trend && (
                <TrendIndicator trend={trend} delta={scoreDelta} />
              )}

              {/* Risk Level */}
              {riskLevel && (
                <div
                  className="inline-flex px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: `${riskColor}15`,
                    color: riskColor,
                  }}
                >
                  {riskLevel === 'critical' && 'Crítico'}
                  {riskLevel === 'high' && 'Alto Risco'}
                  {riskLevel === 'moderate' && 'Moderado'}
                  {riskLevel === 'healthy' && 'Saudável'}
                </div>
              )}
            </div>
          </div>

          {/* Last Updated */}
          {updatedAt && (
            <div className="text-right">
              <p className="text-xs text-ceramic-text-secondary">
                Atualizado
              </p>
              <p className="text-sm font-medium text-ceramic-text-primary">
                {new Date(updatedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Components Breakdown */}
      {components && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Componentes do Score
          </p>

          <div className="space-y-4">
            <ComponentBar
              label="Frequência"
              value={components.frequency_score}
              maxValue={25}
              icon={<MessageSquare className="w-4 h-4" />}
              color={componentColors.frequency}
            />

            <ComponentBar
              label="Recência"
              value={components.recency_score}
              maxValue={25}
              icon={<Clock className="w-4 h-4" />}
              color={componentColors.recency}
            />

            <ComponentBar
              label="Sentimento"
              value={components.sentiment_score}
              maxValue={20}
              icon={<Heart className="w-4 h-4" />}
              color={componentColors.sentiment}
            />

            <ComponentBar
              label="Reciprocidade"
              value={components.reciprocity_score}
              maxValue={15}
              icon={<ArrowLeftRight className="w-4 h-4" />}
              color={componentColors.reciprocity}
            />

            <ComponentBar
              label="Profundidade"
              value={components.depth_score}
              maxValue={15}
              icon={<Activity className="w-4 h-4" />}
              color={componentColors.depth}
            />
          </div>
        </div>
      )}

      {/* Stats Row */}
      {components && (
        <div className="grid grid-cols-2 gap-4">
          <div className="ceramic-inset p-4 rounded-xl text-center">
            <p className="text-2xl font-bold text-ceramic-text-primary">
              {components.messages_analyzed}
            </p>
            <p className="text-xs text-ceramic-text-secondary">
              Mensagens Analisadas
            </p>
          </div>
          <div className="ceramic-inset p-4 rounded-xl text-center">
            <p className="text-2xl font-bold text-ceramic-text-primary">
              {components.days_since_last_message.toFixed(0)}
            </p>
            <p className="text-xs text-ceramic-text-secondary">
              Dias Sem Contato
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {score === null && !components && (
        <div className="ceramic-inset p-8 rounded-xl text-center">
          <Activity className="w-12 h-12 text-ceramic-text-secondary/30 mx-auto mb-4" />
          <p className="text-sm text-ceramic-text-secondary">
            Nenhum score calculado ainda
          </p>
          {showRecalculate && onRecalculate && (
            <button
              onClick={onRecalculate}
              disabled={isRecalculating}
              className="mt-4 px-4 py-2 ceramic-card rounded-xl text-sm font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isRecalculating ? 'Calculando...' : 'Calcular Agora'}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default HealthScoreCard;
