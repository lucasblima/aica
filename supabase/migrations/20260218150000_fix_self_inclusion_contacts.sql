-- ============================================================================
-- Fix: Prevent users from adding themselves as their own contact
--
-- Problem: find_or_create_contact() had no self-exclusion check, allowing
-- users to appear in their own contacts list (via Google Contacts sync,
-- Studio guest creation, or manual add).
--
-- Fix:
--   1. Update find_or_create_contact() to reject when p_email matches
--      the owner's email in auth.users
--   2. Clean up existing self-referencing contacts
-- ============================================================================

-- =====================
-- 1. UPDATE RPC: find_or_create_contact — add self-exclusion guard
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
  v_owner_email TEXT;
BEGIN
  -- Self-exclusion: prevent user from adding themselves as a contact
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    SELECT email INTO v_owner_email
    FROM auth.users
    WHERE id = p_owner_id;

    IF v_owner_email IS NOT NULL AND LOWER(TRIM(p_email)) = LOWER(v_owner_email) THEN
      RETURN NULL;
    END IF;
  END IF;

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
-- 2. CLEANUP: Delete existing self-referencing contacts
--    Where a user's own email matches the contact email they own
-- =====================

DELETE FROM public.platform_contacts
WHERE owner_id IS NOT NULL
  AND email IS NOT NULL
  AND LOWER(email) = (
    SELECT LOWER(au.email)
    FROM auth.users au
    WHERE au.id = platform_contacts.owner_id
  );
