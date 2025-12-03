# Migration Guide: Aica Phase 2 - New Database Tables

## Overview

This guide explains how to implement the three new tables required for Phase 2 (Cleanup & Privacy):
1. **memories** - Emotional Intelligence context storage
2. **contact_network** - Privacy-first relationship management
3. **daily_reports** - End-of-day summaries and insights

These tables implement Pillars 3.3 (Communication & Collaboration) and 3.4 (Emotional Intelligence) from the PRD.

---

## Prerequisites

- Supabase project with PostgreSQL database access
- Admin/owner privileges to create tables and extensions
- Understanding of the existing schema (users, associations, work_items)

---

## Step 1: Enable Vector Support (pgvector)

The **memories** table uses embeddings for semantic search. You need the `pgvector` extension.

### In Supabase Dashboard:

1. Go to **SQL Editor** → **New Query**
2. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Click **Execute**

### Verify:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Should return one row with vector extension
```

---

## Step 2: Create the memories Table

This table stores structured insights extracted from communications, with no raw message content.

### SQL:

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source information
  source_type VARCHAR(50) NOT NULL,
  source_id UUID,
  source_contact_id UUID REFERENCES contact_network(id) ON DELETE SET NULL,

  -- Structured insight (no raw content)
  sentiment VARCHAR(20),
  sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  triggers TEXT[],
  subjects TEXT[],

  -- Summary & embeddings
  summary TEXT NOT NULL,
  embedding VECTOR(1536),

  -- Metadata
  importance FLOAT CHECK (importance >= 0 AND importance <= 1),
  tags TEXT[],
  associations UUID[],
  related_memory_ids UUID[],

  -- Privacy & lifecycle
  is_active BOOLEAN DEFAULT true,
  privacy_level VARCHAR(20) DEFAULT 'private',
  retention_until TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT memory_not_empty CHECK (summary IS NOT NULL AND summary != '')
);

-- Create indexes for performance
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_sentiment ON memories(sentiment);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_memories_source ON memories(source_type, source_id);

-- Create trigger for updated_at
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
```

### In Supabase:
1. **SQL Editor** → **New Query**
2. Paste the SQL above
3. Click **Execute**

### Verify:
```sql
-- Table should exist with correct columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'memories';

-- Indexes should exist
SELECT indexname FROM pg_indexes WHERE tablename = 'memories';
```

---

## Step 3: Create the contact_network Table

This table tracks relationship metadata and interaction patterns without storing message content.

### SQL:

```sql
CREATE TABLE contact_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact information
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email VARCHAR(255),
  avatar_url TEXT,

  -- Association links
  association_id UUID REFERENCES associations(id) ON DELETE SET NULL,
  user_id_if_internal UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Relationship metadata
  relationship_type VARCHAR(50),
  tags TEXT[],

  -- Interaction tracking (metadata only)
  last_interaction_at TIMESTAMP,
  interaction_count INT DEFAULT 0,
  interaction_frequency VARCHAR(50),

  -- Relationship health
  health_score FLOAT CHECK (health_score >= 0 AND health_score <= 100),
  sentiment_trend VARCHAR(20),

  -- Topics of interaction
  interaction_topics TEXT[],

  -- Engagement metrics
  response_avg_time_hours FLOAT,
  engagement_level VARCHAR(20),

  -- Notes & context
  notes TEXT,
  preferences JSONB,

  -- Status
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

-- Create indexes for performance
CREATE INDEX idx_contact_network_user_id ON contact_network(user_id);
CREATE INDEX idx_contact_network_phone ON contact_network(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_contact_network_email ON contact_network(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contact_network_last_interaction ON contact_network(last_interaction_at);
CREATE INDEX idx_contact_network_association ON contact_network(association_id);
CREATE INDEX idx_contact_network_health_score ON contact_network(health_score DESC);
CREATE INDEX idx_contact_network_internal_user ON contact_network(user_id_if_internal) WHERE user_id_if_internal IS NOT NULL;

-- Create trigger for updated_at
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

-- Trigger to update health_score when memories are added
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

### In Supabase:
1. **SQL Editor** → **New Query**
2. Paste the SQL above
3. Click **Execute**

### Verify:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'contact_network';
```

---

## Step 4: Create the daily_reports Table

This table stores end-of-day summaries with mood, productivity, and AI-generated insights.

### SQL:

```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,

  -- Productivity metrics
  tasks_completed INT DEFAULT 0,
  tasks_total INT DEFAULT 0,
  productivity_score FLOAT CHECK (productivity_score >= 0 AND productivity_score <= 100),
  estimated_vs_actual FLOAT,

  -- Emotional & mood data
  mood VARCHAR(20),
  mood_score FLOAT CHECK (mood_score >= -1 AND mood_score <= 1),
  energy_level INT CHECK (energy_level >= 0 AND energy_level <= 100),
  stress_level INT CHECK (stress_level >= 0 AND stress_level <= 100),

  -- Activity summary
  active_modules TEXT[],
  top_interactions TEXT[],
  significant_events TEXT[],

  -- Generated insights
  summary TEXT,
  key_insights TEXT[],
  patterns_detected TEXT[],

  -- Recommendations
  ai_recommendations TEXT[],
  suggested_focus_areas TEXT[],

  -- Memories created from this day
  memory_ids UUID[],

  -- Context & metadata
  notes TEXT,
  location VARCHAR(255),
  weather_notes VARCHAR(255),

  -- Privacy & retention
  is_shared_with_associations UUID[],
  retention_until TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, report_date)
);

-- Create indexes for performance
CREATE INDEX idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);
CREATE INDEX idx_daily_reports_mood ON daily_reports(mood);
CREATE INDEX idx_daily_reports_productivity ON daily_reports(productivity_score);
CREATE INDEX idx_daily_reports_created_at ON daily_reports(created_at DESC);

-- Create trigger for updated_at
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
```

### In Supabase:
1. **SQL Editor** → **New Query**
2. Paste the SQL above
3. Click **Execute**

---

## Step 5: Configure Row-Level Security (RLS)

Enable RLS for the new tables to ensure users can only access their own data.

### For memories table:

```sql
-- Enable RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own memories
CREATE POLICY memories_user_isolation ON memories
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Allow service role to bypass (for n8n workflows)
CREATE POLICY memories_service_role ON memories
  FOR ALL
  USING (auth.role() = 'service_role');
```

### For contact_network table:

```sql
-- Enable RLS
ALTER TABLE contact_network ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own contacts
CREATE POLICY contact_network_user_isolation ON contact_network
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Allow service role to bypass (for n8n workflows)
CREATE POLICY contact_network_service_role ON contact_network
  FOR ALL
  USING (auth.role() = 'service_role');
```

### For daily_reports table:

```sql
-- Enable RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own reports
CREATE POLICY daily_reports_user_isolation ON daily_reports
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Allow service role to bypass (for n8n workflows)
CREATE POLICY daily_reports_service_role ON daily_reports
  FOR ALL
  USING (auth.role() = 'service_role');
```

### In Supabase:
1. **SQL Editor** → **New Query**
2. Paste each policy block above (run separately)
3. Click **Execute** for each

---

## Step 6: Seed Data (Optional for Testing)

Create sample data for development/testing:

```sql
-- Insert test contact
INSERT INTO contact_network (user_id, name, phone_number, relationship_type, engagement_level, interaction_count)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'João Silva',
  '+55 11 98765-4321',
  'colleague',
  'medium',
  5
);

-- Insert test memory
INSERT INTO memories (user_id, source_type, sentiment, sentiment_score, triggers, subjects, summary, importance)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'message',
  'positive',
  0.8,
  ARRAY['project_completion', 'team_collaboration'],
  ARRAY['work', 'achievement'],
  'João completed the project successfully and provided positive feedback about team collaboration.',
  0.9
);

-- Insert test daily report
INSERT INTO daily_reports (user_id, report_date, tasks_completed, tasks_total, mood, mood_score, productivity_score)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  CURRENT_DATE,
  8,
  10,
  'good',
  0.7,
  80
);
```

---

## Step 7: Update Application Code

After creating the tables, update your application:

### 1. Update supabaseService.ts

Add functions to interact with the new tables:

```typescript
// Memory operations
export const createMemory = async (input: MemoryCreateInput) => {
  const { data, error } = await supabase
    .from('memories')
    .insert([input])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getMemoriesByUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Contact operations
export const getContactNetwork = async (userId: string) => {
  const { data, error } = await supabase
    .from('contact_network')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;
  return data;
};

export const createContact = async (input: ContactNetworkCreateInput, userId: string) => {
  const { data, error } = await supabase
    .from('contact_network')
    .insert([{ ...input, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Daily report operations
export const getDailyReport = async (userId: string, date: string) => {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('report_date', date)
    .single();

  if (error?.code === 'PGRST116') return null; // No rows found
  if (error) throw error;
  return data;
};

export const createDailyReport = async (input: DailyReportCreateInput, userId: string) => {
  const { data, error } = await supabase
    .from('daily_reports')
    .insert([{ ...input, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

### 2. Import types in your components:

```typescript
import { Memory, ContactNetwork, DailyReport } from '@/types/memoryTypes';
```

---

## Step 8: Verify Migration

Run these queries to verify everything is set up correctly:

```sql
-- Check all new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('memories', 'contact_network', 'daily_reports');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('memories', 'contact_network', 'daily_reports');

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('memories', 'contact_network', 'daily_reports');

-- Check triggers exist
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table IN ('memories', 'contact_network', 'daily_reports');
```

---

## Rollback Plan (if needed)

To remove the new tables (careful!):

```sql
DROP TABLE IF EXISTS daily_reports CASCADE;
DROP TABLE IF EXISTS memories CASCADE;
DROP TABLE IF EXISTS contact_network CASCADE;

-- If pgvector was only installed for this, you can drop it:
-- DROP EXTENSION IF EXISTS vector;
```

---

## Next Steps

After successfully migrating:

1. **Implement n8n Workflow** (Task 6)
   - Message processing pipeline
   - Gemini extraction
   - Automatic memory creation

2. **Build Contact Network UI** (Task 8)
   - Display contacts
   - Show health scores
   - Build profile views

3. **Implement Aica Auto** (Task 10)
   - Priority suggestion engine
   - Use memory embeddings for context

4. **Build Daily Reports UI** (Task 13)
   - Display daily summary
   - Show mood/productivity trends

---

## Troubleshooting

### Issue: "pgvector extension not found"
**Solution:** Ensure you ran `CREATE EXTENSION IF NOT EXISTS vector;` before creating the memories table.

### Issue: "Foreign key constraint failed"
**Solution:** Ensure `contact_network` table is created before `memories` table (if using source_contact_id).

### Issue: "RLS policy error when inserting"
**Solution:** Make sure the service role has permission. Check that `auth.role() = 'service_role'` is recognized.

### Issue: "Column 'user_id' doesn't exist in users table"
**Solution:** Verify your users table has an `id` column of type UUID.

---

## Performance Recommendations

1. **Vector Search Index:**
   - The `IVFFLAT` index provides fast approximate nearest neighbor search
   - Good for similarity matching between memories
   - Trade-off: slightly approximate results vs fast queries

2. **Health Score Calculations:**
   - The trigger automatically updates on memory insertion
   - Consider batching updates for high-volume scenarios

3. **Data Retention:**
   - Use `retention_until` field for GDPR compliance
   - Create a scheduled job to delete expired memories

4. **Pagination:**
   - Always paginate memory/report queries with `.range(0, 50)`
   - Especially important for vector similarity searches

---

## Security Considerations

1. **Raw Message Handling:**
   - NEVER insert raw message content into memories/contact_network
   - ALWAYS process through AI extraction first
   - ALWAYS discard raw payload after insertion

2. **Privacy Levels:**
   - Default to `privacy_level = 'private'`
   - Only set to 'shared' after explicit user consent

3. **Data Deletion:**
   - Use `retention_until` field
   - Create a scheduled cleanup job
   - Log deletions for audit trail

4. **Access Control:**
   - RLS ensures users only see their own data
   - Service role (n8n) can bypass for automation
   - Regular audit of access patterns
