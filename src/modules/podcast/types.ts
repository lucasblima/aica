export interface TeamMember {
  id: string;
  episode_id: string;
  name: string;
  role: 'host' | 'guest' | 'producer' | 'tech';
  whatsapp?: string; // Format: +5511999999999
  created_at: string;
  updated_at: string;
}

// ============================================
// Topic & Episode Types
// ============================================

export interface Topic {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  archived: boolean;
  categoryId?: string;
  sponsorScript?: string; // Script for sponsor reads
}

export interface TechnicalSheet {
  fullName?: string;
  nicknames?: string[];
  birthInfo?: {
    date?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  familyInfo?: {
    mother?: string;
    father?: string;
    siblings?: string[];
  };
  residenceHistory?: {
    city: string;
    state?: string;
    country: string;
    period?: string;
  }[];
  traveledCountries?: string[];
  education?: {
    degree: string;
    institution: string;
    year?: string;
  }[];
  careerHighlights?: {
    title: string;
    organization: string;
    period?: string;
  }[];
  preferences?: {
    food?: string[];
    hobbies?: string[];
    sports?: string[];
    music?: string[];
  };
  socialMedia?: {
    platform: string;
    handle: string;
  }[];
  keyFacts?: string[];
}

export interface Pauta {
  guestName: string;
  episodeTheme: string;
  biography: string;
  technicalSheet?: TechnicalSheet;
  controversies: string[];
  suggestedTopics: string[];
  iceBreakers: string[];
}

export type Dossier = Pauta;

// Database types
export interface Project {
  id: string;
  title: string;
  guest_name: string;
  episode_theme: string;
  biography: string;
  technical_sheet?: any;
  controversies: string[];
  ice_breakers: string[];
  status: 'draft' | 'in_production' | 'published' | 'archived';
  season?: string;
  scheduled_date?: string;
  location?: string;
  duration_minutes?: number;
  // Recording data
  recording_duration?: number; // Duration in seconds
  recording_started_at?: string;
  recording_finished_at?: string;
  recording_status?: 'idle' | 'recording' | 'paused' | 'finished';
  recording_file_path?: string;
  recording_file_size?: number;
  // Post-production data
  transcript?: string; // Auto-generated transcript
  transcript_generated_at?: string;
  cuts_generated?: boolean;
  cuts_metadata?: any[];
  created_at: string;
  updated_at: string;
}

export interface TopicDB {
  id: string;
  project_id: string;
  text: string;
  order: number;
  completed: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export enum AppMode {
  PREPARATION = 'PREPARATION',
  STUDIO = 'STUDIO'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sources?: number[]; // IDs of citations
}

export interface IceBreaker {
  id?: string;
  text: string;
  order?: number;
  completed?: boolean;
  archived?: boolean;
}

export interface TopicCategory {
  id: string;
  name: string;
  color: string;
  episode_id: string;
  icon?: string;
  order?: number;
}

export interface PodcastShow {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  episodes_count?: number;
}

// ============================================
// Research & Sources Types
// ============================================

export interface CustomSource {
  id: string;
  type: 'file' | 'link' | 'text';
  content: string; // URL, text content, or file path/name
  name?: string; // For files or links
  addedAt: number;
}

export interface Citation {
  id: number;
  sourceId: string;
  text: string;
  startIndex: number;
  endIndex: number;
}