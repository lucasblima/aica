/**
 * EraForge Services - Barrel Export
 */

// Game CRUD
export { EraforgeGameService } from './eraforgeGameService';

// AI Game Master
export { EraforgeAIService } from './eraforgeAIService';
export type { GenerateScenarioResult, AdvisorResponseResult, ProcessDecisionResult, SimulationResult } from './eraforgeAIService';

// Access Gate
export { EraforgeAccessService } from './eraforgeAccessService';
export type { EraforgeAccessStatus } from './eraforgeAccessService';

// Voice / TTS
export { EraforgeVoiceService } from './eraforgeVoiceService';
export type { VoiceOption, SpeechResult } from './eraforgeVoiceService';
