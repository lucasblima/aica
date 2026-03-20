/**
 * Researcher Scoring Service
 * Sprint 6 — Grants Scientometric Matching
 *
 * Implements:
 * - Researcher Strength Score (RSS): Hirsch 2005
 * - TRL Assessment: ISO 16290:2013
 * - Grant Match Score: SPECTER-based semantic matching
 */

import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from '@/services/supabaseClient';
import type { SufficiencyLevel } from '@/services/scoring/types';
import { getSufficiencyLevel } from '@/services/scoring/types';

const log = createNamespacedLogger('researcherScoring');

// ============================================================================
// TYPES
// ============================================================================

export interface ResearcherProfile {
  hIndex: number;
  totalCitations: number;
  mQuotient: number;       // h-index / years since first publication
  avgJournalIF: number;    // average impact factor of journals published in
  collaborationCentrality: number; // 0-1
  lattesId?: string;
  orcid?: string;
}

export interface ResearcherStrengthResult {
  rss: number;             // 0-100 composite
  components: {
    hIndexScore: number;
    citationScore: number;
    mQuotientScore: number;
    impactFactorScore: number;
    centralityScore: number;
  };
  tier: 'emerging' | 'established' | 'senior' | 'leading';
}

export interface TRLEvidence {
  level: number;           // 1-9
  criteria: string[];
  met: boolean[];
}

export interface TRLAssessment {
  currentLevel: number;    // highest fully-met TRL
  evidence: TRLEvidence[];
  readinessScore: number;  // 0-100
  nextSteps: string[];
}

// TRL criteria per level (ISO 16290:2013 adapted for research context)
export const TRL_CRITERIA: Record<number, string[]> = {
  1: ['Principios basicos observados e reportados', 'Revisão de literatura realizada'],
  2: ['Conceito de tecnologia formulado', 'Aplicação potencial identificada'],
  3: ['Prova de conceito experimental', 'Funcoes criticas demonstradas em laboratorio'],
  4: ['Validacao em laboratorio de componentes integrados', 'Resultados consistentes em ambiente controlado'],
  5: ['Validacao em ambiente relevante', 'Prototipo testado em condições reais'],
  6: ['Demonstracao em ambiente relevante', 'Sistema representativo testado'],
  7: ['Demonstracao em ambiente operacional', 'Prototipo perto da escala final'],
  8: ['Sistema completo qualificado', 'Testes em ambiente operacional real'],
  9: ['Sistema provado em operação', 'Documentação completa e pronto para produção'],
};

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

/** Normalize a value to 0-100 using min-max with research-specific benchmarks */
function normalizeHIndex(h: number): number {
  // Brazilian research benchmarks: median ~10, top ~50
  return Math.min(100, (h / 50) * 100);
}

function normalizeCitations(citations: number): number {
  // Top Brazilian researchers: ~5000 citations
  return Math.min(100, (citations / 5000) * 100);
}

function normalizeMQuotient(m: number): number {
  // m-quotient > 2 is excellent (h-index per year)
  return Math.min(100, (m / 2) * 100);
}

function normalizeImpactFactor(avgIF: number): number {
  // Average IF across Brazilian journals: ~1.5, top journals: ~10
  return Math.min(100, (avgIF / 10) * 100);
}

function normalizeCentrality(centrality: number): number {
  // Already 0-1, scale to 0-100
  return Math.min(100, centrality * 100);
}

// ============================================================================
// RSS — RESEARCHER STRENGTH SCORE
// ============================================================================

/**
 * Compute Researcher Strength Score (RSS)
 * Hirsch 2005 inspired composite:
 * RSS = 0.30*norm(h) + 0.20*norm(citations) + 0.15*norm(m) + 0.20*norm(IF) + 0.15*norm(centrality)
 */
export function computeResearcherStrength(profile: ResearcherProfile): ResearcherStrengthResult {
  const hScore = normalizeHIndex(profile.hIndex);
  const citScore = normalizeCitations(profile.totalCitations);
  const mScore = normalizeMQuotient(profile.mQuotient);
  const ifScore = normalizeImpactFactor(profile.avgJournalIF);
  const centScore = normalizeCentrality(profile.collaborationCentrality);

  const rss = 0.30 * hScore + 0.20 * citScore + 0.15 * mScore + 0.20 * ifScore + 0.15 * centScore;

  const tier: ResearcherStrengthResult['tier'] =
    rss >= 80 ? 'leading' :
    rss >= 60 ? 'senior' :
    rss >= 40 ? 'established' : 'emerging';

  return {
    rss,
    components: {
      hIndexScore: hScore,
      citationScore: citScore,
      mQuotientScore: mScore,
      impactFactorScore: ifScore,
      centralityScore: centScore,
    },
    tier,
  };
}

// ============================================================================
// TRL ASSESSMENT
// ============================================================================

/**
 * Assess TRL level based on evidence checklist
 * ISO 16290:2013 adapted
 */
export function assessTRL(evidence: TRLEvidence[]): TRLAssessment {
  let currentLevel = 0;
  const nextSteps: string[] = [];

  for (let level = 1; level <= 9; level++) {
    const levelEvidence = evidence.find(e => e.level === level);
    if (!levelEvidence) {
      // No evidence for this level — stop here
      const criteria = TRL_CRITERIA[level] || [];
      nextSteps.push(...criteria.map(c => `TRL ${level}: ${c}`));
      break;
    }

    const allMet = levelEvidence.met.every(m => m);
    if (allMet) {
      currentLevel = level;
    } else {
      // Partial evidence — add unmet criteria as next steps
      levelEvidence.criteria.forEach((c, i) => {
        if (!levelEvidence.met[i]) {
          nextSteps.push(`TRL ${level}: ${c}`);
        }
      });
      break;
    }
  }

  const readinessScore = (currentLevel / 9) * 100;

  return { currentLevel, evidence, readinessScore, nextSteps: nextSteps.slice(0, 5) };
}

// ============================================================================
// GRANT MATCHING
// ============================================================================

export interface GrantMatchResult {
  semanticSimilarity: number;    // 0-1
  profileFit: number;            // 0-1
  successProbability: number;    // 0-1
  factorBreakdown: {
    topicAlignment: number;
    budgetFit: number;
    trackRecord: number;
    deadlineRisk: number;
    teamStrength: number;
  };
}

/**
 * Compute grant match score
 * Combines semantic similarity with profile fit
 */
export function computeGrantMatch(
  semanticSimilarity: number,
  researcherRSS: number,
  budgetFit: number,
  deadlineDaysRemaining: number,
  teamSize: number
): GrantMatchResult {
  const trackRecord = Math.min(1, researcherRSS / 100);
  const deadlineRisk = deadlineDaysRemaining > 30 ? 1.0 :
    deadlineDaysRemaining > 14 ? 0.8 :
    deadlineDaysRemaining > 7 ? 0.5 : 0.2;
  const teamStrength = Math.min(1, teamSize / 5);

  const profileFit = (
    0.35 * trackRecord +
    0.25 * budgetFit +
    0.20 * deadlineRisk +
    0.20 * teamStrength
  );

  const successProbability = (
    0.40 * semanticSimilarity +
    0.60 * profileFit
  );

  return {
    semanticSimilarity,
    profileFit,
    successProbability,
    factorBreakdown: {
      topicAlignment: semanticSimilarity,
      budgetFit,
      trackRecord,
      deadlineRisk,
      teamStrength,
    },
  };
}

// ============================================================================
// DOMAIN SCORE (for Life Score integration)
// ============================================================================

/**
 * Compute grants domain score for Life Score
 * Combines researcher strength + project readiness + matching success
 */
export function computeGrantsDomainScore(
  rss: number,
  activeProjectTRL: number,
  bestMatchProbability: number
): number {
  const rssNorm = Math.min(1, rss / 100);
  const trlNorm = Math.min(1, activeProjectTRL / 9);
  const matchNorm = bestMatchProbability;

  return 0.40 * rssNorm + 0.30 * trlNorm + 0.30 * matchNorm;
}

// ============================================================================
// DOMAIN PROVIDER (for Life Score)
// ============================================================================

/**
 * Compute Grants domain score for the scoring engine.
 * Fetches researcher profile and active projects to build a composite score.
 */
async function computeGrantsDomainScoreProvider(): Promise<import('@/services/scoring/types').DomainScore | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch researcher profile
    const { data: profile } = await supabase
      .from('researcher_profiles')
      .select('researcher_strength_score')
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch active projects
    const { data: projects } = await supabase
      .from('grant_projects')
      .select('id, status, trl_level')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if ((!profile || !profile.researcher_strength_score) && (!projects || projects.length === 0)) {
      return null;
    }

    const rss = profile?.researcher_strength_score || 0;
    const activeProjectTRL = projects && projects.length > 0
      ? Math.max(...projects.map(p => p.trl_level || 1))
      : 1;

    // Fetch best match probability from opportunities
    const { data: opportunities } = await supabase
      .from('grant_opportunities')
      .select('match_score')
      .in('project_id', (projects || []).map(p => p.id))
      .order('match_score', { ascending: false })
      .limit(1);

    const bestMatchProbability = opportunities && opportunities.length > 0
      ? (opportunities[0].match_score || 0) / 100
      : 0;

    const normalized = computeGrantsDomainScore(rss, activeProjectTRL, bestMatchProbability);

    return {
      module: 'grants' as const,
      normalized: Math.max(0, Math.min(1, normalized)),
      raw: Math.round(normalized * 100),
      label: 'Captacao',
      confidence: Math.min(1, 0.3 + (rss > 0 ? 0.4 : 0) + ((projects?.length || 0) > 0 ? 0.3 : 0)),
      trend: 'stable' as const,
    };
  } catch (err) {
    log.warn('Grants domain score computation failed (non-critical):', err);
    return null;
  }
}

/**
 * Register the Grants domain provider with the scoring engine.
 * Call this once during app initialization.
 */
export function registerGrantsDomainProvider(): void {
  import('@/services/scoring/scoringEngine').then(({ registerDomainProvider }) => {
    registerDomainProvider('grants', computeGrantsDomainScoreProvider);
  }).catch((err) => {
    log.warn('Failed to register grants provider:', err);
  });
}

// ============================================================================
// SUFFICIENCY HELPER (re-exported for convenience)
// ============================================================================

/**
 * Get sufficiency level for a researcher strength score
 */
export function getResearcherSufficiency(rss: number): SufficiencyLevel {
  return getSufficiencyLevel(rss / 100);
}

// ============================================================================
// SUPABASE PERSISTENCE
// ============================================================================

export async function storeResearcherProfile(profile: ResearcherProfile & { rss: number }): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('researcher_profiles')
      .upsert({
        user_id: user.id,
        h_index: profile.hIndex,
        total_citations: profile.totalCitations,
        m_quotient: profile.mQuotient,
        avg_journal_if: profile.avgJournalIF,
        collaboration_centrality: profile.collaborationCentrality,
        researcher_strength_score: profile.rss,
        lattes_id: profile.lattesId || null,
        orcid: profile.orcid || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
    log.info('Researcher profile stored');
  } catch (err) {
    log.error('Error storing researcher profile:', err);
    throw err;
  }
}

export async function getResearcherProfile(): Promise<(ResearcherProfile & { rss: number }) | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('researcher_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;

    return {
      hIndex: data.h_index || 0,
      totalCitations: data.total_citations || 0,
      mQuotient: data.m_quotient || 0,
      avgJournalIF: data.avg_journal_if || 0,
      collaborationCentrality: data.collaboration_centrality || 0,
      lattesId: data.lattes_id,
      orcid: data.orcid,
      rss: data.researcher_strength_score || 0,
    };
  } catch (err) {
    log.error('Error fetching researcher profile:', err);
    return null;
  }
}

export async function storeGrantMatch(
  opportunityId: string,
  match: GrantMatchResult
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('grant_match_scores')
      .insert({
        user_id: user.id,
        opportunity_id: opportunityId,
        semantic_similarity: match.semanticSimilarity,
        profile_fit: match.profileFit,
        success_probability: match.successProbability,
        factor_breakdown: match.factorBreakdown,
      });

    if (error) throw error;
  } catch (err) {
    log.error('Error storing grant match:', err);
    throw err;
  }
}

export async function storeTRLAssessment(projectId: string, assessment: TRLAssessment): Promise<void> {
  try {
    const { error } = await supabase
      .from('grant_projects')
      .update({
        trl_level: assessment.currentLevel,
        trl_evidence: assessment.evidence,
      })
      .eq('id', projectId);

    if (error) throw error;
  } catch (err) {
    log.error('Error storing TRL assessment:', err);
    throw err;
  }
}

export async function getGrantMatches(limit = 10): Promise<Array<{
  opportunityId: string;
  similarity: number;
  fit: number;
  probability: number;
  computedAt: string;
}>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('grant_match_scores')
      .select('opportunity_id, semantic_similarity, profile_fit, success_probability, computed_at')
      .eq('user_id', user.id)
      .order('success_probability', { ascending: false })
      .limit(limit);

    if (error) return [];

    return (data || []).map(d => ({
      opportunityId: d.opportunity_id,
      similarity: d.semantic_similarity,
      fit: d.profile_fit,
      probability: d.success_probability,
      computedAt: d.computed_at,
    }));
  } catch (err) {
    log.error('Error fetching grant matches:', err);
    return [];
  }
}
