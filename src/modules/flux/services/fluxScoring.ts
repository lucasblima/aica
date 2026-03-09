/**
 * Flux Domain Score Provider — Life Score Integration
 *
 * Registers a domain score provider for the Flux module so the
 * scoring engine can include physical training health in the
 * composite Life Score.
 *
 * Uses: readiness_score from athletes table + fatigue modeling metrics.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { registerDomainProvider } from '@/services/scoring/scoringEngine';
import { computeFluxDomainScore, getStressHistory, computeACWR } from './fatigueModeling';
import type { DomainScore, ScoreTrend } from '@/services/scoring/types';

const log = createNamespacedLogger('fluxScoring');

/**
 * Compute the Flux domain score for the current user.
 * Aggregates readiness, training consistency, and load management
 * across all athletes the user coaches.
 */
async function computeFluxDomainScoreProvider(): Promise<DomainScore | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch athletes with readiness data
    const { data: athletes, error } = await supabase
      .from('athletes')
      .select('id, readiness_score, fatigue_risk')
      .eq('user_id', user.id);

    if (error || !athletes || athletes.length === 0) {
      log.debug('No athletes found — Flux domain score skipped');
      return null;
    }

    // 1. Average readiness across athletes (0-100)
    const readinessScores = athletes
      .map(a => a.readiness_score as number | null)
      .filter((s): s is number => s != null);

    const avgReadiness = readinessScores.length > 0
      ? readinessScores.reduce((sum, s) => sum + s, 0) / readinessScores.length
      : 50; // default neutral if no readiness data yet

    // 2. Training consistency: ratio of athletes with stress history in last 7 days
    // Fetch all histories in parallel to avoid N+1 sequential queries
    const histories = await Promise.all(
      athletes.map(a => getStressHistory(a.id, 7))
    );

    let athletesWithRecentTraining = 0;
    const acwrValues: number[] = [];
    const historicalReadinessValues: number[] = [];

    for (const history of histories) {
      if (history.length > 0) {
        athletesWithRecentTraining++;
        // Use last entry's CTL/ATL for ACWR
        const last = history[history.length - 1];
        if (last.ctl > 0 || last.atl > 0) {
          acwrValues.push(computeACWR(last.atl, last.ctl));
        }
        // Collect TSB values for historical readiness trend comparison
        const avgTsb = history.reduce((sum, h) => sum + h.tsb, 0) / history.length;
        historicalReadinessValues.push(avgTsb);
      }
    }

    const trainingConsistency = athletes.length > 0
      ? athletesWithRecentTraining / athletes.length
      : 0;

    // 3. Load management: ratio of athletes with ACWR in sweet spot (0.8-1.3)
    const athletesInSweetSpot = acwrValues.filter(r => r >= 0.8 && r <= 1.3).length;
    const loadManagement = acwrValues.length > 0
      ? athletesInSweetSpot / acwrValues.length
      : 0; // no data = no load management score

    // Compute normalized score (0-1)
    const normalized = computeFluxDomainScore(avgReadiness, trainingConsistency, loadManagement);

    // Determine trend by comparing current average readiness against historical TSB averages
    let trend: ScoreTrend = 'stable';
    if (historicalReadinessValues.length > 0) {
      const historicalAvg = historicalReadinessValues.reduce((sum, v) => sum + v, 0) / historicalReadinessValues.length;
      const delta = avgReadiness - (50 + historicalAvg); // TSB centered around 0, readiness around 50
      if (delta > 5) {
        trend = 'improving';
      } else if (delta < -5) {
        trend = 'declining';
      }
    }

    // Confidence based on data availability
    const confidence = Math.min(1, 0.3 + 0.4 * (readinessScores.length / athletes.length)
      + 0.3 * (acwrValues.length > 0 ? 1 : 0));

    return {
      module: 'flux',
      normalized,
      raw: Math.round(normalized * 100),
      label: 'Treinamento',
      confidence,
      trend,
    };
  } catch (err) {
    log.error('Flux domain score computation failed:', err);
    return null;
  }
}

/**
 * Register the Flux domain provider with the scoring engine.
 * Call this once during app initialization.
 */
export function registerFluxDomainProvider(): void {
  registerDomainProvider('flux', computeFluxDomainScoreProvider);
}
