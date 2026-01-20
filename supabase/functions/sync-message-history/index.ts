/**
 * Sync Message History Edge Function
 *
 * Batch synchronization of WhatsApp message history from Evolution API.
 * Processes messages in batches to avoid memory issues and rate limits.
 *
 * Endpoint: POST /functions/v1/sync-message-history
 * Body: { instanceName?: string, limit?: number, daysBack?: number }
 * Response: { success: boolean, synced?: number, error?: string }
 *
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 * Issue: #127 - Message history sync for multi-instance
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  instanceName?: string
  limit?: number
  daysBack?: number
  contactJid?: string // Optional: sync specific contact
}

interface SyncResponse {
  success: boolean
  synced?: number
  contacts?: number
  groups?: number
  error?: string
}

interface EvolutionMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
    participant?: string
  }
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text: string }
    imageMessage?: { caption?: string; mimetype?: string }
    audioMessage?: { seconds?: number; mimetype?: string }
    videoMessage?: { caption?: string; mimetype?: string }
    documentMessage?: { title?: string; mimetype?: string }
  }
  messageTimestamp?: number | string
  messageType?: string
}

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')

// Batch size for processing
const BATCH_SIZE = 100
const MAX_MESSAGES_PER_CONTACT = 500
const DEFAULT_DAYS_BACK = 30

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [sync-message-history] ${message}${logData}`)
}

/**
 * Extract message text from various message types
 */
function extractMessageText(message: EvolutionMessage['message']): string {
  if (!message) return ''

  if (message.conversation) return message.conversation
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text
  if (message.imageMessage?.caption) return message.imageMessage.caption
  if (message.videoMessage?.caption) return message.videoMessage.caption
  if (message.documentMessage?.title) return message.documentMessage.title

  return ''
}

/**
 * Determine message type from Evolution API message
 */
function getMessageType(message: EvolutionMessage['message']): string {
  if (!message) return 'text'

  if (message.audioMessage) return 'audio'
  if (message.imageMessage) return 'image'
  if (message.videoMessage) return 'video'
  if (message.documentMessage) return 'document'

  return 'text'
}

/**
 * Convert WhatsApp JID to normalized phone number
 */
function jidToPhone(remoteJid: string): string {
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // 3. Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not configured')
    }

    // Auth client (to validate user)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Service client (for database operations)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    log('INFO', `Sync request from user ${user.id}`)

    // 4. Parse request body
    let body: SyncRequest = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is OK - will use user's session
    }

    // 5. Get user's session
    let instanceName = body.instanceName

    if (!instanceName) {
      const { data: session, error: sessionError } = await supabaseService
        .from('whatsapp_sessions')
        .select('instance_name, status')
        .eq('user_id', user.id)
        .eq('status', 'connected')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionError || !session) {
        throw new Error('No connected WhatsApp session found')
      }

      instanceName = session.instance_name
      log('INFO', `Using session instance: ${instanceName}`)
    }

    // 6. Validate Evolution API credentials
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API credentials not configured')
    }

    // 7. Get contacts to sync from (prioritize active chats)
    let contactsToSync: string[] = []

    if (body.contactJid) {
      // Sync specific contact
      contactsToSync = [body.contactJid]
    } else {
      // Fetch active chats from Evolution API
      const chatsResponse = await fetch(
        `${EVOLUTION_API_URL}/chat/findChats/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({}),
        }
      )

      if (chatsResponse.ok) {
        const chats = await chatsResponse.json()
        const chatsArray = Array.isArray(chats) ? chats : []

        // Sort by last message timestamp and take top N
        contactsToSync = chatsArray
          .sort((a: { conversationTimestamp?: number }, b: { conversationTimestamp?: number }) =>
            (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0))
          .slice(0, body.limit || 20)
          .map((chat: { id: string }) => chat.id)

        log('INFO', `Found ${chatsArray.length} chats, syncing top ${contactsToSync.length}`)
      }
    }

    // 8. Sync messages for each contact
    let totalSynced = 0
    const daysBack = body.daysBack || DEFAULT_DAYS_BACK
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60)

    for (const contactJid of contactsToSync) {
      try {
        log('DEBUG', `Syncing messages for ${contactJid.substring(0, 15)}...`)

        // Fetch messages from Evolution API
        const messagesResponse = await fetch(
          `${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
              where: {
                key: {
                  remoteJid: contactJid,
                },
              },
              limit: MAX_MESSAGES_PER_CONTACT,
            }),
          }
        )

        if (!messagesResponse.ok) {
          log('WARN', `Failed to fetch messages for ${contactJid}`, { status: messagesResponse.status })
          continue
        }

        const messagesData = await messagesResponse.json()
        const messages: EvolutionMessage[] = Array.isArray(messagesData?.messages)
          ? messagesData.messages
          : Array.isArray(messagesData)
            ? messagesData
            : []

        // Filter messages by timestamp
        const recentMessages = messages.filter(msg => {
          const ts = typeof msg.messageTimestamp === 'number'
            ? msg.messageTimestamp
            : parseInt(msg.messageTimestamp || '0')
          return ts >= cutoffTimestamp
        })

        log('DEBUG', `Found ${recentMessages.length} recent messages for ${contactJid.substring(0, 15)}`)

        // Process messages in batches
        for (let i = 0; i < recentMessages.length; i += BATCH_SIZE) {
          const batch = recentMessages.slice(i, i + BATCH_SIZE)

          const insertData = batch.map(msg => {
            const messageText = extractMessageText(msg.message)
            const messageType = getMessageType(msg.message)

            let messageTimestamp: Date
            if (typeof msg.messageTimestamp === 'number') {
              messageTimestamp = new Date(msg.messageTimestamp * 1000)
            } else if (typeof msg.messageTimestamp === 'string') {
              messageTimestamp = new Date(parseInt(msg.messageTimestamp) * 1000)
            } else {
              messageTimestamp = new Date()
            }

            return {
              user_id: user.id,
              instance_name: instanceName,
              message_id: msg.key.id,
              remote_jid: msg.key.remoteJid,
              contact_name: msg.pushName || null,
              contact_phone: jidToPhone(msg.key.remoteJid),
              direction: msg.key.fromMe ? 'outgoing' : 'incoming',
              message_type: messageType,
              content_text: messageText || null,
              processing_status: 'completed',
              message_timestamp: messageTimestamp.toISOString(),
              synced_from_history: true,
            }
          })

          // Insert with conflict handling (skip duplicates)
          const { error: insertError, count } = await supabaseService
            .from('whatsapp_messages')
            .upsert(insertData, {
              onConflict: 'user_id,message_id',
              ignoreDuplicates: true,
            })

          if (insertError) {
            log('ERROR', 'Batch insert error', insertError)
          } else {
            totalSynced += batch.length
          }
        }
      } catch (contactError) {
        log('ERROR', `Error syncing contact ${contactJid}`, (contactError as Error).message)
      }
    }

    // 9. Update session with sync info
    await supabaseService
      .from('whatsapp_sessions')
      .update({
        last_history_sync_at: new Date().toISOString(),
        history_messages_synced: totalSynced,
      })
      .eq('instance_name', instanceName)

    // 10. Return response
    const response: SyncResponse = {
      success: true,
      synced: totalSynced,
      contacts: contactsToSync.length,
    }

    log('INFO', `Sync completed: ${totalSynced} messages from ${contactsToSync.length} contacts`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Sync failed', err.message)

    const errorResponse: SyncResponse = {
      success: false,
      error: err.message,
    }

    const status = err.message.includes('authentication') ? 401 : 400

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
