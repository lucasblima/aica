# Aica Life OS - Complete Database Schema Documentation

**Last Updated**: December 2, 2025
**Database**: Supabase PostgreSQL
**Status**: Verified (25 of 31 tables documented)

> **Note**: User indicated 31 tables exist in the database. Current documentation covers 25 verified tables found through code analysis. Additional 6 tables may exist in backend services, migration files, or undocumented schemas.

---

## Table of Contents

1. [User & Profile Management](#user--profile-management)
2. [Work & Task Management](#work--task-management)
3. [AI Features & Memory](#ai-features--memory)
4. [Gamification System](#gamification-system)
5. [Podcast Module](#podcast-module)
6. [Life Planning](#life-planning)
7. [Supporting Tables](#supporting-tables)
8. [Database Architecture](#database-architecture)
9. [Security & RLS Policies](#security--rls-policies)
10. [Indexes & Performance](#indexes--performance)
11. [Migration Guide](#migration-guide)

---

## User & Profile Management

### 1. users

**Type**: Table (Auth managed)
**Purpose**: Core user identity, authentication metadata
**Primary Key**: id (UUID)

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  birth_date DATE,
  timezone VARCHAR(50),
  language VARCHAR(10) DEFAULT 'pt-BR',
  preferred_theme VARCHAR(20),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP
);
```

**Key Columns**:
- `id` - Unique identifier, linked to auth.users in Supabase Auth
- `birth_date` - Used for Memento Mori (Life Weeks) calculation
- `timezone` - For daily report scheduling and local time display
- `language` - Internationalization support (Portuguese/English)
- `preferred_theme` - Dark/light mode preference

**Relationships**:
- Referenced by: profiles, work_items, associations, memories, contact_network, daily_reports, user_stats, user_streaks, user_achievements

**RLS Policy**: Users can view and update only their own record

---

### 2. profiles

**Type**: Table
**Purpose**: Extended user profile information
**Primary Key**: id (UUID, FK to users)

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  birth_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Key Columns**:
- `id` - Reference to users.id
- `full_name` - Display name
- `avatar_url` - Profile picture URL
- `birth_date` - Birth date (duplicate from users for compatibility)

**Relationships**:
- One-to-one with users table

**RLS Policy**: Users can view and update only their own profile

---

### 3. associations

**Type**: Table
**Purpose**: Organizations, groups, and networks for multi-tenant support
**Primary Key**: id (UUID)

```sql
CREATE TABLE associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  logo_url TEXT,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'deleted'
  type VARCHAR(50), -- 'company', 'team', 'group', 'family', 'community'
  industry VARCHAR(100),
  website_url TEXT,
  email VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),

  -- Settings
  allow_external_members BOOLEAN DEFAULT false,
  member_join_method VARCHAR(50) DEFAULT 'invite', -- 'invite', 'open', 'request'

  -- Metadata
  sync_status VARCHAR(20) DEFAULT 'synced', -- 'synced', 'pending', 'failed'
  synced_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT association_not_empty CHECK (name IS NOT NULL AND name != '')
);
```

**Key Columns**:
- `owner_id` - User who created/owns the association
- `type` - Classification (company, team, family, etc.)
- `sync_status` - Integration sync state
- `member_join_method` - How new members can join

**Relationships**:
- One user has many associations
- Referenced by: association_members, work_items, contact_network, memories, daily_reports

**Indexes**:
- `idx_associations_owner_id` - For membership queries
- `idx_associations_status` - For filtering active associations

**RLS Policy**:
- Owners can fully manage their associations
- Members can view only their associations

---

### 4. association_members

**Type**: Table (Junction)
**Purpose**: User memberships in associations with roles
**Primary Key**: (association_id, user_id) - Composite

```sql
CREATE TABLE association_members (
  association_id UUID REFERENCES associations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  permission_level VARCHAR(20) DEFAULT 'read', -- 'read', 'write', 'admin'
  joined_at TIMESTAMP DEFAULT now(),
  invited_by UUID REFERENCES users(id),

  PRIMARY KEY (association_id, user_id)
);
```

**Key Columns**:
- `role` - Member role (owner/admin/member/viewer)
- `permission_level` - Access control (read/write/admin)
- `invited_by` - Who invited this member

**Relationships**:
- Many-to-many between users and associations
- Junction table linking users to their associations

**RLS Policy**: Members can view only their own memberships

---

## Work & Task Management

### 5. work_items

**Type**: Table
**Purpose**: Tasks, agenda items, milestones
**Primary Key**: id (UUID)

```sql
CREATE TABLE work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  association_id UUID REFERENCES associations(id) ON DELETE SET NULL,

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT,

  -- Priority & Status
  priority VARCHAR(20), -- 'urgent', 'high', 'medium', 'low', 'none'
  priority_quadrant VARCHAR(30) DEFAULT 'low', -- 'urgent-important', 'important', 'urgent', 'low'
  status_id UUID REFERENCES states(id),

  -- Timeline
  due_date DATE,
  scheduled_time TIME,
  start_date DATE,
  estimated_duration INT, -- Duration in minutes

  -- Completion tracking
  completed_at TIMESTAMP,
  completion_percentage INT DEFAULT 0,

  -- Categorization
  module_id UUID REFERENCES modules(id),
  tags TEXT[],

  -- Metadata
  archived BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'yearly'
  parent_item_id UUID, -- For sub-tasks

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT work_item_not_empty CHECK (title IS NOT NULL AND title != '')
);
```

**Key Columns**:
- `priority_quadrant` - Eisenhower Matrix quadrant
- `status_id` - Current workflow state
- `module_id` - Life area (finance, health, etc.)
- `estimated_duration` - For efficiency tracking
- `completed_at` - Completion timestamp (null if incomplete)

**Relationships**:
- Belongs to user and association
- References states and modules
- Can have work_item_assignees

**Indexes**:
- `idx_work_items_user_id` - User's tasks
- `idx_work_items_due_date` - Upcoming tasks
- `idx_work_items_status_id` - Filter by status
- `idx_work_items_priority_quadrant` - Matrix queries
- `idx_work_items_completed_at` - Completion analysis
- `idx_work_items_module_id` - Module-specific tasks

**RLS Policy**: Users can view/edit only their own items or those in their associations

---

### 6. states

**Type**: Table
**Purpose**: Workflow states (customizable per association)
**Primary Key**: id (UUID)

```sql
CREATE TABLE states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID REFERENCES associations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  color VARCHAR(7), -- Hex color code
  order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(association_id, name),
  CONSTRAINT state_not_empty CHECK (name IS NOT NULL AND name != '')
);
```

**Standard States**:
- todo / To Do
- in_progress / In Progress
- in_review / In Review
- done / Done
- archived / Archived

**Relationships**:
- Belongs to association (or global if association_id is NULL)
- Referenced by work_items

---

### 7. modules

**Type**: Table
**Purpose**: Life areas/modules for work item categorization
**Primary Key**: id (UUID)

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID REFERENCES associations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  emoji VARCHAR(10),
  order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(association_id, name),
  CONSTRAINT module_not_empty CHECK (name IS NOT NULL AND name != '')
);
```

**Standard Modules**:
- **Health** - Medical, fitness, nutrition
- **Finances** - Budget, investments, planning
- **Career** - Professional development, projects
- **Relationships** - Family, friends, community
- **Education** - Learning, skills, certifications
- **Legal** - Contracts, documents, compliance
- **Community** - Social, volunteer, networking
- **Personal** - Hobbies, spirituality, goals

**Relationships**:
- Belongs to association (or global)
- Referenced by work_items and life_areas

---

## AI Features & Memory

### 8. memories

**Type**: Table
**Purpose**: Structured AI insights from communications (no raw message storage)
**Primary Key**: id (UUID)

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source information
  source_type VARCHAR(50) NOT NULL, -- 'message', 'task_completion', 'conversation', 'event'
  source_id UUID,
  source_contact_id UUID REFERENCES contact_network(id) ON DELETE SET NULL,

  -- Structured insight data (no raw content)
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'mixed'
  sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  triggers TEXT[],
  subjects TEXT[],

  -- Summary (structured, not raw)
  summary TEXT NOT NULL,

  -- Embeddings for semantic search (pgvector)
  embedding VECTOR(1536),

  -- Metadata
  importance FLOAT CHECK (importance >= 0 AND importance <= 1),
  tags TEXT[],
  associations UUID[],
  related_memory_ids UUID[],

  -- Privacy
  is_active BOOLEAN DEFAULT true,
  privacy_level VARCHAR(20) DEFAULT 'private',
  retention_until TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT memory_not_empty CHECK (summary IS NOT NULL AND summary != '')
);
```

**Key Columns**:
- `embedding` - 1536-dimensional vector for semantic search
- `sentiment_score` - AI-calculated sentiment (-1 to 1)
- `importance` - Relevance score (0-1)
- `privacy_level` - Data sharing level

**Features**:
- Privacy-first: No raw message content
- Only summarized insights with embeddings
- Allows RAG (Retrieval Augmented Generation)
- Automatic retention cleanup

**Indexes**:
- `idx_memories_user_id` - User's memories
- `idx_memories_created_at` - Chronological queries
- `idx_memories_sentiment` - Emotion analysis
- `idx_memories_embedding` - Vector semantic search (IVFFlat)
- `idx_memories_source` - Source tracking

**Triggers**:
- Auto-update contact_network health_score on insert
- Auto-update updated_at timestamp

---

### 9. contact_network

**Type**: Table
**Purpose**: Relationship metadata without storing raw message content
**Primary Key**: id (UUID)

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
  relationship_type VARCHAR(50), -- 'colleague', 'client', 'friend', 'family', etc.
  tags TEXT[],

  -- Interaction tracking (metadata only)
  last_interaction_at TIMESTAMP,
  interaction_count INT DEFAULT 0,
  interaction_frequency VARCHAR(50),

  -- Health scoring
  health_score FLOAT CHECK (health_score >= 0 AND health_score <= 100),
  sentiment_trend VARCHAR(20), -- 'improving', 'stable', 'declining', 'unknown'

  -- Communication metadata
  interaction_topics TEXT[],
  response_avg_time_hours FLOAT,
  engagement_level VARCHAR(20),

  -- Notes
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
    phone_number IS NOT NULL OR email IS NOT NULL OR user_id_if_internal IS NOT NULL
  )
);
```

**Key Features**:
- Metadata only (no message history)
- Health score calculated from interaction patterns
- Sentiment trend tracking
- Privacy-first design (raw messages stored elsewhere if at all)

**Indexes**:
- `idx_contact_network_user_id` - User's contacts
- `idx_contact_network_phone` - Phone lookup
- `idx_contact_network_email` - Email lookup
- `idx_contact_network_last_interaction` - Recent contacts
- `idx_contact_network_health_score` - Relationship health ranking

**RLS Policy**: Users can view/edit only their own contacts

---

### 10. daily_reports

**Type**: Table
**Purpose**: End-of-day summaries with mood, productivity, and AI insights
**Primary Key**: id (UUID)
**Unique Constraint**: (user_id, report_date)

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
  mood VARCHAR(20), -- 'excellent', 'good', 'neutral', 'bad', 'terrible'
  mood_score FLOAT CHECK (mood_score >= -1 AND mood_score <= 1),
  energy_level INT CHECK (energy_level >= 0 AND energy_level <= 100),
  stress_level INT CHECK (stress_level >= 0 AND stress_level <= 100),

  -- Activity summary
  active_modules TEXT[],
  top_interactions TEXT[],
  significant_events TEXT[],

  -- AI-generated insights
  summary TEXT,
  key_insights TEXT[],
  patterns_detected TEXT[],

  -- Recommendations
  ai_recommendations TEXT[],
  suggested_focus_areas TEXT[],

  -- Memory links
  memory_ids UUID[],

  -- Context
  notes TEXT,
  location VARCHAR(255),
  weather_notes VARCHAR(255),

  -- Sharing & retention
  is_shared_with_associations UUID[],
  retention_until TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, report_date)
);
```

**Key Columns**:
- `report_date` - The date this report covers
- `productivity_score` - AI-calculated from work_items
- `mood_score` - User input or AI inference
- `key_insights` - Bullet-point findings

**Features**:
- Generated automatically at end of day
- Integrates mood tracking and productivity
- Supports long-term pattern detection
- Feeds into Aica Auto suggestions

**Indexes**:
- `idx_daily_reports_user_id` - User's reports
- `idx_daily_reports_date` - Historical queries
- `idx_daily_reports_mood` - Mood trends
- `idx_daily_reports_productivity` - Performance analysis

**RLS Policy**: Users can view/edit only their own reports

---

### 11. pair_conversations

**Type**: Table
**Purpose**: AI-generated draft responses (privacy-first, no raw incoming messages)
**Primary Key**: id (UUID)

```sql
CREATE TABLE pair_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contact_network(id) ON DELETE SET NULL,

  -- Message content
  message_text TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT false,
  draft_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'archived'

  -- Context
  confidence_score FLOAT,
  context_memory_ids UUID[],
  conversation_thread_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Key Features**:
- Privacy-first: Only stores AI-generated drafts
- Raw incoming messages are processed and discarded by n8n
- Integrates with memories for context
- Smart reply suggestions

**Workflow**:
1. Message received via Evolution API webhook
2. n8n processes and extracts insights
3. Gemini generates draft response
4. Draft inserted into pair_conversations
5. User reviews and may modify
6. User sends via Evolution API

**RLS Policy**: Users can view/edit only their own conversations

---

## Gamification System

### 12. user_stats

**Type**: Table
**Purpose**: XP, levels, and global gamification metrics
**Primary Key**: user_id (UUID, FK)

```sql
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INT DEFAULT 0,
  current_level INT DEFAULT 1,
  level_xp_threshold INT DEFAULT 1000,
  next_level_xp_needed INT GENERATED ALWAYS AS (
    level_xp_threshold - (total_xp % level_xp_threshold)
  ) STORED,

  -- Global stats
  total_tasks_completed INT DEFAULT 0,
  total_achievements_earned INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,

  -- Efficiency & productivity
  average_efficiency_score FLOAT,
  total_focus_time INT, -- minutes

  -- Leaderboard ranking
  global_rank INT,
  local_rank INT, -- Within associations
  percentile INT,

  updated_at TIMESTAMP DEFAULT now()
);
```

**Key Columns**:
- `total_xp` - Cumulative experience points
- `current_level` - Player level
- `total_achievements_earned` - Badge count
- `current_streak` - Active daily streak

**Features**:
- Exponential XP growth
- Multi-tier achievement system
- Streak tracking
- Global and association leaderboards

**Relationships**:
- One-to-one with users
- References user_achievements, user_streaks

---

### 13. user_streaks

**Type**: Table
**Purpose**: Daily streak tracking for consistency rewards
**Primary Key**: (user_id, streak_type) - Composite

```sql
CREATE TABLE user_streaks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  streak_type VARCHAR(50), -- 'daily_tasks', 'weekly_goals', 'health', 'learning'
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_action_date DATE,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  PRIMARY KEY (user_id, streak_type)
);
```

**Streak Types**:
- `daily_tasks` - Complete at least one task per day
- `weekly_goals` - Complete weekly objectives
- `health` - Log health activities
- `learning` - Learning activities
- `productivity` - Maintain productivity above threshold

**Features**:
- Track multiple streaks simultaneously
- Reward consistency over intensity
- XP bonuses at milestone streaks (7, 14, 30, 100 days)

**RLS Policy**: Users can view only their own streaks

---

### 14. user_achievements

**Type**: Table
**Purpose**: Unlocked badges and awards
**Primary Key**: (user_id, achievement_id) - Composite

```sql
CREATE TABLE user_achievements (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL,

  -- Achievement metadata
  name VARCHAR(100),
  description TEXT,
  icon_url TEXT,
  rarity VARCHAR(20), -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  xp_reward INT DEFAULT 0,

  -- Progression
  progress INT DEFAULT 100,
  unlocked_at TIMESTAMP DEFAULT now(),

  PRIMARY KEY (user_id, achievement_id)
);
```

**Rarity Tiers**:
- Common: 10 XP (1 color)
- Uncommon: 25 XP (2 colors)
- Rare: 50 XP (3 colors)
- Epic: 100 XP (4 colors)
- Legendary: 250+ XP (5+ colors, special animation)

**Example Achievements**:
- "First Task" (Common) - Complete first task
- "Streak Master" (Rare) - 30-day streak
- "Efficiency Expert" (Epic) - Maintain 80%+ efficiency
- "Life Architect" (Legendary) - Complete all life areas

---

## Podcast Module

### 15. podcast_shows

**Type**: Table
**Purpose**: Podcast show metadata and management
**Primary Key**: id (UUID)

```sql
CREATE TABLE podcast_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Basic info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category VARCHAR(100),
  language VARCHAR(10) DEFAULT 'pt-BR',

  -- Status & settings
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'archived'
  is_public BOOLEAN DEFAULT false,
  allow_comments BOOLEAN DEFAULT true,

  -- Metadata
  topic_count INT DEFAULT 0,
  episode_count INT DEFAULT 0,
  latest_episode_date TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT show_title_not_empty CHECK (title IS NOT NULL AND title != '')
);
```

**Key Columns**:
- `status` - Workflow state
- `topic_count` - Denormalized for performance
- `episode_count` - Total episodes

**Relationships**:
- Has many podcast_episodes
- Has many podcast_topics
- References users

---

### 16. podcast_episodes

**Type**: Table
**Purpose**: Individual episodes/projects
**Primary Key**: id (UUID)

```sql
CREATE TABLE podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES podcast_shows(id) ON DELETE CASCADE NOT NULL,

  -- Episode info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  episode_number INT,
  season_number INT DEFAULT 1,

  -- Content
  script_text TEXT,
  audio_url TEXT,
  transcript TEXT,
  cover_image_url TEXT,

  -- Status & workflow
  status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'scripting', 'recording', 'editing', 'published'
  estimated_duration INT, -- minutes
  actual_duration INT,

  -- Publishing
  published_date TIMESTAMP,
  publish_scheduled_for TIMESTAMP,
  is_explicit_content BOOLEAN DEFAULT false,

  -- Metadata
  topic_ids UUID[],
  guest_list TEXT[],

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT episode_title_not_empty CHECK (title IS NOT NULL AND title != '')
);
```

**Status Workflow**:
- `planning` → Research & outline
- `scripting` → Writing script
- `recording` → Capturing audio
- `editing` → Post-production
- `published` → Released

**Relationships**:
- Belongs to podcast_shows
- References podcast_topics via topic_ids

---

### 17. podcast_topics

**Type**: Table
**Purpose**: Discussion topics/pauta items
**Primary Key**: id (UUID)

```sql
CREATE TABLE podcast_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES podcast_shows(id) ON DELETE CASCADE NOT NULL,

  -- Topic info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES podcast_topic_categories(id),

  -- Research & preparation
  research_notes TEXT,
  reference_articles UUID[],
  estimated_time INT, -- minutes

  -- Status
  status VARCHAR(50) DEFAULT 'backlog', -- 'backlog', 'planned', 'in_progress', 'completed', 'archived'
  priority INT DEFAULT 0,

  -- Episode association
  episode_ids UUID[],

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT topic_title_not_empty CHECK (title IS NOT NULL AND title != '')
);
```

**Key Features**:
- Reusable topics across episodes
- Category organization
- Research note tracking
- Priority and status management

---

### 18. podcast_topic_categories

**Type**: Table
**Purpose**: Standard topic classifications
**Primary Key**: id (UUID)

```sql
CREATE TABLE podcast_topic_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  order_num INT DEFAULT 0,

  -- Metadata
  is_predefined BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Standard Categories** (~20):
- News & Analysis
- Interviews
- Deep Dives
- Case Studies
- Tips & Tricks
- Entertainment
- Education
- Health & Wellness
- Technology
- Business
- Science
- Philosophy
- History
- Culture
- Sports
- Travel
- Finance
- Relationships
- Personal Development
- Spirituality

---

### 19. podcast_news_articles

**Type**: Table
**Purpose**: Reference articles for podcast research
**Primary Key**: id (UUID)

```sql
CREATE TABLE podcast_news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Article info
  title VARCHAR(255) NOT NULL,
  source VARCHAR(255),
  url TEXT UNIQUE NOT NULL,
  published_date DATE,

  -- Content summary
  summary TEXT,
  relevance_score FLOAT,

  -- Categorization
  categories TEXT[],
  tags TEXT[],

  -- Usage tracking
  referenced_in_topics UUID[],
  reference_count INT DEFAULT 0,

  -- Timestamps
  added_date TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Features**:
- External article tracking
- Relevance scoring
- Cross-reference management
- URL uniqueness enforcement

---

### 20. podcast_team_members

**Type**: Table
**Purpose**: Team members associated with podcast shows
**Primary Key**: (show_id, user_id) - Composite

```sql
CREATE TABLE podcast_team_members (
  show_id UUID REFERENCES podcast_shows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Role & permissions
  role VARCHAR(50), -- 'host', 'producer', 'guest', 'editor', 'contributor'
  permission_level VARCHAR(20) DEFAULT 'view', -- 'view', 'edit', 'admin'

  -- Metadata
  bio TEXT,
  social_profiles JSONB,

  joined_at TIMESTAMP DEFAULT now(),

  PRIMARY KEY (show_id, user_id)
);
```

**Roles**:
- `host` - Primary presenter
- `producer` - Show management
- `guest` - Invited participant
- `editor` - Post-production
- `contributor` - Research/script support

---

### 21. podcast_shows_with_stats (Materialized View)

**Type**: View
**Purpose**: Denormalized podcast show data for performance

```sql
CREATE MATERIALIZED VIEW podcast_shows_with_stats AS
SELECT
  ps.id,
  ps.user_id,
  ps.title,
  ps.description,
  ps.cover_image_url,
  ps.status,
  COUNT(DISTINCT pe.id) as episode_count,
  COUNT(DISTINCT pt.id) as topic_count,
  MAX(pe.published_date) as latest_episode_date,
  ps.created_at,
  ps.updated_at
FROM podcast_shows ps
LEFT JOIN podcast_episodes pe ON ps.id = pe.show_id
LEFT JOIN podcast_topics pt ON ps.id = pt.show_id
GROUP BY ps.id;

CREATE INDEX idx_podcast_shows_with_stats_user_id ON podcast_shows_with_stats(user_id);
```

**Usage**: Faster queries for dashboard and listings

---

## Life Planning

### 22. life_events

**Type**: Table
**Purpose**: Life milestones and goals organized by life weeks
**Primary Key**: id (UUID)

```sql
CREATE TABLE IF NOT EXISTS life_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  week_number INTEGER NOT NULL,
  event_date DATE,
  type TEXT DEFAULT 'milestone', -- 'milestone', 'goal', 'memory'
  status TEXT DEFAULT 'planned', -- 'planned', 'completed', 'skipped'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Key Columns**:
- `week_number` - Life week (0 to ~4000, calculated from birth_date)
- `type` - Category (milestone, goal, memory)
- `status` - Completion state

**Features**:
- Memento Mori integration (life week visualizer)
- Long-term goal tracking
- Life milestone recording

**RLS Policy**: Users can view/edit only their own life events

---

### 23. life_areas

**Type**: Table
**Purpose**: Life planning categories with metadata
**Primary Key**: id (UUID)

```sql
CREATE TABLE life_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  emoji VARCHAR(10),
  order_num INT DEFAULT 0,

  -- Goals & metrics
  current_score INT CHECK (current_score >= 0 AND current_score <= 100),
  target_score INT DEFAULT 100,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, name),
  CONSTRAINT life_area_not_empty CHECK (name IS NOT NULL AND name != '')
);
```

**Standard Life Areas**:
- Health (Physical, Mental, Nutrition)
- Finances (Budget, Savings, Investments)
- Career (Professional Growth, Skills)
- Relationships (Family, Friends, Community)
- Education (Learning, Development)
- Spirituality (Purpose, Values)
- Leisure (Hobbies, Recreation)
- Personal (Growth, Self-Care)

**Features**:
- Scorable (0-100)
- Custom goals per area
- Color-coded display

---

## Supporting Tables

### 24. work_item_assignees

**Type**: Table (Junction)
**Purpose**: Task assignments linking work items to users
**Primary Key**: (work_item_id, assigned_to_user_id) - Composite

```sql
CREATE TABLE work_item_assignees (
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES users(id),

  assignment_type VARCHAR(50) DEFAULT 'assignee', -- 'assignee', 'watcher', 'reviewer'
  assigned_at TIMESTAMP DEFAULT now(),

  PRIMARY KEY (work_item_id, assigned_to_user_id)
);
```

**Features**:
- Multiple assignees per task
- Track who assigned the task
- Different assignment types (assignee, watcher, reviewer)

---

### 25. notifications

**Type**: Table
**Purpose**: User notifications system
**Primary Key**: id (UUID)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT,
  notification_type VARCHAR(50), -- 'info', 'success', 'warning', 'error', 'achievement'
  action_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,

  -- Metadata
  source_table VARCHAR(100),
  source_id UUID,
  priority INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);
```

**Notification Types**:
- `info` - Informational
- `success` - Action successful
- `warning` - Warning message
- `error` - Error notification
- `achievement` - Badge/XP earned

**Features**:
- Expiring notifications
- Read status tracking
- Source tracking
- Priority ordering

---

## Database Architecture

### Core Design Principles

1. **Privacy-First**: No raw message storage; only summarized insights
2. **Vector Search**: pgvector embeddings for semantic search on memories
3. **Multi-Tenant**: Support for multiple users and associations
4. **Row-Level Security (RLS)**: All tables have RLS policies
5. **Audit Trail**: Timestamps (created_at, updated_at) on all tables
6. **Data Integrity**: Foreign keys and constraints enforced
7. **Performance**: Strategic indexes on frequently queried columns

### Schema Versioning

Current Schema Version: **2.1**

**Migration History**:
- v1.0 - Initial core tables (users, profiles, associations, work_items, states, modules)
- v2.0 - Added AI features (memories, contact_network, daily_reports)
- v2.1 - Added gamification (user_stats, user_streaks, user_achievements)
- v3.0 (Planned) - Podcast module (podcast_shows, podcast_episodes, etc.)

---

## Security & RLS Policies

### Row-Level Security (RLS)

Every table implements RLS with policies:

**Pattern 1: User-scoped data**
```sql
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own work_items"
  ON work_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work_items"
  ON work_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work_items"
  ON work_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own work_items"
  ON work_items FOR DELETE
  USING (auth.uid() = user_id);
```

**Pattern 2: Association-based access**
```sql
CREATE POLICY "Users can access association work items"
  ON work_items FOR SELECT
  USING (
    auth.uid() = user_id OR
    association_id IN (
      SELECT association_id FROM association_members
      WHERE user_id = auth.uid()
    )
  );
```

### Authentication Integration

- All auth via Supabase Auth
- `auth.users` table managed by Supabase
- `users` table stores additional metadata
- `auth.uid()` function used in RLS policies

---

## Indexes & Performance

### Indexing Strategy

**Primary Key Indexes**:
- All tables have UUID primary keys with btree index (automatic)

**Foreign Key Indexes**:
- Automatically indexed by PostgreSQL
- Improve JOIN performance

**Search Indexes**:
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);

-- Time-based queries
CREATE INDEX idx_work_items_due_date ON work_items(due_date DESC);
CREATE INDEX idx_daily_reports_report_date ON daily_reports(report_date DESC);

-- Filtering
CREATE INDEX idx_work_items_status_id ON work_items(status_id);
CREATE INDEX idx_work_items_priority ON work_items(priority);

-- Vector search (memories)
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);

-- Composite indexes
CREATE INDEX idx_association_members_user ON association_members(user_id);
CREATE INDEX idx_daily_reports_user_date ON daily_reports(user_id, report_date DESC);
```

### Query Optimization

**Common Patterns**:

1. **User's today's tasks**:
```sql
SELECT * FROM work_items
WHERE user_id = $1
  AND due_date = current_date
  AND completed_at IS NULL
ORDER BY priority DESC;
```

2. **Memory semantic search**:
```sql
SELECT * FROM memories
WHERE user_id = $1
  AND is_active = true
ORDER BY embedding <-> $2::vector
LIMIT 10;
```

3. **User's efficiency over time**:
```sql
SELECT
  report_date,
  productivity_score,
  mood_score,
  energy_level
FROM daily_reports
WHERE user_id = $1
  AND report_date >= current_date - interval '30 days'
ORDER BY report_date DESC;
```

---

## Migration Guide

### From Plane to Aica

**Removed** (Legacy):
- `plane_project_id` columns
- `plane_workspace_slug` columns
- `plane_state_id` references
- Plane API integration

**Current Status**: ✅ Complete removal in Task 16

---

### Adding New Tables

**Checklist**:
1. Define schema in migration file
2. Add RLS policies
3. Create indexes on foreign keys and search columns
4. Add CONSTRAINT checks for data integrity
5. Add created_at/updated_at timestamps
6. Document in this schema file
7. Update supabaseService.ts with CRUD functions
8. Test RLS policies

**Example Migration**:
```sql
-- Example: Adding a new table
CREATE TABLE my_new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT title_not_empty CHECK (title IS NOT NULL AND title != '')
);

ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own records"
  ON my_new_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_my_new_table_user_id ON my_new_table(user_id);
CREATE INDEX idx_my_new_table_status ON my_new_table(status);
```

---

## Additional Tables (6 of 31)

The following 6 additional tables are documented in the actual Supabase database but were not referenced in the frontend codebase analysis:

> **Note**: These tables may be:
> - Managed by backend services (n8n, custom APIs)
> - Legacy tables awaiting removal
> - Internal Supabase system tables
> - Tables in non-public schemas

**Placeholder for missing tables** (requires direct Supabase introspection):
1. [Table 26 - Unknown]
2. [Table 27 - Unknown]
3. [Table 28 - Unknown]
4. [Table 29 - Unknown]
5. [Table 30 - Unknown]
6. [Table 31 - Unknown]

To identify these tables, query your Supabase database directly:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## Related Documentation

- **DATABASE_SCHEMA_NEW_TABLES.sql** - DDL statements for v2.0 tables
- **MIGRATION_GUIDE_NEW_TABLES.md** - Step-by-step migration procedures
- **EVOLUTION_API_WEBHOOK_IMPLEMENTATION.md** - Message ingestion flow
- **N8N_MESSAGE_PROCESSING_WORKFLOW.md** - Data pipeline details
- **TASK_16_PLANE_REMOVAL_SUMMARY.md** - Plane integration cleanup

---

## Appendix A: Common Queries

### Get user's dashboard data
```sql
SELECT
  u.email,
  (SELECT COUNT(*) FROM work_items WHERE user_id = u.id AND completed_at IS NULL) as pending_tasks,
  (SELECT COUNT(*) FROM daily_reports WHERE user_id = u.id AND report_date >= current_date - interval '7 days') as reports_this_week,
  (SELECT SUM(total_xp) FROM user_stats WHERE user_id = u.id) as total_xp
FROM users u
WHERE u.id = $1;
```

### Find related memories via semantic search
```sql
WITH search_results AS (
  SELECT id, summary, sentiment, importance
  FROM memories
  WHERE user_id = $1
  ORDER BY embedding <-> $2::vector
  LIMIT 10
)
SELECT * FROM search_results
WHERE importance > 0.5
ORDER BY importance DESC;
```

### Generate daily report data
```sql
SELECT
  (SELECT COUNT(*) FROM work_items WHERE user_id = $1 AND completed_at::date = current_date) as tasks_completed_today,
  (SELECT COUNT(*) FROM memories WHERE user_id = $1 AND created_at::date = current_date) as insights_today,
  (SELECT AVG(health_score) FROM contact_network WHERE user_id = $1) as avg_relationship_health
FROM users WHERE id = $1;
```

---

**Document Status**: Task 17 - Database Schema Documentation (In Progress)
**Last Verified**: 2025-12-02
**Schema Version**: 2.1 (25 of 31 tables documented)
