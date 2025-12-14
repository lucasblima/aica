/**
 * Academia Archetype - Extended Type Definitions
 *
 * Additional types for expanded Academia functionality including:
 * - Module/section tracking
 * - Learning materials management
 * - Explicit note linking (knowledge graph)
 * - Mentorship session tracking
 * - Development goals with milestones
 *
 * These types extend the base Academia types and can be used optionally.
 */

import type {
  AcademiaJourney,
  AcademiaNote,
  AcademiaMentorship,
} from './types';

// ============================================================================
// ENUMS & UNION TYPES
// ============================================================================

/**
 * Material/resource types
 */
export type MaterialType = 'pdf' | 'video' | 'article' | 'book' | 'podcast' | 'other';

/**
 * Material read status
 */
export type MaterialReadStatus = 'unread' | 'reading' | 'read';

/**
 * Note link relationship types
 */
export type NoteLinkType = 'related' | 'supports' | 'contradicts' | 'extends' | 'example';

/**
 * Mentorship session status
 */
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

/**
 * Development goal categories
 */
export type GoalCategory = 'skill' | 'knowledge' | 'certification' | 'career' | 'personal';

/**
 * Goal status
 */
export type GoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'abandoned';

/**
 * Module/section status
 */
export type ModuleStatus = 'locked' | 'available' | 'in_progress' | 'completed';

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Academia Module - Course/Journey modules or sections
 *
 * Represents individual modules or sections within a learning journey,
 * allowing for granular progress tracking.
 */
export interface AcademiaModule {
  id: string;
  journey_id: string;
  name: string;
  order: number;
  status: ModuleStatus;
  duration_minutes?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Academia Material - Study materials and resources
 *
 * Represents learning materials (PDFs, videos, articles, books, etc.)
 * associated with journeys or stored independently.
 */
export interface AcademiaMaterial {
  id: string;
  journey_id?: string;
  space_id: string;
  name: string;
  type: MaterialType;
  url?: string;
  file_path?: string;
  notes?: string;
  read_status: MaterialReadStatus;
  rating?: number; // 1-5
  created_at: string;
  updated_at: string;
}

/**
 * Academia Note Link - Explicit links between notes
 *
 * Represents typed relationships between notes for building
 * a knowledge graph (Zettelkasten-style).
 */
export interface AcademiaNoteLink {
  id: string;
  from_note_id: string;
  to_note_id: string;
  link_type: NoteLinkType;
  context?: string;
  created_at: string;
}

/**
 * Academia Mentorship Session - Individual mentorship sessions
 *
 * Tracks scheduled and completed mentorship sessions with notes,
 * action items, and ratings.
 */
export interface AcademiaMentorshipSession {
  id: string;
  mentorship_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  status: SessionStatus;
  agenda?: string;
  notes?: string;
  action_items?: string[];
  rating?: number; // 1-5
  created_at: string;
  updated_at: string;
}

/**
 * Academia Goal - Development and learning goals
 *
 * Tracks personal development goals with milestones and
 * links to related learning journeys.
 */
export interface AcademiaGoal {
  id: string;
  space_id: string;
  user_id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  status: GoalStatus;
  target_date?: string;
  achieved_date?: string;
  milestones?: AcademiaGoalMilestone[];
  linked_journeys?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Goal Milestone - Sub-goals within a development goal
 */
export interface AcademiaGoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
}

// ============================================================================
// DTOs (DATA TRANSFER OBJECTS / PAYLOADS)
// ============================================================================

/**
 * Payload for creating a new module
 */
export interface CreateModulePayload {
  name: string;
  order: number;
  duration_minutes?: number;
}

/**
 * Payload for updating a module
 */
export interface UpdateModulePayload {
  name?: string;
  order?: number;
  status?: ModuleStatus;
  duration_minutes?: number;
  completed_at?: string;
}

/**
 * Payload for creating a new material
 */
export interface CreateMaterialPayload {
  name: string;
  type: MaterialType;
  journey_id?: string;
  url?: string;
  file_path?: string;
  notes?: string;
}

/**
 * Payload for updating a material
 */
export interface UpdateMaterialPayload {
  name?: string;
  type?: MaterialType;
  url?: string;
  file_path?: string;
  notes?: string;
  read_status?: MaterialReadStatus;
  rating?: number;
}

/**
 * Payload for creating a note link
 */
export interface CreateNoteLinkPayload {
  from_note_id: string;
  to_note_id: string;
  link_type: NoteLinkType;
  context?: string;
}

/**
 * Payload for creating a mentorship session
 */
export interface CreateMentorshipSessionPayload {
  scheduled_at: string;
  duration_minutes?: number;
  agenda?: string;
}

/**
 * Payload for updating a mentorship session
 */
export interface UpdateMentorshipSessionPayload {
  scheduled_at?: string;
  duration_minutes?: number;
  status?: SessionStatus;
  agenda?: string;
  notes?: string;
  action_items?: string[];
  rating?: number;
}

/**
 * Payload for creating a new goal
 */
export interface CreateGoalPayload {
  title: string;
  description?: string;
  category: GoalCategory;
  target_date?: string;
  milestones?: Omit<AcademiaGoalMilestone, 'id'>[];
  linked_journeys?: string[];
}

/**
 * Payload for updating a goal
 */
export interface UpdateGoalPayload {
  title?: string;
  description?: string;
  category?: GoalCategory;
  status?: GoalStatus;
  target_date?: string;
  achieved_date?: string;
  milestones?: AcademiaGoalMilestone[];
  linked_journeys?: string[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Journey with modules and materials
 */
export interface JourneyWithModulesAndMaterials extends AcademiaJourney {
  modules?: AcademiaModule[];
  materials?: AcademiaMaterial[];
}

/**
 * Note with explicit links
 */
export interface NoteWithExplicitLinks extends AcademiaNote {
  outgoing_links?: AcademiaNoteLink[];
  incoming_links?: AcademiaNoteLink[];
}

/**
 * Mentorship with sessions populated
 */
export interface MentorshipWithSessions extends AcademiaMentorship {
  sessions?: AcademiaMentorshipSession[];
}

/**
 * Goal with linked journeys populated
 */
export interface GoalWithJourneys extends AcademiaGoal {
  journeys?: AcademiaJourney[];
}

// ============================================================================
// TYPE HELPERS / UTILITY TYPES
// ============================================================================

/**
 * Extract material type
 */
export type AcademiaMaterialType = AcademiaMaterial['type'];

/**
 * Extract material read status
 */
export type AcademiaMaterialReadStatus = AcademiaMaterial['read_status'];

/**
 * Extract module status
 */
export type AcademiaModuleStatus = AcademiaModule['status'];

/**
 * Extract session status
 */
export type AcademiaSessionStatus = AcademiaMentorshipSession['status'];

/**
 * Extract note link type
 */
export type AcademiaNoteLinkType = AcademiaNoteLink['link_type'];

/**
 * Extract goal category
 */
export type AcademiaGoalCategory = AcademiaGoal['category'];

/**
 * Extract goal status
 */
export type AcademiaGoalStatus = AcademiaGoal['status'];
