/**
 * Edge Function: studio-clip-extract
 * Studio Creative Hub — Video Clips Phase
 *
 * Purpose:
 * - Analyze transcription to identify 5-8 ideal moments for short clips (30s-90s)
 * - Suggest titles, captions, and hashtags optimized per platform
 * - Save suggested clips to studio_clips table
 *
 * Input: { projectId: string, transcription: string, targetPlatforms?: string[] }
 * Output: [{ title, startTimeSeconds, endTimeSeconds, transcriptSegment, caption, hashtags, suggestedPlatform }]
 *
 * Gemini Model: gemini-2.5-flash
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

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

    const { projectId, transcription, targetPlatforms } = await req.json()
    if (!projectId || !transcription) {
      throw new Error('Campos "projectId" e "transcription" sao obrigatorios')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const platforms = targetPlatforms?.length ? targetPlatforms.join(', ') : 'Instagram Reels, YouTube Shorts, TikTok'

    const prompt = `Voce e um especialista em conteudo para redes sociais e producao de video curto.

Analise a transcricao abaixo e identifique 5-8 momentos ideais para clips curtos (30s-90s cada).
Para cada clip, sugira titulo, caption e hashtags otimizados para as plataformas: ${platforms}.

Priorize momentos com:
- Frases de impacto ou insights valiosos
- Historias envolventes ou anedotas
- Momentos de humor ou emocao
- Dicas praticas e acionaveis

TRANSCRICAO:
${transcription}

Retorne APENAS um JSON array valido (sem markdown, sem explicacoes):
[
  {
    "title": "string - titulo chamativo para o clip",
    "startTimeSeconds": 0,
    "endTimeSeconds": 60,
    "transcriptSegment": "string - trecho exato da transcricao",
    "caption": "string - caption para redes sociais",
    "hashtags": ["string"],
    "suggestedPlatform": "string - plataforma mais adequada"
  }
]`

    const rawResponse = await callGemini(apiKey, prompt)
    const clips = extractJSON(rawResponse)

    // Save clips to DB with status 'suggested'
    const clipInserts = clips.map((clip: any) => ({
      project_id: projectId,
      user_id: user.id,
      title: clip.title,
      start_time_seconds: clip.startTimeSeconds,
      end_time_seconds: clip.endTimeSeconds,
      transcript_segment: clip.transcriptSegment,
      caption: clip.caption,
      hashtags: clip.hashtags,
      suggested_platform: clip.suggestedPlatform,
      status: 'suggested',
    }))

    if (clipInserts.length > 0) {
      await supabaseClient.from('studio_clips').insert(clipInserts)
    }

    return new Response(JSON.stringify({ success: true, data: clips }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('studio-clip-extract error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
