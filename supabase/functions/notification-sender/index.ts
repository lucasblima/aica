/**
 * Notification Sender Edge Function
 * Issue #12: WhatsApp Integration via Evolution API
 *
 * Sends scheduled WhatsApp notifications:
 * - Processes notification queue (pgmq)
 * - Applies message templates with variables
 * - Rate limiting to comply with WhatsApp policies
 * - Retry logic with exponential backoff
 * - Logging to notification_log table
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'Lucas_4569'

// Rate limiting: WhatsApp recommends max 1 message per second per number
const RATE_LIMIT_DELAY_MS = 1100 // 1.1 seconds between messages
const MAX_BATCH_SIZE = 50 // Process max 50 notifications per invocation
const RETRY_DELAYS = [5000, 15000, 60000] // 5s, 15s, 1min

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledNotification {
  id: string
  user_id: string
  target_phone: string
  target_name: string | null
  notification_type: string
  message_template: string
  message_variables: Record<string, string>
  scheduled_for: string
  timezone: string
  status: string
  attempts: number
  max_attempts: number
  priority: number
  is_recurring: boolean
  recurrence_pattern: string | null
}

interface SendResult {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: string
}

interface QueueMessage {
  notification_id: string
  user_id: string
  target_phone: string
  message_template: string
  message_variables: Record<string, string>
  priority: number
  attempt: number
}

// ============================================================================
// HELPERS
// ============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logData = data ? `: ${JSON.stringify(data)}` : ''
  console.log(`[${timestamp}] [${level}] [notification-sender] ${message}${logData}`)
}

/**
 * Apply template variables to message
 */
function applyTemplate(template: string, variables: Record<string, string>): string {
  let result = template

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value)
  }

  // Remove any remaining unmatched placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '')

  return result.trim()
}

/**
 * Format phone number for WhatsApp
 */
function formatPhoneForWhatsApp(phone: string): string {
  // Remove any non-numeric characters
  let cleaned = phone.replace(/\D/g, '')

  // Add country code if not present (assuming Brazil)
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned
  }

  return cleaned + '@s.whatsapp.net'
}

/**
 * Send WhatsApp message via Evolution API
 */
async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<SendResult> {
  try {
    const remoteJid = formatPhoneForWhatsApp(phone)

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: remoteJid,
        text: message,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorCode = 'UNKNOWN_ERROR'

      // Parse common error codes
      if (response.status === 401) errorCode = 'AUTH_ERROR'
      else if (response.status === 404) errorCode = 'INSTANCE_NOT_FOUND'
      else if (response.status === 429) errorCode = 'RATE_LIMITED'
      else if (response.status >= 500) errorCode = 'SERVER_ERROR'

      log('ERROR', 'Evolution API error', { status: response.status, error: errorText })
      return { success: false, error: errorText, errorCode }
    }

    const result = await response.json()
    const messageId = result.key?.id || result.id || 'unknown'

    log('INFO', 'Message sent successfully', { phone: phone.substring(0, 5) + '...', messageId })
    return { success: true, messageId }

  } catch (error) {
    log('ERROR', 'Send message exception', (error as Error).message)
    return { success: false, error: (error as Error).message, errorCode: 'EXCEPTION' }
  }
}

/**
 * Log notification attempt
 */
async function logNotificationAttempt(
  supabase: ReturnType<typeof createClient>,
  notificationId: string,
  userId: string,
  targetPhone: string,
  attemptNumber: number,
  result: SendResult,
  startedAt: Date
): Promise<void> {
  const completedAt = new Date()

  await supabase.from('notification_log').insert({
    notification_id: notificationId,
    user_id: userId,
    target_phone: targetPhone,
    attempt_number: attemptNumber,
    status: result.success ? 'success' : 'failed',
    error_message: result.error || null,
    error_code: result.errorCode || null,
    evolution_message_id: result.messageId || null,
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    duration_ms: completedAt.getTime() - startedAt.getTime(),
  })
}

/**
 * Update notification status after sending
 */
async function updateNotificationStatus(
  supabase: ReturnType<typeof createClient>,
  notification: ScheduledNotification,
  result: SendResult
): Promise<void> {
  const updates: Record<string, unknown> = {
    last_attempt_at: new Date().toISOString(),
    attempts: notification.attempts + 1,
    updated_at: new Date().toISOString(),
  }

  if (result.success) {
    updates.status = 'sent'
    updates.sent_at = new Date().toISOString()
    updates.evolution_message_id = result.messageId

    // If recurring, schedule next occurrence
    if (notification.is_recurring) {
      await supabase.rpc('create_next_recurring_notification', {
        notification_id: notification.id
      })
    }
  } else {
    // Check if we should retry
    if (notification.attempts + 1 >= notification.max_attempts) {
      updates.status = 'failed'
      updates.last_error = result.error
    } else {
      // Keep in scheduled status for retry
      updates.status = 'scheduled'
      updates.last_error = result.error

      // Calculate next retry time with exponential backoff
      const retryIndex = Math.min(notification.attempts, RETRY_DELAYS.length - 1)
      const retryDelay = RETRY_DELAYS[retryIndex]
      updates.scheduled_for = new Date(Date.now() + retryDelay).toISOString()
    }
  }

  await supabase
    .from('scheduled_notifications')
    .update(updates)
    .eq('id', notification.id)
}

/**
 * Process notifications from queue
 */
async function processQueuedNotifications(
  supabase: ReturnType<typeof createClient>,
  batchSize: number
): Promise<{ processed: number; successful: number; failed: number }> {
  let processed = 0
  let successful = 0
  let failed = 0

  // Read messages from queue
  const { data: messages, error: queueError } = await supabase.rpc('pgmq_read', {
    queue_name: 'whatsapp_notifications',
    vt: 30, // Visibility timeout: 30 seconds
    qty: batchSize
  })

  if (queueError) {
    log('ERROR', 'Queue read error', queueError)
    return { processed: 0, successful: 0, failed: 0 }
  }

  if (!messages || messages.length === 0) {
    log('DEBUG', 'No messages in queue')
    return { processed: 0, successful: 0, failed: 0 }
  }

  for (const msg of messages) {
    const queueMsg = msg.message as QueueMessage

    // Get full notification details
    const { data: notification, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('id', queueMsg.notification_id)
      .single()

    if (fetchError || !notification) {
      log('WARN', 'Notification not found', { id: queueMsg.notification_id })
      // Delete from queue anyway
      await supabase.rpc('pgmq_delete', {
        queue_name: 'whatsapp_notifications',
        msg_id: msg.msg_id
      })
      continue
    }

    // Apply template
    const message = applyTemplate(
      notification.message_template,
      notification.message_variables || {}
    )

    // Send the message
    const startedAt = new Date()
    const result = await sendWhatsAppMessage(notification.target_phone, message)

    // Log the attempt
    await logNotificationAttempt(
      supabase,
      notification.id,
      notification.user_id,
      notification.target_phone,
      notification.attempts + 1,
      result,
      startedAt
    )

    // Update notification status
    await updateNotificationStatus(supabase, notification as ScheduledNotification, result)

    // Delete from queue
    await supabase.rpc('pgmq_delete', {
      queue_name: 'whatsapp_notifications',
      msg_id: msg.msg_id
    })

    processed++
    if (result.success) successful++
    else failed++

    // Rate limiting delay
    if (processed < batchSize) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
    }
  }

  return { processed, successful, failed }
}

/**
 * Process due notifications directly (not from queue)
 */
async function processDueNotifications(
  supabase: ReturnType<typeof createClient>,
  batchSize: number
): Promise<{ processed: number; successful: number; failed: number }> {
  let processed = 0
  let successful = 0
  let failed = 0

  // Get due notifications
  const { data: notifications, error: fetchError } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('scheduled_for', { ascending: true })
    .limit(batchSize)

  if (fetchError) {
    log('ERROR', 'Failed to fetch notifications', fetchError)
    return { processed: 0, successful: 0, failed: 0 }
  }

  if (!notifications || notifications.length === 0) {
    log('DEBUG', 'No due notifications')
    return { processed: 0, successful: 0, failed: 0 }
  }

  log('INFO', `Processing ${notifications.length} due notifications`)

  for (const notification of notifications) {
    // Mark as sending
    await supabase
      .from('scheduled_notifications')
      .update({ status: 'sending' })
      .eq('id', notification.id)

    // Apply template
    const message = applyTemplate(
      notification.message_template,
      notification.message_variables || {}
    )

    // Send the message
    const startedAt = new Date()
    const result = await sendWhatsAppMessage(notification.target_phone, message)

    // Log the attempt
    await logNotificationAttempt(
      supabase,
      notification.id,
      notification.user_id,
      notification.target_phone,
      notification.attempts + 1,
      result,
      startedAt
    )

    // Update notification status
    await updateNotificationStatus(supabase, notification as ScheduledNotification, result)

    processed++
    if (result.success) successful++
    else failed++

    // Rate limiting delay
    if (processed < notifications.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
    }
  }

  return { processed, successful, failed }
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    // Parse request body (optional)
    let batchSize = MAX_BATCH_SIZE
    let mode = 'auto' // 'auto', 'queue', or 'direct'

    try {
      const body = await req.json()
      if (body.batch_size) batchSize = Math.min(body.batch_size, MAX_BATCH_SIZE)
      if (body.mode) mode = body.mode
    } catch {
      // No body or invalid JSON, use defaults
    }

    log('INFO', 'Notification sender invoked', { mode, batchSize })

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let results: { processed: number; successful: number; failed: number }

    if (mode === 'queue') {
      // Process from pgmq queue
      results = await processQueuedNotifications(supabase, batchSize)
    } else if (mode === 'direct') {
      // Process directly from scheduled_notifications table
      results = await processDueNotifications(supabase, batchSize)
    } else {
      // Auto mode: try queue first, then direct
      results = await processQueuedNotifications(supabase, batchSize)

      if (results.processed === 0) {
        results = await processDueNotifications(supabase, batchSize)
      }
    }

    log('INFO', 'Processing complete', results)

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        ...results,
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    const err = error as Error
    log('ERROR', 'Notification sender failed', err.message)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
