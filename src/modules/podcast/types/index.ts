/**
 * Podcast Module Type Definitions
 *
 * Shared types used across the podcast production workflow
 */

// ============================================================================
// GUEST & RESEARCH TYPES
// ============================================================================

export interface Dossier {
  guestName: string;
  episodeTheme: string;
  biography: string;
  controversies: Controversy[];
  suggestedTopics: string[];
  iceBreakers: string[];
  technicalSheet: TechnicalSheet;
}

export interface TechnicalSheet {
  fullName?: string;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  occupation?: string;
  knownFor?: string;
  education?: string;
  awards?: Award[];
  socialMedia?: SocialMedia;
  [key: string]: any;
}

export interface Award {
  name: string;
  year: number;
  organization?: string;
}

export interface SocialMedia {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  [key: string]: string | undefined;
}

export interface Controversy {
  title: string;
  summary: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  date: string;
  description?: string;
}

// ============================================================================
// EPISODE & TOPICS TYPES
// ============================================================================

export interface Topic {
  id: string;
  episode_id: string;
  category?: 'geral' | 'quebra-gelo' | 'patrocinador' | 'polemica';
  question_text: string;
  sponsor_script?: string;
  is_sponsor_topic?: boolean;
  completed?: boolean;
  order?: number;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Episode {
  id: string;
  show_id: string;
  user_id: string;
  title: string;
  status: 'draft' | 'in_progress' | 'recorded' | 'published';
  guest_name: string | null;
  guest_email?: string;
  guest_phone?: string;
  guest_reference?: string;
  guest_profile?: any; // JSONB
  episode_theme: string | null;
  theme_mode?: 'auto' | 'manual';
  season?: string;
  location?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  biography?: string;
  technical_sheet?: TechnicalSheet;
  controversies?: Controversy[];
  ice_breakers?: string[];
  recording_duration?: number;
  recording_started_at?: string;
  recording_finished_at?: string;
  recording_status?: 'idle' | 'recording' | 'paused' | 'finished';
  recording_file_path?: string;
  recording_file_size?: number;
  transcript?: string;
  transcript_generated_at?: string;
  cuts_generated?: boolean;
  cuts_metadata?: ContentCut[];
  blog_post_generated?: boolean;
  blog_post_url?: string;
  published_to_social?: Record<string, boolean>;
  approval_token?: string;
  approval_token_created_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentCut {
  start_time: number;
  end_time: number;
  title: string;
  platform: 'tiktok' | 'reels' | 'shorts';
}

// ============================================================================
// SHOW TYPES
// ============================================================================

export interface PodcastShow {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// RESEARCH TYPES
// ============================================================================

export interface GuestResearch {
  id: string;
  episode_id: string;
  guest_name: string;
  guest_reference?: string;
  profile_search_completed?: boolean;
  profile_search_at?: string;
  profile_confidence_score?: number;
  biography?: string;
  bio_summary?: string;
  bio_sources?: Source[];
  full_name?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  occupation?: string;
  known_for?: string;
  education?: string;
  awards?: Award[];
  social_media?: SocialMedia;
  controversies?: Controversy[];
  recent_news?: NewsItem[];
  custom_sources?: CustomSource[];
  chat_history?: ChatMessage[];
  low_context_warning?: boolean;
  research_quality_score?: number;
  approved_by_guest?: boolean | null;
  approved_at?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  url: string;
  title: string;
  date: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
}

export interface CustomSource {
  type: 'pdf' | 'link' | 'text';
  content: string;
  name: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ============================================================================
// RECORDING TYPES
// ============================================================================

export interface RecordingSession {
  episodeId: string;
  status: 'idle' | 'recording' | 'paused' | 'finished';
  startedAt?: string;
  duration: number; // in seconds
  pausedDuration: number; // in seconds
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  elapsedTime: number;
  currentTopicIndex: number;
  completedTopics: string[];
}
