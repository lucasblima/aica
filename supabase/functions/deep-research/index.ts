/**
 * Deep Research Edge Function
 *
 * Implements deep research logic using Google Gemini API.
 * Receives a theme/topic and returns comprehensive research results.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"
import { createClient } from "npm:@supabase/supabase-js@2"
import { getCorsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not found in environment variables')
}

interface DeepResearchRequest {
  theme: string
  guestName?: string
  additionalContext?: string
  depth?: 'shallow' | 'medium' | 'deep'
}

interface ResearchResult {
  biography: string
  keyFacts: string[]
  controversies: Array<{
    title: string
    summary: string
    sentiment: 'positive' | 'negative' | 'neutral'
    date?: string
  }>
  recentWork: string[]
  sources: Array<{
    title: string
    url?: string
    snippet: string
    reliability: 'high' | 'medium' | 'low'
  }>
}

/**
 * Generate research plan based on theme and depth
 */
function generateResearchPlan(theme: string, guestName?: string, depth: string = 'medium'): string {
  const depthInstructions = {
    shallow: '3-5 perguntas básicas sobre',
    medium: '7-10 perguntas detalhadas sobre',
    deep: '15-20 perguntas aprofundadas sobre'
  }

  const instruction = depthInstructions[depth as keyof typeof depthInstructions] || depthInstructions.medium

  const basePlan = guestName && theme
    ? `Preciso fazer uma pesquisa profunda sobre ${guestName} com foco em "${theme}".`
    : guestName
    ? `Preciso fazer uma pesquisa profunda sobre ${guestName}.`
    : `Preciso fazer uma pesquisa profunda sobre "${theme}".`

  return `${basePlan}

Gere um plano de pesquisa estruturado com ${instruction} o tema.

O plano deve incluir:
1. Biografia e contexto histórico
2. Fatos-chave e realizações principais
3. Controvérsias ou pontos polêmicos (se houver)
4. Trabalhos recentes ou atuais
5. Áreas de especialização

Formato de saída: Lista numerada de perguntas específicas para pesquisa.`
}

/**
 * Execute deep research using Gemini
 */
async function executeDeepResearch(
  genAI: GoogleGenerativeAI,
  theme: string,
  guestName?: string,
  additionalContext?: string,
  depth: string = 'medium'
): Promise<ResearchResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  // Step 1: Generate research plan
  const planPrompt = generateResearchPlan(theme, guestName, depth)
  console.log('[Deep Research] Generating research plan...')

  const planResult = await model.generateContent(planPrompt)
  const researchPlan = planResult.response.text()
  console.log('[Deep Research] Research plan generated')

  // Track usage from plan generation
  const planUsage = planResult.response.usageMetadata

  // Step 2: Execute comprehensive research
  const researchPrompt = `Com base no seguinte plano de pesquisa:

${researchPlan}

${additionalContext ? `\nContexto adicional: ${additionalContext}` : ''}

Realize uma pesquisa aprofundada e retorne um JSON estruturado com os seguintes campos:

{
  "biography": "Biografia completa (3-5 parágrafos)",
  "keyFacts": ["Fato 1", "Fato 2", "Fato 3", ...],
  "controversies": [
    {
      "title": "Título da controvérsia",
      "summary": "Resumo da controvérsia",
      "sentiment": "positive|negative|neutral",
      "date": "Data aproximada (opcional)"
    }
  ],
  "recentWork": ["Trabalho recente 1", "Trabalho recente 2", ...],
  "sources": [
    {
      "title": "Título da fonte",
      "url": "URL (se disponível)",
      "snippet": "Trecho relevante",
      "reliability": "high|medium|low"
    }
  ]
}

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown ou formatação extra
- Certifique-se de que o JSON seja válido
- Se não houver controvérsias, retorne um array vazio
- Inclua pelo menos 5-10 key facts
- Biografia deve ser informativa e bem escrita`

  console.log('[Deep Research] Executing deep research...')
  const researchResult = await model.generateContent(researchPrompt)
  let researchText = researchResult.response.text()

  // Track usage from research execution
  const researchUsage = researchResult.response.usageMetadata

  // Combine usage metadata from both API calls
  const combinedUsage = {
    promptTokenCount: (planUsage?.promptTokenCount || 0) + (researchUsage?.promptTokenCount || 0),
    candidatesTokenCount: (planUsage?.candidatesTokenCount || 0) + (researchUsage?.candidatesTokenCount || 0),
    totalTokenCount: (planUsage?.totalTokenCount || 0) + (researchUsage?.totalTokenCount || 0)
  }

  // Clean JSON response (remove markdown formatting if present)
  researchText = researchText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  console.log('[Deep Research] Research completed')

  try {
    const parsedResult: ResearchResult = JSON.parse(researchText)
    return {
      ...parsedResult,
      __usageMetadata: combinedUsage
    } as any
  } catch (error) {
    console.error('[Deep Research] Failed to parse JSON:', error)
    console.error('[Deep Research] Raw response:', researchText)

    // Fallback: return a basic structure
    return {
      biography: researchText.substring(0, 500),
      keyFacts: ['Pesquisa gerada, mas houve erro no parse do JSON'],
      controversies: [],
      recentWork: [],
      sources: [],
      __usageMetadata: combinedUsage
    } as any
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    // Validate API key
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Parse request body
    const { theme, guestName, additionalContext, depth }: DeepResearchRequest = await req.json()

    if (!theme && !guestName) {
      return new Response(
        JSON.stringify({ error: 'Either theme or guestName is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    console.log(`[Deep Research] Starting research for: ${guestName || theme}`)

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    // Execute deep research
    const result = await executeDeepResearch(
      genAI,
      theme,
      guestName,
      additionalContext,
      depth
    )

    console.log('[Deep Research] Research completed successfully')

    // Extract usageMetadata from the research result (if available)
    const usageMetadata = (result as any)?.__usageMetadata || null

    // Fire-and-forget usage tracking
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const authHeader = req.headers.get('Authorization')
        if (authHeader) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          // Extract user ID from JWT
          const token = authHeader.replace('Bearer ', '')
          const payloadB64 = token.split('.')[1]
          const payload = JSON.parse(atob(payloadB64))
          const userId = payload.sub

          if (userId) {
            supabase.rpc('log_interaction', {
              p_user_id: userId,
              p_action: 'research_guest',
              p_module: 'studio',
              p_model: 'gemini-2.5-flash',
              p_tokens_in: usageMetadata?.promptTokenCount || 0,
              p_tokens_out: usageMetadata?.candidatesTokenCount || 0,
            }).then(() => {
              console.log('[Deep Research] Logged interaction')
            }).catch((err: Error) => {
              console.warn('[Deep Research] Failed to log interaction:', err.message)
            })
          }
        }
      } catch (trackErr) {
        console.warn('[Deep Research] Usage tracking error:', trackErr)
      }
    }

    // Return result
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          theme,
          guestName,
          depth: depth || 'medium',
          timestamp: new Date().toISOString()
        },
        ...(usageMetadata && { usageMetadata })
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('[Deep Research] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
