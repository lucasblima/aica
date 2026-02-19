/**
 * Flow Module Types - Sistema de Prescrição Inteligente de Treino
 *
 * Comprehensive type definitions for the 5-screen Flow module:
 * - Tela 1: Biblioteca de Templates
 * - Tela 2: Editor de Microciclo
 * - Tela 3: Motor de Nivelamento
 * - Tela 4: Calculadora de Intensidade
 * - Tela 5: CRM e Command Center
 */

import type { TrainingModality } from './flux';
import type {
  ExerciseStructureV2,
  WorkoutCategorySimplified,
  WorkoutTemplateV2,
  CreateWorkoutTemplateV2Input,
  UpdateWorkoutTemplateV2Input,
} from './series';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * @deprecated Use WorkoutCategorySimplified from series.ts instead
 * V2 removes 'recovery' and 'test' categories
 */
export type WorkoutCategory = 'warmup' | 'main' | 'cooldown' | 'recovery' | 'test';
export type WorkoutIntensity = 'low' | 'medium' | 'high' | 'z1' | 'z2' | 'z3' | 'z4' | 'z5';
export type MicrocycleWeekFocus = 'volume' | 'intensity' | 'recovery' | 'test';
export type MicrocycleStatus = 'draft' | 'active' | 'completed' | 'archived';
export type AthleteLevel =
  | 'iniciante_1'
  | 'iniciante_2'
  | 'iniciante_3'
  | 'intermediario_1'
  | 'intermediario_2'
  | 'intermediario_3'
  | 'avancado';
export type AthleteStatus = 'active' | 'trial' | 'paused' | 'churned';
export type PaceZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';
export type SendMethod = 'whatsapp' | 'email' | 'app_notification';
export type ScheduledWorkoutStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type AutomationTriggerType =
  | 'microcycle_starts'
  | 'workout_completed'
  | 'workout_missed'
  | 'consistency_drops'
  | 'weekly_summary'
  | 'athlete_joins'
  | 'trial_expiring';

export type AutomationActionType =
  | 'send_whatsapp'
  | 'send_email'
  | 'create_alert'
  | 'adjust_workout'
  | 'send_notification';

export type CoachMessageTriggerType =
  | 'manual'
  | 'microcycle_start'
  | 'low_consistency'
  | 'missed_workout'
  | 'weekly_summary';

// ============================================================================
// EXERCISE STRUCTURE TYPES
// ============================================================================

/**
 * @deprecated Use ExerciseStructureV2 from series.ts instead
 * V2 uses unified series structure with warmup/series/cooldown
 */
export interface IntervalSet {
  duration: number; // seconds or meters
  intensity: number; // percentage or pace
  rest: number; // seconds
  repetitions: number;
}

/**
 * @deprecated Use ExerciseStructureV2 from series.ts instead
 * V2 uses unified series structure with warmup/series/cooldown
 */
export interface ExerciseStructure {
  // Strength/Circuit format
  sets?: number;
  reps?: number;
  rest?: number; // seconds between sets

  // Interval format (running, swimming, cycling)
  intervals?: IntervalSet[];

  // Continuous format
  distance?: number; // meters
  target_time?: number; // seconds

  // Notes
  description?: string;
  equipment?: string[];
}

// Re-export V2 as the preferred structure
export type { ExerciseStructureV2 } from './series';

// ============================================================================
// TABLE 1: WORKOUT_TEMPLATES
// ============================================================================

/**
 * @deprecated Use WorkoutTemplateV2 from series.ts instead
 * V2 removes: duration, intensity, ftp_percentage, pace_zone, css_percentage, rpe, tags, level, is_public, is_favorite
 * V2 uses: simplified category (3 options), ExerciseStructureV2 with series
 */
export interface WorkoutTemplate {
  id: string;
  user_id: string;

  // Basic Info
  name: string;
  description?: string;
  category: WorkoutCategory;
  modality: TrainingModality;

  // Exercise Details
  duration: number; // minutes
  intensity: WorkoutIntensity;
  exercise_structure?: ExerciseStructure;

  // Intensity Zones (modality-specific)
  ftp_percentage?: number; // cycling (50-120%)
  pace_zone?: PaceZone; // running
  css_percentage?: number; // swimming (60-110%)
  rpe?: number; // Rate of Perceived Exertion (1-10)

  // Tags & Organization
  tags?: string[];
  level?: AthleteLevel[];
  is_public?: boolean;
  is_favorite?: boolean;

  // Coach notes
  coach_notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  usage_count: number;
}

/**
 * @deprecated Use CreateWorkoutTemplateV2Input from series.ts instead
 */
export interface CreateWorkoutTemplateInput {
  name: string;
  description?: string;
  category: WorkoutCategory;
  modality: TrainingModality;
  duration: number;
  intensity: WorkoutIntensity;
  exercise_structure?: ExerciseStructure;
  ftp_percentage?: number;
  pace_zone?: PaceZone;
  css_percentage?: number;
  rpe?: number;
  tags?: string[];
  level?: AthleteLevel[];
  is_public?: boolean;
  coach_notes?: string;
}

/**
 * @deprecated Use UpdateWorkoutTemplateV2Input from series.ts instead
 */
export interface UpdateWorkoutTemplateInput extends Partial<CreateWorkoutTemplateInput> {
  id: string;
}

// Re-export V2 types as preferred
export type {
  WorkoutTemplateV2,
  CreateWorkoutTemplateV2Input,
  UpdateWorkoutTemplateV2Input,
  WorkoutCategorySimplified,
} from './series';

// ============================================================================
// TABLE 2: MICROCYCLES
// ============================================================================

export interface Microcycle {
  id: string;
  user_id: string;
  athlete_id: string;

  // Microcycle Info
  name: string;
  description?: string;
  week_1_focus: MicrocycleWeekFocus;
  week_2_focus: MicrocycleWeekFocus;
  week_3_focus: MicrocycleWeekFocus;

  // Date Range
  start_date: string; // ISO date
  end_date: string; // ISO date

  // Load Targets
  target_weekly_load?: number[]; // [350, 400, 250]
  actual_weekly_load?: number[]; // Auto-calculated

  // Status
  status: MicrocycleStatus;

  // Integration
  sent_to_whatsapp?: boolean;
  whatsapp_message_id?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateMicrocycleInput {
  athlete_id: string;
  name: string;
  description?: string;
  week_1_focus: MicrocycleWeekFocus;
  week_2_focus: MicrocycleWeekFocus;
  week_3_focus: MicrocycleWeekFocus;
  start_date: string;
  target_weekly_load?: number[];
}

export interface UpdateMicrocycleInput extends Partial<CreateMicrocycleInput> {
  id: string;
  status?: MicrocycleStatus;
}

// ============================================================================
// TABLE 3: WORKOUT_SLOTS
// ============================================================================

export interface WorkoutSlot {
  id: string;
  user_id: string;
  microcycle_id: string;
  template_id?: string;

  // Slot Position
  week_number: number; // 1-3
  day_of_week: number; // 1-7
  start_time?: string; // "HH:MM" e.g. "09:00", "14:30"

  // Workout Details
  name: string;
  duration: number;
  intensity: WorkoutIntensity;
  modality: TrainingModality;
  exercise_structure?: ExerciseStructure;

  // Intensity Overrides
  ftp_percentage?: number;
  pace_zone?: PaceZone;
  css_percentage?: number;
  rpe?: number;

  // Coach Notes
  coach_notes?: string;
  athlete_feedback?: string;

  // Completion
  completed: boolean;
  completed_at?: string;
  completion_data?: {
    duration_actual?: number;
    rpe_actual?: number;
    notes?: string;
  };

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateWorkoutSlotInput {
  microcycle_id: string;
  template_id?: string;
  week_number: number;
  day_of_week: number;
  start_time?: string; // "HH:MM"
  name: string;
  duration: number;
  intensity: WorkoutIntensity;
  modality: TrainingModality;
  exercise_structure?: ExerciseStructure;
  ftp_percentage?: number;
  pace_zone?: PaceZone;
  css_percentage?: number;
  rpe?: number;
  coach_notes?: string;
}

export interface UpdateWorkoutSlotInput extends Partial<CreateWorkoutSlotInput> {
  id: string;
  athlete_feedback?: string;
  completed?: boolean;
  completion_data?: WorkoutSlot['completion_data'];
}

// ============================================================================
// TABLE 4: ATHLETE_PROFILES
// ============================================================================

export interface FlowAthleteProfile {
  id: string;
  user_id: string;
  athlete_id: string; // Unique identifier (athlete-1, etc)

  // Basic Info
  name: string;
  email?: string;
  phone?: string;

  // Training Profile
  modality: TrainingModality;
  level: AthleteLevel;

  // Performance Thresholds
  ftp?: number; // watts
  pace_threshold?: string; // '4:30/km'
  swim_css?: string; // '1:30/100m'
  last_test_date?: string;

  // Training History
  weekly_volume_average?: number; // minutes per week
  consistency_rate?: number; // 0-100%
  current_microcycle_id?: string;

  // Status
  status: AthleteStatus;
  trial_expires_at?: string;

  // Anamnese
  anamnesis?: {
    sleep_quality?: string;
    stress_level?: string;
    injuries?: string[];
    goals?: string[];
    availability?: string; // 'morning', 'evening', 'flexible'
  };

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateFlowAthleteProfileInput {
  athlete_id: string;
  name: string;
  email?: string;
  phone?: string;
  modality: TrainingModality;
  level: AthleteLevel;
  ftp?: number;
  pace_threshold?: string;
  swim_css?: string;
  status?: AthleteStatus;
  anamnesis?: FlowAthleteProfile['anamnesis'];
}

export interface UpdateFlowAthleteProfileInput extends Partial<CreateFlowAthleteProfileInput> {
  id: string;
  weekly_volume_average?: number;
  consistency_rate?: number;
  current_microcycle_id?: string;
}

// ============================================================================
// TABLE 5: COACH_MESSAGES
// ============================================================================

export interface CoachMessage {
  id: string;
  user_id: string;

  // Message Info
  name: string;
  message_template: string; // Supports {{athlete_name}}, {{week_number}}, etc
  trigger_type: CoachMessageTriggerType;

  // Conditions
  applies_to_modality?: TrainingModality[];
  applies_to_level?: AthleteLevel[];
  consistency_threshold?: number;

  // Status
  is_active: boolean;

  // Usage Stats
  times_sent: number;
  last_sent_at?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateCoachMessageInput {
  name: string;
  message_template: string;
  trigger_type: CoachMessageTriggerType;
  applies_to_modality?: TrainingModality[];
  applies_to_level?: AthleteLevel[];
  consistency_threshold?: number;
  is_active?: boolean;
}

export interface UpdateCoachMessageInput extends Partial<CreateCoachMessageInput> {
  id: string;
}

// ============================================================================
// TABLE 6: SCHEDULED_WORKOUTS
// ============================================================================

export interface ScheduledWorkout {
  id: string;
  user_id: string;
  microcycle_id: string;
  athlete_id: string;

  // Scheduling
  scheduled_for: string; // ISO timestamp
  send_method: SendMethod;

  // Message Content
  message_text: string;
  message_data?: {
    week_workouts?: WorkoutSlot[];
    load_total?: number;
    focus_area?: string;
  };

  // Status
  status: ScheduledWorkoutStatus;
  sent_at?: string;
  failed_reason?: string;

  // WhatsApp Integration
  whatsapp_message_id?: string;
  whatsapp_recipient_phone?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledWorkoutInput {
  microcycle_id: string;
  athlete_id: string;
  scheduled_for: string;
  send_method?: SendMethod;
  message_text: string;
  message_data?: ScheduledWorkout['message_data'];
  whatsapp_recipient_phone?: string;
}

export interface UpdateScheduledWorkoutInput extends Partial<CreateScheduledWorkoutInput> {
  id: string;
  status?: ScheduledWorkoutStatus;
  failed_reason?: string;
}

// ============================================================================
// TABLE 7: WORKOUT_AUTOMATIONS
// ============================================================================

export interface WorkoutAutomation {
  id: string;
  user_id: string;

  // Automation Info
  name: string;
  description?: string;
  is_active: boolean;

  // Trigger Configuration
  trigger_type: AutomationTriggerType;
  trigger_config?: {
    consistency_threshold?: number;
    days_before_expiry?: number;
    missed_workout_count?: number;
  };

  // Action Configuration
  action_type: AutomationActionType;
  action_config?: {
    message_template_id?: string;
    recipient?: 'athlete' | 'coach';
    alert_severity?: 'low' | 'medium' | 'high';
    adjustment_percentage?: number;
  };

  // Filters
  applies_to_athletes?: string[];
  applies_to_modality?: TrainingModality[];
  applies_to_level?: AthleteLevel[];

  // Usage Stats
  times_triggered: number;
  last_triggered_at?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateWorkoutAutomationInput {
  name: string;
  description?: string;
  trigger_type: AutomationTriggerType;
  trigger_config?: WorkoutAutomation['trigger_config'];
  action_type: AutomationActionType;
  action_config?: WorkoutAutomation['action_config'];
  applies_to_athletes?: string[];
  applies_to_modality?: TrainingModality[];
  applies_to_level?: AthleteLevel[];
  is_active?: boolean;
}

export interface UpdateWorkoutAutomationInput extends Partial<CreateWorkoutAutomationInput> {
  id: string;
}

// ============================================================================
// COMPUTED/HELPER TYPES
// ============================================================================

export interface MicrocycleWithSlots extends Microcycle {
  slots: WorkoutSlot[];
  athlete?: FlowAthleteProfile;
  completion_percentage: number; // 0-100
  total_tss: number;
}

export interface WeekSummary {
  week_number: number;
  focus: MicrocycleWeekFocus;
  target_load: number;
  actual_load: number;
  slots: WorkoutSlot[];
  completion_rate: number; // 0-100
}

export interface IntensityCalculation {
  modality: TrainingModality;
  base_threshold: number | string; // FTP watts, Pace, or CSS
  target_zone: number; // 21-25 for Z-Score
  recommended_intensity: number | string;
  workout_examples: string[];
}

export interface LevelingRecommendation {
  athlete_id: string;
  current_level: AthleteLevel;
  recommended_level: AthleteLevel;
  confidence: number; // 0-100
  reasoning: string;
  metrics: {
    consistency_rate: number;
    weekly_volume: number;
    performance_trend: 'improving' | 'stable' | 'declining';
  };
}

export interface AutomationLog {
  automation_id: string;
  trigger_type: AutomationTriggerType;
  action_type: AutomationActionType;
  athlete_id: string;
  triggered_at: string;
  success: boolean;
  details?: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface TemplateFilters {
  modality?: TrainingModality;
  category?: WorkoutCategory;
  intensity?: WorkoutIntensity;
  search?: string;
  favorites_only?: boolean;
}

export interface MicrocycleEditorState {
  microcycle: Microcycle | null;
  slots: WorkoutSlot[];
  selectedSlot: WorkoutSlot | null;
  draggedTemplate: WorkoutTemplate | null;
  unsavedChanges: boolean;
}

export interface CRMFilters {
  modality?: TrainingModality;
  level?: AthleteLevel;
  status?: AthleteStatus;
  consistency_min?: number;
  consistency_max?: number;
  search?: string;
}

export interface BulkActionPayload {
  athlete_ids: string[];
  action: 'send_message' | 'create_microcycle' | 'adjust_level' | 'archive';
  data?: any;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface FlowModuleStats {
  total_templates: number;
  total_microcycles: number;
  active_microcycles: number;
  total_athletes: number;
  active_athletes: number;
  avg_consistency_rate: number;
  total_automations: number;
  active_automations: number;
}

export interface TemplateUsageStats {
  template_id: string;
  template_name: string;
  usage_count: number;
  avg_rating?: number;
  last_used_at?: string;
}
