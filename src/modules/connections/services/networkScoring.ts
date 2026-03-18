/**
 * Network Science Scoring Service
 * Sprint 4: Connections — Scientific relationship scoring
 *
 * 7 formulas from network science literature:
 * 1. Dunbar Layers (1992): 5/15/50/150/500 concentric circles
 * 2. Tie Strength (Granovetter 1973): weighted composite
 * 3. Relationship Decay (Roberts & Dunbar 2011): exponential decay
 * 4. Gottman Ratio (1994): positive/negative >= 5:1
 * 5. Network Constraint (Burt 1992): structural holes
 * 6. Effective Size (Borgatti 1997): redundancy-adjusted
 * 7. Diversity Index (inverse HHI): category balance
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('networkScoring');

// ============================================================================
// INLINE TYPES (from scoring/types — avoids cross-sprint dependency)
// ============================================================================

export type ScoreTrend = 'improving' | 'stable' | 'declining';
export type SufficiencyLevel = 'thriving' | 'sufficient' | 'growing' | 'attention_needed';

export interface ScientificScore {
  dimension: string;
  value: number;
  rawValue: number;
  methodology: string;
  confidence: number;
  computedAt: string;
  trend: ScoreTrend;
  explainer: string;
  sufficiency: SufficiencyLevel;
  isContested: boolean;
  contestedNote?: string;
}

function getSufficiencyLevel(score: number): SufficiencyLevel {
  if (score >= 0.80) return 'thriving';
  if (score >= 0.66) return 'sufficient';
  if (score >= 0.40) return 'growing';
  return 'attention_needed';
}

// ============================================================================
// TYPES
// ============================================================================

export interface ContactScoreInput {
  contactId: string;
  relationshipType: string;
  interactionCount: number;
  lastInteractionAt: string | null;
  healthScore: number;
  sentimentTrend: string;
  emotionalCloseness?: number;
  intimacy?: number;
  reciprocity?: number;
  positiveInteractions?: number;
  negativeInteractions?: number;
}

export interface RelationshipScoreResult {
  contactId: string;
  dunbarLayer: DunbarLayer;
  tieStrength: number;
  decayedCloseness: number;
  gottmanRatio: number | null;
  gottmanHealthy: boolean;
  compositeScore: number;
  scores: ScientificScore[];
}

export interface NetworkMetricsResult {
  effectiveSize: number;
  networkConstraint: number;
  diversityIndex: number;
  layerDistribution: Record<DunbarLayer, number>;
  totalContacts: number;
}

export type DunbarLayer = 5 | 15 | 50 | 150 | 500;

export interface DunbarLayerData {
  layer: DunbarLayer;
  label: string;
  description: string;
  contacts: { id: string; name: string; score: number }[];
  capacity: number;
  fill: number;
}

// ============================================================================
// DECAY RATE CONSTANTS (Roberts & Dunbar 2011)
// ============================================================================

const DECAY_RATES: Record<string, number> = {
  family: 0.002,
  friends: 0.007,
  professional: 0.005,
  acquaintances: 0.010,
  contact: 0.008,
  unknown: 0.010,
};

// ============================================================================
// 1. DUNBAR LAYERS (1992, 2024)
// ============================================================================

/**
 * Classify a contact into a Dunbar layer based on interaction frequency
 * and emotional closeness.
 *
 * Layers:
 *   5  = intimate/support group (daily contact, high closeness)
 *  15  = sympathy group (weekly contact)
 *  50  = close group (monthly contact)
 * 150  = active network (quarterly contact)
 * 500  = acquaintance pool (rare contact)
 */
export function classifyDunbarLayer(
  interactionFrequencyPerMonth: number,
  closeness: number // 0-1
): DunbarLayer {
  const composite = 0.5 * Math.min(interactionFrequencyPerMonth / 30, 1) + 0.5 * closeness;

  if (composite >= 0.80) return 5;
  if (composite >= 0.60) return 15;
  if (composite >= 0.35) return 50;
  if (composite >= 0.15) return 150;
  return 500;
}

export function getDunbarLayerLabel(layer: DunbarLayer): string {
  switch (layer) {
    case 5: return 'Circulo Intimo';
    case 15: return 'Grupo de Simpatia';
    case 50: return 'Grupo Próximo';
    case 150: return 'Rede Ativa';
    case 500: return 'Conhecidos';
  }
}

export function getDunbarLayerDescription(layer: DunbarLayer): string {
  switch (layer) {
    case 5: return 'Pessoas com quem você fala quase diariamente e pode confiar em momentos criticos.';
    case 15: return 'Amigos proximos com quem você mantem contato regular semanal.';
    case 50: return 'Contatos com quem você se encontra pelo menos mensalmente.';
    case 150: return 'Sua rede social ativa — você reconhece e se lembra de cada pessoa.';
    case 500: return 'Conhecidos que você reconhece mas com quem mantem pouco contato.';
  }
}

// ============================================================================
// 2. TIE STRENGTH (Granovetter 1973)
// ============================================================================

/**
 * Compute tie strength as a weighted combination of 4 dimensions.
 *
 * Formula: 0.25*freq + 0.30*emotion + 0.25*intimacy + 0.20*reciprocity
 * All inputs are 0-1 normalized. Output is 0-1.
 */
export function computeTieStrength(
  frequency: number,
  emotionalCloseness: number,
  intimacy: number,
  reciprocity: number
): number {
  return (
    0.25 * clamp01(frequency) +
    0.30 * clamp01(emotionalCloseness) +
    0.25 * clamp01(intimacy) +
    0.20 * clamp01(reciprocity)
  );
}

// ============================================================================
// 3. RELATIONSHIP DECAY (Roberts & Dunbar 2011)
// ============================================================================

/**
 * Compute decayed closeness over time.
 *
 * Formula: closeness(t) = prev_closeness * e^(-lambda * days) + boost
 * Lambda values vary by relationship type.
 */
export function computeDecayedCloseness(
  previousCloseness: number,
  daysSinceLastInteraction: number,
  relationshipType: string,
  interactionBoost: number = 0
): number {
  const lambda = DECAY_RATES[relationshipType] ?? DECAY_RATES.unknown;
  const decayed = previousCloseness * Math.exp(-lambda * daysSinceLastInteraction);
  return clamp01(decayed + interactionBoost);
}

/**
 * Get the decay rate lambda for a relationship type.
 */
export function getDecayRate(relationshipType: string): number {
  return DECAY_RATES[relationshipType] ?? DECAY_RATES.unknown;
}

// ============================================================================
// 4. GOTTMAN RATIO (1992)
// ============================================================================

/**
 * Compute the Gottman positive-to-negative interaction ratio.
 *
 * A ratio >= 5.0 indicates a healthy relationship.
 * Returns null if there are no negative interactions (infinite ratio).
 */
export function computeGottmanRatio(
  positiveCount: number,
  negativeCount: number
): { ratio: number | null; healthy: boolean } {
  if (negativeCount === 0 && positiveCount === 0) {
    return { ratio: null, healthy: true };
  }
  if (negativeCount === 0) {
    return { ratio: null, healthy: true }; // All positive
  }

  const ratio = positiveCount / negativeCount;
  return {
    ratio: Math.round(ratio * 100) / 100,
    healthy: ratio >= 5.0,
  };
}

// ============================================================================
// 5. NETWORK CONSTRAINT (Burt 1992)
// ============================================================================

/**
 * Compute network constraint for a contact.
 *
 * Formula: c_ij = (p_ij + sum_q(p_iq * p_qj))^2
 * where p_ij = proportion of network time invested in contact j.
 *
 * Higher constraint = fewer structural holes = less social capital.
 * Uses a simplified version based on contact proportions.
 */
export function computeNetworkConstraint(
  contactInteractions: number,
  totalInteractions: number,
  mutualContactFactor: number = 0 // 0-1: overlap of mutual connections
): number {
  if (totalInteractions === 0) return 0;

  const p_ij = contactInteractions / totalInteractions;
  const indirect = p_ij * mutualContactFactor;
  const constraint = (p_ij + indirect) ** 2;

  return Math.min(constraint, 1);
}

/**
 * Compute aggregate network constraint across all contacts.
 */
export function computeAggregateConstraint(
  contacts: { interactions: number; mutualFactor: number }[],
  totalInteractions: number
): number {
  if (contacts.length === 0 || totalInteractions === 0) return 0;

  return contacts.reduce((sum, c) => {
    return sum + computeNetworkConstraint(c.interactions, totalInteractions, c.mutualFactor);
  }, 0);
}

// ============================================================================
// 6. EFFECTIVE NETWORK SIZE (Borgatti 1997)
// ============================================================================

/**
 * Compute effective network size.
 *
 * Formula: n - (2t / n)
 * where n = number of contacts, t = number of ties among contacts.
 *
 * Higher effective size = less redundancy in the network.
 */
export function computeEffectiveSize(
  contactCount: number,
  tiesBetweenContacts: number
): number {
  if (contactCount === 0) return 0;
  return Math.max(0, contactCount - (2 * tiesBetweenContacts) / contactCount);
}

// ============================================================================
// 7. DIVERSITY INDEX (Inverse HHI)
// ============================================================================

/**
 * Compute network diversity using inverse Herfindahl-Hirschman Index.
 *
 * Formula: 1 - sum(p_i^2)
 * where p_i = proportion of contacts in category i.
 *
 * 0 = all contacts in one category (no diversity)
 * Approaches 1 = evenly distributed across many categories.
 */
export function computeDiversityIndex(
  categoryDistribution: Record<string, number>
): number {
  const values = Object.values(categoryDistribution);
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;

  const hhi = values.reduce((sum, count) => {
    const proportion = count / total;
    return sum + proportion * proportion;
  }, 0);

  return 1 - hhi;
}

// ============================================================================
// COMPOSITE RELATIONSHIP SCORE
// ============================================================================

/**
 * Compute the composite relationship score for a single contact.
 *
 * Weights:
 *   0.20 * dunbar_layer_score
 *   0.20 * tie_strength
 *   0.15 * gottman_health
 *   0.10 * reciprocity
 *   0.15 * freshness (inverse decay)
 *   0.20 * strategic_value (placeholder, based on interaction frequency)
 */
export function computeCompositeRelationshipScore(input: {
  dunbarLayer: DunbarLayer;
  tieStrength: number;
  gottmanHealthy: boolean;
  reciprocity: number;
  freshness: number;
  strategicValue: number;
}): number {
  // Convert dunbar layer to 0-1 score (closer = higher)
  const layerScore: Record<DunbarLayer, number> = {
    5: 1.0,
    15: 0.8,
    50: 0.6,
    150: 0.4,
    500: 0.2,
  };

  const composite =
    0.20 * layerScore[input.dunbarLayer] +
    0.20 * clamp01(input.tieStrength) +
    0.15 * (input.gottmanHealthy ? 1.0 : 0.3) +
    0.10 * clamp01(input.reciprocity) +
    0.15 * clamp01(input.freshness) +
    0.20 * clamp01(input.strategicValue);

  return Math.round(composite * 1000) / 1000;
}

// ============================================================================
// FULL SCORING PIPELINE
// ============================================================================

/**
 * Score a single contact using all 7 formulas.
 */
export function scoreContact(input: ContactScoreInput): RelationshipScoreResult {
  const now = new Date();

  // Derive frequency (interactions per month, approximated)
  const daysSinceLast = input.lastInteractionAt
    ? Math.max(0, (now.getTime() - new Date(input.lastInteractionAt).getTime()) / 86400000)
    : 365;
  const frequencyPerMonth = daysSinceLast > 0
    ? Math.min(input.interactionCount / Math.max(daysSinceLast / 30, 1), 30)
    : 0;
  const frequencyNormalized = Math.min(frequencyPerMonth / 30, 1);

  // Emotional closeness (derived from health score for now)
  const emotionalCloseness = input.emotionalCloseness ?? (input.healthScore / 100);
  const intimacy = input.intimacy ?? (input.healthScore / 100) * 0.8;
  const reciprocity = input.reciprocity ?? 0.5;

  // 1. Dunbar Layer
  const dunbarLayer = classifyDunbarLayer(frequencyPerMonth, emotionalCloseness);

  // 2. Tie Strength
  const tieStrength = computeTieStrength(frequencyNormalized, emotionalCloseness, intimacy, reciprocity);

  // 3. Decay
  const previousCloseness = input.healthScore / 100;
  const decayedCloseness = computeDecayedCloseness(
    previousCloseness,
    daysSinceLast,
    input.relationshipType
  );

  // 4. Gottman Ratio
  const positiveCount = input.positiveInteractions ?? Math.round(input.interactionCount * 0.7);
  const negativeCount = input.negativeInteractions ?? Math.round(input.interactionCount * 0.1);
  const { ratio: gottmanRatio, healthy: gottmanHealthy } = computeGottmanRatio(positiveCount, negativeCount);

  // Freshness: how recent is the last interaction (1 = today, 0 = 365+ days ago)
  const freshness = Math.max(0, 1 - daysSinceLast / 365);

  // Strategic value: based on frequency and diversity of interaction
  const strategicValue = Math.min(1, frequencyNormalized * 0.6 + tieStrength * 0.4);

  // 5. Composite
  const compositeScore = computeCompositeRelationshipScore({
    dunbarLayer,
    tieStrength,
    gottmanHealthy,
    reciprocity,
    freshness,
    strategicValue,
  });

  // Build ScientificScore array
  const trend: ScoreTrend = 'stable';
  const computedAt = now.toISOString();

  const scores: ScientificScore[] = [
    {
      dimension: 'dunbar_layer',
      value: { 5: 1.0, 15: 0.8, 50: 0.6, 150: 0.4, 500: 0.2 }[dunbarLayer],
      rawValue: dunbarLayer,
      methodology: 'Dunbar, R.I.M. (1992). Neocortex size as a constraint on group size.',
      confidence: Math.min(input.interactionCount / 10, 1),
      computedAt,
      trend,
      explainer: `Camada ${dunbarLayer}: ${getDunbarLayerLabel(dunbarLayer)}`,
      sufficiency: getSufficiencyLevel({ 5: 1.0, 15: 0.8, 50: 0.6, 150: 0.4, 500: 0.2 }[dunbarLayer]),
      isContested: false,
    },
    {
      dimension: 'tie_strength',
      value: tieStrength,
      rawValue: tieStrength * 100,
      methodology: 'Granovetter, M.S. (1973). The Strength of Weak Ties.',
      confidence: Math.min(input.interactionCount / 10, 1),
      computedAt,
      trend,
      explainer: `Força do vinculo: ${(tieStrength * 100).toFixed(0)}%`,
      sufficiency: getSufficiencyLevel(tieStrength),
      isContested: false,
    },
    {
      dimension: 'relationship_decay',
      value: decayedCloseness,
      rawValue: decayedCloseness * 100,
      methodology: 'Roberts & Dunbar (2011). The costs of family and friends.',
      confidence: input.lastInteractionAt ? 0.8 : 0.3,
      computedAt,
      trend,
      explainer: `Proximidade apos ${daysSinceLast.toFixed(0)} dias: ${(decayedCloseness * 100).toFixed(0)}%`,
      sufficiency: getSufficiencyLevel(decayedCloseness),
      isContested: false,
    },
    {
      dimension: 'gottman_ratio',
      value: gottmanHealthy ? 0.9 : 0.3,
      rawValue: gottmanRatio ?? 0,
      methodology: 'Gottman, J.M. (1994). What Predicts Divorce?',
      confidence: (positiveCount + negativeCount) > 5 ? 0.7 : 0.3,
      computedAt,
      trend,
      explainer: gottmanRatio
        ? `Razao positivo/negativo: ${gottmanRatio.toFixed(1)}:1 (${gottmanHealthy ? 'saudavel' : 'atenção'})`
        : 'Dados insuficientes para calcular razao Gottman',
      sufficiency: getSufficiencyLevel(gottmanHealthy ? 0.9 : 0.3),
      isContested: true,
      contestedNote: 'A razao 5:1 de Gottman foi originalmente estudada em casais. A generalizacao para outros relacionamentos e uma extrapolacao.',
    },
  ];

  return {
    contactId: input.contactId,
    dunbarLayer,
    tieStrength,
    decayedCloseness,
    gottmanRatio,
    gottmanHealthy,
    compositeScore,
    scores,
  };
}

/**
 * Compute network-level metrics for all contacts.
 */
export function computeNetworkMetrics(
  contacts: { id: string; interactionCount: number; relationshipType: string; dunbarLayer?: DunbarLayer }[]
): NetworkMetricsResult {
  const totalContacts = contacts.length;
  const totalInteractions = contacts.reduce((s, c) => s + c.interactionCount, 0);

  // Layer distribution
  const layerDist: Record<DunbarLayer, number> = { 5: 0, 15: 0, 50: 0, 150: 0, 500: 0 };
  for (const c of contacts) {
    const layer = c.dunbarLayer ?? 500;
    layerDist[layer] = (layerDist[layer] ?? 0) + 1;
  }

  // Diversity index by relationship type
  const typeDist: Record<string, number> = {};
  for (const c of contacts) {
    typeDist[c.relationshipType] = (typeDist[c.relationshipType] ?? 0) + 1;
  }
  const diversityIndex = computeDiversityIndex(typeDist);

  // Effective size (simplified: assume ~10% of possible ties exist among contacts)
  const estimatedTies = Math.round(totalContacts * 0.1);
  const effectiveSize = computeEffectiveSize(totalContacts, estimatedTies);

  // Aggregate constraint (simplified)
  const constraintInputs = contacts.map(c => ({
    interactions: c.interactionCount,
    mutualFactor: 0.1,
  }));
  const networkConstraint = computeAggregateConstraint(constraintInputs, totalInteractions);

  return {
    effectiveSize,
    networkConstraint,
    diversityIndex,
    layerDistribution: layerDist,
    totalContacts,
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Fetch contacts and score them all, then persist results.
 */
export async function scoreAllContacts(): Promise<{
  scored: number;
  metrics: NetworkMetricsResult | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: contacts, error } = await supabase
      .from('contact_network')
      .select('id, name, relationship_type, interaction_count, last_interaction_at, health_score, sentiment_trend')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;
    if (!contacts || contacts.length === 0) {
      return { scored: 0, metrics: null };
    }

    // Score each contact
    const results: RelationshipScoreResult[] = [];
    for (const c of contacts) {
      const result = scoreContact({
        contactId: c.id,
        relationshipType: c.relationship_type ?? 'contact',
        interactionCount: c.interaction_count ?? 0,
        lastInteractionAt: c.last_interaction_at,
        healthScore: c.health_score ?? 50,
        sentimentTrend: c.sentiment_trend ?? 'unknown',
      });
      results.push(result);
    }

    // Batch update contact_network with scores
    for (const r of results) {
      const { error: updateError } = await supabase
        .from('contact_network')
        .update({
          dunbar_layer: r.dunbarLayer,
          tie_strength: r.tieStrength,
          relationship_score: r.compositeScore,
          decay_rate: getDecayRate(
            contacts.find(c => c.id === r.contactId)?.relationship_type ?? 'contact'
          ),
          gottman_ratio: r.gottmanRatio,
        })
        .eq('id', r.contactId)
        .eq('user_id', user.id);

      if (updateError) {
        log.warn(`Failed to update contact ${r.contactId}:`, updateError.message);
      }
    }

    // Compute network metrics
    const metricsInput = results.map(r => ({
      id: r.contactId,
      interactionCount: contacts.find(c => c.id === r.contactId)?.interaction_count ?? 0,
      relationshipType: contacts.find(c => c.id === r.contactId)?.relationship_type ?? 'contact',
      dunbarLayer: r.dunbarLayer,
    }));
    const metrics = computeNetworkMetrics(metricsInput);

    // Store network metrics
    const { error: metricsError } = await supabase
      .from('network_metrics')
      .insert({
        user_id: user.id,
        effective_network_size: metrics.effectiveSize,
        network_constraint: metrics.networkConstraint,
        diversity_index: metrics.diversityIndex,
        layer_distribution: metrics.layerDistribution,
      });

    if (metricsError) {
      log.warn('Failed to store network metrics:', metricsError.message);
    }

    log.info('Network scoring complete:', {
      scored: results.length,
      effectiveSize: metrics.effectiveSize.toFixed(1),
      diversity: metrics.diversityIndex.toFixed(2),
    });

    return { scored: results.length, metrics };
  } catch (err) {
    log.error('scoreAllContacts failed:', err);
    throw err;
  }
}

// ============================================================================
// CONNECTIONS DOMAIN SCORE PROVIDER (for Life Score)
// ============================================================================

/**
 * Compute the Connections domain score for the Life Score.
 * Uses average relationship score across active contacts.
 */
export async function computeConnectionsDomainScore(): Promise<{
  module: 'connections';
  normalized: number;
  raw: number;
  label: string;
  confidence: number;
  trend: ScoreTrend;
} | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: contacts } = await supabase
      .from('contact_network')
      .select('relationship_score, health_score')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .not('relationship_score', 'is', null);

    if (!contacts || contacts.length === 0) return null;

    const avgScore = contacts.reduce(
      (s, c) => s + (c.relationship_score ?? c.health_score / 100),
      0
    ) / contacts.length;

    return {
      module: 'connections',
      normalized: clamp01(avgScore),
      raw: avgScore * 100,
      label: 'Relacionamentos',
      confidence: Math.min(contacts.length / 10, 1),
      trend: 'stable',
    };
  } catch (err) {
    log.warn('computeConnectionScore failed (non-critical):', err);
    return null;
  }
}

// ============================================================================
// DOMAIN PROVIDER REGISTRATION (for Life Score)
// ============================================================================

/**
 * Register the Connections domain provider with the scoring engine.
 * Call this once during app initialization.
 */
export function registerConnectionsDomainProvider(): void {
  import('@/services/scoring/scoringEngine').then(({ registerDomainProvider }) => {
    registerDomainProvider('connections', computeConnectionsDomainScore);
  }).catch((err) => {
    log.warn('Failed to register connections provider:', err);
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
