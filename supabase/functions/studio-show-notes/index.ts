/**
 * Edge Function: studio-show-notes
 * Studio Creative Hub — Post-Production Phase
 *
 * Purpose:
 * - Generate comprehensive show notes from episode transcription
 * - Includes summary, highlights, key quotes, SEO description, tags
 *
 * Input: { projectId: string, transcription: string }
 * Output: { summary, highlights, keyQuotes, seoDescription, tags }
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

    const { projectId, transcription } = await req.json()
    if (!projectId || !transcription) {
      throw new Error('Campos "projectId" e "transcription" sao obrigatorios')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!

    const prompt = `Voce e um produtor de conteudo especializado em podcasts e midia digital.

Com base na transcricao a seguir, gere show notes completas para o episodio de podcast.

TRANSCRICAO:
${transcription}

Retorne APENAS um JSON valido (sem markdown, sem explicacoes):
{
  "summary": "string - resumo de 3-5 paragrafos do episodio",
  "highlights": ["string - 5-8 destaques principais do episodio"],
  "keyQuotes": ["string - 5-10 citacoes marcantes dos participantes"],
  "seoDescription": "string - descricao SEO com no maximo 160 caracteres",
  "tags": ["string - 5-10 tags relevantes para o episodio"]
}`

    const rawResponse = await callGemini(apiKey, prompt)
    const result = extractJSON(rawResponse)

    // Save to DB
    await supabaseClient.from('studio_show_notes').insert({
      project_id: projectId,
      user_id: user.id,
      summary: result.summary,
      highlights: result.highlights,
      key_quotes: result.keyQuotes,
      seo_description: result.seoDescription,
      tags: result.tags,
    })

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('studio-show-notes error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
