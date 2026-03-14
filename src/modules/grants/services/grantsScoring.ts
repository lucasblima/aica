/**
 * Grants Domain Score Provider — Life Score Integration
 *
 * Registers a domain score provider for the Grants module so the
 * scoring engine can include professional growth / grant pipeline
 * health in the composite Life Score.
 *
 * Scoring formula:
 * - Pipeline Health (0.6): active projects / 3 (target), capped at 1.0
 * - Activity (0.4): projects updated in last 30 days / total
 *
 * Trend: compare recent updates vs older.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { registerDomainProvider } from '@/services/scoring/scoringEngine';
import type { DomainScore, ScoreTrend } from '@/services/scoring/types';

const log = createNamespacedLogger('grantsScoring');

/**
 * Compute the Grants domain score for the current user.
 * Aggregates pipeline health and recent activity from grant_projects.
 */
export async function computeGrantsDomainScore(): Promise<DomainScore | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch all grant projects for the user
    const { data: projects, error } = await supabase
      .from('grant_projects')
      .select('id, status, updated_at')
      .eq('user_id', user.id);

    if (error || !projects || projects.length === 0) {
      log.debug('No grant projects found — Grants domain score skipped');
      return null;
    }

    // 1. Pipeline Health (weight 0.6): active projects / 3 (target), capped at 1.0
    const activeProjects = projects.filter(p => p.status === 'active');
    const pipelineHealth = Math.min(1, activeProjects.length / 3);

    // 2. Activity (weight 0.4): projects updated in last 30 days / total
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyUpdated = projects.filter(
      p => new Date(p.updated_at as string) >= thirtyDaysAgo
    );
    const activity = projects.length > 0
      ? recentlyUpdated.length / projects.length
      : 0;

    // Compute normalized score (0-1) with weights
    const normalized = pipelineHealth * 0.6 + activity * 0.4;

    // Trend: compare recent updates vs older
    let trend: ScoreTrend = 'stable';
    if (recentlyUpdated.length > projects.length - recentlyUpdated.length) {
      trend = 'improving';
    } else if (recentlyUpdated.length < projects.length - recentlyUpdated.length) {
      trend = 'declining';
    }

    // Confidence based on data availability (more projects = higher confidence)
    const confidence = Math.min(1, 0.3 + 0.7 * (projects.length / 3));

    return {
      module: 'grants',
      normalized,
      raw: Math.round(normalized * 100),
      label: 'Captação',
      confidence,
      trend,
    };
  } catch (err) {
    log.error('Grants domain score computation failed:', err);
    return null;
  }
}

/**
 * Register the Grants domain provider with the scoring engine.
 * Call this once during app initialization.
 */
export function registerGrantsDomainProvider(): void {
  registerDomainProvider('grants', computeGrantsDomainScore);
}
