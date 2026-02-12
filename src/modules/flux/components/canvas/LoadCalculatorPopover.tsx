/**
 * LoadCalculatorPopover - Training load calculator and optimizer
 *
 * Phase 1: Mock calculation (simple volume sum)
 * Phase 2: Will integrate TSS, CTL, ATL, ramp rate algorithms
 *
 * Shows:
 * - Weekly volume summary
 * - Load distribution (visual bar)
 * - AI-powered suggestions for adjustments
 */

import React, { useMemo } from 'react';
import { X, TrendingUp, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import type { WorkoutBlockData } from './WorkoutBlock';
import type { AthleteLevel } from '../../types';

interface LoadCalculatorPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  weekWorkouts: WorkoutBlockData[];
  athleteProfile: {
    level: AthleteLevel;
    ftp?: number;
    pace_threshold?: string;
  };
  onApplySuggestions?: (adjustments: LoadAdjustment[]) => void;
}

export interface LoadAdjustment {
  dayOfWeek: number;
  workoutId: string;
  adjustment: 'reduce' | 'increase' | 'remove';
  percentage?: number;
  reason: string;
}

export const LoadCalculatorPopover: React.FC<LoadCalculatorPopoverProps> = ({
  isOpen,
  onClose,
  weekWorkouts,
  athleteProfile,
  onApplySuggestions,
}) => {
  // Calculate load metrics (mock implementation)
  const loadMetrics = useMemo(() => {
    const totalVolume = weekWorkouts.reduce((sum, w) => sum + w.duration, 0);
    const totalDays = new Set(weekWorkouts.map((w) => w.id)).size; // Placeholder
    const avgIntensity =
      weekWorkouts.reduce(
        (sum, w) => sum + (w.intensity === 'high' ? 3 : w.intensity === 'medium' ? 2 : 1),
        0
      ) / (weekWorkouts.length || 1);

    // Mock TSS (Training Stress Score) calculation
    // Real formula: TSS = (duration_sec * NP * IF) / (FTP * 3600) * 100
    // Mock: Just use duration * intensity multiplier
    const tss = weekWorkouts.reduce((sum, w) => {
      const multiplier = w.intensity === 'high' ? 1.5 : w.intensity === 'medium' ? 1.0 : 0.5;
      return sum + w.duration * multiplier;
    }, 0);

    // Determine load level
    const loadLevel =
      tss < 300 ? 'low' : tss < 600 ? 'moderate' : tss < 900 ? 'high' : 'overload';

    return {
      totalVolume,
      totalDays: weekWorkouts.length > 0 ? 5 : 0, // Mock: assume 5 days
      avgIntensity,
      tss: Math.round(tss),
      loadLevel,
    };
  }, [weekWorkouts]);

  // Generate AI suggestions (mock)
  const suggestions = useMemo(() => {
    const sug: string[] = [];

    if (loadMetrics.loadLevel === 'overload') {
      sug.push('⚠️ Carga semanal excessiva - risco de overtraining');
      sug.push('Reduzir 20% do volume no sábado para recuperação');
    } else if (loadMetrics.loadLevel === 'high') {
      sug.push('✅ Carga alta adequada para atleta de nível ' + athleteProfile.level);
      sug.push('Manter recuperação ativa no domingo');
    } else if (loadMetrics.loadLevel === 'moderate') {
      sug.push('✅ Carga balanceada para progressão');
      sug.push('Considerar adicionar 1 treino de intensidade média');
    } else {
      sug.push('⚠️ Carga baixa - abaixo do ideal para progressão');
      sug.push('Adicionar treino intervalado ou longão no fim de semana');
    }

    return sug;
  }, [loadMetrics, athleteProfile]);

  if (!isOpen) return null;

  const handleApplySuggestions = () => {
    console.log('Applying load suggestions (mock)');
    // Mock adjustments
    const mockAdjustments: LoadAdjustment[] = [
      {
        dayOfWeek: 6,
        workoutId: 'mock-id',
        adjustment: 'reduce',
        percentage: 20,
        reason: 'Reduzir sobrecarga semanal',
      },
    ];
    onApplySuggestions?.(mockAdjustments);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 bg-gradient-to-r from-ceramic-info/10 to-ceramic-success/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="ceramic-card p-3">
                <Zap className="w-6 h-6 text-ceramic-info" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-ceramic-text-primary">
                  Calculadora de Cargas
                </h2>
                <p className="text-sm text-ceramic-text-secondary mt-0.5">
                  Análise de volume e intensidade semanal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ceramic-inset p-2 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5 text-stone-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Load Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Volume Total"
              value={`${loadMetrics.totalVolume} min`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-ceramic-info"
            />
            <StatCard
              label="TSS Estimado"
              value={loadMetrics.tss}
              icon={<Zap className="w-5 h-5" />}
              color="text-amber-600"
            />
            <StatCard
              label="Dias de Treino"
              value={loadMetrics.totalDays}
              icon={<CheckCircle className="w-5 h-5" />}
              color="text-ceramic-success"
            />
          </div>

          {/* Load Level Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-stone-700">Nível de Carga</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  loadMetrics.loadLevel === 'overload'
                    ? 'bg-rose-100 text-rose-700'
                    : loadMetrics.loadLevel === 'high'
                    ? 'bg-amber-100 text-amber-700'
                    : loadMetrics.loadLevel === 'moderate'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {loadMetrics.loadLevel === 'overload'
                  ? 'Sobrecarga'
                  : loadMetrics.loadLevel === 'high'
                  ? 'Alta'
                  : loadMetrics.loadLevel === 'moderate'
                  ? 'Moderada'
                  : 'Baixa'}
              </span>
            </div>

            {/* Visual Load Bar */}
            <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${
                  loadMetrics.loadLevel === 'overload'
                    ? 'bg-gradient-to-r from-rose-400 to-rose-600'
                    : loadMetrics.loadLevel === 'high'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                    : loadMetrics.loadLevel === 'moderate'
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-blue-400 to-blue-600'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    loadMetrics.loadLevel === 'overload'
                      ? 100
                      : loadMetrics.loadLevel === 'high'
                      ? 75
                      : loadMetrics.loadLevel === 'moderate'
                      ? 50
                      : 25
                  )}%`,
                }}
              />
            </div>

            <div className="flex justify-between mt-1 text-[10px] text-stone-500">
              <span>Baixa</span>
              <span>Moderada</span>
              <span>Alta</span>
              <span>Sobrecarga</span>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="ceramic-inset p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-ceramic-text-primary uppercase tracking-wider">
                Sugestões de Ajuste
              </h3>
            </div>
            <ul className="space-y-2">
              {suggestions.map((sug, idx) => (
                <li key={idx} className="text-sm text-stone-700 flex items-start gap-2">
                  <span className="text-lg leading-none">{sug.startsWith('✅') ? '✅' : '⚠️'}</span>
                  <span>{sug.replace(/^(✅|⚠️)\s/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
            >
              Fechar
            </button>
            <button
              onClick={handleApplySuggestions}
              className="flex-1 py-3 bg-ceramic-info hover:bg-ceramic-info/90 text-white rounded-lg text-sm font-bold transition-colors"
            >
              Aplicar Sugestões
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// Helper Components
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <div className="ceramic-card p-4 space-y-2">
    <div className={`ceramic-inset p-2 w-fit ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-ceramic-text-primary">{value}</p>
    </div>
  </div>
);
