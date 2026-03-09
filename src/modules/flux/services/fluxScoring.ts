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
import { computeFluxDomainScore, assessReadiness, getStressHistory, computeACWR } from './fatigueModeling';
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
    let athletesWithRecentTraining = 0;
    const acwrValues: number[] = [];

    for (const athlete of athletes) {
      const history = await getStressHistory(athlete.id, 7);
      if (history.length > 0) {
        athletesWithRecentTraining++;
        // Use last entry's CTL/ATL for ACWR
        const last = history[history.length - 1];
        if (last.ctl > 0 || last.atl > 0) {
          acwrValues.push(computeACWR(last.atl, last.ctl));
        }
      }
    }

    const trainingConsistency = athletes.length > 0
      ? athletesWithRecentTraining / athletes.length
      : 0;

    // 3. Load management: ratio of athletes with ACWR in sweet spot (0.8-1.3)
    const athletesInSweetSpot = acwrValues.filter(r => r >= 0.8 && r <= 1.3).length;
    const loadManagement = acwrValues.length > 0
      ? athletesInSweetSpot / acwrValues.length
      : 0.5; // neutral default

    // Compute normalized score (0-1)
    const normalized = computeFluxDomainScore(avgReadiness, trainingConsistency, loadManagement);

    // Determine trend from readiness scores
    const trend: ScoreTrend = avgReadiness >= 65 ? 'improving'
      : avgReadiness >= 40 ? 'stable'
      : 'declining';

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
