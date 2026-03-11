-- RPC to lookup user by email in auth.users (not accessible via PostgREST)
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, au.email::TEXT
  FROM auth.users au
  WHERE au.email = p_email
  LIMIT 1;
$$;

-- Only service role should call this (Edge Functions use service role)
REVOKE ALL ON FUNCTION public.lookup_user_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_user_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(TEXT) TO service_role;
