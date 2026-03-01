/**
 * SavingsGoalProjection Component
 * Sprint 5 — Behavioral Economics Engine
 *
 * Shows projected vs actual savings with present bias correction.
 * Highlights the gap between naive expectations and corrected projections.
 * Ceramic Design System: bg-ceramic-50, shadow-ceramic-emboss, rounded-xl, amber accent.
 */

import React, { useMemo } from 'react';
import { Target, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { useLossFraming } from '../hooks/useLossFraming';

interface SavingsGoalProjectionProps {
  /** What the user expects to save monthly */
  monthlyContribution: number;
  /** Total goal amount */
  targetAmount: number;
  /** Current saved amount */
  currentAmount: number;
  /** Goal title */
  goalTitle: string;
  /** Goal deadline (ISO string) */
  deadline?: string | null;
}

export const SavingsGoalProjection: React.FC<SavingsGoalProjectionProps> = ({
  monthlyContribution,
  targetAmount,
  currentAmount,
  goalTitle,
  deadline,
}) => {
  const { projectSavings, frameProgress } = useLossFraming();

  const projection = useMemo(
    () => projectSavings(monthlyContribution, targetAmount - currentAmount),
    [monthlyContribution, targetAmount, currentAmount, projectSavings]
  );

  const progressFrame = useMemo(
    () => frameProgress(currentAmount, targetAmount),
    [currentAmount, targetAmount, frameProgress]
  );

  const progressPct = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonths = (months: number): string => {
    if (!isFinite(months)) return '--';
    if (months <= 1) return '1 mes';
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    const remaining = months % 12;
    if (remaining === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    return `${years}a ${remaining}m`;
  };

  const deadlineWarning = useMemo(() => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const monthsLeft = Math.max(0,
      (deadlineDate.getFullYear() - now.getFullYear()) * 12 +
      (deadlineDate.getMonth() - now.getMonth())
    );
    if (projection.correctedMonthsToGoal > monthsLeft && monthsLeft > 0) {
      return `Prazo em ${monthsLeft} meses, mas projecao corrigida indica ${projection.correctedMonthsToGoal} meses`;
    }
    return null;
  }, [deadline, projection.correctedMonthsToGoal]);

  return (
    <div className="bg-ceramic-50 rounded-xl p-5 shadow-ceramic-emboss">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-amber-100 p-1.5 rounded-lg">
          <Target className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
            {goalTitle}
          </h3>
          <p className="text-[10px] text-ceramic-text-secondary">
            Projecao com correcao comportamental
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-ceramic-text-secondary">
            {formatCurrency(currentAmount)}
          </span>
          <span className="font-bold text-ceramic-text-primary">
            {formatCurrency(targetAmount)}
          </span>
        </div>
        <div className="h-3 bg-ceramic-cool rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-ceramic-text-secondary mt-1 text-right">
          {progressPct.toFixed(0)}% concluido
        </p>
      </div>

      {/* Projection Comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Naive (what user thinks) */}
        <div className="bg-white/60 rounded-lg p-3 text-center">
          <p className="text-[10px] text-ceramic-text-secondary uppercase tracking-wide mb-1">
            Sua estimativa
          </p>
          <p className="text-lg font-bold text-ceramic-text-primary">
            {formatMonths(projection.monthsToGoal)}
          </p>
          <p className="text-[10px] text-ceramic-text-secondary">
            {formatCurrency(monthlyContribution)}/mes
          </p>
        </div>

        {/* Corrected (realistic) */}
        <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
          <p className="text-[10px] text-amber-700 uppercase tracking-wide mb-1">
            Projecao realista
          </p>
          <p className="text-lg font-bold text-amber-700">
            {formatMonths(projection.correctedMonthsToGoal)}
          </p>
          <p className="text-[10px] text-amber-600">
            Correcao: {((1 - projection.correctionFactor * projection.presentBiasDiscount) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Deadline Warning */}
      {deadlineWarning && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-700">{deadlineWarning}</p>
        </div>
      )}

      {/* Loss Frame Message */}
      {progressFrame.frameType === 'loss' && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-700">{progressFrame.message}</p>
        </div>
      )}

      {progressFrame.frameType === 'gain' && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-green-700">{progressFrame.message}</p>
        </div>
      )}

      {/* Methodology footnote */}
      <p className="text-[9px] text-ceramic-text-secondary/60 text-center mt-2">
        Correcoes baseadas em Present Bias (Laibson, 1997) e Planning Fallacy (Kahneman & Tversky, 1979)
      </p>
    </div>
  );
};

export default SavingsGoalProjection;
