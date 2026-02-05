/**
 * Chat with Aica Edge Function
 * Issue #132: AICA Billing, Rate Limiting & Unified Chat System
 *
 * Handles real-time chat with Aica using Gemini models.
 * Supports multiple model tiers: premium, standard, lite.
 *
 * @endpoint POST /functions/v1/chat-with-aica
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1'

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const MODEL_CONFIG = {
  premium: {
    model: 'gemini-1.5-pro',
    maxTokens: 8192,
    temperature: 0.7,
  },
  standard: {
    model: 'gemini-1.5-flash',
    maxTokens: 4096,
    temperature: 0.7,
  },
  lite: {
    model: 'gemini-1.5-flash',
    maxTokens: 1024,
    temperature: 0.5,
  },
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const body = await req.json()
    const {
      message,
      session_id,
      tier = 'standard',
      context_messages = [],
    } = body

    if (!message) {
      throw new Error('Message is required')
    }

    console.log(`[chat-with-aica] Processing message for user ${user.id}, tier: ${tier}`)

    // Get model configuration
    const config = MODEL_CONFIG[tier as keyof typeof MODEL_CONFIG] || MODEL_CONFIG.standard

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: config.model })

    // Build system prompt
    const systemPrompt = await buildSystemPrompt(supabase, user.id)

    // Build conversation history
    const history = context_messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    // Create chat session
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: config.maxTokens,
        temperature: config.temperature,
      },
    })

    // Send message with system context
    const prompt = `${systemPrompt}\n\nUsuário: ${message}`
    const result = await chat.sendMessage(prompt)
    const response = result.response.text()

    // Estimate tokens used
    const inputTokens = Math.ceil((prompt.length + JSON.stringify(history).length) / 4)
    const outputTokens = Math.ceil(response.length / 4)
    const totalTokens = inputTokens + outputTokens

    console.log(`[chat-with-aica] Response generated, tokens: ${totalTokens}`)

    return new Response(
      JSON.stringify({
        success: true,
        response,
        tokens_used: totalTokens,
        model_tier: tier,
        model_name: config.model,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const error = err as Error
    console.error('[chat-with-aica] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

async function buildSystemPrompt(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single()

  const userName = profile?.full_name?.split(' ')[0] || 'there'

  // Get today's tasks count
  const today = new Date().toISOString().split('T')[0]
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('scheduled_date', today)
    .lte('scheduled_date', today)

  // Get recent moments
  const { data: recentMoments } = await supabase
    .from('moments')
    .select('title')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)

  const momentsContext = recentMoments?.length
    ? `Momentos recentes: ${recentMoments.map((m) => m.title).join(', ')}`
    : ''

  return `Você é Aica, uma assistente de IA integrada ao Aica Life OS - uma plataforma de produtividade pessoal.

Seu papel é ajudar ${userName} com:
- Gerenciamento de tarefas e produtividade (módulo Atlas)
- Momentos e journaling (módulo Journey)
- Produção de podcasts (módulo Studio)
- Organização geral e planejamento

Contexto atual:
- Data: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Tarefas pendentes hoje: ${taskCount || 0}
${momentsContext}

Diretrizes:
- Seja concisa e útil
- Use português brasileiro
- Referencie módulos específicos do Aica quando relevante
- Seja gentil mas profissional
- Se não souber algo, admita
- Evite respostas muito longas quando não necessário

Responda à mensagem do usuário:`
}
