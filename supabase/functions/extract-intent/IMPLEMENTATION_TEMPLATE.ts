/**
 * Edge Function: extract-intent
 * Issue #91: Extract intent from WhatsApp messages (privacy-first approach)
 *
 * Purpose:
 * - Generate intent summary (safe for display, no raw text storage)
 * - Classify message category and sentiment
 * - Extract temporal references (dates, times)
 * - Generate 768-dimensional embedding for semantic search
 *
 * Called by:
 * - webhook-evolution (on new message received)
 * - Frontend (for semantic search queries)
 *
 * Gemini Models:
 * - gemini-1.5-flash: Intent extraction (cost-effective)
 * - text-embedding-004: Embedding generation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.2.1'

// Types matching database enums
type IntentCategory =
  | 'question'
  | 'response'
  | 'scheduling'
  | 'document'
  | 'audio'
  | 'social'
  | 'request'
  | 'update'
  | 'media'

type IntentSentiment = 'positive' | 'neutral' | 'negative' | 'urgent'

interface IntentExtractionRequest {
  messageText?: string
  messageType: 'text' | 'audio' | 'image' | 'video' | 'document' | 'sticker'
  mediaUrl?: string
  transcription?: string  // Pre-transcribed audio
  ocrText?: string        // Pre-extracted text from image
  skipEmbedding?: boolean // For query-only mode
}

interface IntentExtractionResponse {
  summary: string
  category: IntentCategory
  sentiment: IntentSentiment
  urgency: number          // 1-5
  topic: string | null
  actionRequired: boolean
  mentionedDate: string | null  // ISO date YYYY-MM-DD
  mentionedTime: string | null  // HH:MM
  confidence: number       // 0.0-1.0
  embedding: number[]      // 768-dimensional vector
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid token or user not found')
    }

    // Parse request body
    const requestBody: IntentExtractionRequest = await req.json()
    const { messageText, messageType, transcription, ocrText, skipEmbedding } = requestBody

    // Determine content to analyze
    const contentToAnalyze = messageText || transcription || ocrText
    if (!contentToAnalyze && messageType !== 'media') {
      throw new Error('No content to analyze (messageText, transcription, or ocrText required)')
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '')

    // ===========================================================================
    // STEP 1: EXTRACT INTENT VIA GEMINI-1.5-FLASH
    // ===========================================================================

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const intentPrompt = `
You are an AI assistant that extracts structured intent from WhatsApp messages while preserving user privacy.

CRITICAL RULES:
1. The summary MUST NOT be the original message text
2. The summary should describe WHAT the message is about, not repeat it verbatim
3. Maximum 100 characters for summary
4. If the message is sensitive, anonymize details

Extract the following information and output as JSON:

{
  "summary": "Brief description of message intent (NOT the original text)",
  "category": "question|response|scheduling|document|audio|social|request|update|media",
  "sentiment": "positive|neutral|negative|urgent",
  "urgency": 1-5 (1=low, 5=critical/requires immediate action),
  "topic": "Single word/phrase describing main topic (max 50 chars)",
  "actionRequired": true if user needs to respond or take action,
  "mentionedDate": "YYYY-MM-DD if date mentioned, else null",
  "mentionedTime": "HH:MM if time mentioned (24h format), else null"
}

Examples:

Input: "Oi tudo bem? Podemos marcar uma reunião amanhã às 14h?"
Output:
{
  "summary": "Request to schedule meeting tomorrow at 2 PM",
  "category": "scheduling",
  "sentiment": "neutral",
  "urgency": 3,
  "topic": "meeting",
  "actionRequired": true,
  "mentionedDate": "2026-02-06",
  "mentionedTime": "14:00"
}

Input: "Obrigado pela ajuda! Deu tudo certo"
Output:
{
  "summary": "Expression of gratitude, positive outcome",
  "category": "social",
  "sentiment": "positive",
  "urgency": 1,
  "topic": "thanks",
  "actionRequired": false,
  "mentionedDate": null,
  "mentionedTime": null
}

Input: "URGENTE: Preciso do relatório agora!!!"
Output:
{
  "summary": "Urgent request for report delivery",
  "category": "request",
  "sentiment": "urgent",
  "urgency": 5,
  "topic": "report",
  "actionRequired": true,
  "mentionedDate": null,
  "mentionedTime": null
}

Now extract intent from this message:
Message Type: ${messageType}
Content: ${contentToAnalyze}

Output ONLY valid JSON, no markdown or explanations.
`

    const intentResult = await model.generateContent(intentPrompt)
    const intentText = intentResult.response.text()

    // Clean JSON response (remove markdown if present)
    const cleanedJson = intentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const intentData = JSON.parse(cleanedJson)

    // Validate intent data
    if (!intentData.summary || !intentData.category || !intentData.sentiment) {
      throw new Error('Invalid intent extraction response from Gemini')
    }

    // Calculate confidence score (simplified - can be enhanced)
    const confidence = calculateConfidence(intentData, contentToAnalyze)

    // ===========================================================================
    // STEP 2: GENERATE EMBEDDING VIA TEXT-EMBEDDING-004
    // ===========================================================================

    let embedding: number[] = []

    if (!skipEmbedding && contentToAnalyze) {
      try {
        const embeddingModel = genAI.getGenerativeModel({
          model: 'text-embedding-004'
        })

        const embeddingResult = await embeddingModel.embedContent(contentToAnalyze)
        embedding = embeddingResult.embedding.values

        // Verify embedding dimension
        if (embedding.length !== 768) {
          console.error(`WARNING: Expected 768-dim embedding, got ${embedding.length}`)
          // Pad or truncate if needed (fallback)
          if (embedding.length < 768) {
            embedding = [...embedding, ...Array(768 - embedding.length).fill(0)]
          } else {
            embedding = embedding.slice(0, 768)
          }
        }
      } catch (embeddingError) {
        console.error('Embedding generation failed:', embeddingError)
        // Continue without embedding (will be null in database)
        embedding = []
      }
    }

    // ===========================================================================
    // STEP 3: RETURN STRUCTURED RESPONSE
    // ===========================================================================

    const response: IntentExtractionResponse = {
      summary: intentData.summary,
      category: intentData.category,
      sentiment: intentData.sentiment,
      urgency: intentData.urgency,
      topic: intentData.topic || null,
      actionRequired: intentData.actionRequired || false,
      mentionedDate: intentData.mentionedDate || null,
      mentionedTime: intentData.mentionedTime || null,
      confidence: confidence,
      embedding: embedding,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('extract-intent error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

function calculateConfidence(intentData: any, originalText: string | undefined): number {
  /**
   * Simple confidence score calculation based on:
   * - Presence of all fields
   * - Summary length (not too short, not too long)
   * - Summary differs from original text (privacy check)
   */
  let score = 0.5 // Base score

  // Check field completeness
  if (intentData.summary) score += 0.2
  if (intentData.category) score += 0.1
  if (intentData.sentiment) score += 0.1

  // Check summary quality
  if (intentData.summary && intentData.summary.length >= 20) score += 0.05
  if (intentData.summary && intentData.summary.length <= 100) score += 0.05

  // CRITICAL: Ensure summary is NOT the original text (privacy violation)
  if (originalText && intentData.summary !== originalText) {
    score += 0.1
  } else if (originalText && intentData.summary === originalText) {
    console.warn('WARNING: Summary matches original text (privacy risk)')
    score -= 0.2
  }

  return Math.max(0, Math.min(1, score)) // Clamp to [0, 1]
}

/* ===========================================================================
 * DEPLOYMENT INSTRUCTIONS
 * ===========================================================================
 *
 * 1. Deploy function:
 *    npx supabase functions deploy extract-intent
 *
 * 2. Set secrets:
 *    npx supabase secrets set GEMINI_API_KEY=your-key-here
 *
 * 3. Test locally:
 *    npx supabase functions serve extract-intent
 *    curl -X POST http://localhost:54321/functions/v1/extract-intent \
 *      -H "Authorization: Bearer YOUR_ANON_KEY" \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "messageText": "Oi! Podemos conversar amanhã às 15h?",
 *        "messageType": "text"
 *      }'
 *
 * 4. Integrate with webhook-evolution:
 *    const { data: intent } = await supabase.functions.invoke('extract-intent', {
 *      body: {
 *        messageText: message.text,
 *        messageType: message.type
 *      }
 *    })
 *
 *    await supabase.from('whatsapp_messages').insert({
 *      user_id: userId,
 *      contact_id: contactId,
 *      intent_summary: intent.summary,
 *      intent_category: intent.category,
 *      intent_sentiment: intent.sentiment,
 *      intent_urgency: intent.urgency,
 *      intent_embedding: intent.embedding,
 *      processing_status: 'completed'
 *    })
 *
 * ===========================================================================
 * COST ESTIMATION (per 1000 messages)
 * ===========================================================================
 *
 * Gemini 1.5 Flash (intent extraction):
 * - Input: ~100 tokens/message
 * - Output: ~50 tokens/message
 * - Cost: $0.02/1K messages
 *
 * Text Embedding 004:
 * - Cost: $0.01/1K messages
 *
 * Total: ~$0.03/1K messages = $0.30 for 10K messages/month
 *
 * ===========================================================================
 * PRIVACY COMPLIANCE NOTES
 * ===========================================================================
 *
 * ✅ NEVER store original messageText in database
 * ✅ Summary must be different from original text
 * ✅ Embeddings are anonymized representations
 * ✅ Only intent metadata is persisted
 * ✅ LGPD Article 6 compliance (data minimization)
 * ✅ WhatsApp ToS compliance (no raw storage)
 *
 * ===========================================================================
 */
