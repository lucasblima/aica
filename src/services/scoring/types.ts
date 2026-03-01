/**
 * Scientific Scoring Engine — Shared Types
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Core type definitions used across all scoring services, hooks, and components.
 * Follows the pattern established by src/types/healthScore.ts.
 */

// ============================================================================
// SCORE TRENDS & STATUS
// ============================================================================

/** Trend direction based on recent score history */
export type ScoreTrend = 'improving' | 'stable' | 'declining';

/** Sufficiency level (GNH-inspired framing — "areas for growth" not "targets") */
export type SufficiencyLevel = 'thriving' | 'sufficient' | 'growing' | 'attention_needed';

// ============================================================================
// SCIENTIFIC SCORE — The Universal Score Type
// ============================================================================

/**
 * Every score in AICA implements this interface.
 * Traces back to a peer-reviewed methodology with user-facing explainer.
 */
export interface ScientificScore {
  /** Score dimension identifier (e.g., 'flow_probability', 'financial_health') */
  dimension: string;
  /** Normalized value (0-1) for Life Score composition */
  value: number;
  /** Original-scale value (e.g., 0-100, 1-35, 1-9) */
  rawValue: number;
  /** Paper citation (e.g., 'PERMA-Profiler (Butler & Kern, 2016)') */
  methodology: string;
  /** Confidence in this score (0-1). Lower when data is sparse. */
  confidence: number;
  /** When this score was computed */
  computedAt: string;
  /** Trend over recent history */
  trend: ScoreTrend;
  /** User-facing explanation: "How is this calculated?" */
  explainer: string;
  /** Sufficiency level (GNH-inspired) */
  sufficiency: SufficiencyLevel;
  /** True if the underlying model has contested evidence */
  isContested: boolean;
  /** Transparency note for contested models */
  contestedNote?: string;
}

// ============================================================================
// LIFE SCORE — Composite Cross-Domain Score
// ============================================================================

/** AICA module identifiers for Life Score domains */
export type AicaDomain =
  | 'atlas'
  | 'journey'
  | 'connections'
  | 'finance'
  | 'grants'
  | 'studio'
  | 'flux';

/** Default domain weights (equal) */
export const DEFAULT_DOMAIN_WEIGHTS: Record<AicaDomain, number> = {
  atlas: 1,
  journey: 1,
  connections: 1,
  finance: 1,
  grants: 1,
  studio: 1,
  flux: 1,
};

/** Per-domain score input for Life Score computation */
export interface DomainScore {
  /** Which AICA module */
  module: AicaDomain;
  /** Normalized score (0-1) */
  normalized: number;
  /** Original-scale score */
  raw: number;
  /** Label shown in UI (e.g., "Produtividade", "Bem-estar") */
  label: string;
  /** Confidence in this domain score */
  confidence: number;
  /** Trend for this domain */
  trend: ScoreTrend;
}

/** Composite Life Score (weighted geometric mean) */
export interface LifeScore {
  /** Composite score (0-1) via weighted geometric mean */
  composite: number;
  /** Per-domain normalized scores */
  domainScores: Record<AicaDomain, number>;
  /** Current domain weights */
  domainWeights: Record<AicaDomain, number>;
  /** Weighting method used */
  weightMethod: 'equal' | 'slider' | 'ahp';
  /** Overall trend */
  trend: ScoreTrend;
  /** Overall sufficiency level */
  sufficiency: SufficiencyLevel;
  /** Spiral detection result */
  spiralAlert: boolean;
  /** Which domains are declining in a correlated pattern */
  spiralDomains: AicaDomain[];
  /** When this was computed */
  computedAt: string;
}

// ============================================================================
// SPIRAL DETECTION
// ============================================================================

/** Correlated domain pair for spiral detection */
export interface CorrelatedPair {
  domainA: string;
  domainB: string;
  description: string;
}

/** Spiral alert result */
export interface SpiralAlert {
  detected: boolean;
  decliningDomains: string[];
  correlatedDeclines: CorrelatedPair[];
  severity: 'warning' | 'critical';
  message: string;
}

// ============================================================================
// AHP (ANALYTIC HIERARCHY PROCESS)
// ============================================================================

/** AHP pairwise comparison matrix entry */
export interface AHPComparison {
  domainA: AicaDomain;
  domainB: AicaDomain;
  /** Saaty 9-point scale: 1=equal, 3=moderate, 5=strong, 7=very strong, 9=extreme */
  value: number;
}

/** AHP computation result */
export interface AHPResult {
  weights: Record<AicaDomain, number>;
  consistencyRatio: number;
  isConsistent: boolean;
}

// ============================================================================
// SCORE ATTRIBUTION
// ============================================================================

/** Why did a score change? */
export interface ScoreAttribution {
  id: string;
  modelId: string;
  previousScore: number | null;
  newScore: number;
  delta: number | null;
  triggerAction: string;
  triggerReferenceId: string | null;
  metadata: Record<string, unknown>;
  computedAt: string;
}

// ============================================================================
// SCIENTIFIC MODEL REGISTRY
// ============================================================================

/** Model category */
export type ModelCategory = 'scoring' | 'assessment' | 'detection' | 'matching' | 'planning';

/** Scientific model registry entry */
export interface ScientificModel {
  id: string;
  name: string;
  module: string;
  category: ModelCategory;
  methodologyReference: string;
  version: string;
  formulaDescription: string | null;
  isActive: boolean;
  isContested: boolean;
  contestedNote: string | null;
}

// ============================================================================
// ASSESSMENT FRAMEWORK
// ============================================================================

/** Assessment item (question) */
export interface AssessmentItem {
  code: string;
  text: string;
  subscale: string;
  /** 'likert', 'grid_tap', 'text', 'number' */
  inputType: 'likert' | 'grid_tap' | 'text' | 'number';
  /** Scale endpoints for likert */
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  /** True if higher value = less of the construct (reverse-scored) */
  isReversed?: boolean;
}

/** Scoring rule for computing subscale scores */
export interface ScoringRule {
  subscale: string;
  /** Item codes that contribute to this subscale */
  itemCodes: string[];
  /** 'mean', 'sum', 'custom' */
  aggregation: 'mean' | 'sum' | 'custom';
  /** Custom scoring function name (if aggregation='custom') */
  customFn?: string;
}

/** Psychometric instrument definition */
export interface AssessmentInstrument {
  id: string;
  name: string;
  shortName: string;
  description: string;
  items: AssessmentItem[];
  scoringRules: ScoringRule[];
  language: 'pt-BR';
  validationReference: string;
  estimatedMinutes: number;
  /** Raw score range */
  scoreRange: { min: number; max: number };
}

/** User's response to an assessment */
export interface AssessmentResponse {
  instrumentId: string;
  version: string;
  responses: Record<string, number | string>;
  subscaleScores: Record<string, number> | null;
  compositeScore: number | null;
  context: 'on_demand' | 'weekly_review' | 'onboarding';
  administeredAt: string;
}

// ============================================================================
// SCORE EXPLAINER
// ============================================================================

/** Content for the "How is this calculated?" popover */
export interface ScoreExplanation {
  /** Score name in Portuguese */
  title: string;
  /** 1-2 sentence summary */
  summary: string;
  /** Methodology reference */
  methodology: string;
  /** PT-BR validation info (if applicable) */
  brazilianValidation?: string;
  /** Formula in plain language */
  formulaDescription: string;
  /** Scale description (e.g., "0-100, where 80+ = healthy") */
  scaleDescription: string;
  /** Is this model contested? */
  isContested: boolean;
  /** Transparency note */
  contestedNote?: string;
  /** What actions improve this score? */
  improvementTips: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get sufficiency level from a normalized score (0-1)
 * GNH-inspired: sufficiency threshold at 0.66
 */
export function getSufficiencyLevel(score: number): SufficiencyLevel {
  if (score >= 0.80) return 'thriving';
  if (score >= 0.66) return 'sufficient';
  if (score >= 0.40) return 'growing';
  return 'attention_needed';
}

/**
 * Get color for sufficiency level (Ceramic Design System)
 */
export function getSufficiencyColor(level: SufficiencyLevel): string {
  switch (level) {
    case 'thriving': return 'var(--color-ceramic-success, #6B7B5C)';
    case 'sufficient': return 'var(--color-ceramic-info, #5B8BA0)';
    case 'growing': return 'var(--color-ceramic-warning, #D97706)';
    case 'attention_needed': return 'var(--color-ceramic-error, #9B4D3A)';
  }
}

/**
 * Get trend display text in Portuguese
 */
export function getTrendDisplayText(trend: ScoreTrend): string {
  switch (trend) {
    case 'improving': return 'Melhorando';
    case 'stable': return 'Estável';
    case 'declining': return 'Em declínio';
  }
}

/**
 * Get trend icon name (Lucide icon)
 */
export function getTrendIconName(trend: ScoreTrend): string {
  switch (trend) {
    case 'improving': return 'TrendingUp';
    case 'stable': return 'Minus';
    case 'declining': return 'TrendingDown';
  }
}

/**
 * Get sufficiency display text in Portuguese
 */
export function getSufficiencyDisplayText(level: SufficiencyLevel): string {
  switch (level) {
    case 'thriving': return 'Prosperando';
    case 'sufficient': return 'Suficiente';
    case 'growing': return 'Em crescimento';
    case 'attention_needed': return 'Precisa de atenção';
  }
}
