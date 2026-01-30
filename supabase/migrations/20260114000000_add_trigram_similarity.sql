-- Migration: Add pg_trgm Extension for Fuzzy Name Matching
-- Issue: #115 - Classification and Automatic Linking (Phase 2.1)
-- Date: 2026-01-14
-- Description:
--   1. Enable pg_trgm extension for trigram similarity search
--   2. Create GIN indexes on organization and project names for fast similarity queries
--   3. Create SECURITY DEFINER helper functions for fuzzy name matching
--   4. Functions return entity suggestions with similarity scores

-- =============================================================================
-- PART 1: ENABLE PG_TRGM EXTENSION
-- =============================================================================

-- Enable pg_trgm extension for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON EXTENSION pg_trgm IS 'Text similarity measurement and index searching based on trigrams';

-- =============================================================================
-- PART 2: CREATE TRIGRAM INDEXES
-- =============================================================================

-- Drop existing indexes if they exist (for idempotency)
DROP INDEX IF EXISTS idx_organizations_name_trgm;
DROP INDEX IF EXISTS idx_grant_projects_project_name_trgm;

-- Create GIN index on organizations.name for trigram similarity search
-- GIN indexes are optimal for full-text search and similarity queries
CREATE INDEX idx_organizations_name_trgm ON public.organizations
  USING GIN (name gin_trgm_ops);

COMMENT ON INDEX idx_organizations_name_trgm IS 'Trigram index for fast fuzzy name search on organizations';

-- Create GIN index on grant_projects.project_name for trigram similarity search
-- Note: grant_projects table may not exist yet in base schema
-- This will only succeed if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'grant_projects'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_grant_projects_project_name_trgm ON public.grant_projects
      USING GIN (project_name gin_trgm_ops);

    EXECUTE 'COMMENT ON INDEX idx_grant_projects_project_name_trgm IS ''Trigram index for fast fuzzy name search on grant projects''';

    RAISE NOTICE '[Trigram Migration] Created index on grant_projects.project_name';
  ELSE
    RAISE NOTICE '[Trigram Migration] grant_projects table does not exist yet - skipping index creation';
  END IF;
END $$;

-- =============================================================================
-- PART 3: HELPER FUNCTIONS FOR FUZZY NAME MATCHING
-- =============================================================================

-- Function: Find similar organizations by name
-- Uses trigram similarity to find organizations with similar names
-- Returns top matches above the similarity threshold
CREATE OR REPLACE FUNCTION public.find_similar_organizations(
  search_name TEXT,
  threshold FLOAT DEFAULT 0.3,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  document_number VARCHAR(20),
  organization_type VARCHAR(50),
  similarity_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF search_name IS NULL OR trim(search_name) = '' THEN
    RETURN;
  END IF;

  IF threshold < 0 OR threshold > 1 THEN
    RAISE EXCEPTION 'Threshold must be between 0.0 and 1.0';
  END IF;

  -- Return organizations with similarity above threshold
  -- Ordered by similarity score (highest first)
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.document_number,
    o.organization_type,
    similarity(o.name, search_name) AS similarity_score
  FROM public.organizations o
  WHERE similarity(o.name, search_name) > threshold
    AND o.is_active = true
  ORDER BY similarity_score DESC, o.name ASC
  LIMIT max_results;
END;
$$;

COMMENT ON FUNCTION public.find_similar_organizations(TEXT, FLOAT, INT) IS
  'Finds organizations with similar names using trigram similarity. ' ||
  'Returns matches above threshold (default 0.3) with similarity scores. ' ||
  'Uses SECURITY DEFINER to bypass RLS for cross-user matching.';

-- Function: Find similar grant projects by name
-- Uses trigram similarity to find projects with similar names
-- Returns top matches above the similarity threshold for the authenticated user
CREATE OR REPLACE FUNCTION public.find_similar_projects(
  search_name TEXT,
  threshold FLOAT DEFAULT 0.3,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  project_name VARCHAR(255),
  approval_number VARCHAR(100),
  project_status VARCHAR(50),
  similarity_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate inputs
  IF search_name IS NULL OR trim(search_name) = '' THEN
    RETURN;
  END IF;

  IF threshold < 0 OR threshold > 1 THEN
    RAISE EXCEPTION 'Threshold must be between 0.0 and 1.0';
  END IF;

  -- Check if grant_projects table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'grant_projects'
  ) THEN
    RAISE NOTICE 'grant_projects table does not exist yet';
    RETURN;
  END IF;

  -- Return projects with similarity above threshold
  -- Scoped to current user for security
  -- Ordered by similarity score (highest first)
  RETURN QUERY
  EXECUTE format('
    SELECT
      gp.id,
      gp.project_name,
      gp.approval_number,
      gp.project_status,
      similarity(gp.project_name, $1) AS similarity_score
    FROM public.grant_projects gp
    WHERE similarity(gp.project_name, $1) > $2
      AND gp.user_id = $3
    ORDER BY similarity_score DESC, gp.project_name ASC
    LIMIT $4
  ')
  USING search_name, threshold, current_user_id, max_results;
END;
$$;

COMMENT ON FUNCTION public.find_similar_projects(TEXT, FLOAT, INT) IS
  'Finds grant projects with similar names using trigram similarity. ' ||
  'Returns matches above threshold (default 0.3) with similarity scores. ' ||
  'Scoped to authenticated user. Uses SECURITY DEFINER for RLS bypass.';

-- =============================================================================
-- PART 4: GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.find_similar_organizations(TEXT, FLOAT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_projects(TEXT, FLOAT, INT) TO authenticated;

-- =============================================================================
-- PART 5: EXAMPLE USAGE AND TESTING
-- =============================================================================

-- Test queries for validation (commented out - uncomment to test)

-- Test 1: Find organizations similar to "Instituto Ayrton Senna"
-- SELECT * FROM find_similar_organizations('Instituto Airton Sena', 0.3, 5);

-- Test 2: Find projects similar to "Projeto Educação Digital"
-- SELECT * FROM find_similar_projects('Projeto Educacao Dijital', 0.3, 5);

-- Test 3: Check similarity scores for exact matches (should be 1.0)
-- SELECT similarity('Instituto Ayrton Senna', 'Instituto Ayrton Senna') AS exact_match;

-- Test 4: Check similarity scores for typos (should be > 0.7)
-- SELECT similarity('Instituto Ayrton Senna', 'Instituto Airton Sena') AS with_typo;

-- Test 5: Check similarity scores for abbreviations (may vary)
-- SELECT similarity('Organizacao das Nacoes Unidas', 'ONU') AS abbreviation;

-- =============================================================================
-- PART 6: PERFORMANCE NOTES
-- =============================================================================

/*
PERFORMANCE CONSIDERATIONS:

1. GIN Index Size:
   - GIN indexes are larger than B-tree indexes
   - Expect ~3x the size of the column data
   - Trade-off: slower writes, much faster reads

2. Similarity Thresholds:
   - 0.1-0.2: Very loose matching, many false positives
   - 0.3-0.4: Balanced (RECOMMENDED for typos/abbreviations)
   - 0.5-0.7: Strict matching
   - 0.8+: Almost exact matches only

3. Query Performance:
   - With GIN index: O(log n) - very fast
   - Without index: O(n) - full table scan
   - Index maintenance on INSERT/UPDATE is slower

4. Best Practices:
   - Use threshold >= 0.3 for production
   - Limit results to top 5-10 matches
   - Consider caching results for frequent searches
   - Monitor index bloat with pg_stat_user_indexes

5. Alternative Approaches:
   - For exact CNPJ matching: Use standard B-tree indexes
   - For full-text search: Consider ts_vector with GIN
   - For Levenshtein distance: Use fuzzystrmatch extension
*/

-- =============================================================================
-- SUCCESS LOG
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '[Trigram Migration] Successfully completed:';
  RAISE NOTICE '  ✓ Enabled pg_trgm extension';
  RAISE NOTICE '  ✓ Created GIN index on organizations.name';
  RAISE NOTICE '  ✓ Created GIN index on grant_projects.project_name (if table exists)';
  RAISE NOTICE '  ✓ Created find_similar_organizations() function';
  RAISE NOTICE '  ✓ Created find_similar_projects() function';
  RAISE NOTICE '  ✓ Granted permissions to authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage Examples:';
  RAISE NOTICE '  SELECT * FROM find_similar_organizations(''Instituto Airton Sena'', 0.3, 5);';
  RAISE NOTICE '  SELECT * FROM find_similar_projects(''Projeto Educacao Dijital'', 0.3, 5);';
END $$;
