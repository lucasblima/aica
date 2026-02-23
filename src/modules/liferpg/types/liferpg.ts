/**
 * Life RPG Type Definitions
 *
 * Core types for the Life RPG system where real-world entities
 * (houses, people, organizations) are treated as RPG characters.
 */

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type EntityType = 'habitat' | 'person' | 'organization' | 'project' | 'vehicle';

export type PersonaVoice = 'neutral' | 'formal' | 'casual' | 'playful' | 'serious' | 'caring';

export interface EntityPersona {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_ref_id: string;
  persona_name: string;
  persona_voice: PersonaVoice;
  system_prompt: string | null;
  personality_traits: string[];
  hp: number;
  stats: EntityStats;
  level: number;
  xp: number;
  knowledge_summary: string | null;
  knowledge_confidence: number;
  last_interaction: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Per-entity-type stat shapes
export interface HabitatStats {
  cleanliness: number;
  maintenance: number;
  organization: number;
  comfort: number;
  safety: number;
}

export interface PersonStats {
  proximity: number;
  trust: number;
  communication: number;
  shared_activities: number;
  emotional_support: number;
}

export interface OrganizationStats {
  efficiency: number;
  health: number;
  morale: number;
  compliance: number;
  innovation: number;
}

export interface ProjectStats {
  progress: number;
  quality: number;
  momentum: number;
}

export interface VehicleStats {
  condition: number;
  maintenance: number;
  fuel_efficiency: number;
}

export type EntityStats = HabitatStats | PersonStats | OrganizationStats | ProjectStats | VehicleStats;

// Entity color constants
export const ENTITY_COLORS: Record<EntityType, string> = {
  habitat: '#059669',
  person: '#3B82F6',
  organization: '#F59E0B',
  project: '#8B5CF6',
  vehicle: '#EF4444',
};

export const ENTITY_EMOJI: Record<EntityType, string> = {
  habitat: '🏠',
  person: '👤',
  organization: '🏢',
  project: '📋',
  vehicle: '🚗',
};

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export interface InventoryItem {
  id: string;
  persona_id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  location: string | null;
  condition: number;
  quantity: number;
  unit: string | null;
  attributes: Record<string, unknown>;
  purchase_price: number | null;
  current_value: number | null;
  purchase_date: string | null;
  photo_urls: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InventoryCategory =
  | 'appliance'
  | 'furniture'
  | 'electronics'
  | 'food'
  | 'document'
  | 'tool'
  | 'clothing'
  | 'decoration'
  | 'vehicle_part'
  | 'other';

export interface ApplianceAttributes {
  brand: string;
  model: string;
  warranty_until: string | null;
  serial_number: string | null;
  power_watts: number | null;
}

export interface FoodAttributes {
  expiry_date: string | null;
  storage_type: 'fridge' | 'freezer' | 'pantry' | 'counter';
  is_perishable: boolean;
}

export interface DocumentAttributes {
  document_type: string;
  file_url: string | null;
  expiry_date: string | null;
  issuer: string | null;
}

export interface FurnitureAttributes {
  dimensions: { width: number; height: number; depth: number } | null;
  material: string | null;
  color: string | null;
}

// ============================================================================
// QUEST TYPES
// ============================================================================

export type QuestType =
  | 'maintenance'
  | 'repair'
  | 'upgrade'
  | 'social'
  | 'financial'
  | 'inventory'
  | 'emergency'
  | 'seasonal'
  | 'routine';

export type QuestPriority = 'low' | 'medium' | 'high' | 'critical';

export type QuestStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'failed';

export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'epic';

export interface EntityQuest {
  id: string;
  persona_id: string;
  title: string;
  description: string | null;
  quest_type: QuestType;
  priority: QuestPriority;
  status: QuestStatus;
  xp_reward: number;
  stat_impact: Record<string, number>;
  difficulty: QuestDifficulty;
  generated_by: 'ai' | 'user' | 'system';
  generation_reason: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  completion_notes: string | null;
  completion_photos: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FEEDBACK TYPES
// ============================================================================

export type FeedbackQuestionType =
  | 'profile_completion'
  | 'preference_discovery'
  | 'state_verification'
  | 'context'
  | 'decision'
  | 'feedback';

export type FeedbackStatus = 'pending' | 'answered' | 'skipped' | 'expired';

export interface FeedbackQuestion {
  id: string;
  persona_id: string;
  user_id: string;
  question: string;
  question_type: FeedbackQuestionType;
  priority: number;
  status: FeedbackStatus;
  answer: string | null;
  answered_at: string | null;
  context: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
}

export interface FeedbackQuestionWithPersona extends FeedbackQuestion {
  entity_personas: {
    persona_name: string;
    avatar_emoji: string | null;
    entity_type: EntityType;
  };
}

// ============================================================================
// EVENT LOG TYPES
// ============================================================================

export type EventType =
  | 'quest_completed'
  | 'quest_failed'
  | 'quest_generated'
  | 'hp_changed'
  | 'stat_changed'
  | 'level_up'
  | 'item_added'
  | 'item_removed'
  | 'feedback_answered'
  | 'agent_chat'
  | 'decay_applied'
  | 'recovery_applied';

export interface EntityEvent {
  id: string;
  persona_id: string;
  event_type: EventType;
  event_data: Record<string, unknown>;
  triggered_by: 'system' | 'user' | 'ai' | 'cron';
  created_at: string;
}

// ============================================================================
// AGENT CHAT TYPES
// ============================================================================

export interface EntityAgentMessage {
  role: 'user' | 'entity';
  content: string;
  timestamp: string;
  tone?: string;
  suggested_actions?: SuggestedAction[];
}

export interface SuggestedAction {
  type: 'quest' | 'inventory_check' | 'feedback' | 'maintenance';
  label: string;
  description: string;
}

export interface EntityAgentResponse {
  response: string;
  tone: 'friendly' | 'concerned' | 'proud' | 'urgent' | 'neutral';
  suggested_actions?: SuggestedAction[];
  feedback_question?: {
    question: string;
    question_type: FeedbackQuestionType;
    priority: number;
  };
  knowledge_gap_detected: boolean;
}

// ============================================================================
// HP & DECAY TYPES
// ============================================================================

export interface HPChange {
  persona_id: string;
  old_hp: number;
  new_hp: number;
  reason: string;
  source: 'decay' | 'quest_completion' | 'feedback' | 'item_added' | 'manual';
}

export interface DecayRule {
  entity_type: EntityType;
  condition: string;
  hp_impact: number;
  stat_impact: Record<string, number>;
  description: string;
}

// ============================================================================
// DASHBOARD / UI TYPES
// ============================================================================

export interface PersonaDashboardData {
  persona: EntityPersona;
  pendingQuests: EntityQuest[];
  recentEvents: EntityEvent[];
  inventorySummary: {
    totalItems: number;
    totalValue: number;
    lowConditionCount: number;
    expiringCount: number;
  };
  pendingFeedback: FeedbackQuestion[];
}

export interface XPThreshold {
  level: number;
  xp_required: number;
}

export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function getXPProgress(xp: number, level: number): number {
  const xpNeeded = getXPForLevel(level + 1);
  return Math.max(0, Math.min(100, (xp / xpNeeded) * 100));
}
