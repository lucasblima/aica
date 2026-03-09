/**
 * Studio Module Services - Barrel Export
 *
 * Centralized export for all Studio module services.
 */

// ============================================
// AI SERVICES
// ============================================

export {
  generateDossier,
  searchGuestProfile,
  suggestTrendingGuest,
  suggestTrendingTheme,
  generateMoreIceBreakers,
  deepResearchGuest,
} from './podcastAIService';

export type { GuestSearchResult } from './podcastAIService';

// ============================================
// GUEST SCORING (SPRINT 6)
// ============================================

export {
  scoreGuest,
  normalizeReach,
  computeDiversity,
  analyzeNarrativeArc,
  computeDurationOptimality,
  computeStudioDomainScore,
  storeGuestScore,
  storeNarrativeAnalysis,
  getGuestScores,
} from './guestScoring';

export type {
  GuestProfile,
  GuestScoreResult,
  NarrativeMoment,
  NarrativeAnalysis,
} from './guestScoring';

// ============================================
// CROSS-MODULE INTEGRATION (SPRINT 6)
// ============================================

export {
  fetchContactAsGuest,
  syncRecordingToCalendar,
  awardEpisodeCompletionCP,
} from './crossModuleService';

export type {
  ContactAsGuest,
  CalendarEventResult,
  CPAwardResult,
} from './crossModuleService';
