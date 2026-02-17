/**
 * Edge Function: studio-analytics-insights
 * Studio Creative Hub — Analytics Phase
 *
 * Purpose:
 * - Analyze content performance metrics from studio_analytics table
 * - Identify trends, top content, and improvement recommendations
 * - Generate actionable insights powered by AI
 *
 * Input: { period?: string } (default '30d')
 * Output: { trends, topContent, recommendations, overallScore }
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

function getPeriodDate(period: string): string {
  const now = new Date()
  const match = period.match(/^(\d+)([dhm])$/)
  if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [, amount, unit] = match
  const ms = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
  }[unit] || 24 * 60 * 60 * 1000

  return new Date(now.getTime() - parseInt(amount) * ms).toISOString()
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

    const body = await req.json().catch(() => ({}))
    const period = body.period || '30d'
    const sinceDate = getPeriodDate(period)

    // Fetch analytics data for the user
    const { data: analytics, error: fetchError } = await supabaseClient
      .from('studio_analytics')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })

    if (fetchError) throw new Error(`Erro ao buscar analytics: ${fetchError.message}`)

    // If no data, return empty insights
    if (!analytics || analytics.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          trends: ['Sem dados suficientes para analise no periodo selecionado'],
          topContent: [],
          recommendations: ['Publique mais conteudo para gerar insights de performance'],
          overallScore: 0,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')!
    const metricsJSON = JSON.stringify(analytics.slice(0, 50)) // Limit to avoid token overflow

    const prompt = `Voce e um analista de performance de conteudo digital especializado no mercado brasileiro.

Analise as metricas de conteudo abaixo e gere insights acionaveis.

METRICAS (periodo: ${period}):
${metricsJSON}

Identifique:
1. Tendencias de performance (crescimento, declinio, padroes)
2. Conteudo de melhor performance (e o que torna ele diferente)
3. Recomendacoes praticas de melhoria
4. Score geral de performance (0-100)

Retorne APENAS um JSON valido (sem markdown, sem explicacoes):
{
  "trends": ["string - tendencia identificada"],
  "topContent": ["string - conteudo destaque com explicacao"],
  "recommendations": ["string - recomendacao acionavel"],
  "overallScore": 0
}`

    const rawResponse = await callGemini(apiKey, prompt)
    const result = extractJSON(rawResponse)

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('studio-analytics-insights error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
