import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * EraForge TTS Edge Function
 *
 * Proxies text-to-speech requests to ElevenLabs API.
 * Returns audio/mpeg stream for playback on the client.
 *
 * POST body: { text: string; voice_id?: string; advisor_id?: string }
 */

// ElevenLabs voice IDs mapped to advisor personality
const ADVISOR_VOICE_MAP: Record<string, string> = {
  historian: 'pNInz6obpgDQGcFmaJgB',   // Adam — calm, wise narrator
  scientist: 'EXAVITQu4vr4xnSDxMaL',   // Bella — gentle, clear
  artist: 'MF3mGyEYCl7XYWbV9V6O',       // Elli — warm, expressive
  explorer: 'TxGEqnHWrfWFTfGW9XjX',     // Josh — energetic, bold
  philosopher: 'VR6AewLTigWG4xSOukaG',  // Arnold — deep, thoughtful
  engineer: 'pNInz6obpgDQGcFmaJgB',     // Adam — methodical
  diplomat: 'EXAVITQu4vr4xnSDxMaL',     // Bella — diplomatic, smooth
};

const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const MAX_TEXT_LENGTH = 500; // Safety limit for children's content

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate JWT auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { text, voice_id, advisor_id } = body as {
      text?: string;
      voice_id?: string;
      advisor_id?: string;
    };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or empty text field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate text for safety
    const sanitizedText = text.trim().slice(0, MAX_TEXT_LENGTH);

    // Resolve voice ID: explicit > advisor map > default
    const resolvedVoiceId =
      voice_id ||
      (advisor_id ? ADVISOR_VOICE_MAP[advisor_id] : null) ||
      DEFAULT_VOICE_ID;

    // Get ElevenLabs API key from secrets
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('[eraforge-tts] ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'TTS service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call ElevenLabs TTS API
    const ttsResponse = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${resolvedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: sanitizedText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[eraforge-tts] ElevenLabs error:', ttsResponse.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `TTS generation failed (${ttsResponse.status})`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream audio back to client
    const audioStream = ttsResponse.body;
    return new Response(audioStream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[eraforge-tts] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
