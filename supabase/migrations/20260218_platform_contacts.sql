-- ============================================================================
-- Platform Contacts — Unified Contact Registry
--
-- Replaces per-module contact storage with a single platform-wide table.
-- Any module (Studio, Flux, Connections, Grants) can create contacts here.
-- Email is the link: owner enters email -> contact signs up -> auto-linked.
--
-- Columns:
--   owner_id UUID         — the user who owns/created this contact
--   auth_user_id UUID     — FK to auth.users (NULL = not yet linked)
--   display_name TEXT      — contact's display name
--   email TEXT             — contact email (used for linking)
--   phone TEXT             — optional phone
--   avatar_url TEXT        — optional avatar
--   bio TEXT               — optional bio
--   source_module TEXT     — which module created this contact
--   invitation_status TEXT — 'none' | 'pending' | 'sent' | 'connected'
--   linked_at TIMESTAMPTZ  — when auth_user_id was set
--   metadata JSONB         — module-specific extra data
--
-- Triggers:
--   1. contact_email_status_sync — BEFORE INSERT/UPDATE OF email
--   2. link_contacts_on_signup   — AFTER INSERT on auth.users
--
-- RLS: owner can full CRUD; linked user can SELECT own record
--
-- RPCs:
--   find_or_create_contact()  — upsert by (owner_id, email)
--   get_my_contact_profiles() — portal: contacts linked to current user
--
-- Phase 2A: podcast_episodes.guest_contact_id FK + guest RLS
-- ============================================================================

-- =====================
-- 1. TABLE: platform_contacts
-- =====================

CREATE TABLE IF NOT EXISTS public.platform_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  source_module TEXT NOT NULL CHECK (source_module IN ('studio', 'flux', 'connections', 'grants', 'manual')),
  invitation_status TEXT NOT NULL DEFAULT 'none' CHECK (invitation_status IN ('none', 'pending', 'sent', 'connected')),
  linked_at TIMESTAMPTZ,
  invitation_sent_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- 2. INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_platform_contacts_owner ON public.platform_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_platform_contacts_email_lower ON public.platform_contacts(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_contacts_auth_user ON public.platform_contacts(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_contacts_owner_email_unique ON public.platform_contacts(owner_id, LOWER(email)) WHERE email IS NOT NULL;

-- =====================
-- 3. RLS POLICIES
-- =====================

ALTER TABLE public.platform_contacts ENABLE ROW LEVEL SECURITY;

-- Owner can read all their contacts
CREATE POLICY "owner_select_contacts" ON public.platform_contacts
  FOR SELECT USING (auth.uid() = owner_id);

-- Owner can insert contacts
CREATE POLICY "owner_insert_contacts" ON public.platform_contacts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owner can update their contacts
CREATE POLICY "owner_update_contacts" ON public.platform_contacts
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Owner can delete their contacts
CREATE POLICY "owner_delete_contacts" ON public.platform_contacts
  FOR DELETE USING (auth.uid() = owner_id);

-- Linked user (contact who signed up) can see their own contact record
CREATE POLICY "linked_user_select_self" ON public.platform_contacts
  FOR SELECT USING (auth.uid() = auth_user_id);

-- =====================
-- 4. TRIGGER: contact_email_status_sync
--    When owner adds/changes email, check if user already exists -> link or set pending
-- =====================

CREATE OR REPLACE FUNCTION public.contact_email_status_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_auth_user_id UUID;
BEGIN
  -- Email was removed
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    -- Only reset if not already connected (don't break existing link)
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'none';
    END IF;
    RETURN NEW;
  END IF;

  -- Check if a user with this email already exists
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(NEW.email))
  LIMIT 1;

  IF v_auth_user_id IS NOT NULL THEN
    -- User exists -> link immediately
    NEW.auth_user_id := v_auth_user_id;
    NEW.linked_at := NOW();
    NEW.invitation_status := 'connected';
  ELSE
    -- User doesn't exist yet -> pending
    IF NEW.auth_user_id IS NULL THEN
      NEW.invitation_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block contact creation/update
    RAISE WARNING 'contact_email_status_sync failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contact_email_status_sync ON public.platform_contacts;
CREATE TRIGGER trg_contact_email_status_sync
  BEFORE INSERT OR UPDATE OF email ON public.platform_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.contact_email_status_sync();

-- =====================
-- 5. TRIGGER: link_contacts_on_signup
--    When new user signs up, check if their email matches pending/sent contacts
-- =====================

CREATE OR REPLACE FUNCTION public.link_contacts_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to link any pending/sent contacts that match this new user's email
  UPDATE public.platform_contacts
  SET
    auth_user_id = NEW.id,
    linked_at = NOW(),
    invitation_status = 'connected'
  WHERE
    LOWER(email) = LOWER(NEW.email)
    AND invitation_status IN ('pending', 'sent')
    AND auth_user_id IS NULL;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- CRITICAL: Never block user signup
    RAISE WARNING 'link_contacts_on_signup failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_link_contacts ON auth.users;
CREATE TRIGGER on_auth_user_created_link_contacts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_contacts_on_signup();

-- =====================
-- 6. RPC: find_or_create_contact
--    Upsert by (owner_id, LOWER(email)); merge metadata on conflict
-- =====================

CREATE OR REPLACE FUNCTION public.find_or_create_contact(
  p_owner_id UUID,
  p_display_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_source_module TEXT DEFAULT 'manual',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  v_contact public.platform_contacts;
  v_existing_id UUID;
BEGIN
  -- If email provided, check for existing contact by (owner_id, email)
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    SELECT id INTO v_existing_id
    FROM public.platform_contacts
    WHERE owner_id = p_owner_id
      AND LOWER(email) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Update existing contact: merge display_name, phone, metadata
      UPDATE public.platform_contacts
      SET
        display_name = COALESCE(NULLIF(TRIM(p_display_name), ''), display_name),
        phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone),
        metadata = metadata || p_metadata,
        updated_at = NOW()
      WHERE id = v_existing_id
      RETURNING * INTO v_contact;

      RETURN row_to_json(v_contact);
    END IF;
  END IF;

  -- Not found -> INSERT new contact
  INSERT INTO public.platform_contacts (
    owner_id, display_name, email, phone, source_module, metadata
  ) VALUES (
    p_owner_id,
    TRIM(p_display_name),
    NULLIF(TRIM(p_email), ''),
    NULLIF(TRIM(p_phone), ''),
    p_source_module,
    p_metadata
  )
  RETURNING * INTO v_contact;

  RETURN row_to_json(v_contact);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- 7. RPC: get_my_contact_profiles
--    Portal access: returns all contacts linked to current user with owner info
-- =====================

CREATE OR REPLACE FUNCTION public.get_my_contact_profiles()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(
    json_build_object(
      'contact_id', pc.id,
      'display_name', pc.display_name,
      'email', pc.email,
      'phone', pc.phone,
      'avatar_url', pc.avatar_url,
      'bio', pc.bio,
      'source_module', pc.source_module,
      'invitation_status', pc.invitation_status,
      'linked_at', pc.linked_at,
      'metadata', pc.metadata,
      'owner', json_build_object(
        'id', pc.owner_id,
        'name', COALESCE(
          (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = pc.owner_id),
          'User'
        )
      )
    )
  ), '[]'::json) INTO v_result
  FROM public.platform_contacts pc
  WHERE pc.auth_user_id = auth.uid();

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================
-- 8. GRANT EXECUTE on RPCs
-- =====================

GRANT EXECUTE ON FUNCTION public.find_or_create_contact(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_contact_profiles() TO authenticated;

-- =====================
-- 9. PHASE 2A: podcast_episodes.guest_contact_id
--    Links episodes to platform contacts for guest portal access
-- =====================

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS guest_contact_id UUID REFERENCES public.platform_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_episodes_guest_contact ON public.podcast_episodes(guest_contact_id) WHERE guest_contact_id IS NOT NULL;

-- =====================
-- 10. RLS: Guest can see episodes where they are the guest
-- =====================

CREATE POLICY "guest_select_own_episodes" ON public.podcast_episodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.platform_contacts pc
      WHERE pc.id = podcast_episodes.guest_contact_id
        AND pc.auth_user_id = auth.uid()
    )
  );
