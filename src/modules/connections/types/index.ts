// Enums mapeados do banco (já existe migração 20251214000000_connection_archetypes_base.sql)
export type ArchetypeType = 'habitat' | 'ventures' | 'academia' | 'tribo';
export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';
export type EventType = 'meeting' | 'social' | 'milestone' | 'deadline' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type SplitType = 'equal' | 'percentage' | 'custom' | 'payer_only';

// Core interfaces
export interface ConnectionSpace {
  id: string;
  owner_id: string;
  archetype: ArchetypeType;
  name: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  color_theme?: string;
  cover_image_url?: string;
  is_active: boolean;
  is_favorite: boolean;
  last_accessed_at?: string;
  settings: ArchetypeSettings;
  created_at: string;
  updated_at: string;
}

export interface ConnectionMember {
  id: string;
  space_id: string;
  user_id?: string;
  external_name?: string;
  external_email?: string;
  external_phone?: string;
  external_avatar_url?: string;
  role: MemberRole;
  permissions: Record<string, boolean>;
  context_label?: string;
  context_data: Record<string, unknown>;
  is_active: boolean;
  joined_at: string;
  last_interaction_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectionEvent {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_time: string;
  end_time?: string;
  is_all_day: boolean;
  location?: string;
  recurrence_rule?: string;
  google_event_id?: string;
  created_by: string;
  attendees: string[];
  created_at: string;
  updated_at: string;
}

export interface ConnectionDocument {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category?: string;
  tags: string[];
  uploaded_by: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionTransaction {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  transaction_type: TransactionType;
  category?: string;
  paid_by: string;
  split_type: SplitType;
  split_data: Record<string, number>;
  receipt_url?: string;
  transaction_date: string;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
}

// Archetype-specific settings
export interface HabitatSettings {
  property_type?: 'apartment' | 'house' | 'condo' | 'room';
  address?: string;
  move_in_date?: string;
  default_currency?: string;
  expense_categories?: string[];
}

export interface VenturesSettings {
  business_type?: 'startup' | 'agency' | 'freelance' | 'partnership' | 'corporation';
  founding_date?: string;
  runway_alert_months?: number;
  kpi_metrics?: string[];
  fiscal_year_start?: string;
}

export interface AcademiaSettings {
  learning_focus?: string[];
  weekly_study_hours?: number;
  certification_goals?: string[];
  preferred_platforms?: string[];
}

export interface TriboSettings {
  group_type?: 'club' | 'community' | 'family' | 'friends' | 'sports' | 'faith';
  meeting_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  shared_interests?: string[];
  default_meeting_location?: string;
}

export type ArchetypeSettings =
  | HabitatSettings
  | VenturesSettings
  | AcademiaSettings
  | TriboSettings
  | Record<string, unknown>;

// Input types for creation/updates
export interface CreateConnectionSpaceInput {
  archetype: ArchetypeType;
  name: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  color_theme?: string;
  settings?: ArchetypeSettings;
}

export interface UpdateConnectionSpaceInput {
  name?: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  color_theme?: string;
  cover_image_url?: string;
  is_active?: boolean;
  is_favorite?: boolean;
  settings?: ArchetypeSettings;
}

export interface CreateConnectionMemberInput {
  space_id: string;
  user_id?: string;
  external_name?: string;
  external_email?: string;
  external_phone?: string;
  role?: MemberRole;
  context_label?: string;
  context_data?: Record<string, unknown>;
}

// Archetype metadata for UI
export interface ArchetypeMetadata {
  id: ArchetypeType;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  colorTheme: string;
  designCues: {
    tone: string;
    elements: string[];
  };
}

export const ARCHETYPE_METADATA: Record<ArchetypeType, ArchetypeMetadata> = {
  habitat: {
    id: 'habitat',
    name: 'Habitat',
    subtitle: 'O Âncora Físico',
    description: 'Logística da serenidade - gestão do lar transformada de fardo em manutenção silenciosa.',
    icon: '🏠',
    colorTheme: 'earthy',
    designCues: {
      tone: 'Tons terrosos, peso visual pesado',
      elements: ['ceramic-card denso', 'Painel de Controle da Propriedade']
    }
  },
  ventures: {
    id: 'ventures',
    name: 'Ventures',
    subtitle: 'O Motor de Criação',
    description: 'Cockpit da ambição profissional - estratégia e visão, não microgerenciamento.',
    icon: '💼',
    colorTheme: 'precise',
    designCues: {
      tone: 'Clareza e precisão, tipografia técnica',
      elements: ['Instrumentos Braun', 'âmbar cirúrgico para alertas']
    }
  },
  academia: {
    id: 'academia',
    name: 'Academia',
    subtitle: 'O Cultivo da Mente',
    description: 'Templo do crescimento intelectual - conhecimento curado, não consumido.',
    icon: '🎓',
    colorTheme: 'serene',
    designCues: {
      tone: 'Biblioteca silenciosa, muito espaço em branco',
      elements: ['tipografia focada', 'papel de alta gramatura']
    }
  },
  tribo: {
    id: 'tribo',
    name: 'Tribo',
    subtitle: 'O Tecido Social',
    description: 'Antítese da rede social moderna - pertencimento intencional.',
    icon: '👥',
    colorTheme: 'warm',
    designCues: {
      tone: 'Ambiente caloroso, humano',
      elements: ['ceramic-concave para fotos', 'cards como convites físicos']
    }
  }
};

// =============================================================================
// WHATSAPP INTENT TYPES (Issue #91)
// =============================================================================

export * from './intent';
