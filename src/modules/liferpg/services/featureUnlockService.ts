/**
 * Feature Unlock Service
 *
 * Maps user levels to unlockable features. Higher levels grant access
 * to more advanced analytics and AI-powered tools.
 */

import { CP_LEVELS, type CPLevel, getProgressToNextLevel } from '@/modules/journey/types/consciousnessPoints';

// ── Feature unlock map (level -> features unlocked at that level) ──

const FEATURE_UNLOCK_MAP: Record<number, string[]> = {
  1: ['daily_question_pool', 'basic_scoring', 'moment_capture'],
  2: ['daily_question_ai', 'emotion_picker', 'tag_input'],
  3: ['weekly_summary', 'activity_heatmap'],
  4: ['pattern_dashboard', 'emotion_trends'],
  5: ['semantic_search', 'theme_clusters'],
  6: ['life_council', 'deep_analysis'],
  7: ['cross_module_insights', 'proactive_suggestions'],
  8: ['advanced_ai_chat', 'batch_processing'],
};

// ── Feature display names in Portuguese ───────────────────────────

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  daily_question_pool: 'Pergunta do Dia',
  basic_scoring: 'Pontuacao Basica',
  moment_capture: 'Captura de Momentos',
  daily_question_ai: 'Perguntas Personalizadas',
  emotion_picker: 'Seletor de Emocoes',
  tag_input: 'Tags Personalizadas',
  weekly_summary: 'Resumo Semanal',
  activity_heatmap: 'Mapa de Atividades',
  pattern_dashboard: 'Painel de Padroes',
  emotion_trends: 'Tendencias Emocionais',
  semantic_search: 'Busca Inteligente',
  theme_clusters: 'Agrupamento de Temas',
  life_council: 'Conselho de Vida',
  deep_analysis: 'Analise Profunda',
  cross_module_insights: 'Insights Entre Modulos',
  proactive_suggestions: 'Sugestoes Proativas',
  advanced_ai_chat: 'Chat IA Avancado',
  batch_processing: 'Processamento em Lote',
};

// ── Service functions ─────────────────────────────────────────────

/**
 * Get all features unlocked up to and including the given level.
 */
export function getUnlockedFeatures(level: number): string[] {
  const features: string[] = [];
  for (let l = 1; l <= level; l++) {
    const levelFeatures = FEATURE_UNLOCK_MAP[l];
    if (levelFeatures) {
      features.push(...levelFeatures);
    }
  }
  return features;
}

/**
 * Check if a specific feature is unlocked at the given level.
 */
export function isFeatureUnlocked(level: number, featureId: string): boolean {
  const unlocked = getUnlockedFeatures(level);
  return unlocked.includes(featureId);
}

/**
 * Get the next set of features to be unlocked and the XP needed.
 */
export function getNextUnlock(level: number): {
  level: number;
  features: string[];
  xpNeeded: number;
} | null {
  // Find the next level that has features to unlock
  for (let l = level + 1; l <= 8; l++) {
    const features = FEATURE_UNLOCK_MAP[l];
    if (features && features.length > 0) {
      // Map CP levels: levels 1-5 are mapped from CP_LEVELS, levels 6-8 extend beyond
      const cpLevel = Math.min(l, 5) as CPLevel;
      const cpLevelData = CP_LEVELS.find(cl => cl.level === cpLevel);
      const xpNeeded = cpLevelData ? cpLevelData.min_points : l * 1000;

      return { level: l, features, xpNeeded };
    }
  }
  return null;
}

/**
 * Get the level at which a feature unlocks.
 */
export function getFeatureUnlockLevel(featureId: string): number {
  for (const [levelStr, features] of Object.entries(FEATURE_UNLOCK_MAP)) {
    if (features.includes(featureId)) {
      return parseInt(levelStr, 10);
    }
  }
  return 1;
}

/**
 * Get a user-friendly lock message for a feature (in Portuguese).
 */
export function getFeatureGateMessage(featureId: string): string {
  const displayName = FEATURE_DISPLAY_NAMES[featureId] || featureId;
  const unlockLevel = getFeatureUnlockLevel(featureId);
  return `${displayName} sera desbloqueado no Nivel ${unlockLevel}`;
}

/**
 * Get the display name for a feature.
 */
export function getFeatureDisplayName(featureId: string): string {
  return FEATURE_DISPLAY_NAMES[featureId] || featureId;
}

/**
 * Get progress info toward unlocking a specific feature.
 */
export function getFeatureProgress(
  currentPoints: number,
  featureId: string
): {
  isUnlocked: boolean;
  unlockLevel: number;
  displayName: string;
  progress: ReturnType<typeof getProgressToNextLevel>;
} {
  const unlockLevel = getFeatureUnlockLevel(featureId);
  const progress = getProgressToNextLevel(currentPoints);
  const currentLevel = progress.current_level;
  const isUnlocked = currentLevel >= unlockLevel;

  return {
    isUnlocked,
    unlockLevel,
    displayName: getFeatureDisplayName(featureId),
    progress,
  };
}
