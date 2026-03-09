/**
 * Edge Function: studio-transcribe
 * Studio Creative Hub — Post-Production Phase
 *
 * Purpose:
 * - Accept pre-transcribed text and structure it with chapters and speakers
 * - Identify different speakers and organize into segments
 * - Generate chapter timestamps from content analysis
 *
 * Input: { text: string, language?: string, projectId?: string }
 * Output: { chapters, speakers, wordCount }
 *
 * Gemini Model: gemini-2.5-flash
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-transcribe')

// =============================================================================
// HELPERS
// =============================================================================

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    }
  )
  const data = await response.json()
  if (data.error) throw new Error(`Gemini API error: ${data.error.message}`)
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function extractJSON(text: string): any {
  const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim()
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/)
  if (jsonMatch) return JSON.parse(jsonMatch[0])
  return JSON.parse(cleaned)
}

// =============================================================================
// HANDLER
// =============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { text, language = 'pt-BR', projectId } = await req.json()
    if (!text || typeof text !== 'string') {
      throw new Error('Campo "text" e obrigatorio')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!

    const prompt = `Voce e um assistente especializado em producao de podcasts e conteudo de audio.

Analise o texto transcrito a seguir e organize em capitulos com timestamps estimados.
Identifique diferentes falantes quando possivel.
Idioma do conteudo: ${language}

TEXTO TRANSCRITO:
${text}

Retorne APENAS um JSON valido (sem markdown, sem explicacoes):
{
  "chapters": [
    { "title": "string - titulo do capitulo", "startSeconds": 0, "endSeconds": 120 }
  ],
  "speakers": [
    { "name": "string - nome ou identificador do falante", "segments": [
      { "start": 0, "end": 60, "text": "trecho falado" }
    ]}
  ],
  "wordCount": 0
}`

    const rawResponse = await withHealthTracking(
      { functionName: 'studio-transcribe', actionName: 'structure_transcription' },
      supabaseClient,
      () => callGemini(apiKey, prompt)
    )
    const result = extractJSON(rawResponse)

    // Save to DB if projectId provided
    if (projectId) {
      await supabaseClient.from('studio_transcriptions').insert({
        project_id: projectId,
        user_id: user.id,
        chapters: result.chapters,
        speakers: result.speakers,
        word_count: result.wordCount,
        language,
        raw_text_length: text.length,
      })
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('studio-transcribe error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
