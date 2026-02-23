/**
 * EraForge Hooks - Barrel Export
 */

// ============================================
// GAME STATE
// ============================================

export { useEraforgeGame, useEraforgeMode } from './useEraforgeGame';
export type {
  EraforgeMode,
  EraforgeGameState,
  EraforgeGameActions,
  EraforgeGameContextValue,
} from './useEraforgeGame';

// ============================================
// VOICE
// ============================================

export { useEraforgeVoice, useEraforgeVoiceHook } from './useEraforgeVoice';
export type {
  EraforgeVoiceState,
  EraforgeVoiceActions,
  EraforgeVoiceContextValue,
} from './useEraforgeVoice';
export type { UseEraforgeVoiceResult } from './useEraforgeVoice';

// ============================================
// TURNS
// ============================================

export { useEraforgeTurns } from './useEraforgeTurns';
export type { UseEraforgeTurnsResult } from './useEraforgeTurns';

// ============================================
// ACCESS GATE
// ============================================

export { useEraforgeAccess } from './useEraforgeAccess';
export type { UseEraforgeAccessReturn } from './useEraforgeAccess';
