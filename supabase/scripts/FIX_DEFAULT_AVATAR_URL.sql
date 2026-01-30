-- =============================================================================
-- FIX: Remove invalid '/default-avatar.png' from avatar_url fields
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- =============================================================================
-- STEP 1: DIAGNOSTIC - Find affected records
-- =============================================================================

-- Check auth.users metadata
SELECT 'AUTH.USERS with default-avatar.png:' as source;
SELECT
  id,
  email,
  raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users
WHERE raw_user_meta_data->>'avatar_url' LIKE '%default-avatar%'
   OR raw_user_meta_data->>'avatar_url' = '/default-avatar.png';

-- Check public.users table (if exists)
SELECT 'PUBLIC.USERS with default-avatar.png:' as source;
SELECT id, email, avatar_url
FROM public.users
WHERE avatar_url LIKE '%default-avatar%'
   OR avatar_url = '/default-avatar.png';

-- Check public.profiles table (if exists)
SELECT 'PUBLIC.PROFILES with default-avatar.png:' as source;
SELECT id, avatar_url
FROM public.profiles
WHERE avatar_url LIKE '%default-avatar%'
   OR avatar_url = '/default-avatar.png';

-- =============================================================================
-- STEP 2: FIX - Set avatar_url to NULL (run after confirming diagnostics)
-- =============================================================================

-- Uncomment and run these after checking the diagnostic results:

-- Fix auth.users metadata
-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data - 'avatar_url'
-- WHERE raw_user_meta_data->>'avatar_url' LIKE '%default-avatar%'
--    OR raw_user_meta_data->>'avatar_url' = '/default-avatar.png';

-- Fix public.users table
-- UPDATE public.users
-- SET avatar_url = NULL
-- WHERE avatar_url LIKE '%default-avatar%'
--    OR avatar_url = '/default-avatar.png';

-- Fix public.profiles table
-- UPDATE public.profiles
-- SET avatar_url = NULL
-- WHERE avatar_url LIKE '%default-avatar%'
--    OR avatar_url = '/default-avatar.png';

-- =============================================================================
-- STEP 3: VERIFY - Confirm fix worked
-- =============================================================================

-- SELECT 'Verification - should return 0 rows:' as status;
-- SELECT COUNT(*) as remaining_issues
-- FROM auth.users
-- WHERE raw_user_meta_data->>'avatar_url' LIKE '%default-avatar%';
