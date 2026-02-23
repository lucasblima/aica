-- ============================================================================
-- Life RPG Schema — Entity Personas, Inventory, Quests, Feedback, Events
-- ============================================================================
-- Issue: #348 (LR-001)
-- Description: RPG metadata layer on top of existing AICA entities.
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTION: user_owns_persona()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_owns_persona(p_persona_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entity_personas
    WHERE id = p_persona_id AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- 2. ENTITY PERSONAS — Core table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('habitat', 'person', 'organization', 'project', 'vehicle')),
  entity_ref_id UUID NOT NULL,
  persona_name TEXT NOT NULL,
  persona_voice TEXT DEFAULT 'neutral' CHECK (persona_voice IN ('neutral', 'formal', 'casual', 'playful', 'serious', 'caring')),
  system_prompt TEXT,
  personality_traits JSONB DEFAULT '[]'::jsonb,
  hp INTEGER DEFAULT 100 CHECK (hp >= 0 AND hp <= 100),
  stats JSONB DEFAULT '{}'::jsonb,
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  xp INTEGER DEFAULT 0 CHECK (xp >= 0),
  knowledge_summary TEXT,
  knowledge_confidence REAL DEFAULT 0.0 CHECK (knowledge_confidence >= 0.0 AND knowledge_confidence <= 1.0),
  last_interaction TIMESTAMPTZ,
  avatar_emoji TEXT,
  avatar_color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_ref_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entity_personas_user_id ON public.entity_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_personas_entity_type ON public.entity_personas(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_personas_active ON public.entity_personas(user_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.entity_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own personas"
  ON public.entity_personas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personas"
  ON public.entity_personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personas"
  ON public.entity_personas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own personas"
  ON public.entity_personas FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. ENTITY INVENTORY — Universal inventory
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.entity_personas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  location TEXT,
  condition INTEGER DEFAULT 100 CHECK (condition >= 0 AND condition <= 100),
  quantity REAL DEFAULT 1 CHECK (quantity >= 0),
  unit TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  purchase_price DECIMAL(12,2),
  current_value DECIMAL(12,2),
  purchase_date DATE,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entity_inventory_persona_id ON public.entity_inventory(persona_id);
CREATE INDEX IF NOT EXISTS idx_entity_inventory_category ON public.entity_inventory(category);
CREATE INDEX IF NOT EXISTS idx_entity_inventory_location ON public.entity_inventory(location);
CREATE INDEX IF NOT EXISTS idx_entity_inventory_condition ON public.entity_inventory(condition) WHERE condition < 30;

-- RLS
ALTER TABLE public.entity_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own inventory"
  ON public.entity_inventory FOR SELECT
  USING (public.user_owns_persona(persona_id));

CREATE POLICY "Users can insert own inventory"
  ON public.entity_inventory FOR INSERT
  WITH CHECK (public.user_owns_persona(persona_id));

CREATE POLICY "Users can update own inventory"
  ON public.entity_inventory FOR UPDATE
  USING (public.user_owns_persona(persona_id))
  WITH CHECK (public.user_owns_persona(persona_id));

CREATE POLICY "Users can delete own inventory"
  ON public.entity_inventory FOR DELETE
  USING (public.user_owns_persona(persona_id));

-- ============================================================================
-- 4. ENTITY QUESTS — AI-generated tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.entity_personas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT CHECK (quest_type IN ('maintenance', 'repair', 'upgrade', 'social', 'financial', 'inventory', 'emergency', 'seasonal', 'routine')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'skipped', 'failed')),
  xp_reward INTEGER DEFAULT 10 CHECK (xp_reward >= 0),
  stat_impact JSONB DEFAULT '{}'::jsonb,
  difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
  generated_by TEXT DEFAULT 'ai' CHECK (generated_by IN ('ai', 'user', 'system')),
  generation_reason TEXT,
  due_date DATE,
  estimated_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  completion_photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entity_quests_persona_id ON public.entity_quests(persona_id);
CREATE INDEX IF NOT EXISTS idx_entity_quests_status ON public.entity_quests(status);
CREATE INDEX IF NOT EXISTS idx_entity_quests_priority ON public.entity_quests(priority);
CREATE INDEX IF NOT EXISTS idx_entity_quests_due_date ON public.entity_quests(due_date) WHERE status NOT IN ('completed', 'skipped', 'failed');

-- RLS
ALTER TABLE public.entity_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quests"
  ON public.entity_quests FOR SELECT
  USING (public.user_owns_persona(persona_id));

CREATE POLICY "Users can insert own quests"
  ON public.entity_quests FOR INSERT
  WITH CHECK (public.user_owns_persona(persona_id));

CREATE POLICY "Users can update own quests"
  ON public.entity_quests FOR UPDATE
  USING (public.user_owns_persona(persona_id))
  WITH CHECK (public.user_owns_persona(persona_id));

CREATE POLICY "Users can delete own quests"
  ON public.entity_quests FOR DELETE
  USING (public.user_owns_persona(persona_id));

-- ============================================================================
-- 5. ENTITY FEEDBACK QUEUE — AI questions for user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_feedback_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.entity_personas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('profile_completion', 'preference_discovery', 'state_verification', 'context', 'decision', 'feedback')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'skipped', 'expired')),
  answer TEXT,
  answered_at TIMESTAMPTZ,
  context JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entity_feedback_persona_id ON public.entity_feedback_queue(persona_id);
CREATE INDEX IF NOT EXISTS idx_entity_feedback_user_id ON public.entity_feedback_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_feedback_status ON public.entity_feedback_queue(status) WHERE status = 'pending';

-- RLS
ALTER TABLE public.entity_feedback_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feedback"
  ON public.entity_feedback_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.entity_feedback_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.entity_feedback_queue FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. ENTITY EVENT LOG — Audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.entity_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.entity_personas(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by TEXT DEFAULT 'system' CHECK (triggered_by IN ('system', 'user', 'ai', 'cron')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entity_event_log_persona_id ON public.entity_event_log(persona_id);
CREATE INDEX IF NOT EXISTS idx_entity_event_log_type ON public.entity_event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_entity_event_log_created_at ON public.entity_event_log(created_at DESC);

-- RLS
ALTER TABLE public.entity_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own events"
  ON public.entity_event_log FOR SELECT
  USING (public.user_owns_persona(persona_id));

CREATE POLICY "Users can insert own events"
  ON public.entity_event_log FOR INSERT
  WITH CHECK (public.user_owns_persona(persona_id));

-- ============================================================================
-- 7. SERVICE ROLE POLICIES (for Edge Functions)
-- ============================================================================

-- Allow service_role to manage all RPG tables (needed for cron jobs, AI functions)
CREATE POLICY "Service role full access personas"
  ON public.entity_personas FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access inventory"
  ON public.entity_inventory FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access quests"
  ON public.entity_quests FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access feedback"
  ON public.entity_feedback_queue FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access events"
  ON public.entity_event_log FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 8. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_liferpg_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entity_personas_updated_at
  BEFORE UPDATE ON public.entity_personas
  FOR EACH ROW EXECUTE FUNCTION public.update_liferpg_updated_at();

CREATE TRIGGER trg_entity_inventory_updated_at
  BEFORE UPDATE ON public.entity_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_liferpg_updated_at();

CREATE TRIGGER trg_entity_quests_updated_at
  BEFORE UPDATE ON public.entity_quests
  FOR EACH ROW EXECUTE FUNCTION public.update_liferpg_updated_at();

-- ============================================================================
-- 9. HELPER RPCs
-- ============================================================================

-- Complete a quest: update status, award XP, update stats, log event
CREATE OR REPLACE FUNCTION public.complete_entity_quest(
  p_quest_id UUID,
  p_completion_notes TEXT DEFAULT NULL,
  p_completion_photos JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quest entity_quests;
  v_persona entity_personas;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_new_hp INTEGER;
  v_stat_key TEXT;
  v_stat_val NUMERIC;
  v_new_stats JSONB;
BEGIN
  -- Fetch quest and verify ownership
  SELECT * INTO v_quest FROM entity_quests WHERE id = p_quest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest not found');
  END IF;

  SELECT * INTO v_persona FROM entity_personas WHERE id = v_quest.persona_id;
  IF v_persona.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF v_quest.status IN ('completed', 'failed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest already resolved');
  END IF;

  -- Award XP
  v_new_xp := v_persona.xp + v_quest.xp_reward;
  v_new_level := v_persona.level;

  -- Level up check (100 * 1.5^(level-1))
  WHILE v_new_xp >= FLOOR(100 * POWER(1.5, v_new_level - 1))::INTEGER LOOP
    v_new_xp := v_new_xp - FLOOR(100 * POWER(1.5, v_new_level - 1))::INTEGER;
    v_new_level := v_new_level + 1;
  END LOOP;

  -- Apply stat impacts
  v_new_stats := v_persona.stats;
  FOR v_stat_key, v_stat_val IN SELECT * FROM jsonb_each_text(v_quest.stat_impact) LOOP
    v_new_stats := jsonb_set(
      v_new_stats,
      ARRAY[v_stat_key],
      to_jsonb(LEAST(100, GREATEST(0, COALESCE((v_new_stats->>v_stat_key)::INTEGER, 50) + v_stat_val::INTEGER)))
    );
  END LOOP;

  -- Recovery HP (+5 per quest completion, capped at 100)
  v_new_hp := LEAST(100, v_persona.hp + 5);

  -- Update quest
  UPDATE entity_quests SET
    status = 'completed',
    completed_at = now(),
    completion_notes = p_completion_notes,
    completion_photos = p_completion_photos,
    updated_at = now()
  WHERE id = p_quest_id;

  -- Update persona
  UPDATE entity_personas SET
    xp = v_new_xp,
    level = v_new_level,
    hp = v_new_hp,
    stats = v_new_stats,
    updated_at = now()
  WHERE id = v_persona.id;

  -- Log event
  INSERT INTO entity_event_log (persona_id, event_type, event_data, triggered_by)
  VALUES (
    v_persona.id,
    'quest_completed',
    jsonb_build_object(
      'quest_id', p_quest_id,
      'quest_title', v_quest.title,
      'xp_awarded', v_quest.xp_reward,
      'old_level', v_persona.level,
      'new_level', v_new_level,
      'old_hp', v_persona.hp,
      'new_hp', v_new_hp,
      'stat_impact', v_quest.stat_impact
    ),
    'user'
  );

  -- Log level up if happened
  IF v_new_level > v_persona.level THEN
    INSERT INTO entity_event_log (persona_id, event_type, event_data, triggered_by)
    VALUES (
      v_persona.id,
      'level_up',
      jsonb_build_object('old_level', v_persona.level, 'new_level', v_new_level),
      'system'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', v_quest.xp_reward,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'new_hp', v_new_hp,
    'leveled_up', v_new_level > v_persona.level
  );
END;
$$;

-- Get persona dashboard data in a single call
CREATE OR REPLACE FUNCTION public.get_persona_dashboard(p_persona_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_persona entity_personas;
  v_quests JSONB;
  v_events JSONB;
  v_inventory_summary JSONB;
  v_pending_feedback JSONB;
BEGIN
  -- Verify ownership
  SELECT * INTO v_persona FROM entity_personas WHERE id = p_persona_id;
  IF NOT FOUND OR v_persona.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found or unauthorized');
  END IF;

  -- Pending quests (max 10)
  SELECT COALESCE(jsonb_agg(q ORDER BY
    CASE q.priority
      WHEN 'critical' THEN 0
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END,
    q.due_date NULLS LAST
  ), '[]'::jsonb) INTO v_quests
  FROM (
    SELECT id, title, description, quest_type, priority, status, xp_reward, difficulty, due_date, estimated_minutes
    FROM entity_quests
    WHERE persona_id = p_persona_id AND status NOT IN ('completed', 'skipped', 'failed')
    LIMIT 10
  ) q;

  -- Recent events (last 20)
  SELECT COALESCE(jsonb_agg(e ORDER BY e.created_at DESC), '[]'::jsonb) INTO v_events
  FROM (
    SELECT id, event_type, event_data, triggered_by, created_at
    FROM entity_event_log
    WHERE persona_id = p_persona_id
    ORDER BY created_at DESC
    LIMIT 20
  ) e;

  -- Inventory summary
  SELECT jsonb_build_object(
    'totalItems', COUNT(*),
    'totalValue', COALESCE(SUM(current_value), 0),
    'lowConditionCount', COUNT(*) FILTER (WHERE condition < 30),
    'expiringCount', COUNT(*) FILTER (WHERE (attributes->>'expiry_date')::DATE < CURRENT_DATE + INTERVAL '7 days')
  ) INTO v_inventory_summary
  FROM entity_inventory
  WHERE persona_id = p_persona_id;

  -- Pending feedback (max 5)
  SELECT COALESCE(jsonb_agg(f ORDER BY f.priority DESC), '[]'::jsonb) INTO v_pending_feedback
  FROM (
    SELECT id, question, question_type, priority, context, expires_at
    FROM entity_feedback_queue
    WHERE persona_id = p_persona_id AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY priority DESC
    LIMIT 5
  ) f;

  RETURN jsonb_build_object(
    'success', true,
    'persona', row_to_json(v_persona),
    'pendingQuests', v_quests,
    'recentEvents', v_events,
    'inventorySummary', v_inventory_summary,
    'pendingFeedback', v_pending_feedback
  );
END;
$$;
