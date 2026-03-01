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

// Correlation Analysis (Sprint 7)
export {
  pearsonCorrelation,
  approximatePValue,
  getCorrelationStrength,
  computeCorrelationMatrix,
  storeCorrelationMatrix,
  getStoredCorrelations,
} from './correlationAnalysisService';

export type {
  CorrelationResult,
  CorrelationMatrix,
} from './correlationAnalysisService';

// Goodhart Detection (Sprint 7)
export {
  detectScoreHealthDivergence,
  detectSingleDomainInflation,
  detectMetricGaming,
  generateGoodhartAlerts,
  storeGoodhartAlert,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
} from './goodhartDetectionService';

export type {
  GoodhartAlertType,
  GoodhartSeverity,
  GoodhartAlert,
  DomainTrend,
  ActivityPattern,
} from './goodhartDetectionService';

// Digital Sabbatical (Sprint 7)
export {
  recordDailyActivity,
  checkSabbaticalEligibility,
  startSabbatical,
  endSabbatical,
  getSabbaticalState,
  getSabbaticalSuggestion,
} from './digitalSabbaticalService';

export type {
  SabbaticalState,
  SabbaticalSuggestion,
} from './digitalSabbaticalService';

// Scientific Badge Definitions (Sprint 7)
export {
  SCIENTIFIC_BADGES,
  getScientificBadges,
  getScientificBadgeById,
  getScientificBadgesByDomain,
  getFeaturedScientificBadges,
} from './scientificBadgeDefinitions';
