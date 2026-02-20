-- Remove redundant anon INSERT policy on waitlist_signups
-- The add_to_waitlist RPC (SECURITY DEFINER) is the only entry point,
-- so direct INSERT access bypasses validation logic and is unnecessary.
DROP POLICY IF EXISTS "Anyone can sign up for waitlist" ON public.waitlist_signups;
