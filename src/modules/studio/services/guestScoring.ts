/**
 * Guest Scoring & Narrative Analysis Service
 * Sprint 6 — Studio Neuroscience-Informed Production
 *
 * Implements:
 * - Guest Composite Score: Multi-dimensional evaluation
 * - Peak-End Rule: Kahneman 1993
 * - Narrative Tension: Reagan et al. 2016
 * - Optimal Duration: Bridge Ratings research
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';

const log = createNamespacedLogger('guestScoring');

// ============================================================================
// TYPES
// ============================================================================

export interface GuestProfile {
  name: string;
  /** Subject matter expertise (0-1) */
  expertise: number;
  /** Social media reach / audience size (0-1 normalized) */
  reach: number;
  /** Topic relevance to the episode theme (0-1) */
  relevance: number;
  /** How different from previous guests (0-1) */
  diversity: number;
}

export interface GuestScoreResult {
  composite: number;    // 0-1
  components: {
    expertise: number;
    reach: number;
    relevance: number;
    diversity: number;
  };
  tier: 'ideal' | 'strong' | 'good' | 'consider';
  recommendation: string;
}

export interface NarrativeMoment {
  timestamp: number;      // minutes into episode
  label: string;
  tension: number;        // 0-1
  type: 'hook' | 'build' | 'peak' | 'valley' | 'resolution' | 'end';
}

export interface NarrativeAnalysis {
  tensionScore: number;          // 0-1 overall quality
  peakMoment: NarrativeMoment | null;
  endMoment: NarrativeMoment | null;
  arc: NarrativeMoment[];
  peakEndScore: number;          // 0-1 based on Kahneman
  hookStrength: number;          // 0-1 (first 5 min)
  durationOptimality: number;    // 0-1
  suggestions: string[];
}

// ============================================================================
// GUEST SCORING
// ============================================================================

/**
 * Score a podcast guest candidate
 * Composite = 0.30*expertise + 0.25*reach + 0.30*relevance + 0.15*diversity
 */
export function scoreGuest(profile: GuestProfile): GuestScoreResult {
  const composite = (
    0.30 * profile.expertise +
    0.25 * profile.reach +
    0.30 * profile.relevance +
    0.15 * profile.diversity
  );

  const tier: GuestScoreResult['tier'] =
    composite >= 0.85 ? 'ideal' :
    composite >= 0.70 ? 'strong' :
    composite >= 0.50 ? 'good' : 'consider';

  const recommendation =
    tier === 'ideal' ? 'Convidado ideal — alta expertise e relevancia para o tema.' :
    tier === 'strong' ? 'Convidado forte — boa combinacao de fatores.' :
    tier === 'good' ? 'Convidado adequado — considere complementar com outro perfil.' :
    'Avalie se este convidado se alinha com os objetivos do episódio.';

  return {
    composite,
    components: {
      expertise: profile.expertise,
      reach: profile.reach,
      relevance: profile.relevance,
      diversity: profile.diversity,
    },
    tier,
    recommendation,
  };
}

/**
 * Normalize reach from follower count to 0-1
 * Uses log scale — 1K=0.2, 10K=0.4, 100K=0.6, 1M=0.8, 10M=1.0
 */
export function normalizeReach(followers: number): number {
  if (followers <= 0) return 0;
  const logVal = Math.log10(Math.max(1, followers));
  return Math.min(1, logVal / 7); // 10M = log10(10000000) = 7
}

/**
 * Calculate diversity score based on previous guests
 */
export function computeDiversity(
  guestField: string,
  previousGuestFields: string[]
): number {
  if (previousGuestFields.length === 0) return 0.8; // First guest gets high diversity
  const sameField = previousGuestFields.filter(f =>
    f.toLowerCase() === guestField.toLowerCase()
  ).length;
  const diversityRatio = 1 - (sameField / previousGuestFields.length);
  return Math.max(0.1, diversityRatio);
}

// ============================================================================
// NARRATIVE TENSION
// ============================================================================

/**
 * Analyze narrative tension arc of an episode
 * Based on Reagan et al. 2016 — Six basic story shapes
 */
export function analyzeNarrativeArc(moments: NarrativeMoment[], durationMinutes: number): NarrativeAnalysis {
  if (moments.length === 0) {
    return {
      tensionScore: 0,
      peakMoment: null,
      endMoment: null,
      arc: [],
      peakEndScore: 0,
      hookStrength: 0,
      durationOptimality: computeDurationOptimality(durationMinutes),
      suggestions: ['Adicione marcadores de momentos-chave ao episódio para análise.'],
    };
  }

  // Sort by timestamp
  const sorted = [...moments].sort((a, b) => a.timestamp - b.timestamp);

  // Find peak and end
  const peakMoment = sorted.reduce((best, m) =>
    m.tension > (best?.tension || 0) ? m : best, sorted[0]);

  const endMoment = sorted[sorted.length - 1];

  // Hook strength — tension in first 5 minutes
  const hookMoments = sorted.filter(m => m.timestamp <= 5);
  const hookStrength = hookMoments.length > 0
    ? Math.max(...hookMoments.map(m => m.tension))
    : 0;

  // Peak-End Rule (Kahneman 1993)
  // Memory of experience = weighted avg of peak + end
  const peakEndScore = peakMoment && endMoment
    ? 0.5 * peakMoment.tension + 0.5 * endMoment.tension
    : 0;

  // Tension score: variance (dynamic episodes score higher) + peak placement
  const avgTension = sorted.reduce((s, m) => s + m.tension, 0) / sorted.length;
  const variance = sorted.reduce((s, m) => s + Math.pow(m.tension - avgTension, 2), 0) / sorted.length;
  const dynamism = Math.min(1, variance * 4); // Scale variance to 0-1

  // Peak should be in the last third for rising tension arc
  const peakPosition = peakMoment ? peakMoment.timestamp / durationMinutes : 0;
  const peakPlacement = peakPosition >= 0.5 && peakPosition <= 0.85 ? 1.0 :
    peakPosition >= 0.3 ? 0.7 : 0.4;

  const tensionScore = 0.30 * dynamism + 0.30 * peakEndScore + 0.20 * peakPlacement + 0.20 * hookStrength;

  // Duration optimality
  const durationOptimality = computeDurationOptimality(durationMinutes);

  // Generate suggestions
  const suggestions: string[] = [];
  if (hookStrength < 0.5) {
    suggestions.push('O gancho inicial (primeiros 5 min) esta fraco. Comece com algo impactante para reter ouvintes.');
  }
  if (peakPosition < 0.3) {
    suggestions.push('O pico de tensao esta muito cedo. Construa tensao gradualmente ate o terco final.');
  }
  if (endMoment && endMoment.tension < 0.4) {
    suggestions.push('O encerramento esta fraco. Pelo Peak-End Rule (Kahneman), termine com impacto.');
  }
  if (durationMinutes > 45) {
    suggestions.push('Episódio longo (>45 min). Pesquisas indicam queda de atenção apos 20 min.');
  }
  if (dynamism < 0.3) {
    suggestions.push('Episódio monotono. Varie o ritmo com perguntas provocativas, historias e mudancas de tom.');
  }

  return {
    tensionScore,
    peakMoment,
    endMoment,
    arc: sorted,
    peakEndScore,
    hookStrength,
    durationOptimality,
    suggestions,
  };
}

/**
 * Compute duration optimality based on Bridge Ratings research
 * Optimal: ~22 min, drop-offs at 5 min and 20 min
 */
export function computeDurationOptimality(durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  const optimal = 22;
  const sigma = 15;
  const z = (durationMinutes - optimal) / sigma;
  return Math.exp(-0.5 * z * z);
}

/**
 * Compute studio domain score for Life Score integration
 * Combines guest quality + narrative quality + production consistency
 */
export function computeStudioDomainScore(
  avgGuestScore: number,
  avgNarrativeScore: number,
  productionConsistency: number  // 0-1 (episodes per target frequency)
): number {
  return 0.35 * avgGuestScore + 0.35 * avgNarrativeScore + 0.30 * productionConsistency;
}

// ============================================================================
// SUPABASE PERSISTENCE
// ============================================================================

export async function storeGuestScore(
  guestName: string,
  episodeId: string | null,
  result: GuestScoreResult
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('guest_scores')
      .insert({
        user_id: user.id,
        episode_id: episodeId,
        guest_name: guestName,
        expertise_score: result.components.expertise,
        reach_score: result.components.reach,
        relevance_score: result.components.relevance,
        diversity_score: result.components.diversity,
        composite_score: result.composite,
        factor_details: result,
      });

    if (error) throw error;
    log.info('Guest score stored', { guestName, composite: result.composite });
  } catch (err) {
    log.error('Error storing guest score:', err);
    throw err;
  }
}

export async function storeNarrativeAnalysis(
  episodeId: string,
  analysis: NarrativeAnalysis
): Promise<void> {
  try {
    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        narrative_tension_score: analysis.tensionScore,
        peak_end_moments: {
          arc: analysis.arc,
          peakEndScore: analysis.peakEndScore,
          hookStrength: analysis.hookStrength,
          suggestions: analysis.suggestions,
        },
      })
      .eq('id', episodeId);

    if (error) throw error;
    log.info('Narrative analysis stored', { episodeId, tensionScore: analysis.tensionScore });
  } catch (err) {
    log.error('Error storing narrative analysis:', err);
    throw err;
  }
}

export async function getGuestScores(limit = 20): Promise<Array<{
  id: string;
  guestName: string;
  episodeId: string | null;
  composite: number;
  components: GuestScoreResult['components'];
  computedAt: string;
}>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('guest_scores')
      .select('id, guest_name, episode_id, composite_score, expertise_score, reach_score, relevance_score, diversity_score, computed_at')
      .eq('user_id', user.id)
      .order('composite_score', { ascending: false })
      .limit(limit);

    if (error) return [];

    return (data || []).map(d => ({
      id: d.id,
      guestName: d.guest_name,
      episodeId: d.episode_id,
      composite: d.composite_score,
      components: {
        expertise: d.expertise_score,
        reach: d.reach_score,
        relevance: d.relevance_score,
        diversity: d.diversity_score,
      },
      computedAt: d.computed_at,
    }));
  } catch (err) {
    log.error('Error fetching guest scores:', err);
    return [];
  }
}
