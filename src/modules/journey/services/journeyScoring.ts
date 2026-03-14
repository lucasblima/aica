/**
 * Journey Domain Score Provider — Life Score Integration
 *
 * Registers a domain score provider for the Journey module so the
 * scoring engine can include consciousness/reflection health in the
 * composite Life Score.
 *
 * Scoring formula:
 * - Consistency (0.4): days with moments / 30
 * - Emotional Range (0.3): Shannon entropy of emotion distribution, normalized
 * - Reflection Depth (0.3): avg content word count, normalized (100 words = 1.0, capped)
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { registerDomainProvider } from '@/services/scoring/scoringEngine';
import type { DomainScore, ScoreTrend } from '@/services/scoring/types';

const log = createNamespacedLogger('journeyScoring');

/**
 * Compute the Journey domain score for the current user.
 * Aggregates consistency, emotional range (Shannon entropy),
 * and reflection depth from moments in the last 30 days.
 */
export async function computeJourneyDomainScore(): Promise<DomainScore | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch moments from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: moments, error } = await supabase
      .from('moments')
      .select('id, content, emotion, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error || !moments || moments.length === 0) {
      log.debug('No moments found — Journey domain score skipped');
      return null;
    }

    // 1. Consistency (weight 0.4): unique days with moments / 30
    const uniqueDays = new Set(
      moments.map(m => new Date(m.created_at as string).toISOString().split('T')[0])
    );
    const consistency = Math.min(1, uniqueDays.size / 30);

    // 2. Emotional Range (weight 0.3): Shannon entropy of emotion distribution
    const emotionCounts = new Map<string, number>();
    for (const m of moments) {
      const emotion = (m.emotion as string) || 'unknown';
      emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
    }

    let emotionalRange = 0;
    const uniqueEmotions = emotionCounts.size;
    if (uniqueEmotions > 1) {
      // Shannon entropy
      let entropy = 0;
      for (const count of emotionCounts.values()) {
        const p = count / moments.length;
        if (p > 0) {
          entropy -= p * Math.log(p);
        }
      }
      // Normalize: max entropy = log(uniqueEmotions)
      const maxEntropy = Math.log(uniqueEmotions);
      emotionalRange = maxEntropy > 0 ? entropy / maxEntropy : 0;
    }
    // If only 1 unique emotion, emotionalRange stays 0

    // 3. Reflection Depth (weight 0.3): avg word count, normalized (100 words = 1.0, capped)
    const wordCounts = moments.map(m => {
      const content = (m.content as string) || '';
      return content.trim().split(/\s+/).filter(w => w.length > 0).length;
    });
    const avgWordCount = wordCounts.length > 0
      ? wordCounts.reduce((sum, c) => sum + c, 0) / wordCounts.length
      : 0;
    const reflectionDepth = Math.min(1, avgWordCount / 100);

    // Compute normalized score (0-1) with weights
    const normalized =
      consistency * 0.4 +
      emotionalRange * 0.3 +
      reflectionDepth * 0.3;

    // Trend: compare recent 15 days vs older 15 days moment count
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const recentMoments = moments.filter(
      m => new Date(m.created_at as string) >= fifteenDaysAgo
    );
    const olderMoments = moments.filter(
      m => new Date(m.created_at as string) < fifteenDaysAgo
    );

    let trend: ScoreTrend = 'stable';
    if (recentMoments.length > olderMoments.length * 1.3) {
      trend = 'improving';
    } else if (recentMoments.length < olderMoments.length * 0.7) {
      trend = 'declining';
    }

    // Confidence based on data availability (more moments = higher confidence)
    const confidence = Math.min(1, 0.3 + 0.7 * (moments.length / 30));

    return {
      module: 'journey',
      normalized,
      raw: Math.round(normalized * 100),
      label: 'Consciência',
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
  registerDomainProvider('journey', computeJourneyDomainScore);
}
