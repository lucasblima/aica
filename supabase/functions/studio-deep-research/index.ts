/**
 * Edge Function: studio-deep-research
 * Studio Creative Hub — Pre-Production Phase
 *
 * Purpose:
 * - Deep guest research using Gemini with Google Search Grounding
 * - Generates structured dossier with biography, themes, questions, ice breakers
 * - Three depth levels: quick, standard, deep
 *
 * Input: { guestName: string, guestContext: string, researchDepth?: 'quick' | 'standard' | 'deep' }
 * Output: { dossier, suggestedThemes, suggestedTitles, sources, researchTimestamp, researchDepth }
 *
 * Gemini Model: gemini-2.5-flash + Google Search Grounding
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-deep-research')

// =============================================================================
// HELPERS
// =============================================================================

function extractJSON(text: string): any {
  const cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim()
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/)
  if (jsonMatch) return JSON.parse(jsonMatch[0])
  return JSON.parse(cleaned)
}

interface GroundingSource {
  title: string
  url: string
}

async function callGeminiWithGrounding(
  apiKey: string,
  prompt: string,
  maxOutputTokens = 4096
): Promise<{ text: string; sources: GroundingSource[] }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { maxOutputTokens },
      }),
    }
  )
  const data = await response.json()
  if (data.error) throw new Error(`Gemini API error: ${data.error.message}`)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  const sources: GroundingSource[] = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || '',
      url: chunk.web.uri || '',
    }))

  return { text, sources }
}

async function callGemini(
  apiKey: string,
  prompt: string,
  maxOutputTokens = 4096,
  model = 'gemini-2.5-flash'
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens },
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
    // Auth
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Input validation
    const { guestName, guestContext, researchDepth = 'standard' } = await req.json()
    if (!guestName || !guestContext) {
      throw new Error('Campos "guestName" e "guestContext" sao obrigatorios')
    }
    if (!['quick', 'standard', 'deep'].includes(researchDepth)) {
      throw new Error('researchDepth deve ser "quick", "standard" ou "deep"')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const timings: Record<string, number> = {}

    // =========================================================================
    // STEP 1 — Google Search Grounding (real-time web data)
    // =========================================================================
    const step1Start = Date.now()
    logger.info(`Step 1: Grounding search for "${guestName}"`)

    const groundingPrompt = `Pesquise informacoes atualizadas sobre ${guestName}, ${guestContext}. Inclua: biografia completa, trabalho recente, publicacoes, aparicoes em midia, redes sociais, controversias recentes, e fatos relevantes. Seja detalhado e factual.`

    let groundingText = ''
    let sources: GroundingSource[] = []

    try {
      const groundingResult = await withHealthTracking(
        { functionName: 'studio-deep-research', actionName: 'grounding_search' },
        supabaseClient,
        () => callGeminiWithGrounding(apiKey, groundingPrompt, 4096)
      )
      groundingText = groundingResult.text
      sources = groundingResult.sources
    } catch (groundingError) {
      // Fallback: if grounding fails, use regular prompt without search
      logger.warn('Grounding failed, falling back to regular prompt:', groundingError)
      groundingText = await callGemini(apiKey, groundingPrompt, 4096)
    }

    timings.step1_grounding_ms = Date.now() - step1Start
    logger.info(`Step 1 complete: ${timings.step1_grounding_ms}ms, ${sources.length} sources`)

    // =========================================================================
    // STEP 2 — Structured Dossier Synthesis
    // =========================================================================
    const step2Start = Date.now()
    logger.info('Step 2: Dossier synthesis')

    const synthesisPrompt = `Voce e um pesquisador especializado em preparacao de entrevistas para podcasts.

Com base nas informacoes pesquisadas sobre ${guestName} (${guestContext}):

${groundingText}

Gere um dossier estruturado completo. Retorne APENAS JSON valido no formato:
{
  "biography": "3-5 paragrafos com biografia factual e detalhada",
  "technicalSheet": {
    "fullName": "nome completo",
    "profession": "profissao principal",
    "company": "empresa/organizacao atual",
    "education": [{"degree": "grau", "institution": "instituicao", "year": "ano"}],
    "careerHighlights": [{"title": "cargo/conquista", "organization": "empresa", "period": "periodo"}],
    "socialMedia": [{"platform": "rede", "handle": "@handle_ou_url"}],
    "keyFacts": ["fato relevante 1", "fato 2"]
  },
  "suggestedThemes": ["tema 1 baseado na expertise", "tema 2 baseado em trabalho recente"],
  "suggestedTitles": {
    "tema 1": ["Titulo criativo 1", "Titulo criativo 2", "Titulo criativo 3"],
    "tema 2": ["Titulo 1", "Titulo 2", "Titulo 3"]
  },
  "controversies": ["controversia ou tema quente 1"],
  "iceBreakers": ["pergunta quebra-gelo 1", "fato curioso para iniciar conversa 2"],
  "suggestedQuestions": [
    {"theme": "tema 1", "questions": ["pergunta profunda 1", "pergunta 2", "pergunta 3"]},
    {"theme": "tema 2", "questions": ["pergunta 1", "pergunta 2"]}
  ]
}

IMPORTANTE:
- suggestedThemes deve ter 5-8 temas relevantes baseados na expertise do convidado e eventos recentes
- suggestedTitles deve ter 3-5 titulos criativos POR tema (chamativos para podcast brasileiro)
- suggestedQuestions deve ter 3-5 perguntas profundas POR tema
- iceBreakers deve ter 5-8 opcoes variadas (fatos curiosos, conexoes pessoais, atualidades)
- Tudo em portugues brasileiro natural`

    const synthesisRaw = await withHealthTracking(
      { functionName: 'studio-deep-research', actionName: 'dossier_synthesis' },
      supabaseClient,
      () => callGemini(apiKey, synthesisPrompt, 8192, 'gemini-2.5-pro')
    )
    let dossier: any

    try {
      dossier = extractJSON(synthesisRaw)
    } catch (parseError) {
      logger.error('Failed to parse dossier JSON:', parseError)
      // Return a minimal dossier with the raw text as biography
      dossier = {
        biography: groundingText,
        technicalSheet: {
          fullName: guestName,
          profession: guestContext,
          company: '',
          education: [],
          careerHighlights: [],
          socialMedia: [],
          keyFacts: [],
        },
        suggestedThemes: [],
        suggestedTitles: {},
        controversies: [],
        iceBreakers: [],
        suggestedQuestions: [],
      }
    }

    timings.step2_synthesis_ms = Date.now() - step2Start
    logger.info(`Step 2 complete: ${timings.step2_synthesis_ms}ms`)

    // Extract themes and titles from dossier to top-level response
    const suggestedThemes = dossier.suggestedThemes || []
    const suggestedTitles = dossier.suggestedTitles || {}

    // =========================================================================
    // STEP 3 — Extended Research (only if researchDepth === 'deep')
    // =========================================================================
    let recentAppearances: string | undefined

    if (researchDepth === 'deep') {
      const step3Start = Date.now()
      logger.info('Step 3: Extended deep research')

      const extendedPrompt = `Pesquise entrevistas recentes, podcasts, palestras, livros e artigos publicados por ${guestName} (${guestContext}) nos ultimos 2 anos. Liste com datas e fontes.`

      try {
        const extendedResult = await withHealthTracking(
          { functionName: 'studio-deep-research', actionName: 'extended_research' },
          supabaseClient,
          () => callGeminiWithGrounding(apiKey, extendedPrompt, 4096)
        )
        recentAppearances = extendedResult.text

        // Merge extended sources (deduplicate by URL)
        const existingUrls = new Set(sources.map((s) => s.url))
        for (const src of extendedResult.sources) {
          if (!existingUrls.has(src.url)) {
            sources.push(src)
            existingUrls.add(src.url)
          }
        }
      } catch (extendedError) {
        logger.warn('Extended research failed:', extendedError)
        // Non-fatal: deep research is a bonus
        recentAppearances = undefined
      }

      timings.step3_extended_ms = Date.now() - step3Start
      logger.info(`Step 3 complete: ${timings.step3_extended_ms}ms`)
    }

    // =========================================================================
    // RESPONSE
    // =========================================================================
    const totalMs = Object.values(timings).reduce((a, b) => a + b, 0)
    logger.info(`Total: ${totalMs}ms, depth: ${researchDepth}, sources: ${sources.length}`)

    const responseData: any = {
      dossier: {
        biography: dossier.biography,
        technicalSheet: dossier.technicalSheet,
        controversies: dossier.controversies,
        iceBreakers: dossier.iceBreakers,
        suggestedQuestions: dossier.suggestedQuestions,
      },
      suggestedThemes,
      suggestedTitles,
      sources,
      researchTimestamp: new Date().toISOString(),
      researchDepth,
    }

    if (recentAppearances) {
      responseData.recentAppearances = recentAppearances
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
