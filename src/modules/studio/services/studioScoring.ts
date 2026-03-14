/**
 * Studio Domain Score Provider — Life Score Integration
 *
 * Registers a domain score provider for the Studio module so the
 * scoring engine can include creative output health in the
 * composite Life Score.
 *
 * Scoring formula:
 * - Production Rate (0.5): published episodes / 3 (target = 1/month over 90 days), capped at 1.0
 * - Consistency (0.5): if >1 episode, regularity = 1 - (stddev of days between publications / 30), capped [0,1]
 *
 * Trend: compare first 45 days vs last 45 days publication count.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { registerDomainProvider } from '@/services/scoring/scoringEngine';
import type { DomainScore, ScoreTrend } from '@/services/scoring/types';

const log = createNamespacedLogger('studioScoring');

/**
 * Compute the Studio domain score for the current user.
 * Aggregates production rate and publication consistency
 * from published podcast episodes in the last 90 days.
 */
export async function computeStudioDomainScore(): Promise<DomainScore | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch published episodes from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: episodes, error } = await supabase
      .from('podcast_episodes')
      .select('id, status, created_at')
      .eq('user_id', user.id)
      .eq('status', 'published')
      .gte('created_at', ninetyDaysAgo.toISOString());

    if (error || !episodes || episodes.length === 0) {
      log.debug('No published episodes found — Studio domain score skipped');
      return null;
    }

    // 1. Production Rate (weight 0.5): published count / 3 (target = 1/month for 90 days)
    const productionRate = Math.min(1, episodes.length / 3);

    // 2. Consistency (weight 0.5): regularity of publication intervals
    let consistency = 0;
    if (episodes.length > 1) {
      // Sort episodes by created_at ascending
      const sortedDates = episodes
        .map(e => new Date(e.created_at as string).getTime())
        .sort((a, b) => a - b);

      // Compute days between consecutive publications
      const intervals: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        intervals.push((sortedDates[i] - sortedDates[i - 1]) / 86400000);
      }

      // Standard deviation of intervals
      const mean = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
      const variance = intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intervals.length;
      const stddev = Math.sqrt(variance);

      // regularity = 1 - (stddev / 30), capped between 0 and 1
      consistency = Math.max(0, Math.min(1, 1 - stddev / 30));
    }
    // If only 1 episode, consistency stays 0

    // Compute normalized score (0-1) with weights
    const normalized = productionRate * 0.5 + consistency * 0.5;

    // Trend: compare first 45 days vs last 45 days publication count
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const recentEpisodes = episodes.filter(
      e => new Date(e.created_at as string) >= fortyFiveDaysAgo
    );
    const olderEpisodes = episodes.filter(
      e => new Date(e.created_at as string) < fortyFiveDaysAgo
    );

    let trend: ScoreTrend = 'stable';
    if (recentEpisodes.length > olderEpisodes.length) {
      trend = 'improving';
    } else if (recentEpisodes.length < olderEpisodes.length) {
      trend = 'declining';
    }

    // Confidence based on data availability (more episodes = higher confidence)
    const confidence = Math.min(1, 0.3 + 0.7 * (episodes.length / 3));

    return {
      module: 'studio',
      normalized,
      raw: Math.round(normalized * 100),
      label: 'Criatividade',
      confidence,
      trend,
    };
  } catch (err) {
    log.error('Studio domain score computation failed:', err);
    return null;
  }
}

/**
 * Register the Studio domain provider with the scoring engine.
 * Call this once during app initialization.
 */
export function registerStudioDomainProvider(): void {
  registerDomainProvider('studio', computeStudioDomainScore);
}
