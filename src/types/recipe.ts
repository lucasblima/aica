/**
 * RECIPE Framework Types
 * Gamification 2.0: Meaningful engagement through structured play
 *
 * RECIPE = Reflection, Exposition, Choice, Information, Play, Engagement
 *
 * This framework emphasizes:
 * - Intrinsic motivation over extrinsic rewards
 * - Learning and growth over points accumulation
 * - Player agency and meaningful choices
 * - Social connection and collaboration
 */

// ============================================================================
// RECIPE PILLARS
// ============================================================================

/**
 * The 6 pillars of the RECIPE framework
 */
export type RECIPEPillar =
  | 'reflection'   // R - Self-awareness activities
  | 'exposition'   // E - Learning and skill development
  | 'choice'       // C - Player agency and autonomy
  | 'information'  // I - Progress tracking and feedback
  | 'play'         // P - Fun and experimentation
  | 'engagement';  // E - Social connection and collaboration

/**
 * Display names for RECIPE pillars
 */
export const RECIPE_PILLAR_NAMES: Record<RECIPEPillar, string> = {
  reflection: 'Reflexão',
  exposition: 'Aprendizado',
  choice: 'Escolha',
  information: 'Informação',
  play: 'Jogo',
  engagement: 'Engajamento',
};

/**
 * Icons for RECIPE pillars
 */
export const RECIPE_PILLAR_ICONS: Record<RECIPEPillar, string> = {
  reflection: '🪞',
  exposition: '📚',
  choice: '🎯',
  information: '📊',
  play: '🎮',
  engagement: '🤝',
};

/**
 * Colors for RECIPE pillars
 */
export const RECIPE_PILLAR_COLORS: Record<RECIPEPillar, string> = {
  reflection: '#8B5CF6',  // Purple
  exposition: '#3B82F6',  // Blue
  choice: '#F59E0B',      // Amber
  information: '#10B981', // Emerald
  play: '#EC4899',        // Pink
  engagement: '#06B6D4',  // Cyan
};

/**
 * Descriptions for RECIPE pillars
 */
export const RECIPE_PILLAR_DESCRIPTIONS: Record<RECIPEPillar, string> = {
  reflection: 'Atividades de autoconhecimento e reflexão sobre seu progresso',
  exposition: 'Aprendizado contínuo e desenvolvimento de habilidades',
  choice: 'Autonomia para escolher seu próprio caminho',
  information: 'Feedback claro sobre seu progresso e conquistas',
  play: 'Experimentação e diversão no processo',
  engagement: 'Conexão social e colaboração com outros',
};

// ============================================================================
// OCTALYSIS CORE DRIVES (Reference)
// ============================================================================

/**
 * Octalysis Framework Core Drives
 * Used to categorize badges and rewards
 */
export type OctalysisDrive =
  | 'epic_meaning'          // 1. Epic Meaning & Calling
  | 'accomplishment'        // 2. Development & Accomplishment
  | 'empowerment'           // 3. Empowerment of Creativity
  | 'ownership'             // 4. Ownership & Possession
  | 'social_influence'      // 5. Social Influence & Relatedness
  | 'scarcity'              // 6. Scarcity & Impatience (Black Hat)
  | 'unpredictability'      // 7. Unpredictability & Curiosity
  | 'avoidance';            // 8. Loss & Avoidance (Black Hat)

/**
 * White Hat drives (sustainable, intrinsic motivation)
 * These are ENABLED by default
 */
export const WHITE_HAT_DRIVES: OctalysisDrive[] = [
  'epic_meaning',
  'accomplishment',
  'empowerment',
  'ownership',
  'social_influence',
];

/**
 * Black Hat drives (urgency, scarcity - use sparingly)
 * These are DISABLED by default
 */
export const BLACK_HAT_DRIVES: OctalysisDrive[] = [
  'scarcity',
  'unpredictability',
  'avoidance',
];

/**
 * Drive display names
 */
export const OCTALYSIS_DRIVE_NAMES: Record<OctalysisDrive, string> = {
  epic_meaning: 'Propósito Épico',
  accomplishment: 'Realização',
  empowerment: 'Empoderamento',
  ownership: 'Propriedade',
  social_influence: 'Influência Social',
  scarcity: 'Escassez',
  unpredictability: 'Imprevisibilidade',
  avoidance: 'Evitação',
};

// ============================================================================
// HAT TYPES (White Hat vs Black Hat)
// ============================================================================

/**
 * Hat type for categorizing mechanics
 * - white_hat: Sustainable, intrinsic motivation (ENABLED by default)
 * - black_hat: Urgency, external pressure (DISABLED by default)
 */
export type HatType = 'white_hat' | 'black_hat';

/**
 * Default settings for hat types
 */
export const HAT_TYPE_DEFAULTS: Record<HatType, boolean> = {
  white_hat: true,   // ENABLED by default
  black_hat: false,  // DISABLED by default
};

// ============================================================================
// USER ENGAGEMENT PROFILE
// ============================================================================

/**
 * User's engagement profile based on their interactions
 */
export interface UserEngagementProfile {
  user_id: string;

  // RECIPE pillar strengths (0-100)
  pillar_scores: Record<RECIPEPillar, number>;

  // Dominant pillars (top 2)
  dominant_pillars: RECIPEPillar[];

  // Growth areas (bottom 2)
  growth_pillars: RECIPEPillar[];

  // Octalysis drive preferences
  preferred_drives: OctalysisDrive[];

  // Settings
  black_hat_enabled: boolean;
  gamification_intensity: 'minimal' | 'moderate' | 'full';

  // Timestamps
  last_assessed_at: string | null;
  updated_at: string;
}

/**
 * Default engagement profile
 */
export const DEFAULT_ENGAGEMENT_PROFILE: Omit<UserEngagementProfile, 'user_id'> = {
  pillar_scores: {
    reflection: 50,
    exposition: 50,
    choice: 50,
    information: 50,
    play: 50,
    engagement: 50,
  },
  dominant_pillars: [],
  growth_pillars: [],
  preferred_drives: WHITE_HAT_DRIVES,
  black_hat_enabled: false, // DISABLED by default
  gamification_intensity: 'moderate',
  last_assessed_at: null,
  updated_at: new Date().toISOString(),
};

// ============================================================================
// RECIPE ACTIVITY MAPPING
// ============================================================================

/**
 * Maps activity types to RECIPE pillars
 */
export interface RECIPEActivityMapping {
  activity_type: string;
  pillar: RECIPEPillar;
  cp_category?: string;
  description: string;
}

/**
 * Predefined activity mappings
 */
export const RECIPE_ACTIVITIES: RECIPEActivityMapping[] = [
  // Reflection activities
  { activity_type: 'journal_entry', pillar: 'reflection', cp_category: 'reflection', description: 'Escrever no diário' },
  { activity_type: 'mood_check', pillar: 'reflection', cp_category: 'presence', description: 'Check-in de humor' },
  { activity_type: 'gratitude_entry', pillar: 'reflection', cp_category: 'reflection', description: 'Registro de gratidão' },
  { activity_type: 'weekly_review', pillar: 'reflection', cp_category: 'reflection', description: 'Revisão semanal' },

  // Exposition activities
  { activity_type: 'complete_trail', pillar: 'exposition', cp_category: 'growth', description: 'Completar trilha' },
  { activity_type: 'read_article', pillar: 'exposition', cp_category: 'growth', description: 'Ler artigo' },
  { activity_type: 'skill_practice', pillar: 'exposition', cp_category: 'intention', description: 'Praticar habilidade' },

  // Choice activities
  { activity_type: 'set_intention', pillar: 'choice', cp_category: 'intention', description: 'Definir intenção' },
  { activity_type: 'prioritize_tasks', pillar: 'choice', cp_category: 'intention', description: 'Priorizar tarefas' },
  { activity_type: 'customize_workflow', pillar: 'choice', cp_category: 'intention', description: 'Personalizar workflow' },

  // Information activities
  { activity_type: 'view_progress', pillar: 'information', description: 'Ver progresso' },
  { activity_type: 'check_stats', pillar: 'information', description: 'Verificar estatísticas' },
  { activity_type: 'review_achievements', pillar: 'information', description: 'Revisar conquistas' },

  // Play activities
  { activity_type: 'explore_feature', pillar: 'play', description: 'Explorar feature' },
  { activity_type: 'try_experiment', pillar: 'play', cp_category: 'growth', description: 'Tentar experimento' },
  { activity_type: 'creative_capture', pillar: 'play', cp_category: 'presence', description: 'Captura criativa' },

  // Engagement activities
  { activity_type: 'relationship_care', pillar: 'engagement', cp_category: 'connection', description: 'Cuidar de relacionamento' },
  { activity_type: 'share_achievement', pillar: 'engagement', cp_category: 'connection', description: 'Compartilhar conquista' },
  { activity_type: 'help_contact', pillar: 'engagement', cp_category: 'connection', description: 'Ajudar contato' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get pillar display name
 */
export function getRECIPEPillarName(pillar: RECIPEPillar): string {
  return RECIPE_PILLAR_NAMES[pillar];
}

/**
 * Get pillar icon
 */
export function getRECIPEPillarIcon(pillar: RECIPEPillar): string {
  return RECIPE_PILLAR_ICONS[pillar];
}

/**
 * Get pillar color
 */
export function getRECIPEPillarColor(pillar: RECIPEPillar): string {
  return RECIPE_PILLAR_COLORS[pillar];
}

/**
 * Check if a drive is White Hat
 */
export function isWhiteHatDrive(drive: OctalysisDrive): boolean {
  return WHITE_HAT_DRIVES.includes(drive);
}

/**
 * Check if a drive is Black Hat
 */
export function isBlackHatDrive(drive: OctalysisDrive): boolean {
  return BLACK_HAT_DRIVES.includes(drive);
}

/**
 * Get activity pillar mapping
 */
export function getActivityPillar(activityType: string): RECIPEPillar | null {
  const mapping = RECIPE_ACTIVITIES.find(a => a.activity_type === activityType);
  return mapping?.pillar || null;
}

/**
 * Calculate dominant pillars from scores
 */
export function calculateDominantPillars(
  scores: Record<RECIPEPillar, number>
): RECIPEPillar[] {
  const sortedPillars = (Object.keys(scores) as RECIPEPillar[])
    .sort((a, b) => scores[b] - scores[a]);
  return sortedPillars.slice(0, 2);
}

/**
 * Calculate growth pillars from scores
 */
export function calculateGrowthPillars(
  scores: Record<RECIPEPillar, number>
): RECIPEPillar[] {
  const sortedPillars = (Object.keys(scores) as RECIPEPillar[])
    .sort((a, b) => scores[a] - scores[b]);
  return sortedPillars.slice(0, 2);
}

export default {
  RECIPE_PILLAR_NAMES,
  RECIPE_PILLAR_ICONS,
  RECIPE_PILLAR_COLORS,
  RECIPE_PILLAR_DESCRIPTIONS,
  WHITE_HAT_DRIVES,
  BLACK_HAT_DRIVES,
  HAT_TYPE_DEFAULTS,
  RECIPE_ACTIVITIES,
  getRECIPEPillarName,
  getRECIPEPillarIcon,
  getRECIPEPillarColor,
  isWhiteHatDrive,
  isBlackHatDrive,
  getActivityPillar,
  calculateDominantPillars,
  calculateGrowthPillars,
};
