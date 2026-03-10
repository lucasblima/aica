/**
 * Edge Function: studio-newsletter-generate
 * Studio Creative Hub — Newsletter Generation
 *
 * Purpose:
 * - Generate newsletter content from episode context, show notes, or a topic
 * - Returns subject line, HTML-safe markdown content, highlights, and CTA
 *
 * Input: {
 *   projectId: string,
 *   episodeId?: string,
 *   topic: string,
 *   audience: string,
 *   tone: string,
 *   showNotesContent?: string,
 *   transcriptContent?: string
 * }
 *
 * Output: { success: true, data: { subject, content, highlights, callToAction } }
 *
 * Gemini Model: gemini-2.5-flash (maxOutputTokens: 4096)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-newsletter-generate')

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
  // Strip code fences FIRST, then find JSON object
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
    // Auth
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse payload
    const {
      projectId,
      episodeId,
      topic,
      audience,
      tone,
      showNotesContent,
      transcriptContent,
    } = await req.json()

    if (!topic) {
      throw new Error('Campo "topic" e obrigatorio')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!

    // Build context section
    const contextParts: string[] = []
    if (showNotesContent) {
      contextParts.push(`SHOW NOTES DO EPISODIO:\n${showNotesContent}`)
    }
    if (transcriptContent) {
      contextParts.push(`TRANSCRICAO (trecho):\n${transcriptContent.substring(0, 3000)}`)
    }
    const contextSection = contextParts.length > 0
      ? `\nCONTEXTO ADICIONAL:\n${contextParts.join('\n\n')}\n`
      : ''

    const prompt = `Voce e um especialista em email marketing e criacao de newsletters para criadores de conteudo brasileiros.

Gere uma newsletter completa com base nas seguintes informacoes:

TOPICO: ${topic}
PUBLICO-ALVO: ${audience || 'ouvintes de podcast e criadores de conteudo'}
TOM: ${tone || 'profissional e engajador'}
${contextSection}

A newsletter deve:
- Ter um assunto (subject line) atrativo que gere abertura (max 80 caracteres)
- Conteudo em markdown valido (pode usar **negrito**, *italico*, listas, links)
- Ser escrita em portugues brasileiro
- Incluir destaques relevantes do conteudo
- Terminar com um call-to-action claro

Retorne APENAS um JSON valido (sem markdown, sem explicacoes):
{
  "subject": "string - assunto da newsletter (max 80 caracteres)",
  "content": "string - conteudo completo da newsletter em markdown",
  "highlights": ["string - 3-5 destaques principais"],
  "callToAction": "string - call-to-action final da newsletter"
}`

    logger.info('Generating newsletter', { projectId, episodeId, topic })

    const rawResponse = await withHealthTracking(
      { functionName: 'studio-newsletter-generate', actionName: 'generate_newsletter' },
      supabaseClient,
      () => callGemini(apiKey, prompt)
    )
    const result = extractJSON(rawResponse)

    logger.info('Newsletter generated successfully', {
      projectId,
      subjectLength: result.subject?.length,
      highlightsCount: result.highlights?.length,
    })

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('studio-newsletter-generate error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
