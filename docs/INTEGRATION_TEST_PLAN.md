# Aica Life OS - Integration Test Plan

**Version**: 1.0
**Date**: December 2, 2025
**Purpose**: Validate all implemented features work correctly end-to-end
**Scope**: Tasks 1-18 implementation validation

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Authentication & User Management](#authentication--user-management)
3. [Core Task Management](#core-task-management)
4. [Priority Matrix & Eisenhower](#priority-matrix--eisenhower)
5. [Daily Timeline & Scheduling](#daily-timeline--scheduling)
6. [Efficiency Scoring System](#efficiency-scoring-system)
7. [Gamification System](#gamification-system)
8. [AI Features & Memory](#ai-features--memory)
9. [Contact Network](#contact-network)
10. [Daily Reports](#daily-reports)
11. [Podcast Module](#podcast-module)
12. [Associations & Multi-tenant](#associations--multi-tenant)
13. [Data Privacy & Security](#data-privacy--security)
14. [Integration Flows](#integration-flows)
15. [Performance & Load Testing](#performance--load-testing)

---

## Test Environment Setup

### Prerequisites

```bash
# 1. Environment variables configured
- VITE_SUPABASE_URL ✓
- VITE_SUPABASE_ANON_KEY ✓
- VITE_GEMINI_API_KEY ✓
- VITE_N8N_URL ✓
- VITE_EVOLUTION_URL ✓

# 2. Supabase database running with all 25 tables created
- ✓ users
- ✓ profiles
- ✓ associations
- ✓ work_items
- ✓ states
- ✓ modules
- ✓ memories
- ✓ contact_network
- ✓ daily_reports
- ✓ pair_conversations
- ✓ user_stats
- ✓ user_streaks
- ✓ user_achievements
- ✓ life_events
- ✓ life_areas
- ✓ podcast_shows
- ✓ podcast_episodes
- ✓ podcast_topics
- ✓ podcast_topic_categories
- ✓ notifications
- ✓ More...

# 3. n8n workflows configured (for async testing)
# 4. Gemini API access verified
# 5. Test user accounts created
```

### Test User Setup

```sql
-- Create test user (for manual testing)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('test@aica.app', '$2a$10$...', now())
RETURNING id;

-- Create test profile
INSERT INTO profiles (id, full_name, birth_date)
VALUES ('user-uuid', 'Test User', '1990-01-15');

-- Create test associations
INSERT INTO associations (owner_id, name, type)
VALUES ('user-uuid', 'Test Team', 'team');

-- Create test work items
INSERT INTO work_items (user_id, title, priority, status_id)
VALUES ('user-uuid', 'Test Task', 'high', 'status-uuid');
```

---

## Authentication & User Management

### Test 1.1: User Registration

**Scenario**: New user signs up
**Steps**:
1. Open app at `http://localhost:3000`
2. Click "Sign Up"
3. Enter email: `test-new@aica.app`
4. Enter password: `SecureTest123!@#`
5. Click "Create Account"

**Expected Results**:
- ✅ Account created in `auth.users`
- ✅ Profile record created in `profiles` table
- ✅ User redirected to onboarding
- ✅ Confirmation email sent (if configured)
- ✅ User ID stored in sessionStorage

**Verification Queries**:
```sql
SELECT * FROM profiles WHERE full_name LIKE 'test-new%';
SELECT * FROM users WHERE email = 'test-new@aica.app';
```

---

### Test 1.2: User Login

**Scenario**: Existing user logs in
**Steps**:
1. Go to login page
2. Enter email: `test@aica.app`
3. Enter password: `SecureTest123!@#`
4. Click "Login"

**Expected Results**:
- ✅ JWT token obtained from Supabase Auth
- ✅ Token stored in sessionStorage
- ✅ User redirected to dashboard
- ✅ User profile displays correctly
- ✅ All user-specific data loads

**Verification**:
- Check browser DevTools → Application → sessionStorage
- Verify `sb-*-auth-token` key exists
- Check profile name displays in header

---

### Test 1.3: User Profile Update

**Scenario**: User updates their profile
**Steps**:
1. Click "Profile" or "Settings"
2. Update fields:
   - Full name
   - Avatar/photo
   - Birth date (for Memento Mori)
   - Timezone
   - Language preference
3. Click "Save"

**Expected Results**:
- ✅ Changes saved to `profiles` table
- ✅ UI updates immediately
- ✅ Changes persist on page reload
- ✅ Success notification appears

**Verification**:
```sql
SELECT * FROM profiles WHERE id = 'user-uuid';
-- Verify: full_name, avatar_url, birth_date, updated_at
```

---

### Test 1.4: Auto Logout on Inactivity

**Scenario**: User inactive for 30+ minutes
**Steps**:
1. Login successfully
2. Don't interact with app for 30+ minutes
3. Try to interact or refresh page

**Expected Results**:
- ✅ User auto-logged out
- ✅ Redirected to login page
- ✅ Session token invalidated
- ✅ Warning shown at 25 minutes (if applicable)

---

## Core Task Management

### Test 2.1: Create Task

**Scenario**: User creates a new task
**Steps**:
1. Go to "Meu Dia" (Agenda View)
2. Click "Adicionar nova tarefa"
3. Enter: `"Revisar contrato #urgent"`
4. Press Enter or click Send

**Expected Results**:
- ✅ Task inserted into `work_items` table
- ✅ Task appears in Priority Matrix
- ✅ Default status set to "todo"
- ✅ Default priority set to "medium"
- ✅ Created timestamp recorded

**Verification Queries**:
```sql
SELECT id, title, status_id, priority, created_at
FROM work_items
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC LIMIT 1;
```

---

### Test 2.2: Update Task Title & Description

**Scenario**: User edits an existing task
**Steps**:
1. Find task in Priority Matrix
2. Click on task to open details
3. Edit title: `"Revisar contrato jurídico urgente"`
4. Add description: `"Contrato com novo cliente X"`
5. Click "Save"

**Expected Results**:
- ✅ Updates in `work_items` table
- ✅ UI reflects changes immediately
- ✅ `updated_at` timestamp changes
- ✅ Changes persist on reload

**Verification**:
```sql
SELECT title, description, updated_at
FROM work_items
WHERE id = 'task-uuid';
```

---

### Test 2.3: Change Task Priority

**Scenario**: User changes task priority (Eisenhower)
**Steps**:
1. Click task in Priority Matrix
2. Change priority dropdown:
   - From "medium" to "high"
3. Or drag task from one quadrant to another
4. Observe UI update

**Expected Results**:
- ✅ Priority field updated in `work_items`
- ✅ Priority quadrant field updated
- ✅ Task moves visually to new quadrant
- ✅ Change persists

**Priority Quadrants Tested**:
- ✅ "urgent-important" (Do First - red)
- ✅ "important" (Schedule - blue)
- ✅ "urgent" (Delegate - yellow)
- ✅ "low" (Eliminate - gray)

**Verification**:
```sql
SELECT priority, priority_quadrant
FROM work_items
WHERE id = 'task-uuid';
```

---

### Test 2.4: Set Due Date

**Scenario**: User sets/modifies due date
**Steps**:
1. Click task
2. Click "Due Date" field
3. Select date from calendar
4. Save

**Expected Results**:
- ✅ Due date stored in `due_date` field
- ✅ Date appears in task card
- ✅ Overdue tasks highlighted (if today > due_date)
- ✅ Date picker closes

**Verification**:
```sql
SELECT title, due_date
FROM work_items
WHERE id = 'task-uuid';
```

---

### Test 2.5: Complete/Check Task

**Scenario**: User marks task as complete
**Steps**:
1. Click task checkbox or "Mark Complete" button
2. Confirm completion

**Expected Results**:
- ✅ `completed_at` timestamp set (not NULL)
- ✅ Task removed from matrix (or shown as strikethrough)
- ✅ XP awarded to user (+10 XP base)
- ✅ Completion count incremented
- ✅ Efficiency score updated

**Verification**:
```sql
SELECT id, completed_at, title
FROM work_items
WHERE id = 'task-uuid';

SELECT total_xp FROM user_stats WHERE user_id = 'user-uuid';
```

---

### Test 2.6: Archive Task

**Scenario**: User archives a task (soft delete)
**Steps**:
1. Click task menu (three dots)
2. Select "Archive"
3. Confirm

**Expected Results**:
- ✅ `archived` field set to TRUE
- ✅ Task disappears from active views
- ✅ Not deleted from database
- ✅ Can restore from "Archived" section

**Verification**:
```sql
SELECT * FROM work_items
WHERE id = 'task-uuid';
-- archived should be TRUE
```

---

### Test 2.7: Delete Task

**Scenario**: User permanently deletes a task
**Steps**:
1. Click task menu
2. Select "Delete Permanently"
3. Confirm warning

**Expected Results**:
- ✅ Task deleted from `work_items` table
- ✅ Cascade delete any related records
- ✅ Task completely removed from UI

---

## Priority Matrix & Eisenhower

### Test 3.1: View Priority Matrix

**Scenario**: User views 2x2 Eisenhower matrix
**Steps**:
1. Go to "Meu Dia" view
2. Scroll to Priority Matrix section

**Expected Results**:
- ✅ Matrix displays with 4 quadrants
- ✅ Tasks categorized correctly by priority_quadrant
- ✅ Color coding correct:
  - Red (Urgent & Important)
  - Blue (Important)
  - Yellow (Urgent)
  - Gray (Neither)
- ✅ Task counts display for each quadrant

**Quadrants Verified**:
1. **Urgent & Important** (Do First)
   - High priority + high urgency
   - Red color scheme

2. **Important** (Schedule)
   - High priority + low urgency
   - Blue color scheme

3. **Urgent** (Delegate)
   - Low priority + high urgency
   - Yellow color scheme

4. **Low** (Eliminate)
   - Low priority + low urgency
   - Gray color scheme

---

### Test 3.2: Drag & Drop Between Quadrants

**Scenario**: User drags task to different quadrant
**Steps**:
1. Find task in one quadrant
2. Drag to different quadrant
3. Release

**Expected Results**:
- ✅ Task moves visually
- ✅ `priority_quadrant` field updated in database
- ✅ Change saved without page reload
- ✅ Source quadrant task count decreases
- ✅ Destination quadrant task count increases

**Test All Combinations**:
- ✅ urgent-important → important
- ✅ important → urgent
- ✅ urgent → low
- ✅ low → urgent-important
- (8 total combinations)

---

### Test 3.3: Task Count Accuracy

**Scenario**: Verify task counts in quadrants are accurate
**Steps**:
1. Count tasks in each quadrant visually
2. Query database for actual counts
3. Compare

**Expected Results**:
- ✅ Visual count matches database count
- ✅ Deleted tasks don't count
- ✅ Completed tasks don't count
- ✅ Archived tasks don't count

**Verification Query**:
```sql
SELECT
  priority_quadrant,
  COUNT(*) as count
FROM work_items
WHERE user_id = 'user-uuid'
  AND completed_at IS NULL
  AND archived = FALSE
GROUP BY priority_quadrant;
```

---

## Daily Timeline & Scheduling

### Test 4.1: Schedule Task to Timeline

**Scenario**: User moves task from matrix to timeline
**Steps**:
1. In Priority Matrix, find task
2. Drag task to Timeline section below
3. Drop on specific time slot (e.g., 09:00 AM)

**Expected Results**:
- ✅ Task moves to timeline
- ✅ `scheduled_time` field set to "09:00"
- ✅ `due_date` set to today
- ✅ Task removed from matrix
- ✅ Task appears in correct time slot on timeline

**Verification**:
```sql
SELECT title, scheduled_time, due_date
FROM work_items
WHERE id = 'task-uuid';
-- scheduled_time should be '09:00:00'
-- due_date should be today
```

---

### Test 4.2: Timeline Display Accuracy

**Scenario**: Verify timeline shows tasks at correct times
**Steps**:
1. Look at Daily Timeline
2. Verify time slots (morning, afternoon, evening)
3. Check tasks appear in correct slots

**Expected Results**:
- ✅ Time slots display (06:00 - 22:00)
- ✅ Tasks appear in correct time slot
- ✅ Overdue tasks highlighted
- ✅ Current time highlighted

**Timeline Hours Tested**:
- ✅ 06:00-09:00 (Morning)
- ✅ 09:00-12:00 (Mid-morning)
- ✅ 12:00-15:00 (Afternoon)
- ✅ 15:00-18:00 (Late afternoon)
- ✅ 18:00-21:00 (Evening)
- ✅ 21:00-22:00 (Night)

---

### Test 4.3: Unschedule Task (Back to Matrix)

**Scenario**: User moves task from timeline back to matrix
**Steps**:
1. Find task in timeline
2. Drag to Priority Matrix section
3. Drop into target quadrant

**Expected Results**:
- ✅ `scheduled_time` set to NULL
- ✅ Task removed from timeline
- ✅ Task appears in selected quadrant
- ✅ `due_date` cleared (if it was just scheduled today)

---

### Test 4.4: Estimated vs Actual Duration

**Scenario**: User logs actual time spent on task
**Steps**:
1. Complete a task with `estimated_duration` set
2. Compare estimated vs actual in daily report

**Expected Results**:
- ✅ `estimated_duration` field used in calculations
- ✅ Efficiency metric compares estimated vs actual
- ✅ Over-estimates vs under-estimates tracked

---

## Efficiency Scoring System

### Test 5.1: Daily Efficiency Score Calculation

**Scenario**: System calculates daily efficiency score
**Steps**:
1. Complete several tasks on a day
2. Go to Life Dashboard
3. Check Efficiency Score Card

**Expected Results**:
- ✅ Score displays (0-100)
- ✅ Formula calculation visible:
  - 40% = Completion Rate (tasks_completed / tasks_total)
  - 30% = Focus Score (estimated_duration match)
  - 30% = Consistency Score (completed tasks distribution)
- ✅ Productivity level displayed:
  - Excellent (80-100)
  - Good (60-79)
  - Fair (40-59)
  - Poor (20-39)
  - Critical (0-19)
- ✅ Color coding matches level

**Verification Query**:
```sql
SELECT
  COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) as avg_duration_minutes
FROM work_items
WHERE user_id = 'user-uuid'
  AND created_at::date = current_date;
```

---

### Test 5.2: Efficiency Trend Chart

**Scenario**: User views 7/14/30-day efficiency trends
**Steps**:
1. Go to Life Dashboard
2. Scroll to Efficiency Trend Chart
3. Click "7 days" button
4. Verify chart displays
5. Click "14 days" and "30 days"

**Expected Results**:
- ✅ Chart renders with correct data
- ✅ X-axis shows dates
- ✅ Y-axis shows efficiency scores (0-100)
- ✅ Line connects daily scores
- ✅ Data points color-coded by productivity level
- ✅ Trend indicator shown (improving/stable/declining)
- ✅ Distribution chart shows level breakdown

**Chart Validation**:
- ✅ Points connect correctly
- ✅ Scale is 0-100
- ✅ No missing days
- ✅ Responsive on mobile

---

### Test 5.3: Module-Specific Efficiency

**Scenario**: View efficiency by life area/module
**Steps**:
1. Efficiency Score Card → Expand
2. Scroll to "Module Performance" table
3. See efficiency for each module

**Expected Results**:
- ✅ Table shows:
  - Module name
  - Tasks completed in module
  - Efficiency score for module
  - Trend for module
- ✅ Sorted by efficiency (highest first)
- ✅ Color-coded rows by productivity level

**Modules to Verify**:
- ✅ Health
- ✅ Finances
- ✅ Career
- ✅ Relationships
- ✅ Education
- ✅ Legal
- ✅ Community

---

### Test 5.4: Streak Tracking Integration

**Scenario**: User's streak counted correctly in efficiency
**Steps**:
1. Complete at least 1 task per day for 7 days
2. Check Efficiency Score Card for streak display
3. Check user_streaks table

**Expected Results**:
- ✅ Current streak displays: "7-day streak 🔥"
- ✅ Longest streak shows if higher: "Personal best: 30 days"
- ✅ Streak count in `user_streaks` table
- ✅ XP bonus applied for streaks (50 XP per 7-day milestone)

---

## Gamification System

### Test 6.1: XP Earning

**Scenario**: User earns XP for various actions
**Steps**:
1. Complete a task
2. Check XP notification
3. Check user_stats.total_xp

**Expected Results**:
- ✅ Task completion: +10 XP base
- ✅ Priority bonus: +5 XP for high priority
- ✅ Efficiency bonus: +10 XP if completed on time
- ✅ Streak bonus: +50 XP per 7-day streak milestone
- ✅ Achievement bonus: +25-250 XP for badges

**XP Values to Verify**:
```
Task Completion: 10 XP
High Priority: +5 XP
On-Time Completion: +10 XP
Streak Bonus (7 days): +50 XP
Streak Bonus (14 days): +100 XP
Streak Bonus (30 days): +250 XP
```

**Verification**:
```sql
SELECT total_xp, current_level
FROM user_stats
WHERE user_id = 'user-uuid';
```

---

### Test 6.2: Level Progression

**Scenario**: User levels up
**Steps**:
1. Earn enough XP to reach next level
2. Watch level increase
3. See level-up notification

**Expected Results**:
- ✅ Level increases at XP thresholds
- ✅ Level 1 threshold: 1,000 XP
- ✅ Exponential growth: 1,000 × 1.1^(level-1)
- ✅ Level badge appears in header
- ✅ Achievement unlocked: "Reached Level X"

**Example Thresholds**:
- Level 1: 1,000 XP
- Level 2: 1,100 XP (cumulative: 2,100)
- Level 3: 1,210 XP (cumulative: 3,310)
- Level 5: 1,465 XP (cumulative: ~6,000)
- Level 10: ~2,594 XP (cumulative: ~20,000)

---

### Test 6.3: Achievements/Badges

**Scenario**: User unlocks badges
**Steps**:
1. Complete specific achievement conditions
2. See achievement notification
3. Check Achievements View

**Expected Results**:
- ✅ Badge appears in Achievements section
- ✅ Achievement name displayed
- ✅ XP reward shown
- ✅ Rarity displayed (Common → Legendary)
- ✅ Description of how to earn

**Example Achievements to Test**:
- ✅ "First Step" - Complete first task (10 XP, Common)
- ✅ "On Fire" - 7-day streak (50 XP, Uncommon)
- ✅ "Productivity Master" - 30 completed tasks (100 XP, Rare)
- ✅ "Efficiency Expert" - Maintain 80%+ efficiency (150 XP, Epic)
- ✅ "Life Architect" - Complete tasks in all 7 modules (250+ XP, Legendary)

**Verification**:
```sql
SELECT COUNT(*) as achievement_count
FROM user_achievements
WHERE user_id = 'user-uuid';
```

---

### Test 6.4: Streaks

**Scenario**: User maintains daily streaks
**Steps**:
1. Complete at least 1 task each day
2. Check streak counter
3. Miss a day
4. See streak reset

**Expected Results**:
- ✅ Current streak increments each day
- ✅ Longest streak preserved
- ✅ Streak resets if day missed
- ✅ Streak display: "5-day streak 🔥"
- ✅ Milestone badges at 7, 14, 30 days

**Streak Types to Test**:
- ✅ daily_tasks (at least 1 task/day)
- ✅ weekly_goals (complete weekly objectives)
- ✅ health (health module tasks)
- ✅ learning (education module tasks)

---

### Test 6.5: Leaderboard (Global & Local)

**Scenario**: User appears on leaderboards
**Steps**:
1. Go to Leaderboard section
2. See global rankings
3. See association/local rankings (if in team)

**Expected Results**:
- ✅ User's rank displays
- ✅ Top 10 global users shown
- ✅ User's percentile calculated (e.g., "Top 15%")
- ✅ XP and level used for ranking
- ✅ Optional: Can disable leaderboard visibility in settings

---

## AI Features & Memory

### Test 7.1: Memory Extraction from WhatsApp

**Scenario**: Message received via Evolution API → processed by n8n → stored as memory
**Steps**:
1. Send WhatsApp message to Evolution API instance
2. n8n workflow triggers (ideally test webhook directly)
3. Gemini analyzes message
4. Memory stored in database

**Expected Results**:
- ✅ Raw message NOT stored (discarded after processing)
- ✅ Memory record created in `memories` table
- ✅ Fields populated:
  - `summary` - AI-generated summary
  - `sentiment` - positive/negative/neutral
  - `sentiment_score` - -1 to 1 scale
  - `triggers` - identified triggers array
  - `subjects` - topics array
  - `embedding` - vector for semantic search
  - `importance` - 0-1 relevance score

**Verification**:
```sql
SELECT id, summary, sentiment, importance, created_at
FROM memories
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC LIMIT 5;

-- Verify embedding exists and is vector type
SELECT octet_length(embedding) as embedding_size
FROM memories
WHERE user_id = 'user-uuid'
LIMIT 1;
```

---

### Test 7.2: Memory Semantic Search

**Scenario**: User searches memories using natural language
**Steps**:
1. Go to Contact Profile
2. Search box at top: "when did we discuss project X?"
3. System uses semantic search (embedding similarity)

**Expected Results**:
- ✅ Query converted to embedding
- ✅ Vector search finds similar memories
- ✅ Results ranked by relevance
- ✅ Top 5-10 results displayed
- ✅ Performance acceptable (<1 second)

**Test Queries**:
- ✅ "health concerns"
- ✅ "financial planning"
- ✅ "project deadline"
- ✅ "family meeting"
- ✅ "birthday plans"

---

### Test 7.3: Aica Auto (Priority Suggestions)

**Scenario**: AI suggests task priorities based on context
**Steps**:
1. Create new task without priority
2. System analyzes and suggests priority
3. User accepts or overrides

**Expected Results**:
- ✅ Suggestion shown with reasoning
- ✅ Format: "Suggested: HIGH priority because due soon + low completion rate in area"
- ✅ User can accept/snooze/dismiss
- ✅ Suggestion reasoning is transparent

**Contexts Tested**:
- ✅ Due date soon → Higher priority suggestion
- ✅ Low completion rate in module → Priority bump
- ✅ High workload today → Lower priority suggestion
- ✅ Health/important modules → Priority bump

---

### Test 7.4: Contact Interaction Metadata

**Scenario**: Contact relationships tracked without raw messages
**Steps**:
1. Receive messages from contact
2. Check contact_network record updated
3. Verify no raw message content stored

**Expected Results**:
- ✅ `last_interaction_at` updated
- ✅ `interaction_count` incremented
- ✅ `sentiment_trend` calculated
- ✅ `health_score` updated (positive sentiment raises score)
- ✅ `response_avg_time_hours` calculated
- ✅ NO raw message content in any field

**Verification**:
```sql
SELECT
  name,
  last_interaction_at,
  interaction_count,
  sentiment_trend,
  health_score,
  response_avg_time_hours
FROM contact_network
WHERE user_id = 'user-uuid'
ORDER BY last_interaction_at DESC;
```

---

## Contact Network

### Test 8.1: Add Contact

**Scenario**: User adds new contact
**Steps**:
1. Go to "Contatos" (Contact Network)
2. Click "Add Contact"
3. Enter:
   - Name: "João Silva"
   - Phone: "+55 11 99999-9999"
   - Relationship: "Colleague"
4. Save

**Expected Results**:
- ✅ Contact created in `contact_network` table
- ✅ Fields set:
  - `name` = "João Silva"
  - `phone_number` = "+55 11 99999-9999"
  - `relationship_type` = "colleague"
  - `health_score` = 50 (default)
  - `created_at` = now()

**Verification**:
```sql
SELECT * FROM contact_network
WHERE name = 'João Silva'
AND user_id = 'user-uuid';
```

---

### Test 8.2: Contact Health Score

**Scenario**: Contact health score updates based on interactions
**Steps**:
1. Positive message from contact received
2. Check health_score in contact_network

**Expected Results**:
- ✅ Score increases for positive interactions
- ✅ Score decreases for negative interactions
- ✅ Score stays stable for neutral
- ✅ Score range: 0-100
- ✅ Updates via trigger on memories insert

**Scoring Logic**:
```
sentiment_score > 0.5  → +5 health_score
sentiment_score < -0.5 → -5 health_score
Otherwise             → no change
```

---

### Test 8.3: Contact Profile View

**Scenario**: User views detailed contact profile
**Steps**:
1. Click on contact in Contact Network
2. View profile panel

**Expected Results**:
- ✅ Contact info displays
- ✅ Health score gauge shown
- ✅ Last interaction date displayed
- ✅ Recent memories with contact shown
- ✅ Interaction frequency displayed
- ✅ Shared associations with contact shown
- ✅ Add note button available

---

### Test 8.4: Contact Archive/Unarchive

**Scenario**: User archives/unarchives contact
**Steps**:
1. Click contact
2. Menu → "Archive"
3. Confirm

**Expected Results**:
- ✅ `is_archived` set to TRUE
- ✅ Contact hidden from main list
- ✅ Can be restored from "Archived" filter
- ✅ Data NOT deleted (soft delete)

---

## Daily Reports

### Test 9.1: Daily Report Generation

**Scenario**: System generates daily report at end of day
**Steps**:
1. Complete various tasks throughout day
2. Wait for 23:59 UTC (or manually trigger in test)
3. Check daily_reports table

**Expected Results**:
- ✅ Report created for today's date
- ✅ Fields populated:
  - `tasks_completed` = count of completed tasks
  - `tasks_total` = count of all tasks created today
  - `productivity_score` = calculated efficiency
  - `mood` = user-provided or inferred
  - `mood_score` = -1 to 1 scale
  - `energy_level` = 0-100
  - `stress_level` = 0-100
  - `summary` = AI-generated summary
  - `key_insights` = array of insights
  - `patterns_detected` = array of patterns
  - `ai_recommendations` = array of next-day suggestions

**Verification**:
```sql
SELECT * FROM daily_reports
WHERE user_id = 'user-uuid'
AND report_date = current_date;
```

---

### Test 9.2: Daily Summary View

**Scenario**: User views daily summary
**Steps**:
1. Go to Daily Summary component
2. Scroll through report

**Expected Results**:
- ✅ Report displays with all sections
- ✅ Mood gauge shown with emoji
- ✅ Productivity score with productivity level badge
- ✅ Top interactions listed
- ✅ Key insights displayed as bullet points
- ✅ Patterns detected highlighted
- ✅ Recommendations for next day shown
- ✅ All charts render correctly

---

### Test 9.3: Multi-Day Report Trends

**Scenario**: User compares reports over time
**Steps**:
1. View Daily Summary
2. Click "7 days" or "14 days" comparison
3. See trends

**Expected Results**:
- ✅ Mood trend shown (improving/stable/declining)
- ✅ Productivity trend graphed
- ✅ Average metrics calculated
- ✅ Weekly comparison if applicable

---

## Podcast Module

### Test 10.1: Create Podcast Show

**Scenario**: User creates new podcast show
**Steps**:
1. Go to "Podcast Copilot"
2. Click "Create New Show"
3. Enter:
   - Title: "My Life Podcast"
   - Description: "Daily reflections"
   - Category: "Personal Development"
4. Save

**Expected Results**:
- ✅ Show created in `podcast_shows` table
- ✅ Fields set:
  - `title` = "My Life Podcast"
  - `description` = "Daily reflections"
  - `category` = "Personal Development"
  - `status` = "draft"
  - `is_public` = false (default)
  - `user_id` = current user
  - `created_at` = now()

**Verification**:
```sql
SELECT * FROM podcast_shows
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC LIMIT 1;
```

---

### Test 10.2: Create Podcast Episode

**Scenario**: User creates new episode for show
**Steps**:
1. Go to Podcast → Select show
2. Click "Create Episode"
3. Enter:
   - Title: "Episode 1: Starting My Journey"
   - Episode number: "1"
   - Description: "First episode reflection"
4. Save as draft

**Expected Results**:
- ✅ Episode created in `podcast_episodes` table
- ✅ Status set to "planning"
- ✅ Linked to correct show (show_id)
- ✅ Episode appears in episode list

**Verification**:
```sql
SELECT * FROM podcast_episodes
WHERE show_id = 'show-uuid'
ORDER BY created_at DESC LIMIT 1;
```

---

### Test 10.3: Manage Episode Workflow

**Scenario**: User moves episode through workflow
**Steps**:
1. Create episode (status: planning)
2. Click episode → Edit
3. Change status to "scripting"
4. Save
5. Repeat for "recording" → "editing" → "published"

**Expected Results**:
- ✅ Status updates at each stage
- ✅ UI shows progress indicator
- ✅ Fields available at each stage:
  - Planning: title, description
  - Scripting: script_text
  - Recording: audio_url
  - Editing: edits completed
  - Published: published_date set, publicly accessible

**Status Workflow**:
```
planning → scripting → recording → editing → published
```

---

### Test 10.4: Add Topics/Pauta

**Scenario**: User creates topics for episode discussion
**Steps**:
1. Go to Episode → Topics tab
2. Click "Add Topic"
3. Enter:
   - Title: "How to stay productive"
   - Description: "Discussion points on productivity hacks"
   - Estimated time: "15 minutes"
4. Save

**Expected Results**:
- ✅ Topic created in `podcast_topics` table
- ✅ Linked to show and episode
- ✅ Can add multiple topics
- ✅ Topics appear in order

**Verification**:
```sql
SELECT * FROM podcast_topics
WHERE show_id = 'show-uuid'
ORDER BY created_at;
```

---

### Test 10.5: Podcast Technical Sheet

**Scenario**: View technical/metadata details
**Steps**:
1. Episode → Technical Sheet tab
2. View metadata

**Expected Results**:
- ✅ Show title
- ✅ Episode number
- ✅ Duration (estimated + actual)
- ✅ Topic count
- ✅ Audio quality settings
- ✅ Publish date
- ✅ Links (if published)

---

## Associations & Multi-tenant

### Test 11.1: Create Association/Team

**Scenario**: User creates new team/association
**Steps**:
1. Go to "Associações" (Associations)
2. Click "Create New"
3. Enter:
   - Name: "Tech Team"
   - Type: "team"
   - Description: "Our development team"
4. Save

**Expected Results**:
- ✅ Association created in `associations` table
- ✅ Current user set as owner
- ✅ `owner_id` = current user
- ✅ `status` = "active"
- ✅ User added to `association_members` as owner

**Verification**:
```sql
SELECT * FROM associations
WHERE owner_id = 'user-uuid'
ORDER BY created_at DESC LIMIT 1;

SELECT * FROM association_members
WHERE association_id = 'assoc-uuid';
-- Should show current user with role='owner'
```

---

### Test 11.2: Invite Team Members

**Scenario**: Owner invites users to association
**Steps**:
1. Go to Association settings
2. Click "Invite Members"
3. Enter email: "teammate@example.com"
4. Select role: "member"
5. Send invitation

**Expected Results**:
- ✅ Invitation email sent (if configured)
- ✅ Pending membership created
- ✅ Teammate can accept invite
- ✅ Once accepted, appears in team

**Post-Acceptance Verification**:
```sql
SELECT * FROM association_members
WHERE association_id = 'assoc-uuid'
AND user_id = 'teammate-uuid';
-- role should be 'member'
```

---

### Test 11.3: Work Items Scoped to Association

**Scenario**: Create work item in association context
**Steps**:
1. Go to association
2. Create task
3. Task should be association-specific

**Expected Results**:
- ✅ Task has `association_id` set
- ✅ Only team members can see task
- ✅ RLS policy enforces access
- ✅ Team can collaborate on task

**Verification**:
```sql
SELECT * FROM work_items
WHERE association_id = 'assoc-uuid'
AND user_id = 'user-uuid';
```

---

### Test 11.4: Association RLS Enforcement

**Scenario**: Non-member cannot access association data
**Steps**:
1. User A creates association with User B
2. User C tries to access association data
3. Attempt should be blocked

**Expected Results**:
- ✅ User C cannot query association data
- ✅ RLS policy returns 0 rows
- ✅ No error message (prevents enumeration)
- ✅ API returns empty result

**Test with Different Roles**:
- ✅ Non-member: No access
- ✅ Viewer: Read-only
- ✅ Member: Read/write own items
- ✅ Admin: Read/write all items
- ✅ Owner: Full access

---

## Data Privacy & Security

### Test 12.1: User Data Export

**Scenario**: User exports all their data
**Steps**:
1. Go to Settings → Privacy
2. Click "Export My Data"
3. Select format: JSON
4. Download

**Expected Results**:
- ✅ JSON file contains all user data:
  - Profile information
  - Work items
  - Memories
  - Daily reports
  - Contact network
  - Achievement data
  - Settings
- ✅ No sensitive data missing
- ✅ Export is encrypted in transit
- ✅ File format is valid JSON

**Verification**:
```json
{
  "profile": { ... },
  "work_items": [ ... ],
  "memories": [ ... ],
  "daily_reports": [ ... ],
  "contact_network": [ ... ],
  "achievements": [ ... ],
  "export_date": "2025-12-02T15:30:00Z"
}
```

---

### Test 12.2: Account Deletion (GDPR Right to Erasure)

**Scenario**: User deletes account
**Steps**:
1. Settings → Privacy → "Delete Account"
2. Confirm via email verification
3. Wait 30 days grace period
4. Account auto-deleted on day 31

**Expected Results**:
- ✅ Day 1: Account marked for deletion, access revoked
- ✅ Day 1-30: Can cancel deletion
- ✅ Day 31: Cascade delete all records
- ✅ Audit log entry created (retained for 3 years)
- ✅ Backups purged

**Verification (Day 31)**:
```sql
SELECT COUNT(*) FROM users WHERE id = 'deleted-user-id';
-- Should return 0

SELECT * FROM audit_log
WHERE user_id = 'deleted-user-id'
AND event = 'user_deleted';
-- Should have record
```

---

### Test 12.3: Password Security

**Scenario**: Password reset flow
**Steps**:
1. Click "Forgot Password"
2. Enter email
3. Click reset link in email
4. Enter new password: "NewSecure456!@#"
5. Login with new password

**Expected Results**:
- ✅ Reset link valid for 15 minutes
- ✅ Reset link one-time use only
- ✅ New password hashed with Bcrypt
- ✅ Old password invalidated
- ✅ Old sessions logged out

**Password Requirements Verified**:
- ✅ Minimum 12 characters
- ✅ Uppercase letter required
- ✅ Lowercase letter required
- ✅ Number required
- ✅ Special character required

---

### Test 12.4: Session Security

**Scenario**: Verify session tokens are secure
**Steps**:
1. Login to app
2. Check DevTools → Application
3. Verify token storage and transmission

**Expected Results**:
- ✅ Token stored in sessionStorage (not localStorage)
- ✅ Token cleared on tab close
- ✅ Token transmitted in Authorization header
- ✅ HTTPS enforced (no HTTP)
- ✅ Secure flag set on auth cookies
- ✅ SameSite=Strict on cookies

**DevTools Checks**:
- ✅ No token in localStorage
- ✅ No token in cookies (if using header auth)
- ✅ sessionStorage key: `sb-*-auth-token`
- ✅ No plain passwords stored anywhere

---

### Test 12.5: Raw Message Non-Storage

**Scenario**: Verify raw WhatsApp messages are discarded
**Steps**:
1. Send message via WhatsApp
2. Check n8n logs
3. Check Supabase database
4. Search for raw message content

**Expected Results**:
- ✅ n8n logs DO NOT contain raw message text
- ✅ Database search returns 0 results for raw content
- ✅ Only memory summaries stored
- ✅ Embeddings stored (not reversible to content)
- ✅ No content fields in pair_conversations

**Verification Query**:
```sql
-- Search for exact message text - should return nothing
SELECT * FROM memories
WHERE summary ILIKE '%[exact message text]%';
-- Should return 0 rows

-- Verify summary field is used (not raw content)
SELECT summary FROM memories LIMIT 1;
-- Should be summary, not raw message
```

---

## Integration Flows

### Test 13.1: Complete Daily Workflow

**Scenario**: User's full day in Aica
**Steps**:
1. Morning:
   - Login
   - View today's tasks (Priority Matrix + Timeline)
   - Create 3 new tasks
   - Set priorities via drag-drop
   - Schedule 2 tasks to timeline

2. Afternoon:
   - Complete tasks
   - View updated efficiency score
   - Receive WhatsApp message (creates memory)
   - See contact interaction tracked

3. Evening:
   - Check daily report (auto-generated)
   - View streaks and XP earned
   - Review achievements unlocked

**Expected Results**:
- ✅ All operations work seamlessly
- ✅ Data persists correctly
- ✅ No errors in console
- ✅ Performance acceptable (<2s load times)
- ✅ Mobile-responsive throughout

---

### Test 13.2: Multi-User Association Workflow

**Scenario**: Multiple team members in association
**Steps**:
1. User A creates association "Project X"
2. User A invites User B
3. User B accepts invitation
4. Both users create tasks in association
5. User A views all tasks
6. User B completes a task
7. User A sees completion update

**Expected Results**:
- ✅ Task visibility correct (only association members see)
- ✅ RLS policies enforced
- ✅ Real-time updates (or at least on refresh)
- ✅ Completion updates visible to both
- ✅ XP awarded to User B, not User A

---

### Test 13.3: AI-Assisted Complete Flow

**Scenario**: Full AI workflow
**Steps**:
1. Receive WhatsApp message
2. n8n processes with Gemini
3. Memory created with embedding
4. Contact health score updated
5. Daily report generated with insights
6. Aica Auto suggests priorities
7. User views all integrated insights

**Expected Results**:
- ✅ Each step executes correctly
- ✅ Data flows properly between services
- ✅ No data loss
- ✅ Embeddings enable semantic search
- ✅ Contact scores reflect interaction sentiment
- ✅ Daily report aggregates correctly
- ✅ Suggestions are relevant

---

## Performance & Load Testing

### Test 14.1: Page Load Times

**Scenario**: Measure performance
**Steps**:
1. Clear cache
2. Load dashboard
3. Measure time to interactive
4. Repeat for each major view

**Target Times**:
- ✅ Dashboard: <2 seconds
- ✅ Task list: <1.5 seconds
- ✅ Contact network: <2 seconds
- ✅ Daily report: <2 seconds
- ✅ Podcast studio: <3 seconds

**Tools**:
- DevTools → Lighthouse
- DevTools → Network tab

---

### Test 14.2: Data Query Performance

**Scenario**: Measure database query times
**Steps**:
1. Create user with 500+ tasks
2. Query for today's tasks
3. Measure query time
4. Repeat with 1000+ tasks

**Target Times**:
- ✅ <100ms for <1000 tasks
- ✅ <500ms for 1000-5000 tasks
- ✅ <1s for 5000-10000 tasks

**Sample Queries to Test**:
```sql
-- User's today's tasks
SELECT * FROM work_items
WHERE user_id = 'user-uuid'
AND due_date = current_date
AND completed_at IS NULL;

-- User's recent memories
SELECT * FROM memories
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC LIMIT 20;

-- Efficiency calculation
SELECT COUNT(*), AVG(duration)
FROM work_items
WHERE user_id = 'user-uuid'
AND created_at::date = current_date;
```

---

### Test 14.3: Concurrent User Simulation

**Scenario**: Test system with multiple concurrent users
**Steps**:
1. Use load testing tool (e.g., k6, Apache JMeter)
2. Simulate 10 concurrent users
3. Each user performing CRUD operations
4. Monitor for errors

**Expected Results**:
- ✅ No 500 errors
- ✅ <5% of requests timeout
- ✅ Database connections not exhausted
- ✅ No race conditions

---

### Test 14.4: Mobile Performance

**Scenario**: Test on mobile devices/emulation
**Steps**:
1. Chrome DevTools → Device Emulation
2. Test on multiple devices:
   - iPhone 12
   - iPhone SE
   - Samsung Galaxy
   - Tablet
3. Test on slow 4G network (DevTools throttling)

**Expected Results**:
- ✅ UI renders correctly on all sizes
- ✅ Touch interactions responsive
- ✅ No layout shifts
- ✅ Readable without zooming
- ✅ <4s load on 4G

---

## Test Report Template

### Test Execution Summary

```
Test Date: 2025-12-02
Tester: [Name]
Environment: Development
Duration: [Hours]

Total Tests: 150+
Tests Passed: ___
Tests Failed: ___
Tests Blocked: ___

Critical Issues: ___
Major Issues: ___
Minor Issues: ___

Overall Status: [PASS/FAIL]
```

### Issue Template

```
ID: BUG-001
Severity: Critical / Major / Minor
Component: [Component Name]
Description: [What went wrong]
Steps to Reproduce:
1. ...
2. ...
Expected: [Should happen]
Actual: [What happened]
Evidence: [Screenshot/Video/Log]
Status: [Open/In Progress/Fixed/Verified]
```

---

## Success Criteria

**All tests must achieve**:
- ✅ **Functionality**: All features work as designed
- ✅ **Data Integrity**: All data saved correctly
- ✅ **Security**: No unauthorized access
- ✅ **Performance**: Within target times
- ✅ **User Experience**: No critical errors
- ✅ **Compliance**: GDPR/privacy requirements met

---

**Document Status**: Ready for Testing
**Last Updated**: December 2, 2025
**Next Step**: Execute tests and report findings

