/**
 * Type validation test file
 * This file tests that all Academia types are correctly defined
 */

import type {
  // Core types
  AcademiaJourney,
  AcademiaNote,
  AcademiaMentorship,
  MentorshipObjective,
  AcademiaCredential,
  // Core enums
  JourneyType,
  JourneyStatus,
  NoteType,
  MentorshipStatus,
  CredentialType,
  // Core DTOs
  CreateJourneyPayload,
  UpdateJourneyPayload,
  CreateNotePayload,
  UpdateNotePayload,
  CreateMentorshipPayload,
  UpdateMentorshipPayload,
  CreateCredentialPayload,
  UpdateCredentialPayload,
  // Core helpers
  JourneyWithRelations,
  NoteWithLinks,
  NoteSearchResult,
} from './types';

import type {
  // Extended types
  AcademiaModule,
  AcademiaMaterial,
  AcademiaNoteLink,
  AcademiaMentorshipSession,
  AcademiaGoal,
  AcademiaGoalMilestone,
  // Extended enums
  MaterialType,
  MaterialReadStatus,
  NoteLinkType,
  SessionStatus,
  GoalCategory,
  GoalStatus,
  ModuleStatus,
  // Extended DTOs
  CreateModulePayload,
  UpdateModulePayload,
  CreateMaterialPayload,
  UpdateMaterialPayload,
  CreateNoteLinkPayload,
  CreateMentorshipSessionPayload,
  UpdateMentorshipSessionPayload,
  CreateGoalPayload,
  UpdateGoalPayload,
  // Extended helpers
  JourneyWithModulesAndMaterials,
  NoteWithExplicitLinks,
  MentorshipWithSessions,
  GoalWithJourneys,
  // Type helpers
  AcademiaMaterialType,
  AcademiaModuleStatus,
  AcademiaSessionStatus,
  AcademiaNoteLinkType,
  AcademiaGoalCategory,
  AcademiaGoalStatus,
} from './types.extended';

// ============================================================================
// TYPE VALIDATION TESTS
// ============================================================================

// Test 1: Core journey type
const testJourney: AcademiaJourney = {
  id: 'test-id',
  space_id: 'space-id',
  title: 'Test Journey',
  journey_type: 'course',
  status: 'active',
  completed_modules: 0,
  progress_pct: 0,
  logged_hours: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 2: Extended module type
const testModule: AcademiaModule = {
  id: 'module-id',
  journey_id: testJourney.id,
  name: 'Module 1',
  order: 1,
  status: 'available',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 3: Extended material type
const testMaterial: AcademiaMaterial = {
  id: 'material-id',
  space_id: 'space-id',
  journey_id: testJourney.id,
  name: 'Study Material',
  type: 'pdf',
  read_status: 'unread',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 4: Core note type
const testNote: AcademiaNote = {
  id: 'note-id',
  space_id: 'space-id',
  title: 'Test Note',
  content: 'Content',
  content_type: 'markdown',
  note_type: 'permanent',
  linked_note_ids: [],
  tags: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 5: Extended note link type
const testNoteLink: AcademiaNoteLink = {
  id: 'link-id',
  from_note_id: testNote.id,
  to_note_id: 'another-note-id',
  link_type: 'supports',
  created_at: new Date().toISOString(),
};

// Test 6: Core mentorship type
const testMentorship: AcademiaMentorship = {
  id: 'mentorship-id',
  space_id: 'space-id',
  relationship_type: 'giving',
  focus_areas: ['Career'],
  objectives: [],
  duration_minutes: 60,
  status: 'active',
  started_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 7: Extended mentorship session type
const testSession: AcademiaMentorshipSession = {
  id: 'session-id',
  mentorship_id: testMentorship.id,
  scheduled_at: new Date().toISOString(),
  status: 'scheduled',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 8: Core credential type
const testCredential: AcademiaCredential = {
  id: 'credential-id',
  space_id: 'space-id',
  title: 'Certification',
  issuer: 'Test Org',
  issued_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 9: Extended goal type
const testGoal: AcademiaGoal = {
  id: 'goal-id',
  space_id: 'space-id',
  user_id: 'user-id',
  title: 'Learn TypeScript',
  category: 'skill',
  status: 'in_progress',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Test 10: Goal milestone
const testMilestone: AcademiaGoalMilestone = {
  id: 'milestone-id',
  title: 'Complete course',
  completed: false,
};

// Test 11: DTOs
const createJourneyPayload: CreateJourneyPayload = {
  title: 'New Journey',
  journey_type: 'course',
};

const createModulePayload: CreateModulePayload = {
  name: 'New Module',
  order: 1,
};

const createMaterialPayload: CreateMaterialPayload = {
  name: 'New Material',
  type: 'video',
};

const createNoteLinkPayload: CreateNoteLinkPayload = {
  from_note_id: 'note-1',
  to_note_id: 'note-2',
  link_type: 'related',
};

const createSessionPayload: CreateMentorshipSessionPayload = {
  scheduled_at: new Date().toISOString(),
};

const createGoalPayload: CreateGoalPayload = {
  title: 'New Goal',
  category: 'knowledge',
};

// Test 12: Helper types
const journeyWithRelations: JourneyWithRelations = {
  ...testJourney,
  notes: [testNote],
  credentials: [testCredential],
};

const journeyWithModules: JourneyWithModulesAndMaterials = {
  ...testJourney,
  modules: [testModule],
  materials: [testMaterial],
};

const noteWithLinks: NoteWithLinks = {
  ...testNote,
  linked_notes: [testNote],
};

const mentorshipWithSessions: MentorshipWithSessions = {
  ...testMentorship,
  sessions: [testSession],
};

const goalWithJourneys: GoalWithJourneys = {
  ...testGoal,
  journeys: [testJourney],
};

// Test 13: Type helpers
const journeyType: JourneyType = 'course';
const materialType: MaterialType = 'pdf';
const moduleStatus: ModuleStatus = 'completed';
const sessionStatus: SessionStatus = 'completed';
const goalStatus: GoalStatus = 'achieved';

// If this file compiles, all types are correctly defined!
console.log('✅ All Academia types are valid!');

export {};
