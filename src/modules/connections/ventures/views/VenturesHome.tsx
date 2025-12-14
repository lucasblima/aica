import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, TrendingUp, Users, Target } from 'lucide-react';
import { useEntity } from '../hooks/useEntity';
import { useMetrics } from '../hooks/useMetrics';
import { useMilestones } from '../hooks/useMilestones';
import { useStakeholders } from '../hooks/useStakeholders';
import { formatCurrency, formatPercentage, calculateHealthStatus } from '../types';
import { cardElevationVariants, staggerContainer, staggerItem } from '../../../../lib/animations/ceramic-motion';

/**
 * VenturesHome View
 *
 * Main ventures listing/dashboard with ceramic-card styling.
 * Displays grid of venture cards, quick stats summary, and create new venture button.
 */
export function VenturesHome() {
  const [spaceId] = useState('default-space'); // TODO: Get from context/params

  // Fetch entity data
  const { entities, loading: entitiesLoading } = useEntity(spaceId);

  // Loading state
  if (entitiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ceramic-base">
        <div className="ceramic-card p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-ceramic-accent border-t-transparent" />
          <p className="mt-4 text-sm text-ceramic-text-secondary font-medium">Carregando ventures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ceramic-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ceramic-text-primary mb-2">
                Ventures
              </h1>
              <p className="text-sm text-ceramic-text-secondary">
                Motor de Criação - Cockpit of Professional Ambition
              </p>
            </div>

            {/* Create New Venture Button */}
            <motion.button
              className="ceramic-card px-6 py-3 flex items-center gap-2"
              variants={cardElevationVariants}
              initial="rest"
              whileHover="hover"
              whileTap="pressed"
            >
              <Plus className="w-5 h-5 text-ceramic-accent" />
              <span className="text-sm font-semibold text-ceramic-text-primary uppercase tracking-wider">
                Nova Venture
              </span>
            </motion.button>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <StatCard
            icon={Building2}
            label="Total Ventures"
            value={entities.length.toString()}
            color="text-ceramic-accent"
          />
          <StatCard
            icon={TrendingUp}
            label="Active"
            value={entities.filter(e => e.is_active).length.toString()}
            color="text-ceramic-positive"
          />
          <StatCard
            icon={Users}
            label="Team Members"
            value="0"
            color="text-ceramic-text-primary"
          />
          <StatCard
            icon={Target}
            label="Milestones"
            value="0"
            color="text-ceramic-text-primary"
          />
        </motion.div>

        {/* Grid of Venture Cards */}
        {entities.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {entities.map((entity) => (
              <VentureCard key={entity.id} entity={entity} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * StatCard - Quick stats summary card with ceramic styling
 */
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <motion.div
      className="ceramic-card p-5 relative overflow-hidden"
      variants={staggerItem}
    >
      {/* Background decorative icon */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 icon-engraved">
        <Icon className={`w-full h-full ${color}`} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="ceramic-inset p-2 inline-flex mb-3">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="text-2xl font-bold text-ceramic-text-primary mb-1">
          {value}
        </div>
        <div className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * VentureCard - Individual venture card with metrics preview
 */
interface VentureCardProps {
  entity: any;
}

function VentureCard({ entity }: VentureCardProps) {
  const { currentMetrics } = useMetrics(entity.id);
  const { milestones } = useMilestones(entity.id);
  const { stakeholders } = useStakeholders(entity.id);

  const healthStatus = calculateHealthStatus(currentMetrics?.runway_months);
  const activeMilestones = milestones.filter(m => m.status === 'in_progress').length;

  return (
    <motion.div
      className="ceramic-card p-6 min-h-[240px] flex flex-col cursor-pointer"
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">
            {entity.trading_name || entity.legal_name}
          </h3>
          <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
            {entity.entity_type || 'Venture'}
          </p>
        </div>

        {/* Health Badge */}
        <div className={`
          ceramic-inset px-3 py-1 rounded-full
          ${healthStatus === 'healthy' ? 'bg-green-50' : ''}
          ${healthStatus === 'warning' ? 'bg-yellow-50' : ''}
          ${healthStatus === 'critical' ? 'bg-red-50' : ''}
        `}>
          <span className={`
            text-xs font-bold
            ${healthStatus === 'healthy' ? 'text-ceramic-positive' : ''}
            ${healthStatus === 'warning' ? 'text-ceramic-accent' : ''}
            ${healthStatus === 'critical' ? 'text-ceramic-negative' : ''}
          `}>
            {healthStatus === 'healthy' ? '✓' : healthStatus === 'warning' ? '⚠' : '!'}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 space-y-3">
        {currentMetrics && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
                MRR
              </span>
              <span className="text-sm font-bold text-ceramic-text-primary">
                {formatCurrency(currentMetrics.mrr)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
                Runway
              </span>
              <span className="text-sm font-bold text-ceramic-text-primary">
                {currentMetrics.runway_months ? `${currentMetrics.runway_months}m` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
                Gross Margin
              </span>
              <span className="text-sm font-bold text-ceramic-text-primary">
                {formatPercentage(currentMetrics.gross_margin_pct)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-ceramic-text-secondary/10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-ceramic-text-secondary" />
            <span className="text-xs font-medium text-ceramic-text-secondary">
              {stakeholders.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4 text-ceramic-text-secondary" />
            <span className="text-xs font-medium text-ceramic-text-secondary">
              {activeMilestones}
            </span>
          </div>
        </div>
        <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          Ver detalhes →
        </span>
      </div>
    </motion.div>
  );
}

/**
 * EmptyState - No ventures created yet
 */
function EmptyState() {
  return (
    <div className="ceramic-card p-12 text-center">
      <div className="ceramic-concave w-20 h-20 mx-auto mb-6 flex items-center justify-center">
        <Building2 className="w-10 h-10 text-ceramic-text-secondary" />
      </div>
      <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">
        Nenhuma venture criada
      </h3>
      <p className="text-sm text-ceramic-text-secondary mb-6 max-w-md mx-auto">
        Configure sua primeira empresa ou projeto para começar a acompanhar métricas, milestones e equipe.
      </p>
      <motion.button
        className="ceramic-card px-6 py-3 inline-flex items-center gap-2"
        variants={cardElevationVariants}
        initial="rest"
        whileHover="hover"
        whileTap="pressed"
      >
        <Plus className="w-5 h-5 text-ceramic-accent" />
        <span className="text-sm font-semibold text-ceramic-text-primary uppercase tracking-wider">
          Criar primeira venture
        </span>
      </motion.button>
    </div>
  );
}
