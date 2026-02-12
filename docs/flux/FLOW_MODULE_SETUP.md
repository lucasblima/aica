# Flow Module - Complete Setup & Operations Guide

**Status:** ✅ Deployed to Staging (dev.aica.guru)
**Date:** February 12, 2026
**Version:** 1.0.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment Checklist](#deployment-checklist)
3. [Remaining Setup Tasks](#remaining-setup-tasks)
4. [Complete User Workflow](#complete-user-workflow)
5. [Database Schema](#database-schema)
6. [API Integration Points](#api-integration-points)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    COACH INTERFACE                           │
│  • Template Library                                          │
│  • Microcycle Editor (Drag-and-Drop)                        │
│  • Athlete Dashboard                                         │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE BACKEND                           │
│  Tables:                                                     │
│  • workout_templates (exercise library)                     │
│  • microcycles (3-week planning blocks)                     │
│  • workout_slots (weekly grid assignments)                  │
│  • athlete_profiles (performance thresholds)                │
│  • coach_messages (WhatsApp templates)                      │
│  • scheduled_workouts (delivery queue)                      │
│  • workout_automations (trigger-action rules)               │
│                                                              │
│  Edge Functions:                                             │
│  • process-workout-automations (trigger detection)          │
│  • notification-sender (WhatsApp delivery)                  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
│  • Evolution API (WhatsApp messaging)                       │
│  • Gemini AI (automation intelligence)                      │
│  • Cloud Scheduler (cron triggers)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Checklist

### ✅ Completed

- [x] Frontend build & deploy to staging (`aica-dev`)
- [x] All 5 phases implemented:
  - [x] Phase 1: Mock data replacement
  - [x] Phase 2: WhatsApp integration
  - [x] Phase 3: Automation engine
  - [x] Phase 4: Real-time subscriptions
  - [x] Phase 5: Drag-and-drop (@dnd-kit)
- [x] Edge Function `process-workout-automations` deployed
- [x] TypeScript build passing (0 errors in new code)

### ⚠️ Pending

- [ ] Cloud Scheduler cron job setup
- [ ] Database RPCs verification
- [ ] Evolution API credentials validation
- [ ] E2E testing on staging
- [ ] Production deploy (after staging validation)

---

## Remaining Setup Tasks

### Task 1: Create Cloud Scheduler Job

**Purpose:** Trigger automation processing every 5 minutes

**Command:**
```bash
gcloud scheduler jobs create http process-workout-automations \
  --schedule="*/5 * * * *" \
  --uri="https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/process-workout-automations" \
  --http-method=POST \
  --headers="Authorization=Bearer SUPABASE_ANON_KEY,Content-Type=application/json" \
  --location=southamerica-east1 \
  --project=gen-lang-client-0948335762 \
  --description="Runs workout automation trigger detection every 5 minutes"
```

**Verification:**
```bash
gcloud scheduler jobs list --location=southamerica-east1 --project=gen-lang-client-0948335762
```

**Test manually:**
```bash
gcloud scheduler jobs run process-workout-automations \
  --location=southamerica-east1 \
  --project=gen-lang-client-0948335762
```

---

### Task 2: Verify Database RPCs

**Required RPCs:**

1. **`calculate_microcycle_completion(p_microcycle_id UUID)`**
   - Calculates % of completed workout slots in a microcycle
   - Returns: INTEGER (0-100)

2. **`calculate_athlete_adherence(p_athlete_id TEXT)`**
   - Calculates athlete's consistency rate (last 30 days)
   - Returns: INTEGER (0-100)

**Verification Query:**
```sql
-- Check if RPCs exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calculate_microcycle_completion',
    'calculate_athlete_adherence'
  );
```

**Create if missing:**
```sql
-- RPC 1: Microcycle Completion
CREATE OR REPLACE FUNCTION public.calculate_microcycle_completion(
  p_microcycle_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = true)
  INTO v_total, v_completed
  FROM workout_slots
  WHERE microcycle_id = p_microcycle_id;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 100);
END;
$$;

-- RPC 2: Athlete Adherence
CREATE OR REPLACE FUNCTION public.calculate_athlete_adherence(
  p_athlete_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true)
  INTO v_total, v_completed
  FROM workout_slots ws
  JOIN microcycles m ON m.id = ws.microcycle_id
  WHERE m.athlete_id = p_athlete_id
    AND ws.created_at >= NOW() - INTERVAL '30 days';

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 100);
END;
$$;
```

---

### Task 3: Evolution API Credentials

**Required Secrets in Supabase:**
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET` (optional)

**Verification:**
```bash
npx supabase secrets list
```

**Set if missing:**
```bash
SUPABASE_ACCESS_TOKEN=sbp_... npx supabase secrets set \
  EVOLUTION_API_URL=https://your-evolution-api.com \
  EVOLUTION_API_KEY=your-api-key
```

---

## Complete User Workflow

### 1. Template Library Setup

**Goal:** Coach creates reusable workout templates

**Steps:**
1. Navigate to `/flux/templates`
2. Click "Novo Template"
3. Fill form:
   - Name: "Aerobic Base - 60min"
   - Duration: 60 minutes
   - Intensity: "moderate"
   - Modality: "swimming"
   - Category: "main"
   - Exercise structure: Define warmup/main/cooldown
4. Save → Creates record in `workout_templates`
5. Template appears in library instantly (real-time subscription)

**Data Flow:**
```
UI Form → WorkoutTemplateService.createTemplate()
  → Supabase INSERT workout_templates
  → Real-time subscription fires
  → useWorkoutTemplates() hook updates state
  → UI re-renders with new template
```

---

### 2. Microcycle Planning

**Goal:** Plan 3-week training block for athlete

**Steps:**
1. Navigate to `/flux/athlete/:id`
2. Click "Novo Microciclo"
3. Configure:
   - Name: "Base Phase - January"
   - Week 1 Focus: "volume" (high volume)
   - Week 2 Focus: "intensity" (hard sessions)
   - Week 3 Focus: "recovery" (deload)
   - Target loads: [500, 600, 400] TSS
4. Save → Creates `microcycle` with status = `draft`

**Data Flow:**
```
UI Form → MicrocycleService.createMicrocycle()
  → Supabase INSERT microcycles
  → Redirects to MicrocycleEditorView
```

---

### 3. Drag-and-Drop Scheduling

**Goal:** Assign templates to specific days

**Steps:**
1. Open Microcycle Editor (`/flux/microcycle/:id`)
2. See:
   - Left sidebar: Template library
   - Center: 3-week × 7-day grid
   - Top: Progress bar (0%)
3. Drag "Aerobic Base - 60min" from sidebar
4. Drop on "Monday - Week 1" cell
5. Template becomes workout slot
6. Repeat for all 21 days

**Technical Implementation:**
```typescript
// @dnd-kit handles drag-and-drop
<DndContext
  onDragEnd={handleDragEnd}
>
  <DraggableTemplate template={...} />
  <DroppableCell week={1} day={1} />
</DndContext>

// On drop:
const handleDragEnd = async (event) => {
  const { active, over } = event;

  // Parse: "week-1-day-1"
  const [, weekStr, , dayStr] = over.id.split('-');

  // Create slot
  await MicrocycleService.createSlot({
    microcycle_id,
    template_id: active.id,
    week_number: parseInt(weekStr),
    day_of_week: parseInt(dayStr),
    // ... copy template data
  });

  // Real-time subscription updates grid
};
```

**Data Flow:**
```
Drag template → Drop on cell → handleDragEnd()
  → WorkoutSlotService.createSlot()
  → Supabase INSERT workout_slots
  → Real-time subscription fires
  → MicrocycleEditorView updates slots state
  → Grid re-renders with new slot
  → Progress bar recalculates (e.g., 1/21 = 4.76%)
```

---

### 4. WhatsApp Scheduling

**Goal:** Send weekly workout plan to athlete via WhatsApp

**Steps:**
1. In Microcycle Editor, click "Agendar WhatsApp" on Week 1 header
2. Modal opens with:
   - Default date: Next Monday 6 AM
   - Message template selector
3. Select template: "Plano Semanal"
4. Confirm → Schedules message

**Data Flow:**
```
UI → AutomationService.scheduleWeeklyPlan()
  → Creates scheduled_workouts entry
  → Creates scheduled_notifications entry:
    {
      target_phone: "+5511987654321",
      message_template: "Olá {{athlete_name}}, aqui está seu plano da semana {{week_number}}! 💪",
      message_variables: { athlete_name: "João", week_number: "1" },
      scheduled_for: "2026-02-17T06:00:00-03:00",
      priority: 5,
      status: "scheduled"
    }

Cron Job (every 1 minute):
notification-sender Edge Function
  → Finds notifications where scheduled_for <= NOW()
  → Sends via Evolution API:
    POST /message/sendText
    {
      "number": "5511987654321",
      "text": "Olá João, aqui está seu plano da semana 1! 💪"
    }
  → Updates status = "sent"
```

**Evolution API Response:**
```json
{
  "key": {
    "remoteJid": "5511987654321@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5..."
  },
  "message": { ... },
  "status": "SENT"
}
```

---

### 5. Completion Tracking

**Goal:** Mark workouts as complete + collect feedback

**Steps:**
1. Coach opens Microcycle Editor
2. Sees Monday's workout slot
3. Clicks checkbox → Slot marked complete
4. Optional: Adds feedback "Felt great!"
5. Progress bar updates: 4.76% → 9.52% (2/21)

**Technical Implementation:**
```typescript
// SlotCard component
<input
  type="checkbox"
  checked={slot.completed}
  onChange={(e) => toggleCompletion(e.target.checked)}
/>

const toggleCompletion = async (isCompleted) => {
  await WorkoutSlotService.toggleSlotCompletion(
    slotId,
    isCompleted,
    feedback
  );
};
```

**Data Flow:**
```
Checkbox click → toggleSlotCompletion()
  → Supabase UPDATE workout_slots:
    {
      completed: true,
      completed_at: "2026-02-17T14:23:00-03:00",
      athlete_feedback: "Felt great!"
    }
  → Call calculate_microcycle_completion(microcycle_id)
  → UPDATE microcycles SET completion_percentage = 9.52
  → Call calculate_athlete_adherence(athlete_id)
  → UPDATE athlete_profiles SET consistency_rate = 85
  → Real-time subscription fires
  → Progress bar updates
  → Green checkmark appears
```

---

### 6. Automation Engine

**Goal:** Proactive coach alerts based on triggers

**Automation Example:**
- **Trigger:** Consistency drops below 70%
- **Action:** Send motivational WhatsApp

**Setup:**
1. Navigate to `/flux/automations`
2. Click "Nova Automação"
3. Configure:
   - Name: "Low Consistency Alert"
   - Trigger: "consistency_drops"
   - Threshold: 70%
   - Action: "send_whatsapp"
   - Message Template: "Oi {{athlete_name}}, tudo bem? Sua consistência está em {{consistency_rate}}%"
4. Save → Creates `workout_automations` entry

**Execution Flow (Every 5 Minutes):**
```
Cloud Scheduler → Triggers process-workout-automations Edge Function
  ↓
1. Fetch all active automations:
   SELECT * FROM workout_automations WHERE is_active = true;

2. Evaluate each trigger:
   SELECT * FROM athlete_profiles
   WHERE consistency_rate < 70;  -- Returns João (68%)

3. Execute action:
   INSERT INTO scheduled_notifications
   {
     target_phone: "+5511987654321",
     message_template: "Oi {{athlete_name}}, tudo bem?...",
     message_variables: { athlete_name: "João", consistency_rate: "68" },
     priority: 8,  // High priority
     status: "scheduled"
   }

4. Update automation stats:
   UPDATE workout_automations
   SET last_triggered_at = NOW(),
       times_triggered = times_triggered + 1
   WHERE id = automation_id;

5. notification-sender sends message
```

**Coach sees:**
- Automation dashboard shows "Triggered 3x in last 7 days"
- Last triggered: "2 hours ago"
- Athlete João's profile shows recent message sent

---

## Database Schema

### Core Tables

#### `workout_templates`
```sql
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,  -- minutes
  intensity TEXT CHECK (intensity IN ('low', 'moderate', 'high')),
  modality TEXT CHECK (modality IN ('swimming', 'running', 'cycling', 'strength')),
  category TEXT CHECK (category IN ('warmup', 'main', 'cooldown', 'technique', 'dryland')),
  exercise_structure JSONB,  -- { warmup: [...], main: [...], cooldown: [...] }
  ftp_percentage INTEGER,    -- For cycling
  pace_zone TEXT,            -- For running
  css_percentage INTEGER,    -- For swimming
  rpe INTEGER,               -- Perceived exertion (1-10)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `microcycles`
```sql
CREATE TABLE microcycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  athlete_id TEXT NOT NULL,  -- FK to athletes
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,  -- start_date + 21 days
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  week_1_focus TEXT CHECK (week_1_focus IN ('volume', 'intensity', 'recovery', 'test')),
  week_2_focus TEXT CHECK (week_2_focus IN ('volume', 'intensity', 'recovery', 'test')),
  week_3_focus TEXT CHECK (week_3_focus IN ('volume', 'intensity', 'recovery', 'test')),
  target_weekly_load INTEGER[],  -- [500, 600, 400] TSS
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `workout_slots`
```sql
CREATE TABLE workout_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  microcycle_id UUID NOT NULL REFERENCES microcycles ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates,

  -- Position
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 3),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),

  -- Workout details (copied from template)
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  intensity TEXT NOT NULL,
  modality TEXT NOT NULL,
  exercise_structure JSONB,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  athlete_feedback TEXT,
  completion_data JSONB,  -- { duration_actual, rpe_actual, notes }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(microcycle_id, week_number, day_of_week)  -- One workout per day
);
```

---

## API Integration Points

### Evolution API (WhatsApp)

**Base URL:** Set in `EVOLUTION_API_URL` Supabase secret

**Endpoints Used:**

1. **Send Text Message**
   ```http
   POST /message/sendText
   Authorization: Bearer {EVOLUTION_API_KEY}
   Content-Type: application/json

   {
     "number": "5511987654321",
     "text": "Olá João, aqui está seu plano!"
   }
   ```

2. **Get Instance Status**
   ```http
   GET /instance/connectionState/{instance}
   ```

3. **Webhook Configuration**
   - Evolution sends events to: `https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/webhook-evolution`
   - Events: `MESSAGE_RECEIVED`, `CONNECTION_UPDATE`

---

### Gemini AI

**Used For:**
- Automation trigger intelligence
- Message template variable substitution
- Future: Workout recommendations

**Model:** `gemini-2.5-flash`

**Example Call (in process-workout-automations):**
```typescript
const response = await gemini.generateContent({
  contents: [{
    role: 'user',
    parts: [{
      text: `Athlete consistency: ${athlete.consistency_rate}%.
             Generate a brief motivational message (max 160 chars).`
    }]
  }]
});
```

---

## Troubleshooting

### Issue: Automations not triggering

**Symptoms:**
- No WhatsApp messages sent despite low consistency
- `workout_automations.last_triggered_at` not updating

**Checks:**
1. Verify Cloud Scheduler job exists:
   ```bash
   gcloud scheduler jobs list --location=southamerica-east1
   ```

2. Check Edge Function logs:
   ```bash
   npx supabase functions logs process-workout-automations --tail
   ```

3. Test automation manually:
   ```typescript
   await supabase.functions.invoke('process-workout-automations', {
     body: {}
   })
   ```

**Fix:**
- Recreate scheduler job
- Verify `is_active = true` on automation
- Check athlete has `consistency_rate` calculated

---

### Issue: Progress bar not updating

**Symptoms:**
- Checkbox toggles but progress stays at 0%
- Completion percentage doesn't change

**Checks:**
1. Verify RPC exists:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'calculate_microcycle_completion';
   ```

2. Test RPC manually:
   ```sql
   SELECT calculate_microcycle_completion('microcycle-uuid-here');
   ```

3. Check real-time subscription:
   - Open browser console
   - Look for: `[MicrocycleEditor] Slot update: UPDATE`

**Fix:**
- Create RPC (see Task 2 above)
- Verify Supabase replication enabled for `workout_slots`
- Clear browser cache and reload

---

### Issue: Drag-and-drop not working

**Symptoms:**
- Can't drag templates
- Drop doesn't create slot

**Checks:**
1. Check browser console for errors
2. Verify @dnd-kit version: `npm list @dnd-kit/core`
3. Test on different browser (Chrome/Firefox)

**Fix:**
- Ensure `PointerSensor` is configured with 8px activation
- Verify droppable IDs match format: `week-{1-3}-day-{1-7}`
- Check `MicrocycleService.createSlot()` not throwing errors

---

### Issue: WhatsApp messages not sending

**Symptoms:**
- `scheduled_notifications.status` stuck on `scheduled`
- No messages in WhatsApp

**Checks:**
1. Verify Evolution API credentials:
   ```bash
   npx supabase secrets list
   ```

2. Test Evolution API manually:
   ```bash
   curl -X POST https://your-evolution-api.com/message/sendText \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"number":"5511987654321","text":"Test"}'
   ```

3. Check notification-sender logs:
   ```bash
   npx supabase functions logs notification-sender --tail
   ```

**Fix:**
- Update Evolution API credentials
- Verify phone number format: `5511987654321` (country + area + number)
- Check Evolution instance is connected (QR code scanned)

---

## Completed Setup ✅

1. **Database Schema:** ✅ All 8 tables created with RLS policies
2. **RPCs:** ✅ `calculate_microcycle_completion` and `calculate_athlete_adherence` deployed
3. **Edge Function:** ✅ `process-workout-automations` deployed to Supabase
4. **Cloud Scheduler:** ✅ Configured to run every 5 minutes in `southamerica-east1`
   - Job ID: `process-workout-automations`
   - Schedule: `*/5 * * * *` (UTC)
   - Status: ENABLED
5. **Frontend:** ✅ All 5 phases implemented and deployed to staging (`dev.aica.guru`)

## Next Steps

1. **Test on Staging:**
   - Create test athlete
   - Build 3-week microcycle
   - Schedule WhatsApp message (use your own number for testing)
   - Verify completion tracking
   - Trigger automation manually

2. **Validate Database:**
   - Test RPCs with sample data:
     ```sql
     SELECT calculate_microcycle_completion('microcycle-uuid');
     SELECT calculate_athlete_adherence('athlete-uuid');
     ```

3. **Production Deploy:**
   - After staging validation passes
   - Deploy to `aica` service in `southamerica-east1`
   - Monitor for 24 hours before full rollout

---

**Maintainers:** Lucas Boscacci Lima + Claude
**Last Updated:** February 12, 2026
**Version:** 1.0.0
