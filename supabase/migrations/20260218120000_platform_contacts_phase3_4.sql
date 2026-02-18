-- ============================================================================
-- Platform Contacts — Phase 3 (Flux Bridge) & Phase 4 (Connections, Grants,
--                      Deduplication, Google Sync, Cross-module Appearances)
--
-- Depends on: 20260218110000_platform_contacts.sql (platform_contacts table)
-- ============================================================================

-- =====================
-- PHASE 3: Flux Bridge
-- =====================

-- 3A. Add FK column on athletes
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS platform_contact_id UUID REFERENCES public.platform_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_athletes_platform_contact
  ON public.athletes(platform_contact_id) WHERE platform_contact_id IS NOT NULL;

-- 3B. Backfill RPC: migrate existing athletes into platform_contacts
CREATE OR REPLACE FUNCTION public.backfill_athletes_to_platform_contacts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete RECORD;
  v_contact_id UUID;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  FOR v_athlete IN
    SELECT a.id, a.user_id, a.name, a.email, a.phone
    FROM public.athletes a
    WHERE a.platform_contact_id IS NULL
      AND (a.name IS NOT NULL OR a.email IS NOT NULL)
  LOOP
    BEGIN
      -- Try to find existing contact by email for this owner
      IF v_athlete.email IS NOT NULL AND TRIM(v_athlete.email) != '' THEN
        SELECT id INTO v_contact_id
        FROM public.platform_contacts
        WHERE owner_id = v_athlete.user_id
          AND LOWER(email) = LOWER(TRIM(v_athlete.email))
        LIMIT 1;
      ELSE
        v_contact_id := NULL;
      END IF;

      IF v_contact_id IS NULL THEN
        -- Create new platform contact
        INSERT INTO public.platform_contacts (
          owner_id, display_name, email, phone, source_module, metadata
        ) VALUES (
          v_athlete.user_id,
          COALESCE(TRIM(v_athlete.name), 'Athlete'),
          NULLIF(TRIM(v_athlete.email), ''),
          NULLIF(TRIM(v_athlete.phone), ''),
          'flux',
          jsonb_build_object('backfilled_from', 'athletes', 'athlete_id', v_athlete.id::TEXT)
        )
        RETURNING id INTO v_contact_id;
      ELSE
        -- Update existing contact: merge phone if missing
        UPDATE public.platform_contacts
        SET
          phone = COALESCE(phone, NULLIF(TRIM(v_athlete.phone), '')),
          metadata = metadata || jsonb_build_object('athlete_id', v_athlete.id::TEXT),
          updated_at = NOW()
        WHERE id = v_contact_id;
      END IF;

      -- Link athlete to platform contact
      UPDATE public.athletes
      SET platform_contact_id = v_contact_id
      WHERE id = v_athlete.id;

      v_count := v_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'backfill_athletes_to_platform_contacts: skipped athlete %: %', v_athlete.id, SQLERRM;
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN json_build_object(
    'linked', v_count,
    'skipped', v_skipped
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'backfill_athletes_to_platform_contacts failed: %', SQLERRM;
  RETURN json_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_athletes_to_platform_contacts() TO authenticated;

-- =====================
-- PHASE 4A: Connections Bridge
-- =====================

-- 4A-1. Add FK column on connection_members
ALTER TABLE public.connection_members
  ADD COLUMN IF NOT EXISTS platform_contact_id UUID REFERENCES public.platform_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_connection_members_platform_contact
  ON public.connection_members(platform_contact_id) WHERE platform_contact_id IS NOT NULL;

-- 4A-2. Backfill RPC: migrate connection_members into platform_contacts
CREATE OR REPLACE FUNCTION public.backfill_connection_members_to_platform_contacts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_contact_id UUID;
  v_space_owner_id UUID;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  FOR v_member IN
    SELECT cm.id, cm.space_id, cm.external_name, cm.external_email, cm.external_phone
    FROM public.connection_members cm
    WHERE cm.platform_contact_id IS NULL
      AND (cm.external_email IS NOT NULL OR cm.external_name IS NOT NULL)
  LOOP
    BEGIN
      -- Get the space owner (user_id on connection_spaces)
      SELECT user_id INTO v_space_owner_id
      FROM public.connection_spaces
      WHERE id = v_member.space_id
      LIMIT 1;

      IF v_space_owner_id IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      -- Try to find existing contact by email
      IF v_member.external_email IS NOT NULL AND TRIM(v_member.external_email) != '' THEN
        SELECT id INTO v_contact_id
        FROM public.platform_contacts
        WHERE owner_id = v_space_owner_id
          AND LOWER(email) = LOWER(TRIM(v_member.external_email))
        LIMIT 1;
      ELSE
        v_contact_id := NULL;
      END IF;

      IF v_contact_id IS NULL THEN
        -- Create new platform contact
        INSERT INTO public.platform_contacts (
          owner_id, display_name, email, phone, source_module, metadata
        ) VALUES (
          v_space_owner_id,
          COALESCE(NULLIF(TRIM(v_member.external_name), ''), 'Contact'),
          NULLIF(TRIM(v_member.external_email), ''),
          NULLIF(TRIM(v_member.external_phone), ''),
          'connections',
          jsonb_build_object('backfilled_from', 'connection_members', 'member_id', v_member.id::TEXT)
        )
        RETURNING id INTO v_contact_id;
      ELSE
        -- Update existing: merge phone if missing
        UPDATE public.platform_contacts
        SET
          phone = COALESCE(phone, NULLIF(TRIM(v_member.external_phone), '')),
          metadata = metadata || jsonb_build_object('member_id', v_member.id::TEXT),
          updated_at = NOW()
        WHERE id = v_contact_id;
      END IF;

      -- Link connection_member to platform contact
      UPDATE public.connection_members
      SET platform_contact_id = v_contact_id
      WHERE id = v_member.id;

      v_count := v_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'backfill_connection_members: skipped member %: %', v_member.id, SQLERRM;
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN json_build_object(
    'linked', v_count,
    'skipped', v_skipped
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'backfill_connection_members_to_platform_contacts failed: %', SQLERRM;
  RETURN json_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_connection_members_to_platform_contacts() TO authenticated;

-- =====================
-- PHASE 4B: Grant Collaborators
-- =====================

CREATE TABLE IF NOT EXISTS public.grant_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.grant_projects(id) ON DELETE CASCADE,
  platform_contact_id UUID NOT NULL REFERENCES public.platform_contacts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('lead', 'collaborator', 'advisor', 'reviewer')),
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grant_collaborators_project
  ON public.grant_collaborators(project_id);

CREATE INDEX IF NOT EXISTS idx_grant_collaborators_contact
  ON public.grant_collaborators(platform_contact_id);

-- RLS: user can CRUD if they added the collaborator OR own the project
ALTER TABLE public.grant_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaborators_select" ON public.grant_collaborators;
CREATE POLICY "collaborators_select" ON public.grant_collaborators
  FOR SELECT USING (
    auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM public.grant_projects gp
      WHERE gp.id = grant_collaborators.project_id
        AND gp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "collaborators_insert" ON public.grant_collaborators;
CREATE POLICY "collaborators_insert" ON public.grant_collaborators
  FOR INSERT WITH CHECK (
    auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM public.grant_projects gp
      WHERE gp.id = grant_collaborators.project_id
        AND gp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "collaborators_update" ON public.grant_collaborators;
CREATE POLICY "collaborators_update" ON public.grant_collaborators
  FOR UPDATE USING (
    auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM public.grant_projects gp
      WHERE gp.id = grant_collaborators.project_id
        AND gp.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM public.grant_projects gp
      WHERE gp.id = grant_collaborators.project_id
        AND gp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "collaborators_delete" ON public.grant_collaborators;
CREATE POLICY "collaborators_delete" ON public.grant_collaborators
  FOR DELETE USING (
    auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM public.grant_projects gp
      WHERE gp.id = grant_collaborators.project_id
        AND gp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grant_collaborators TO authenticated;

-- =====================
-- PHASE 4C: Deduplication RPC
-- =====================

CREATE OR REPLACE FUNCTION public.deduplicate_platform_contacts(p_owner_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dup RECORD;
  v_primary_id UUID;
  v_dup_ids UUID[];
  v_total_merged INTEGER := 0;
  v_all_deleted UUID[] := '{}';
BEGIN
  -- Verify caller owns the contacts
  IF p_owner_id != auth.uid() THEN
    RETURN json_build_object('error', 'unauthorized');
  END IF;

  -- Find groups of contacts with the same email for this owner
  FOR v_dup IN
    SELECT LOWER(email) AS norm_email, array_agg(id ORDER BY created_at ASC) AS contact_ids
    FROM public.platform_contacts
    WHERE owner_id = p_owner_id
      AND email IS NOT NULL
      AND TRIM(email) != ''
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  LOOP
    BEGIN
      -- Primary = oldest (first in array)
      v_primary_id := v_dup.contact_ids[1];
      -- Duplicates = all others
      v_dup_ids := v_dup.contact_ids[2:array_length(v_dup.contact_ids, 1)];

      -- Merge metadata from duplicates into primary
      UPDATE public.platform_contacts
      SET
        metadata = (
          SELECT metadata || COALESCE(
            (SELECT jsonb_agg_metadata FROM (
              SELECT jsonb_object_agg(key, value) AS jsonb_agg_metadata
              FROM (
                SELECT DISTINCT ON (key) key, value
                FROM public.platform_contacts pc_dup,
                     LATERAL jsonb_each(pc_dup.metadata)
                WHERE pc_dup.id = ANY(v_dup_ids)
                ORDER BY key
              ) sub
            ) agg),
            '{}'::jsonb
          )
        ),
        -- Keep the most complete display_name
        display_name = COALESCE(
          NULLIF(display_name, ''),
          (SELECT display_name FROM public.platform_contacts
           WHERE id = ANY(v_dup_ids) AND display_name IS NOT NULL AND display_name != ''
           ORDER BY length(display_name) DESC LIMIT 1),
          display_name
        ),
        -- Keep the most complete phone
        phone = COALESCE(
          phone,
          (SELECT phone FROM public.platform_contacts
           WHERE id = ANY(v_dup_ids) AND phone IS NOT NULL AND phone != ''
           LIMIT 1)
        ),
        -- Keep the most complete avatar
        avatar_url = COALESCE(
          avatar_url,
          (SELECT avatar_url FROM public.platform_contacts
           WHERE id = ANY(v_dup_ids) AND avatar_url IS NOT NULL AND avatar_url != ''
           LIMIT 1)
        ),
        -- Keep the most complete bio
        bio = COALESCE(
          bio,
          (SELECT bio FROM public.platform_contacts
           WHERE id = ANY(v_dup_ids) AND bio IS NOT NULL AND bio != ''
           LIMIT 1)
        ),
        updated_at = NOW()
      WHERE id = v_primary_id;

      -- Re-point FKs from duplicates to primary
      UPDATE public.podcast_episodes
      SET guest_contact_id = v_primary_id
      WHERE guest_contact_id = ANY(v_dup_ids);

      UPDATE public.athletes
      SET platform_contact_id = v_primary_id
      WHERE platform_contact_id = ANY(v_dup_ids);

      UPDATE public.connection_members
      SET platform_contact_id = v_primary_id
      WHERE platform_contact_id = ANY(v_dup_ids);

      UPDATE public.grant_collaborators
      SET platform_contact_id = v_primary_id
      WHERE platform_contact_id = ANY(v_dup_ids);

      -- Delete the duplicates
      DELETE FROM public.platform_contacts
      WHERE id = ANY(v_dup_ids);

      v_total_merged := v_total_merged + 1;
      v_all_deleted := v_all_deleted || v_dup_ids;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'deduplicate_platform_contacts: error merging email %: %', v_dup.norm_email, SQLERRM;
    END;
  END LOOP;

  RETURN json_build_object(
    'merged_count', v_total_merged,
    'deleted_ids', to_json(v_all_deleted)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'deduplicate_platform_contacts failed: %', SQLERRM;
  RETURN json_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduplicate_platform_contacts(UUID) TO authenticated;

-- =====================
-- PHASE 4D: Google Contacts Enrichment columns
-- =====================

ALTER TABLE public.platform_contacts
  ADD COLUMN IF NOT EXISTS google_resource_name TEXT;

ALTER TABLE public.platform_contacts
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

ALTER TABLE public.platform_contacts
  ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_platform_contacts_google
  ON public.platform_contacts(google_resource_name)
  WHERE google_resource_name IS NOT NULL;

-- =====================
-- PHASE 4E: Cross-module Appearance RPC
-- =====================

CREATE OR REPLACE FUNCTION public.get_contact_appearances(p_contact_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_episodes JSON;
  v_athletes JSON;
  v_connections JSON;
  v_grants JSON;
BEGIN
  -- Verify the caller owns this contact
  SELECT owner_id INTO v_owner_id
  FROM public.platform_contacts
  WHERE id = p_contact_id;

  IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Episodes where this contact is the guest
  SELECT COALESCE(json_agg(json_build_object(
    'id', pe.id,
    'title', pe.title,
    'status', pe.status,
    'scheduled_date', pe.scheduled_date
  )), '[]'::json) INTO v_episodes
  FROM public.podcast_episodes pe
  WHERE pe.guest_contact_id = p_contact_id;

  -- Athletes linked to this contact
  SELECT COALESCE(json_agg(json_build_object(
    'id', a.id,
    'name', a.name,
    'modality', a.modality,
    'status', a.status
  )), '[]'::json) INTO v_athletes
  FROM public.athletes a
  WHERE a.platform_contact_id = p_contact_id;

  -- Connection members linked to this contact
  SELECT COALESCE(json_agg(json_build_object(
    'id', cm.id,
    'space_id', cm.space_id,
    'role', cm.role,
    'space_name', cs.name
  )), '[]'::json) INTO v_connections
  FROM public.connection_members cm
  LEFT JOIN public.connection_spaces cs ON cs.id = cm.space_id
  WHERE cm.platform_contact_id = p_contact_id;

  -- Grant collaborators linked to this contact
  SELECT COALESCE(json_agg(json_build_object(
    'id', gc.id,
    'project_id', gc.project_id,
    'project_name', gp.project_name,
    'role', gc.role
  )), '[]'::json) INTO v_grants
  FROM public.grant_collaborators gc
  LEFT JOIN public.grant_projects gp ON gp.id = gc.project_id
  WHERE gc.platform_contact_id = p_contact_id;

  RETURN json_build_object(
    'episodes', v_episodes,
    'athletes', v_athletes,
    'connections', v_connections,
    'grants', v_grants
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'get_contact_appearances failed for %: %', p_contact_id, SQLERRM;
  RETURN json_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_appearances(UUID) TO authenticated;
