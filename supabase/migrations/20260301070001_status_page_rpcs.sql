-- ============================================
-- Status Page RPCs
-- Issue #599
-- ============================================

-- Drop existing functions to handle return type changes
DROP FUNCTION IF EXISTS public.get_overall_service_status();
DROP FUNCTION IF EXISTS public.get_public_incidents();
DROP FUNCTION IF EXISTS public.get_public_changelog(INTEGER);
DROP FUNCTION IF EXISTS public.get_roadmap_items();

-- 1. get_overall_service_status
CREATE OR REPLACE FUNCTION public.get_overall_service_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM public.service_incidents
            WHERE resolved_at IS NULL AND severity = 'outage'
          ) THEN 'outage'
          WHEN EXISTS (
            SELECT 1 FROM public.service_incidents
            WHERE resolved_at IS NULL AND severity IN ('degraded', 'maintenance')
          ) THEN 'degraded'
          ELSE 'operational'
        END
    ),
    'operational'
  );
$$;

-- 2. get_public_incidents
CREATE OR REPLACE FUNCTION public.get_public_incidents()
RETURNS SETOF public.service_incidents
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.service_incidents
  WHERE started_at >= now() - INTERVAL '30 days'
  ORDER BY started_at DESC
  LIMIT 50;
$$;

-- 3. get_public_changelog
CREATE OR REPLACE FUNCTION public.get_public_changelog(p_limit INTEGER DEFAULT 30)
RETURNS SETOF public.service_changelog
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.service_changelog
  ORDER BY date DESC, created_at DESC
  LIMIT p_limit;
$$;

-- 4. get_roadmap_items
CREATE OR REPLACE FUNCTION public.get_roadmap_items()
RETURNS SETOF public.roadmap_items
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.roadmap_items
  ORDER BY
    CASE status
      WHEN 'in_progress' THEN 0
      WHEN 'planned' THEN 1
      WHEN 'done' THEN 2
    END,
    priority DESC,
    created_at DESC;
$$;
