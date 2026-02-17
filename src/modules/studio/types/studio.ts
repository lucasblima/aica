/**
 * Studio Module Types
 *
 * Defines the core types for the Studio module, which is a generic
 * content creation hub (currently supports podcasts, extensible to video/articles).
 *
 * Key Pattern: Finite State Machine (FSM)
 * - StudioMode defines the current view state
 * - Transitions are explicit and controlled via StudioActions
 * - NO useEffect-based navigation logic
 */

import type { PodcastShow } from './podcast';

// ============================================
// STUDIO MODE (Finite State Machine)
// ============================================

/**
 * The primary state of the Studio view.
 * CRITICAL: Only ONE mode is active at a time.
 *
 * States:
 * - LOADING: Initial state while fetching data
 * - LIBRARY: Showing list of shows/projects
 * - SHOW_PAGE: Showing episodes for a specific podcast show
 * - WIZARD: Creating a new project
 * - WORKSPACE: Editing an existing project
 */
export type StudioMode = 'LOADING' | 'LIBRARY' | 'SHOW_PAGE' | 'WIZARD' | 'WORKSPACE';

// ============================================
// PROJECT TYPES
// ============================================

/**
 * Types of projects supported by Studio.
 * Extensible for future content types.
 */
export type ProjectType = 'podcast' | 'video' | 'article' | 'newsletter' | 'clip';

/**
 * Generic project representation in Studio.
 * Contains common fields across all project types.
 */
export interface StudioProject {
  id: string;
  type: ProjectType;
  title: string;
  description?: string;
  showId?: string; // For podcasts - references the parent show
  showTitle?: string; // Denormalized for display
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  metadata: ProjectMetadata;
}

/**
 * Type-specific metadata for projects.
 * Each project type can have its own metadata structure.
 */
export type ProjectMetadata =
  | PodcastProjectMetadata
  | VideoProjectMetadata
  | ArticleProjectMetadata
  | NewsletterProjectMetadata
  | ClipProjectMetadata;

export interface PodcastProjectMetadata {
  type: 'podcast';
  guestName?: string;
  episodeTheme?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  location?: string;
  season?: string;
  recordingDuration?: number;
}

export interface VideoProjectMetadata {
  type: 'video';
  // Future extension
}

export interface ArticleProjectMetadata {
  type: 'article';
  // Future extension
}

export interface NewsletterProjectMetadata {
  type: 'newsletter';
  subject?: string;
  template?: string;
  scheduledDate?: string;
}

export interface ClipProjectMetadata {
  type: 'clip';
  sourceProjectId?: string;
  platform?: string;
  caption?: string;
}

// ============================================
// STUDIO STATE
// ============================================

/**
 * Complete state of the Studio component.
 * Managed by StudioContext using useReducer.
 */
export interface StudioState {
  /** Current view mode (FSM state) */
  mode: StudioMode;

  /** Currently selected show (for podcasts) */
  currentShowId: string | null;
  currentShowTitle: string | null;

  /** Currently active project/episode */
  currentProject: StudioProject | null;

  /** Loading state for async operations */
  isLoading: boolean;

  /** Error message if something went wrong */
  error: string | null;

  /** User ID (from auth) */
  userId: string | null;
}

// ============================================
// STUDIO ACTIONS (State Transitions)
// ============================================

/**
 * All possible actions that can change StudioState.
 * These are the ONLY ways to transition between modes.
 */
export type StudioAction =
  // Mode transitions
  | { type: 'START_LOADING' }
  | { type: 'FINISH_LOADING'; payload: { project: StudioProject | null } }
  | { type: 'GO_TO_LIBRARY' }
  | { type: 'GO_TO_SHOW_PAGE'; payload: { showId: string; showTitle: string } }
  | { type: 'GO_TO_WIZARD' }
  | { type: 'GO_TO_WORKSPACE'; payload: StudioProject }

  // Show selection (for podcasts)
  | { type: 'SELECT_SHOW'; payload: { showId: string; showTitle: string } }
  | { type: 'CLEAR_SHOW' }

  // User/Auth
  | { type: 'SET_USER_ID'; payload: string | null }

  // Error handling
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// ============================================
// STUDIO CONTEXT
// ============================================

/**
 * Actions available through StudioContext.
 * These wrap dispatch calls with semantic names.
 */
export interface StudioActions {
  /** Navigate to library view */
  goToLibrary: () => void;

  /** Navigate to show page (podcast-specific) */
  goToShowPage: (showId: string, showTitle: string) => void;

  /** Navigate to wizard for creating new project */
  goToWizard: () => void;

  /** Navigate to workspace with a specific project */
  goToWorkspace: (project: StudioProject) => void;

  /** Select a show (for podcasts) */
  selectShow: (showId: string, showTitle: string) => void;

  /** Clear current show selection */
  clearShow: () => void;

  /** Set error message */
  setError: (error: string | null) => void;

  /** Clear error message */
  clearError: () => void;

  /** Set user ID from auth */
  setUserId: (userId: string | null) => void;
}

/**
 * Complete context value for StudioContext.
 */
export interface StudioContextValue {
  state: StudioState;
  actions: StudioActions;
}

// ============================================
// PROJECT TYPE CONFIG
// ============================================

/**
 * Configuration for a project type in Studio.
 * Used by wizard, library, and workspace to adapt per type.
 */
export interface ProjectTypeConfig {
  type: ProjectType;
  label: string;
  iconName: string;
  description: string;
  color: string;
  requiredFields: string[];
  optionalFields: string[];
  databaseTable: string;
  parentTable?: string;
  hasParentHierarchy: boolean;
  stages: string[];
  comingSoon: boolean;
}

// ============================================
// COMPONENT PROPS
// ============================================

/**
 * Props for StudioLibrary component.
 */
export interface StudioLibraryProps {
  onSelectShow: (showId: string, showTitle: string) => void;
  onSelectProject: (project: StudioProject) => void;
  onCreateNew: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

/**
 * Props for StudioWizard component.
 */
export interface StudioWizardProps {
  showId: string;
  userId: string;
  projectType?: ProjectType;
  onComplete: (project: StudioProject) => void;
  onCancel: () => void;
}

/**
 * Props for StudioWorkspace component.
 */
export interface StudioWorkspaceProps {
  project: StudioProject;
  onBack: () => void;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Result of loading studio data from database.
 */
export interface StudioDataLoadResult {
  shows: PodcastShow[];
  currentProject: StudioProject | null;
  error: string | null;
}

/**
 * Configuration for project creation in wizard.
 */
export interface CreateProjectConfig {
  type: ProjectType;
  showId?: string;
  title: string;
  description?: string;
  metadata: Partial<ProjectMetadata>;
}

// ============================================
// INITIAL STATE
// ============================================

/**
 * Initial state for StudioContext.
 * Used by the reducer as starting point.
 */
export const INITIAL_STUDIO_STATE: StudioState = {
  mode: 'LOADING',
  currentShowId: null,
  currentShowTitle: null,
  currentProject: null,
  isLoading: false,  // Fixed: was true, causing infinite loading screen
  error: null,
  userId: null,
};

// ============================================================================
// PHASE 1 — POST-PRODUCTION TYPES
// ============================================================================

export interface StudioTranscription {
  id: string;
  projectId: string;
  content: string;
  language: string;
  durationSeconds: number;
  speakers: { name: string; segments: { start: number; end: number; text: string }[] }[];
  chapters: { title: string; startSeconds: number; endSeconds: number }[];
  wordCount: number;
  createdAt: Date;
}

export interface StudioShowNotes {
  id: string;
  projectId: string;
  summary: string;
  highlights: string[];
  keyQuotes: string[];
  seoDescription: string;
  tags: string[];
  createdAt: Date;
}

export interface StudioClip {
  id: string;
  projectId: string;
  title: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  transcriptSegment: string;
  platform: string;
  status: 'suggested' | 'draft' | 'approved' | 'published';
  caption: string;
  hashtags: string[];
  thumbnailUrl?: string;
  createdAt: Date;
}

export interface StudioAsset {
  id: string;
  userId: string;
  projectId?: string;
  assetType: 'audio' | 'video' | 'image' | 'document' | 'transcript';
  fileUrl: string;
  fileSize: number;
  durationSeconds?: number;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: Date;
}

export interface StudioBrandKit {
  id: string;
  userId: string;
  brandName: string;
  logoUrl?: string;
  colorPrimary: string;
  colorSecondary: string;
  fontHeading: string;
  fontBody: string;
  toneOfVoice?: string;
  introAudioUrl?: string;
  outroAudioUrl?: string;
  createdAt: Date;
}

// ============================================================================
// PHASE 2 — ARTICLE / NEWSLETTER TYPES
// ============================================================================

export interface StudioArticleDraft {
  id: string;
  projectId: string;
  content: string;
  outline: { heading: string; subpoints: string[]; targetWords: number }[];
  wordCount: number;
  seoScore?: number;
  seoSuggestions: string[];
  status: 'draft' | 'review' | 'approved' | 'published';
  publishedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioNewsletter {
  id: string;
  projectId?: string;
  subject: string;
  content: string;
  template: string;
  scheduledAt?: Date;
  sentAt?: Date;
  recipientsCount: number;
  openRate: number;
  clickRate: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  createdAt: Date;
}

// ============================================================================
// PHASE 4 — DISTRIBUTION TYPES
// ============================================================================

export interface ContentCalendarEntry {
  id: string;
  userId: string;
  projectId?: string;
  clipId?: string;
  platform: 'spotify' | 'youtube' | 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'newsletter' | 'blog';
  scheduledAt: Date;
  publishedAt?: Date;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  caption: string;
  hashtags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// PHASE 5 — ANALYTICS + COLLABORATION TYPES
// ============================================================================

export interface StudioAnalyticsEntry {
  id: string;
  projectId?: string;
  platform: string;
  metricType: string;
  metricValue: number;
  recordedAt: Date;
}

export interface StudioTeamMember {
  id: string;
  memberEmail: string;
  role: 'admin' | 'editor' | 'designer' | 'viewer';
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'active' | 'revoked';
}

export interface StudioComment {
  id: string;
  projectId: string;
  assetId?: string;
  content: string;
  timestampSeconds?: number;
  parentCommentId?: string;
  resolved: boolean;
  createdAt: Date;
}
