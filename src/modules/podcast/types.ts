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
}