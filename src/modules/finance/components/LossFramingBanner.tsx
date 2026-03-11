/**
 * LossFramingBanner Component
 * Sprint 5 — Behavioral Economics Engine
 *
 * Motivational banner using Prospect Theory loss aversion framing.
 * Shows loss-framed messages to increase financial motivation.
 * Ceramic Design System: rounded-xl, amber accent.
 */

import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { useLossFraming } from '../hooks/useLossFraming';

interface LossFramingBannerProps {
  /** Current spending today */
  todaySpend?: number;
  /** Daily budget */
  dailyBudget?: number;
  /** Monthly savings amount for loss framing */
  monthlySavings?: number;
  /** Goal current vs target for progress framing */
  goalCurrent?: number;
  goalTarget?: number;
  /** Which frame to show */
  mode?: 'spending' | 'savings' | 'goal';
}

export const LossFramingBanner: React.FC<LossFramingBannerProps> = ({
  todaySpend,
  dailyBudget,
  monthlySavings,
  goalCurrent,
  goalTarget,
  mode = 'spending',
}) => {
  const { frameSavings, frameProgress, getSpendingNudge } = useLossFraming();

  const content = useMemo(() => {
    switch (mode) {
      case 'spending': {
        if (todaySpend == null || dailyBudget == null) return null;
        const message = getSpendingNudge(todaySpend, dailyBudget);
        const isOver = todaySpend > dailyBudget;
        return {
          message,
          icon: isOver ? <AlertTriangle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />,
          variant: isOver ? 'warning' : 'neutral',
        };
      }
      case 'savings': {
        if (monthlySavings == null) return null;
        const frame = frameSavings(monthlySavings);
        return {
          message: frame.message,
          icon: <Zap className="w-4 h-4" />,
          variant: 'info' as const,
        };
      }
      case 'goal': {
        if (goalCurrent == null || goalTarget == null) return null;
        const frame = frameProgress(goalCurrent, goalTarget);
        return {
          message: frame.message,
          icon: frame.frameType === 'loss'
            ? <AlertTriangle className="w-4 h-4" />
            : <TrendingUp className="w-4 h-4" />,
          variant: frame.frameType === 'loss' ? 'warning' : 'success',
        };
      }
      default:
        return null;
    }
  }, [mode, todaySpend, dailyBudget, monthlySavings, goalCurrent, goalTarget, frameSavings, frameProgress, getSpendingNudge]);

  if (!content) return null;

  const variantStyles: Record<string, string> = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-ceramic-success/10 border-ceramic-success/20 text-ceramic-success',
    info: 'bg-ceramic-info/10 border-ceramic-info/20 text-ceramic-info',
    neutral: 'bg-ceramic-50 border-ceramic-border text-ceramic-text-primary',
  };

  const iconColors: Record<string, string> = {
    warning: 'text-amber-500',
    success: 'text-ceramic-success',
    info: 'text-ceramic-info',
    neutral: 'text-ceramic-text-secondary',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${variantStyles[content.variant]}`}>
      <div className={`mt-0.5 shrink-0 ${iconColors[content.variant]}`}>
        {content.icon}
      </div>
      <div>
        <p className="text-xs font-medium leading-relaxed">
          {content.message}
        </p>
        <p className="text-[10px] opacity-60 mt-1">
          Baseado na Teoria do Prospecto (Kahneman & Tversky, 1979)
        </p>
      </div>
    </div>
  );
};

export default LossFramingBanner;
