import React from 'react';
import { TrendingUp, DollarSign, Target, Clock, Users, Activity } from 'lucide-react';
import { VenturesEntity, VenturesMetrics, VenturesMilestone, VenturesStakeholder } from '../types';
import { HealthGauge } from './HealthGauge';
import { MetricsCard } from './MetricsCard';
import { MilestoneTimeline } from './MilestoneTimeline';
import { StakeholderGrid } from './StakeholderGrid';
import { MRRChart } from './MRRChart';
import { FinanceOverviewCard } from './FinanceOverviewCard';

/**
 * Main Props Interface - Full control with entity object
 */
interface VenturesDashboardProps {
  entity: VenturesEntity;
  currentMetrics?: VenturesMetrics;
  metricsHistory?: VenturesMetrics[];
  milestones?: VenturesMilestone[];
  stakeholders?: VenturesStakeholder[];
  spaceId: string;
  onMetricClick?: (metricName: string) => void;
  onMilestoneClick?: (milestone: VenturesMilestone) => void;
  onStakeholderClick?: (stakeholder: VenturesStakeholder) => void;
  onViewFinanceDetails?: () => void;
}

/**
 * Alternative Simplified Props - For use with ventureId (requirements spec)
 * Note: This interface is available but the component currently requires the full entity.
 * To use this interface, you would need to fetch the entity data based on ventureId.
 *
 * @example
 * ```typescript
 * interface VenturesDashboardSimpleProps {
 *   ventureId: string;
 *   metrics?: VenturesMetrics;
 *   milestones?: VenturesMilestone[];
 * }
 * ```
 */
export type { VenturesDashboardProps };

/**
 * VenturesDashboard Component
 *
 * Braun-inspired precision dashboard for business management.
 *
 * Design Philosophy:
 * - Clean lines and monospace numbers following Braun design principles
 * - Ceramic Design System (ceramic-card, ceramic-inset, ceramic-tray)
 * - Lucide-react icons for visual clarity
 *
 * Key Features:
 * - Key Metrics: Burn Rate, MRR, Runway with monospace typography
 * - Milestone Timeline: Visual progress tracking
 * - Team Velocity: Real-time team performance indicator
 * - Health Gauges: Business health monitoring
 *
 * Props:
 * - entity: The business entity data
 * - currentMetrics: Current period financial metrics
 * - metricsHistory: Historical metrics for trend analysis
 * - milestones: Strategic milestones and goals
 * - stakeholders: Team members and investors
 * - spaceId: Connection space identifier
 * - Callbacks: onMetricClick, onMilestoneClick, onStakeholderClick, onViewFinanceDetails
 */
export function VenturesDashboard({
  entity,
  currentMetrics,
  metricsHistory = [],
  milestones = [],
  stakeholders = [],
  spaceId,
  onMetricClick,
  onMilestoneClick,
  onStakeholderClick,
  onViewFinanceDetails,
}: VenturesDashboardProps) {
  // Get previous period metrics for comparison
  const previousMetrics = metricsHistory.length > 1 ? metricsHistory[1] : undefined;

  // Filter active milestones
  const activeMilestones = milestones.filter(
    (m) => m.status === 'in_progress' || m.status === 'pending'
  );

  // Filter active stakeholders
  const activeStakeholders = stakeholders.filter((s) => s.is_active);

  // Calculate team velocity (tasks/milestones completed per month)
  const completedMilestones = milestones.filter(m => m.status === 'achieved').length;
  const totalMilestones = milestones.length;
  const velocityPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header - Braun-inspired precision */}
      <div className="ceramic-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ceramic-text-primary">
              {entity.trading_name || entity.legal_name}
            </h1>
            {entity.trading_name && (
              <p className="text-sm text-ceramic-text-secondary mt-1">{entity.legal_name}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              {entity.sector && (
                <span className="ceramic-inset text-xs font-medium text-ceramic-text-secondary px-3 py-1.5">
                  {entity.sector}
                </span>
              )}
              {entity.entity_type && (
                <span className="text-xs font-semibold text-ceramic-accent bg-ceramic-warm px-3 py-1.5 rounded-full">
                  {entity.entity_type}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-ceramic-text-secondary mb-1">CNPJ</div>
            <div className="text-sm font-mono font-medium text-ceramic-text-primary">
              {entity.cnpj || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Finance Overview Integration */}
      <FinanceOverviewCard spaceId={spaceId} onViewDetails={onViewFinanceDetails} />

      {/* Health Indicators */}
      <div className="grid grid-cols-1 gap-4">
        <HealthGauge
          runwayMonths={currentMetrics?.runway_months}
          burnRate={currentMetrics?.burn_rate}
          cashBalance={currentMetrics?.cash_balance}
        />
      </div>

      {/* Key Metrics Grid - Braun precision with monospace numbers */}
      <div>
        <h2 className="text-sm uppercase tracking-wider font-semibold text-ceramic-text-secondary mb-4">
          Métricas Principais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Burn Rate */}
          <div className="ceramic-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="ceramic-inset p-2">
                <TrendingUp className="w-4 h-4 text-ceramic-accent" />
              </div>
              <div className="text-xs uppercase tracking-wider text-ceramic-text-secondary">
                Burn Rate
              </div>
            </div>
            <div className="text-3xl font-mono font-bold text-ceramic-text-primary">
              {currentMetrics?.burn_rate
                ? `${(currentMetrics.burn_rate / 1000).toFixed(0)}k`
                : '—'}
            </div>
            <div className="text-xs text-ceramic-text-secondary mt-1">/ mês</div>
          </div>

          {/* MRR */}
          <div className="ceramic-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="ceramic-inset p-2">
                <DollarSign className="w-4 h-4 text-ceramic-accent" />
              </div>
              <div className="text-xs uppercase tracking-wider text-ceramic-text-secondary">
                MRR
              </div>
            </div>
            <div className="text-3xl font-mono font-bold text-ceramic-text-primary">
              {currentMetrics?.mrr
                ? `${(currentMetrics.mrr / 1000).toFixed(0)}k`
                : '—'}
            </div>
            {previousMetrics?.mrr && (
              <div className="text-xs text-ceramic-text-secondary mt-1">
                {((currentMetrics?.mrr || 0) - previousMetrics.mrr > 0 ? '+' : '')}
                {(((currentMetrics?.mrr || 0) - previousMetrics.mrr) / 1000).toFixed(0)}k vs anterior
              </div>
            )}
          </div>

          {/* Runway */}
          <div className="ceramic-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="ceramic-inset p-2">
                <Clock className="w-4 h-4 text-ceramic-accent" />
              </div>
              <div className="text-xs uppercase tracking-wider text-ceramic-text-secondary">
                Runway
              </div>
            </div>
            <div className="text-3xl font-mono font-bold text-ceramic-text-primary">
              {currentMetrics?.runway_months ?? '—'}
            </div>
            <div className="text-xs text-ceramic-text-secondary mt-1">meses</div>
          </div>
        </div>
      </div>

      {/* MRR Chart */}
      {metricsHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="ceramic-inset p-2">
              <TrendingUp className="w-4 h-4 text-ceramic-accent" />
            </div>
            <h2 className="text-sm uppercase tracking-wider font-semibold text-ceramic-text-secondary">
              Evolução de Receita (MRR)
            </h2>
          </div>
          <div className="ceramic-card p-6">
            <MRRChart metricsHistory={metricsHistory} />
          </div>
        </div>
      )}

      {/* Team Velocity Indicator - Braun precision */}
      <div className="ceramic-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="ceramic-inset p-2">
              <Activity className="w-4 h-4 text-ceramic-accent" />
            </div>
            <h2 className="text-sm uppercase tracking-wider font-semibold text-ceramic-text-secondary">
              Velocidade do Time
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-ceramic-text-primary">
              {completedMilestones}/{totalMilestones}
            </div>
            <div className="text-xs text-ceramic-text-secondary">milestones</div>
          </div>
        </div>

        {/* Velocity Progress Bar */}
        <div className="ceramic-tray p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="ceramic-groove h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ceramic-accent to-amber-500 transition-all duration-500"
                  style={{ width: `${velocityPercentage}%` }}
                />
              </div>
            </div>
            <div className="text-sm font-mono font-semibold text-ceramic-accent">
              {velocityPercentage.toFixed(0)}%
            </div>
          </div>
          <div className="text-xs text-ceramic-text-secondary mt-2">
            Taxa de conclusão de objetivos estratégicos
          </div>
        </div>
      </div>

      {/* Milestone Timeline Section */}
      {activeMilestones.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="ceramic-inset p-2">
              <Target className="w-4 h-4 text-ceramic-accent" />
            </div>
            <h2 className="text-sm uppercase tracking-wider font-semibold text-ceramic-text-secondary">
              Milestones em Andamento
            </h2>
          </div>
          <div className="ceramic-card p-6">
            <MilestoneTimeline
              milestones={activeMilestones}
              onMilestoneClick={onMilestoneClick}
            />
          </div>
        </div>
      )}

      {/* Team Overview */}
      {activeStakeholders.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="ceramic-inset p-2">
              <Users className="w-4 h-4 text-ceramic-accent" />
            </div>
            <h2 className="text-sm uppercase tracking-wider font-semibold text-ceramic-text-secondary">
              Time e Stakeholders
            </h2>
          </div>
          <div className="ceramic-card p-6">
            <StakeholderGrid
              stakeholders={activeStakeholders}
              onStakeholderClick={onStakeholderClick}
            />
          </div>
        </div>
      )}

      {/* Empty State - Braun minimalism */}
      {!currentMetrics && activeMilestones.length === 0 && activeStakeholders.length === 0 && (
        <div className="ceramic-card p-12 text-center">
          <div className="ceramic-concave p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Target className="w-10 h-10 text-ceramic-text-secondary" />
          </div>
          <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">
            Bem-vindo ao seu Ventures
          </h3>
          <p className="text-ceramic-text-secondary max-w-md mx-auto text-sm">
            Comece adicionando métricas financeiras, milestones estratégicos e membros da sua
            equipe para acompanhar a saúde do seu negócio.
          </p>
        </div>
      )}
    </div>
  );
}
