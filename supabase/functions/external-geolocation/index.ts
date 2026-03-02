/**
 * External Geolocation Edge Function — ipapi.co
 *
 * Resolves user location (timezone, city, lat/lng) from IP address.
 * Caches result in user's profile to avoid redundant lookups.
 *
 * @endpoint POST /external-geolocation
 * @auth Required (JWT)
 * @returns { success, data: { timezone, city, latitude, longitude, source } }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { fetchExternalApi } from '../_shared/external-api.ts';
import type { ExternalApiConfig, ExternalApiResponse } from '../_shared/external-api.ts';

const TAG = '[external-geolocation]';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const GEO_CONFIG: ExternalApiConfig = {
  name: 'ipapi',
  baseUrl: 'https://ipapi.co',
  cacheTtlSeconds: 86400, // 24 hours
  maxRetries: 1,
  rateLimitPerDay: 900,
};

interface IpApiResponse {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  error?: boolean;
  reason?: string;
}

interface GeoData {
  timezone: string;
  city: string;
  latitude: number;
  longitude: number;
  source: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // 1. Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: jsonHeaders },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user token' }),
        { status: 401, headers: jsonHeaders },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Check if user already has geo data in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone, city, latitude, longitude, geo_source')
      .eq('id', user.id)
      .single();

    if (profile?.latitude && profile?.longitude && profile?.timezone) {
      console.log(TAG, `Returning cached geo data for user ${user.id}`);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            timezone: profile.timezone,
            city: profile.city,
            latitude: profile.latitude,
            longitude: profile.longitude,
            source: profile.geo_source || 'cached',
          } as GeoData,
          source: 'ipapi',
          cached: true,
          latencyMs: 0,
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    // 3. Resolve client IP from x-forwarded-for
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : '';

    // 4. Fetch from ipapi.co
    const path = clientIp ? `/${clientIp}/json/` : '/json/';
    const apiResult: ExternalApiResponse<IpApiResponse> = await fetchExternalApi<IpApiResponse>(
      GEO_CONFIG,
      path,
      { cacheKey: `geo:${user.id}` },
    );

    if (!apiResult.success || !apiResult.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: apiResult.error || 'Failed to resolve geolocation',
          source: 'ipapi',
          cached: false,
          latencyMs: apiResult.latencyMs,
        }),
        { status: 502, headers: jsonHeaders },
      );
    }

    const geo = apiResult.data;

    // ipapi returns error as part of the JSON body
    if (geo.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: geo.reason || 'ipapi returned an error',
          source: 'ipapi',
          cached: false,
          latencyMs: apiResult.latencyMs,
        }),
        { status: 502, headers: jsonHeaders },
      );
    }

    // 5. Save to profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        timezone: geo.timezone,
        city: geo.city,
        latitude: geo.latitude,
        longitude: geo.longitude,
        geo_source: 'ipapi',
      })
      .eq('id', user.id);

    if (updateError) {
      console.warn(TAG, `Failed to update profile geo data: ${updateError.message}`);
    } else {
      console.log(TAG, `Saved geo data for user ${user.id}: ${geo.city}, ${geo.timezone}`);
    }

    const result: GeoData = {
      timezone: geo.timezone,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      source: 'ipapi',
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        source: 'ipapi',
        cached: false,
        latencyMs: apiResult.latencyMs,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(TAG, 'Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
