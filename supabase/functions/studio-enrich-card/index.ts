/**
 * Edge Function: studio-enrich-card
 * Studio Creative Hub — NotebookLM Research UX
 *
 * Purpose:
 * - Generates detailed enrichment text for a specific dossier gap
 * - Uses Gemini 2.5 Flash + Google Search Grounding for real-time data
 * - Focused on ONE card type, producing 5-8 sentence detailed paragraph
 *
 * Input: { cardType, cardTitle, guestName, theme, existingDossier, fileSearchStoreId? }
 * Output: { success, data: { enrichedText, sources } }
 *
 * Gemini Model: gemini-2.5-flash + Google Search Grounding
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

// =============================================================================
// HELPERS
// =============================================================================

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

// Card type labels for prompt context
const CARD_TYPE_LABELS: Record<string, string> = {
  formacao: 'Formacao Academica',
  carreira: 'Trajetoria de Carreira',
  controversia: 'Controversias e Polemicas',
  publicacao: 'Publicacoes e Obras',
  rede_social: 'Presenca Digital e Redes Sociais',
  opiniao: 'Opinioes Publicas e Posicionamentos',
  atualidade: 'Noticias e Eventos Recentes',
  custom: 'Pesquisa Personalizada',
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
    const { cardType, cardTitle, guestName, theme, existingDossier, fileSearchStoreId } = await req.json()
    if (!cardType || !cardTitle || !guestName) {
      throw new Error('Campos "cardType", "cardTitle" e "guestName" sao obrigatorios')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const typeLabel = CARD_TYPE_LABELS[cardType] || cardType
    console.log(`[studio-enrich-card] Enriching "${cardTitle}" (${typeLabel}) for "${guestName}"`)

    const prompt = `Voce e um pesquisador especializado em preparacao de entrevistas para podcasts.

Preciso de informacoes DETALHADAS sobre o seguinte topico referente a ${guestName}:

TOPICO: ${cardTitle}
CATEGORIA: ${typeLabel}
TEMA DO EPISODIO: ${theme || 'geral'}

CONTEXTO DO DOSSIE ATUAL:
${existingDossier ? existingDossier.substring(0, 2000) : 'Dossie ainda nao disponivel.'}

Escreva um paragrafo DETALHADO (5-8 frases) que preencha essa lacuna no dossie. O texto deve ser:
- Factual e baseado em pesquisa real (use Google Search)
- Em portugues brasileiro natural
- Pronto para ser inserido diretamente no dossie
- Rico em detalhes especificos (datas, nomes, numeros quando possivel)
- Relevante para o contexto de uma entrevista de podcast

Responda APENAS com o texto do paragrafo, sem formatacao JSON, sem marcadores, sem titulos. Apenas o paragrafo pronto para insercao.`

    const { text, sources } = await callGeminiWithGrounding(apiKey, prompt, 4096)

    // Clean up the enriched text (remove any accidental markdown or code fences)
    const enrichedText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^#+\s+.*/gm, '')
      .replace(/^\*\*.*\*\*$/gm, '')
      .trim()

    if (!enrichedText) {
      throw new Error('AI generated empty response')
    }

    console.log(`[studio-enrich-card] Generated ${enrichedText.length} chars, ${sources.length} sources`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          enrichedText,
          sources,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[studio-enrich-card] error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
