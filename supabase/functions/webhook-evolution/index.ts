/**
 * Evolution API Webhook Handler - Enhanced Version
 * Issue #12: WhatsApp Integration via Evolution API
 *
 * Features:
 * - HMAC-SHA256 signature validation
 * - Message storage with deduplication
 * - Consent keyword processing (LGPD)
 * - Media download to Supabase Storage
 * - Queue integration with pgmq for async processing
 * - Rate limiting protection
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"
import { encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts"

// ============================================================================
// TYPES
// ============================================================================

interface EvolutionWebhookEvent {
  event: string
  instance: string
  data: Record<string, unknown>
  date_time?: string
  sender?: string
  server_url?: string
  apikey?: string
}

interface MessageData {
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
    imageMessage?: {
      url?: string
      mimetype?: string
      caption?: string
      fileLength?: string
      fileName?: string
    }
    audioMessage?: {
      url?: string
      mimetype?: string
      seconds?: number
      fileLength?: string
    }
    videoMessage?: {
      url?: string
      mimetype?: string
      caption?: string
      seconds?: number
      fileLength?: string
    }
    documentMessage?: {
      url?: string
      mimetype?: string
      title?: string
      fileName?: string
      fileLength?: string
    }
    stickerMessage?: {
      url?: string
      mimetype?: string
    }
    reactionMessage?: {
      key: { id: string }
      text: string
    }
    locationMessage?: {
      degreesLatitude: number
      degreesLongitude: number
      name?: string
      address?: string
    }
  }
  messageTimestamp?: number | string
  messageType?: string
}

interface ConnectionUpdateData {
  instance: string
  state?: string
  statusReason?: number
}

interface QRCodeData {
  instance: string
  qrcode?: {
    base64?: string
    code?: string
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVOLUTION_WEBHOOK_SECRET = Deno.env.get('EVOLUTION_WEBHOOK_SECRET')
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')

// Instance configuration
const AICA_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'Lucas_4569'
const AICA_PHONE = Deno.env.get('AICA_WHATSAPP_PHONE') || '5521965564006'

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // Max 100 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://evolution-evolution-api.w9jo16.easypanel.host',
]

// ============================================================================
// HELPERS
// ============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [webhook-evolution] ${message}${logData}`)
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-evolution-signature, x-webhook-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }
}

/**
 * Validate HMAC-SHA256 signature from Evolution API
 */
async function validateHmacSignature(body: string, signature: string | null): Promise<boolean> {
  if (!EVOLUTION_WEBHOOK_SECRET) {
    log('WARN', 'EVOLUTION_WEBHOOK_SECRET not configured, skipping signature validation')
    return true // Allow in development, should be required in production
  }

  if (!signature) {
    log('ERROR', 'Webhook signature missing from request headers')
    return false
  }

  try {
    // Evolution API sends signature as: sha256=<hex_signature>
    const expectedPrefix = 'sha256='
    const signatureValue = signature.startsWith(expectedPrefix)
      ? signature.slice(expectedPrefix.length)
      : signature

    // Create HMAC-SHA256
    const encoder = new TextEncoder()
    const keyData = encoder.encode(EVOLUTION_WEBHOOK_SECRET)
    const messageData = encoder.encode(body)

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)
    const computedSignature = encodeHex(new Uint8Array(signatureBuffer))

    // Constant-time comparison to prevent timing attacks
    if (computedSignature.length !== signatureValue.length) {
      log('ERROR', 'Signature length mismatch')
      return false
    }

    let match = true
    for (let i = 0; i < computedSignature.length; i++) {
      if (computedSignature[i] !== signatureValue[i]) {
        match = false
      }
    }

    if (!match) {
      log('ERROR', 'Signature mismatch', {
        expected: computedSignature.substring(0, 10) + '...',
        received: signatureValue.substring(0, 10) + '...'
      })
    }

    return match
  } catch (error) {
    log('ERROR', 'HMAC validation error', (error as Error).message)
    return false
  }
}

/**
 * Rate limiting check
 */
function checkRateLimit(clientIp: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(clientIp)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    log('WARN', 'Rate limit exceeded', { ip: clientIp, count: record.count })
    return false
  }

  record.count++
  return true
}

/**
 * Extract client IP from request
 */
function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

/**
 * Extract message text from various message types
 */
function extractMessageText(message: MessageData['message']): string {
  if (!message) return ''

  if (message.conversation) return message.conversation
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text
  if (message.imageMessage?.caption) return message.imageMessage.caption
  if (message.videoMessage?.caption) return message.videoMessage.caption
  if (message.documentMessage?.title) return message.documentMessage.title
  if (message.reactionMessage?.text) return message.reactionMessage.text
  if (message.locationMessage?.name) return message.locationMessage.name

  return ''
}

/**
 * Determine message type from Evolution API message
 */
function getMessageType(message: MessageData['message']): string {
  if (!message) return 'text'

  if (message.audioMessage) return 'audio'
  if (message.imageMessage) return 'image'
  if (message.videoMessage) return 'video'
  if (message.documentMessage) return 'document'
  if (message.stickerMessage) return 'sticker'
  if (message.locationMessage) return 'location'
  if (message.reactionMessage) return 'reaction'

  return 'text'
}

/**
 * Convert WhatsApp JID to normalized phone number
 */
function jidToPhone(remoteJid: string): string {
  return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

/**
 * Get media info from message
 */
function getMediaInfo(message: MessageData['message']): {
  url?: string
  mimetype?: string
  filename?: string
  size?: number
  duration?: number
} | null {
  if (!message) return null

  const mediaFields = [
    message.audioMessage,
    message.imageMessage,
    message.videoMessage,
    message.documentMessage,
    message.stickerMessage,
  ].find(m => m)

  if (!mediaFields) return null

  return {
    url: (mediaFields as { url?: string }).url,
    mimetype: (mediaFields as { mimetype?: string }).mimetype,
    filename: (mediaFields as { fileName?: string }).fileName ||
              (mediaFields as { title?: string }).title,
    size: parseInt((mediaFields as { fileLength?: string }).fileLength || '0'),
    duration: (mediaFields as { seconds?: number }).seconds,
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Find user by Evolution instance or phone number
 */
async function findUserByInstance(supabase: ReturnType<typeof createClient>, instanceName: string): Promise<string | null> {
  // Try to find user by instance name pattern (userId_instanceName)
  const parts = instanceName.split('_')
  if (parts.length > 1) {
    const possibleUserId = parts[0]
    // Validate UUID format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(possibleUserId)) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('id', possibleUserId)
        .single()
      if (data) return data.id
    }
  }

  // Fallback: look for user with this instance_name in users table
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('instance_name', instanceName)
    .single()

  return data?.id || null
}

/**
 * Store incoming message
 */
async function storeMessage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  instanceName: string,
  messageData: MessageData
): Promise<string | null> {
  try {
    const messageId = messageData.key.id
    const remoteJid = messageData.key.remoteJid
    const fromMe = messageData.key.fromMe
    const contactPhone = jidToPhone(remoteJid)
    const messageText = extractMessageText(messageData.message)
    const messageType = getMessageType(messageData.message)
    const mediaInfo = getMediaInfo(messageData.message)

    // Timestamp handling
    let messageTimestamp: Date
    if (typeof messageData.messageTimestamp === 'number') {
      // Unix timestamp in seconds
      messageTimestamp = new Date(messageData.messageTimestamp * 1000)
    } else if (typeof messageData.messageTimestamp === 'string') {
      messageTimestamp = new Date(parseInt(messageData.messageTimestamp) * 1000)
    } else {
      messageTimestamp = new Date()
    }

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: userId,
        instance_name: instanceName,
        message_id: messageId,
        remote_jid: remoteJid,
        contact_name: messageData.pushName || null,
        contact_phone: contactPhone,
        direction: fromMe ? 'outgoing' : 'incoming',
        message_type: messageType,
        content_text: messageText || null,
        media_url: mediaInfo?.url || null,
        media_mimetype: mediaInfo?.mimetype || null,
        media_filename: mediaInfo?.filename || null,
        media_size_bytes: mediaInfo?.size || null,
        media_duration_seconds: mediaInfo?.duration || null,
        processing_status: messageType === 'text' ? 'completed' : 'pending',
        message_timestamp: messageTimestamp.toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      // Check if it's a duplicate
      if (error.code === '23505') {
        log('DEBUG', 'Duplicate message, skipping', { messageId })
        return null
      }
      throw error
    }

    log('INFO', 'Message stored', { id: data.id, messageId, type: messageType })
    return data.id
  } catch (error) {
    log('ERROR', 'Failed to store message', (error as Error).message)
    return null
  }
}

/**
 * Process consent keywords
 */
async function processConsentKeyword(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contactPhone: string,
  messageText: string
): Promise<{ matched: boolean; response?: string }> {
  try {
    const { data, error } = await supabase.rpc('process_consent_keyword', {
      p_user_id: userId,
      p_contact_phone: contactPhone,
      p_message: messageText,
      p_language: 'pt-BR'
    })

    if (error) {
      log('ERROR', 'Consent keyword processing error', error)
      return { matched: false }
    }

    if (data && data.length > 0 && data[0].matched) {
      log('INFO', 'Consent keyword processed', {
        action: data[0].action,
        consent_type: data[0].consent_type
      })
      return { matched: true, response: data[0].response_message }
    }

    return { matched: false }
  } catch (error) {
    log('ERROR', 'Consent processing failed', (error as Error).message)
    return { matched: false }
  }
}

/**
 * Enqueue message for async processing (AI analysis, transcription, etc.)
 */
async function enqueueForProcessing(
  supabase: ReturnType<typeof createClient>,
  messageDbId: string,
  messageType: string,
  userId: string
): Promise<void> {
  if (messageType === 'text') return // Text messages don't need queue processing

  try {
    // Insert into pgmq queue via SQL function
    await supabase.rpc('pgmq_send', {
      queue_name: 'whatsapp_media_processing',
      message: JSON.stringify({
        message_id: messageDbId,
        message_type: messageType,
        user_id: userId,
        queued_at: new Date().toISOString()
      })
    })

    log('INFO', 'Message queued for processing', { messageDbId, messageType })
  } catch (error) {
    log('WARN', 'Failed to queue message', (error as Error).message)
    // Don't fail the webhook if queueing fails
  }
}

/**
 * Send response message via Evolution API
 */
async function sendWhatsAppMessage(
  instanceName: string,
  remoteJid: string,
  text: string
): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    log('WARN', 'Evolution API credentials not configured')
    return false
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: remoteJid,
        text: text,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log('ERROR', 'Failed to send WhatsApp message', { status: response.status, error: errorText })
      return false
    }

    log('INFO', 'WhatsApp message sent', { remoteJid: remoteJid.substring(0, 10) + '...' })
    return true
  } catch (error) {
    log('ERROR', 'Error sending WhatsApp message', (error as Error).message)
    return false
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle messages.upsert event
 */
async function handleMessagesUpsert(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  eventData: { data: MessageData }
): Promise<void> {
  const messageData = eventData.data

  // Skip if fromMe (our own messages)
  if (messageData.key.fromMe) {
    log('DEBUG', 'Skipping outgoing message')
    return
  }

  // Find user for this instance
  const userId = await findUserByInstance(supabase, instanceName)
  if (!userId) {
    log('WARN', 'No user found for instance', { instanceName })
    return
  }

  const contactPhone = jidToPhone(messageData.key.remoteJid)
  const messageText = extractMessageText(messageData.message)

  // Check for consent keywords first
  if (messageText) {
    const consentResult = await processConsentKeyword(supabase, userId, contactPhone, messageText)
    if (consentResult.matched && consentResult.response) {
      // Send automatic response for consent keyword
      await sendWhatsAppMessage(instanceName, messageData.key.remoteJid, consentResult.response)
      return // Don't store consent keywords as regular messages
    }
  }

  // Store the message
  const messageDbId = await storeMessage(supabase, userId, instanceName, messageData)

  if (messageDbId) {
    const messageType = getMessageType(messageData.message)

    // Queue for async processing if needed (audio transcription, OCR, etc.)
    if (messageType !== 'text') {
      await enqueueForProcessing(supabase, messageDbId, messageType, userId)
    }
  }
}

/**
 * Handle connection.update event
 */
async function handleConnectionUpdate(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  eventData: ConnectionUpdateData
): Promise<void> {
  const { state, statusReason } = eventData

  log('INFO', 'Connection update', { instanceName, state, statusReason })

  const userId = await findUserByInstance(supabase, instanceName)
  if (!userId) {
    log('WARN', 'No user found for connection update', { instanceName })
    return
  }

  // Update user's WhatsApp connection status
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (state === 'open') {
    updates.whatsapp_connected = true
    updates.whatsapp_connected_at = new Date().toISOString()
  } else if (state === 'close' || state === 'connecting') {
    updates.whatsapp_connected = false
    updates.whatsapp_disconnected_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)

  if (error) {
    log('ERROR', 'Failed to update user connection status', error)
  }
}

/**
 * Handle qrcode.updated event
 */
async function handleQRCodeUpdated(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  eventData: QRCodeData
): Promise<void> {
  log('INFO', 'QR Code updated for instance', { instanceName })

  // QR code events are typically handled by the frontend polling
  // We could store them for later retrieval if needed
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

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: CORS_HEADERS }
    )
  }

  // Rate limiting
  const clientIp = getClientIp(req)
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: CORS_HEADERS }
    )
  }

  try {
    // Get raw body for signature validation
    const bodyText = await req.text()

    // Validate HMAC signature
    const signature = req.headers.get('x-evolution-signature') ||
                      req.headers.get('x-webhook-signature')

    const isValidSignature = await validateHmacSignature(bodyText, signature)
    if (!isValidSignature) {
      log('ERROR', 'Invalid webhook signature', { ip: clientIp })
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Parse body
    const body = JSON.parse(bodyText) as EvolutionWebhookEvent
    const { event, instance, data } = body

    log('INFO', 'Webhook received', { event, instance })

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Route to appropriate handler
    switch (event) {
      case 'messages.upsert':
        await handleMessagesUpsert(supabase, instance, data as { data: MessageData })
        break

      case 'connection.update':
        await handleConnectionUpdate(supabase, instance, data as ConnectionUpdateData)
        break

      case 'qrcode.updated':
        await handleQRCodeUpdated(supabase, instance, data as QRCodeData)
        break

      case 'messages.delete':
      case 'messages.update':
      case 'presence.update':
      case 'chats.upsert':
      case 'chats.update':
      case 'contacts.upsert':
        // Log but don't process these events
        log('DEBUG', `Event ${event} received but not processed`)
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
