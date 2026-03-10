/**
 * Edge Function: studio-outline
 * Studio Creative Hub — Article Workspace Phase
 *
 * Purpose:
 * - Generate structured article outlines from a theme
 * - Customize for target audience and writing style
 *
 * Input: { theme: string, targetAudience?: string, style?: string }
 * Output: [{ heading, subpoints, targetWords }]
 *
 * Gemini Model: gemini-2.5-flash
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-outline')

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

    const { theme, targetAudience, style } = await req.json()
    if (!theme) {
      throw new Error('Campo "theme" e obrigatorio')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const audience = targetAudience || 'geral'
    const writingStyle = style || 'informativo'

    const prompt = `Voce e um editor de conteudo experiente especializado em criar estruturas de artigos envolventes.

Crie um outline estruturado para um artigo sobre o tema: "${theme}"
Publico-alvo: ${audience}
Estilo: ${writingStyle}

O outline deve ter entre 5-8 secoes, cada uma com 3-5 subpontos detalhados.

Retorne APENAS um JSON array valido (sem markdown, sem explicacoes):
[
  {
    "heading": "string - titulo da secao",
    "subpoints": ["string - subponto detalhado"],
    "targetWords": 0
  }
]`

    const rawResponse = await withHealthTracking(
      { functionName: 'studio-outline', actionName: 'generate_outline' },
      supabaseClient,
      () => callGemini(apiKey, prompt)
    )
    const result = extractJSON(rawResponse)

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : 500;
    logger.error('studio-outline error:', error)
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
