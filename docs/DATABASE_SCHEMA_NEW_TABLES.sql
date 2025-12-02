-- Aica Life OS: New Database Tables for Phase 2
-- These tables implement the Emotional Intelligence (Pillar 3.4)
-- and Privacy-First Communication (Pillar 3.3) features

-- ============================================================================
-- TABLE: memories
-- PURPOSE: Store structured insights and summarized context from communications
-- DESIGN PHILOSOPHY:
--   - No raw message content stored
--   - Instead: sentiment, triggers, patterns, embeddings
--   - Allows AI to "remember" patterns via RAG without reading old chats
-- ============================================================================

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source information (what triggered this memory)
  source_type VARCHAR(50) NOT NULL, -- 'message', 'task_completion', 'conversation', 'event'
  source_id UUID, -- Reference to the originating object (e.g., contact_network.id)
  source_contact_id UUID REFERENCES contact_network(id) ON DELETE SET NULL, -- Who it's about

  -- Structured insight data (no raw content)
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'mixed'
  sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1), -- -1 to 1 scale
  triggers TEXT[], -- Array of identified triggers: ['work_deadline', 'personal_stress', 'celebration', etc]
  subjects TEXT[], -- Categories/topics: ['health', 'finances', 'relationships', etc]

  -- Context summary (structured, not raw)
  summary TEXT NOT NULL, -- Brief summary of the memory (max 500 chars)

  -- Embeddings for semantic search (RAG)
  embedding VECTOR(1536), -- OpenAI/Gemini embedding (1536 dimensions)
  -- Note: Enable pgvector extension with: CREATE EXTENSION IF NOT EXISTS vector;

  -- Metadata
  importance FLOAT CHECK (importance >= 0 AND importance <= 1), -- 0-1 scale, set by AI
  tags TEXT[], -- User/AI assigned tags
  associations UUID[], -- Related association IDs
  related_memory_ids UUID[], -- Cross-references to related memories

  -- Privacy & lifecycle
  is_active BOOLEAN DEFAULT true,
  privacy_level VARCHAR(20) DEFAULT 'private', -- 'private', 'association', 'shared'
  retention_until TIMESTAMP, -- Auto-delete after this date (GDPR compliance)

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT memory_not_empty CHECK (summary IS NOT NULL AND summary != '')
);

CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_sentiment ON memories(sentiment);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_memories_source ON memories(source_type, source_id);

-- ============================================================================
-- TABLE: contact_network
-- PURPOSE: Track relationship metadata and interaction patterns WITHOUT storing message content
-- DESIGN PHILOSOPHY:
--   - Only metadata: last interaction, frequency, health score
--   - No message history/content stored here
--   - Integrates with pair_conversations for draft management only
--   - Enables privacy-first contact management
-- ============================================================================

CREATE TABLE contact_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact information
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20), -- WhatsApp contact (E.164 format: +55 11 99999-9999)
  email VARCHAR(255),
  avatar_url TEXT,

  -- Association links (who is this person)
  association_id UUID REFERENCES associations(id) ON DELETE SET NULL, -- If they belong to an association
  user_id_if_internal UUID REFERENCES users(id) ON DELETE SET NULL, -- If they're an internal user

  -- Relationship metadata
  relationship_type VARCHAR(50), -- 'colleague', 'client', 'friend', 'family', 'mentor', 'mentee', 'vendor', 'other'
  tags TEXT[], -- Custom categorization

  -- Interaction tracking (metadata only, no content)
  last_interaction_at TIMESTAMP,
  interaction_count INT DEFAULT 0, -- Total number of interactions
  interaction_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'

  -- Relationship health scoring
  health_score FLOAT CHECK (health_score >= 0 AND health_score <= 100), -- 0-100 scale
  -- Calculated from: frequency, sentiment trend, engagement level
  sentiment_trend VARCHAR(20), -- 'improving', 'stable', 'declining', 'unknown'

  -- Topics of interaction (what we discuss)
  interaction_topics TEXT[], -- ['work', 'personal', 'health', 'finances', etc]

  -- Engagement metrics
  response_avg_time_hours FLOAT, -- Average hours to respond (null if not enough data)
  engagement_level VARCHAR(20), -- 'high', 'medium', 'low', 'inactive'

  -- Notes & context
  notes TEXT, -- User-added notes about the contact
  preferences JSONB, -- Communication preferences, etc

  -- Privacy & status
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  blocked BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT contact_info_not_empty CHECK (
    phone_number IS NOT NULL
    OR email IS NOT NULL
    OR user_id_if_internal IS NOT NULL
  )
);

CREATE INDEX idx_contact_network_user_id ON contact_network(user_id);
CREATE INDEX idx_contact_network_phone ON contact_network(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_contact_network_email ON contact_network(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contact_network_last_interaction ON contact_network(last_interaction_at);
CREATE INDEX idx_contact_network_association ON contact_network(association_id);
CREATE INDEX idx_contact_network_health_score ON contact_network(health_score DESC);
CREATE INDEX idx_contact_network_internal_user ON contact_network(user_id_if_internal) WHERE user_id_if_internal IS NOT NULL;

-- ============================================================================
-- TABLE: daily_reports
-- PURPOSE: End-of-day summaries with mood, productivity, insights, and recommendations
-- DESIGN PHILOSOPHY:
--   - Generated automatically at end of day via n8n/Gemini
--   - Provides emotional and productivity context
--   - Feeds into Aica Auto and memory system
--   - Supports long-term mood tracking and pattern detection
-- ============================================================================

CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL, -- The date this report is for

  -- Productivity metrics
  tasks_completed INT DEFAULT 0,
  tasks_total INT DEFAULT 0,
  productivity_score FLOAT CHECK (productivity_score >= 0 AND productivity_score <= 100), -- 0-100
  estimated_vs_actual FLOAT, -- Ratio: actual_time / estimated_time

  -- Emotional & mood data
  mood VARCHAR(20), -- 'excellent', 'good', 'neutral', 'bad', 'terrible'
  mood_score FLOAT CHECK (mood_score >= -1 AND mood_score <= 1), -- -1 to 1 scale
  energy_level INT CHECK (energy_level >= 0 AND energy_level <= 100), -- 0-100
  stress_level INT CHECK (stress_level >= 0 AND stress_level <= 100), -- 0-100

  -- Activity summary
  active_modules TEXT[], -- Modules worked on: ['finances', 'health', 'learning']
  top_interactions TEXT[], -- Top contacts interacted with (names/IDs)
  significant_events TEXT[], -- Major events or milestones

  -- Generated insights (by AI)
  summary TEXT, -- AI-generated daily summary (max 1000 chars)
  key_insights TEXT[], -- Bullet-point insights from the day
  patterns_detected TEXT[], -- Patterns identified: ['procrastination_on_health', 'high_work_stress']

  -- Recommendations (by AI)
  ai_recommendations TEXT[], -- Actionable recommendations for next day
  suggested_focus_areas TEXT[], -- Areas to prioritize

  -- Memories created from this day
  memory_ids UUID[], -- References to memories table

  -- Context & metadata
  notes TEXT, -- User-added notes about the day
  location VARCHAR(255), -- Where the day was spent (optional)
  weather_notes VARCHAR(255), -- Weather/environment notes (optional)

  -- Privacy & retention
  is_shared_with_associations UUID[], -- Which associations can see this report
  retention_until TIMESTAMP, -- Auto-delete after this date

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Unique constraint: one report per user per day
  UNIQUE(user_id, report_date)
);

CREATE INDEX idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);
CREATE INDEX idx_daily_reports_mood ON daily_reports(mood);
CREATE INDEX idx_daily_reports_productivity ON daily_reports(productivity_score);
CREATE INDEX idx_daily_reports_created_at ON daily_reports(created_at DESC);

-- ============================================================================
-- TABLE: pair_conversations (Update for Privacy Compliance)
-- PURPOSE: Store ONLY AI-generated drafts, NOT raw incoming messages
-- DESIGN PHILOSOPHY:
--   - Privacy-first: raw messages are processed and discarded
--   - Only stores draft suggestions for user review
--   - Integrates with contact_network for smart replies
--   - Includes context from memories for coherent conversations
-- ============================================================================

-- Note: This table likely already exists. This is the CORRECTED schema.
--
-- ALTER TABLE pair_conversations ADD COLUMN IF NOT EXISTS:
--   - ai_generated BOOLEAN DEFAULT false -- Was this generated by AI?
--   - draft_status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'sent', 'archived'
--   - confidence_score FLOAT -- How confident the AI is in this draft (0-1)
--   - context_memory_ids UUID[] -- References to memories used for context

-- Example INSERT policy:
-- DO NOT INSERT raw incoming messages
-- ONLY INSERT drafts generated by: n8n workflow -> Gemini -> pair_conversations
-- Then user can review and modify before sending via Evolution API

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp on memories
CREATE OR REPLACE FUNCTION update_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memories_updated_at_trigger
BEFORE UPDATE ON memories
FOR EACH ROW
EXECUTE FUNCTION update_memories_updated_at();

-- Update updated_at timestamp on contact_network
CREATE OR REPLACE FUNCTION update_contact_network_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_network_updated_at_trigger
BEFORE UPDATE ON contact_network
FOR EACH ROW
EXECUTE FUNCTION update_contact_network_updated_at();

-- Update updated_at timestamp on daily_reports
CREATE OR REPLACE FUNCTION update_daily_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_reports_updated_at_trigger
BEFORE UPDATE ON daily_reports
FOR EACH ROW
EXECUTE FUNCTION update_daily_reports_updated_at();

-- Auto-update contact_network health_score when new memory is added
CREATE OR REPLACE FUNCTION update_contact_health_from_memory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_contact_id IS NOT NULL THEN
    UPDATE contact_network
    SET health_score = CASE
      WHEN NEW.sentiment_score > 0.5 THEN LEAST(health_score + 5, 100)
      WHEN NEW.sentiment_score < -0.5 THEN GREATEST(health_score - 5, 0)
      ELSE health_score
    END,
    updated_at = now()
    WHERE id = NEW.source_contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_health_from_memory_trigger
AFTER INSERT ON memories
FOR EACH ROW
EXECUTE FUNCTION update_contact_health_from_memory();

-- ============================================================================
-- NOTES ON IMPLEMENTATION
-- ============================================================================
/*
VECTOR EXTENSION REQUIREMENT:
  PostgreSQL + pgvector must be enabled in Supabase
  Run: CREATE EXTENSION IF NOT EXISTS vector;

DATA INGESTION FLOW (n8n Workflow):
  1. Evolution API Webhook receives WhatsApp message
  2. n8n parses message content
  3. Gemini API analyzes: sentiment, triggers, summary, embedding
  4. Insert into memories table
  5. Update contact_network: last_interaction_at, interaction_count, engagement
  6. DISCARD raw message (do NOT store in pair_conversations)
  7. Optional: Generate pair_conversations draft for user-initiated replies

DAILY REPORT GENERATION (n8n Workflow):
  1. Triggered at 23:59 each day
  2. Aggregate data: work_items completed, interactions, mood (from user input)
  3. Query memories from today for patterns
  4. Gemini: Generate insights, recommendations
  5. Insert into daily_reports
  6. Send notification to user

PRIVACY COMPLIANCE:
  - retention_until fields trigger automatic deletion
  - No raw message content ever stored in core tables
  - All sentiment/context is summarized/vectorized
  - User can export their data (memories, reports)
  - User can request deletion

PERFORMANCE OPTIMIZATION:
  - Embeddings enable vector search (similar memories)
  - Health score indexed for contact sorting
  - Date indices for historical analysis
  - IVFFlat index for embedding search (faster than exact match)

FUTURE ENHANCEMENTS:
  - Clustering analysis on memories (find patterns)
  - Time-series forecasting on mood/productivity trends
  - Recommendation engine based on memory embeddings
  - Privacy-preserving aggregate insights across contacts
*/
