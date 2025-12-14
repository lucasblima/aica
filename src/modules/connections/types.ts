/**
 * Connections Module - Type Definitions
 *
 * This file contains all TypeScript types, interfaces, and configurations
 * for the Connections module and its four archetypes:
 * - Habitat: Condomínios e residências
 * - Ventures: Projetos e empresas
 * - Academia: Cursos, mentorias e aprendizado
 * - Tribo: Clubes e comunidades
 */

// ============================================================================
// ENUMS & UNION TYPES
// ============================================================================

/**
 * Available connection archetypes
 */
export type Archetype = 'habitat' | 'ventures' | 'academia' | 'tribo';

/**
 * Member roles within a connection space
 */
export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';

/**
 * Financial transaction types
 */
export type TransactionType = 'income' | 'expense' | 'transfer';

/**
 * Split calculation methods for shared expenses
 */
export type SplitType = 'equal' | 'percentage' | 'fixed';

// ============================================================================
// BASE INTERFACES
// ============================================================================

/**
 * Connection Space - Main entity for each archetype instance
 *
 * A space represents a single instance of an archetype (e.g., one house,
 * one business, one course, or one club).
 */
export interface ConnectionSpace {
  id: string;
  user_id: string;
  archetype: Archetype;
  name: string;
  subtitle?: string;
  description?: string;
  icon: string;
  color_theme: string;
  cover_image_url?: string;
  is_active: boolean;
  is_favorite: boolean;
  last_accessed_at?: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Connection Member - People associated with a space
 *
 * Members can be either registered users (user_id) or external contacts
 * (external_* fields). Context fields allow archetype-specific metadata.
 */
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

/**
 * Connection Event - Calendar events and activities
 *
 * Supports RSVP functionality and Google Calendar integration.
 */
export interface ConnectionEvent {
  id: string;
  space_id: string;
  created_by: string;
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  ends_at?: string;
  is_all_day: boolean;
  recurrence_rule?: string;
  event_type?: string;
  rsvp_enabled: boolean;
  rsvp_deadline?: string;
  google_event_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Connection Document - File management and versioning
 *
 * Supports file categorization, tagging, versioning, and expiration.
 */
export interface ConnectionDocument {
  id: string;
  space_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size_bytes?: number;
  category?: string;
  tags: string[];
  version: number;
  parent_document_id?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Transaction Split - Individual member share in a transaction
 *
 * Supports both fixed amounts and percentage-based splits.
 */
export interface TransactionSplit {
  member_id: string;
  amount?: number;
  percentage?: number;
  paid: boolean;
}

/**
 * Connection Transaction - Financial tracking and split expenses
 *
 * Supports recurring transactions and integration with personal finance module.
 */
export interface ConnectionTransaction {
  id: string;
  space_id: string;
  created_by: string;
  description: string;
  amount: number;
  type: TransactionType;
  category?: string;
  transaction_date: string;
  split_type: SplitType;
  split_data: TransactionSplit[];
  is_paid: boolean;
  paid_at?: string;
  paid_by?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  personal_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DTOs (DATA TRANSFER OBJECTS / PAYLOADS)
// ============================================================================

/**
 * Payload for creating a new connection space
 */
export interface CreateSpacePayload {
  archetype: Archetype;
  name: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  color_theme?: string;
}

/**
 * Payload for updating an existing connection space
 */
export interface UpdateSpacePayload {
  name?: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  color_theme?: string;
  is_active?: boolean;
  is_favorite?: boolean;
  settings?: Record<string, unknown>;
}

/**
 * Payload for adding a member to a space
 */
export interface AddMemberPayload {
  user_id?: string;
  external_name?: string;
  external_email?: string;
  external_phone?: string;
  role?: MemberRole;
  context_label?: string;
  context_data?: Record<string, unknown>;
}

/**
 * Payload for creating a new event
 */
export interface CreateEventPayload {
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  ends_at?: string;
  is_all_day?: boolean;
  recurrence_rule?: string;
  event_type?: string;
  rsvp_enabled?: boolean;
  rsvp_deadline?: string;
}

/**
 * Payload for creating a new transaction
 */
export interface CreateTransactionPayload {
  description: string;
  amount: number;
  type: TransactionType;
  category?: string;
  transaction_date: string;
  split_type?: SplitType;
  split_data?: TransactionSplit[];
  is_recurring?: boolean;
  recurrence_rule?: string;
}

// ============================================================================
// ARCHETYPE CONFIGURATION
// ============================================================================

/**
 * Configuration object for each archetype
 *
 * Defines default icons, labels, color themes, and descriptions
 * for each of the four connection archetypes.
 */
export const ARCHETYPE_CONFIG: Record<Archetype, {
  icon: string;
  label: string;
  subtitle: string;
  color_theme: string;
  description: string;
}> = {
  habitat: {
    icon: '🏠',
    label: 'Habitat',
    subtitle: 'Condomínio e residência',
    color_theme: 'earth',
    description: 'Gestão do seu espaço físico e moradia compartilhada',
  },
  ventures: {
    icon: '💼',
    label: 'Ventures',
    subtitle: 'Projetos e empresas',
    color_theme: 'amber',
    description: 'Cockpit para seus empreendimentos e negócios',
  },
  academia: {
    icon: '🎓',
    label: 'Academia',
    subtitle: 'Cursos, mentorias e aprendizado',
    color_theme: 'paper',
    description: 'Sua biblioteca pessoal de conhecimento',
  },
  tribo: {
    icon: '👥',
    label: 'Tribo',
    subtitle: 'Clubes e comunidades',
    color_theme: 'warm',
    description: 'Coordenação de grupos com propósito',
  },
};

// Re-export from types/index.ts for convenience
export { ARCHETYPE_METADATA } from './types/index';
