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
  deepResearch?: DeepResearchResult;
  guestContext?: string;
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

  /** Project type for wizard (defaults to 'podcast') */
  wizardProjectType: ProjectType;
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
  | { type: 'GO_TO_WIZARD'; payload?: { projectType?: ProjectType } }
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
  goToWizard: (projectType?: ProjectType) => void;

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
  onCreateNew: (projectType?: ProjectType) => void;
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
  wizardProjectType: 'podcast',
};

// ============================================================================
// DEEP RESEARCH RESULT (AI Guest Research)
// ============================================================================

/**
 * Controversy object matching DB JSONB schema.
 *
 * DB column: `podcast_episodes.controversies` — JSONB array of objects.
 * @see supabase/migrations/20260217130000_studio_schema_alignment.sql
 *   COMMENT: 'Array of controversy objects [{title, summary, source, sentiment, date}]'
 */
export interface DeepResearchControversy {
  title: string;
  summary: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  date: string;
}

/**
 * Result of deep AI research on a podcast guest.
 *
 * The `dossier.controversies` field maps to `podcast_episodes.controversies` JSONB column,
 * which stores an array of `{title, summary, source, sentiment, date}` objects.
 *
 * @see supabase/migrations/20260217130000_studio_schema_alignment.sql
 */
export interface DeepResearchResult {
  dossier: {
    biography: string;
    technicalSheet: {
      fullName?: string;
      profession?: string;
      company?: string;
      education?: { degree: string; institution: string; year?: string }[];
      careerHighlights?: { title: string; organization: string; period?: string }[];
      socialMedia?: { platform: string; handle: string }[];
      keyFacts?: string[];
    };
    /**
     * Controversy objects matching DB JSONB schema.
     * DB stores as JSONB: [{title, summary, source, sentiment, date}].
     * Also accepts string[] for backward compatibility with older data.
     */
    controversies: (DeepResearchControversy | string)[];
    iceBreakers: string[];
    suggestedQuestions: { theme: string; questions: string[] }[];
  };
  suggestedThemes: string[];
  suggestedTitles: Record<string, string[]>;
  sources: { title: string; url: string }[];
  researchTimestamp: string;
  researchDepth: string;
  recentAppearances?: string;
}

// ============================================================================
// NORMALIZED TABLES — Episode Production & Publication (Sprint 3)
// ============================================================================

/**
 * Maps to `podcast_episode_production` table.
 * 1:1 relationship with podcast_episodes via episode_id (UNIQUE).
 * Contains recording status, file info, and transcript data.
 *
 * @see supabase/migrations/20260309000005_normalize_episodes_production.sql
 */
export interface EpisodeProduction {
  id: string;
  episodeId: string;
  recordingStatus: 'idle' | 'recording' | 'paused' | 'finished';
  recordingStartedAt: string | null;
  recordingFinishedAt: string | null;
  recordingDuration: number | null;
  recordingFilePath: string | null;
  recordingFileSize: number | null;
  transcript: string | null;
  transcriptGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Metadata for a generated video/audio clip */
export interface CutMetadata {
  start_time: number;
  end_time: number;
  title: string;
  platform: string;
}

/** Shared platform union for clips, calendar entries, and analytics */
export type StudioPlatform = 'spotify' | 'youtube' | 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'newsletter' | 'blog';

/**
 * Maps to `podcast_episode_publication` table.
 * 1:1 relationship with podcast_episodes via episode_id (UNIQUE).
 * Contains post-production data: cuts, blog, social, narrative scoring.
 *
 * @see supabase/migrations/20260309000006_normalize_episodes_publication.sql
 */
export interface EpisodePublication {
  id: string;
  episodeId: string;
  cutsGenerated: boolean;
  cutsMetadata: CutMetadata[] | null;
  blogPostGenerated: boolean;
  blogPostUrl: string | null;
  publishedToSocial: Record<string, boolean> | null;
  narrativeTensionScore: number | null;
  peakEndMoments: Record<string, unknown>[] | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PHASE 1 — POST-PRODUCTION TYPES
// ============================================================================

/**
 * AI-generated transcription for a project.
 * Maps to DB table: `studio_transcriptions`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 1.1)
 */
export interface StudioTranscription {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, NOT NULL) */
  projectId: string;
  /** DB column: `content` (TEXT) */
  content: string;
  /** DB column: `language` (TEXT, default 'pt-BR') */
  language: string;
  /** DB column: `duration_seconds` (INTEGER) */
  durationSeconds: number;
  /** DB column: `speakers` (JSONB, default '[]') */
  speakers: { name: string; segments: { start: number; end: number; text: string }[] }[];
  /** DB column: `chapters` (JSONB, default '[]') */
  chapters: { title: string; startSeconds: number; endSeconds: number }[];
  /** DB column: `word_count` (INTEGER) */
  wordCount: number;
  /** DB column: `created_at` (TIMESTAMPTZ) */
  createdAt: Date;
}

/**
 * AI-generated show notes for a project.
 * Maps to DB table: `studio_show_notes`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 1.2)
 */
export interface StudioShowNotes {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, NOT NULL) */
  projectId: string;
  /** DB column: `summary` (TEXT) */
  summary: string;
  /** DB column: `highlights` (TEXT[], default '{}') */
  highlights: string[];
  /** DB column: `key_quotes` (TEXT[], default '{}') */
  keyQuotes: string[];
  /** DB column: `seo_description` (TEXT) */
  seoDescription: string;
  /** DB column: `tags` (TEXT[], default '{}') */
  tags: string[];
  /** DB column: `created_at` (TIMESTAMPTZ) */
  createdAt: Date;
}

/**
 * Short-form content clip extracted from a project.
 * Maps to DB table: `studio_clips`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 1.3)
 */
export interface StudioClip {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, NOT NULL) */
  projectId: string;
  /** DB column: `title` (TEXT) */
  title: string;
  /** DB column: `start_time_seconds` (NUMERIC) */
  startTimeSeconds: number;
  /** DB column: `end_time_seconds` (NUMERIC) */
  endTimeSeconds: number;
  /** DB column: `transcript_segment` (TEXT) */
  transcriptSegment: string;
  /** DB column: `platform` (TEXT) */
  platform: StudioPlatform | string;
  /** DB column: `status` (TEXT, CHECK: 'suggested'|'draft'|'approved'|'published') */
  status: 'suggested' | 'draft' | 'approved' | 'published';
  /** DB column: `caption` (TEXT) */
  caption: string;
  /** DB column: `hashtags` (TEXT[], default '{}') */
  hashtags: string[];
  /** DB column: `thumbnail_url` (TEXT) */
  thumbnailUrl?: string;
  /** DB column: `created_at` (TIMESTAMPTZ) */
  createdAt: Date;
}

/**
 * Media asset for Studio projects.
 * Maps to DB table: `studio_assets`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 1.4)
 */
export interface StudioAsset {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, nullable) */
  projectId?: string;
  /** DB column: `asset_type` (TEXT, CHECK: 'audio'|'video'|'image'|'document'|'transcript') */
  assetType: 'audio' | 'video' | 'image' | 'document' | 'transcript';
  /** DB column: `file_url` (TEXT, NOT NULL) */
  fileUrl: string;
  /**
   * DB column: `file_size` (BIGINT).
   * Note: BIGINT in PostgreSQL can exceed Number.MAX_SAFE_INTEGER for very large files.
   * For files under ~9PB this is safe as a JS number.
   */
  fileSize: number;
  /** DB column: `duration_seconds` (INTEGER) */
  durationSeconds?: number;
  /** DB column: `metadata` (JSONB, default '{}') */
  metadata: Record<string, unknown>;
  /** DB column: `tags` (TEXT[], default '{}') */
  tags: string[];
  /** DB column: `created_at` (TIMESTAMPTZ) */
  createdAt: Date;
}

/**
 * Brand identity preset for content creation.
 * Maps to DB table: `studio_brand_kits`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 1.5)
 */
export interface StudioBrandKit {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `brand_name` (TEXT, NOT NULL) */
  brandName: string;
  /** DB column: `logo_url` (TEXT) */
  logoUrl?: string;
  /** DB column: `color_primary` (TEXT, default '#f59e0b') */
  colorPrimary: string;
  /** DB column: `color_secondary` (TEXT, default '#d97706') */
  colorSecondary: string;
  /** DB column: `font_heading` (TEXT, default 'Inter') */
  fontHeading: string;
  /** DB column: `font_body` (TEXT, default 'Inter') */
  fontBody: string;
  /** DB column: `tone_of_voice` (TEXT) */
  toneOfVoice?: string;
  /** DB column: `intro_audio_url` (TEXT) */
  introAudioUrl?: string;
  /** DB column: `outro_audio_url` (TEXT) */
  outroAudioUrl?: string;
  /** DB column: `created_at` (TIMESTAMPTZ) */
  createdAt: Date;
}

// ============================================================================
// PHASE 2 — ARTICLE / NEWSLETTER TYPES
// ============================================================================

/**
 * Outline item for an article draft.
 * Stored as JSONB array in `studio_article_drafts.outline`.
 */
export interface ArticleOutlineItem {
  heading: string;
  subpoints: string[];
  targetWords: number;
}

/**
 * Long-form article draft with SEO scoring.
 * Maps to DB table: `studio_article_drafts`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 2.1)
 */
export interface StudioArticleDraft {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, NOT NULL) */
  projectId: string;
  /** DB column: `content` (TEXT, default '') */
  content: string;
  /**
   * DB column: `outline` (JSONB, default '[]').
   * Array of outline section objects with heading, subpoints, and target word count.
   */
  outline: ArticleOutlineItem[];
  /** DB column: `word_count` (INTEGER, default 0) */
  wordCount: number;
  /** DB column: `seo_score` (INTEGER, nullable) */
  seoScore?: number;
  /**
   * DB column: `seo_suggestions` (JSONB, default '[]').
   * Stored as JSONB array of suggestion strings.
   */
  seoSuggestions: string[];
  /** DB column: `status` (TEXT, CHECK: 'draft'|'review'|'approved'|'published') */
  status: 'draft' | 'review' | 'approved' | 'published';
  /** DB column: `published_url` (TEXT) */
  publishedUrl?: string;
  /** DB column: `created_at` (TIMESTAMPTZ) */
  createdAt: Date;
  /** DB column: `updated_at` (TIMESTAMPTZ, auto-updated via trigger) */
  updatedAt: Date;
}

/**
 * Newsletter with scheduling and delivery tracking.
 * Maps to DB table: `studio_newsletters`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 2.2)
 */
export interface StudioNewsletter {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, nullable) */
  projectId?: string;
  /** DB column: `subject` (TEXT, NOT NULL) */
  subject: string;
  /** DB column: `content` (TEXT, default '') */
  content: string;
  /** DB column: `template` (TEXT, default 'default') */
  template: string;
  /** DB column: `scheduled_at` (TIMESTAMPTZ) */
  scheduledAt?: Date;
  /** DB column: `sent_at` (TIMESTAMPTZ) */
  sentAt?: Date;
  /** DB column: `recipients_count` (INTEGER, default 0) */
  recipientsCount: number;
  /** DB column: `open_rate` (NUMERIC, default 0) */
  openRate: number;
  /** DB column: `click_rate` (NUMERIC, default 0) */
  clickRate: number;
  /** DB column: `status` (TEXT, CHECK: 'draft'|'scheduled'|'sending'|'sent'|'failed') */
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  /** DB column: `created_at` (TIMESTAMPTZ) */
  createdAt: Date;
}

// ============================================================================
// PHASE 4 — DISTRIBUTION TYPES
// ============================================================================

/**
 * Cross-platform content scheduling entry.
 * Maps to DB table: `studio_content_calendar`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 4.1)
 */
export interface ContentCalendarEntry {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, nullable) */
  projectId?: string;
  /** DB column: `clip_id` (UUID, nullable) */
  clipId?: string;
  /** DB column: `platform` (TEXT, NOT NULL, CHECK constraint) */
  platform: StudioPlatform;
  /** DB column: `scheduled_at` (TIMESTAMPTZ, NOT NULL) */
  scheduledAt: Date;
  /** DB column: `published_at` (TIMESTAMPTZ) */
  publishedAt?: Date;
  /** DB column: `status` (TEXT, CHECK: 'draft'|'scheduled'|'publishing'|'published'|'failed') */
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  /** DB column: `caption` (TEXT) */
  caption: string;
  /** DB column: `hashtags` (TEXT[], default '{}') */
  hashtags: string[];
  /** DB column: `metadata` (JSONB, default '{}') */
  metadata: Record<string, unknown>;
  /** DB column: `created_at` (TIMESTAMPTZ) */
  createdAt: Date;
}

// ============================================================================
// PHASE 5 — ANALYTICS + COLLABORATION TYPES
// ============================================================================

/**
 * Platform-specific analytics metric entry.
 * Maps to DB table: `studio_analytics`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 5.1)
 */
export interface StudioAnalyticsEntry {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, nullable) */
  projectId?: string;
  /** DB column: `platform` (TEXT, NOT NULL) */
  platform: StudioPlatform | string;
  /** DB column: `metric_type` (TEXT, NOT NULL) */
  metricType: string;
  /** DB column: `metric_value` (NUMERIC, NOT NULL, default 0) */
  metricValue: number;
  /** DB column: `recorded_at` (TIMESTAMPTZ, default now()) */
  recordedAt: Date;
  /** DB column: `created_at` (TIMESTAMPTZ, default now()) */
  createdAt: Date;
}

/**
 * Collaboration team member with role-based access.
 * Maps to DB table: `studio_team_members`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 5.2)
 */
export interface StudioTeamMember {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) — the team owner */
  userId: string;
  /** DB column: `member_email` (TEXT, NOT NULL) */
  memberEmail: string;
  /** DB column: `role` (TEXT, CHECK: 'admin'|'editor'|'designer'|'viewer') */
  role: 'admin' | 'editor' | 'designer' | 'viewer';
  /** DB column: `invited_at` (TIMESTAMPTZ, default now()) */
  invitedAt: Date;
  /** DB column: `accepted_at` (TIMESTAMPTZ, nullable) */
  acceptedAt?: Date;
  /** DB column: `status` (TEXT, CHECK: 'pending'|'active'|'revoked') */
  status: 'pending' | 'active' | 'revoked';
}

/**
 * Timestamped threaded comment on a project or asset.
 * Maps to DB table: `studio_comments`
 *
 * @see supabase/migrations/20260217150000_studio_creative_hub.sql (section 5.3)
 */
export interface StudioComment {
  id: string;
  /** DB column: `user_id` (UUID, NOT NULL) */
  userId: string;
  /** DB column: `project_id` (UUID, NOT NULL) */
  projectId: string;
  /** DB column: `asset_id` (UUID, nullable) */
  assetId?: string;
  /** DB column: `content` (TEXT, NOT NULL) */
  content: string;
  /** DB column: `timestamp_seconds` (NUMERIC, nullable) — position in media */
  timestampSeconds?: number;
  /** DB column: `parent_comment_id` (UUID, nullable, self-referencing FK) */
  parentCommentId?: string;
  /** DB column: `resolved` (BOOLEAN, default false) */
  resolved: boolean;
  /** DB column: `created_at` (TIMESTAMPTZ, default now()) */
  createdAt: Date;
}

// ============================================================================
// SEO ANALYSIS TYPES
// ============================================================================

/** SEO readability analysis result */
export interface SEOReadability {
  score: number;
  level: 'facil' | 'medio' | 'dificil' | 'N/A';
  details: string;
}

/** SEO header structure analysis */
export interface SEOHeaderStructure {
  h1: number;
  h2: number;
  h3: number;
  suggestions: string[];
}

/** Complete SEO analysis result from studio-seo-analyze Edge Function */
export interface SEOAnalysisResult {
  score: number;
  suggestions: string[];
  titleSuggestions?: string[];
  metaDescription: string;
  readability: SEOReadability;
  keywordDensity: Record<string, number>;
  headerStructure: SEOHeaderStructure;
  internalLinkSuggestions?: string[];
}
