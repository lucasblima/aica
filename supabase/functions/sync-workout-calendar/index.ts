// ============================================================================
// EDGE FUNCTION: sync-workout-calendar
// Description: Syncs workout slots from a microcycle to the athlete's Google
//              Calendar. Creates/updates events for each slot that has a
//              start_time. Uses the athlete's own Google OAuth token.
//
// Called by: Athlete Portal (athlete syncs their own workouts to calendar)
//            OR Coach on behalf of athlete (uses athlete's token)
//
// Input (POST JSON):
//   { microcycleId: string, weekNumber?: number }
//
// Returns: { success, synced, skipped, failed, events[] }
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getGoogleTokenForUser } from '../_shared/google-token-manager.ts';

const TAG = '[sync-workout-calendar]';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface SyncRequest {
  microcycleId: string;
  weekNumber?: number; // Optional: sync only specific week (1-3)
  timezone?: string;   // Optional: IANA timezone (default: America/Sao_Paulo)
}

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  colorId: string;
  extendedProperties?: {
    private: Record<string, string>;
  };
}

// ============================================================================
// GOOGLE CALENDAR HELPERS
// ============================================================================

async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ id: string }> {
  const response = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error(TAG, 'Create event failed:', response.status, err);
    throw new Error(`Calendar API error: ${err.error?.message || response.status}`);
  }

  return await response.json();
}

async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEvent
): Promise<{ id: string }> {
  const response = await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // If event was deleted externally, create a new one
    if (response.status === 404) {
      return createCalendarEvent(accessToken, event);
    }
    console.error(TAG, 'Update event failed:', response.status, err);
    throw new Error(`Calendar API error: ${err.error?.message || response.status}`);
  }

  return await response.json();
}

// ============================================================================
// SLOT → CALENDAR EVENT TRANSFORM
// ============================================================================

function slotToCalendarEvent(
  slot: {
    id: string;
    name: string;
    day_of_week: number;
    week_number: number;
    start_time: string;
    duration: number;
    modality: string;
    intensity: string;
    coach_notes?: string;
    exercise_structure?: Record<string, unknown>;
  },
  microcycleStartDate: string, // "YYYY-MM-DD" (Monday of week 1)
  timezone: string = 'America/Sao_Paulo'
): CalendarEvent {
  // Calculate the actual date for this slot
  const baseDate = new Date(microcycleStartDate + 'T00:00:00');
  const dayOffset = (slot.week_number - 1) * 7 + (slot.day_of_week - 1);
  const eventDate = new Date(baseDate);
  eventDate.setDate(eventDate.getDate() + dayOffset);

  const dateStr = eventDate.toISOString().split('T')[0];

  // Parse start_time (could be "HH:MM" or "HH:MM:SS")
  const timeParts = slot.start_time.split(':');
  const startHour = timeParts[0].padStart(2, '0');
  const startMin = (timeParts[1] || '00').padStart(2, '0');

  // Calculate end time
  const durationMin = slot.duration || 60;
  const endDate = new Date(`${dateStr}T${startHour}:${startMin}:00`);
  endDate.setMinutes(endDate.getMinutes() + durationMin);
  const endHour = endDate.getHours().toString().padStart(2, '0');
  const endMin = endDate.getMinutes().toString().padStart(2, '0');

  // Build description
  const descParts: string[] = [];
  if (slot.modality) descParts.push(`Modalidade: ${slot.modality}`);
  if (slot.intensity) descParts.push(`Intensidade: ${slot.intensity}`);
  if (slot.duration) descParts.push(`Duração: ${slot.duration}min`);
  if (slot.coach_notes) descParts.push(`\nNotas do coach: ${slot.coach_notes}`);

  // Include exercise structure summary if available
  if (slot.exercise_structure) {
    const structure = slot.exercise_structure;
    if (structure.warmup) descParts.push(`Aquecimento: ${JSON.stringify(structure.warmup)}`);
    if (structure.main) descParts.push(`Principal: ${JSON.stringify(structure.main)}`);
    if (structure.cooldown) descParts.push(`Volta à calma: ${JSON.stringify(structure.cooldown)}`);
  }

  descParts.push('\nSincronizado pelo AICA Flux');

  const label = slot.modality
    ? `[Treino] ${slot.name} (${slot.modality})`
    : `[Treino] ${slot.name}`;

  return {
    summary: label,
    description: descParts.join('\n'),
    start: {
      dateTime: `${dateStr}T${startHour}:${startMin}:00`,
      timeZone: timezone,
    },
    end: {
      dateTime: `${dateStr}T${endHour}:${endMin}:00`,
      timeZone: timezone,
    },
    colorId: '7', // Peacock/teal (Flux color)
    extendedProperties: {
      private: {
        aica_module: 'flux',
        aica_entity_id: slot.id,
        aica_slot_type: 'workout',
      },
    },
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: jsonHeaders }
      );
    }

    // 1. Validate JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth client to identify caller
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // Service role client for cross-user reads
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Parse request
    const { microcycleId, weekNumber, timezone }: SyncRequest = await req.json();
    const tz = timezone || 'America/Sao_Paulo';

    if (!microcycleId) {
      return new Response(
        JSON.stringify({ success: false, error: 'microcycleId is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (weekNumber !== undefined && (weekNumber < 1 || weekNumber > 12)) {
      return new Response(
        JSON.stringify({ success: false, error: 'weekNumber must be between 1 and 12' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 3. Determine who the athlete is
    //    Case A: Caller IS the athlete (via auth_user_id on athletes table)
    //    Case B: Caller is the coach (via user_id on microcycles table)
    const { data: microcycle, error: mcError } = await supabaseAdmin
      .from('microcycles')
      .select('id, athlete_id, user_id, start_date, name')
      .eq('id', microcycleId)
      .single();

    if (mcError || !microcycle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Microcycle not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Get the athlete record to find auth_user_id
    const { data: athlete, error: athleteError } = await supabaseAdmin
      .from('athletes')
      .select('id, auth_user_id, name')
      .eq('id', microcycle.athlete_id)
      .single();

    if (athleteError || !athlete) {
      return new Response(
        JSON.stringify({ success: false, error: 'Athlete not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Verify caller is either the athlete or the coach
    const isAthlete = athlete.auth_user_id === user.id;
    const isCoach = microcycle.user_id === user.id;

    if (!isAthlete && !isCoach) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authorized for this microcycle' }),
        { status: 403, headers: jsonHeaders }
      );
    }

    // Use athlete's Google token for syncing to THEIR calendar
    const targetUserId = athlete.auth_user_id;
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Athlete has not linked their account' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 4. Get athlete's Google Calendar token
    const tokenResult = await getGoogleTokenForUser(
      targetUserId,
      'calendar.events',
      supabaseAdmin
    );

    if (tokenResult.error) {
      return new Response(
        JSON.stringify({ success: false, error: tokenResult.error }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const accessToken = tokenResult.accessToken!;

    // 5. Fetch workout slots for the microcycle
    let slotsQuery = supabaseAdmin
      .from('workout_slots')
      .select('id, name, day_of_week, week_number, start_time, duration, modality, intensity, coach_notes, exercise_structure, calendar_event_id')
      .eq('microcycle_id', microcycleId);

    if (weekNumber) {
      slotsQuery = slotsQuery.eq('week_number', weekNumber);
    }

    const { data: slots, error: slotsError } = await slotsQuery.order('week_number').order('day_of_week');

    if (slotsError) {
      console.error(TAG, 'Error fetching slots:', slotsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch workout slots' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    if (!slots || slots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, skipped: 0, failed: 0, events: [] }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 6. Sync each slot to Google Calendar
    const results = { synced: 0, skipped: 0, failed: 0 };
    const events: Array<{ slotId: string; eventId: string; action: string }> = [];

    for (const slot of slots) {
      try {
        // Skip slots without start_time (can't create timed events)
        if (!slot.start_time) {
          results.skipped++;
          continue;
        }

        const calendarEvent = slotToCalendarEvent(slot, microcycle.start_date, tz);

        let eventId: string;
        let action: string;

        if (slot.calendar_event_id) {
          // Update existing event
          const result = await updateCalendarEvent(accessToken, slot.calendar_event_id, calendarEvent);
          eventId = result.id;
          action = 'updated';
        } else {
          // Create new event
          const result = await createCalendarEvent(accessToken, calendarEvent);
          eventId = result.id;
          action = 'created';
        }

        // Store calendar_event_id back to workout_slots
        await supabaseAdmin
          .from('workout_slots')
          .update({
            calendar_event_id: eventId,
            calendar_synced_at: new Date().toISOString(),
          })
          .eq('id', slot.id);

        events.push({ slotId: slot.id, eventId, action });
        results.synced++;
      } catch (slotError) {
        console.error(TAG, `Failed to sync slot ${slot.id}:`, slotError);
        results.failed++;
      }
    }

    console.log(TAG, `Sync complete for microcycle ${microcycleId}:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        microcycleId,
        microcycleName: microcycle.name,
        athleteName: athlete.name,
        ...results,
        events,
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    console.error(TAG, 'Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
