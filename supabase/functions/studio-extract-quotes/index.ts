/**
 * Edge Function: studio-extract-quotes
 * Studio Creative Hub — Post-Production Phase
 *
 * Purpose:
 * - Extract the 5-10 most impactful quotes from a transcription
 * - Include context and estimated timestamp for each quote
 *
 * Input: { projectId: string, transcription: string }
 * Output: [{ quote, speaker, context, timestampSeconds }]
 *
 * Gemini Model: gemini-2.5-flash
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-extract-quotes')

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

    const { projectId, transcription } = await req.json()
    if (!projectId || !transcription) {
      throw new Error('Campos "projectId" e "transcription" sao obrigatorios')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!

    const prompt = `Voce e um curador de conteudo especializado em identificar momentos memoraveis em podcasts e entrevistas.

Extraia as 5-10 citacoes mais impactantes da transcricao abaixo. Para cada citacao, inclua o contexto e timestamp estimado.

TRANSCRICAO:
${transcription}

Retorne APENAS um JSON array valido (sem markdown, sem explicacoes):
[
  {
    "quote": "string - a citacao exata",
    "speaker": "string - quem disse",
    "context": "string - breve contexto do momento",
    "timestampSeconds": 0
  }
]`

    const rawResponse = await withHealthTracking(
      { functionName: 'studio-extract-quotes', actionName: 'extract_quotes' },
      supabaseClient,
      () => callGemini(apiKey, prompt)
    )
    const result = extractJSON(rawResponse)

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('studio-extract-quotes error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
