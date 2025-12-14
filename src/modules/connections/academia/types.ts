/**
 * Academia Archetype - Type Definitions
 *
 * The "Library" of learning - supports learning journeys, knowledge notes,
 * mentorships, and credentials within Academia connection spaces.
 *
 * Design Philosophy: "Cultivo da Mente" - elegant typography, whitespace,
 * paper-like aesthetics, silent library atmosphere.
 */

// ============================================================================
// ENUMS & UNION TYPES
// ============================================================================

/**
 * Types of learning journeys
 */
export type JourneyType = 'course' | 'book' | 'certification' | 'mentorship' | 'workshop';

/**
 * Learning journey status
 */
export type JourneyStatus = 'planned' | 'active' | 'paused' | 'completed' | 'abandoned';

/**
 * Zettelkasten note classification
 */
export type NoteType = 'fleeting' | 'literature' | 'permanent';

/**
 * Mentorship relationship direction
 */
export type MentorshipRelationType = 'giving' | 'receiving';

/**
 * Mentorship session frequency
 */
export type MentorshipFrequency = 'weekly' | 'biweekly' | 'monthly' | 'ad-hoc';

/**
 * Mentorship status
 */
export type MentorshipStatus = 'active' | 'paused' | 'completed';

/**
 * Academic credential types
 */
export type CredentialType = 'certificate' | 'diploma' | 'badge' | 'publication' | 'award';

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Academia Journey - Learning paths (courses, books, certifications)
 *
 * Represents a structured learning journey with progress tracking,
 * time logging, and milestone management.
 */
export interface AcademiaJourney {
  id: string;
  space_id: string;

  // Journey information
  title: string;
  provider?: string;
  instructor?: string;
  journey_type: JourneyType;

  // Progress tracking
  total_modules?: number;
  completed_modules: number;
  progress_pct: number;

  // Timeline
  started_at?: string;
  target_completion?: string;
  completed_at?: string;

  // Time tracking
  estimated_hours?: number;
  logged_hours: number;

  // Resources
  url?: string;
  materials_path?: string;

  // Status
  status: JourneyStatus;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Academia Note - Zettelkasten-style knowledge notes
 *
 * Supports fleeting notes (quick thoughts), literature notes (from sources),
 * and permanent notes (synthesized knowledge) with bidirectional linking.
 */
export interface AcademiaNote {
  id: string;
  space_id: string;
  journey_id?: string;

  // Note content
  title: string;
  content: string;
  content_type: string;

  // Zettelkasten classification
  note_type: NoteType;

  // Source and links
  source_reference?: string;
  linked_note_ids: string[];

  // Categorization
  tags: string[];

  // AI-enhanced metadata
  ai_summary?: string;
  ai_key_concepts?: string[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Academia Mentorship - Mentorship relationships
 *
 * Supports both giving and receiving mentorship with session scheduling,
 * objectives tracking, and focus area management.
 */
export interface AcademiaMentorship {
  id: string;
  space_id: string;

  // Participants
  mentor_member_id?: string;
  mentee_member_id?: string;

  // Relationship direction
  relationship_type: MentorshipRelationType;

  // Mentorship details
  focus_areas: string[];
  objectives: MentorshipObjective[];

  // Schedule
  frequency?: MentorshipFrequency;
  duration_minutes: number;
  next_session_at?: string;

  // Status
  status: MentorshipStatus;
  started_at: string;
  ended_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Mentorship Objective
 */
export interface MentorshipObjective {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
}

/**
 * Academia Credential - Certificates, diplomas, badges, etc.
 *
 * Stores academic achievements with verification URLs and expiration tracking.
 */
export interface AcademiaCredential {
  id: string;
  space_id: string;
  journey_id?: string;

  // Credential information
  title: string;
  issuer: string;
  credential_type?: CredentialType;

  // Dates
  issued_at: string;
  expires_at?: string;

  // Verification
  credential_url?: string;
  credential_id?: string;

  // Document storage
  document_id?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DTOs (DATA TRANSFER OBJECTS / PAYLOADS)
// ============================================================================

/**
 * Payload for creating a new journey
 */
export interface CreateJourneyPayload {
  title: string;
  provider?: string;
  instructor?: string;
  journey_type: JourneyType;
  total_modules?: number;
  estimated_hours?: number;
  url?: string;
  target_completion?: string;
}

/**
 * Payload for updating a journey
 */
export interface UpdateJourneyPayload {
  title?: string;
  provider?: string;
  instructor?: string;
  total_modules?: number;
  completed_modules?: number;
  progress_pct?: number;
  started_at?: string;
  target_completion?: string;
  completed_at?: string;
  estimated_hours?: number;
  logged_hours?: number;
  url?: string;
  materials_path?: string;
  status?: JourneyStatus;
}

/**
 * Payload for creating a new note
 */
export interface CreateNotePayload {
  title: string;
  content: string;
  journey_id?: string;
  note_type?: NoteType;
  source_reference?: string;
  tags?: string[];
}

/**
 * Payload for updating a note
 */
export interface UpdateNotePayload {
  title?: string;
  content?: string;
  note_type?: NoteType;
  source_reference?: string;
  linked_note_ids?: string[];
  tags?: string[];
  ai_summary?: string;
  ai_key_concepts?: string[];
}

/**
 * Payload for creating a new mentorship
 */
export interface CreateMentorshipPayload {
  mentor_member_id?: string;
  mentee_member_id?: string;
  relationship_type: MentorshipRelationType;
  focus_areas: string[];
  objectives?: MentorshipObjective[];
  frequency?: MentorshipFrequency;
  duration_minutes?: number;
  next_session_at?: string;
}

/**
 * Payload for updating a mentorship
 */
export interface UpdateMentorshipPayload {
  mentor_member_id?: string;
  mentee_member_id?: string;
  focus_areas?: string[];
  objectives?: MentorshipObjective[];
  frequency?: MentorshipFrequency;
  duration_minutes?: number;
  next_session_at?: string;
  status?: MentorshipStatus;
  ended_at?: string;
}

/**
 * Payload for creating a new credential
 */
export interface CreateCredentialPayload {
  title: string;
  issuer: string;
  credential_type?: CredentialType;
  issued_at: string;
  expires_at?: string;
  credential_url?: string;
  credential_id?: string;
  journey_id?: string;
  document_id?: string;
}

/**
 * Payload for updating a credential
 */
export interface UpdateCredentialPayload {
  title?: string;
  issuer?: string;
  credential_type?: CredentialType;
  issued_at?: string;
  expires_at?: string;
  credential_url?: string;
  credential_id?: string;
  journey_id?: string;
  document_id?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Journey with populated relationship data
 */
export interface JourneyWithRelations extends AcademiaJourney {
  notes?: AcademiaNote[];
  credentials?: AcademiaCredential[];
}

/**
 * Note with linked notes populated
 */
export interface NoteWithLinks extends AcademiaNote {
  linked_notes?: AcademiaNote[];
  journey?: AcademiaJourney;
}

/**
 * Search result for knowledge search
 */
export interface NoteSearchResult {
  note: AcademiaNote;
  rank: number;
  snippet: string;
}
