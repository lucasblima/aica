/**
 * transcribe-audio — Transcribes audio using Gemini 2.5 Flash
 *
 * Receives base64-encoded audio, sends to Gemini for transcription.
 * Returns plain text transcript in Portuguese.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { audio, mimeType } = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing audio data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioMime = mimeType || 'audio/webm';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: 'Transcreva o audio a seguir em portugues brasileiro. Retorne APENAS o texto transcrito, sem explicacoes, sem aspas, sem formatacao. Se o audio estiver vazio ou inaudivel, retorne uma string vazia.',
              },
              {
                inlineData: {
                  mimeType: audioMime,
                  data: audio,
                },
              },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[transcribe-audio] Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Gemini API error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const transcript = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return new Response(
      JSON.stringify({ success: true, transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[transcribe-audio] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
