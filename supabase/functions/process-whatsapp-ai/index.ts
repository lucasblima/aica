/**
 * Process WhatsApp AI Edge Function
 * Issue #142: AI Pipeline for Conversation Analysis
 *
 * Processes WhatsApp messages with Gemini 1.5 Flash to extract:
 * - Sentiment analysis
 * - Detected topics
 * - Action items
 * - Conversation summary
 * - Relationship indicators
 *
 * LGPD Compliance: Only stores derived insights, never raw message content.
 *
 * Endpoint: POST /functions/v1/process-whatsapp-ai
 * Body: { batch_size?: number }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface Message {
  id: string
  direction: 'incoming' | 'outgoing'
  content_text: string
  message_timestamp: string
  sentiment_score?: number
}

interface ConversationInsight {
  sentiment_summary: {
    avg_score: number
    trend: 'ascending' | 'stable' | 'descending'
    dominant_label: 'positive' | 'neutral' | 'negative'
  }
  detected_topics: string[]
  action_items: string[]
  conversation_summary: string
  relationship_indicators: {
    responsiveness: number
    engagement: number
    formality: 'formal' | 'casual' | 'mixed'
  }
}

interface ProcessingResult {
  success: boolean
  contacts_processed: number
  messages_processed: number
  insights_created: number
  errors: string[]
}

// Prompts
const ANALYSIS_PROMPT = `Voce e um assistente de analise de conversas. Analise as seguintes mensagens de WhatsApp e extraia insights.

IMPORTANTE:
- NAO inclua citacoes diretas das mensagens
- Apenas insights derivados e resumos
- Responda em portugues brasileiro
- Retorne APENAS JSON valido

Mensagens (formato: [DIRECAO] texto):
{messages}

Retorne um JSON com esta estrutura:
{
  "sentiment_summary": {
    "avg_score": <numero de -1 a 1>,
    "trend": "ascending" | "stable" | "descending",
    "dominant_label": "positive" | "neutral" | "negative"
  },
  "detected_topics": ["topico1", "topico2", ...],
  "action_items": ["acao1", "acao2", ...],
  "conversation_summary": "Resumo de 2-3 frases SEM citacoes diretas",
  "relationship_indicators": {
    "responsiveness": <0 a 1>,
    "engagement": <0 a 1>,
    "formality": "formal" | "casual" | "mixed"
  }
}`

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const result: ProcessingResult = {
    success: false,
    contacts_processed: 0,
    messages_processed: 0,
    insights_created: 0,
    errors: [],
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const genAI = new GoogleGenerativeAI(geminiApiKey)

    // Parse request
    let batchSize = 50
    try {
      const body = await req.json()
      batchSize = body.batch_size ?? 50
    } catch {
      // Default batch size
    }

    console.log(`[process-whatsapp-ai] Starting with batch_size=${batchSize}`)

    // Get contacts with pending messages
    const { data: pendingContacts, error: pendingError } = await supabase
      .rpc('get_contacts_pending_ai_processing', { _batch_size: batchSize })

    if (pendingError) {
      throw new Error(`Failed to get pending contacts: ${pendingError.message}`)
    }

    if (!pendingContacts || pendingContacts.length === 0) {
      console.log('[process-whatsapp-ai] No contacts with pending messages')
      result.success = true
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[process-whatsapp-ai] Processing ${pendingContacts.length} contacts`)

    // Process each contact
    for (const contact of pendingContacts) {
      try {
        const batchId = crypto.randomUUID()

        // Fetch messages for this contact
        const { data: messages, error: msgError } = await supabase
          .from('whatsapp_messages')
          .select('id, direction, content_text, message_timestamp, sentiment_score')
          .eq('user_id', contact.user_id)
          .eq('contact_phone', contact.contact_phone)
          .eq('ai_processed', false)
          .eq('processing_status', 'completed')
          .is('purged_at', null)
          .is('deleted_at', null)
          .not('content_text', 'is', null)
          .order('message_timestamp', { ascending: true })
          .limit(100) // Max messages per contact

        if (msgError) {
          result.errors.push(`Contact ${contact.contact_phone}: ${msgError.message}`)
          continue
        }

        if (!messages || messages.length === 0) {
          continue
        }

        // Format messages for prompt
        const formattedMessages = messages
          .map((m: Message) => `[${m.direction === 'incoming' ? 'RECEBIDA' : 'ENVIADA'}] ${m.content_text}`)
          .join('\n')

        // Call Gemini API
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          },
        })

        const prompt = ANALYSIS_PROMPT.replace('{messages}', formattedMessages)
        const aiResult = await model.generateContent(prompt)
        const responseText = aiResult.response.text()

        // Parse AI response
        let insights: ConversationInsight
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            throw new Error('No JSON found in response')
          }
          insights = JSON.parse(jsonMatch[0])
        } catch (parseError) {
          result.errors.push(`Contact ${contact.contact_phone}: Failed to parse AI response`)
          console.error('[process-whatsapp-ai] Parse error:', parseError, responseText)
          continue
        }

        // Validate and sanitize insights
        insights.sentiment_summary = insights.sentiment_summary || { avg_score: 0, trend: 'stable', dominant_label: 'neutral' }
        insights.sentiment_summary.avg_score = Math.max(-1, Math.min(1, insights.sentiment_summary.avg_score || 0))
        insights.detected_topics = Array.isArray(insights.detected_topics) ? insights.detected_topics.slice(0, 10) : []
        insights.action_items = Array.isArray(insights.action_items) ? insights.action_items.slice(0, 5) : []
        insights.conversation_summary = (insights.conversation_summary || '').substring(0, 500)
        insights.relationship_indicators = insights.relationship_indicators || { responsiveness: 0.5, engagement: 0.5, formality: 'mixed' }

        // Calculate period
        const timestamps = messages.map((m: Message) => new Date(m.message_timestamp).getTime())
        const periodStart = new Date(Math.min(...timestamps))
        const periodEnd = new Date(Math.max(...timestamps))

        // Insert insight
        const { error: insertError } = await supabase
          .from('contact_insights')
          .upsert({
            user_id: contact.user_id,
            contact_phone: contact.contact_phone,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            sentiment_summary: insights.sentiment_summary,
            detected_topics: insights.detected_topics,
            action_items: insights.action_items,
            conversation_summary: insights.conversation_summary,
            relationship_indicators: insights.relationship_indicators,
            messages_analyzed: messages.length,
            processing_version: 'v1',
            model_used: 'gemini-1.5-flash',
            processing_time_ms: Date.now() - startTime,
          }, {
            onConflict: 'user_id,contact_phone,period_start',
          })

        if (insertError) {
          result.errors.push(`Contact ${contact.contact_phone}: Failed to insert insight: ${insertError.message}`)
          continue
        }

        // Update relationship score
        const recencyDays = Math.floor((Date.now() - periodEnd.getTime()) / (1000 * 60 * 60 * 24))
        await supabase.rpc('update_contact_relationship_score', {
          _user_id: contact.user_id,
          _contact_phone: contact.contact_phone,
          _sentiment_avg: insights.sentiment_summary.avg_score,
          _responsiveness: insights.relationship_indicators.responsiveness,
          _engagement: insights.relationship_indicators.engagement,
          _recency_days: recencyDays,
        })

        // Mark messages as processed
        const { data: markedCount } = await supabase.rpc('mark_messages_ai_processed', {
          _user_id: contact.user_id,
          _contact_phone: contact.contact_phone,
          _batch_id: batchId,
          _before_timestamp: new Date().toISOString(),
        })

        result.contacts_processed++
        result.messages_processed += markedCount || messages.length
        result.insights_created++

        console.log(`[process-whatsapp-ai] Processed ${contact.contact_phone}: ${messages.length} messages`)

        // Rate limiting: small delay between contacts
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (contactError) {
        const err = contactError as Error
        result.errors.push(`Contact ${contact.contact_phone}: ${err.message}`)
        console.error(`[process-whatsapp-ai] Error processing ${contact.contact_phone}:`, err)
      }
    }

    result.success = result.errors.length === 0 || result.contacts_processed > 0

    console.log(`[process-whatsapp-ai] Completed: ${result.contacts_processed} contacts, ${result.messages_processed} messages, ${result.errors.length} errors`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const err = error as Error
    console.error('[process-whatsapp-ai] Fatal error:', err)

    result.errors.push(err.message)
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
