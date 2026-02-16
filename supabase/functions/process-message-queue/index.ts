/**
 * Process Message Queue Edge Function
 * Issue #132: AICA Billing, Rate Limiting & Unified Chat System
 *
 * Processes queued messages when users have available tokens.
 * Called by pg_cron every 5 minutes or when tokens become available.
 *
 * @endpoint POST /functions/v1/process-message-queue
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1'
import { getCorsHeaders } from '../_shared/cors.ts'

// ============================================================================
// TYPES
// ============================================================================

interface QueuedMessage {
  id: string
  user_id: string
  message_content: string
  context_messages?: Array<{ role: string; content: string }>
  preferred_model_tier: 'premium' | 'standard' | 'lite'
  status: string
  priority: number
  estimated_tokens: number
  queued_at: string
}

interface ProcessingResult {
  messageId: string
  success: boolean
  response?: string
  error?: string
  tokensUsed?: number
  tierUsed?: string
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
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const genAI = new GoogleGenerativeAI(geminiApiKey)

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const batchSize = Math.min(body.batch_size || 10, 50)
    const specificUserId = body.user_id // Optional: process only for specific user

    console.log(`[process-message-queue] Starting batch processing (size: ${batchSize})`)

    // Get users with available tokens and queued messages
    const { data: usersWithTokens, error: usersError } = await supabase.rpc(
      'get_users_with_available_tokens'
    )

    if (usersError) {
      console.error('[process-message-queue] Error getting users:', usersError)
      throw usersError
    }

    if (!usersWithTokens || usersWithTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users with available tokens',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter to specific user if requested
    const targetUsers = specificUserId
      ? usersWithTokens.filter((u: { user_id: string }) => u.user_id === specificUserId)
      : usersWithTokens

    console.log(`[process-message-queue] Found ${targetUsers.length} users with available tokens`)

    const results: ProcessingResult[] = []
    let totalProcessed = 0

    // Process messages for each user with available tokens
    for (const userTokens of targetUsers) {
      if (totalProcessed >= batchSize) break

      const { user_id, premium_remaining, standard_remaining, lite_remaining } = userTokens

      // Get queued messages for this user
      const { data: queuedMessages, error: queueError } = await supabase
        .from('message_queue')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'queued')
        .order('priority', { ascending: false })
        .order('queued_at', { ascending: true })
        .limit(batchSize - totalProcessed)

      if (queueError) {
        console.error(`[process-message-queue] Error getting queue for ${user_id}:`, queueError)
        continue
      }

      if (!queuedMessages || queuedMessages.length === 0) continue

      // Process each message
      for (const message of queuedMessages as QueuedMessage[]) {
        if (totalProcessed >= batchSize) break

        // Determine which tier to use based on availability
        let tierToUse: 'premium' | 'standard' | 'lite' | null = null
        const estimatedTokens = message.estimated_tokens || 1000

        if (message.preferred_model_tier === 'premium' && premium_remaining >= estimatedTokens) {
          tierToUse = 'premium'
        } else if (
          (message.preferred_model_tier === 'premium' ||
            message.preferred_model_tier === 'standard') &&
          standard_remaining >= estimatedTokens
        ) {
          tierToUse = 'standard'
        } else if (lite_remaining >= estimatedTokens) {
          tierToUse = 'lite'
        }

        if (!tierToUse) {
          // No tokens available for this message
          continue
        }

        // Mark message as processing
        await supabase
          .from('message_queue')
          .update({ status: 'processing' })
          .eq('id', message.id)

        try {
          // Process the message with AI
          const result = await processMessageWithAI(
            genAI,
            message,
            tierToUse,
            supabase
          )

          results.push(result)
          totalProcessed++

          // Update message with result
          if (result.success) {
            await supabase.from('message_queue').update({
              status: 'completed',
              response_content: result.response,
              processed_at: new Date().toISOString(),
            }).eq('id', message.id)

            // Record token usage
            if (result.tokensUsed) {
              await supabase.rpc('increment_token_usage', {
                p_user_id: user_id,
                p_tier: tierToUse,
                p_tokens: result.tokensUsed,
              })
            }
          } else {
            await supabase.from('message_queue').update({
              status: 'failed',
              error_message: result.error,
              processed_at: new Date().toISOString(),
            }).eq('id', message.id)
          }
        } catch (err) {
          const error = err as Error
          console.error(`[process-message-queue] Error processing message ${message.id}:`, error)

          // Mark as failed but keep for retry
          await supabase.from('message_queue').update({
            status: 'queued', // Back to queue for retry
            error_message: error.message,
          }).eq('id', message.id)

          results.push({
            messageId: message.id,
            success: false,
            error: error.message,
          })
        }
      }
    }

    console.log(`[process-message-queue] Processed ${totalProcessed} messages`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const error = err as Error
    console.error('[process-message-queue] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// ============================================================================
// AI PROCESSING
// ============================================================================

async function processMessageWithAI(
  genAI: GoogleGenerativeAI,
  message: QueuedMessage,
  tier: 'premium' | 'standard' | 'lite',
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  const config = MODEL_CONFIG[tier]
  const model = genAI.getGenerativeModel({ model: config.model })

  // Build conversation history
  const history = message.context_messages?.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  })) || []

  // Create chat session
  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    },
  })

  // Get system prompt for Aica
  const systemContext = await getAicaSystemPrompt(supabase, message.user_id)

  // Send message with system context
  const prompt = systemContext
    ? `${systemContext}\n\nUser message: ${message.message_content}`
    : message.message_content

  const result = await chat.sendMessage(prompt)
  const response = result.response.text()

  // Estimate tokens used (rough calculation)
  const inputTokens = Math.ceil((prompt.length + JSON.stringify(history).length) / 4)
  const outputTokens = Math.ceil(response.length / 4)
  const totalTokens = inputTokens + outputTokens

  return {
    messageId: message.id,
    success: true,
    response,
    tokensUsed: totalTokens,
    tierUsed: tier,
  }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

async function getAicaSystemPrompt(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  // Get user's name for personalization
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  const userName = profile?.full_name?.split(' ')[0] || 'there'

  return `You are Aica, a helpful AI assistant integrated into the Aica Life OS productivity platform.

Your role is to help ${userName} with:
- Task management and productivity
- Calendar and scheduling
- Podcast production workflows
- Personal knowledge management
- General questions and assistance

Guidelines:
- Be concise and helpful
- Use Brazilian Portuguese when the user writes in Portuguese
- Reference specific Aica features when relevant (Atlas for tasks, Journey for moments, Studio for podcasts)
- Be warm but professional
- If you don't know something, say so

Current date: ${new Date().toLocaleDateString('pt-BR')}`
}
