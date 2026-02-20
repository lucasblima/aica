-- Waitlist signups table
CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  referral_code TEXT,
  source TEXT DEFAULT 'landing',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'activated', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  invited_at TIMESTAMPTZ
);

-- Unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_signups_email ON public.waitlist_signups(email);
-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_status ON public.waitlist_signups(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created ON public.waitlist_signups(created_at DESC);

-- RLS
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Anon can insert (signup without auth)
CREATE POLICY "Anyone can sign up for waitlist" ON public.waitlist_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated admins or service_role can read
-- For now, no SELECT policy for anon (admin uses service_role or dashboard)

-- RPC: add_to_waitlist (available to anon)
CREATE OR REPLACE FUNCTION public.add_to_waitlist(
  p_email TEXT,
  p_referral_code TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'landing'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
BEGIN
  -- Check if already signed up
  SELECT id INTO v_existing FROM waitlist_signups WHERE email = lower(trim(p_email));

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Você já está na lista de espera!', 'already_exists', true);
  END IF;

  INSERT INTO waitlist_signups (email, referral_code, source)
  VALUES (lower(trim(p_email)), p_referral_code, p_source);

  RETURN jsonb_build_object('success', true, 'message', 'Você entrou na lista de espera!', 'already_exists', false);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', true, 'message', 'Você já está na lista de espera!', 'already_exists', true);
END;
$$;

-- Grant execute to anon
GRANT EXECUTE ON FUNCTION public.add_to_waitlist(TEXT, TEXT, TEXT) TO anon, authenticated;

-- RPC: get_waitlist_stats (admin only)
CREATE OR REPLACE FUNCTION public.get_waitlist_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_signups', COUNT(*),
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
    'invited_count', COUNT(*) FILTER (WHERE status = 'invited'),
    'activated_count', COUNT(*) FILTER (WHERE status = 'activated'),
    'signups_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'signups_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
  ) INTO v_result
  FROM waitlist_signups;

  RETURN v_result;
END;
$$;

-- RPC: get_waitlist_count (public, just returns total count for landing page display)
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM waitlist_signups WHERE status IN ('pending', 'invited');
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_waitlist_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER waitlist_signups_updated_at
  BEFORE UPDATE ON public.waitlist_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_waitlist_updated_at();
