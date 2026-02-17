// ============================================================================
// EDGE FUNCTION: fetch-athlete-calendar
// Description: Coach fetches athlete's Google Calendar free/busy blocks
// Uses FreeBusy API (privacy-safe: no event titles, only busy intervals)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dev.aica.guru',
  'https://aica.guru',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// ============================================================================
// TYPES
// ============================================================================

interface FetchAthleteCalendarRequest {
  athleteId: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
}

interface BusySlot {
  start: string;
  end: string;
}

// ============================================================================
// GOOGLE TOKEN REFRESH
// ============================================================================

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[fetch-athlete-calendar] Token refresh failed:', error);
    throw new Error(`Token refresh failed: ${error.error_description || error.error || 'unknown'}`);
  }

  const tokens = await response.json();
  return tokens.access_token;
}

// ============================================================================
// GOOGLE CALENDAR FREEBUSY
// ============================================================================

async function fetchFreeBusy(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<BusySlot[]> {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: 'America/Sao_Paulo',
      items: [{ id: calendarId }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[fetch-athlete-calendar] FreeBusy API error:', error);
    throw new Error(`FreeBusy API error: ${error.error?.message || response.status}`);
  }

  const data = await response.json();
  const calendarBusy = data.calendars?.[calendarId]?.busy || [];

  return calendarBusy.map((slot: { start: string; end: string }) => ({
    start: slot.start,
    end: slot.end,
  }));
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Validate JWT — coach must be authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create an authenticated client to get the caller's user ID
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coachUserId = user.id;

    // 2. Parse and validate request body
    const body: FetchAthleteCalendarRequest = await req.json();
    const { athleteId, startDate, endDate } = body;

    if (!athleteId || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: athleteId, startDate, endDate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date range (max 31 days)
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid date format. Use ISO 8601.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (end.getTime() - start.getTime() > 31 * 24 * 60 * 60 * 1000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Date range cannot exceed 31 days' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Service role client to bypass RLS for cross-user reads
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Verify coach-athlete relationship: athletes.user_id = coach AND athletes.id = athleteId
    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from('athletes')
      .select('id, auth_user_id, name')
      .eq('id', athleteId)
      .eq('user_id', coachUserId)
      .single();

    if (athleteError || !athlete) {
      console.error('[fetch-athlete-calendar] Relationship check failed:', athleteError);
      return new Response(
        JSON.stringify({ success: false, error: 'Athlete not found or you are not their coach' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!athlete.auth_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Athlete has not linked their account yet' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Read athlete's calendar tokens (service role bypasses RLS)
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('google_calendar_tokens')
      .select('refresh_token, email, is_connected')
      .eq('user_id', athlete.auth_user_id)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ success: false, error: 'Athlete has not connected Google Calendar' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenRow.is_connected || !tokenRow.refresh_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Athlete calendar connection is inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Refresh access token
    const accessToken = await refreshAccessToken(tokenRow.refresh_token);

    // 7. Fetch FreeBusy data (privacy-safe: only busy blocks, no event titles)
    const calendarId = tokenRow.email || 'primary';
    const busySlots = await fetchFreeBusy(accessToken, calendarId, startDate, endDate);

    console.log(`[fetch-athlete-calendar] Coach ${coachUserId} fetched ${busySlots.length} busy slots for athlete ${athleteId}`);

    return new Response(
      JSON.stringify({
        success: true,
        athleteId,
        athleteName: athlete.name,
        busySlots,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-athlete-calendar] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
