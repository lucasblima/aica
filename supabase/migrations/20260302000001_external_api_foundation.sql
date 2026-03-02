-- Migration: External API Foundation Tables
-- Date: 2026-03-02
-- Description: Foundation tables for external API integrations (holidays, weather, usage tracking)
-- Part of: Strategic API Arsenal for AICA OS

BEGIN;

-- ============================================
-- 1. BRAZILIAN HOLIDAYS — Public cache, NO RLS
-- ============================================
-- Source: Nager.Date API (free, no auth required)
-- Shared across all users — no user_id needed

CREATE TABLE IF NOT EXISTS public.brazilian_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  name TEXT NOT NULL,
  local_name TEXT,
  year INTEGER NOT NULL,
  holiday_type TEXT DEFAULT 'Public',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, year)
);

CREATE INDEX IF NOT EXISTS idx_brazilian_holidays_date
  ON public.brazilian_holidays(date);

CREATE INDEX IF NOT EXISTS idx_brazilian_holidays_year
  ON public.brazilian_holidays(year);

COMMENT ON TABLE public.brazilian_holidays IS
  'Cache of Brazilian public holidays from Nager.Date API. Shared across all users, no RLS.';

-- ============================================
-- 2. WEATHER CACHE — Shared cache, NO RLS
-- ============================================
-- Source: Open-Meteo API (free, no auth required)
-- Cached by lat/lon coordinates, expires after TTL

CREATE TABLE IF NOT EXISTS public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(8,5) NOT NULL,
  longitude DECIMAL(8,5) NOT NULL,
  forecast_data JSONB NOT NULL,
  gemini_insight TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(latitude, longitude)
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_coords
  ON public.weather_cache(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_weather_cache_expires
  ON public.weather_cache(expires_at);

COMMENT ON TABLE public.weather_cache IS
  'Cache of weather forecasts from Open-Meteo API. Keyed by coordinates, auto-expires. No RLS.';

-- ============================================
-- 3. EXTERNAL API USAGE — Telemetry, WITH RLS
-- ============================================
-- Tracks all external API calls for monitoring, debugging, cost awareness

CREATE TABLE IF NOT EXISTS public.external_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  latency_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  success BOOLEAN DEFAULT true,
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_api_usage_api_name
  ON public.external_api_usage(api_name);

CREATE INDEX IF NOT EXISTS idx_external_api_usage_created_at
  ON public.external_api_usage(created_at);

ALTER TABLE public.external_api_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage records
DROP POLICY IF EXISTS "Users can read own api usage" ON public.external_api_usage;
CREATE POLICY "Users can read own api usage"
  ON public.external_api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert usage records (Edge Functions use service role)
DROP POLICY IF EXISTS "Service role can insert api usage" ON public.external_api_usage;
CREATE POLICY "Service role can insert api usage"
  ON public.external_api_usage
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.external_api_usage IS
  'Telemetry for all external API calls. RLS: users read own, service role inserts.';

-- ============================================
-- 4. ALTER PROFILES — Add location columns
-- ============================================
-- Used by weather and timezone-aware features

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'detected_timezone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN detected_timezone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'detected_city'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN detected_city TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'detected_latitude'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN detected_latitude DECIMAL(8,5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'detected_longitude'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN detected_longitude DECIMAL(8,5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'location_source'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN location_source TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.detected_timezone IS 'Auto-detected timezone (e.g., America/Sao_Paulo)';
COMMENT ON COLUMN public.profiles.detected_city IS 'Auto-detected city name';
COMMENT ON COLUMN public.profiles.detected_latitude IS 'Latitude for weather lookups';
COMMENT ON COLUMN public.profiles.detected_longitude IS 'Longitude for weather lookups';
COMMENT ON COLUMN public.profiles.location_source IS 'How location was determined (browser_geolocation, ip_lookup, manual)';

-- ============================================
-- 5. CLEANUP FUNCTION — Expired weather cache
-- ============================================
-- Called by pg_cron or manually to remove stale cache entries

CREATE OR REPLACE FUNCTION public.cleanup_expired_weather_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.weather_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_weather_cache IS
  'Removes expired weather cache entries. Returns count of deleted rows. Call via pg_cron or manually.';

COMMIT;
