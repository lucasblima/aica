/**
 * Webhook Evolution API Handler
 * Receives events from Evolution API (WhatsApp) and processes them
 * - Onboarding: connection.update → update users table
 * - Message Processing: messages.upsert → RAG + sentiment analysis
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0"

// ============================================================================
// TYPES
// ============================================================================

interface EvolutionWebhookEvent {
  event: string
  instance: string
  data: Record<string, any>
}

interface ConnectionUpdateData {
  instance: string
  status: string
  statusMessage?: string
}

interface MessageUpsertData {
  instanceId: string
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    message?: {
      conversation?: string
      imageMessage?: { caption?: string }
      videoMessage?: { caption?: string }
      documentMessage?: { title?: string }
    }
    messageTimestamp?: number
  }
}

interface SentimentAnalysisResult {
  sentiment: string
  sentimentScore: number
  triggers: string[]
  summary: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Whitelist of allowed origins for CORS - update with your production domains
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://yourdomain.com', // TODO: Replace with actual production domain
  'https://www.yourdomain.com', // TODO: Replace with actual production domain
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-evolution-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const EVOLUTION_WEBHOOK_SECRET = Deno.env.get('EVOLUTION_WEBHOOK_SECRET')
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase configuration is missing')
}

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set')
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Log with timestamp
 */
function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${level}] [webhook-evolution] ${message}${data ? ': ' + JSON.stringify(data) : ''}`)
}

/**
 * Validate HMAC signature (if secret is configured)
 */
function validateWebhookSignature(body: string, signature: string | null): boolean {
  if (!EVOLUTION_WEBHOOK_SECRET) {
    log('WARN', 'EVOLUTION_WEBHOOK_SECRET not configured, skipping signature validation')
    return true
  }

  if (!signature) {
    log('ERROR', 'Webhook signature missing')
    return false
  }

  try {
    const key = new TextEncoder().encode(EVOLUTION_WEBHOOK_SECRET)
    const encoder = new TextEncoder()
    const data = encoder.encode(body)

    // Note: Deno.crypto.subtle for HMAC-SHA256
    return true // Placeholder - signature validation would go here
  } catch (error) {
    log('ERROR', 'Signature validation failed', (error as Error).message)
    return false
  }
}

/**
 * Extract message text from Evolution API message object
 */
function extractMessageText(messageData: any): string {
  if (messageData.message?.conversation) {
    return messageData.message.conversation
  }
  if (messageData.message?.imageMessage?.caption) {
    return messageData.message.imageMessage.caption
  }
  if (messageData.message?.videoMessage?.caption) {
    return messageData.message.videoMessage.caption
  }
  return ''
}

/**
 * Convert WhatsApp JID to phone number
 */
function jidToPhone(remoteJid: string): string {
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

// ============================================================================
// GEMINI SENTIMENT ANALYSIS
// ============================================================================

/**
 * Analyze message sentiment using Gemini
 */
async function analyzeMessageSentiment(text: string): Promise<SentimentAnalysisResult> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
      }
    })

    const prompt = `Analise o sentimento da seguinte mensagem de WhatsApp:

"${text}"

Retorne APENAS um JSON com:
- sentiment: 'positive', 'neutral', ou 'negative'
- sentimentScore: numero de -1 (negativo) a 1 (positivo)
- triggers: lista de ate 3 gatilhos (work, health, relationship, finance, personal_growth, etc)
- summary: resumo em 1 frase (max 100 caracteres)

Responda APENAS com JSON valido, sem explicacoes.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()

    // Parse JSON
    const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    return {
      sentiment: parsed.sentiment || 'neutral',
      sentimentScore: Math.max(-1, Math.min(1, parsed.sentimentScore || 0)),
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : [],
      summary: parsed.summary || '',
    }
  } catch (error) {
    log('ERROR', 'Sentiment analysis failed', (error as Error).message)
    // Return neutral sentiment on error
    return {
      sentiment: 'neutral',
      sentimentScore: 0,
      triggers: [],
      summary: 'Analysis failed',
    }
  }
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding for message text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'embedding-001',
    })

    const result = await model.embedContent(text)
    return result.embedding.values
  } catch (error) {
    log('ERROR', 'Embedding generation failed', (error as Error).message)
    // Return zero vector on error
    return new Array(768).fill(0)
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Handle connection.update event (onboarding)
 */
async function handleConnectionUpdate(data: ConnectionUpdateData, userId?: string) {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { status, instance } = data

    log('INFO', 'Processing connection update', { status, instance })

    if (status === 'open') {
      // Update user status to active
      if (userId) {
        const { error } = await supabase
          .from('users')
          .update({
            status: 'active',
            instance_name: instance,
            last_connected_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          log('ERROR', 'Failed to update user status', error)
        } else {
          log('INFO', 'User status updated', { userId, instance })
        }
      }
    } else if (status === 'closed' || status === 'disconnected') {
      // Update user status to inactive
      if (userId) {
        const { error } = await supabase
          .from('users')
          .update({
            status: 'inactive',
            last_disconnected_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          log('ERROR', 'Failed to update user disconnection status', error)
        } else {
          log('INFO', 'User disconnected', { userId })
        }
      }
    }
  } catch (error) {
    log('ERROR', 'handleConnectionUpdate failed', (error as Error).message)
  }
}

/**
 * Handle messages.upsert event (message processing)
 */
async function handleMessageUpsert(data: MessageUpsertData, userId?: string) {
  try {
    if (!userId) {
      log('WARN', 'No userId provided for message processing, skipping')
      return
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const messageData = data.data
    const remoteJid = messageData.key.remoteJid
    const fromMe = messageData.key.fromMe

    // Skip bot's own messages
    if (fromMe) {
      log('INFO', 'Skipping bot message')
      return
    }

    const messageText = extractMessageText(messageData)

    if (!messageText || messageText.trim().length < 2) {
      log('WARN', 'Message text is empty or too short, skipping')
      return
    }

    log('INFO', 'Processing incoming message', { remoteJid, textLength: messageText.length })

    // 1. Generate embedding
    const embedding = await generateEmbedding(messageText)

    // 2. Analyze sentiment
    const sentiment = await analyzeMessageSentiment(messageText)

    // 3. Save to message_embeddings table
    const { data: embeddingData, error: embeddingError } = await supabase
      .from('message_embeddings')
      .insert({
        user_id: userId,
        instance_name: data.instanceId,
        remote_jid: jidToPhone(remoteJid),
        message_text: messageText,
        embedding: embedding,
        sentiment: sentiment,
        message_date: new Date(messageData.messageTimestamp ? messageData.messageTimestamp * 1000 : Date.now()).toISOString(),
      })
      .select('id')
      .single()

    if (embeddingError) {
      log('ERROR', 'Failed to save embedding', embeddingError)
      return
    }

    const embeddingId = embeddingData?.id

    // 4. Create memory entry
    const { error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        content: messageText,
        sentiment: sentiment.sentiment,
        created_from: 'whatsapp',
        source_instance: data.instanceId,
        message_embedding_id: embeddingId,
        tags: sentiment.triggers || [],
      })

    if (memoryError) {
      log('ERROR', 'Failed to create memory', memoryError)
    } else {
      log('INFO', 'Memory created successfully', { embeddingId })
    }

    // 5. Update or create contact in contact_network
    const phone = jidToPhone(remoteJid)
    const healthScore = sentiment.sentimentScore >= 0.5 ? 1 : sentiment.sentimentScore <= -0.5 ? 0 : 0.5

    const { error: contactError } = await supabase
      .from('contact_network')
      .upsert({
        user_id: userId,
        phone: phone,
        last_interaction: new Date().toISOString(),
        health_score: healthScore,
      }, {
        onConflict: 'user_id,phone'
      })

    if (contactError) {
      log('ERROR', 'Failed to update contact_network', contactError)
    } else {
      log('INFO', 'Contact network updated', { phone, healthScore })
    }

  } catch (error) {
    log('ERROR', 'handleMessageUpsert failed', (error as Error).message)
  }
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  const CORS_HEADERS = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: CORS_HEADERS }
    )
  }

  try {
    // Get request body
    const bodyText = await req.text()
    const body = JSON.parse(bodyText) as EvolutionWebhookEvent

    // Validate signature
    const signature = req.headers.get('x-evolution-signature')
    if (!validateWebhookSignature(bodyText, signature)) {
      log('WARN', 'Invalid webhook signature')
      // Note: In production, return 401 Unauthorized
      // return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: CORS_HEADERS })
    }

    const { event, instance, data } = body

    log('INFO', 'Webhook received', { event, instance })

    // Extract userId from instance name (format: userid_instancename)
    // This is a simplified approach - in production, query database for the mapping
    const parts = instance.split('_')
    const userId = parts.length > 1 ? parts[0] : undefined

    // Route to appropriate handler
    switch (event) {
      case 'connection.update':
        await handleConnectionUpdate(data as ConnectionUpdateData, userId)
        break

      case 'messages.upsert':
        await handleMessageUpsert(data as MessageUpsertData, userId)
        break

      case 'connection.update':
      case 'qr.updated':
      case 'messages.delete':
      case 'presence.update':
        // Log but don't process other events
        log('INFO', `Event ${event} received but not processed`)
        break

      default:
        log('WARN', `Unknown event type: ${event}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: CORS_HEADERS }
    )

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Webhook processing failed', err.message)

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error'
      }),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
