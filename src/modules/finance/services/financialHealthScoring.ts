/**
 * Financial Health Scoring Service
 * Sprint 5 — Behavioral Economics Engine
 *
 * Implements 5 scientifically-grounded formulas:
 * 1. Prospect Theory Value Function (Kahneman & Tversky, 1979)
 * 2. FinHealth Score (Financial Health Network, 2020)
 * 3. Present Bias / Beta-Delta Discounting (Laibson, 1997)
 * 4. Planning Fallacy correction for savings projections
 * 5. Brazilian financial ratios (DTI, emergency fund, savings rate)
 *
 * Plus Loss Aversion Messaging utilities (lambda = 2.25).
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { logAttribution } from '@/services/scoring/scoringEngine';
import type { ScoreTrend } from '@/services/scoring/types';

const log = createNamespacedLogger('FinancialHealthScoring');

// ============================================================================
// TYPES
// ============================================================================

export type FinHealthTier = 'vulnerable' | 'coping' | 'healthy';

export interface FinHealthScore {
  spend: number;
  save: number;
  borrow: number;
  plan: number;
  composite: number;
  tier: FinHealthTier;
}

export interface FinancialHealthResult {
  finHealth: FinHealthScore;
  debtToIncomeRatio: number;
  emergencyFundMonths: number;
  savingsRate: number;
  brazilianRatios: BrazilianRatioAssessment;
  componentDetails: Record<string, unknown>;
  computedAt: string;
}

export interface BrazilianRatioAssessment {
  dtiStatus: 'ok' | 'warning' | 'critical';
  emergencyStatus: 'ok' | 'warning' | 'critical';
  savingsStatus: 'ok' | 'warning' | 'critical';
}

export interface SavingsProjection {
  naiveProjection: number;
  correctedProjection: number;
  correctionFactor: number;
  presentBiasDiscount: number;
  monthsToGoal: number;
  correctedMonthsToGoal: number;
}

export interface LossFrameMessage {
  message: string;
  lossEquivalent: number;
  frameType: 'loss' | 'gain';
}

// ============================================================================
// 1. PROSPECT THEORY VALUE FUNCTION (Kahneman & Tversky, 1979)
// ============================================================================

/** Loss aversion coefficient (lambda) */
const LOSS_AVERSION_LAMBDA = 2.25;

/** Diminishing sensitivity exponent (alpha) */
const SENSITIVITY_ALPHA = 0.88;

/**
 * Prospect Theory value function.
 * v(x) = x^0.88 for gains (x >= 0)
 * v(x) = -2.25 * (-x)^0.88 for losses (x < 0)
 */
export function prospectTheoryValue(x: number): number {
  if (x >= 0) {
    return Math.pow(x, SENSITIVITY_ALPHA);
  }
  return -LOSS_AVERSION_LAMBDA * Math.pow(-x, SENSITIVITY_ALPHA);
}

// ============================================================================
// 2. FINHEALTH SCORE (Financial Health Network, 2020)
// ============================================================================

/**
 * Score the Spend component (0-100).
 * Measures expense-to-income ratio and bill payment reliability.
 */
export function scoreSpend(
  monthlyIncome: number,
  monthlyExpenses: number,
  billsOnTimeRate: number
): number {
  if (monthlyIncome <= 0) return 0;

  // Expense ratio: lower is better (target: <80% of income)
  const expenseRatio = monthlyExpenses / monthlyIncome;
  const ratioScore = expenseRatio <= 0.6
    ? 100
    : expenseRatio <= 0.8
      ? 100 - ((expenseRatio - 0.6) / 0.2) * 40
      : expenseRatio <= 1.0
        ? 60 - ((expenseRatio - 0.8) / 0.2) * 40
        : Math.max(0, 20 - (expenseRatio - 1.0) * 20);

  // Bill payment: 100% on time = 100 points
  const billScore = Math.min(100, billsOnTimeRate * 100);

  // Weighted: 60% expense ratio, 40% bills on time
  return Math.round(ratioScore * 0.6 + billScore * 0.4);
}

/**
 * Score the Save component (0-100).
 * Measures emergency fund adequacy and savings rate.
 */
export function scoreSave(
  emergencyFundMonths: number,
  savingsRate: number
): number {
  // Emergency fund: 6+ months = full marks, 0 = 0
  const emergencyScore = Math.min(100, (emergencyFundMonths / 6) * 100);

  // Savings rate: 20%+ = full marks
  const savingsScore = Math.min(100, (savingsRate / 0.20) * 100);

  // Weighted: 50/50
  return Math.round(emergencyScore * 0.5 + savingsScore * 0.5);
}

/**
 * Score the Borrow component (0-100).
 * Measures debt-to-income ratio and credit utilization.
 */
export function scoreBorrow(
  debtToIncomeRatio: number,
  creditUtilization: number
): number {
  // DTI: <36% = good, higher = worse
  const dtiScore = debtToIncomeRatio <= 0.2
    ? 100
    : debtToIncomeRatio <= 0.36
      ? 100 - ((debtToIncomeRatio - 0.2) / 0.16) * 30
      : debtToIncomeRatio <= 0.5
        ? 70 - ((debtToIncomeRatio - 0.36) / 0.14) * 40
        : Math.max(0, 30 - (debtToIncomeRatio - 0.5) * 60);

  // Credit utilization: <30% = good
  const creditScore = creditUtilization <= 0.1
    ? 100
    : creditUtilization <= 0.3
      ? 100 - ((creditUtilization - 0.1) / 0.2) * 30
      : creditUtilization <= 0.5
        ? 70 - ((creditUtilization - 0.3) / 0.2) * 40
        : Math.max(0, 30 - (creditUtilization - 0.5) * 60);

  // Weighted: 60% DTI, 40% credit utilization
  return Math.round(dtiScore * 0.6 + creditScore * 0.4);
}

/**
 * Score the Plan component (0-100).
 * Measures insurance coverage, retirement saving, and emergency preparedness.
 */
export function scorePlan(
  hasInsurance: boolean,
  retirementSaving: boolean,
  hasEmergencyFund: boolean
): number {
  let score = 0;
  if (hasInsurance) score += 35;
  if (retirementSaving) score += 35;
  if (hasEmergencyFund) score += 30;
  return score;
}

/**
 * Compute composite FinHealth Score from 4 components.
 */
export function computeFinHealthScore(
  spend: number,
  save: number,
  borrow: number,
  plan: number
): FinHealthScore {
  const composite = Math.round((spend + save + borrow + plan) / 4);

  let tier: FinHealthTier;
  if (composite >= 80) {
    tier = 'healthy';
  } else if (composite >= 40) {
    tier = 'coping';
  } else {
    tier = 'vulnerable';
  }

  return { spend, save, borrow, plan, composite, tier };
}

// ============================================================================
// 3. PRESENT BIAS / BETA-DELTA DISCOUNTING (Laibson, 1997)
// ============================================================================

/**
 * Compute present-biased discounted utility.
 * U0 = u(x0) + beta * sum(delta^t * u(xt))
 *
 * @param immediatePayoff - Value of immediate reward
 * @param futurePayoffs - Array of future period payoffs
 * @param beta - Present bias (0.7-0.9; lower = more biased)
 * @param delta - Time discount factor (~0.99)
 */
export function presentBiasUtility(
  immediatePayoff: number,
  futurePayoffs: number[],
  beta: number = 0.8,
  delta: number = 0.99
): number {
  const futureSum = futurePayoffs.reduce((sum, payoff, t) => {
    return sum + Math.pow(delta, t + 1) * payoff;
  }, 0);

  return immediatePayoff + beta * futureSum;
}

/**
 * Compute how much a future reward needs to increase to overcome present bias.
 * Returns the multiplier needed for the future reward to be chosen over the immediate one.
 */
export function presentBiasMultiplier(
  beta: number = 0.8,
  delta: number = 0.99,
  periods: number = 12
): number {
  const discountFactor = beta * Math.pow(delta, periods);
  return discountFactor > 0 ? 1 / discountFactor : Infinity;
}

// ============================================================================
// 4. PLANNING FALLACY CORRECTION
// ============================================================================

/**
 * Correct a naive savings projection for planning fallacy.
 * People systematically overestimate how much they will save.
 *
 * @param naiveMonthlyContribution - What the user thinks they'll save per month
 * @param targetAmount - Goal amount
 * @param correctionFactor - Planning fallacy correction (0.6-0.8)
 * @param beta - Present bias parameter for further discounting
 */
export function correctSavingsProjection(
  naiveMonthlyContribution: number,
  targetAmount: number,
  correctionFactor: number = 0.7,
  beta: number = 0.8
): SavingsProjection {
  const correctedMonthly = naiveMonthlyContribution * correctionFactor;
  const presentBiasDiscount = beta;
  const effectiveMonthly = correctedMonthly * presentBiasDiscount;

  const naiveMonths = naiveMonthlyContribution > 0
    ? Math.ceil(targetAmount / naiveMonthlyContribution)
    : Infinity;

  const correctedMonths = effectiveMonthly > 0
    ? Math.ceil(targetAmount / effectiveMonthly)
    : Infinity;

  return {
    naiveProjection: naiveMonthlyContribution * naiveMonths,
    correctedProjection: effectiveMonthly * correctedMonths,
    correctionFactor,
    presentBiasDiscount,
    monthsToGoal: naiveMonths,
    correctedMonthsToGoal: correctedMonths,
  };
}

// ============================================================================
// 5. BRAZILIAN FINANCIAL RATIOS
// ============================================================================

/**
 * Assess financial ratios against Brazilian benchmarks.
 * - DTI (Endividamento): <36% OK, 36-50% warning, >50% critical
 * - Emergency Fund: >=3 months OK, 1-3 warning, <1 critical
 * - Savings Rate: >10% OK, 5-10% warning, <5% critical
 */
export function assessBrazilianRatios(
  debtToIncomeRatio: number,
  emergencyFundMonths: number,
  savingsRate: number
): BrazilianRatioAssessment {
  const dtiStatus: BrazilianRatioAssessment['dtiStatus'] =
    debtToIncomeRatio <= 0.36 ? 'ok' :
    debtToIncomeRatio <= 0.50 ? 'warning' : 'critical';

  const emergencyStatus: BrazilianRatioAssessment['emergencyStatus'] =
    emergencyFundMonths >= 3 ? 'ok' :
    emergencyFundMonths >= 1 ? 'warning' : 'critical';

  const savingsStatus: BrazilianRatioAssessment['savingsStatus'] =
    savingsRate >= 0.10 ? 'ok' :
    savingsRate >= 0.05 ? 'warning' : 'critical';

  return { dtiStatus, emergencyStatus, savingsStatus };
}

// ============================================================================
// LOSS AVERSION MESSAGING (lambda = 2.25)
// ============================================================================

/**
 * Frame a savings message using loss aversion.
 * "Nao economizar R$X equivale a perder R$2.25X em bem-estar"
 */
export function frameSavingsMessage(amount: number): LossFrameMessage {
  const lossEquivalent = amount * LOSS_AVERSION_LAMBDA;
  return {
    message: `Nao economizar R$${amount.toFixed(0)} por mes equivale a uma perda percebida de R$${lossEquivalent.toFixed(0)}`,
    lossEquivalent,
    frameType: 'loss',
  };
}

/**
 * Frame goal progress — show as loss if behind, gain if ahead.
 */
export function frameGoalProgress(
  current: number,
  target: number
): LossFrameMessage {
  const gap = current - target;
  if (gap >= 0) {
    return {
      message: `Voce esta R$${gap.toFixed(0)} acima da meta!`,
      lossEquivalent: 0,
      frameType: 'gain',
    };
  }
  const lossEquivalent = Math.abs(gap) * LOSS_AVERSION_LAMBDA;
  return {
    message: `Voce esta R$${Math.abs(gap).toFixed(0)} abaixo da meta — isso equivale a uma perda percebida de R$${lossEquivalent.toFixed(0)}`,
    lossEquivalent,
    frameType: 'loss',
  };
}

// ============================================================================
// TIER LABELS (Portuguese)
// ============================================================================

export const TIER_LABELS: Record<FinHealthTier, string> = {
  healthy: 'Saudavel',
  coping: 'Atencao',
  vulnerable: 'Vulneravel',
};

export const TIER_COLORS: Record<FinHealthTier, string> = {
  healthy: 'text-ceramic-success',
  coping: 'text-ceramic-warning',
  vulnerable: 'text-ceramic-error',
};

export const TIER_BG_COLORS: Record<FinHealthTier, string> = {
  healthy: 'bg-green-50',
  coping: 'bg-amber-50',
  vulnerable: 'bg-red-50',
};

// ============================================================================
// COMPONENT LABELS (Portuguese)
// ============================================================================

export const COMPONENT_LABELS: Record<string, string> = {
  spend: 'Gastar',
  save: 'Poupar',
  borrow: 'Dever',
  plan: 'Planejar',
};

// ============================================================================
// DOMAIN SCORE FOR LIFE SCORE COMPOSITION
// ============================================================================

/**
 * Compute Finance domain score for Life Score composition.
 * Weighted combination of financial health, savings progress, and behavioral engagement.
 *
 * @param finHealthComposite - FinHealth composite score (0-100)
 * @param savingsGoalProgress - Progress toward savings goal (0-1)
 * @param behavioralScore - Engagement with loss-framing features (0-1)
 * @returns Normalized domain score (0-1)
 */
export function computeFinanceDomainScore(
  finHealthComposite: number,
  savingsGoalProgress: number,
  behavioralScore: number
): number {
  return 0.50 * Math.max(0, Math.min(finHealthComposite / 100, 1))
    + 0.30 * Math.max(0, Math.min(savingsGoalProgress, 1))
    + 0.20 * Math.max(0, Math.min(behavioralScore, 1));
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Store a FinancialHealthResult in the database.
 */
export async function storeFinancialHealth(
  result: FinancialHealthResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('financial_health_scores')
      .insert({
        spend_score: result.finHealth.spend,
        save_score: result.finHealth.save,
        borrow_score: result.finHealth.borrow,
        plan_score: result.finHealth.plan,
        composite_score: result.finHealth.composite,
        tier: result.finHealth.tier,
        debt_to_income_ratio: result.debtToIncomeRatio,
        emergency_fund_months: result.emergencyFundMonths,
        savings_rate: result.savingsRate,
        component_details: result.componentDetails,
        computed_at: result.computedAt,
      });

    if (error) {
      log.error('Failed to store financial health score:', error.message);
      return;
    }

    // Log attribution (non-blocking)
    logAttribution({
      modelId: 'finhealth_score',
      previousScore: null,
      newScore: result.finHealth.composite,
      triggerAction: 'compute_financial_health',
      metadata: {
        tier: result.finHealth.tier,
        spend: result.finHealth.spend,
        save: result.finHealth.save,
        borrow: result.finHealth.borrow,
        plan: result.finHealth.plan,
      },
    }).catch(() => {
      // Non-critical
    });
  } catch (err) {
    log.error('storeFinancialHealth failed:', err);
  }
}

/**
 * Fetch the most recent financial health score for the current user.
 */
export async function getLatestFinancialHealth(): Promise<FinancialHealthResult | null> {
  try {
    const { data, error } = await supabase
      .from('financial_health_scores')
      .select('*')
      .order('computed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      finHealth: {
        spend: data.spend_score,
        save: data.save_score,
        borrow: data.borrow_score,
        plan: data.plan_score,
        composite: data.composite_score,
        tier: data.tier as FinHealthTier,
      },
      debtToIncomeRatio: data.debt_to_income_ratio,
      emergencyFundMonths: data.emergency_fund_months,
      savingsRate: data.savings_rate,
      brazilianRatios: assessBrazilianRatios(
        data.debt_to_income_ratio,
        data.emergency_fund_months,
        data.savings_rate
      ),
      componentDetails: data.component_details ?? {},
      computedAt: data.computed_at,
    };
  } catch (err) {
    log.error('getLatestFinancialHealth failed:', err);
    return null;
  }
}

/**
 * Fetch financial health history for trend analysis.
 */
export async function getFinancialHealthHistory(
  limit: number = 10
): Promise<{ composite: number; computedAt: string }[]> {
  try {
    const { data, error } = await supabase
      .from('financial_health_scores')
      .select('composite_score, computed_at')
      .order('computed_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(row => ({
      composite: row.composite_score,
      computedAt: row.computed_at,
    }));
  } catch (err) {
    log.error('getFinancialHealthHistory failed:', err);
    return [];
  }
}
