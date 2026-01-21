/**
 * Evolution API Webhook Handler
 *
 * Receives and processes webhook events from Evolution API for WhatsApp integration.
 * Multi-instance architecture: routes events to correct user based on instance name.
 *
 * Endpoint: POST /functions/v1/webhook-evolution
 * Headers: x-evolution-signature (HMAC-SHA256)
 * Events: CONNECTION_UPDATE, MESSAGES_UPSERT, QRCODE_UPDATED, CONTACTS_UPDATE
 *
 * Features:
 * - HMAC-SHA256 signature validation
 * - Message storage with deduplication
 * - Consent keyword processing (LGPD compliance)
 * - Media download to Supabase Storage
 * - Queue integration with pgmq for async processing
 * - Rate limiting protection (100 req/min per IP)
 *
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 * Issue: #126 - Update webhook-evolution for multi-instance
 * Original: Issue #12 - WhatsApp Integration via Evolution API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

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

// Health Score real-time configuration (Issue #144)
const HEALTH_SCORE_REALTIME_ENABLED = Deno.env.get('HEALTH_SCORE_REALTIME_ENABLED') === 'true'
const HEALTH_SCORE_DEBOUNCE_MS = parseInt(Deno.env.get('HEALTH_SCORE_DEBOUNCE_MS') || '60000') // 1 minute default

// Legacy instance configuration (deprecated - multi-instance architecture uses whatsapp_sessions table)
// Kept for backward compatibility during migration, should be removed after full migration
const LEGACY_SHARED_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'AI_Comtxae_4006'

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // Max 100 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// Health Score debounce map (Issue #144)
// Key: `${userId}_${contactPhone}`, Value: last trigger timestamp
const healthScoreDebounceMap = new Map<string, number>()

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
    const computedSignature = arrayBufferToHex(signatureBuffer)

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
 * Find user by Evolution instance name
 * Multi-instance architecture: checks whatsapp_sessions table first
 * Epic #122: Multi-Instance WhatsApp Architecture
 * Issue #126: Update webhook-evolution for multi-instance
 */
async function findUserByInstance(supabase: ReturnType<typeof createClient>, instanceName: string): Promise<string | null> {
  // 1. Check whatsapp_sessions table (primary source for multi-instance)
  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('user_id')
    .eq('instance_name', instanceName)
    .single()

  if (session?.user_id) {
    log('DEBUG', 'User found via whatsapp_sessions', { instanceName, userId: session.user_id })
    return session.user_id
  }

  // 2. Try to extract user_id from instance name pattern (aica_<user_id_prefix>)
  // Format: aica_a1b2c3d4 where a1b2c3d4 is first 8 chars of user_id
  if (instanceName.startsWith('aica_')) {
    const prefix = instanceName.replace('aica_', '').split('_')[0]
    if (prefix.length >= 8) {
      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('user_id')
        .ilike('instance_name', `aica_${prefix}%`)
        .limit(1)

      if (sessions && sessions.length > 0) {
        log('DEBUG', 'User found via instance prefix', { instanceName, userId: sessions[0].user_id })
        return sessions[0].user_id
      }
    }
  }

  // 3. Legacy fallback: check users table for instance_name column
  const { data: legacyUser } = await supabase
    .from('users')
    .select('id')
    .eq('instance_name', instanceName)
    .single()

  if (legacyUser?.id) {
    log('DEBUG', 'User found via legacy users.instance_name', { instanceName })
    return legacyUser.id
  }

  // 4. Check if this is the legacy shared instance (deprecated)
  // Multi-instance architecture: each user has their own instance
  if (instanceName === LEGACY_SHARED_INSTANCE) {
    log('WARN', 'Event from legacy shared instance, cannot determine user', { instanceName })
    // For legacy shared instance, we cannot determine the user without additional context
    // This should become less common as users migrate to per-user instances
    return null
  }

  log('WARN', 'No user found for instance', { instanceName })
  return null
}

/**
 * Get session by instance name
 */
async function getSessionByInstance(
  supabase: ReturnType<typeof createClient>,
  instanceName: string
): Promise<{ id: string; user_id: string; status: string } | null> {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('id, user_id, status')
    .eq('instance_name', instanceName)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Get or create contact_id from contact_network table
 * Required because whatsapp_messages uses contact_id FK
 */
async function getOrCreateContactId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contactPhone: string,
  contactName: string | null
): Promise<string | null> {
  try {
    // Normalize phone number (remove + if present, ensure format)
    const normalizedPhone = contactPhone.startsWith('+') ? contactPhone : `+${contactPhone}`

    // Try to find existing contact by phone
    const { data: existingContact, error: findError } = await supabase
      .from('contact_network')
      .select('id')
      .eq('user_id', userId)
      .eq('phone_number', normalizedPhone)
      .maybeSingle()

    if (findError) {
      log('ERROR', 'Failed to find contact', findError.message)
      return null
    }

    if (existingContact) {
      return existingContact.id
    }

    // Create new contact if not found
    const { data: newContact, error: createError } = await supabase
      .from('contact_network')
      .insert({
        user_id: userId,
        phone_number: normalizedPhone,
        name: contactName || `WhatsApp ${contactPhone}`,
        source: 'whatsapp',
        // Initialize health score fields
        health_score: 10,
        health_score_trend: 'stable',
      })
      .select('id')
      .single()

    if (createError) {
      log('ERROR', 'Failed to create contact', createError.message)
      return null
    }

    log('INFO', 'Created new contact from WhatsApp message', { contactId: newContact.id, phone: normalizedPhone })
    return newContact.id
  } catch (error) {
    log('ERROR', 'getOrCreateContactId failed', (error as Error).message)
    return null
  }
}

/**
 * Store incoming message
 * Updated to use current whatsapp_messages schema with contact_id FK
 *
 * @returns Object with messageId and contactId, or null on failure
 */
async function storeMessage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  instanceName: string,
  messageData: MessageData
): Promise<{ messageId: string; contactId: string } | null> {
  try {
    const messageId = messageData.key.id
    const remoteJid = messageData.key.remoteJid
    const fromMe = messageData.key.fromMe
    const contactPhone = jidToPhone(remoteJid)
    const messageText = extractMessageText(messageData.message)
    const messageType = getMessageType(messageData.message)

    // Skip non-text messages for now (schema doesn't support media)
    if (!messageText) {
      log('DEBUG', 'Skipping non-text message', { messageId, type: messageType })
      return null
    }

    // Get or create contact_id (required FK)
    const contactId = await getOrCreateContactId(
      supabase,
      userId,
      contactPhone,
      messageData.pushName || null
    )

    if (!contactId) {
      log('ERROR', 'Could not get/create contact for message', { contactPhone })
      return null
    }

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

    // Insert using current schema: contact_id, message_text, message_direction
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: userId,
        contact_id: contactId,
        message_text: messageText,
        message_direction: fromMe ? 'outgoing' : 'incoming',
        message_timestamp: messageTimestamp.toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      // Check if it's a duplicate (unlikely without message_id unique constraint)
      if (error.code === '23505') {
        log('DEBUG', 'Duplicate message, skipping', { messageId })
        return null
      }
      throw error
    }

    log('INFO', 'Message stored', {
      id: data.id,
      contactId,
      direction: fromMe ? 'outgoing' : 'incoming',
      textLength: messageText.length
    })
    return { messageId: data.id, contactId }
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
 * Check for pending actions and process confirmation responses
 * Issue #100: Organization document registration via WhatsApp
 */
async function checkPendingActionResponse(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contactPhone: string,
  remoteJid: string,
  instanceName: string,
  messageText: string
): Promise<{ handled: boolean; response?: string }> {
  try {
    const normalizedText = messageText.trim().toUpperCase()

    // Check for YES/NO responses
    const isConfirmation = ['SIM', 'S', 'YES', 'Y', 'OK', 'CONFIRMO', 'PODE', 'CADASTRAR'].some(
      k => normalizedText === k || normalizedText.startsWith(k + ' ')
    )
    const isRejection = ['NAO', 'NÃO', 'N', 'NO', 'CANCELAR', 'IGNORAR', 'DEPOIS'].some(
      k => normalizedText === k || normalizedText.startsWith(k + ' ')
    )

    if (!isConfirmation && !isRejection) {
      return { handled: false }
    }

    // Find pending action for this user/contact
    const { data: pendingAction, error: fetchError } = await supabase
      .from('whatsapp_pending_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_phone', contactPhone)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !pendingAction) {
      return { handled: false }
    }

    log('INFO', 'Found pending action for response', {
      actionId: pendingAction.id,
      actionType: pendingAction.action_type,
      isConfirmation,
    })

    if (isRejection) {
      // User rejected - update status
      await supabase
        .from('whatsapp_pending_actions')
        .update({
          status: 'rejected',
          user_response: messageText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingAction.id)

      return {
        handled: true,
        response: '✅ Entendido! O documento foi ignorado. Pode enviar outro documento quando quiser.',
      }
    }

    // User confirmed - process the action
    await supabase
      .from('whatsapp_pending_actions')
      .update({
        status: 'processing',
        user_response: messageText,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', pendingAction.id)

    // Process based on action type
    if (pendingAction.action_type === 'register_organization') {
      const result = await processOrganizationRegistration(
        supabase,
        userId,
        pendingAction.id,
        pendingAction.action_payload
      )

      return {
        handled: true,
        response: result.success
          ? `🎉 *Organizacao cadastrada com sucesso!*\n\n${result.message}\n\nVoce pode completar o cadastro no app.`
          : `❌ Erro ao cadastrar: ${result.error}`,
      }
    }

    return { handled: false }
  } catch (error) {
    log('ERROR', 'Pending action check failed', (error as Error).message)
    return { handled: false }
  }
}

/**
 * Process organization registration from confirmed pending action
 */
async function processOrganizationRegistration(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  pendingActionId: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const storageUrl = payload.storage_url as string | undefined

    // If we have a storage URL, call the process-organization-document Edge Function
    if (storageUrl) {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession()

      // Call the Edge Function to extract structured fields
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'process-organization-document',
        {
          body: {
            storage_path: storageUrl,
            document_type: payload.document_type || 'auto',
          },
        }
      )

      if (processError) {
        throw new Error(`Processing failed: ${processError.message}`)
      }

      if (processResult?.success && processResult?.fields) {
        // Create organization with extracted fields
        const orgData = {
          user_id: userId,
          ...processResult.fields,
          source: 'whatsapp',
          source_document_url: storageUrl,
          wizard_status: 'draft',
        }

        const { data: org, error: insertError } = await supabase
          .from('organizations')
          .insert(orgData)
          .select('id, name, legal_name, document_number')
          .single()

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`)
        }

        // Update pending action with success
        await supabase
          .from('whatsapp_pending_actions')
          .update({
            status: 'completed',
            result_data: { organization_id: org.id, ...processResult.fields },
            processed_at: new Date().toISOString(),
          })
          .eq('id', pendingActionId)

        const orgName = org.name || org.legal_name || 'Nova Organizacao'
        const cnpjFormatted = org.document_number
          ? org.document_number.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
          : ''

        return {
          success: true,
          message: `📌 *${orgName}*${cnpjFormatted ? `\n📄 CNPJ: ${cnpjFormatted}` : ''}`,
        }
      }
    }

    // Fallback: create organization with just the extracted OCR data
    const orgData = {
      user_id: userId,
      document_number: payload.cnpj as string | undefined,
      legal_name: payload.razao_social as string | undefined,
      name: payload.nome_fantasia as string | undefined,
      source: 'whatsapp',
      wizard_status: 'draft',
    }

    const { data: org, error: insertError } = await supabase
      .from('organizations')
      .insert(orgData)
      .select('id, name, legal_name, document_number')
      .single()

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`)
    }

    // Update pending action with success
    await supabase
      .from('whatsapp_pending_actions')
      .update({
        status: 'completed',
        result_data: { organization_id: org.id },
        processed_at: new Date().toISOString(),
      })
      .eq('id', pendingActionId)

    const orgName = org.name || org.legal_name || 'Nova Organizacao'
    return {
      success: true,
      message: `📌 *${orgName}* (cadastro basico)`,
    }
  } catch (error) {
    const errorMsg = (error as Error).message

    // Update pending action with failure
    await supabase
      .from('whatsapp_pending_actions')
      .update({
        status: 'failed',
        error_message: errorMsg,
        processed_at: new Date().toISOString(),
      })
      .eq('id', pendingActionId)

    log('ERROR', 'Organization registration failed', errorMsg)
    return { success: false, error: errorMsg }
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
 * Trigger health score recalculation for a contact
 * Issue #144: Real-time health score updates
 *
 * Uses debouncing to avoid excessive recalculations when multiple
 * messages arrive in quick succession.
 *
 * @param contactId - The contact_network.id to recalculate (already resolved by storeMessage)
 */
async function triggerHealthScoreRecalculation(
  contactId: string
): Promise<void> {
  if (!HEALTH_SCORE_REALTIME_ENABLED) {
    return
  }

  const debounceKey = contactId
  const now = Date.now()
  const lastTrigger = healthScoreDebounceMap.get(debounceKey) || 0

  // Skip if within debounce window
  if (now - lastTrigger < HEALTH_SCORE_DEBOUNCE_MS) {
    log('DEBUG', 'Health score recalc debounced', { contactId })
    return
  }

  // Update debounce timestamp
  healthScoreDebounceMap.set(debounceKey, now)

  try {
    // Call calculate-health-scores Edge Function via internal HTTP
    // Using service role to allow batch operations
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-health-scores`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactId }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log('WARN', 'Health score recalc failed', { status: response.status, error: errorText })
      return
    }

    const result = await response.json()
    log('INFO', 'Health score recalculated', {
      contactId,
      score: result.healthScore,
      trend: result.trend,
    })
  } catch (error) {
    log('ERROR', 'Health score recalc error', (error as Error).message)
    // Don't throw - this is a non-critical operation
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

    // Check for pending action responses (SIM/NAO confirmation)
    const pendingActionResult = await checkPendingActionResponse(
      supabase,
      userId,
      contactPhone,
      messageData.key.remoteJid,
      instanceName,
      messageText
    )
    if (pendingActionResult.handled) {
      if (pendingActionResult.response) {
        await sendWhatsAppMessage(instanceName, messageData.key.remoteJid, pendingActionResult.response)
      }
      // Still store the message for record-keeping, but mark as processed
    }
  }

  // Store the message
  const result = await storeMessage(supabase, userId, instanceName, messageData)

  if (result) {
    const messageType = getMessageType(messageData.message)

    // Queue for async processing if needed (audio transcription, OCR, etc.)
    // Note: Currently skipped since schema doesn't support media
    if (messageType !== 'text') {
      await enqueueForProcessing(supabase, result.messageId, messageType, userId)
    }

    // Trigger health score recalculation (Issue #144)
    // Fire and forget - don't block webhook response
    triggerHealthScoreRecalculation(result.contactId).catch(err => {
      log('WARN', 'Health score trigger failed', (err as Error).message)
    })
  }
}

/**
 * Handle connection.update event
 * Multi-instance: updates whatsapp_sessions table
 * Epic #122: Multi-Instance WhatsApp Architecture
 *
 * When connection becomes 'open', automatically triggers:
 * 1. Contact sync (via sync-whatsapp-contacts)
 * 2. Message history sync (via sync-message-history)
 */
async function handleConnectionUpdate(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  eventData: ConnectionUpdateData
): Promise<void> {
  const { state, statusReason } = eventData

  log('INFO', 'Connection update', { instanceName, state, statusReason })

  // Get session for this instance
  const session = await getSessionByInstance(supabase, instanceName)

  if (session) {
    // Update whatsapp_sessions table (multi-instance architecture)
    let newStatus: string
    let errorMessage: string | null = null
    const wasDisconnected = session.status !== 'connected'

    switch (state) {
      case 'open':
        newStatus = 'connected'
        break
      case 'close':
        newStatus = 'disconnected'
        break
      case 'connecting':
        newStatus = 'connecting'
        break
      default:
        newStatus = session.status // Keep current status
    }

    // Check for ban/error conditions
    if (statusReason === 401 || statusReason === 403) {
      newStatus = 'banned'
      errorMessage = `Connection rejected with status ${statusReason}`
    } else if (statusReason && statusReason >= 400) {
      newStatus = 'error'
      errorMessage = `Connection error: status ${statusReason}`
    }

    // Use the database function for proper status updates
    const { error } = await supabase.rpc('update_whatsapp_session_status', {
      p_session_id: session.id,
      p_status: newStatus,
      p_error_message: errorMessage,
      p_error_code: statusReason ? `STATUS_${statusReason}` : null,
    })

    if (error) {
      log('ERROR', 'Failed to update session status', error)
    } else {
      log('INFO', 'Session status updated', { instanceName, oldStatus: session.status, newStatus })
    }

    // AUTOMATIC SYNC: Trigger sync when newly connected
    if (state === 'open' && wasDisconnected) {
      log('INFO', 'Connection established, triggering automatic sync', { instanceName, userId: session.user_id })

      // Fire and forget - don't block webhook response
      triggerAutomaticSync(supabase, instanceName, session.user_id).catch(err => {
        log('ERROR', 'Automatic sync failed', (err as Error).message)
      })
    }
  }

  // Legacy: Also try to update users table for backward compatibility
  const userId = await findUserByInstance(supabase, instanceName)
  if (userId) {
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

    await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
  }
}

/**
 * Trigger automatic sync after connection is established
 * This runs asynchronously to not block the webhook response
 *
 * Sync order:
 * 1. Contacts and groups (fast)
 * 2. Message history (batch, background)
 */
async function triggerAutomaticSync(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
  userId: string
): Promise<void> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    log('WARN', 'Evolution API credentials not configured, skipping sync')
    return
  }

  try {
    // 1. Sync contacts from Evolution API
    log('INFO', 'Syncing contacts...', { instanceName })

    const contactsResponse = await fetch(
      `${EVOLUTION_API_URL}/chat/findContacts/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({}),
      }
    )

    if (contactsResponse.ok) {
      const contacts = await contactsResponse.json()
      const contactsArray = Array.isArray(contacts) ? contacts : []

      log('INFO', `Found ${contactsArray.length} contacts`, { instanceName })

      // Store contacts in contact_network table
      // Schema uses: whatsapp_id, name, phone_number, whatsapp_phone, whatsapp_name, whatsapp_profile_pic_url
      for (const contact of contactsArray.slice(0, 500)) { // Limit to 500 contacts
        const phone = contact.id?.replace('@s.whatsapp.net', '').replace('@g.us', '')
        if (!phone) continue

        // Skip groups - only sync individual contacts here
        if (contact.id?.includes('@g.us')) continue

        await supabase
          .from('contact_network')
          .upsert({
            user_id: userId,
            whatsapp_id: contact.id,
            whatsapp_phone: phone,
            phone_number: phone,
            name: contact.pushName || contact.name || null,
            whatsapp_name: contact.pushName || contact.name || null,
            whatsapp_profile_pic_url: contact.profilePictureUrl || null,
            sync_source: 'whatsapp',
            last_synced_at: new Date().toISOString(),
            whatsapp_synced_at: new Date().toISOString(),
            whatsapp_sync_status: 'synced',
          }, {
            onConflict: 'user_id,whatsapp_id',
            ignoreDuplicates: false,
          })
      }

      log('INFO', 'Contacts synced successfully', { instanceName, count: Math.min(contactsArray.length, 500) })
    } else {
      log('WARN', 'Failed to fetch contacts', { status: contactsResponse.status })
    }

    // 2. Fetch groups
    log('INFO', 'Syncing groups...', { instanceName })

    const groupsResponse = await fetch(
      `${EVOLUTION_API_URL}/group/fetchAllGroups/${instanceName}?getParticipants=false`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
      }
    )

    if (groupsResponse.ok) {
      const groups = await groupsResponse.json()
      const groupsArray = Array.isArray(groups) ? groups : []

      log('INFO', `Found ${groupsArray.length} groups`, { instanceName })

      // Store groups in contact_network table
      // Groups use whatsapp_id with @g.us suffix to distinguish from contacts
      for (const group of groupsArray.slice(0, 100)) { // Limit to 100 groups
        await supabase
          .from('contact_network')
          .upsert({
            user_id: userId,
            whatsapp_id: group.id,
            whatsapp_phone: group.id?.replace('@g.us', ''),
            name: group.subject || group.name || 'Group',
            whatsapp_name: group.subject || group.name || 'Group',
            whatsapp_profile_pic_url: group.pictureUrl || null,
            sync_source: 'whatsapp',
            last_synced_at: new Date().toISOString(),
            whatsapp_synced_at: new Date().toISOString(),
            whatsapp_sync_status: 'synced',
          }, {
            onConflict: 'user_id,whatsapp_id',
            ignoreDuplicates: false,
          })
      }

      log('INFO', 'Groups synced successfully', { instanceName, count: Math.min(groupsArray.length, 100) })
    } else {
      log('WARN', 'Failed to fetch groups', { status: groupsResponse.status })
    }

    // 3. Update session with sync timestamp
    await supabase
      .from('whatsapp_sessions')
      .update({
        last_sync_at: new Date().toISOString(),
        contacts_synced: true,
      })
      .eq('instance_name', instanceName)

    // 4. Queue message history sync (async, batch processing)
    // This will be handled by a separate Edge Function
    try {
      await supabase.rpc('pgmq_send', {
        queue_name: 'whatsapp_sync_history',
        message: JSON.stringify({
          instance_name: instanceName,
          user_id: userId,
          action: 'sync_message_history',
          queued_at: new Date().toISOString(),
        }),
      })
      log('INFO', 'Message history sync queued', { instanceName })
    } catch (queueError) {
      // Queue might not exist yet, that's OK
      log('WARN', 'Could not queue history sync', (queueError as Error).message)
    }

    log('INFO', 'Automatic sync completed', { instanceName, userId })
  } catch (error) {
    log('ERROR', 'Automatic sync error', (error as Error).message)
    throw error
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
