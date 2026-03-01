/**
 * useLossFraming Hook
 * Sprint 5 — Behavioral Economics Engine
 *
 * Provides behavioral framing utilities for UI messages.
 * Uses Prospect Theory (lambda=2.25) to frame financial information
 * in ways that leverage loss aversion for motivation.
 */

import { useMemo } from 'react';
import {
  frameSavingsMessage,
  frameGoalProgress,
  prospectTheoryValue,
  correctSavingsProjection,
  presentBiasMultiplier,
} from '../services/financialHealthScoring';
import type { LossFrameMessage, SavingsProjection } from '../services/financialHealthScoring';

interface UseLossFramingReturn {
  /** Frame a monthly savings amount as a loss */
  frameSavings: (amount: number) => LossFrameMessage;
  /** Frame goal progress (loss if behind, gain if ahead) */
  frameProgress: (current: number, target: number) => LossFrameMessage;
  /** Compute prospect theory subjective value */
  subjectiveValue: (amount: number) => number;
  /** Correct a savings projection for planning fallacy + present bias */
  projectSavings: (monthlyAmount: number, target: number) => SavingsProjection;
  /** Get the multiplier needed to overcome present bias for N periods */
  biasMultiplier: (periods: number) => number;
  /** Get a motivational message based on spending behavior */
  getSpendingNudge: (todaySpend: number, dailyBudget: number) => string;
}

export function useLossFraming(): UseLossFramingReturn {
  const frameSavings = useMemo(() => frameSavingsMessage, []);
  const frameProgress = useMemo(() => frameGoalProgress, []);
  const subjectiveValue = useMemo(() => prospectTheoryValue, []);

  const projectSavings = useMemo(() => {
    return (monthlyAmount: number, target: number): SavingsProjection => {
      return correctSavingsProjection(monthlyAmount, target);
    };
  }, []);

  const biasMultiplier = useMemo(() => {
    return (periods: number): number => {
      return presentBiasMultiplier(0.8, 0.99, periods);
    };
  }, []);

  const getSpendingNudge = useMemo(() => {
    return (todaySpend: number, dailyBudget: number): string => {
      const remaining = dailyBudget - todaySpend;
      if (remaining >= dailyBudget * 0.5) {
        return `Voce ainda tem R$${remaining.toFixed(0)} disponiveis hoje. Continue assim!`;
      }
      if (remaining > 0) {
        const lossValue = remaining * 2.25;
        return `Restam R$${remaining.toFixed(0)} do orcamento de hoje. Gastar agora equivale a perder R$${lossValue.toFixed(0)} em bem-estar.`;
      }
      const overspend = Math.abs(remaining);
      const lossValue = overspend * 2.25;
      return `Voce ultrapassou o orcamento em R$${overspend.toFixed(0)}. Isso equivale a uma perda percebida de R$${lossValue.toFixed(0)}.`;
    };
  }, []);

  return {
    frameSavings,
    frameProgress,
    subjectiveValue,
    projectSavings,
    biasMultiplier,
    getSpendingNudge,
  };
}

export default useLossFraming;
