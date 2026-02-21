-- ============================================================================
-- EraForge Module — Historical Simulation Game for Children
-- EPIC #311 / Tables Spec EF-001 (#312)
--
-- 6 tables with eraforge_ prefix:
--   1. eraforge_child_profiles — Child profiles owned by parent
--   2. eraforge_worlds — Game worlds with era progression
--   3. eraforge_world_members — Children assigned to a world (composite PK)
--   4. eraforge_turns — Turn-by-turn game log
--   5. eraforge_simulations — Time-range simulations with events
--   6. eraforge_parental_settings — Per-parent controls + PIN hash
--
-- Helper function: get_parent_children_ids() — SECURITY DEFINER
-- PIN RPCs: eraforge_set_pin(), eraforge_verify_pin() — pgcrypto crypt/gen_salt
-- RLS enabled on ALL tables with service_role bypass
-- Indexes on all foreign keys
-- updated_at triggers on tables with updated_at column
-- ============================================================================

-- NOTE: pgcrypto is already enabled in this project (finance_robust_processing).
-- We use crypt() and gen_salt() directly.

-- ============================================================================
-- PART 1: eraforge_child_profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eraforge_child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_emoji TEXT,
  avatar_color TEXT,
  birth_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.eraforge_child_profiles IS
'Child profiles managed by parent. Each child can join multiple worlds.';

-- ============================================================================
-- PART 2: eraforge_worlds
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eraforge_worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_era TEXT NOT NULL DEFAULT 'stone_age',
  era_progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.eraforge_worlds IS
'Game worlds with era progression. Parent creates worlds and assigns children.';

-- ============================================================================
-- PART 3: eraforge_world_members (composite PK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eraforge_world_members (
  world_id UUID NOT NULL REFERENCES public.eraforge_worlds(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.eraforge_child_profiles(id) ON DELETE CASCADE,
  knowledge INTEGER NOT NULL DEFAULT 0,
  cooperation INTEGER NOT NULL DEFAULT 0,
  courage INTEGER NOT NULL DEFAULT 0,
  turns_today INTEGER NOT NULL DEFAULT 0,
  last_turn_date DATE,
  PRIMARY KEY (world_id, child_id)
);

COMMENT ON TABLE public.eraforge_world_members IS
'Links children to worlds with per-child stats. Composite PK (world_id, child_id).';

-- ============================================================================
-- PART 4: eraforge_turns
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eraforge_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.eraforge_worlds(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.eraforge_child_profiles(id) ON DELETE CASCADE,
  scenario JSONB NOT NULL DEFAULT '{}',
  advisor_chosen TEXT CHECK (advisor_chosen IS NULL OR advisor_chosen IN (
    'historian', 'scientist', 'artist', 'explorer', 'philosopher', 'engineer', 'diplomat'
  )),
  decision TEXT,
  consequences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.eraforge_turns IS
'Turn-by-turn game log. Each turn records scenario, advisor, decision, and consequences.';

-- ============================================================================
-- PART 5: eraforge_simulations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eraforge_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.eraforge_worlds(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  events JSONB[] DEFAULT ARRAY[]::JSONB[],
  summary TEXT,
  stats_delta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.eraforge_simulations IS
'Time-range simulations with event sequences and stat deltas.';

-- ============================================================================
-- PART 6: eraforge_parental_settings (UNIQUE parent_id — one row per parent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.eraforge_parental_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  max_turns_per_day INTEGER NOT NULL DEFAULT 5,
  pin_hash TEXT,
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.eraforge_parental_settings IS
'Per-parent controls: daily turn limit, PIN hash, voice toggle. One row per parent.';

COMMENT ON COLUMN public.eraforge_parental_settings.pin_hash IS
'Bcrypt hash of the parental PIN. Never stored in plaintext.';

-- ============================================================================
-- PART 7: INDEXES (pattern: idx_{table}_{column})
-- ============================================================================

-- eraforge_child_profiles
CREATE INDEX IF NOT EXISTS idx_eraforge_child_profiles_parent_id
  ON public.eraforge_child_profiles(parent_id);

-- eraforge_worlds
CREATE INDEX IF NOT EXISTS idx_eraforge_worlds_parent_id
  ON public.eraforge_worlds(parent_id);

-- eraforge_world_members (composite PK covers world_id; index child_id)
CREATE INDEX IF NOT EXISTS idx_eraforge_world_members_child_id
  ON public.eraforge_world_members(child_id);

-- eraforge_turns
CREATE INDEX IF NOT EXISTS idx_eraforge_turns_world_id
  ON public.eraforge_turns(world_id);

CREATE INDEX IF NOT EXISTS idx_eraforge_turns_child_id
  ON public.eraforge_turns(child_id);

-- eraforge_simulations
CREATE INDEX IF NOT EXISTS idx_eraforge_simulations_world_id
  ON public.eraforge_simulations(world_id);

-- eraforge_parental_settings (parent_id already has UNIQUE constraint = implicit index)

-- ============================================================================
-- PART 8: updated_at TRIGGERS
-- ============================================================================

-- update_updated_at_column() already exists in the schema.

DROP TRIGGER IF EXISTS update_eraforge_child_profiles_updated_at ON public.eraforge_child_profiles;
CREATE TRIGGER update_eraforge_child_profiles_updated_at
  BEFORE UPDATE ON public.eraforge_child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_eraforge_worlds_updated_at ON public.eraforge_worlds;
CREATE TRIGGER update_eraforge_worlds_updated_at
  BEFORE UPDATE ON public.eraforge_worlds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_eraforge_parental_settings_updated_at ON public.eraforge_parental_settings;
CREATE TRIGGER update_eraforge_parental_settings_updated_at
  BEFORE UPDATE ON public.eraforge_parental_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 9: HELPER FUNCTION — get_parent_children_ids()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_parent_children_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.eraforge_child_profiles
  WHERE parent_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_parent_children_ids IS
'Returns all child profile IDs belonging to the current authenticated parent. Used in RLS policies.';

-- ============================================================================
-- PART 10: RLS POLICIES
-- ============================================================================

-- --- eraforge_child_profiles ---
ALTER TABLE public.eraforge_child_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own children"
  ON public.eraforge_child_profiles FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own children"
  ON public.eraforge_child_profiles FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own children"
  ON public.eraforge_child_profiles FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own children"
  ON public.eraforge_child_profiles FOR DELETE
  USING (auth.uid() = parent_id);

CREATE POLICY "Service role full access to eraforge_child_profiles"
  ON public.eraforge_child_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- --- eraforge_worlds ---
ALTER TABLE public.eraforge_worlds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own worlds"
  ON public.eraforge_worlds FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own worlds"
  ON public.eraforge_worlds FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own worlds"
  ON public.eraforge_worlds FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own worlds"
  ON public.eraforge_worlds FOR DELETE
  USING (auth.uid() = parent_id);

CREATE POLICY "Service role full access to eraforge_worlds"
  ON public.eraforge_worlds FOR ALL
  USING (auth.role() = 'service_role');

-- --- eraforge_world_members ---
ALTER TABLE public.eraforge_world_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own world members"
  ON public.eraforge_world_members FOR SELECT
  USING (child_id IN (SELECT public.get_parent_children_ids()));

CREATE POLICY "Parents can insert own world members"
  ON public.eraforge_world_members FOR INSERT
  WITH CHECK (child_id IN (SELECT public.get_parent_children_ids()));

CREATE POLICY "Parents can update own world members"
  ON public.eraforge_world_members FOR UPDATE
  USING (child_id IN (SELECT public.get_parent_children_ids()))
  WITH CHECK (child_id IN (SELECT public.get_parent_children_ids()));

CREATE POLICY "Parents can delete own world members"
  ON public.eraforge_world_members FOR DELETE
  USING (child_id IN (SELECT public.get_parent_children_ids()));

CREATE POLICY "Service role full access to eraforge_world_members"
  ON public.eraforge_world_members FOR ALL
  USING (auth.role() = 'service_role');

-- --- eraforge_turns ---
ALTER TABLE public.eraforge_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own turns"
  ON public.eraforge_turns FOR SELECT
  USING (child_id IN (SELECT public.get_parent_children_ids()));

CREATE POLICY "Parents can insert own turns"
  ON public.eraforge_turns FOR INSERT
  WITH CHECK (child_id IN (SELECT public.get_parent_children_ids()));

CREATE POLICY "Service role full access to eraforge_turns"
  ON public.eraforge_turns FOR ALL
  USING (auth.role() = 'service_role');

-- Turns are immutable — no UPDATE or DELETE policies for authenticated users

-- --- eraforge_simulations ---
ALTER TABLE public.eraforge_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own simulations"
  ON public.eraforge_simulations FOR SELECT
  USING (
    world_id IN (
      SELECT id FROM public.eraforge_worlds WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own simulations"
  ON public.eraforge_simulations FOR INSERT
  WITH CHECK (
    world_id IN (
      SELECT id FROM public.eraforge_worlds WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update own simulations"
  ON public.eraforge_simulations FOR UPDATE
  USING (
    world_id IN (
      SELECT id FROM public.eraforge_worlds WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete own simulations"
  ON public.eraforge_simulations FOR DELETE
  USING (
    world_id IN (
      SELECT id FROM public.eraforge_worlds WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to eraforge_simulations"
  ON public.eraforge_simulations FOR ALL
  USING (auth.role() = 'service_role');

-- --- eraforge_parental_settings ---
ALTER TABLE public.eraforge_parental_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own settings"
  ON public.eraforge_parental_settings FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own settings"
  ON public.eraforge_parental_settings FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own settings"
  ON public.eraforge_parental_settings FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own settings"
  ON public.eraforge_parental_settings FOR DELETE
  USING (auth.uid() = parent_id);

CREATE POLICY "Service role full access to eraforge_parental_settings"
  ON public.eraforge_parental_settings FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 11: PIN RPCs — eraforge_set_pin() and eraforge_verify_pin()
-- ============================================================================

-- Set or update the parent's PIN
CREATE OR REPLACE FUNCTION public.eraforge_set_pin(p_parent_id UUID, p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- Only the parent themselves can set their own PIN
  IF p_parent_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only set your own PIN';
  END IF;

  -- Validate PIN format (4-6 digits)
  IF p_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  -- Hash with blowfish via pgcrypto
  v_hash := crypt(p_pin, gen_salt('bf'));

  -- Upsert into parental_settings
  INSERT INTO public.eraforge_parental_settings (parent_id, pin_hash)
  VALUES (p_parent_id, v_hash)
  ON CONFLICT (parent_id) DO UPDATE
    SET pin_hash = v_hash,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.eraforge_set_pin IS
'Sets or updates the parental PIN. Stored as bcrypt hash. Only the parent can set their own PIN.';

-- Verify the parent's PIN — returns BOOLEAN
CREATE OR REPLACE FUNCTION public.eraforge_verify_pin(p_parent_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  -- Only the parent themselves can verify their own PIN
  IF p_parent_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: can only verify your own PIN';
  END IF;

  SELECT pin_hash INTO v_stored_hash
  FROM public.eraforge_parental_settings
  WHERE parent_id = p_parent_id;

  IF v_stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Compare using pgcrypto crypt
  RETURN v_stored_hash = crypt(p_pin, v_stored_hash);
END;
$$;

COMMENT ON FUNCTION public.eraforge_verify_pin IS
'Verifies a parental PIN against the stored bcrypt hash. Returns TRUE if match, FALSE otherwise.';

-- ============================================================================
-- PART 12: GRANTS
-- ============================================================================

-- Table grants for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eraforge_child_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eraforge_worlds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eraforge_world_members TO authenticated;
GRANT SELECT, INSERT ON public.eraforge_turns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eraforge_simulations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eraforge_parental_settings TO authenticated;

-- Service role full access
GRANT ALL ON public.eraforge_child_profiles TO service_role;
GRANT ALL ON public.eraforge_worlds TO service_role;
GRANT ALL ON public.eraforge_world_members TO service_role;
GRANT ALL ON public.eraforge_turns TO service_role;
GRANT ALL ON public.eraforge_simulations TO service_role;
GRANT ALL ON public.eraforge_parental_settings TO service_role;

-- Function grants
GRANT EXECUTE ON FUNCTION public.get_parent_children_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eraforge_set_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eraforge_verify_pin(UUID, TEXT) TO authenticated;

-- ============================================================================
-- PART 13: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_table_count INTEGER;
  v_rls_count INTEGER;
  v_func_count INTEGER;
BEGIN
  -- Verify all 6 tables exist
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'eraforge_%';

  IF v_table_count < 6 THEN
    RAISE EXCEPTION 'Expected 6 eraforge_ tables, found %', v_table_count;
  END IF;

  -- Verify RLS enabled on all tables
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname LIKE 'eraforge_%'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true;

  IF v_rls_count < 6 THEN
    RAISE EXCEPTION 'Expected RLS on 6 tables, found % with RLS', v_rls_count;
  END IF;

  -- Verify helper functions exist
  SELECT COUNT(*) INTO v_func_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('get_parent_children_ids', 'eraforge_set_pin', 'eraforge_verify_pin');

  IF v_func_count < 3 THEN
    RAISE EXCEPTION 'Expected 3 eraforge functions, found %', v_func_count;
  END IF;

  RAISE NOTICE '=== Migration 20260221140000_eraforge_schema completed ===';
  RAISE NOTICE '- Created 6 eraforge_ tables';
  RAISE NOTICE '- RLS enabled on all % tables with service_role bypass', v_rls_count;
  RAISE NOTICE '- Created 3 helper functions (get_parent_children_ids, set_pin, verify_pin)';
  RAISE NOTICE '- Created indexes on all foreign keys';
  RAISE NOTICE '- Created updated_at triggers on child_profiles, worlds, parental_settings';
END $$;
