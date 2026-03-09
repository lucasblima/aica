/**
 * Edge Function: studio-generate-captions
 * Studio Creative Hub — Distribution Phase
 *
 * Purpose:
 * - Generate platform-optimized captions for content distribution
 * - Adapts length, tone, emojis, and hashtags per platform
 * - Supports Instagram, LinkedIn, Twitter/X, TikTok, YouTube
 *
 * Input: { content: string, platforms: string[] }
 * Output: { [platform]: { caption, hashtags } }
 *
 * Gemini Model: gemini-2.5-flash
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-generate-captions')

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

    const { content, platforms } = await req.json()
    if (!content || !platforms?.length) {
      throw new Error('Campos "content" e "platforms" sao obrigatorios')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!

    const prompt = `Voce e um social media manager experiente especializado em conteudo para o publico brasileiro.

Gere captions otimizadas para cada plataforma listada abaixo.

PLATAFORMAS: ${platforms.join(', ')}

CONTEUDO BASE:
${content}

Regras por plataforma:
- Instagram: visual, emojis moderados, ate 2200 caracteres, 5-10 hashtags relevantes
- LinkedIn: profissional, sem emojis excessivos, ate 3000 caracteres, 3-5 hashtags
- Twitter: conciso, ate 280 caracteres, 2-3 hashtags
- TikTok: casual, hooks fortes, emojis, ate 2200 caracteres, 5-8 hashtags
- YouTube: descritivo, SEO-friendly, ate 5000 caracteres, 5-10 tags

Retorne APENAS um JSON valido (sem markdown, sem explicacoes):
{
  "${platforms[0]}": {
    "caption": "string",
    "hashtags": ["string"]
  }
}`

    const rawResponse = await withHealthTracking(
      { functionName: 'studio-generate-captions', actionName: 'generate_captions' },
      supabaseClient,
      () => callGemini(apiKey, prompt)
    )
    const result = extractJSON(rawResponse)

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('studio-generate-captions error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
