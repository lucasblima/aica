-- Migration: search_aica_users RPC
-- Date: 2026-02-27
-- Description: SECURITY DEFINER RPC to allow coaches to search AICA users
-- by name or email for linking as athletes in Flux CRM.
-- Returns only basic public info (id, full_name, avatar_url, email).

-- Create the search function
CREATE OR REPLACE FUNCTION public.search_aica_users(p_query TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT
) AS $$
BEGIN
  -- Require at least 2 characters to prevent scanning all users
  IF length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    u.email::TEXT
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE
    -- Exclude the caller (coach shouldn't add themselves)
    p.id != auth.uid()
    AND (
      p.full_name ILIKE '%' || trim(p_query) || '%'
      OR u.email ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY
    -- Exact name matches first, then partial
    CASE WHEN p.full_name ILIKE trim(p_query) THEN 0 ELSE 1 END,
    p.full_name
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_aica_users(TEXT) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.search_aica_users(TEXT) IS
  'Search AICA users by name or email for athlete linking. Returns limited public info only.';
