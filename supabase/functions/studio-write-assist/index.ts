/**
 * Edge Function: studio-write-assist
 * Studio Creative Hub — Article Workspace Phase
 *
 * Purpose:
 * - AI writing assistant for content creation
 * - Accepts context and specific instructions to generate text
 * - Configurable tone (professional, casual, academic, etc.)
 *
 * Input: { context: string, instruction: string, tone?: string }
 * Output: { text: string }
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

    const { context, instruction, tone } = await req.json()
    if (!context || !instruction) {
      throw new Error('Campos "context" e "instruction" sao obrigatorios')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const writingTone = tone || 'profissional'

    const prompt = `Voce e um redator profissional especializado em conteudo digital em portugues brasileiro.

CONTEXTO:
${context}

INSTRUCAO:
${instruction}

TOM: ${writingTone}

Escreva o texto solicitado em portugues brasileiro, seguindo o tom especificado.
Seja claro, envolvente e natural. Evite cliches e frases genericas.
Retorne APENAS o texto gerado, sem marcacoes, sem explicacoes adicionais.`

    const rawResponse = await callGemini(apiKey, prompt)

    return new Response(JSON.stringify({ success: true, data: { text: rawResponse.trim() } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('studio-write-assist error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
