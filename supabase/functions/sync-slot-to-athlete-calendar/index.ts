import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

const ALLOWED_ORIGINS = ['https://aica.guru', 'https://dev.aica.guru', 'http://localhost:5173', 'http://localhost:3000'];
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const MAX_BATCH_SIZE = 50;

interface SlotSyncRequest {
  slotId: string;
  action: 'sync' | 'delete';
  eventData?: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  };
}

interface RequestBody {
  athleteId: string;
  slots: SlotSyncRequest[];
}

// --- Token refresh (reuses fetch-athlete-calendar pattern) ---

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

// --- Google Calendar CRUD ---

async function createGoogleEvent(
  accessToken: string,
  eventData: SlotSyncRequest['eventData']
): Promise<string> {
  const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...eventData,
      colorId: '7',
      extendedProperties: { private: { aica_module: 'flux' } },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Calendar create failed (${response.status}): ${err}`);
  }

  const created = await response.json();
  return created.id;
}

async function updateGoogleEvent(
  accessToken: string,
  googleEventId: string,
  eventData: SlotSyncRequest['eventData']
): Promise<void> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok && response.status !== 404) {
    const err = await response.text();
    throw new Error(`Google Calendar update failed (${response.status}): ${err}`);
  }
}

async function deleteGoogleEvent(
  accessToken: string,
  googleEventId: string
): Promise<void> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  // 404/410 = already gone — OK to ignore
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const err = await response.text();
    throw new Error(`Google Calendar delete failed (${response.status}): ${err}`);
  }
}

// --- Main handler ---

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate coach
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const coachUserId = user.id;

    // 2. Parse request
    const body: RequestBody = await req.json();
    const { athleteId, slots } = body;

    if (!athleteId || !slots || !Array.isArray(slots)) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (slots.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: 'batch_too_large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify coach-athlete relationship (service role bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from('athletes')
      .select('id, auth_user_id, name')
      .eq('id', athleteId)
      .eq('user_id', coachUserId)
      .single();

    if (athleteError || !athlete) {
      return new Response(
        JSON.stringify({ success: false, error: 'forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check athlete has AICA account
    if (!athlete.auth_user_id) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'not_linked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Get athlete's Google Calendar token
    const { data: tokenRow } = await supabaseAdmin
      .from('google_calendar_tokens')
      .select('refresh_token, is_connected')
      .eq('user_id', athlete.auth_user_id)
      .single();

    if (!tokenRow?.refresh_token || !tokenRow.is_connected) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'no_token' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Refresh athlete's access token
    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(tokenRow.refresh_token);
    } catch (err) {
      console.error('[sync-slot-to-athlete-calendar] Token refresh failed:', err);
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'token_expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Process each slot
    let synced = 0;
    let skipped = 0;

    for (const slot of slots) {
      try {
        if (slot.action === 'sync' && slot.eventData) {
          // Check existing mapping
          const { data: existing } = await supabaseAdmin
            .from('calendar_sync_map')
            .select('google_event_id')
            .eq('user_id', athlete.auth_user_id)
            .eq('module', 'flux')
            .eq('entity_id', slot.slotId)
            .maybeSingle();

          let googleEventId: string;

          if (existing?.google_event_id) {
            // Update existing event
            await updateGoogleEvent(accessToken, existing.google_event_id, slot.eventData);
            googleEventId = existing.google_event_id;
          } else {
            // Create new event
            googleEventId = await createGoogleEvent(accessToken, slot.eventData);
          }

          // Upsert mapping (service role)
          await supabaseAdmin
            .from('calendar_sync_map')
            .upsert(
              {
                user_id: athlete.auth_user_id,
                module: 'flux',
                entity_id: slot.slotId,
                google_event_id: googleEventId,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,module,entity_id' }
            );

          synced++;
        } else if (slot.action === 'delete') {
          // Find mapping
          const { data: mapping } = await supabaseAdmin
            .from('calendar_sync_map')
            .select('google_event_id')
            .eq('user_id', athlete.auth_user_id)
            .eq('module', 'flux')
            .eq('entity_id', slot.slotId)
            .maybeSingle();

          if (mapping?.google_event_id) {
            await deleteGoogleEvent(accessToken, mapping.google_event_id);

            await supabaseAdmin
              .from('calendar_sync_map')
              .delete()
              .eq('user_id', athlete.auth_user_id)
              .eq('module', 'flux')
              .eq('entity_id', slot.slotId);

            synced++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }

        // Rate limit: 100ms between Google API calls
        if (slots.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (slotErr) {
        console.error(`[sync-slot-to-athlete-calendar] Slot ${slot.slotId} failed:`, slotErr);
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced, skipped }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[sync-slot-to-athlete-calendar] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
