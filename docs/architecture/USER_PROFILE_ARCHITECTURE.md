# User Profile System Architecture

> Designed for AICA Life OS. Aggregates data from all 8 modules + Google integrations into rich, comparable user profiles.

---

## 1. Design Decisions

### 1.1 Extend `user_patterns`, don't replace it

The `user_patterns` table (OpenClaw Phase 4) already has:
- Pattern types: productivity, emotional, routine, social, health, learning, trigger, strength
- Confidence scoring with evidence tracking
- Vector embeddings (768d via `text-embedding-004`) for similarity search
- Weekly synthesis pipeline (`synthesize-user-patterns` EF + `get_weekly_synthesis_context` RPC)
- IVFFlat/HNSW indexes for vector search

**Decision**: Keep `user_patterns` as the **behavioral layer**. Add a new `user_profile_snapshots` table as the **aggregated profile layer** that materializes cross-module statistics into a queryable, comparable structure. The two tables serve different purposes:

| Layer | Table | Purpose | Update Frequency |
|-------|-------|---------|-----------------|
| Behavioral | `user_patterns` | AI-discovered patterns with confidence | Weekly (Sun 23:00 BRT) |
| Aggregated | `user_profile_snapshots` | Quantitative stats from all modules | Daily (after Life Council, ~06:30 BRT) |
| Dimension Scores | `user_profile_dimensions` | Normalized 0-1 scores per dimension | Daily (computed from snapshot + patterns) |

### 1.2 Profile Dimensions

Each user profile is scored across **8 dimensions** (0.0 to 1.0):

| Dimension | Data Sources | Signals |
|-----------|-------------|---------|
| **Emotional Intelligence** | Journey moments, sentiment_data, daily_council philosopher_output | Emotion diversity, reflection depth, sentiment trends |
| **Productivity** | Atlas work_items, daily_council strategist_output | Completion rate, Eisenhower Q2 focus, streak consistency |
| **Financial Awareness** | Finance transactions | Categorization coverage, recurring tracking, budget adherence |
| **Social Connectivity** | Connections contacts, WhatsApp dossiers, conversation_threads | Network size, interaction frequency, relationship depth |
| **Creativity** | Studio podcast_episodes, podcast_shows | Content produced, episode frequency, guest diversity |
| **Physical Wellness** | Flux workouts, daily_council biohacker_output | Training consistency, sleep estimates, overwork signals |
| **Knowledge & Growth** | Journey tags (#aprendizado), moments quality_score, user_patterns (learning type) | Learning moments ratio, quality tier distribution |
| **Digital Organization** | Google Drive files, Gmail patterns, Calendar events | File organization, email response patterns, calendar density |

### 1.3 Data Aggregation Pipeline

```
                    +------------------+
                    |   pg_cron daily   |
                    |   06:30 BRT       |
                    +--------+---------+
                             |
                    +--------v---------+
                    | build-user-profile|  (new Edge Function)
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v-----+  +-----v-------+
     | AICA Data  |  | Google Data|  | Existing    |
     | (RPC call) |  | (optional) |  | Patterns    |
     +--------+---+  +------+-----+  +-----+-------+
              |              |              |
              +--------------+--------------+
                             |
                    +--------v---------+
                    | Gemini 2.5 Flash |
                    | (scoring +       |
                    |  narrative)      |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v-----------+  |  +-----------v--------+
     | user_profile_       |  |  | user_profile_      |
     | snapshots           |  |  | dimensions         |
     | (raw aggregates)    |  |  | (normalized scores)|
     +--------------------+   |  +--------------------+
                              |
                    +---------v--------+
                    | Profile narrative |
                    | (AI-generated     |
                    |  summary text)    |
                    +------------------+
```

### 1.4 Profile Comparison

Two mechanisms for comparing users:

1. **Vector similarity** (existing): Use `user_patterns` embeddings with `get_relevant_patterns` RPC. Compare pattern overlap using cosine similarity across all active patterns.

2. **Dimension radar** (new): Compare normalized dimension scores directly. This enables:
   - Radar chart overlay of two profiles
   - "Complementary strengths" detection (User A high creativity + low finance, User B opposite)
   - Similarity percentage based on Euclidean distance of dimension vectors

### 1.5 Privacy Model

| Data Level | Stored | Visible to Owner | Comparable |
|-----------|--------|-------------------|-----------|
| Raw module data | Already in module tables | Yes (existing) | No |
| Aggregated stats | `user_profile_snapshots` | Yes | Only if user opts in |
| Dimension scores | `user_profile_dimensions` | Yes | Only if user opts in |
| AI narrative | `user_profile_snapshots.narrative` | Yes | No |
| Pattern embeddings | `user_patterns.embedding` | No (backend only) | Yes (similarity search) |

Users must explicitly opt-in to profile comparison via `user_profile_snapshots.is_public`.

---

## 2. Database Schema

### 2.1 New Table: `user_profile_snapshots`

```sql
CREATE TABLE user_profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Module aggregates (raw numbers)
  stats JSONB NOT NULL DEFAULT '{}',
  -- Structure:
  -- {
  --   "journey": { "total_moments": N, "avg_quality": N, "emotion_diversity": N, "streak_days": N },
  --   "atlas": { "total_tasks": N, "completed_7d": N, "completion_rate": N, "q2_ratio": N },
  --   "finance": { "total_transactions": N, "categorized_pct": N, "recurring_tracked": N },
  --   "connections": { "total_contacts": N, "with_dossier": N, "active_threads_7d": N },
  --   "studio": { "total_shows": N, "total_episodes": N, "episodes_30d": N },
  --   "flux": { "total_workouts": N, "workouts_7d": N, "active_athletes": N },
  --   "google": { "gmail_count_7d": N, "drive_files": N, "calendar_events_7d": N }
  -- }

  -- AI-generated narrative summary (2-3 paragraphs, Portuguese)
  narrative TEXT,

  -- Overall wellness indicator (from Life Council trend)
  wellness_trend TEXT CHECK (wellness_trend IN ('thriving', 'balanced', 'strained', 'burnout_risk')),

  -- Comparison opt-in
  is_public BOOLEAN DEFAULT FALSE,

  -- Metadata
  model_used TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_snapshot_date_unique UNIQUE (user_id, snapshot_date)
);

CREATE INDEX idx_profile_snapshots_user ON user_profile_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_profile_snapshots_public ON user_profile_snapshots(is_public) WHERE is_public = true;

ALTER TABLE user_profile_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own snapshots" ON user_profile_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view public snapshots" ON user_profile_snapshots
  FOR SELECT USING (is_public = true);

CREATE POLICY "Service role manages snapshots" ON user_profile_snapshots
  FOR ALL USING (true);
```

### 2.2 New Table: `user_profile_dimensions`

```sql
CREATE TABLE user_profile_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Dimension scores (0.0 to 1.0)
  emotional_intelligence NUMERIC(4,3) DEFAULT 0,
  productivity NUMERIC(4,3) DEFAULT 0,
  financial_awareness NUMERIC(4,3) DEFAULT 0,
  social_connectivity NUMERIC(4,3) DEFAULT 0,
  creativity NUMERIC(4,3) DEFAULT 0,
  physical_wellness NUMERIC(4,3) DEFAULT 0,
  knowledge_growth NUMERIC(4,3) DEFAULT 0,
  digital_organization NUMERIC(4,3) DEFAULT 0,

  -- Composite vector for fast comparison (8 dimensions)
  dimension_vector VECTOR(8),

  -- Which dimensions changed most since last snapshot
  biggest_growth TEXT,   -- dimension name
  biggest_decline TEXT,  -- dimension name

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_dimension_date_unique UNIQUE (user_id, snapshot_date)
);

CREATE INDEX idx_profile_dims_user ON user_profile_dimensions(user_id, snapshot_date DESC);

-- HNSW index for profile similarity search
CREATE INDEX idx_profile_dims_vector ON user_profile_dimensions
  USING hnsw (dimension_vector vector_cosine_ops);

ALTER TABLE user_profile_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dimensions" ON user_profile_dimensions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view public dimensions" ON user_profile_dimensions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profile_snapshots ups
      WHERE ups.user_id = user_profile_dimensions.user_id
        AND ups.snapshot_date = user_profile_dimensions.snapshot_date
        AND ups.is_public = true
    )
  );

CREATE POLICY "Service role manages dimensions" ON user_profile_dimensions
  FOR ALL USING (true);
```

### 2.3 New RPCs

```sql
-- Gather all module stats for profile building
CREATE OR REPLACE FUNCTION get_profile_aggregation_context(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_journey JSONB;
  v_atlas JSONB;
  v_finance JSONB;
  v_connections JSONB;
  v_studio JSONB;
  v_flux JSONB;
  v_council JSONB;
  v_patterns JSONB;
  v_gamification JSONB;
BEGIN
  -- Journey stats
  SELECT jsonb_build_object(
    'total_moments', COUNT(*),
    'moments_7d', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
    'avg_quality', ROUND(AVG(COALESCE((sentiment_data->>'quality_score')::NUMERIC, 0)), 2),
    'emotion_diversity', COUNT(DISTINCT emotion),
    'top_emotions', (
      SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('emotion', emotion, 'count', COUNT(*)) AS e
        FROM moments WHERE user_id = p_user_id AND emotion IS NOT NULL
        GROUP BY emotion ORDER BY COUNT(*) DESC LIMIT 5
      ) sub
    ),
    'tag_distribution', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('tag', unnest(tags), 'count', COUNT(*)) AS t
        FROM moments WHERE user_id = p_user_id AND tags IS NOT NULL
        GROUP BY unnest(tags) ORDER BY COUNT(*) DESC LIMIT 10
      ) sub
    )
  ) INTO v_journey
  FROM moments WHERE user_id = p_user_id;

  -- Atlas stats
  SELECT jsonb_build_object(
    'total_tasks', COUNT(*),
    'completed_total', COUNT(*) FILTER (WHERE status = 'done'),
    'completed_7d', COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days'),
    'overdue', COUNT(*) FILTER (WHERE status != 'done' AND due_date < CURRENT_DATE),
    'completion_rate', CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE status = 'done')::NUMERIC / COUNT(*)::NUMERIC, 3)
      ELSE 0 END,
    'priority_distribution', jsonb_build_object(
      'urgent_important', COUNT(*) FILTER (WHERE priority = 'urgent_important'),
      'important', COUNT(*) FILTER (WHERE priority = 'important'),
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent'),
      'neither', COUNT(*) FILTER (WHERE priority = 'neither' OR priority IS NULL)
    )
  ) INTO v_atlas
  FROM work_items WHERE user_id = p_user_id;

  -- Finance stats
  SELECT jsonb_build_object(
    'total_transactions', COUNT(*),
    'transactions_30d', COUNT(*) FILTER (WHERE transaction_date >= (CURRENT_DATE - 30)::TEXT),
    'categorized_pct', CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE category IS NOT NULL AND category != 'outros')::NUMERIC / COUNT(*)::NUMERIC, 3)
      ELSE 0 END,
    'recurring_count', COUNT(*) FILTER (WHERE is_recurring = true),
    'income_30d', COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND transaction_date >= (CURRENT_DATE - 30)::TEXT), 0),
    'expense_30d', COALESCE(ABS(SUM(amount) FILTER (WHERE type = 'expense' AND transaction_date >= (CURRENT_DATE - 30)::TEXT)), 0)
  ) INTO v_finance
  FROM finance_transactions WHERE user_id = p_user_id;

  -- Connections stats
  SELECT jsonb_build_object(
    'total_contacts', (SELECT COUNT(*) FROM contact_network WHERE user_id = p_user_id),
    'contacts_with_dossier', (SELECT COUNT(*) FROM contact_network WHERE user_id = p_user_id AND dossier_json IS NOT NULL),
    'active_threads_7d', (SELECT COUNT(*) FROM conversation_threads WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '7 days'),
    'total_messages', (SELECT COUNT(*) FROM whatsapp_messages WHERE user_id = p_user_id)
  ) INTO v_connections;

  -- Studio stats
  SELECT jsonb_build_object(
    'total_shows', (SELECT COUNT(*) FROM podcast_shows WHERE user_id = p_user_id),
    'total_episodes', (SELECT COUNT(*) FROM podcast_episodes pe JOIN podcast_shows ps ON pe.show_id = ps.id WHERE ps.user_id = p_user_id),
    'episodes_30d', (SELECT COUNT(*) FROM podcast_episodes pe JOIN podcast_shows ps ON pe.show_id = ps.id WHERE ps.user_id = p_user_id AND pe.created_at >= NOW() - INTERVAL '30 days')
  ) INTO v_studio;

  -- Flux stats
  SELECT jsonb_build_object(
    'total_athletes', (SELECT COUNT(*) FROM athletes WHERE coach_id = p_user_id),
    'total_workouts', (SELECT COUNT(*) FROM workout_blocks wb JOIN athletes a ON wb.athlete_id = a.id WHERE a.coach_id = p_user_id),
    'workouts_7d', (SELECT COUNT(*) FROM workout_blocks wb JOIN athletes a ON wb.athlete_id = a.id WHERE a.coach_id = p_user_id AND wb.created_at >= NOW() - INTERVAL '7 days')
  ) INTO v_flux;

  -- Latest council insight
  SELECT COALESCE(jsonb_build_object(
    'overall_status', c.overall_status,
    'headline', c.headline,
    'philosopher_pattern', c.philosopher_output->>'pattern',
    'strategist_completion', c.strategist_output->>'completionRate',
    'biohacker_sleep', c.biohacker_output->>'sleepEstimate'
  ), '{}'::jsonb) INTO v_council
  FROM daily_council_insights c
  WHERE c.user_id = p_user_id
  ORDER BY c.insight_date DESC LIMIT 1;

  -- Active patterns summary
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type', up.pattern_type,
    'key', up.pattern_key,
    'description', up.description,
    'confidence', up.confidence_score
  ) ORDER BY up.confidence_score DESC), '[]'::jsonb) INTO v_patterns
  FROM user_patterns up
  WHERE up.user_id = p_user_id AND up.is_active = true AND up.confidence_score >= 0.5;

  -- Gamification stats
  SELECT COALESCE(jsonb_build_object(
    'total_xp', g.total_xp,
    'level', g.level,
    'current_streak', g.current_streak,
    'longest_streak', g.longest_streak
  ), '{}'::jsonb) INTO v_gamification
  FROM user_game_profiles g WHERE g.user_id = p_user_id;

  RETURN jsonb_build_object(
    'journey', COALESCE(v_journey, '{}'::jsonb),
    'atlas', COALESCE(v_atlas, '{}'::jsonb),
    'finance', COALESCE(v_finance, '{}'::jsonb),
    'connections', COALESCE(v_connections, '{}'::jsonb),
    'studio', COALESCE(v_studio, '{}'::jsonb),
    'flux', COALESCE(v_flux, '{}'::jsonb),
    'council', COALESCE(v_council, '{}'::jsonb),
    'patterns', v_patterns,
    'gamification', COALESCE(v_gamification, '{}'::jsonb)
  );
END;
$$;

-- Compare two user profiles by dimension vector similarity
CREATE OR REPLACE FUNCTION compare_user_profiles(
  p_user_id_a UUID,
  p_user_id_b UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_dims_a user_profile_dimensions%ROWTYPE;
  v_dims_b user_profile_dimensions%ROWTYPE;
  v_similarity FLOAT;
  v_complementary JSONB;
BEGIN
  -- Get latest dimensions for each user
  SELECT * INTO v_dims_a FROM user_profile_dimensions
    WHERE user_id = p_user_id_a ORDER BY snapshot_date DESC LIMIT 1;
  SELECT * INTO v_dims_b FROM user_profile_dimensions
    WHERE user_id = p_user_id_b ORDER BY snapshot_date DESC LIMIT 1;

  IF v_dims_a IS NULL OR v_dims_b IS NULL THEN
    RETURN jsonb_build_object('error', 'One or both profiles not found');
  END IF;

  -- Cosine similarity via vector
  SELECT 1 - (v_dims_a.dimension_vector <=> v_dims_b.dimension_vector) INTO v_similarity;

  RETURN jsonb_build_object(
    'similarity_score', ROUND(v_similarity::NUMERIC, 3),
    'user_a', jsonb_build_object(
      'emotional_intelligence', v_dims_a.emotional_intelligence,
      'productivity', v_dims_a.productivity,
      'financial_awareness', v_dims_a.financial_awareness,
      'social_connectivity', v_dims_a.social_connectivity,
      'creativity', v_dims_a.creativity,
      'physical_wellness', v_dims_a.physical_wellness,
      'knowledge_growth', v_dims_a.knowledge_growth,
      'digital_organization', v_dims_a.digital_organization
    ),
    'user_b', jsonb_build_object(
      'emotional_intelligence', v_dims_b.emotional_intelligence,
      'productivity', v_dims_b.productivity,
      'financial_awareness', v_dims_b.financial_awareness,
      'social_connectivity', v_dims_b.social_connectivity,
      'creativity', v_dims_b.creativity,
      'physical_wellness', v_dims_b.physical_wellness,
      'knowledge_growth', v_dims_b.knowledge_growth,
      'digital_organization', v_dims_b.digital_organization
    )
  );
END;
$$;

-- Find similar profiles (for discovery / comparison suggestions)
CREATE OR REPLACE FUNCTION find_similar_profiles(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  similarity FLOAT,
  snapshot_date DATE
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH my_profile AS (
    SELECT dimension_vector, user_id AS my_id
    FROM user_profile_dimensions
    WHERE user_id = p_user_id
    ORDER BY snapshot_date DESC LIMIT 1
  )
  SELECT
    upd.user_id,
    1 - (upd.dimension_vector <=> mp.dimension_vector) AS similarity,
    upd.snapshot_date
  FROM user_profile_dimensions upd
  CROSS JOIN my_profile mp
  WHERE upd.user_id != mp.my_id
    AND EXISTS (
      SELECT 1 FROM user_profile_snapshots ups
      WHERE ups.user_id = upd.user_id
        AND ups.snapshot_date = upd.snapshot_date
        AND ups.is_public = true
    )
    AND upd.snapshot_date = (
      SELECT MAX(snapshot_date) FROM user_profile_dimensions
      WHERE user_id = upd.user_id
    )
  ORDER BY upd.dimension_vector <=> mp.dimension_vector ASC
  LIMIT p_limit;
$$;
```

---

## 3. Edge Function: `build-user-profile`

### Purpose
Aggregates cross-module data, computes dimension scores, generates narrative.

### Flow
1. Call `get_profile_aggregation_context` RPC (single DB round-trip)
2. Optionally fetch Google stats (Gmail count, Drive files, Calendar events) if scope granted
3. Send aggregated data to Gemini 2.5 Flash with scoring prompt
4. Parse dimension scores + narrative
5. Upsert into `user_profile_snapshots` and `user_profile_dimensions`
6. Generate `dimension_vector` from 8 scores

### Gemini Prompt (scoring)

```
Voce e um analista de perfil pessoal. Com base nos dados agregados do usuario,
atribua uma pontuacao de 0.0 a 1.0 para cada dimensao e gere uma narrativa.

DADOS AGREGADOS:
{context_json}

PADROES COMPORTAMENTAIS:
{patterns_json}

Para cada dimensao, calcule baseado nos sinais:
- emotional_intelligence: diversidade emocional, frequencia de reflexoes, tendencia de sentimento
- productivity: taxa de conclusao, foco Q2 Eisenhower, consistencia de streak
- financial_awareness: % categorizacao, tracking de recorrentes, razao receita/despesa
- social_connectivity: tamanho da rede, dossiers criados, threads ativas
- creativity: conteudo produzido, frequencia de episodios
- physical_wellness: consistencia de treinos, sinais do biohacker
- knowledge_growth: momentos de aprendizado, qualidade dos registros
- digital_organization: uso de Google integrado (se disponivel)

Gere uma narrativa de 2-3 paragrafos em portugues sobre quem e este usuario.
Tom: observador, respeitoso, insights uteis. NAO seja superficial.

Responda APENAS em JSON:
{
  "dimensions": {
    "emotional_intelligence": 0.XX,
    "productivity": 0.XX,
    "financial_awareness": 0.XX,
    "social_connectivity": 0.XX,
    "creativity": 0.XX,
    "physical_wellness": 0.XX,
    "knowledge_growth": 0.XX,
    "digital_organization": 0.XX
  },
  "narrative": "string - 2-3 paragrafos",
  "wellness_trend": "thriving | balanced | strained | burnout_risk",
  "biggest_growth": "dimension_name",
  "biggest_decline": "dimension_name"
}
```

### Trigger Options
- **Daily cron** (recommended): pg_cron at 06:30 BRT, after Life Council completes at 06:00
- **On-demand**: User presses "Atualizar Perfil" button (debounced, max 1x/day)
- **Auto after Life Council**: `run-life-council` can chain-call `build-user-profile`

---

## 4. Frontend Architecture

### 4.1 Hook: `useUserProfile`

```typescript
interface UserProfileSnapshot {
  id: string;
  snapshot_date: string;
  stats: ModuleStats;
  narrative: string | null;
  wellness_trend: 'thriving' | 'balanced' | 'strained' | 'burnout_risk';
  is_public: boolean;
}

interface ProfileDimensions {
  emotional_intelligence: number;
  productivity: number;
  financial_awareness: number;
  social_connectivity: number;
  creativity: number;
  physical_wellness: number;
  knowledge_growth: number;
  digital_organization: number;
  biggest_growth: string | null;
  biggest_decline: string | null;
}

interface UseUserProfileReturn {
  snapshot: UserProfileSnapshot | null;
  dimensions: ProfileDimensions | null;
  patterns: UserPattern[];  // from useUserPatterns
  isLoading: boolean;
  isBuilding: boolean;
  error: string | null;
  buildProfile: () => Promise<void>;
  togglePublic: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

### 4.2 Component Hierarchy

```
ProfilePage (existing, enhanced)
  |
  +-- ProfileHero
  |     +-- Avatar + Name + Email
  |     +-- WellnessBadge (thriving/balanced/strained/burnout_risk)
  |     +-- Level + XP bar (from gamification)
  |
  +-- DimensionRadar (new)
  |     +-- 8-axis radar chart (recharts)
  |     +-- Dimension labels with scores
  |     +-- Growth/decline indicators
  |
  +-- ProfileNarrative (new)
  |     +-- AI-generated narrative text
  |     +-- "Atualizar" button (debounced)
  |     +-- Last updated timestamp
  |
  +-- ModuleBreakdown (new)
  |     +-- Journey card (moments, emotions, quality)
  |     +-- Atlas card (tasks, completion rate)
  |     +-- Finance card (transactions, categorization)
  |     +-- Connections card (contacts, threads)
  |     +-- Studio card (shows, episodes)
  |     +-- Flux card (workouts, athletes)
  |     +-- Google card (Gmail, Drive, Calendar — if connected)
  |
  +-- PatternsList (existing useUserPatterns, restyled)
  |     +-- Grouped by pattern_type
  |     +-- Confidence bars
  |     +-- Evidence expand
  |
  +-- ProfileComparison (new, gated by is_public)
  |     +-- Search for other public profiles
  |     +-- Dual radar overlay
  |     +-- Similarity score
  |     +-- Complementary strengths callout
  |
  +-- ProfileSettings
        +-- Public toggle (comparison opt-in)
        +-- Profile frequency (daily/weekly)
        +-- Data sources toggle (which modules to include)
```

### 4.3 Visual Design (Jony Ive inspired)

- **Layout**: Full-width, generous whitespace, single-column with max-width 800px
- **Radar chart**: Subtle ceramic-border grid, amber accent for dimension values, soft animation
- **Cards**: `bg-ceramic-base rounded-2xl shadow-ceramic-emboss p-8` — ultra-minimal
- **Typography**: Large headings (text-3xl), lightweight body text, monochrome palette
- **Data density**: Show numbers with subtle labels, no unnecessary borders or dividers
- **Transitions**: Smooth fade-in on data load, gentle pulse on "building profile"

---

## 5. Profile Comparison Design

### 5.1 Comparison Flow

1. User A opens their profile and clicks "Comparar"
2. System shows list of public profiles (from `find_similar_profiles` RPC)
3. User A selects User B
4. `compare_user_profiles` RPC returns both dimension sets + similarity
5. Frontend renders dual radar chart overlay

### 5.2 Complementary Strengths

When comparing, highlight dimensions where users differ by > 0.3:
- "Voce e forte em **Produtividade** (0.82) onde [User B] pontua 0.45"
- "Voce pode aprender sobre **Inteligencia Emocional** com [User B] (0.91 vs seus 0.55)"

### 5.3 Privacy Safeguards

- Only dimension scores are visible to other users (NOT raw stats, NOT narrative)
- Users must opt-in via `is_public` toggle
- No PII in comparison views (no email, no transaction amounts, no message content)
- Pattern descriptions are NEVER shared between users
- Public profiles show display_name only (from onboarding `UserProfile`)

---

## 6. Integration Points

### 6.1 Life Council Chain

`run-life-council` already runs daily at 06:00 BRT. After successful insight generation, it can trigger `build-user-profile` via HTTP call (same pattern as `synthesize-user-patterns` chaining).

### 6.2 Chat System

`gemini-chat` can access profile data for context-aware responses:
- Add action `get_my_profile` that returns latest snapshot + dimensions
- Enables chat responses like "Based on your profile, your creativity dimension has grown 15% this month"

### 6.3 Google Data (Conditional)

If user has connected Google (scopes granted):
- Gmail: Count emails received/sent in 7d (from `gmail_cache` table)
- Drive: Count files modified in 7d (from `drive_cache` table)
- Calendar: Count events in 7d (from `calendar_events` table)

If NOT connected: `digital_organization` dimension defaults to 0.0 with message "Conecte sua conta Google para desbloquear esta dimensao"

---

## 7. Migration Plan

### Phase 1: Database + Edge Function
1. Create migration with `user_profile_snapshots` + `user_profile_dimensions` tables
2. Create `get_profile_aggregation_context` RPC
3. Create `compare_user_profiles` + `find_similar_profiles` RPCs
4. Deploy `build-user-profile` Edge Function
5. Add pg_cron job for daily profile building

### Phase 2: Frontend Core
1. Create `useUserProfile` hook
2. Build `DimensionRadar` component (recharts radar chart)
3. Build `ProfileNarrative` component
4. Build `ModuleBreakdown` cards
5. Enhance existing `ProfilePage` with new sections

### Phase 3: Comparison
1. Add `is_public` toggle UI
2. Build `ProfileComparison` component
3. Implement dual radar overlay
4. Add complementary strengths algorithm

### Phase 4: Chat Integration
1. Add `get_my_profile` action to `gemini-chat`
2. Include profile context in chat system prompt
3. Enable profile-aware responses

---

## 8. Key Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| New tables vs extend `user_patterns` | New tables | Different concerns: patterns = behavioral discovery, profiles = aggregated stats |
| Dimension scoring | AI (Gemini Flash) | Normalization across heterogeneous data sources needs AI judgment |
| Comparison mechanism | 8d vector + cosine similarity | Fast, works with HNSW index, intuitive radar chart |
| Update frequency | Daily (cron) | Balances freshness with API cost; on-demand available |
| Google data | Optional/conditional | Not all users will have Google connected |
| Privacy | Explicit opt-in | Only dimension scores shared, never raw data |
| Vector size | 8d (dimensions) + 768d (patterns) | Two complementary comparison methods |
