/**
 * Scoring Engine — Unified Compute Orchestrator
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Central service that orchestrates score computation across all AICA modules.
 * Each module provides a `computeDomainScore()` function that returns a DomainScore.
 * The engine aggregates these into the composite Life Score.
 *
 * Architecture:
 * - Module scoring functions are registered, not imported directly
 * - Each module score is normalized to 0-1 for Life Score composition
 * - Score attribution is logged for every change
 * - Heavy computation delegates to Edge Functions
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  AicaDomain,
  DomainScore,
  LifeScore,
  ScientificScore,
  ScoreAttribution,
} from './types';
import { DOMAIN_LABELS } from './lifeScoreService';
import {
  computeLifeScore,
  getUserDomainWeights,
  storeLifeScore,
  getLifeScoreHistory,
} from './lifeScoreService';

const log = createNamespacedLogger('ScoringEngine');

// ============================================================================
// DOMAIN SCORE PROVIDERS
// ============================================================================

/**
 * A domain score provider computes the normalized score for a single AICA module.
 * Returns null if the module doesn't have enough data to compute a score.
 */
export type DomainScoreProvider = () => Promise<DomainScore | null>;

/** Registry of domain score providers (populated by modules at init time) */
const domainProviders = new Map<AicaDomain, DomainScoreProvider>();

/**
 * Register a domain score provider.
 * Called by each module during initialization.
 *
 * @example
 * // In src/modules/atlas/services/atlasScoring.ts:
 * registerDomainProvider('atlas', computeAtlasDomainScore);
 */
export function registerDomainProvider(
  domain: AicaDomain,
  provider: DomainScoreProvider
): void {
  domainProviders.set(domain, provider);
  log.info(`Domain provider registered: ${domain}`);
}

/**
 * Unregister a domain score provider.
 */
export function unregisterDomainProvider(domain: AicaDomain): void {
  domainProviders.delete(domain);
}

// ============================================================================
// SCORE COMPUTATION
// ============================================================================

/**
 * Compute all available domain scores.
 * Skips modules that don't have enough data, aren't registered, or aren't active.
 */
export async function computeAllDomainScores(activeDomains?: AicaDomain[]): Promise<DomainScore[]> {
  const results: DomainScore[] = [];

  for (const [domain, provider] of domainProviders) {
    // Skip domains not in the active set
    if (activeDomains && !activeDomains.includes(domain)) {
      log.debug(`Domain ${domain}: not active, skipping`);
      continue;
    }

    try {
      const score = await provider();
      if (score) {
        results.push(score);
      } else {
        log.debug(`Domain ${domain}: insufficient data, skipping`);
      }
    } catch (err) {
      log.error(`Domain ${domain} scoring failed:`, err);
      // Continue with other domains — don't let one failure break everything
    }
  }

  return results;
}

/**
 * Compute and store the full Life Score.
 * This is the main entry point for Life Score computation.
 *
 * 1. Fetches domain weights
 * 2. Computes each domain score via registered providers
 * 3. Computes composite Life Score (weighted geometric mean)
 * 4. Detects negative spirals
 * 5. Stores result in database
 * 6. Returns the computed Life Score
 */
export async function computeAndStoreLifeScore(): Promise<LifeScore | null> {
  try {
    log.info('Computing Life Score...');

    // 1. Get user's domain weights + active domains
    const { weights, activeDomains } = await getUserDomainWeights();

    // 2. Compute domain scores (only active domains)
    const domainScores = await computeAllDomainScores(activeDomains);

    if (domainScores.length === 0) {
      log.warn('No domain scores available — Life Score cannot be computed');
      return null;
    }

    // 3. Get recent history for trend computation
    const history = await getLifeScoreHistory(10);

    // 4. Compute Life Score
    const lifeScore = computeLifeScore(domainScores, weights, history, activeDomains);

    // 5. Store in database
    await storeLifeScore(lifeScore);

    log.info('Life Score computed:', {
      composite: lifeScore.composite.toFixed(3),
      domains: domainScores.length,
      activeDomains: activeDomains.length,
      trend: lifeScore.trend,
      spiral: lifeScore.spiralAlert,
    });

    return lifeScore;
  } catch (err) {
    log.error('Life Score computation failed:', err);
    return null;
  }
}

// ============================================================================
// SCORE ATTRIBUTION
// ============================================================================

/**
 * Log a score change to the attribution log.
 * Called by module scoring services when a score changes.
 */
export async function logAttribution(attribution: {
  modelId: string;
  previousScore: number | null;
  newScore: number;
  triggerAction: string;
  triggerReferenceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const delta =
      attribution.previousScore != null
        ? attribution.newScore - attribution.previousScore
        : null;

    const { error } = await supabase.from('score_attribution_log').insert({
      user_id: user.id,
      model_id: attribution.modelId,
      previous_score: attribution.previousScore,
      new_score: attribution.newScore,
      delta,
      trigger_action: attribution.triggerAction,
      trigger_reference_id: attribution.triggerReferenceId ?? null,
      metadata: attribution.metadata ?? {},
    });

    if (error) {
      log.warn('Failed to log attribution:', error.message);
    }
  } catch (err) {
    // Attribution logging is non-critical — don't throw
    log.warn('Attribution logging failed:', err);
  }
}

/**
 * Get recent score attributions for a specific model.
 */
export async function getAttributions(
  modelId?: string,
  limit = 20
): Promise<ScoreAttribution[]> {
  try {
    const { data, error } = await supabase.rpc('get_score_attributions', {
      p_model_id: modelId ?? null,
      p_limit: limit,
    });

    if (error) {
      log.error('Failed to fetch attributions:', error.message);
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      modelId: row.model_id as string,
      previousScore: row.previous_score as number | null,
      newScore: row.new_score as number,
      delta: row.delta as number | null,
      triggerAction: row.trigger_action as string,
      triggerReferenceId: row.trigger_reference_id as string | null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      computedAt: row.computed_at as string,
    }));
  } catch (err) {
    log.error('getAttributions failed:', err);
    return [];
  }
}

// ============================================================================
// MODEL REGISTRY
// ============================================================================

/**
 * Get all active scientific models from the registry.
 */
export async function getActiveModels(): Promise<
  { id: string; name: string; module: string; category: string; isContested: boolean }[]
> {
  try {
    const { data, error } = await supabase
      .from('scientific_model_registry')
      .select('id, name, module, category, is_contested')
      .eq('is_active', true)
      .order('module');

    if (error) {
      log.error('Failed to fetch model registry:', error.message);
      return [];
    }

    return (data ?? []).map(row => ({
      id: row.id,
      name: row.name,
      module: row.module,
      category: row.category,
      isContested: row.is_contested,
    }));
  } catch (err) {
    log.error('getActiveModels failed:', err);
    return [];
  }
}

/**
 * Get a placeholder domain score for modules that haven't registered a provider yet.
 * Returns a score based on simple activity metrics.
 */
export function getPlaceholderDomainScore(
  domain: AicaDomain,
  activityLevel: number = 0.5
): DomainScore {
  return {
    module: domain,
    normalized: Math.max(0.01, Math.min(1, activityLevel)),
    raw: activityLevel * 100,
    label: DOMAIN_LABELS[domain] ?? domain,
    confidence: 0.3, // Low confidence — placeholder
    trend: 'stable',
  };
}
