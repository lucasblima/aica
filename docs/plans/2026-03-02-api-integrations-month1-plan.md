# Month 1 API Integrations — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build shared infrastructure for external APIs + integrate 5 free APIs (Nager.Date, Open-Meteo, ipapi.co, Cloudflare Turnstile, BrasilAPI) into AICA, with Atlas as the primary consumer.

**Architecture:** Shared infrastructure layer (`_shared/external-api.ts`) reused by all external API Edge Functions. Frontend uses `ExternalApiClient` singleton (mirrors `GeminiClient` pattern). All API calls proxied via Edge Functions — never called from frontend.

**Tech Stack:** Deno Edge Functions, React 18, TypeScript, React Query v5, Supabase (PostgreSQL + RLS), Tailwind CSS + Ceramic Design System.

**Design Doc:** `docs/plans/2026-03-02-api-integrations-month1-design.md`

---

## Task 1: Database — Migrations for holidays, weather cache, profile columns

**Files:**
- Create: `supabase/migrations/20260302000001_external_api_foundation.sql`

**Step 1: Write the migration**

```sql
-- ============================================
-- External API Foundation — Month 1
-- Tables: brazilian_holidays, weather_cache
-- Columns: profiles location fields
-- ============================================

-- 1. Brazilian Holidays (public cache, no RLS needed)
CREATE TABLE IF NOT EXISTS public.brazilian_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  local_name TEXT,
  year INTEGER NOT NULL,
  holiday_type TEXT DEFAULT 'Public',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, year)
);

-- Index for fast lookups by date range
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.brazilian_holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON public.brazilian_holidays(year);

-- 2. Weather Cache (shared by location, no RLS needed)
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- 3. External API Usage Tracking
CREATE TABLE IF NOT EXISTS public.external_api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  latency_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  success BOOLEAN DEFAULT true,
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.external_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api usage" ON public.external_api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert api usage" ON public.external_api_usage
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_api_usage_api ON public.external_api_usage(api_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON public.external_api_usage(created_at);

-- 4. Profile location columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS detected_timezone TEXT,
  ADD COLUMN IF NOT EXISTS detected_city TEXT,
  ADD COLUMN IF NOT EXISTS detected_latitude DECIMAL(8,5),
  ADD COLUMN IF NOT EXISTS detected_longitude DECIMAL(8,5),
  ADD COLUMN IF NOT EXISTS location_source TEXT;

-- 5. Cleanup function for expired weather cache
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
```

**Step 2: Test migration locally**

Run: `npx supabase db push --local`
Expected: Migration applies without errors.

**Step 3: Verify tables exist**

Run: `npx supabase db diff`
Expected: No diff (migration is clean).

**Step 4: Commit**

```bash
git add supabase/migrations/20260302000001_external_api_foundation.sql
git commit -m "feat(database): add external API foundation tables

Add brazilian_holidays, weather_cache, external_api_usage tables
and profile location columns for Month 1 API integrations.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Shared Infrastructure — `_shared/external-api.ts`

**Files:**
- Create: `supabase/functions/_shared/external-api.ts`

**Step 1: Write the shared module**

```typescript
/**
 * Shared infrastructure for all external API Edge Functions.
 * Provides: in-memory cache, retry with backoff, error mapping, rate limiting, logging.
 *
 * Usage:
 *   import { fetchExternalApi, ExternalApiConfig } from '../_shared/external-api.ts'
 */

// ---- Types ----

export interface ExternalApiConfig {
  name: string
  baseUrl: string
  cacheTtlSeconds: number
  maxRetries: number
  rateLimitPerDay?: number
}

export interface ExternalApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  source: string
  cached: boolean
  latencyMs: number
}

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

// ---- In-Memory Cache ----

const cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
}

// ---- Rate Limiting ----

const rateLimitCounters = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(config: ExternalApiConfig): boolean {
  if (!config.rateLimitPerDay) return true

  const key = config.name
  const now = Date.now()
  const counter = rateLimitCounters.get(key)

  if (!counter || now > counter.resetAt) {
    rateLimitCounters.set(key, { count: 1, resetAt: now + 86400000 })
    return true
  }

  if (counter.count >= config.rateLimitPerDay) {
    return false
  }

  counter.count++
  return true
}

// ---- Retry with Backoff ----

async function fetchWithRetry(
  url: string,
  maxRetries: number,
  init?: RequestInit
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init)

      if (response.ok) return response

      // Rate limited — wait and retry
      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
        await new Promise(r => setTimeout(r, retryAfter * 1000))
        continue
      }

      // Server error — retry with backoff
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
        continue
      }

      // Client error — don't retry
      throw new Error(`${response.status}: ${await response.text()}`)
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
        continue
      }
    }
  }

  throw lastError || new Error('Unknown fetch error')
}

// ---- Main Entry Point ----

export async function fetchExternalApi<T>(
  config: ExternalApiConfig,
  path: string,
  options?: {
    cacheKey?: string
    skipCache?: boolean
    init?: RequestInit
  }
): Promise<ExternalApiResponse<T>> {
  const startTime = Date.now()
  const cacheKey = options?.cacheKey || `${config.name}:${path}`

  // 1. Check cache
  if (!options?.skipCache) {
    const cached = getCached<T>(cacheKey)
    if (cached !== null) {
      return {
        success: true,
        data: cached,
        source: config.name,
        cached: true,
        latencyMs: Date.now() - startTime,
      }
    }
  }

  // 2. Check rate limit
  if (!checkRateLimit(config)) {
    return {
      success: false,
      error: `Rate limit exceeded for ${config.name}`,
      source: config.name,
      cached: false,
      latencyMs: Date.now() - startTime,
    }
  }

  // 3. Fetch from external API
  try {
    const url = `${config.baseUrl}${path}`
    const response = await fetchWithRetry(url, config.maxRetries, options?.init)
    const data = await response.json() as T

    // 4. Cache result
    setCache(cacheKey, data, config.cacheTtlSeconds)

    return {
      success: true,
      data,
      source: config.name,
      cached: false,
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      source: config.name,
      cached: false,
      latencyMs: Date.now() - startTime,
    }
  }
}
```

**Step 2: Verify import works from another Edge Function (manual check)**

Create a test file temporarily or verify syntax:
Run: `deno check supabase/functions/_shared/external-api.ts` (if Deno is available locally)

**Step 3: Commit**

```bash
git add supabase/functions/_shared/external-api.ts
git commit -m "feat(edge-functions): add shared external API infrastructure

In-memory cache with TTL, retry with exponential backoff,
rate limit tracking, and standardized response format.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Edge Function — `external-holidays` (Nager.Date)

**Files:**
- Create: `supabase/functions/external-holidays/index.ts`

**Step 1: Write the Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { fetchExternalApi } from '../_shared/external-api.ts'
import type { ExternalApiConfig } from '../_shared/external-api.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const NAGER_DATE_CONFIG: ExternalApiConfig = {
  name: 'nager-date',
  baseUrl: 'https://date.nager.at/api/v3',
  cacheTtlSeconds: 30 * 24 * 60 * 60, // 30 days
  maxRetries: 2,
}

interface NagerHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  types: string[]
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { year } = await req.json()
    const targetYear = year || new Date().getFullYear()

    // 1. Check Supabase cache first (persistent across function restarts)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: existing } = await supabase
      .from('brazilian_holidays')
      .select('*')
      .eq('year', targetYear)

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, data: existing, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch from Nager.Date API
    const result = await fetchExternalApi<NagerHoliday[]>(
      NAGER_DATE_CONFIG,
      `/PublicHolidays/${targetYear}/BR`
    )

    if (!result.success || !result.data) {
      // Fallback: try previous year's fixed holidays
      const { data: fallback } = await supabase
        .from('brazilian_holidays')
        .select('*')
        .eq('year', targetYear - 1)

      return new Response(
        JSON.stringify({
          success: true,
          data: fallback || [],
          cached: true,
          fallback: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Persist to Supabase
    const holidays = result.data.map(h => ({
      date: h.date,
      name: h.name,
      local_name: h.localName,
      year: targetYear,
      holiday_type: h.types?.[0] || 'Public',
    }))

    await supabase.from('brazilian_holidays').upsert(holidays, {
      onConflict: 'date,year',
    })

    return new Response(
      JSON.stringify({ success: true, data: holidays, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Step 2: Commit**

```bash
git add supabase/functions/external-holidays/index.ts
git commit -m "feat(edge-functions): add external-holidays for Nager.Date

Fetches Brazilian holidays, caches in Supabase, falls back to
previous year data if API fails.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Edge Function — `external-geolocation` (ipapi.co)

**Files:**
- Create: `supabase/functions/external-geolocation/index.ts`

**Step 1: Write the Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { fetchExternalApi } from '../_shared/external-api.ts'
import type { ExternalApiConfig } from '../_shared/external-api.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const IPAPI_CONFIG: ExternalApiConfig = {
  name: 'ipapi',
  baseUrl: 'https://ipapi.co',
  cacheTtlSeconds: 24 * 60 * 60, // 24 hours
  maxRetries: 1,
  rateLimitPerDay: 900, // buffer below 1K limit
}

interface IpApiResponse {
  ip: string
  city: string
  region: string
  country_code: string
  timezone: string
  latitude: number
  longitude: number
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth required — we save to user profile
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const supabaseAuth = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has location (avoid wasting rate limit)
    const { data: profile } = await supabase
      .from('profiles')
      .select('detected_latitude, detected_longitude, location_source')
      .eq('id', user.id)
      .single()

    if (profile?.detected_latitude && profile?.detected_longitude) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            latitude: profile.detected_latitude,
            longitude: profile.detected_longitude,
            source: profile.location_source,
          },
          cached: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch geolocation from IP
    // Use the client's IP forwarded by Supabase
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const path = clientIp ? `/${clientIp}/json/` : '/json/'

    const result = await fetchExternalApi<IpApiResponse>(IPAPI_CONFIG, path)

    if (!result.success || !result.data) {
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'Geolocation failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save to profile
    const geo = result.data
    await supabase
      .from('profiles')
      .update({
        detected_timezone: geo.timezone,
        detected_city: geo.city,
        detected_latitude: geo.latitude,
        detected_longitude: geo.longitude,
        location_source: 'ipapi',
      })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          timezone: geo.timezone,
          city: geo.city,
          latitude: geo.latitude,
          longitude: geo.longitude,
          source: 'ipapi',
        },
        cached: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Step 2: Commit**

```bash
git add supabase/functions/external-geolocation/index.ts
git commit -m "feat(edge-functions): add external-geolocation for ipapi.co

Detects timezone, city, lat/lng from IP. Saves to user profile.
Skips API call if user already has location data.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Edge Function — `external-weather` (Open-Meteo)

**Files:**
- Create: `supabase/functions/external-weather/index.ts`

**Step 1: Write the Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { fetchExternalApi } from '../_shared/external-api.ts'
import type { ExternalApiConfig } from '../_shared/external-api.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

const OPEN_METEO_CONFIG: ExternalApiConfig = {
  name: 'open-meteo',
  baseUrl: 'https://api.open-meteo.com/v1',
  cacheTtlSeconds: 3 * 60 * 60, // 3 hours
  maxRetries: 2,
  rateLimitPerDay: 9000, // buffer below 10K
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { latitude, longitude, city } = await req.json()

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ success: false, error: 'latitude and longitude required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Check Supabase cache (shared by location)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: cached } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('latitude', latitude)
      .eq('longitude', longitude)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            forecast: cached.forecast_data,
            insight: cached.gemini_insight,
          },
          cached: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch from Open-Meteo
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly: 'temperature_2m,precipitation,weathercode,windspeed_10m',
      forecast_days: '2',
      timezone: 'auto',
    })

    const result = await fetchExternalApi(
      OPEN_METEO_CONFIG,
      `/forecast?${params.toString()}`
    )

    if (!result.success || !result.data) {
      return new Response(
        JSON.stringify({ success: false, error: result.error || 'Weather fetch failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Generate Gemini insight
    let insight = ''
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { maxOutputTokens: 256 },
      })

      const prompt = `Dado os dados climáticos abaixo para ${city || 'a localidade'}, sugira a melhor janela de horário para tarefas ao ar livre nas próximas 24 horas. Seja conciso (1-2 frases), em português brasileiro informal. Inclua temperatura e se vai chover.

Dados: ${JSON.stringify(result.data)}`

      const geminiResult = await model.generateContent(prompt)
      insight = geminiResult.response.text()
    } catch (geminiError) {
      // Gemini failure is non-critical — return weather data without insight
      console.error('Gemini insight failed:', geminiError)
    }

    // 4. Cache in Supabase
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    await supabase.from('weather_cache').upsert(
      {
        latitude,
        longitude,
        forecast_data: result.data,
        gemini_insight: insight || null,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'latitude,longitude' }
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: { forecast: result.data, insight },
        cached: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Step 2: Commit**

```bash
git add supabase/functions/external-weather/index.ts
git commit -m "feat(edge-functions): add external-weather for Open-Meteo

Fetches 48h forecast, generates Gemini insight in PT-BR,
caches 3h in Supabase. Degrades gracefully if Gemini fails.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Edge Function — `external-brasil` (BrasilAPI)

**Files:**
- Create: `supabase/functions/external-brasil/index.ts`

**Step 1: Write the Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { fetchExternalApi } from '../_shared/external-api.ts'
import type { ExternalApiConfig } from '../_shared/external-api.ts'

const BRASIL_API_CONFIGS: Record<string, ExternalApiConfig> = {
  cep: {
    name: 'brasilapi-cep',
    baseUrl: 'https://brasilapi.com.br/api/cep/v2',
    cacheTtlSeconds: 7 * 24 * 60 * 60, // 7 days
    maxRetries: 2,
  },
  cnpj: {
    name: 'brasilapi-cnpj',
    baseUrl: 'https://brasilapi.com.br/api/cnpj/v1',
    cacheTtlSeconds: 24 * 60 * 60, // 24 hours
    maxRetries: 2,
  },
  banks: {
    name: 'brasilapi-banks',
    baseUrl: 'https://brasilapi.com.br/api/banks/v1',
    cacheTtlSeconds: 30 * 24 * 60 * 60, // 30 days
    maxRetries: 2,
  },
  ddd: {
    name: 'brasilapi-ddd',
    baseUrl: 'https://brasilapi.com.br/api/ddd/v1',
    cacheTtlSeconds: 30 * 24 * 60 * 60, // 30 days
    maxRetries: 2,
  },
}

type BrasilApiAction = keyof typeof BRASIL_API_CONFIGS

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, value } = await req.json() as {
      action: BrasilApiAction
      value: string
    }

    const config = BRASIL_API_CONFIGS[action]
    if (!config) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unknown action: ${action}. Valid: ${Object.keys(BRASIL_API_CONFIGS).join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize input
    const sanitized = value.replace(/[^0-9a-zA-Z-]/g, '')
    const path = action === 'banks' ? '' : `/${sanitized}`

    const result = await fetchExternalApi(config, path)

    return new Response(
      JSON.stringify({
        success: result.success,
        data: result.data,
        error: result.error,
        cached: result.cached,
      }),
      {
        status: result.success ? 200 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Step 2: Commit**

```bash
git add supabase/functions/external-brasil/index.ts
git commit -m "feat(edge-functions): add external-brasil for BrasilAPI

Single function handles CEP, CNPJ, banks, DDD lookups
with per-action cache TTLs.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Edge Function — `external-turnstile-verify` (Cloudflare)

**Files:**
- Create: `supabase/functions/external-turnstile-verify/index.ts`

**Step 1: Write the Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const TURNSTILE_SECRET = Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET')!

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

    const formData = new URLSearchParams()
    formData.append('secret', TURNSTILE_SECRET)
    formData.append('response', token)
    if (clientIp) formData.append('remoteip', clientIp)

    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      }
    )

    const result = await verifyResponse.json()

    return new Response(
      JSON.stringify({
        success: result.success === true,
        error: result.success ? undefined : 'Turnstile verification failed',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Fail-open: if Turnstile verification fails, allow through + log
    console.error('[TURNSTILE] Verification error:', error)
    return new Response(
      JSON.stringify({ success: true, fallback: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Step 2: Commit**

```bash
git add supabase/functions/external-turnstile-verify/index.ts
git commit -m "feat(edge-functions): add external-turnstile-verify for Cloudflare

Validates Turnstile CAPTCHA tokens. Fail-open design to never
block legitimate users.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Frontend — ExternalApiClient Singleton

**Files:**
- Create: `src/lib/external-api/types.ts`
- Create: `src/lib/external-api/client.ts`
- Create: `src/lib/external-api/index.ts`

**Step 1: Write types**

```typescript
// src/lib/external-api/types.ts

export type ExternalApiName =
  | 'holidays'
  | 'weather'
  | 'geolocation'
  | 'brasil-cep'
  | 'brasil-cnpj'
  | 'brasil-banks'
  | 'brasil-ddd'
  | 'turnstile-verify'

export interface ExternalApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  cached?: boolean
  fallback?: boolean
}

// ---- API-specific response types ----

export interface HolidayData {
  date: string
  name: string
  local_name: string
  year: number
  holiday_type: string
}

export interface WeatherData {
  forecast: {
    hourly: {
      time: string[]
      temperature_2m: number[]
      precipitation: number[]
      weathercode: number[]
      windspeed_10m: number[]
    }
  }
  insight: string
}

export interface GeolocationData {
  timezone: string
  city: string
  latitude: number
  longitude: number
  source: 'ipapi' | 'browser' | 'cep' | 'manual'
}

export interface CepData {
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  location: {
    type: string
    coordinates: { longitude: string; latitude: string }
  }
}

export interface CnpjData {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  situacao_cadastral: string
  descricao_situacao_cadastral: string
}

export class ExternalApiError extends Error {
  constructor(
    message: string,
    public api: ExternalApiName,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ExternalApiError'
  }
}
```

**Step 2: Write client**

```typescript
// src/lib/external-api/client.ts

import { supabase } from '@/services/supabaseClient'
import type { ExternalApiName, ExternalApiResponse } from './types'
import { ExternalApiError } from './types'

const EDGE_FUNCTION_MAP: Record<ExternalApiName, string> = {
  'holidays': 'external-holidays',
  'weather': 'external-weather',
  'geolocation': 'external-geolocation',
  'brasil-cep': 'external-brasil',
  'brasil-cnpj': 'external-brasil',
  'brasil-banks': 'external-brasil',
  'brasil-ddd': 'external-brasil',
  'turnstile-verify': 'external-turnstile-verify',
}

// Maps api name to BrasilAPI action parameter
const BRASIL_ACTION_MAP: Record<string, string> = {
  'brasil-cep': 'cep',
  'brasil-cnpj': 'cnpj',
  'brasil-banks': 'banks',
  'brasil-ddd': 'ddd',
}

export class ExternalApiClient {
  private static instance: ExternalApiClient

  static getInstance(): ExternalApiClient {
    if (!ExternalApiClient.instance) {
      ExternalApiClient.instance = new ExternalApiClient()
    }
    return ExternalApiClient.instance
  }

  async call<T>(
    api: ExternalApiName,
    params: Record<string, unknown> = {}
  ): Promise<ExternalApiResponse<T>> {
    const functionName = EDGE_FUNCTION_MAP[api]
    if (!functionName) {
      throw new ExternalApiError(`Unknown API: ${api}`, api)
    }

    // Build body — add action for BrasilAPI multi-endpoint
    let body = { ...params }
    const brasilAction = BRASIL_ACTION_MAP[api]
    if (brasilAction) {
      body = { action: brasilAction, value: params.value, ...params }
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    })

    if (error) {
      throw new ExternalApiError(
        error.message || 'Edge function call failed',
        api
      )
    }

    return data as ExternalApiResponse<T>
  }
}

export function useExternalApi() {
  return ExternalApiClient.getInstance()
}
```

**Step 3: Write barrel export**

```typescript
// src/lib/external-api/index.ts

export { ExternalApiClient, useExternalApi } from './client'
export { ExternalApiError } from './types'
export type {
  ExternalApiName,
  ExternalApiResponse,
  HolidayData,
  WeatherData,
  GeolocationData,
  CepData,
  CnpjData,
} from './types'
```

**Step 4: Commit**

```bash
git add src/lib/external-api/
git commit -m "feat(lib): add ExternalApiClient singleton for external APIs

Mirrors GeminiClient pattern. Routes calls to Edge Functions
via supabase.functions.invoke(). Handles BrasilAPI multi-action.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Frontend — Services Layer

**Files:**
- Create: `src/services/holidayService.ts`
- Create: `src/services/weatherService.ts`
- Create: `src/services/geolocationService.ts`
- Create: `src/services/brasilApiService.ts`
- Create: `src/services/turnstileService.ts`

**Step 1: Write holidayService.ts**

```typescript
// src/services/holidayService.ts

import { ExternalApiClient } from '@/lib/external-api'
import type { HolidayData } from '@/lib/external-api'

const client = ExternalApiClient.getInstance()

export async function getHolidays(year?: number): Promise<HolidayData[]> {
  const targetYear = year || new Date().getFullYear()
  const response = await client.call<HolidayData[]>('holidays', { year: targetYear })
  return response.data || []
}

export function isHoliday(date: Date, holidays: HolidayData[]): HolidayData | null {
  const dateStr = date.toISOString().split('T')[0]
  return holidays.find(h => h.date === dateStr) || null
}

export function getNextHoliday(holidays: HolidayData[]): HolidayData | null {
  const today = new Date().toISOString().split('T')[0]
  const upcoming = holidays
    .filter(h => h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  return upcoming[0] || null
}
```

**Step 2: Write weatherService.ts**

```typescript
// src/services/weatherService.ts

import { ExternalApiClient } from '@/lib/external-api'
import type { WeatherData } from '@/lib/external-api'

const client = ExternalApiClient.getInstance()

export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  city?: string
): Promise<WeatherData | null> {
  const response = await client.call<WeatherData>('weather', {
    latitude,
    longitude,
    city,
  })
  return response.data || null
}
```

**Step 3: Write geolocationService.ts**

```typescript
// src/services/geolocationService.ts

import { ExternalApiClient } from '@/lib/external-api'
import type { GeolocationData } from '@/lib/external-api'
import { supabase } from '@/services/supabaseClient'

const client = ExternalApiClient.getInstance()

/** Auto-detect via ipapi.co (Edge Function) */
export async function detectLocationFromIp(): Promise<GeolocationData | null> {
  const response = await client.call<GeolocationData>('geolocation')
  return response.data || null
}

/** Detect via browser Geolocation API */
export function detectLocationFromBrowser(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: false }
    )
  })
}

/** Save manually-selected location to profile */
export async function saveManualLocation(
  userId: string,
  data: {
    city: string
    latitude: number
    longitude: number
    timezone?: string
    source: 'browser' | 'cep' | 'manual'
  }
): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      detected_city: data.city,
      detected_latitude: data.latitude,
      detected_longitude: data.longitude,
      detected_timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      location_source: data.source,
    })
    .eq('id', userId)
}
```

**Step 4: Write brasilApiService.ts**

```typescript
// src/services/brasilApiService.ts

import { ExternalApiClient } from '@/lib/external-api'
import type { CepData, CnpjData } from '@/lib/external-api'

const client = ExternalApiClient.getInstance()

export async function lookupCEP(cep: string): Promise<CepData | null> {
  const sanitized = cep.replace(/\D/g, '')
  if (sanitized.length !== 8) return null

  const response = await client.call<CepData>('brasil-cep', { value: sanitized })
  return response.data || null
}

export async function lookupCNPJ(cnpj: string): Promise<CnpjData | null> {
  const sanitized = cnpj.replace(/\D/g, '')
  if (sanitized.length !== 14) return null

  const response = await client.call<CnpjData>('brasil-cnpj', { value: sanitized })
  return response.data || null
}

export async function listBanks(): Promise<unknown[]> {
  const response = await client.call<unknown[]>('brasil-banks', { value: '' })
  return response.data || []
}
```

**Step 5: Write turnstileService.ts**

```typescript
// src/services/turnstileService.ts

import { ExternalApiClient } from '@/lib/external-api'

const client = ExternalApiClient.getInstance()

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const response = await client.call<{ success: boolean }>('turnstile-verify', { token })
    return response.success
  } catch {
    // Fail-open: if verification fails, allow through
    console.warn('[Turnstile] Verification failed, allowing through')
    return true
  }
}
```

**Step 6: Commit**

```bash
git add src/services/holidayService.ts src/services/weatherService.ts \
  src/services/geolocationService.ts src/services/brasilApiService.ts \
  src/services/turnstileService.ts
git commit -m "feat(services): add 5 external API service layers

holidayService, weatherService, geolocationService,
brasilApiService, turnstileService — all using ExternalApiClient.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Frontend — React Query Hooks

**Files:**
- Create: `src/hooks/useHolidays.ts`
- Create: `src/hooks/useWeatherInsight.ts`
- Create: `src/hooks/useUserLocation.ts`
- Create: `src/hooks/useBrasilApi.ts`

**Step 1: Write useHolidays.ts**

```typescript
// src/hooks/useHolidays.ts

import { useQuery } from '@tanstack/react-query'
import { getHolidays, isHoliday, getNextHoliday } from '@/services/holidayService'
import type { HolidayData } from '@/lib/external-api'

export function useHolidays(year?: number) {
  const targetYear = year || new Date().getFullYear()

  const { data: holidays = [], isLoading, error } = useQuery({
    queryKey: ['holidays', targetYear],
    queryFn: () => getHolidays(targetYear),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  return {
    holidays,
    isLoading,
    error,
    isHoliday: (date: Date) => isHoliday(date, holidays),
    nextHoliday: getNextHoliday(holidays),
  }
}
```

**Step 2: Write useUserLocation.ts**

```typescript
// src/hooks/useUserLocation.ts

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabaseClient'
import { detectLocationFromIp } from '@/services/geolocationService'

interface UserLocation {
  latitude: number
  longitude: number
  city: string
  timezone: string
  source: string
}

async function fetchUserLocation(userId: string): Promise<UserLocation | null> {
  // 1. Check profile first
  const { data: profile } = await supabase
    .from('profiles')
    .select('detected_latitude, detected_longitude, detected_city, detected_timezone, location_source')
    .eq('id', userId)
    .single()

  if (profile?.detected_latitude && profile?.detected_longitude) {
    return {
      latitude: profile.detected_latitude,
      longitude: profile.detected_longitude,
      city: profile.detected_city || '',
      timezone: profile.detected_timezone || '',
      source: profile.location_source || 'unknown',
    }
  }

  // 2. Auto-detect via ipapi.co
  const geo = await detectLocationFromIp()
  if (geo) {
    return {
      latitude: geo.latitude,
      longitude: geo.longitude,
      city: geo.city,
      timezone: geo.timezone,
      source: geo.source,
    }
  }

  return null
}

export function useUserLocation() {
  const { user } = useAuth()

  const { data: location, isLoading, error } = useQuery({
    queryKey: ['user-location', user?.id],
    queryFn: () => fetchUserLocation(user!.id),
    enabled: !!user?.id,
    staleTime: 24 * 60 * 60 * 1000, // 24h — location rarely changes
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
  })

  return {
    location,
    hasLocation: !!location,
    isLoading,
    error,
  }
}
```

**Step 3: Write useWeatherInsight.ts**

```typescript
// src/hooks/useWeatherInsight.ts

import { useQuery } from '@tanstack/react-query'
import { getWeatherForecast } from '@/services/weatherService'
import { useUserLocation } from './useUserLocation'
import type { WeatherData } from '@/lib/external-api'

export function useWeatherInsight() {
  const { location, hasLocation, isLoading: locationLoading } = useUserLocation()

  const { data: weather, isLoading: weatherLoading, error } = useQuery({
    queryKey: ['weather-insight', location?.latitude, location?.longitude],
    queryFn: () =>
      getWeatherForecast(location!.latitude, location!.longitude, location!.city),
    enabled: hasLocation,
    staleTime: 30 * 60 * 1000, // 30 min client-side
    gcTime: 3 * 60 * 60 * 1000, // 3h
    retry: 1,
  })

  return {
    weather,
    insight: weather?.insight || null,
    hasLocation,
    isLoading: locationLoading || weatherLoading,
    error,
  }
}
```

**Step 4: Write useBrasilApi.ts**

```typescript
// src/hooks/useBrasilApi.ts

import { useQuery } from '@tanstack/react-query'
import { lookupCEP, lookupCNPJ } from '@/services/brasilApiService'
import type { CepData, CnpjData } from '@/lib/external-api'

export function useCEPLookup(cep: string | null) {
  const sanitized = cep?.replace(/\D/g, '') || ''

  return useQuery({
    queryKey: ['cep', sanitized],
    queryFn: () => lookupCEP(sanitized),
    enabled: sanitized.length === 8,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    gcTime: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
}

export function useCNPJLookup(cnpj: string | null) {
  const sanitized = cnpj?.replace(/\D/g, '') || ''

  return useQuery({
    queryKey: ['cnpj', sanitized],
    queryFn: () => lookupCNPJ(sanitized),
    enabled: sanitized.length === 14,
    staleTime: 24 * 60 * 60 * 1000, // 24h
    gcTime: 7 * 24 * 60 * 60 * 1000,
  })
}
```

**Step 5: Commit**

```bash
git add src/hooks/useHolidays.ts src/hooks/useWeatherInsight.ts \
  src/hooks/useUserLocation.ts src/hooks/useBrasilApi.ts
git commit -m "feat(hooks): add React Query hooks for external APIs

useHolidays, useWeatherInsight, useUserLocation, useBrasilApi
with appropriate staleTime/gcTime for each data type.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Frontend — WeatherInsightCard Component

**Files:**
- Create: `src/modules/atlas/components/WeatherInsightCard.tsx`
- Create: `src/modules/atlas/components/LocationConnectModal.tsx`
- Modify: `src/modules/atlas/components/index.ts` — add exports

**Step 1: Write WeatherInsightCard.tsx**

```tsx
// src/modules/atlas/components/WeatherInsightCard.tsx

import { Cloud, Sun, CloudRain, MapPin, Loader2 } from 'lucide-react'
import { useWeatherInsight } from '@/hooks/useWeatherInsight'
import { useState } from 'react'
import { LocationConnectModal } from './LocationConnectModal'

const WEATHER_ICONS: Record<number, typeof Sun> = {
  0: Sun,       // Clear sky
  1: Sun,       // Mainly clear
  2: Cloud,     // Partly cloudy
  3: Cloud,     // Overcast
  61: CloudRain, // Rain slight
  63: CloudRain, // Rain moderate
  65: CloudRain, // Rain heavy
}

function getWeatherIcon(code?: number) {
  if (!code && code !== 0) return Cloud
  return WEATHER_ICONS[code] || Cloud
}

function getCurrentTemp(forecast: any): number | null {
  if (!forecast?.hourly?.temperature_2m) return null
  const now = new Date()
  const currentHour = now.getHours()
  return Math.round(forecast.hourly.temperature_2m[currentHour] ?? 0)
}

function getCurrentWeatherCode(forecast: any): number | undefined {
  if (!forecast?.hourly?.weathercode) return undefined
  const currentHour = new Date().getHours()
  return forecast.hourly.weathercode[currentHour]
}

export function WeatherInsightCard() {
  const { weather, insight, hasLocation, isLoading } = useWeatherInsight()
  const [showModal, setShowModal] = useState(false)

  // State: Loading
  if (isLoading) {
    return (
      <div className="bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss animate-pulse">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin" />
          <div className="h-4 bg-ceramic-cool rounded w-48" />
        </div>
      </div>
    )
  }

  // State: Connect (no location)
  if (!hasLocation) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss
            hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-ceramic-text-primary text-sm font-medium">
                Ative sua localização para insights de clima
              </p>
              <p className="text-ceramic-text-secondary text-xs mt-0.5
                group-hover:text-amber-600 transition-colors">
                Conectar →
              </p>
            </div>
          </div>
        </button>
        {showModal && <LocationConnectModal onClose={() => setShowModal(false)} />}
      </>
    )
  }

  // State: Error (has location but no weather) — silently hidden
  if (!weather) return null

  // State: Complete
  const temp = getCurrentTemp(weather.forecast)
  const weatherCode = getCurrentWeatherCode(weather.forecast)
  const WeatherIcon = getWeatherIcon(weatherCode)

  return (
    <div className="bg-ceramic-50 rounded-xl p-4 shadow-ceramic-emboss">
      <div className="flex items-start gap-3">
        <WeatherIcon className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
        <div>
          {temp !== null && (
            <p className="text-ceramic-text-primary text-sm font-medium">
              {temp}°C
            </p>
          )}
          {insight && (
            <p className="text-ceramic-text-secondary text-sm mt-1">
              {insight}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Write LocationConnectModal.tsx**

```tsx
// src/modules/atlas/components/LocationConnectModal.tsx

import { X, Navigation, MapPin, Building2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { detectLocationFromBrowser, saveManualLocation } from '@/services/geolocationService'
import { lookupCEP } from '@/services/brasilApiService'
import { useQueryClient } from '@tanstack/react-query'

// Major Brazilian cities with coordinates
const BRAZILIAN_CAPITALS = [
  { city: 'São Paulo', lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo' },
  { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, tz: 'America/Sao_Paulo' },
  { city: 'Brasília', lat: -15.7975, lng: -47.8919, tz: 'America/Sao_Paulo' },
  { city: 'Belo Horizonte', lat: -19.9167, lng: -43.9345, tz: 'America/Sao_Paulo' },
  { city: 'Salvador', lat: -12.9714, lng: -38.5124, tz: 'America/Bahia' },
  { city: 'Curitiba', lat: -25.4297, lng: -49.2711, tz: 'America/Sao_Paulo' },
  { city: 'Recife', lat: -8.0476, lng: -34.877, tz: 'America/Recife' },
  { city: 'Porto Alegre', lat: -30.0346, lng: -51.2177, tz: 'America/Sao_Paulo' },
  { city: 'Fortaleza', lat: -3.7172, lng: -38.5433, tz: 'America/Fortaleza' },
  { city: 'Manaus', lat: -3.119, lng: -60.0217, tz: 'America/Manaus' },
  { city: 'Belém', lat: -1.4558, lng: -48.5024, tz: 'America/Belem' },
  { city: 'Goiânia', lat: -16.6869, lng: -49.2648, tz: 'America/Sao_Paulo' },
]

interface LocationConnectModalProps {
  onClose: () => void
}

export function LocationConnectModal({ onClose }: LocationConnectModalProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [cep, setCep] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'auto' | 'cep' | 'city'>('auto')

  async function handleAutoDetect() {
    setLoading(true)
    setError(null)
    try {
      const coords = await detectLocationFromBrowser()
      if (!coords) {
        setError('Não foi possível detectar sua localização. Tente outro método.')
        return
      }
      await saveManualLocation(user!.id, {
        city: '',
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: 'browser',
      })
      queryClient.invalidateQueries({ queryKey: ['user-location'] })
      onClose()
    } catch {
      setError('Erro ao salvar localização.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCepLookup() {
    setLoading(true)
    setError(null)
    try {
      const data = await lookupCEP(cep)
      if (!data) {
        setError('CEP não encontrado.')
        return
      }
      const lat = parseFloat(data.location?.coordinates?.latitude || '0')
      const lng = parseFloat(data.location?.coordinates?.longitude || '0')

      if (!lat || !lng) {
        setError('CEP encontrado mas sem coordenadas. Tente selecionar a cidade.')
        return
      }
      await saveManualLocation(user!.id, {
        city: data.city,
        latitude: lat,
        longitude: lng,
        source: 'cep',
      })
      queryClient.invalidateQueries({ queryKey: ['user-location'] })
      onClose()
    } catch {
      setError('Erro ao buscar CEP.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCitySelect(city: typeof BRAZILIAN_CAPITALS[0]) {
    setLoading(true)
    setError(null)
    try {
      await saveManualLocation(user!.id, {
        city: city.city,
        latitude: city.lat,
        longitude: city.lng,
        timezone: city.tz,
        source: 'manual',
      })
      queryClient.invalidateQueries({ queryKey: ['user-location'] })
      onClose()
    } catch {
      setError('Erro ao salvar localização.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ceramic-base rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-ceramic-text-primary font-medium">Conectar localização</h3>
          <button onClick={onClose} className="text-ceramic-text-secondary hover:text-ceramic-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-ceramic-cool rounded-lg p-1">
          {[
            { id: 'auto' as const, label: 'Detectar', icon: Navigation },
            { id: 'cep' as const, label: 'CEP', icon: MapPin },
            { id: 'city' as const, label: 'Cidade', icon: Building2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                tab === id
                  ? 'bg-ceramic-base text-ceramic-text-primary shadow-sm'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'auto' && (
          <div className="space-y-3">
            <p className="text-ceramic-text-secondary text-sm">
              Seu navegador vai pedir permissão para acessar a localização.
            </p>
            <button
              onClick={handleAutoDetect}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50
                text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? 'Detectando...' : 'Detectar automaticamente'}
            </button>
          </div>
        )}

        {tab === 'cep' && (
          <div className="space-y-3">
            <input
              type="text"
              value={cep}
              onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Digite seu CEP (ex: 01310100)"
              className="w-full border border-ceramic-border rounded-lg px-3 py-2.5
                text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary
                focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              onClick={handleCepLookup}
              disabled={loading || cep.length !== 8}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50
                text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? 'Buscando...' : 'Buscar CEP'}
            </button>
          </div>
        )}

        {tab === 'city' && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {BRAZILIAN_CAPITALS.map((city) => (
              <button
                key={city.city}
                onClick={() => handleCitySelect(city)}
                disabled={loading}
                className="w-full text-left px-3 py-2 rounded-lg text-sm
                  text-ceramic-text-primary hover:bg-ceramic-cool transition-colors"
              >
                {city.city}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-ceramic-error text-xs mt-3">{error}</p>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Update atlas components barrel**

Add to `src/modules/atlas/components/index.ts`:
```typescript
export { WeatherInsightCard } from './WeatherInsightCard'
export { LocationConnectModal } from './LocationConnectModal'
```

**Step 4: Commit**

```bash
git add src/modules/atlas/components/WeatherInsightCard.tsx \
  src/modules/atlas/components/LocationConnectModal.tsx \
  src/modules/atlas/components/index.ts
git commit -m "feat(atlas): add WeatherInsightCard with 3-state UX

Complete/Connect/Error states. LocationConnectModal with
auto-detect, CEP lookup, and city selection fallbacks.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Frontend — HolidayBadge Component + Integration

**Files:**
- Create: `src/modules/atlas/components/HolidayBadge.tsx`
- Modify: `src/modules/atlas/components/index.ts` — add export

**Step 1: Write HolidayBadge.tsx**

```tsx
// src/modules/atlas/components/HolidayBadge.tsx

import { useHolidays } from '@/hooks/useHolidays'

interface HolidayBadgeProps {
  date: Date | string
}

export function HolidayBadge({ date }: HolidayBadgeProps) {
  const { isHoliday } = useHolidays()
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const holiday = isHoliday(dateObj)

  if (!holiday) return null

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
      bg-amber-100 text-amber-800 text-xs font-medium">
      🎌 {holiday.local_name || holiday.name}
    </span>
  )
}
```

**Step 2: Update barrel**

Add to `src/modules/atlas/components/index.ts`:
```typescript
export { HolidayBadge } from './HolidayBadge'
```

**Step 3: Commit**

```bash
git add src/modules/atlas/components/HolidayBadge.tsx \
  src/modules/atlas/components/index.ts
git commit -m "feat(atlas): add HolidayBadge component for work items

Shows holiday name pill when task date falls on a Brazilian holiday.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Unit Tests — Shared Infrastructure + Services

**Files:**
- Create: `src/lib/external-api/__tests__/client.test.ts`
- Create: `src/services/__tests__/holidayService.test.ts`
- Create: `src/hooks/__tests__/useHolidays.test.ts`

**Step 1: Write client test**

```typescript
// src/lib/external-api/__tests__/client.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExternalApiClient } from '../client'

// Mock supabase
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { supabase } from '@/services/supabaseClient'

describe('ExternalApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is a singleton', () => {
    const a = ExternalApiClient.getInstance()
    const b = ExternalApiClient.getInstance()
    expect(a).toBe(b)
  })

  it('routes holidays to external-holidays Edge Function', async () => {
    const mockResponse = { success: true, data: [{ date: '2026-04-21', name: 'Tiradentes' }] }
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: mockResponse, error: null })

    const client = ExternalApiClient.getInstance()
    const result = await client.call('holidays', { year: 2026 })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('external-holidays', {
      body: { year: 2026 },
    })
    expect(result.success).toBe(true)
  })

  it('routes brasil-cep to external-brasil with action param', async () => {
    const mockResponse = { success: true, data: { cep: '01310100', city: 'São Paulo' } }
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: mockResponse, error: null })

    const client = ExternalApiClient.getInstance()
    await client.call('brasil-cep', { value: '01310100' })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('external-brasil', {
      body: expect.objectContaining({ action: 'cep', value: '01310100' }),
    })
  })

  it('throws ExternalApiError on Edge Function error', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: { message: 'Function not found' },
    })

    const client = ExternalApiClient.getInstance()
    await expect(client.call('holidays', {})).rejects.toThrow('Function not found')
  })
})
```

**Step 2: Write holidayService test**

```typescript
// src/services/__tests__/holidayService.test.ts

import { describe, it, expect, vi } from 'vitest'
import { isHoliday, getNextHoliday } from '../holidayService'
import type { HolidayData } from '@/lib/external-api'

const mockHolidays: HolidayData[] = [
  { date: '2026-01-01', name: "New Year's Day", local_name: 'Confraternização Universal', year: 2026, holiday_type: 'Public' },
  { date: '2026-04-21', name: 'Tiradentes', local_name: 'Tiradentes', year: 2026, holiday_type: 'Public' },
  { date: '2026-09-07', name: 'Independence Day', local_name: 'Independência do Brasil', year: 2026, holiday_type: 'Public' },
  { date: '2026-12-25', name: 'Christmas Day', local_name: 'Natal', year: 2026, holiday_type: 'Public' },
]

describe('holidayService', () => {
  describe('isHoliday', () => {
    it('returns holiday data when date is a holiday', () => {
      const result = isHoliday(new Date('2026-04-21'), mockHolidays)
      expect(result).not.toBeNull()
      expect(result!.local_name).toBe('Tiradentes')
    })

    it('returns null when date is not a holiday', () => {
      const result = isHoliday(new Date('2026-04-22'), mockHolidays)
      expect(result).toBeNull()
    })
  })

  describe('getNextHoliday', () => {
    it('returns next upcoming holiday', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-01'))

      const result = getNextHoliday(mockHolidays)
      expect(result).not.toBeNull()
      expect(result!.local_name).toBe('Tiradentes')

      vi.useRealTimers()
    })
  })
})
```

**Step 3: Run tests**

Run: `npm run test -- --run src/lib/external-api/__tests__/ src/services/__tests__/holidayService.test.ts`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/lib/external-api/__tests__/ src/services/__tests__/holidayService.test.ts
git commit -m "test: add unit tests for ExternalApiClient and holidayService

Client singleton, routing, error handling, isHoliday, getNextHoliday.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Build Verification + TypeCheck

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: Zero errors.

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Run all tests**

Run: `npm run test -- --run`
Expected: All tests pass, no regressions.

**Step 4: Fix any issues found, commit**

If issues found, fix and commit:
```bash
git commit -m "fix: resolve typecheck/build issues from API integration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task Dependency Graph

```
Task 1 (DB migration)
    ↓
Task 2 (_shared/external-api.ts)
    ↓
┌───┬───┬───┬───┐
│ T3│ T4│ T5│ T6│ T7  (Edge Functions — independent)
└───┴───┴───┴───┘
        ↓
    Task 8 (ExternalApiClient)
        ↓
    Task 9 (Services)
        ↓
    Task 10 (Hooks)
        ↓
  ┌─────┴─────┐
  │ T11       │ T12  (Components — independent)
  └─────┬─────┘
        ↓
    Task 13 (Tests)
        ↓
    Task 14 (Build verify)
```

---

## Agent Team Composition (Recommended)

```
Lead: Coordinator — breaks tasks, reviews, synthesizes
Teammate 1 (Backend): Tasks 1-7 (migration + all Edge Functions)
Teammate 2 (Frontend): Tasks 8-12 (client, services, hooks, components)
Teammate 3 (Quality): Tasks 13-14 (tests, typecheck, build verify)
```

Teammate 2 is blocked by Task 2 (shared infra) and Task 8 depends on Edge Functions existing.
Teammate 3 is blocked by Teammates 1 + 2 completing.
