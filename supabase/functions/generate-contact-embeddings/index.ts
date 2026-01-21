/**
 * Generate Contact Embeddings Edge Function
 * Issue #143: Embedding Generation for Contacts and Conversations
 *
 * Generates 768-dimensional embeddings using text-embedding-004 for:
 * - Contact profiles (name, topics, relationship context)
 * - Conversation summaries
 * - Action items
 *
 * LGPD Compliance: Embeddings generated from AI insights, never raw messages.
 *
 * Endpoint: POST /functions/v1/generate-contact-embeddings
 * Body: { batch_size?: number }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Constants
const EMBEDDING_MODEL = 'text-embedding-004'
const EMBEDDING_DIMENSIONS = 768

// Types
interface ContactInsight {
  id: string
  user_id: string
  contact_phone: string
  detected_topics: string[]
  conversation_summary: string
  action_items: string[]
  sentiment_summary: {
    avg_score: number
    dominant_label: string
  }
}

interface EmbeddingResponse {
  embedding?: {
    values: number[]
  }
}

interface ProcessingResult {
  success: boolean
  contacts_processed: number
  embeddings_created: number
  embeddings_updated: number
  errors: string[]
}

/**
 * Generate embedding using Google's text-embedding-004 model
 */
async function generateEmbedding(text: string, taskType: string = 'RETRIEVAL_DOCUMENT'): Promise<number[]> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY not configured')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text }],
      },
      taskType,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Embedding API error:', errorText)
    throw new Error(`Embedding API error: ${response.status}`)
  }

  const data = (await response.json()) as EmbeddingResponse
  const values = data.embedding?.values

  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Invalid embedding response: expected ${EMBEDDING_DIMENSIONS} dimensions`)
  }

  return values
}

/**
 * Generate content hash for change detection
 */
function generateContentHash(content: string): string {
  // Simple hash using btoa (base64) of truncated content
  const truncated = content.substring(0, 1000)
  return btoa(encodeURIComponent(truncated)).substring(0, 32)
}

/**
 * Build embedding text for a contact profile
 */
function buildProfileText(insight: ContactInsight, contactName?: string): string {
  const parts = []

  if (contactName) {
    parts.push(`Contato: ${contactName}`)
  }

  if (insight.detected_topics?.length > 0) {
    parts.push(`Topicos: ${insight.detected_topics.join(', ')}`)
  }

  if (insight.sentiment_summary?.dominant_label) {
    parts.push(`Sentimento predominante: ${insight.sentiment_summary.dominant_label}`)
  }

  if (insight.conversation_summary) {
    parts.push(`Contexto: ${insight.conversation_summary}`)
  }

  return parts.join('. ')
}

/**
 * Build embedding text for action items
 */
function buildActionItemsText(actionItems: string[]): string {
  if (!actionItems || actionItems.length === 0) {
    return ''
  }
  return `Acoes pendentes: ${actionItems.join('; ')}`
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const result: ProcessingResult = {
    success: false,
    contacts_processed: 0,
    embeddings_created: 0,
    embeddings_updated: 0,
    errors: [],
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse request
    let batchSize = 100
    try {
      const body = await req.json()
      batchSize = body.batch_size ?? 100
    } catch {
      // Default batch size
    }

    console.log(`[generate-contact-embeddings] Starting with batch_size=${batchSize}`)

    // Get contacts with insights that need embedding updates
    // We look for contacts where:
    // 1. No embedding exists yet, OR
    // 2. Insight was updated after embedding was created (detected by hash mismatch)
    const { data: insights, error: insightsError } = await supabase
      .from('contact_insights')
      .select(`
        id,
        user_id,
        contact_phone,
        detected_topics,
        conversation_summary,
        action_items,
        sentiment_summary
      `)
      .order('processed_at', { ascending: false })
      .limit(batchSize)

    if (insightsError) {
      throw new Error(`Failed to fetch insights: ${insightsError.message}`)
    }

    if (!insights || insights.length === 0) {
      console.log('[generate-contact-embeddings] No insights to process')
      result.success = true
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[generate-contact-embeddings] Processing ${insights.length} contacts`)

    // Process each contact
    for (const insight of insights as ContactInsight[]) {
      try {
        // Get contact name from contact_network
        const { data: contact } = await supabase
          .from('contact_network')
          .select('name, contact_name')
          .eq('user_id', insight.user_id)
          .or(`phone_number.eq.${insight.contact_phone},contact_phone.eq.${insight.contact_phone}`)
          .single()

        const contactName = contact?.name || contact?.contact_name

        // Build profile text and hash
        const profileText = buildProfileText(insight, contactName)
        const profileHash = generateContentHash(profileText)

        // Check if embedding needs update
        const { data: existingEmbed } = await supabase
          .from('contact_embeddings')
          .select('id, content_hash')
          .eq('user_id', insight.user_id)
          .eq('contact_phone', insight.contact_phone)
          .eq('embedding_type', 'profile')
          .single()

        const needsUpdate = !existingEmbed || existingEmbed.content_hash !== profileHash

        if (needsUpdate && profileText.length > 10) {
          // Generate profile embedding
          const profileEmbedding = await generateEmbedding(profileText, 'RETRIEVAL_DOCUMENT')
          const embeddingVector = `[${profileEmbedding.join(',')}]`

          // Upsert embedding
          const { error: upsertError } = await supabase
            .from('contact_embeddings')
            .upsert({
              user_id: insight.user_id,
              contact_phone: insight.contact_phone,
              embedding_type: 'profile',
              embedding: embeddingVector,
              content_hash: profileHash,
              source_insight_id: insight.id,
              model_version: EMBEDDING_MODEL,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,contact_phone,embedding_type',
            })

          if (upsertError) {
            result.errors.push(`Profile embedding for ${insight.contact_phone}: ${upsertError.message}`)
          } else {
            if (existingEmbed) {
              result.embeddings_updated++
            } else {
              result.embeddings_created++
            }
          }
        }

        // Generate conversation summary embedding if we have a summary
        if (insight.conversation_summary && insight.conversation_summary.length > 20) {
          const summaryHash = generateContentHash(insight.conversation_summary)

          const { data: existingSummaryEmbed } = await supabase
            .from('contact_embeddings')
            .select('id, content_hash')
            .eq('user_id', insight.user_id)
            .eq('contact_phone', insight.contact_phone)
            .eq('embedding_type', 'conversation_summary')
            .single()

          const summaryNeedsUpdate = !existingSummaryEmbed || existingSummaryEmbed.content_hash !== summaryHash

          if (summaryNeedsUpdate) {
            const summaryEmbedding = await generateEmbedding(insight.conversation_summary, 'RETRIEVAL_DOCUMENT')
            const summaryVector = `[${summaryEmbedding.join(',')}]`

            const { error: summaryError } = await supabase
              .from('contact_embeddings')
              .upsert({
                user_id: insight.user_id,
                contact_phone: insight.contact_phone,
                embedding_type: 'conversation_summary',
                embedding: summaryVector,
                content_hash: summaryHash,
                source_insight_id: insight.id,
                model_version: EMBEDDING_MODEL,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,contact_phone,embedding_type',
              })

            if (summaryError) {
              result.errors.push(`Summary embedding for ${insight.contact_phone}: ${summaryError.message}`)
            } else {
              if (existingSummaryEmbed) {
                result.embeddings_updated++
              } else {
                result.embeddings_created++
              }
            }
          }
        }

        // Generate action items embedding if we have action items
        const actionItemsText = buildActionItemsText(insight.action_items)
        if (actionItemsText.length > 10) {
          const actionHash = generateContentHash(actionItemsText)

          const { data: existingActionEmbed } = await supabase
            .from('contact_embeddings')
            .select('id, content_hash')
            .eq('user_id', insight.user_id)
            .eq('contact_phone', insight.contact_phone)
            .eq('embedding_type', 'action_items')
            .single()

          const actionNeedsUpdate = !existingActionEmbed || existingActionEmbed.content_hash !== actionHash

          if (actionNeedsUpdate) {
            const actionEmbedding = await generateEmbedding(actionItemsText, 'RETRIEVAL_DOCUMENT')
            const actionVector = `[${actionEmbedding.join(',')}]`

            const { error: actionError } = await supabase
              .from('contact_embeddings')
              .upsert({
                user_id: insight.user_id,
                contact_phone: insight.contact_phone,
                embedding_type: 'action_items',
                embedding: actionVector,
                content_hash: actionHash,
                source_insight_id: insight.id,
                model_version: EMBEDDING_MODEL,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,contact_phone,embedding_type',
              })

            if (actionError) {
              result.errors.push(`Action items embedding for ${insight.contact_phone}: ${actionError.message}`)
            } else {
              if (existingActionEmbed) {
                result.embeddings_updated++
              } else {
                result.embeddings_created++
              }
            }
          }
        }

        result.contacts_processed++

        // Rate limiting: delay between API calls
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (contactError) {
        const err = contactError as Error
        result.errors.push(`Contact ${insight.contact_phone}: ${err.message}`)
        console.error(`[generate-contact-embeddings] Error processing ${insight.contact_phone}:`, err)
      }
    }

    result.success = result.errors.length === 0 || result.contacts_processed > 0

    console.log(`[generate-contact-embeddings] Completed: ${result.contacts_processed} contacts, ${result.embeddings_created} created, ${result.embeddings_updated} updated`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const err = error as Error
    console.error('[generate-contact-embeddings] Fatal error:', err)

    result.errors.push(err.message)
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
