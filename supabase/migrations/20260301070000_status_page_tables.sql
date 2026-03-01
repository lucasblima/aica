-- ============================================
-- Status Page Tables: incidents, changelog, roadmap
-- Issue #599
-- ============================================

-- 1. Service Incidents
CREATE TABLE IF NOT EXISTS public.service_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL CHECK (severity IN ('outage', 'degraded', 'maintenance')),
  affected_module TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read incidents"
  ON public.service_incidents FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Service Changelog
CREATE TABLE IF NOT EXISTS public.service_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  change_type TEXT NOT NULL CHECK (change_type IN ('feat', 'fix', 'improvement', 'security', 'infra', 'docs', 'perf')),
  description TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  commit_sha TEXT,
  pr_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read changelog"
  ON public.service_changelog FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Roadmap Items
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  module TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done')) DEFAULT 'planned',
  quarter TEXT,
  priority INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read roadmap"
  ON public.roadmap_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_service_incidents_started_at ON public.service_incidents(started_at DESC);
CREATE INDEX idx_service_changelog_date ON public.service_changelog(date DESC);
CREATE INDEX idx_roadmap_items_status ON public.roadmap_items(status);
