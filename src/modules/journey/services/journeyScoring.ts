/**
 * Journey Domain Score Provider — Life Score Integration
 *
 * Registers a domain score provider for the Journey module so the
 * scoring engine can include consciousness/well-being health in the
 * composite Life Score.
 *
 * Formula: 0.4 * CPEarnedRatio + 0.4 * StreakConsistency + 0.2 * EmotionStability
 *
 * Uses: consciousness_points_log, user_consciousness_stats, moments tables.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { registerDomainProvider } from '@/services/scoring/scoringEngine';
import type { DomainScore, ScoreTrend } from '@/services/scoring/types';

const log = createNamespacedLogger('journeyScoring');

/**
 * Compute the Journey domain score for the current user.
 * Aggregates CP earning activity, journaling streak consistency,
 * and emotion variety over the last 30 days.
 */
async function computeJourneyDomainScoreProvider(): Promise<DomainScore | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // ---------------------------------------------------------------
    // 1. CP Earned Ratio (0-1)
    // ---------------------------------------------------------------
    const { data: cpLogs, error: cpError } = await supabase
      .from('consciousness_points_log')
      .select('points_awarded')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgoISO);

    let cpEarnedRatio = 0;
    let hasCPData = false;

    if (!cpError && cpLogs && cpLogs.length > 0) {
      hasCPData = true;
      const totalCP = cpLogs.reduce(
        (sum, entry) => sum + ((entry.points_awarded as number) ?? 0),
        0
      );
      cpEarnedRatio = Math.min(1, totalCP / 100);
    }

    // ---------------------------------------------------------------
    // 2. Streak Consistency (0-1)
    // ---------------------------------------------------------------
    const { data: stats, error: statsError } = await supabase
      .from('user_consciousness_stats')
      .select('current_streak, longest_streak')
      .eq('user_id', user.id)
      .single();

    let streakConsistency = 0;
    let hasStreakData = false;
    let currentStreak = 0;

    if (!statsError && stats) {
      hasStreakData = true;
      currentStreak = (stats.current_streak as number) ?? 0;
      const longestStreak = Math.max((stats.longest_streak as number) ?? 0, 7);
      streakConsistency = Math.min(1, currentStreak / longestStreak);
    }

    // ---------------------------------------------------------------
    // 3. Emotion Stability (0-1) — variety = healthy
    // ---------------------------------------------------------------
    const { data: moments, error: momentsError } = await supabase
      .from('moments')
      .select('emotion')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgoISO)
      .not('emotion', 'is', null);

    let emotionStability = 0.5; // neutral default
    let hasEmotionData = false;

    if (!momentsError && moments && moments.length > 0) {
      hasEmotionData = true;
      const uniqueEmotions = new Set(moments.map(m => m.emotion as string));
      emotionStability = Math.min(1, uniqueEmotions.size / 5);
    }

    // ---------------------------------------------------------------
    // Return null if no data at all
    // ---------------------------------------------------------------
    if (!hasCPData && !hasStreakData && !hasEmotionData) {
      log.debug('No Journey data found — domain score skipped');
      return null;
    }

    // ---------------------------------------------------------------
    // Compute normalized score (0-1)
    // ---------------------------------------------------------------
    const normalized =
      0.4 * cpEarnedRatio +
      0.4 * streakConsistency +
      0.2 * emotionStability;

    // ---------------------------------------------------------------
    // Confidence based on data availability
    // ---------------------------------------------------------------
    const confidence =
      0.3 +
      0.3 * (hasCPData ? 1 : 0) +
      0.2 * (hasStreakData ? 1 : 0) +
      0.2 * (hasEmotionData ? 1 : 0);

    // ---------------------------------------------------------------
    // Trend heuristic
    // ---------------------------------------------------------------
    let trend: ScoreTrend = 'stable';
    if (currentStreak > 3 && cpEarnedRatio > 0.5) {
      trend = 'improving';
    } else if (currentStreak === 0 || cpEarnedRatio < 0.2) {
      trend = 'declining';
    }

    return {
      module: 'journey',
      normalized,
      raw: Math.round(normalized * 100),
      label: 'Bem-estar',
      confidence,
      trend,
    };
  } catch (err) {
    log.error('Journey domain score computation failed:', err);
    return null;
  }
}

/**
 * Register the Journey domain provider with the scoring engine.
 * Call this once during app initialization.
 */
export function registerJourneyDomainProvider(): void {
  registerDomainProvider('journey', computeJourneyDomainScoreProvider);
}
