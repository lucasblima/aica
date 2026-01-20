/**
 * Memory System Types
 * Implements Pillar 3.4: Emotional Intelligence
 *
 * The memory system stores structured insights instead of raw message content.
 * This enables the AI to "remember" patterns via RAG (Retrieval-Augmented Generation)
 * while maintaining privacy-first data handling.
 */

// ============================================================================
// MEMORY TYPES
// ============================================================================

export interface Memory {
  id: string;
  user_id: string;

  // Source information
  source_type: 'message' | 'task_completion' | 'conversation' | 'event';
  source_id?: string;
  source_contact_id?: string;

  // Structured insight (no raw content)
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentiment_score: number; // -1 to 1
  triggers: string[]; // ['work_deadline', 'personal_stress', 'celebration']
  subjects: string[]; // ['health', 'finances', 'relationships']

  // Context summary
  summary: string; // Brief summary (max 500 chars)

  // Embeddings for semantic search
  embedding?: number[]; // 1536-dimensional vector

  // Metadata
  importance: number; // 0-1 scale
  tags: string[];
  associations: string[]; // Associated UUID array
  related_memory_ids: string[];

  // Privacy & lifecycle
  is_active: boolean;
  privacy_level: 'private' | 'association' | 'shared';
  retention_until?: string; // ISO timestamp

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface MemoryCreateInput {
  source_type: Memory['source_type'];
  source_id?: string;
  source_contact_id?: string;
  sentiment: Memory['sentiment'];
  sentiment_score: number;
  triggers: string[];
  subjects: string[];
  summary: string;
  importance?: number;
  tags?: string[];
  associations?: string[];
  privacy_level?: Memory['privacy_level'];
  retention_until?: string;
}

export interface MemoryFilter {
  sentiment?: Memory['sentiment'][];
  triggers?: string[];
  subjects?: string[];
  source_type?: Memory['source_type'];
  tags?: string[];
  date_range?: {
    start: string; // ISO date
    end: string;
  };
  importance_min?: number;
  privacy_level?: Memory['privacy_level'];
}

export interface MemorySimilarityResult {
  memory: Memory;
  similarity_score: number; // 0-1, higher = more similar
}

// ============================================================================
// CONTACT NETWORK TYPES
// ============================================================================

export interface ContactNetwork {
  id: string;
  user_id: string;

  // Contact information
  name: string;
  phone_number?: string; // E.164 format: +55 11 99999-9999
  email?: string;
  avatar_url?: string;

  // Relationship metadata
  relationship_type?:
    | 'colleague'
    | 'client'
    | 'friend'
    | 'family'
    | 'mentor'
    | 'mentee'
    | 'vendor'
    | 'contact'  // Generic WhatsApp contact
    | 'group'    // WhatsApp group
    | 'other';
  tags?: string[];

  // Interaction tracking (metadata only)
  last_interaction_at?: string;
  interaction_count?: number;
  interaction_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

  // Relationship health
  health_score?: number; // 0-100
  sentiment_trend?: 'improving' | 'stable' | 'declining' | 'unknown';

  // Topics of interaction
  interaction_topics?: string[]; // ['work', 'personal', 'health']

  // Engagement metrics
  response_avg_time_hours?: number;
  engagement_level?: 'high' | 'medium' | 'low' | 'inactive';

  // Notes & preferences
  notes?: string;
  preferences?: Record<string, any>;

  // Status
  is_active?: boolean;
  is_archived?: boolean;
  blocked?: boolean;

  // Aica AI Analysis (Issue #100)
  last_analysis_id?: string;
  last_analyzed_at?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // ==========================================================================
  // Sync Source & Google Contacts Integration
  // ==========================================================================
  sync_source?: 'manual' | 'google' | 'whatsapp' | 'evolution';
  google_contact_id?: string;
  google_resource_name?: string;
  last_synced_at?: string;

  // ==========================================================================
  // WhatsApp Integration (Issue #23)
  // ==========================================================================
  whatsapp_id?: string; // remoteJid from Evolution API
  whatsapp_phone?: string; // Phone number extracted from whatsapp_id
  whatsapp_name?: string; // pushName or contact name
  whatsapp_profile_pic_url?: string;
  whatsapp_sync_enabled?: boolean;
  whatsapp_sync_status?: 'pending' | 'syncing' | 'synced' | 'failed';
  whatsapp_synced_at?: string;
  whatsapp_last_message_at?: string;
  whatsapp_message_count?: number;
  whatsapp_sentiment_avg?: number; // -1 to 1
  whatsapp_metadata?: Record<string, any>;
  last_whatsapp_message_at?: string;
}

export interface ContactNetworkCreateInput {
  name: string;
  phone_number?: string;
  email?: string;
  avatar_url?: string;
  association_id?: string;
  user_id_if_internal?: string;
  relationship_type: ContactNetwork['relationship_type'];
  tags?: string[];
  interaction_topics?: string[];
  notes?: string;
  preferences?: Record<string, any>;
}

export interface ContactNetworkUpdateInput {
  name?: string;
  phone_number?: string;
  email?: string;
  avatar_url?: string;
  relationship_type?: ContactNetwork['relationship_type'];
  tags?: string[];
  interaction_topics?: string[];
  notes?: string;
  preferences?: Record<string, any>;
  is_active?: boolean;
  is_archived?: boolean;
  blocked?: boolean;
}

export interface ContactNetworkFilter {
  relationship_type?: ContactNetwork['relationship_type'][];
  tags?: string[];
  engagement_level?: ('high' | 'medium' | 'low' | 'inactive')[];
  health_score_min?: number;
  health_score_max?: number;
  sentiment_trend?: ContactNetwork['sentiment_trend'];
  is_active?: boolean;
  is_archived?: boolean;
  search_query?: string; // Search in name, email, phone
}

export interface ContactNetworkStats {
  total_contacts: number;
  active_contacts: number;
  by_engagement: Record<string, number>; // { high: 5, medium: 10, low: 3, inactive: 2 }
  by_relationship: Record<string, number>; // { colleague: 8, friend: 5, ... }
  avg_health_score: number;
  high_risk_contacts: ContactNetwork[]; // health_score < 30
  inactive_contacts: ContactNetwork[]; // no interaction > 30 days
}

// ============================================================================
// DAILY REPORT TYPES
// ============================================================================

export interface DailyReport {
  id: string;
  user_id: string;
  report_date: string; // ISO date: YYYY-MM-DD

  // Productivity metrics
  tasks_completed: number;
  tasks_total: number;
  productivity_score?: number; // 0-100
  estimated_vs_actual?: number;

  // Emotional & mood data
  mood?: 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible';
  mood_score?: number; // -1 to 1
  energy_level?: number; // 0-100
  stress_level?: number; // 0-100

  // Activity summary
  active_modules: string[]; // ['finances', 'health']
  top_interactions: string[]; // Contact names or IDs
  significant_events: string[];

  // Generated insights (by AI)
  summary?: string; // AI-generated summary
  key_insights: string[]; // Bullet points
  patterns_detected: string[]; // ['procrastination_on_health']

  // Recommendations (by AI)
  ai_recommendations: string[];
  suggested_focus_areas: string[];

  // Memories created from this day
  memory_ids: string[];

  // Context
  notes?: string;
  location?: string;
  weather_notes?: string;

  // Privacy
  is_shared_with_associations: string[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface DailyReportCreateInput {
  report_date: string; // ISO date
  report_content?: string; // NOT NULL in DB - auto-generated summary
  tasks_completed: number;
  tasks_total: number;
  productivity_score?: number;
  mood?: DailyReport['mood'];
  mood_score?: number;
  energy_level?: number;
  stress_level?: number;
  active_modules?: string[];
  summary?: string;
  key_insights?: string[];
  recommendations?: string[];
  notes?: string;
  location?: string;
  weather_notes?: string;
}

export interface DailyReportFilter {
  date_range: {
    start: string; // ISO date
    end: string;
  };
  mood?: DailyReport['mood'][];
  min_productivity?: number;
  min_energy?: number;
  max_stress?: number;
}

export interface DailyReportStats {
  date_range: {
    start: string;
    end: string;
  };
  avg_productivity: number;
  avg_mood: number; // -1 to 1
  avg_energy: number;
  avg_stress: number;
  mood_distribution: Record<string, number>; // { excellent: 3, good: 2, ... }
  total_tasks_completed: number;
  trend: {
    productivity: 'improving' | 'stable' | 'declining';
    mood: 'improving' | 'stable' | 'declining';
    stress: 'decreasing' | 'stable' | 'increasing';
  };
  top_issues: string[]; // Most common patterns
  recommendations_frequency: Record<string, number>;
}

// ============================================================================
// AI PROCESSING TYPES
// ============================================================================

/**
 * Raw message data received from Evolution API
 * This should be processed and discarded after extraction
 */
export interface RawMessagePayload {
  from: string; // Phone number
  to: string; // Bot phone number
  message: string;
  timestamp: number;
  message_id: string;
  webhook_id: string;
}

/**
 * Extracted insight from AI processing
 * Used to populate memories table
 */
export interface ExtractedInsight {
  sentiment: Memory['sentiment'];
  sentiment_score: number;
  triggers: string[];
  subjects: string[];
  summary: string;
  importance: number;
  suggested_memory_tags: string[];
  suggested_work_items?: {
    title: string;
    description?: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }[];
}

/**
 * Message processing context
 * Passed through the n8n workflow
 */
export interface MessageProcessingContext {
  raw_message: RawMessagePayload;
  contact: ContactNetwork;
  user_id: string;
  extracted_insight: ExtractedInsight;
  embedding: number[];
  timestamp: string;
  workflow_status: 'success' | 'failed' | 'skipped';
  error?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SentimentTrend = 'positive_spike' | 'negative_spike' | 'stable' | 'improving' | 'declining';

export interface MemoryPattern {
  pattern: string; // e.g., 'procrastination_on_health'
  frequency: number; // How many times detected
  last_detected: string;
  severity: 'low' | 'medium' | 'high';
  suggested_action?: string;
}

export interface AIRecommendation {
  type: 'focus_area' | 'contact_action' | 'lifestyle_change' | 'task_priority' | 'communication';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  rationale?: string;
  supported_by: string[]; // memory IDs or data points
}
