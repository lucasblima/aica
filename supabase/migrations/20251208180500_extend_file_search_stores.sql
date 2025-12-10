-- =====================================================
-- MIGRATION: 20251208180500_extend_file_search_stores
-- Description: Extend user_file_search_stores for new categories and config
-- Author: Aica Backend Architect
-- Date: 2025-12-08
-- =====================================================

-- =====================================================
-- EXTEND: user_file_search_stores
-- =====================================================

-- Drop old constraint
ALTER TABLE public.user_file_search_stores
DROP CONSTRAINT IF EXISTS user_file_search_stores_store_category_check;

-- Add new constraint with expanded categories
ALTER TABLE public.user_file_search_stores
ADD CONSTRAINT user_file_search_stores_store_category_check
CHECK (store_category IN (
  'financial',
  'documents',
  'personal',
  'business',
  'grants',
  'podcast',        -- NEW: Podcast transcripts and scripts
  'journey',        -- NEW: Journey moments and stories
  'media',          -- NEW: Photos, videos metadata
  'transcriptions'  -- NEW: Audio transcriptions
));

-- Add store configuration column
ALTER TABLE public.user_file_search_stores
ADD COLUMN IF NOT EXISTS store_config JSONB DEFAULT '{}';

COMMENT ON COLUMN public.user_file_search_stores.store_config IS 'Configuration: {auto_index: boolean, index_images: boolean, index_videos: boolean, max_file_size_mb: number}';

-- Remove old unique constraint (allow multiple stores per category)
ALTER TABLE public.user_file_search_stores
DROP CONSTRAINT IF EXISTS user_file_search_stores_user_id_store_category_key;

-- Add new unique constraint on store_name
ALTER TABLE public.user_file_search_stores
ADD CONSTRAINT user_file_search_stores_store_name_unique
UNIQUE(store_name);

-- Add index for faster lookups by category
CREATE INDEX IF NOT EXISTS idx_file_search_stores_category
ON public.user_file_search_stores(user_id, store_category);
