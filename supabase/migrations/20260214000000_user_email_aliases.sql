-- ============================================================================
-- Migration: User Email Aliases
-- Description: Allows users to receive email imports from work/alternate emails.
--              Used by receive-email-import Edge Function for user resolution.
-- ============================================================================

-- 1. Create user_email_aliases table
CREATE TABLE IF NOT EXISTS public.user_email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias_email TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alias_email)
);

COMMENT ON TABLE public.user_email_aliases IS 'Maps alternate email addresses to AICA users for email import identification';
COMMENT ON COLUMN public.user_email_aliases.alias_email IS 'Alternate email (e.g., work email) that maps to this user';
COMMENT ON COLUMN public.user_email_aliases.is_verified IS 'Whether this alias has been verified (default true for admin-added)';

-- 2. RLS
ALTER TABLE public.user_email_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own aliases"
  ON public.user_email_aliases FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to aliases"
  ON public.user_email_aliases FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_email_aliases_email
  ON public.user_email_aliases (alias_email);

CREATE INDEX IF NOT EXISTS idx_user_email_aliases_user
  ON public.user_email_aliases (user_id);

-- 4. Seed: Add first alias (lucas@comtxae.com → lucasboscacci@gmail.com)
-- Resolve user_id dynamically from auth.users
INSERT INTO public.user_email_aliases (user_id, alias_email, is_verified)
SELECT id, 'lucas@comtxae.com', true
FROM auth.users
WHERE email = 'lucasboscacci@gmail.com'
ON CONFLICT (alias_email) DO NOTHING;
