/**
 * Fatigue Modeling Service
 * Sprint 6 — Flux Training Science
 *
 * Implements:
 * - CTL (Chronic Training Load): 42-day exponential moving average of TSS
 * - ATL (Acute Training Load): 7-day exponential moving average of TSS
 * - TSB (Training Stress Balance): CTL - ATL
 * - Readiness Score: Composite from TSB + RPE trend + rest quality
 * - Fatigue Risk Classification: Halson 2014
 *
 * Complements (does NOT duplicate) intensityCalculatorService.ts
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';

const log = createNamespacedLogger('fatigueModeling');

// ============================================================================
// TYPES
// ============================================================================

export interface DailyStressEntry {
  date: string;          // YYYY-MM-DD
  tss: number;           // Training Stress Score
  rpe?: number;          // 1-10
  durationMinutes?: number;
}

export interface TrainingLoadMetrics {
  ctl: number;           // Chronic Training Load (42-day EMA)
  atl: number;           // Acute Training Load (7-day EMA)
  tsb: number;           // Training Stress Balance
  ctlTrend: 'building' | 'maintaining' | 'declining';
  atlTrend: 'increasing' | 'stable' | 'decreasing';
}

export type FatigueRisk = 'low' | 'moderate' | 'high' | 'overtraining';

export interface ReadinessAssessment {
  readinessScore: number;       // 0-100
  fatigueRisk: FatigueRisk;
  trainingLoad: TrainingLoadMetrics;
  recommendation: string;
  suggestedIntensity: 'rest' | 'recovery' | 'easy' | 'moderate' | 'hard' | 'race_pace';
  acuteChronicRatio: number;    // ATL/CTL — danger zone > 1.5
}

export interface StressHistoryRow {
  athleteId: string;
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  rpe: number | null;
  durationMinutes: number | null;
}

// ============================================================================
// EMA CONSTANTS
// ============================================================================

const CTL_DAYS = 42;  // Chronic window
const ATL_DAYS = 7;   // Acute window
const CTL_DECAY = 2 / (CTL_DAYS + 1);  // EMA smoothing factor
const ATL_DECAY = 2 / (ATL_DAYS + 1);  // EMA smoothing factor

// ============================================================================
// CORE CALCULATIONS
// ============================================================================

/**
 * Compute exponential moving average for a series of daily TSS values
 * EMA_today = TSS_today * decay + EMA_yesterday * (1 - decay)
 */
export function computeEMA(tssHistory: number[], decay: number): number[] {
  if (tssHistory.length === 0) return [];
  const ema: number[] = [tssHistory[0]];
  for (let i = 1; i < tssHistory.length; i++) {
    ema.push(tssHistory[i] * decay + ema[i - 1] * (1 - decay));
  }
  return ema;
}

/**
 * Compute CTL (42-day EMA of TSS)
 */
export function computeCTL(tssHistory: number[]): number[] {
  return computeEMA(tssHistory, CTL_DECAY);
}

/**
 * Compute ATL (7-day EMA of TSS)
 */
export function computeATL(tssHistory: number[]): number[] {
  return computeEMA(tssHistory, ATL_DECAY);
}

/**
 * Compute TSB = CTL - ATL for each day
 */
export function computeTSB(ctlHistory: number[], atlHistory: number[]): number[] {
  return ctlHistory.map((ctl, i) => ctl - atlHistory[i]);
}

/**
 * Compute full training load metrics from TSS history
 */
export function computeTrainingLoad(tssHistory: number[]): TrainingLoadMetrics {
  const ctlArr = computeCTL(tssHistory);
  const atlArr = computeATL(tssHistory);
  const tsbArr = computeTSB(ctlArr, atlArr);

  const ctl = ctlArr[ctlArr.length - 1] || 0;
  const atl = atlArr[atlArr.length - 1] || 0;
  const tsb = tsbArr[tsbArr.length - 1] || 0;

  // CTL trend (compare last 7 days to previous 7 days)
  const ctlRecent = ctlArr.slice(-7);
  const ctlPrevious = ctlArr.slice(-14, -7);
  const ctlRecentAvg = ctlRecent.reduce((s, v) => s + v, 0) / (ctlRecent.length || 1);
  const ctlPreviousAvg = ctlPrevious.reduce((s, v) => s + v, 0) / (ctlPrevious.length || 1);
  const ctlTrend: TrainingLoadMetrics['ctlTrend'] =
    ctlRecentAvg > ctlPreviousAvg * 1.05 ? 'building' :
    ctlRecentAvg < ctlPreviousAvg * 0.95 ? 'declining' : 'maintaining';

  // ATL trend (compare last 3 days to previous 3 days)
  const atlRecent = atlArr.slice(-3);
  const atlPrevious = atlArr.slice(-6, -3);
  const atlRecentAvg = atlRecent.reduce((s, v) => s + v, 0) / (atlRecent.length || 1);
  const atlPreviousAvg = atlPrevious.reduce((s, v) => s + v, 0) / (atlPrevious.length || 1);
  const atlTrend: TrainingLoadMetrics['atlTrend'] =
    atlRecentAvg > atlPreviousAvg * 1.1 ? 'increasing' :
    atlRecentAvg < atlPreviousAvg * 0.9 ? 'decreasing' : 'stable';

  return { ctl, atl, tsb, ctlTrend, atlTrend };
}

// ============================================================================
// FATIGUE RISK & READINESS
// ============================================================================

/**
 * Classify fatigue risk based on TSB
 * Halson 2014 inspired thresholds
 */
export function classifyFatigueRisk(tsb: number): FatigueRisk {
  if (tsb < -30) return 'overtraining';
  if (tsb < -10) return 'high';
  if (tsb < 5) return 'moderate';
  return 'low';
}

/**
 * Compute Acute:Chronic Workload Ratio
 * Gabbett 2016 — "sweet spot" is 0.8-1.3
 * > 1.5 is danger zone for injury
 */
export function computeACWR(atl: number, ctl: number): number {
  if (ctl <= 0) return atl > 0 ? 2.0 : 0;
  return atl / ctl;
}

/**
 * Compute readiness score (0-100) and generate recommendation
 */
export function assessReadiness(
  tssHistory: number[],
  recentRPEs: number[],
): ReadinessAssessment {
  const trainingLoad = computeTrainingLoad(tssHistory);
  const { ctl, atl, tsb } = trainingLoad;
  const fatigueRisk = classifyFatigueRisk(tsb);
  const acwr = computeACWR(atl, ctl);

  // Readiness score components
  const tsbComponent = Math.max(0, Math.min(100, (tsb + 30) * (100 / 60))); // -30=0, +30=100
  const acwrComponent = acwr >= 0.8 && acwr <= 1.3 ? 100 :
    acwr < 0.8 ? 60 : // Under-training
    acwr <= 1.5 ? 50 : // Slightly high
    20; // Danger zone

  // RPE component — lower recent RPE = more ready
  const avgRPE = recentRPEs.length > 0
    ? recentRPEs.reduce((s, v) => s + v, 0) / recentRPEs.length
    : 5;
  const rpeComponent = Math.max(0, (10 - avgRPE) * 10); // RPE 1=90, RPE 5=50, RPE 10=0

  const readinessScore = Math.round(
    0.40 * tsbComponent +
    0.30 * acwrComponent +
    0.30 * rpeComponent
  );

  // Suggested intensity
  const suggestedIntensity: ReadinessAssessment['suggestedIntensity'] =
    readinessScore >= 80 ? 'hard' :
    readinessScore >= 65 ? 'moderate' :
    readinessScore >= 45 ? 'easy' :
    readinessScore >= 25 ? 'recovery' : 'rest';

  // Recommendation in PT-BR
  const recommendation =
    fatigueRisk === 'overtraining'
      ? 'ALERTA: Risco de overtraining detectado. Reduza volume imediatamente. Considere 2-3 dias de descanso completo.'
      : fatigueRisk === 'high'
      ? 'Fadiga elevada. Priorize sessoes de recuperacao ativa ou descanso. Evite treinos intensos.'
      : fatigueRisk === 'moderate'
      ? 'Carga moderada. Treino normal pode continuar, mas monitore sinais de fadiga.'
      : acwr > 1.5
      ? 'Carga aguda muito alta em relacao ao cronico. Reduza volume para evitar lesoes.'
      : readinessScore >= 80
      ? 'Atleta descansado e pronto para treino intenso ou competicao.'
      : 'Condicoes normais para treino. Siga o plano programado.';

  return {
    readinessScore,
    fatigueRisk,
    trainingLoad,
    recommendation,
    suggestedIntensity,
    acuteChronicRatio: Math.round(acwr * 100) / 100,
  };
}

/**
 * Session RPE method (Foster 2001)
 * Alternative TSS when power/pace data unavailable
 * sRPE = RPE * duration_minutes
 */
export function computeSessionRPE(rpe: number, durationMinutes: number): number {
  return rpe * durationMinutes;
}

/**
 * Compute Flux domain score for Life Score integration
 * Combines athlete readiness + training consistency + load management
 */
export function computeFluxDomainScore(
  avgReadiness: number,
  trainingConsistency: number,  // 0-1 (sessions completed / planned)
  loadManagement: number,       // 0-1 (ACWR in sweet spot)
): number {
  return 0.35 * (avgReadiness / 100) + 0.35 * trainingConsistency + 0.30 * loadManagement;
}

// ============================================================================
// SUPABASE PERSISTENCE
// ============================================================================

export async function storeStressEntry(
  athleteId: string,
  entry: DailyStressEntry,
  metrics: TrainingLoadMetrics
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('training_stress_history')
      .upsert({
        athlete_id: athleteId,
        user_id: user.id,
        date: entry.date,
        tss: entry.tss,
        ctl: metrics.ctl,
        atl: metrics.atl,
        tsb: metrics.tsb,
        rpe: entry.rpe || null,
        session_duration_minutes: entry.durationMinutes || null,
      }, { onConflict: 'athlete_id,date' });

    if (error) throw error;
  } catch (err) {
    log.error('Error storing stress entry:', err);
    throw err;
  }
}

export async function updateAthleteReadiness(
  athleteId: string,
  readiness: ReadinessAssessment
): Promise<void> {
  try {
    const { error } = await supabase
      .from('athletes')
      .update({
        readiness_score: readiness.readinessScore,
        fatigue_risk: readiness.fatigueRisk,
      })
      .eq('id', athleteId);

    if (error) throw error;
  } catch (err) {
    log.error('Error updating athlete readiness:', err);
    throw err;
  }
}

export async function getStressHistory(athleteId: string, days = 60): Promise<StressHistoryRow[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data, error } = await supabase
      .from('training_stress_history')
      .select('athlete_id, date, tss, ctl, atl, tsb, rpe, session_duration_minutes')
      .eq('athlete_id', athleteId)
      .eq('user_id', user.id)
      .gte('date', cutoff.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) return [];

    return (data || []).map(d => ({
      athleteId: d.athlete_id,
      date: d.date,
      tss: d.tss,
      ctl: d.ctl,
      atl: d.atl,
      tsb: d.tsb,
      rpe: d.rpe,
      durationMinutes: d.session_duration_minutes,
    }));
  } catch (err) {
    log.error('Error fetching stress history:', err);
    return [];
  }
}
