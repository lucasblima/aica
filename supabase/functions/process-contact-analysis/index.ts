/**
 * Process Contact Analysis Edge Function
 *
 * Main processing pipeline:
 * 1. Validates user authentication and credits
 * 2. Fetches WhatsApp messages for the contact
 * 3. Spends credits atomically
 * 4. Analyzes conversation with Gemini AI
 * 5. Stores results in contact_analysis table
 * 6. Updates contact_network with health score
 * 7. Awards XP for gamification
 *
 * Endpoint: POST /functions/v1/process-contact-analysis
 * Body: { contactId: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

interface ProcessRequest {
  contactId: string
}

interface GeminiAnalysisResult {
  healthScore: number
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative'
    score: number
    breakdown: { positive: number; neutral: number; negative: number }
  }
  topics: Array<{ name: string; frequency: number; sentiment: string }>
  actionItems: Array<{ text: string; priority: string; dueHint?: string }>
  insights: {
    communicationStyle: string
    responsePatterns: Record<string, string>
    recommendations: string[]
  }
  keyMoments: Array<{ date?: string; summary: string; importance: number }>
}

/**
 * Calculate credit cost (same as estimate function)
 */
function calculateProcessingCost(messageCount: number): number {
  const BASE_COST = 3
  const tiers = [
    { max: 50, rate: 0 },
    { max: 200, rate: 0.02 },
    { max: 500, rate: 0.03 },
    { max: Infinity, rate: 0.02 }
  ]

  let cost = BASE_COST
  let remaining = messageCount
  let prevMax = 0

  for (const tier of tiers) {
    const tierMessages = Math.min(remaining, tier.max - prevMax)
    if (tierMessages <= 0) break
    cost += tierMessages * tier.rate
    remaining -= tierMessages
    prevMax = tier.max
  }

  return Math.min(Math.ceil(cost), 25)
}

/**
 * Analyze conversation with Gemini AI
 */
async function analyzeWithGemini(
  messages: Array<{ content: string; from_me: boolean; timestamp: string }>,
  contactName: string
): Promise<GeminiAnalysisResult> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  // Prepare conversation for analysis (limit tokens)
  const conversationText = messages
    .slice(-500) // Last 500 messages max
    .map(m => `[${m.from_me ? 'Usuário' : contactName}]: ${m.content}`)
    .join('\n')

  const prompt = `Analise esta conversa do WhatsApp e forneça insights estruturados.

Contato: ${contactName}
Total de mensagens: ${messages.length}

Conversa (mais recente):
${conversationText}

Forneça a análise no seguinte formato JSON exato:
{
  "healthScore": <número inteiro de 0-100>,
  "sentiment": {
    "overall": "<positive|neutral|negative>",
    "score": <0.0-1.0>,
    "breakdown": {
      "positive": <porcentagem>,
      "neutral": <porcentagem>,
      "negative": <porcentagem>
    }
  },
  "topics": [
    { "name": "<tópico>", "frequency": <contagem>, "sentiment": "<pos|neu|neg>" }
  ],
  "actionItems": [
    { "text": "<ação em português>", "priority": "<high|medium|low>", "dueHint": "<opcional>" }
  ],
  "insights": {
    "communicationStyle": "<descrição em português>",
    "responsePatterns": {
      "avgResponseTime": "<descrição>",
      "activeHours": "<descrição>"
    },
    "recommendations": ["<recomendação1 em português>", "<recomendação2>"]
  },
  "keyMoments": [
    { "date": "<data ISO se conhecida>", "summary": "<o que aconteceu em português>", "importance": <1-10> }
  ]
}

Diretrizes do Health Score:
- 80-100: Relacionamento forte e ativo com sentimento positivo
- 60-79: Bom relacionamento, algum espaço para melhoria
- 40-59: Relacionamento moderado, atenção necessária
- 20-39: Relacionamento fraco, intervenção recomendada
- 0-19: Crítico, relacionamento em risco

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`

  console.log('[process-contact-analysis] Calling Gemini API...')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 2048
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[process-contact-analysis] Gemini API error:', errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  console.log('[process-contact-analysis] Gemini response received')

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[process-contact-analysis] Failed to parse Gemini response:', text)
    throw new Error('Failed to parse Gemini response')
  }

  try {
    return JSON.parse(jsonMatch[0])
  } catch (parseError) {
    console.error('[process-contact-analysis] JSON parse error:', parseError)
    // Return default values on parse error
    return {
      healthScore: 50,
      sentiment: { overall: 'neutral', score: 0.5, breakdown: { positive: 33, neutral: 34, negative: 33 } },
      topics: [],
      actionItems: [],
      insights: { communicationStyle: 'Não determinado', responsePatterns: {}, recommendations: [] },
      keyMoments: []
    }
  }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse request
    const { contactId }: ProcessRequest = await req.json()

    if (!contactId) {
      return new Response(
        JSON.stringify({ success: false, error: 'contactId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[process-contact-analysis] Starting analysis for contact ${contactId}, user ${user.id}`)

    // 1. Get contact info
    const { data: contact, error: contactError } = await supabase
      .from('contact_network')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single()

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get messages (or generate mock data if table doesn't exist)
    let messages: Array<{ content: string; from_me: boolean; timestamp: string }> = []
    let messageCount = 0

    try {
      const { data: msgData, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('content, from_me, timestamp')
        .eq('contact_whatsapp_id', contact.whatsapp_id)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true })

      if (!msgError && msgData) {
        messages = msgData
        messageCount = msgData.length
      }
    } catch {
      console.log('[process-contact-analysis] whatsapp_messages table not available')
      // Use placeholder for demo - in production, sync messages first
      messageCount = 50
    }

    // 3. Calculate and spend credits
    const creditCost = calculateProcessingCost(messageCount)

    console.log(`[process-contact-analysis] Spending ${creditCost} credits for ${messageCount} messages`)

    const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: creditCost,
      p_reference_id: contactId,
      p_reference_type: 'contact_analysis',
      p_metadata: { message_count: messageCount }
    })

    if (spendError) {
      console.error('[process-contact-analysis] Spend credits error:', spendError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const spendRow = spendResult?.[0]
    if (!spendRow?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: spendRow?.message || 'Insufficient credits',
          userBalance: spendRow?.new_balance
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Create analysis record (status: processing)
    const { data: analysis, error: analysisError } = await supabase
      .from('contact_analysis')
      .insert({
        user_id: user.id,
        contact_id: contactId,
        status: 'processing',
        credits_spent: creditCost,
        messages_analyzed: messageCount,
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (analysisError) {
      console.error('[process-contact-analysis] Create analysis error:', analysisError)
      // Refund credits on failure
      await supabase.rpc('earn_credits', {
        p_user_id: user.id,
        p_amount: creditCost,
        p_type: 'admin_adjustment',
        p_reference_id: contactId,
        p_metadata: { reason: 'Refund due to analysis creation failure' }
      })
      throw analysisError
    }

    // 5. Call Gemini for analysis
    let geminiResult: GeminiAnalysisResult

    if (messages.length > 0) {
      geminiResult = await analyzeWithGemini(messages, contact.name)
    } else {
      // Demo mode: generate placeholder result
      console.log('[process-contact-analysis] No messages, generating placeholder analysis')
      geminiResult = {
        healthScore: 65,
        sentiment: {
          overall: 'neutral',
          score: 0.6,
          breakdown: { positive: 40, neutral: 45, negative: 15 }
        },
        topics: [
          { name: 'Trabalho', frequency: 10, sentiment: 'pos' },
          { name: 'Pessoal', frequency: 5, sentiment: 'neu' }
        ],
        actionItems: [
          { text: 'Agendar próxima conversa', priority: 'medium' },
          { text: 'Sincronizar mensagens do WhatsApp', priority: 'high' }
        ],
        insights: {
          communicationStyle: 'Análise pendente - sincronize as mensagens primeiro',
          responsePatterns: {},
          recommendations: [
            'Sincronize suas mensagens do WhatsApp para uma análise completa',
            'Mantenha contato regular para melhorar o health score'
          ]
        },
        keyMoments: []
      }
    }

    // 5b. Fire-and-forget usage tracking for billing
    supabase.rpc('log_interaction', {
      p_user_id: user.id,
      p_action: 'whatsapp_sentiment',
      p_module: 'connections',
      p_model: 'gemini-2.5-flash',
      p_tokens_in: 0,
      p_tokens_out: 0,
    }).then(() => {
      console.log('[process-contact-analysis] Logged interaction')
    }).catch((err: Error) => {
      console.warn('[process-contact-analysis] Failed to log interaction:', err.message)
    })

    // 6. Update analysis with results
    const { error: updateError } = await supabase
      .from('contact_analysis')
      .update({
        status: 'completed',
        health_score: geminiResult.healthScore,
        sentiment_summary: geminiResult.sentiment,
        topics: geminiResult.topics,
        action_items: geminiResult.actionItems,
        relationship_insights: geminiResult.insights,
        key_moments: geminiResult.keyMoments,
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', analysis.id)

    if (updateError) {
      console.error('[process-contact-analysis] Update analysis error:', updateError)
    }

    // 7. Update contact_network with health score
    await supabase
      .from('contact_network')
      .update({
        health_score: geminiResult.healthScore,
        last_analysis_id: analysis.id,
        last_analyzed_at: new Date().toISOString()
      })
      .eq('id', contactId)

    // 8. Award XP for processing (gamification integration)
    const baseXp = 25
    const bonusXp = Math.min(25, Math.floor(messageCount / 100) * 5)
    const totalXp = baseXp + bonusXp

    try {
      await supabase.rpc('award_user_xp', {
        p_user_id: user.id,
        p_xp_amount: totalXp,
        p_source: 'contact_analysis',
        p_description: `Analyzed contact: ${contact.name}`
      })
      console.log(`[process-contact-analysis] Awarded ${totalXp} XP`)
    } catch (xpError) {
      // XP award is non-critical, continue on error
      console.log('[process-contact-analysis] XP award skipped (function may not exist)')
    }

    const durationMs = Date.now() - startTime

    console.log(`[process-contact-analysis] Completed in ${durationMs}ms, health score: ${geminiResult.healthScore}`)

    return new Response(JSON.stringify({
      success: true,
      analysisId: analysis.id,
      healthScore: geminiResult.healthScore,
      sentiment: geminiResult.sentiment,
      topics: geminiResult.topics,
      actionItems: geminiResult.actionItems,
      insights: geminiResult.insights,
      creditsSpent: creditCost,
      newBalance: spendRow.new_balance,
      durationMs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    console.error('[process-contact-analysis] Error:', err.message)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
