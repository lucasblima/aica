# Aica Database Schema - Complete Documentation

**Version**: 2.0 (Phase 2 Complete)
**Last Updated**: December 2, 2025
**Database**: Supabase PostgreSQL
**Status**: Production Ready

## Table of Contents
1. [Overview](#overview)
2. [Complete Table Inventory (24 Tables)](#complete-table-inventory)
3. [Detailed Table Schemas](#detailed-table-schemas)
4. [Relationships & Foreign Keys](#relationships--foreign-keys)
5. [Migration Guide](#migration-guide)
6. [Performance Optimization](#performance-optimization)
7. [Security & RLS Policies](#security--rls-policies)

---

## Overview

The Aica Life OS database consists of **24 tables** organized across 6 functional domains:

### Domain Breakdown
- **User & Profile Management** (4 tables)
- **Work/Task Management** (3 tables)
- **AI Features & Memory** (4 tables)
- **Gamification** (3 tables)
- **Podcast Module** (6 tables)
- **Life Planning** (2 tables)
- **Supporting/Junction** (2 tables)

### Key Characteristics
- Privacy-first design (no raw message storage)
- Vector-based semantic search (pgvector)
- Real-time sync with n8n workflows
- Complete RLS security policies
- Automatic timestamp management

---

## Complete Table Inventory

### 🔐 User & Profile Management (4 tables)

| # | Table | Purpose | Records | Status |
|---|-------|---------|---------|--------|
| 1 | **users** | Authentication & core profile | 1 per user | Active |
| 2 | **profiles** | Extended profile information | 1 per user | Active |
| 3 | **associations** | Organizations/groups/networks | Variable | Active |
| 4 | **association_members** | User memberships | Variable | Active |

### 📋 Work/Task Management (3 tables)

| # | Table | Purpose | Records | Status |
|---|-------|---------|---------|--------|
| 5 | **work_items** | Tasks, agenda items, milestones | High usage | Active |
| 6 | **states** | Workflow states (todo, done, etc) | ~5 per association | Active |
| 7 | **modules** | Life areas (health, finance, etc) | ~7 per association | Active |

### 🧠 AI Features & Memory (4 tables)

| # | Table | Purpose | Records | Status |
|---|-------|---------|---------|--------|
| 8 | **memories** | Structured insights with embeddings | Per interaction | Active |
| 9 | **contact_network** | Relationship metadata & scoring | Per contact | Active |
| 10 | **daily_reports** | End-of-day summaries & analytics | Daily per user | Active |
| 11 | **pair_conversations** | AI-generated conversation drafts | Variable | Active |

### 🎮 Gamification (3 tables)

| # | Table | Purpose | Records | Status |
|---|-------|---------|---------|--------|
| 12 | **user_stats** | XP, levels, global stats | 1 per user | Active |
| 13 | **user_streaks** | Daily streak tracking | 1 per user | Active |
| 14 | **user_achievements** | Unlocked badges & awards | Per achievement | Active |

### 🎙️ Podcast Module (6 tables)

| # | Table | Purpose | Records | Status |
|---|-------|---------|---------|--------|
| 15 | **podcast_shows** | Show metadata & settings | Per show | Active |
| 16 | **podcast_episodes** | Episodes/projects & drafts | Per project | Active |
| 17 | **podcast_topics** | Discussion topics/pauta items | Per episode | Active |
| 18 | **podcast_topic_categories** | Topic classification | ~20 standard | Active |
| 19 | **podcast_news_articles** | Reference articles | Per research | Active |
| 20 | **podcast_shows_with_stats** | View: Shows + statistics | Materialized | Active |

### 🗓️ Life Planning (2 tables)

| # | Table | Purpose | Records | Status |
|---|-------|---------|---------|--------|
| 21 | **life_events** | Life milestones & goals | Variable | Active |
| 22 | **life_areas** | Life planning categories | ~7 standard | Active |

### 🔗 Supporting/Junction Tables (2 tables)

| # | Table | Purpose | Records | Status |
|---|-------|---------|---------|--------|
| 23 | **work_item_assignees** | Task assignments | Per assignment | Active |
| 24 | **notifications** | User notifications | Per notification | Active |

---

## Detailed Table Schemas

### 1. users
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  avatar_url text,
  birth_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);
```
**Purpose**: Core authentication & user identity
**Key Fields**: email (unique), birth_date (for life weeks calculation)
**RLS**: Users can only read/update own record
**Relationships**: 1:N with associations, work_items, memories, daily_reports

### 2. profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES users(id),
  bio text,
  timezone text,
  language text,
  theme text,
  preferences jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Extended profile information & preferences
**Key Fields**: preferences (JSON for flexible settings)
**RLS**: Users can only read/update own profile

### 3. associations
```sql
CREATE TABLE associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  description text,
  type text, -- 'personal', 'association', 'company', 'network'
  cnpj text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Organizations/groups/networks (multi-tenant)
**Key Fields**: type (personal/association/company), cnpj (tax ID)
**RLS**: Users can read associations they're members of
**Relationships**: 1:N with work_items, states, modules, association_members

### 4. association_members
```sql
CREATE TABLE association_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid REFERENCES associations(id),
  user_id uuid REFERENCES users(id),
  role text, -- 'admin', 'member', 'viewer'
  joined_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Membership/permissions management
**Key Fields**: role (admin/member/viewer)
**RLS**: Users can read own memberships

### 5. work_items
```sql
CREATE TABLE work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  association_id uuid REFERENCES associations(id),
  module_id uuid REFERENCES modules(id),
  title text NOT NULL,
  description text,
  priority text, -- 'urgent', 'high', 'medium', 'low'
  priority_quadrant text, -- 'urgent-important', 'important', 'urgent', 'low'
  state_id uuid REFERENCES states(id),
  due_date date,
  scheduled_time time,
  estimated_duration integer, -- minutes
  completed_at timestamp with time zone,
  archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Core task/agenda management
**Key Fields**: priority_quadrant (Eisenhower matrix), estimated_duration (for efficiency tracking)
**RLS**: Users can read/modify own items
**Relationships**: 1:N with work_item_assignees

### 6. states
```sql
CREATE TABLE states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid REFERENCES associations(id),
  name text NOT NULL, -- 'Todo', 'In Progress', 'Review', 'Done'
  entity_type text, -- 'work_item', 'podcast_episode'
  sequence integer,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Workflow states (customizable per association)
**Key Fields**: sequence (for ordering), entity_type (polymorphic)
**RLS**: Users can read states for associations they're in

### 7. modules
```sql
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid REFERENCES associations(id),
  name text NOT NULL, -- 'Finanças', 'Saúde', 'Educação', etc.
  description text,
  icon text,
  color text,
  sequence integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Life areas/modules (customizable categories)
**Key Fields**: name (default: finance, health, education, legal, community)
**RLS**: Users can read modules for associations they're in

### 8. memories
```sql
CREATE TABLE memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  contact_id uuid REFERENCES contact_network(id),
  category text, -- 'insight', 'preference', 'goal', 'issue'
  title text NOT NULL,
  content text NOT NULL,
  source text, -- 'whatsapp', 'email', 'note', 'system'
  embedding vector(1536), -- Gemini embeddings
  confidence_score numeric(3,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops);
```
**Purpose**: Structured AI insights with semantic search
**Key Fields**: embedding (pgvector 1536-dim), confidence_score (0-1)
**Features**: Vector index for fast semantic search
**RLS**: Users can only read own memories

### 9. contact_network
```sql
CREATE TABLE contact_network (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  contact_name text NOT NULL,
  contact_identifier text, -- phone, email, etc.
  relationship_type text, -- 'family', 'friend', 'colleague', 'acquaintance'
  interaction_count integer DEFAULT 0,
  last_interaction date,
  health_score numeric(3,2), -- 0-1 (relationship quality)
  shared_associations text[], -- array of association names
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Relationship tracking without storing raw messages
**Key Fields**: health_score (relationship quality 0-1), metadata (flexible)
**Privacy**: No message storage; only aggregated insights
**RLS**: Users can only manage own contacts

### 10. daily_reports
```sql
CREATE TABLE daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  date date NOT NULL,
  productivity_score integer, -- 0-100
  mood integer, -- 1-5
  energy_level integer, -- 1-5
  stress_level integer, -- 1-5
  tasks_completed integer,
  tasks_total integer,
  focus_duration integer, -- minutes
  top_contacts text[],
  key_insights text,
  recommendations text,
  summary jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX daily_reports_user_date ON daily_reports(user_id, date);
```
**Purpose**: End-of-day summaries with AI insights
**Key Fields**: productivity_score (0-100), mood (1-5)
**Optimization**: Unique index prevents duplicates per user/day
**RLS**: Users can only read own reports

### 11. pair_conversations
```sql
CREATE TABLE pair_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  contact_id uuid REFERENCES contact_network(id),
  conversation_context text,
  ai_draft text,
  confidence_score numeric(3,2),
  sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: AI-generated conversation drafts (privacy-first)
**Key Fields**: ai_draft (suggested message), confidence_score
**Privacy**: Never stores original messages
**RLS**: Users can only read own conversations

### 12. user_stats
```sql
CREATE TABLE user_stats (
  id uuid PRIMARY KEY REFERENCES users(id),
  total_xp integer DEFAULT 0,
  current_level integer DEFAULT 1,
  total_badges integer DEFAULT 0,
  best_streak integer DEFAULT 0,
  total_tasks_completed integer DEFAULT 0,
  total_days_active integer DEFAULT 0,
  last_activity_date date,
  global_rank integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Gamification metrics & statistics
**Key Fields**: total_xp, current_level, global_rank
**RLS**: All can read (for leaderboard), users can only update own

### 13. user_streaks
```sql
CREATE TABLE user_streaks (
  id uuid PRIMARY KEY REFERENCES users(id),
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_activity_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Daily streak tracking
**Key Fields**: current_streak, longest_streak
**Logic**: Updated daily by n8n workflow

### 14. user_achievements
```sql
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  badge_id text NOT NULL, -- 'getting-started', 'task-master', etc.
  badge_name text,
  rarity text, -- 'common', 'rare', 'epic', 'legendary'
  xp_reward integer,
  unlocked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX achievements_user_badge ON user_achievements(user_id, badge_id);
```
**Purpose**: Unlocked badges & awards
**Key Fields**: rarity (common/rare/epic/legendary), xp_reward
**Optimization**: Unique index prevents duplicate unlocks

### 15. podcast_shows
```sql
CREATE TABLE podcast_shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  description text,
  cover_image_url text,
  status text, -- 'draft', 'active', 'archived'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Podcast show metadata
**Key Fields**: status (draft/active/archived)
**Relationships**: 1:N with podcast_episodes

### 16. podcast_episodes
```sql
CREATE TABLE podcast_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES podcast_shows(id),
  title text NOT NULL,
  description text,
  status text, -- 'planning', 'scripting', 'recording', 'published'
  episode_number integer,
  publish_date date,
  duration_minutes integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Podcast episodes/projects
**Key Fields**: status (planning/scripting/recording/published)
**Relationships**: 1:N with podcast_topics

### 17. podcast_topics
```sql
CREATE TABLE podcast_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES podcast_episodes(id),
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES podcast_topic_categories(id),
  order_index integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Discussion topics (pauta) for podcast episodes
**Key Fields**: order_index (for ordering), category_id
**Relationships**: N:1 with podcast_topic_categories

### 18. podcast_topic_categories
```sql
CREATE TABLE podcast_topic_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text,
  icon text,
  created_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Standard topic categories
**Examples**: Technology, Health, Business, Entertainment, etc.
**Data**: Pre-populated with ~20 standard categories

### 19. podcast_news_articles
```sql
CREATE TABLE podcast_news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES podcast_topics(id),
  title text NOT NULL,
  url text,
  source text,
  summary text,
  relevance_score numeric(3,2),
  created_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Reference articles for podcast research
**Key Fields**: relevance_score (for ranking)
**Source**: Retrieved via Google News API during podcast planning

### 20. podcast_shows_with_stats (Materialized View)
```sql
CREATE MATERIALIZED VIEW podcast_shows_with_stats AS
SELECT
  ps.id,
  ps.title,
  ps.description,
  ps.user_id,
  COUNT(DISTINCT pe.id) as episode_count,
  COUNT(DISTINCT pt.id) as total_topics,
  MAX(pe.publish_date) as latest_episode_date,
  ps.created_at
FROM podcast_shows ps
LEFT JOIN podcast_episodes pe ON ps.id = pe.show_id
LEFT JOIN podcast_topics pt ON pe.id = pt.episode_id
GROUP BY ps.id, ps.title, ps.description, ps.user_id, ps.created_at;
```
**Purpose**: Denormalized view for performance
**Use Case**: Podcast library with statistics
**Refresh**: Manual via n8n trigger

### 21. life_events
```sql
CREATE TABLE life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  description text,
  week_number integer, -- weeks since birth (for life grid)
  event_date date,
  type text, -- 'milestone', 'goal', 'memory'
  status text, -- 'planned', 'completed', 'skipped'
  module_id uuid REFERENCES modules(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Life milestones & planning
**Key Fields**: week_number (Memento Mori grid), type
**Relationships**: N:1 with modules (optional)

### 22. life_areas
```sql
CREATE TABLE life_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid REFERENCES associations(id),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```
**Purpose**: Life planning categories
**Examples**: Finance, Health, Education, Legal, Community
**Note**: Often references via modules table

### 23. work_item_assignees
```sql
CREATE TABLE work_item_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid REFERENCES work_items(id),
  user_id uuid REFERENCES users(id),
  assigned_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX assignees_item_user ON work_item_assignees(work_item_id, user_id);
```
**Purpose**: Task assignment relationships
**Optimization**: Unique index prevents duplicate assignments

### 24. notifications
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  message text,
  type text, -- 'info', 'success', 'warning', 'error', 'achievement'
  read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX notifications_user_read ON notifications(user_id, read);
```
**Purpose**: User notifications
**Key Fields**: type (multiple notification types), read (tracking)
**Index**: For efficient unread count queries

---

## Relationships & Foreign Keys

### Primary Relationships

```
users (1) --> (N) associations
users (1) --> (N) work_items
users (1) --> (N) memories
users (1) --> (N) daily_reports
users (1) --> (N) user_achievements
users (1) --> (1) user_stats
users (1) --> (1) user_streaks
users (1) --> (N) podcast_shows
users (1) --> (N) life_events
users (1) --> (N) contact_network
users (1) --> (N) notifications

associations (1) --> (N) work_items
associations (1) --> (N) modules
associations (1) --> (N) states
associations (1) --> (N) life_areas
associations (1) --> (N) association_members

modules (1) --> (N) work_items
states (1) --> (N) work_items

work_items (1) --> (N) work_item_assignees
contact_network (1) --> (N) memories
contact_network (1) --> (N) pair_conversations

podcast_shows (1) --> (N) podcast_episodes
podcast_episodes (1) --> (N) podcast_topics
podcast_topic_categories (1) --> (N) podcast_topics
podcast_topics (0..1) --> (N) podcast_news_articles
```

---

## Migration Guide

### Phase 1: Core Tables (Already Deployed)
1. users
2. associations
3. association_members
4. work_items
5. states
6. modules
7. work_item_assignees
8. life_events
9. life_areas

### Phase 2: AI & Gamification (Deployed Dec 2025)
1. memories (with pgvector)
2. contact_network
3. daily_reports
4. pair_conversations
5. user_stats
6. user_streaks
7. user_achievements
8. notifications

### Phase 3: Podcast Module (Deployed Dec 2025)
1. podcast_shows
2. podcast_episodes
3. podcast_topics
4. podcast_topic_categories
5. podcast_news_articles
6. podcast_shows_with_stats (view)

### Migration Steps

**For existing deployments:**

```bash
# 1. Create Phase 2 tables
psql -h $SUPABASE_HOST -U postgres -d $DATABASE \
  -f docs/DATABASE_SCHEMA_NEW_TABLES.sql

# 2. Enable pgvector extension (if not enabled)
psql -h $SUPABASE_HOST -U postgres -d $DATABASE \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Create Podcast tables
psql -h $SUPABASE_HOST -U postgres -d $DATABASE \
  -f docs/PODCAST_SCHEMA.sql

# 4. Set up RLS policies
psql -h $SUPABASE_HOST -U postgres -d $DATABASE \
  -f docs/RLS_POLICIES.sql

# 5. Verify schema
psql -h $SUPABASE_HOST -U postgres -d $DATABASE \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

---

## Performance Optimization

### Indexes

```sql
-- Query optimization indexes
CREATE INDEX idx_work_items_user_date ON work_items(user_id, created_at);
CREATE INDEX idx_work_items_state ON work_items(state_id);
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_daily_reports_user_date ON daily_reports(user_id, date DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE UNIQUE INDEX idx_daily_reports_unique ON daily_reports(user_id, date);
CREATE UNIQUE INDEX idx_user_achievements_unique ON user_achievements(user_id, badge_id);
```

### Materialized Views
- `podcast_shows_with_stats` - Refreshed daily by n8n

### Query Best Practices
1. Always filter by user_id (RLS enforcement)
2. Use indexes for common filters
3. Limit results with pagination (50-100 rows)
4. Use vector search for semantic queries on memories

---

## Security & RLS Policies

### Authentication
- Supabase built-in auth (JWT)
- Row-Level Security (RLS) on all tables
- Service role for backend operations (n8n)

### RLS Policies Summary

| Table | Users Can | Service Role |
|-------|-----------|--------------|
| users | Read/update own | Full access |
| associations | Read (member of) | Full access |
| work_items | Read/modify own | Full access |
| memories | Read/modify own | Full access |
| daily_reports | Read own | Full access |
| user_stats | Read all (leaderboard) | Full access |
| user_achievements | Read own | Full access |
| notifications | Read own | Full access |

### Data Privacy
- No raw messages stored (only summarized insights)
- PII protected by RLS
- GDPR-compliant design (can export user data)

---

## Monitoring & Maintenance

### Health Checks
```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check row counts
SELECT
  tablename,
  n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

### Backup Strategy
- Supabase automated daily backups
- Weekly full backups to Cloud Storage
- Transaction logs retained for 7 days

### Performance Monitoring
- Monitor query performance via Supabase dashboard
- Track vector search latency
- Monitor RLS policy overhead

---

## Summary Statistics

**Total Tables**: 24
**Total Columns**: ~300
**Relationships**: ~30 foreign keys
**Indexes**: ~15 custom indexes
**RLS Policies**: 8+ policies
**Storage**: ~500MB - 2GB (depending on usage)
**Backup Size**: 2-5x database size

---

**Last Updated**: December 2, 2025
**Status**: Production Ready
**Next Review**: Q1 2026
