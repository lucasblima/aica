/**
 * SwimFlux Module - Core Types
 *
 * Type definitions for the SwimFlux swim training management module.
 * Based on PRD v1.0 - February 2026
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

/**
 * Athlete progression levels (7 total)
 */
export type AthleteLevel =
  | 'iniciante_1'
  | 'iniciante_2'
  | 'iniciante_3'
  | 'intermediario_1'
  | 'intermediario_2'
  | 'intermediario_3'
  | 'avancado';

/**
 * Athlete account status
 */
export type AthleteStatus = 'active' | 'paused' | 'trial' | 'churned';

/**
 * Workout block status
 */
export type BlockStatus = 'draft' | 'active' | 'completed' | 'cancelled';

/**
 * Weekly plan delivery status
 */
export type PlanStatus = 'pending' | 'sent' | 'acknowledged';

/**
 * Alert types by category
 */
export type AlertType = 'health' | 'motivation' | 'absence' | 'custom';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Exercise categories for workout library
 */
export type ExerciseCategory = 'warmup' | 'main' | 'technique' | 'cooldown' | 'dryland';

// ============================================
// DATABASE MODELS
// ============================================

/**
 * Athlete profile managed by Staff (Coach)
 */
export interface Athlete {
  id: string;
  user_id: string; // Coach who owns this athlete
  name: string;
  email?: string;
  phone: string; // WhatsApp format: +5511987654321
  level: AthleteLevel;
  status: AthleteStatus;
  trial_expires_at?: string; // ISO 8601
  onboarding_data?: Record<string, unknown>; // AI onboarding responses
  anamnesis?: AnamnesisData;
  created_at: string;
  updated_at: string;
}

/**
 * Health and background data from athlete
 */
export interface AnamnesisData {
  injuries?: string[];
  chronic_pain?: string[];
  sleep_quality?: 'poor' | 'fair' | 'good' | 'excellent';
  stress_level?: 'low' | 'medium' | 'high';
  nutrition_notes?: string;
  medications?: string[];
}

/**
 * 12-week workout block prescribed via Canvas
 */
export interface WorkoutBlock {
  id: string;
  user_id: string; // Coach
  athlete_id: string;
  title: string; // e.g., "Bloco 1 - Base Aeróbica"
  start_date: string; // ISO 8601 date
  end_date: string; // start_date + 12 weeks
  status: BlockStatus;
  canvas_data: CanvasData;
  progression_notes?: string;
  created_at: string;
}

/**
 * Canvas visual structure for drag-and-drop editor
 */
export interface CanvasData {
  weeks: WeekData[];
  metadata?: {
    focus?: string; // e.g., "Aerobic Base"
    intensity_profile?: 'progressive' | 'steady' | 'undulating';
  };
}

/**
 * Single week within a 12-week block
 */
export interface WeekData {
  week_number: number; // 1-12
  days: DayData[];
  notes?: string;
}

/**
 * Single training day
 */
export interface DayData {
  day_of_week: number; // 0-6 (Sunday-Saturday)
  exercises: ExerciseInstance[];
  rest_day?: boolean;
}

/**
 * Exercise instance within a workout
 */
export interface ExerciseInstance {
  id: string;
  exercise_id?: string; // FK to exercise_library
  name: string;
  category: ExerciseCategory;
  sets?: number;
  reps?: string; // e.g., "4x100m"
  rest?: string; // e.g., "30s"
  notes?: string;
  order: number; // Display order
}

/**
 * Weekly training plan sent to athlete via WhatsApp
 */
export interface WeeklyPlan {
  id: string;
  block_id: string;
  athlete_id: string;
  week_number: number; // 1-12
  plan_data: WeekData;
  sent_at?: string;
  sent_via?: 'whatsapp' | 'email' | 'manual';
  status: PlanStatus;
}

/**
 * Feedback from athlete collected via WhatsApp
 */
export interface Feedback {
  id: string;
  athlete_id: string;
  weekly_plan_id: string;
  completed_workout: boolean;
  volume_pct: number; // 0-100
  intensity_pct: number; // 0-100
  raw_message: string; // Original WhatsApp message
  parsed_data?: Record<string, unknown>;
  sentiment_score?: number; // -1 to 1
  has_critical_keywords: boolean;
  critical_keywords?: string[];
  ia_analysis?: IAAnalysis;
  created_at: string;
}

/**
 * AI analysis result from Gemini
 */
export interface IAAnalysis {
  summary: string;
  recommendations: string[];
  suggested_adjustments?: {
    volume?: number; // % adjustment
    intensity?: number; // % adjustment
    rest_days?: number;
  };
  confidence_score?: number; // 0-1
}

/**
 * Alert triggered by critical keywords in feedback
 */
export interface Alert {
  id: string;
  user_id: string; // Coach to notify
  athlete_id: string;
  feedback_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  keywords_detected: string[];
  message_preview: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

/**
 * Exercise from coach's personal library
 */
export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  category: ExerciseCategory;
  description?: string;
  default_sets?: number;
  default_reps?: string;
  default_rest?: string;
  level_range?: AthleteLevel[];
  tags?: string[];
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * FSM states for SwimFlux module navigation
 */
export type SwimFluxMode =
  | 'viewing_dashboard'      // Main dashboard view
  | 'viewing_athlete_detail' // Single athlete 12-week timeline
  | 'editing_canvas'         // Canvas editor for workout blocks
  | 'managing_alerts';       // Alerts center

/**
 * Global state for SwimFlux module (Context)
 */
export interface SwimFluxState {
  mode: SwimFluxMode;
  selectedAthleteId: string | null;
  selectedBlockId: string | null;
  alertFilters: {
    type?: AlertType;
    severity?: AlertSeverity;
    unacknowledged_only?: boolean;
  };
  canvasEditMode: boolean;
}

/**
 * Actions for SwimFlux state transitions
 */
export type SwimFluxAction =
  | { type: 'VIEW_DASHBOARD' }
  | { type: 'VIEW_ATHLETE_DETAIL'; payload: { athleteId: string } }
  | { type: 'EDIT_CANVAS'; payload: { blockId: string; athleteId: string } }
  | { type: 'MANAGE_ALERTS'; payload?: { filters?: SwimFluxState['alertFilters'] } }
  | { type: 'UPDATE_ALERT_FILTERS'; payload: SwimFluxState['alertFilters'] }
  | { type: 'TOGGLE_CANVAS_EDIT_MODE' };

/**
 * Context value exposed to components
 */
export interface SwimFluxContextValue {
  state: SwimFluxState;
  dispatch: React.Dispatch<SwimFluxAction>;
  actions: SwimFluxActions;
}

/**
 * Convenience action creators
 */
export interface SwimFluxActions {
  viewDashboard: () => void;
  viewAthleteDetail: (athleteId: string) => void;
  editCanvas: (blockId: string, athleteId: string) => void;
  manageAlerts: (filters?: SwimFluxState['alertFilters']) => void;
  updateAlertFilters: (filters: SwimFluxState['alertFilters']) => void;
  toggleCanvasEditMode: () => void;
}

// ============================================
// COMPONENT PROPS
// ============================================

/**
 * Props for AthleteCard component
 */
export interface AthleteCardProps {
  athlete: Athlete;
  recentFeedbacks?: Feedback[];
  activeAlerts?: Alert[];
  adherenceRate?: number; // 0-100
  onClick?: () => void;
}

/**
 * Props for AlertBadge component
 */
export interface AlertBadgeProps {
  alert: Alert;
  compact?: boolean;
  onClick?: () => void;
}

/**
 * Props for LevelBadge component
 */
export interface LevelBadgeProps {
  level: AthleteLevel;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Props for ProgressionBar component
 */
export interface ProgressionBarProps {
  currentWeek: number; // 1-12
  totalWeeks: number; // Always 12
  adherenceRate: number; // 0-100
  completedWorkouts?: number;
  totalWorkouts?: number;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Data load result for async operations
 */
export interface SwimFluxLoadResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

/**
 * Athlete with computed metrics
 */
export interface AthleteWithMetrics extends Athlete {
  current_block?: WorkoutBlock;
  current_week?: number;
  adherence_rate?: number;
  active_alerts_count?: number;
  last_feedback_at?: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Initial state for SwimFluxContext
 */
export const INITIAL_SWIMFLUX_STATE: SwimFluxState = {
  mode: 'viewing_dashboard',
  selectedAthleteId: null,
  selectedBlockId: null,
  alertFilters: {
    unacknowledged_only: true,
  },
  canvasEditMode: false,
};

/**
 * Level display names in Portuguese
 */
export const LEVEL_LABELS: Record<AthleteLevel, string> = {
  iniciante_1: 'Iniciante I',
  iniciante_2: 'Iniciante II',
  iniciante_3: 'Iniciante III',
  intermediario_1: 'Intermediário I',
  intermediario_2: 'Intermediário II',
  intermediario_3: 'Intermediário III',
  avancado: 'Avançado',
};

/**
 * Status display configuration
 */
export const STATUS_CONFIG: Record<AthleteStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'green' },
  paused: { label: 'Pausado', color: 'yellow' },
  trial: { label: 'Trial', color: 'blue' },
  churned: { label: 'Inativo', color: 'gray' },
};

/**
 * Alert severity colors (Ceramic Design System)
 */
export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};
