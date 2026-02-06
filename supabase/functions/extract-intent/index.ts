/**
 * Edge Function: extract-intent
 * Issue #91: Extract intent from WhatsApp messages (privacy-first approach)
 *
 * Purpose:
 * - Generate intent summary (safe for display, no raw text storage)
 * - Classify message category and sentiment
 * - Extract temporal references (dates, times)
 * - Generate 768-dimensional embedding for semantic search
 * - Update whatsapp_messages table with extracted intent
 *
 * CRITICAL PRIVACY REQUIREMENT:
 * - rawText is NEVER stored in database
 * - Only processed intent metadata and embedding are persisted
 * - Complies with WhatsApp Terms of Service and LGPD data minimization
 *
 * Called by:
 * - webhook-evolution (on new message received)
 * - Frontend (for semantic search queries - with skipDbUpdate=true)
 *
 * Gemini Models:
 * - gemini-1.5-flash: Intent extraction (cost-effective)
 * - text-embedding-004: Embedding generation (768 dimensions)
 *
 * Endpoint: POST /functions/v1/extract-intent
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

// =============================================================================
// TYPES
// =============================================================================

// Intent categories matching database enum whatsapp_intent_category
type IntentCategory =
  | 'question'      // User asking for information
  | 'response'      // User providing answer or feedback
  | 'scheduling'    // Time-related requests (meeting, reminder)
  | 'document'      // Sharing files or requesting documents
  | 'audio'         // Voice messages or audio-specific content
  | 'social'        // Greetings, casual conversation
  | 'request'       // Action requests (do something, send something)
  | 'update'        // Status updates or notifications
  | 'media'         // Image, video, sticker sharing

// Sentiment classification matching database enum whatsapp_intent_sentiment
type IntentSentiment = 'positive' | 'neutral' | 'negative' | 'urgent'

/**
 * Request body for extract-intent Edge Function
 */
interface IntentExtractionRequest {
  messageId: string           // UUID of message in whatsapp_messages table
  rawText: string             // Raw message text (WILL BE DISCARDED after processing)
  mediaType?: string          // image, audio, video, document, sticker
  contactName?: string        // Contact name for context
  conversationContext?: string[] // Last 3 messages for context (optional)
  skipDbUpdate?: boolean      // If true, only return intent without updating DB (for search queries)
}

/**
 * Extracted intent structure
 */
interface ExtractedIntent {
  summary: string             // Human-readable summary (max 100 chars)
  category: IntentCategory    // Classification of message type
  sentiment: IntentSentiment  // Sentiment analysis
  urgency: number             // 1-5 scale (5 = critical)
  topic?: string              // Main topic/keyword (max 50 chars)
  actionRequired: boolean     // True if user needs to respond
  mentionedDate?: string      // YYYY-MM-DD if date mentioned
  mentionedTime?: string      // HH:mm if time mentioned
  confidence: number          // 0.0-1.0 confidence score
}

/**
 * Response from extract-intent Edge Function
 */
interface IntentExtractionResponse {
  success: boolean
  intent?: ExtractedIntent
  error?: string
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// =============================================================================
// LOGGING
// =============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [extract-intent] ${message}${logData}`)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Call Gemini API with retry logic
 * Handles 429 (rate limit) and 500 (server error) with exponential backoff
 */
async function callGeminiWithRetry(
  url: string,
  body: object,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        return response
      }

      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * RETRY_DELAY_MS
        log('WARN', `Rate limited, retrying in ${delay}ms`, { attempt: attempt + 1 })
        await sleep(delay)
        continue
      }

      // Handle server errors (5xx) with fixed delay
      if (response.status >= 500) {
        log('WARN', `Server error ${response.status}, retrying`, { attempt: attempt + 1 })
        await sleep(RETRY_DELAY_MS)
        continue
      }

      // Non-retryable error
      return response
    } catch (networkError) {
      if (attempt === retries - 1) throw networkError
      log('WARN', `Network error, retrying`, { attempt: attempt + 1, error: (networkError as Error).message })
      await sleep(RETRY_DELAY_MS)
    }
  }

  throw new Error('Max retries exceeded for Gemini API call')
}

/**
 * Calculate confidence score based on extraction quality
 */
function calculateConfidence(intentData: Record<string, unknown>, originalText: string): number {
  let score = 0.5 // Base score

  // Check field completeness
  if (intentData.summary) score += 0.15
  if (intentData.category) score += 0.1
  if (intentData.sentiment) score += 0.1
  if (intentData.topic) score += 0.05

  // Check summary quality
  const summary = intentData.summary as string
  if (summary) {
    // Good summary length (not too short)
    if (summary.length >= 15) score += 0.05
    // Not too long
    if (summary.length <= 100) score += 0.05
    // CRITICAL: Summary should NOT be the original text (privacy violation)
    if (summary !== originalText && !originalText.includes(summary)) {
      score += 0.1
    } else {
      log('WARN', 'Summary too similar to original text (privacy risk)')
      score -= 0.3
    }
  }

  return Math.max(0, Math.min(1, score)) // Clamp to [0, 1]
}

/**
 * Build the intent extraction prompt in Portuguese
 */
function buildIntentPrompt(
  rawText: string,
  mediaType: string | undefined,
  contactName: string | undefined,
  conversationContext: string[] | undefined
): string {
  // Get current date for temporal extraction
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Format context if provided
  const contextStr = conversationContext?.length
    ? conversationContext.map((msg, i) => `[${i + 1}] ${msg}`).join('\n')
    : 'Nenhum contexto anterior disponivel'

  return `Voce e um sistema de extracao de intencao para um app de produtividade pessoal.
Analise a mensagem WhatsApp abaixo e extraia sua INTENCAO em portugues.

REGRAS:
1. NUNCA inclua o conteudo real da mensagem na resposta
2. Resuma a INTENCAO, nao o conteudo (ex: "Perguntou sobre reuniao" nao "Quer saber que horas e a reuniao")
3. Mantenha o resumo em ate 100 caracteres
4. Extraia datas/horarios em formato ISO se mencionados
5. Seja conservador com urgencia (padrao 2-3)

CATEGORIAS:
- question: Perguntando informacao
- response: Respondendo/confirmando algo
- scheduling: Relacionado a agenda/reuniao
- document: Arquivo/documento compartilhado
- audio: Mensagem de voz
- social: Cumprimentos, conversa casual
- request: Pedindo uma acao
- update: Atualizacao de status/progresso
- media: Foto/video/sticker

SENTIMENTO:
- positive: Feliz, grato, entusiasmado
- neutral: Informativo, direto
- negative: Frustrado, insatisfeito
- urgent: Urgente, emergencia

CONTEXTO TEMPORAL:
- Hoje: ${todayStr}
- Amanha: ${tomorrowStr}
${contactName ? `- Contato: ${contactName}` : ''}
${mediaType ? `- Tipo de midia: ${mediaType}` : ''}

MENSAGEM PARA ANALISAR:
${rawText}

CONTEXTO (mensagens anteriores apenas para referencia):
${contextStr}

Responda APENAS com JSON valido:
{
  "summary": "Resumo da intencao em portugues (max 100 chars)",
  "category": "uma das categorias acima",
  "sentiment": "um dos sentimentos acima",
  "urgency": 1-5,
  "topic": "palavra-chave opcional (max 50 chars)",
  "actionRequired": true/false,
  "mentionedDate": "YYYY-MM-DD ou null",
  "mentionedTime": "HH:mm ou null"
}`
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let messageId: string | undefined
  let supabase: ReturnType<typeof createClient> | undefined

  try {
    // Validate environment
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured')
    }

    // Parse request body
    const requestBody: IntentExtractionRequest = await req.json()
    const {
      messageId: reqMessageId,
      rawText,
      mediaType,
      contactName,
      conversationContext,
      skipDbUpdate,
    } = requestBody

    messageId = reqMessageId

    // Validate required fields
    if (!messageId) {
      throw new Error('messageId is required')
    }
    if (!rawText && mediaType !== 'sticker') {
      throw new Error('rawText is required for non-sticker messages')
    }

    log('INFO', 'Processing intent extraction', {
      messageId,
      textLength: rawText?.length || 0,
      mediaType,
      hasContext: !!conversationContext?.length,
      skipDbUpdate,
    })

    // Initialize Supabase client with service role (bypasses RLS)
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // =========================================================================
    // STEP 1: Mark processing_status = 'processing'
    // =========================================================================

    if (!skipDbUpdate) {
      const { error: updateError } = await supabase
        .from('whatsapp_messages')
        .update({
          processing_status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)

      if (updateError) {
        log('WARN', 'Failed to mark processing status', updateError.message)
        // Continue anyway - this is not critical
      }
    }

    // =========================================================================
    // STEP 2: Handle media-only messages (no text to analyze)
    // =========================================================================

    if (!rawText || rawText.trim() === '') {
      const defaultIntent: ExtractedIntent = {
        summary: mediaType === 'audio'
          ? 'Mensagem de voz recebida'
          : mediaType === 'image'
            ? 'Imagem compartilhada'
            : mediaType === 'video'
              ? 'Video compartilhado'
              : mediaType === 'document'
                ? 'Documento compartilhado'
                : 'Midia compartilhada',
        category: mediaType === 'audio' ? 'audio' : 'media',
        sentiment: 'neutral',
        urgency: 1,
        actionRequired: false,
        confidence: 1.0,
      }

      // Update database with default intent
      if (!skipDbUpdate) {
        await updateMessageIntent(supabase, messageId, defaultIntent, [])
      }

      log('INFO', 'Media-only message processed with default intent', { messageId, mediaType })

      return new Response(
        JSON.stringify({ success: true, intent: defaultIntent }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // STEP 3: Call Gemini 1.5 Flash for intent extraction
    // =========================================================================

    const intentPrompt = buildIntentPrompt(rawText, mediaType, contactName, conversationContext)

    log('DEBUG', 'Calling Gemini for intent extraction')

    const geminiResponse = await callGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: intentPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      log('ERROR', 'Gemini API error', { status: geminiResponse.status, error: errorText })
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiResult = await geminiResponse.json()
    const intentText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text

    if (!intentText) {
      throw new Error('Empty response from Gemini')
    }

    // Parse JSON response (remove markdown if present)
    const cleanedJson = intentText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let intentData: Record<string, unknown>
    try {
      intentData = JSON.parse(cleanedJson)
    } catch (parseError) {
      log('ERROR', 'Failed to parse Gemini response', { response: cleanedJson })
      throw new Error('Invalid JSON response from Gemini')
    }

    // Validate required fields
    if (!intentData.summary || !intentData.category || !intentData.sentiment) {
      log('ERROR', 'Invalid intent extraction response', intentData)
      throw new Error('Invalid intent extraction response from Gemini')
    }

    // Calculate confidence score
    const confidence = calculateConfidence(intentData, rawText)

    log('INFO', 'Intent extracted', {
      category: intentData.category,
      urgency: intentData.urgency,
      confidence,
    })

    // =========================================================================
    // STEP 4: Generate embedding via text-embedding-004
    // =========================================================================

    let embedding: number[] = []

    try {
      log('DEBUG', 'Generating embedding')

      const embeddingResponse = await callGeminiWithRetry(
        `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
          model: 'models/text-embedding-004',
          content: { parts: [{ text: rawText }] },
        }
      )

      if (embeddingResponse.ok) {
        const embeddingResult = await embeddingResponse.json()
        embedding = embeddingResult.embedding?.values || []

        // Verify and normalize embedding dimension (should be 768)
        if (embedding.length !== 768) {
          log('WARN', `Expected 768-dim embedding, got ${embedding.length}`)
          if (embedding.length < 768) {
            embedding = [...embedding, ...Array(768 - embedding.length).fill(0)]
          } else {
            embedding = embedding.slice(0, 768)
          }
        }

        log('DEBUG', 'Embedding generated', { dimensions: embedding.length })
      } else {
        log('WARN', 'Embedding API error, continuing without embedding', {
          status: embeddingResponse.status,
        })
      }
    } catch (embeddingError) {
      log('WARN', 'Embedding generation failed', (embeddingError as Error).message)
      // Continue without embedding - will be null in database
    }

    // =========================================================================
    // STEP 5: Build structured response
    // =========================================================================

    const extractedIntent: ExtractedIntent = {
      summary: (intentData.summary as string).slice(0, 100), // Enforce max length
      category: intentData.category as IntentCategory,
      sentiment: intentData.sentiment as IntentSentiment,
      urgency: Math.min(5, Math.max(1, (intentData.urgency as number) || 2)),
      topic: intentData.topic ? (intentData.topic as string).slice(0, 50) : undefined,
      actionRequired: (intentData.actionRequired as boolean) || false,
      mentionedDate: (intentData.mentionedDate as string) || undefined,
      mentionedTime: (intentData.mentionedTime as string) || undefined,
      confidence,
    }

    // =========================================================================
    // STEP 6: Update whatsapp_messages with intent and embedding
    // =========================================================================

    if (!skipDbUpdate) {
      await updateMessageIntent(supabase, messageId, extractedIntent, embedding)
      log('INFO', 'Message intent updated in database', { messageId })
    }

    // =========================================================================
    // STEP 7: Return success response
    // NOTE: rawText has been used only in memory and is NOT returned or stored
    // =========================================================================

    const response: IntentExtractionResponse = {
      success: true,
      intent: extractedIntent,
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = (error as Error).message
    log('ERROR', 'Intent extraction failed', errorMessage)

    // Mark message as failed if we have messageId and supabase client
    if (messageId && supabase) {
      try {
        await supabase
          .from('whatsapp_messages')
          .update({
            processing_status: 'failed',
            processing_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', messageId)
      } catch (updateError) {
        log('ERROR', 'Failed to mark processing as failed', (updateError as Error).message)
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// =============================================================================
// DATABASE UPDATE FUNCTION
// =============================================================================

/**
 * Update whatsapp_messages table with extracted intent and embedding
 */
async function updateMessageIntent(
  supabase: ReturnType<typeof createClient>,
  messageId: string,
  intent: ExtractedIntent,
  embedding: number[]
): Promise<void> {
  // Format embedding for PostgreSQL vector type
  // pgvector expects format: [0.1,0.2,0.3,...]
  const embeddingStr = embedding.length > 0
    ? `[${embedding.join(',')}]`
    : null

  const { error } = await supabase
    .from('whatsapp_messages')
    .update({
      // Intent fields
      intent_summary: intent.summary,
      intent_category: intent.category,
      intent_sentiment: intent.sentiment,
      intent_urgency: intent.urgency,
      intent_topic: intent.topic || null,
      intent_action_required: intent.actionRequired,
      intent_mentioned_date: intent.mentionedDate || null,
      intent_mentioned_time: intent.mentionedTime || null,
      intent_confidence: intent.confidence,
      intent_embedding: embeddingStr,
      // Processing status
      processing_status: 'completed',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  if (error) {
    log('ERROR', 'Failed to update message intent', { messageId, error: error.message })
    throw new Error(`Database update failed: ${error.message}`)
  }
}

/* =============================================================================
 * DEPLOYMENT INSTRUCTIONS
 * =============================================================================
 *
 * 1. Deploy function:
 *    npx supabase functions deploy extract-intent
 *
 * 2. Set secrets:
 *    npx supabase secrets set GEMINI_API_KEY=your-key-here
 *
 * 3. Test locally:
 *    npx supabase functions serve extract-intent
 *
 *    curl -X POST http://localhost:54321/functions/v1/extract-intent \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "messageId": "uuid-here",
 *        "rawText": "Oi! Podemos conversar amanha as 15h?",
 *        "contactName": "Maria"
 *      }'
 *
 * 4. Integration with webhook-evolution:
 *    The webhook will call this function after storing the message.
 *    See supabase/functions/webhook-evolution/index.ts
 *
 * =============================================================================
 * COST ESTIMATION (per 1000 messages)
 * =============================================================================
 *
 * Gemini 1.5 Flash (intent extraction):
 * - Input: ~200 tokens/message (prompt + content)
 * - Output: ~50 tokens/message
 * - Cost: ~$0.02/1K messages
 *
 * Text Embedding 004:
 * - Cost: ~$0.01/1K messages
 *
 * Total: ~$0.03/1K messages = $0.30 for 10K messages/month
 *
 * =============================================================================
 * PRIVACY COMPLIANCE
 * =============================================================================
 *
 * CRITICAL: This function implements privacy-by-design:
 *
 * 1. rawText is received, processed, and DISCARDED
 * 2. rawText is NEVER stored in the database
 * 3. Only intent_summary (anonymized) is persisted
 * 4. Embedding is an anonymized vector representation
 *
 * Compliance:
 * - WhatsApp Terms of Service: No raw message storage
 * - LGPD Article 6: Data minimization principle
 * - GDPR Article 5: Storage limitation
 *
 * =============================================================================
 */
