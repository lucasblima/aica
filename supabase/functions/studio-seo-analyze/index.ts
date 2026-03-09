/**
 * Edge Function: studio-seo-analyze
 * Studio Creative Hub — SEO Analysis
 *
 * Purpose:
 * - Analyze article content for SEO optimization
 * - Score title, keywords, readability, structure
 * - Generate actionable improvement suggestions
 * - Provide meta description recommendation
 *
 * Input: { content, title, targetKeywords? }
 * Output: { success: true, data: { score, suggestions, metaDescription, readability, keywordDensity, headerStructure } }
 *
 * Gemini Model: gemini-2.5-flash (maxOutputTokens: 4096)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-seo-analyze')

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

    const body = await req.json()
    const { content, title, targetKeywords } = body

    if (!content || typeof content !== 'string') {
      throw new Error('Campo "content" e obrigatorio e deve ser uma string.')
    }

    if (!content.trim()) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          score: 0,
          suggestions: ['O artigo esta vazio. Adicione conteudo para analisar o SEO.'],
          metaDescription: '',
          readability: { score: 0, level: 'N/A', details: 'Sem conteudo para analisar.' },
          keywordDensity: {},
          headerStructure: { h1: 0, h2: 0, h3: 0, suggestions: [] },
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!

    // Truncate content to avoid token overflow (keep first ~8000 chars)
    const truncatedContent = content.length > 8000 ? content.substring(0, 8000) + '\n[... conteudo truncado ...]' : content

    const keywordsInstruction = targetKeywords && targetKeywords.length > 0
      ? `\nPalavras-chave alvo: ${targetKeywords.join(', ')}`
      : ''

    const prompt = `Voce e um especialista em SEO para conteudo digital em portugues brasileiro.

Analise o artigo abaixo e gere uma avaliacao SEO detalhada.

TITULO: ${title || '(sem titulo)'}${keywordsInstruction}

CONTEUDO DO ARTIGO:
${truncatedContent}

Avalie os seguintes aspectos:
1. Score SEO geral (0-100): considere titulo, estrutura, legibilidade, uso de palavras-chave, tamanho
2. Sugestoes de otimizacao do titulo (melhorias especificas)
3. Densidade de palavras-chave (identifique termos principais e sua frequencia percentual)
4. Legibilidade (adapte Flesch-Kincaid para portugues: frases curtas, paragrafos concisos, vocabulario acessivel)
5. Sugestao de meta descricao otimizada (max 160 caracteres)
6. Estrutura de cabecalhos (H1, H2, H3 — analise se o conteudo usa marcadores de secao)
7. Sugestoes de links internos (topicos que poderiam ser linkados a outras paginas)

Retorne APENAS um JSON valido (sem markdown, sem explicacoes):
{
  "score": 0,
  "suggestions": ["string - sugestao acionavel de melhoria SEO"],
  "titleSuggestions": ["string - sugestao de melhoria do titulo"],
  "metaDescription": "string - meta descricao otimizada (max 160 chars)",
  "readability": {
    "score": 0,
    "level": "facil|medio|dificil",
    "details": "string - explicacao da legibilidade"
  },
  "keywordDensity": {
    "palavra": 0.0
  },
  "headerStructure": {
    "h1": 0,
    "h2": 0,
    "h3": 0,
    "suggestions": ["string - sugestao de melhoria na estrutura"]
  },
  "internalLinkSuggestions": ["string - topico que pode ser linkado"]
}`

    logger.info('Analyzing SEO for article', { titleLength: title?.length, contentLength: content.length })

    const rawResponse = await withHealthTracking(
      { functionName: 'studio-seo-analyze', actionName: 'analyze_seo' },
      supabaseClient,
      () => callGemini(apiKey, prompt)
    )
    const result = extractJSON(rawResponse)

    logger.info('SEO analysis complete', { score: result.score })

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('studio-seo-analyze error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
