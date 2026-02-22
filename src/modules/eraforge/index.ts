/**
 * EraForge Module - Barrel Export
 *
 * Historical simulation game for children.
 * AI-guided turn-based narratives through historical eras.
 */

// ============================================
// TYPES
// ============================================

export type {
  Era,
  AdvisorId,
  ChildProfile,
  ChildProfileCreateInput,
  ChildProfileUpdateInput,
  World,
  WorldCreateInput,
  WorldUpdateInput,
  WorldMember,
  WorldMemberCreateInput,
  WorldMemberUpdateInput,
  Turn,
  TurnCreateInput,
  TurnScenario,
  TurnChoice,
  TurnConsequences,
  Simulation,
  SimulationCreateInput,
  SimulationEvent,
  StatsDelta,
  ParentalSettings,
  GameState,
  Advisor,
} from './types';

export { ERA_LABELS, ERA_CONFIG, ADVISOR_CONFIG } from './types';

// ============================================
// CONTEXT
// ============================================

export {
  EraforgeGameProvider,
  useEraforgeGame,
  useEraforgeMode,
} from './contexts/EraforgeGameContext';

export {
  EraforgeVoiceProvider,
  useEraforgeVoice,
} from './contexts/EraforgeVoiceContext';

// ============================================
// HOOKS
// ============================================

export { useEraforgeTurns } from './hooks';
export type { UseEraforgeTurnsResult } from './hooks';

// ============================================
// SERVICES
// ============================================

export { EraforgeGameService } from './services';
export { EraforgeAIService } from './services';
export { EraforgeVoiceService } from './services';

// ============================================
// VIEWS
// ============================================

export { default as EraForgeMainView } from './views/EraForgeMainView';

// ============================================
// COMPONENTS
// ============================================

export { EF_HomeScreen } from './components/EF_HomeScreen';
export { EF_GameScreen } from './components/EF_GameScreen';
export { EF_SimulationScreen } from './components/EF_SimulationScreen';
export { EF_AdvisorPanel } from './components/EF_AdvisorPanel';
export { EF_SceneRenderer } from './components/EF_SceneRenderer';
export { EF_StatsBar } from './components/EF_StatsBar';
export { EF_TurnCounter } from './components/EF_TurnCounter';
export { EF_ParentDashboard } from './components/EF_ParentDashboard';
export { EF_VoiceWave } from './components/EF_VoiceWave';
