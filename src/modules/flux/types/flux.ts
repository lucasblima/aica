/**
 * Flux Module - Core Types
 *
 * Type definitions for the Flux training management module.
 * Supports multiple modalities: swimming, running, cycling, and strength training.
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
 * Simplified athlete levels (3 categories)
 * Used for modality-specific level assignment
 */
export type SimpleAthleteLevel = 'iniciante' | 'intermediario' | 'avancado';

/**
 * Modality with associated level
 * Athletes can have multiple modalities, each with its own level
 */
export interface ModalityLevel {
  modality: TrainingModality;
  level: SimpleAthleteLevel;
}

/**
 * Athlete account status
 */
export type AthleteStatus = 'active' | 'paused' | 'trial' | 'churned';

/**
 * Athlete invitation/linking status
 */
export type InvitationStatus = 'none' | 'pending' | 'connected';

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
export type AlertType = 'health' | 'motivation' | 'absence' | 'documents' | 'custom';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Exercise categories for workout library
 */
export type ExerciseCategory = 'warmup' | 'main' | 'technique' | 'cooldown' | 'dryland';

/**
 * Training modalities supported by Flux
 */
export type TrainingModality = 'swimming' | 'running' | 'cycling' | 'strength' | 'walking';

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
  modality: TrainingModality; // Primary training modality
  trial_expires_at?: string; // ISO 8601
  onboarding_data?: Record<string, unknown>; // AI onboarding responses
  anamnesis?: AnamnesisData;

  // User linking (athlete ↔ AICA user)
  auth_user_id?: string; // FK to auth.users — the athlete's own account
  linked_at?: string; // When the link was established
  invitation_status?: InvitationStatus; // 'none' | 'pending' | 'connected'
  invitation_sent_at?: string; // When invite email was sent
  invitation_email_status?: 'none' | 'sent' | 'delivered' | 'bounced' | 'failed';

  // Health documentation configuration (set by coach)
  requires_cardio_exam?: boolean; // Cardiological exam required
  requires_clearance_cert?: boolean; // Physical activity clearance certificate required
  allow_parq_onboarding?: boolean; // Allow athlete to complete PAR-Q questionnaire

  // Performance thresholds (for load calculation)
  ftp?: number; // Functional Threshold Power (watts) - cycling
  pace_threshold?: string; // Pace limiar (ex: "4:30/km") - running
  swim_css?: string; // Critical Swim Speed (ex: "1:30/100m") - swimming
  current_block_id?: string; // Reference to active workout block
  last_performance_test?: string; // Date of last FTP/CSS/Pace test (ISO 8601)

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
  title: string; // e.g., "Bloco 1 - Base Aerobica"
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

/**
 * Athlete portal profile returned by RPC get_my_athlete_profile()
 */
export interface MyAthleteProfile {
  athlete_id: string;
  athlete_name: string;
  coach_name: string;
  modality: TrainingModality;
  level: AthleteLevel;
  status: AthleteStatus;
  active_microcycle: {
    id: string;
    name: string;
    status: string;
    start_date: string;
    current_week: number;
    total_slots: number;
    completed_slots: number;
    slots: Array<{
      id: string;
      day_of_week: number;
      week_number: number;
      time_of_day: string | null;
      is_completed: boolean;
      completed_at: string | null;
      athlete_feedback: string | null;
      custom_duration: number | null;
      custom_notes: string | null;
      template: {
        id: string;
        name: string;
        category: string;
        duration: number;
        intensity: string;
      };
    }>;
  } | null;
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * FSM states for Flux module navigation
 */
export type FluxMode =
  | 'viewing_dashboard'      // Main dashboard view
  | 'viewing_athlete_detail' // Single athlete 12-week timeline
  | 'editing_canvas'         // Canvas editor for workout blocks
  | 'managing_alerts';       // Alerts center

/**
 * Global state for Flux module (Context)
 */
export interface FluxState {
  mode: FluxMode;
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
 * Actions for Flux state transitions
 */
export type FluxAction =
  | { type: 'VIEW_DASHBOARD' }
  | { type: 'VIEW_ATHLETE_DETAIL'; payload: { athleteId: string } }
  | { type: 'EDIT_CANVAS'; payload: { blockId: string; athleteId: string } }
  | { type: 'MANAGE_ALERTS'; payload?: { filters?: FluxState['alertFilters'] } }
  | { type: 'UPDATE_ALERT_FILTERS'; payload: FluxState['alertFilters'] }
  | { type: 'TOGGLE_CANVAS_EDIT_MODE' };

/**
 * Context value exposed to components
 */
export interface FluxContextValue {
  state: FluxState;
  dispatch: React.Dispatch<FluxAction>;
  actions: FluxActions;
}

/**
 * Convenience action creators
 */
export interface FluxActions {
  viewDashboard: () => void;
  viewAthleteDetail: (athleteId: string) => void;
  editCanvas: (blockId: string, athleteId: string) => void;
  manageAlerts: (filters?: FluxState['alertFilters']) => void;
  updateAlertFilters: (filters: FluxState['alertFilters']) => void;
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
export interface FluxLoadResult<T> {
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
  consistency_rate?: number; // % de treinos completados (0-100)
  active_alerts_count?: number;
  last_feedback_at?: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Initial state for FluxContext
 */
export const INITIAL_FLUX_STATE: FluxState = {
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
  intermediario_1: 'Intermediario I',
  intermediario_2: 'Intermediario II',
  intermediario_3: 'Intermediario III',
  avancado: 'Avancado',
};

/**
 * Simplified level display names
 */
export const SIMPLE_LEVEL_LABELS: Record<SimpleAthleteLevel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
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

/**
 * Training modality configuration
 */
export const MODALITY_CONFIG: Record<TrainingModality, { label: string; icon: string; color: string }> = {
  swimming: { label: 'Natacao', icon: '🏊', color: 'cyan' },
  running: { label: 'Corrida', icon: '🏃', color: 'green' },
  cycling: { label: 'Ciclismo', icon: '🚴', color: 'amber' },
  strength: { label: 'Forca', icon: '🏋️', color: 'purple' },
  walking: { label: 'Caminhada', icon: '🚶', color: 'blue' },
};

/**
 * All available training modalities
 */
export const TRAINING_MODALITIES: TrainingModality[] = ['swimming', 'running', 'cycling', 'strength', 'walking'];
