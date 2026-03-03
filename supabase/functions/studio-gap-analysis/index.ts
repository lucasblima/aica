/**
 * Edge Function: studio-gap-analysis
 * Studio Creative Hub — NotebookLM Research UX
 *
 * Purpose:
 * - Analyzes existing dossier to identify information gaps
 * - Uses Gemini 2.5 Flash + Google Search Grounding for real-time data
 * - Generates 5-8 SuggestionCards with gap-filling content
 *
 * Input: { dossier, guestName, theme, customSources? }
 * Output: { success, data: { suggestions, analysisTimestamp } }
 *
 * Gemini Model: gemini-2.5-flash + Google Search Grounding
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

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
    const { dossier, guestName, theme, customSources } = await req.json()
    if (!dossier || !guestName) {
      throw new Error('Campos "dossier" e "guestName" sao obrigatorios')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    console.log(`[studio-gap-analysis] Analyzing gaps for "${guestName}", theme: "${theme || 'geral'}"`)

    // Build context from dossier
    const dossierSummary = [
      dossier.biography ? `Biografia: ${dossier.biography.substring(0, 1000)}` : 'Biografia: NAO DISPONIVEL',
      dossier.technicalSheet ? `Ficha Tecnica: ${JSON.stringify(dossier.technicalSheet).substring(0, 500)}` : 'Ficha Tecnica: NAO DISPONIVEL',
      dossier.controversies?.length ? `Controversias: ${dossier.controversies.join('; ')}` : 'Controversias: NENHUMA IDENTIFICADA',
      dossier.suggestedTopics?.length ? `Topicos: ${dossier.suggestedTopics.join(', ')}` : '',
      customSources?.length ? `Fontes do usuario: ${customSources.map((s: any) => s.label || s.content?.substring(0, 100)).join(', ')}` : '',
    ].filter(Boolean).join('\n\n')

    const prompt = `Voce e um analista de pesquisa para podcasts. Analise o dossie abaixo sobre "${guestName}" (tema: "${theme || 'geral'}") e identifique LACUNAS — informacoes importantes que estao FALTANDO.

Para cada lacuna, gere um card de sugestao com:
- type: um de [formacao, carreira, controversia, publicacao, rede_social, opiniao, atualidade, custom]
- title: titulo curto (3-5 palavras)
- previewText: descricao da lacuna (1-2 frases)
- fullText: paragrafo completo que PREENCHERIA essa lacuna (3-5 frases, baseado em pesquisa)
- targetSection: onde inserir no dossie (bio, ficha, noticias)
- relevanceScore: 0-100 (quao importante e preencher essa lacuna)

Gere 5-8 cards, priorizando por relevancia. Use pesquisa do Google para complementar.

DOSSIE ATUAL:
${dossierSummary}

Responda APENAS com JSON valido no formato:
{
  "suggestions": [
    {
      "type": "formacao",
      "title": "Formacao Academica",
      "previewText": "O dossie nao menciona...",
      "fullText": "Paragrafo completo...",
      "targetSection": "bio",
      "relevanceScore": 85
    }
  ]
}`

    const { text, sources } = await callGeminiWithGrounding(apiKey, prompt, 4096)

    // Extract JSON from response
    let parsed: any
    try {
      parsed = extractJSON(text)
    } catch (parseErr) {
      console.error('[studio-gap-analysis] JSON parse error:', parseErr, 'Raw:', text.substring(0, 500))
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add IDs, validate, and attach grounding sources
    const suggestions = (parsed.suggestions || []).map((s: any, i: number) => ({
      id: `gap_${Date.now()}_${i}`,
      type: s.type || 'custom',
      title: s.title || 'Sugestao',
      previewText: s.previewText || '',
      fullText: s.fullText || s.previewText || '',
      targetSection: s.targetSection || 'bio',
      relevanceScore: Math.min(100, Math.max(0, s.relevanceScore || 50)),
      sources: sources.length > 0 ? sources : [],
      status: 'pending',
    }))

    console.log(`[studio-gap-analysis] Generated ${suggestions.length} suggestions, ${sources.length} sources`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          suggestions,
          analysisTimestamp: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[studio-gap-analysis] error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
