/**
 * External Holidays Edge Function — Nager.Date API
 *
 * Fetches Brazilian public holidays for a given year.
 * Uses DB-level caching (brazilian_holidays table) with Nager.Date as source.
 * Falls back to previous year's data if API is unreachable.
 *
 * @endpoint POST /external-holidays
 * @body { year?: number } — defaults to current year
 * @returns { success, data: HolidayData[], cached }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { fetchExternalApi } from '../_shared/external-api.ts';
import type { ExternalApiConfig, ExternalApiResponse } from '../_shared/external-api.ts';

const TAG = '[external-holidays]';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const HOLIDAYS_CONFIG: ExternalApiConfig = {
  name: 'nager-date',
  baseUrl: 'https://date.nager.at/api/v3',
  cacheTtlSeconds: 2592000, // 30 days
  maxRetries: 2,
};

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

interface HolidayData {
  date: string;
  localName: string;
  name: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // Parse request
    let year: number;
    try {
      const body = await req.json();
      year = body.year || new Date().getFullYear();
    } catch {
      year = new Date().getFullYear();
    }

    // Validate year
    if (year < 2000 || year > 2100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Year must be between 2000 and 2100' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Check DB cache first
    const { data: dbHolidays, error: dbError } = await supabase
      .from('brazilian_holidays')
      .select('date, local_name, name, fixed, global, types')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);

    if (!dbError && dbHolidays && dbHolidays.length > 0) {
      console.log(TAG, `Returning ${dbHolidays.length} cached holidays for ${year} from DB`);
      return new Response(
        JSON.stringify({
          success: true,
          data: dbHolidays.map((h) => ({
            date: h.date,
            localName: h.local_name,
            name: h.name,
            fixed: h.fixed,
            global: h.global,
            types: h.types,
          })),
          source: 'nager-date',
          cached: true,
          latencyMs: 0,
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    // 2. Fetch from Nager.Date API
    const apiResult: ExternalApiResponse<NagerHoliday[]> = await fetchExternalApi<NagerHoliday[]>(
      HOLIDAYS_CONFIG,
      `/PublicHolidays/${year}/BR`,
    );

    if (apiResult.success && apiResult.data) {
      // 3. Persist to DB via upsert
      const rows = apiResult.data.map((h) => ({
        date: h.date,
        local_name: h.localName,
        name: h.name,
        country_code: 'BR',
        fixed: h.fixed,
        global: h.global,
        types: h.types,
        year,
      }));

      const { error: upsertError } = await supabase
        .from('brazilian_holidays')
        .upsert(rows, { onConflict: 'date,country_code' });

      if (upsertError) {
        console.warn(TAG, `Failed to cache holidays in DB: ${upsertError.message}`);
      } else {
        console.log(TAG, `Cached ${rows.length} holidays for ${year} in DB`);
      }

      const holidays: HolidayData[] = apiResult.data.map((h) => ({
        date: h.date,
        localName: h.localName,
        name: h.name,
        fixed: h.fixed,
        global: h.global,
        types: h.types,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          data: holidays,
          source: apiResult.source,
          cached: false,
          latencyMs: apiResult.latencyMs,
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    // 4. Fallback: try previous year's holidays from DB
    console.warn(TAG, `API failed for ${year}, trying fallback from previous year`);
    const prevYear = year - 1;
    const { data: fallbackHolidays } = await supabase
      .from('brazilian_holidays')
      .select('date, local_name, name, fixed, global, types')
      .gte('date', `${prevYear}-01-01`)
      .lte('date', `${prevYear}-12-31`);

    if (fallbackHolidays && fallbackHolidays.length > 0) {
      // Adjust dates to requested year
      const adjusted: HolidayData[] = fallbackHolidays.map((h) => ({
        date: h.date.replace(String(prevYear), String(year)),
        localName: h.local_name,
        name: h.name,
        fixed: h.fixed,
        global: h.global,
        types: h.types,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          data: adjusted,
          source: 'nager-date',
          cached: true,
          latencyMs: 0,
          warning: `Using adjusted holidays from ${prevYear} (API unavailable)`,
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    // No fallback available
    return new Response(
      JSON.stringify({
        success: false,
        error: apiResult.error || 'Failed to fetch holidays and no cached data available',
        source: 'nager-date',
        cached: false,
        latencyMs: apiResult.latencyMs,
      }),
      { status: 502, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(TAG, 'Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
