/**
 * Scientific Scoring Engine — Barrel Export
 * Issue #575: Scientific foundations for AICA Life OS
 */

// Types
export type {
  ScoreTrend,
  SufficiencyLevel,
  ScientificScore,
  AicaDomain,
  DomainScore,
  LifeScore,
  CorrelatedPair,
  SpiralAlert,
  AHPComparison,
  AHPResult,
  ScoreAttribution,
  ModelCategory,
  ScientificModel,
  AssessmentItem,
  ScoringRule,
  AssessmentInstrument,
  AssessmentResponse,
  ScoreExplanation,
} from './types';

export {
  DEFAULT_DOMAIN_WEIGHTS,
  getSufficiencyLevel,
  getSufficiencyColor,
  getTrendDisplayText,
  getTrendIconName,
  getSufficiencyDisplayText,
} from './types';

// Scoring Engine
export {
  registerDomainProvider,
  unregisterDomainProvider,
  computeAllDomainScores,
  computeAndStoreLifeScore,
  logAttribution,
  getAttributions,
  getActiveModels,
  getPlaceholderDomainScore,
} from './scoringEngine';

export type { DomainScoreProvider } from './scoringEngine';

// Life Score Service
export {
  computeWeightedGeometricMean,
  computeAHPWeights,
  computeTrend,
  computeLifeScore,
  getUserDomainWeights,
  saveUserDomainWeights,
  getLatestLifeScore,
  getLifeScoreHistory,
  storeLifeScore,
  DOMAIN_LABELS,
} from './lifeScoreService';

// Spiral Detection
export {
  CORRELATED_PAIRS,
  detectSpiral,
  getSpiralRecommendations,
} from './spiralDetectionService';

// Score Explainer
export {
  getScoreExplanation,
  getAllExplanations,
  getExplanationsForDomain,
  getContestedModels,
} from './scoreExplainerService';
