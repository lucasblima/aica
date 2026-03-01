/**
 * Telegram Send Notification Edge Function
 * Issue #574: Telegram Bot Integration — Phase 2
 *
 * Processes pending Telegram notifications from scheduled_notifications table.
 * Invoked by pg_cron every minute via net.http_post.
 *
 * Flow:
 * 1. Query scheduled_notifications WHERE channel = 'telegram' AND status = 'scheduled' AND scheduled_for <= now()
 * 2. For each notification, look up telegram chat_id from user_telegram_links
 * 3. Format message based on notification_type with inline keyboards
 * 4. Send via TelegramAdapter.sendMessage()
 * 5. Update notification status to 'sent' or 'failed'
 * 6. Log to telegram_message_log
 *
 * Pattern: stripe-webhook (validate → process → respond)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import { TelegramAdapter } from "../_shared/telegram-adapter.ts"
import type { OutboundMessage, InlineKeyboard } from "../_shared/channel-adapter.ts"

// ============================================================================
// TYPES
// ============================================================================

type SupabaseClient = ReturnType<typeof createClient>

interface ScheduledNotification {
  id: string
  user_id: string
  notification_type: string
  message_template: string
  message_variables: Record<string, string>
  channel_user_id: string | null
  priority: number
  attempts: number
  max_attempts: number
  scheduled_for: string
}

interface TelegramLink {
  telegram_id: number
  telegram_first_name: string | null
  status: string
  notification_enabled: boolean
  consent_given: boolean
}

interface ProcessResult {
  total: number
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BATCH_SIZE = 50
const LOG_PREFIX = '[telegram-send-notification]'

// ============================================================================
// TELEGRAM ADAPTER (singleton)
// ============================================================================

let adapter: TelegramAdapter | null = null

function getAdapter(): TelegramAdapter {
  if (!adapter) {
    adapter = new TelegramAdapter()
  }
  return adapter
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Replace {{variable}} placeholders in template with actual values.
 */
function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value || '')
  }
  // Remove any unreplaced placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '')
  return result.trim()
}

// ============================================================================
// INLINE KEYBOARD BUILDERS (by notification type)
// ============================================================================

function buildKeyboardForType(
  notificationType: string,
  notificationId: string,
): InlineKeyboard | undefined {
  switch (notificationType) {
    case 'reminder':
      return {
        rows: [
          [
            { text: '✅ Concluido', callbackData: `notif_done:${notificationId}` },
            { text: '⏰ Adiar 1h', callbackData: `notif_snooze:${notificationId}:60` },
          ],
          [
            { text: '⏰ Adiar 30min', callbackData: `notif_snooze:${notificationId}:30` },
          ],
        ],
      }

    case 'daily_report':
      return {
        rows: [
          [
            { text: '📝 Ver tarefas', callbackData: `notif_view_tasks:${notificationId}` },
          ],
          [
            { text: '😊', callbackData: `mood:5:${notificationId}` },
            { text: '🙂', callbackData: `mood:4:${notificationId}` },
            { text: '😐', callbackData: `mood:3:${notificationId}` },
            { text: '😔', callbackData: `mood:2:${notificationId}` },
            { text: '😢', callbackData: `mood:1:${notificationId}` },
          ],
        ],
      }

    case 'follow_up':
      return {
        rows: [[
          { text: '😊 Bem', callbackData: `mood:4:${notificationId}` },
          { text: '😐 Normal', callbackData: `mood:3:${notificationId}` },
          { text: '😔 Mal', callbackData: `mood:2:${notificationId}` },
        ]],
      }

    case 'custom':
      return {
        rows: [[
          { text: '👍 OK', callbackData: `notif_ack:${notificationId}` },
        ]],
      }

    case 'system':
      // System notifications don't need keyboard actions
      return undefined

    default:
      return undefined
  }
}

// ============================================================================
// NOTIFICATION PROCESSOR
// ============================================================================

async function processNotification(
  supabase: SupabaseClient,
  tg: TelegramAdapter,
  notification: ScheduledNotification,
): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now()

  // 1. Look up telegram link for the user
  const { data: linkData, error: linkError } = await supabase
    .from('user_telegram_links')
    .select('telegram_id, telegram_first_name, status, notification_enabled, consent_given')
    .eq('user_id', notification.user_id)
    .eq('status', 'linked')
    .single()

  if (linkError || !linkData) {
    return { success: false, error: 'No linked Telegram account found' }
  }

  const link = linkData as TelegramLink

  // 2. Check if user has notifications enabled and consent
  if (!link.notification_enabled) {
    return { success: false, error: 'User has notifications disabled' }
  }

  if (!link.consent_given) {
    return { success: false, error: 'User has not given LGPD consent' }
  }

  // 3. Render message from template
  const variables = {
    ...notification.message_variables,
    name: notification.message_variables?.name || link.telegram_first_name || 'usuario',
  }
  const messageText = renderTemplate(notification.message_template, variables)

  if (!messageText) {
    return { success: false, error: 'Empty message after template rendering' }
  }

  // 4. Build inline keyboard based on notification type
  const inlineKeyboard = buildKeyboardForType(
    notification.notification_type,
    notification.id,
  )

  // 5. Send via TelegramAdapter
  const chatId = String(link.telegram_id)
  const outbound: OutboundMessage = {
    chatId,
    text: messageText,
    parseMode: 'HTML',
    inlineKeyboard,
    disableLinkPreview: true,
  }

  const sendResult = await tg.sendMessage(outbound)
  const durationMs = Date.now() - startTime

  // 6. Log to telegram_message_log
  try {
    await supabase.from('telegram_message_log').insert({
      telegram_chat_id: link.telegram_id,
      user_id: notification.user_id,
      direction: 'outbound',
      message_type: 'notification',
      intent_summary: `[${notification.notification_type}] ${messageText.substring(0, 150)}`,
      processing_status: sendResult.success ? 'completed' : 'failed',
      processing_duration_ms: durationMs,
      error_message: sendResult.error || null,
    })
  } catch (logErr) {
    // Logging should never break the main flow
    console.warn(`${LOG_PREFIX} Failed to log message: ${(logErr as Error).message}`)
  }

  if (sendResult.success) {
    return { success: true }
  }

  return { success: false, error: sendResult.error || 'Telegram API error' }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Accept both POST (from pg_cron via net.http_post) and GET (for manual triggers)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const startTime = Date.now()

  try {
    // 1. Validate authorization — must be service_role or valid JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // 2. Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const tg = getAdapter()

    // 3. Query pending Telegram notifications
    const { data: notifications, error: queryError } = await supabase
      .from('scheduled_notifications')
      .select('id, user_id, notification_type, message_template, message_variables, channel_user_id, priority, attempts, max_attempts, scheduled_for')
      .eq('channel', 'telegram')
      .eq('status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString())
      .is('deleted_at', null)
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(BATCH_SIZE)

    if (queryError) {
      console.error(`${LOG_PREFIX} Query error: ${queryError.message}`)
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending notifications' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    console.log(`${LOG_PREFIX} Processing ${notifications.length} notifications`)

    // 4. Process each notification
    const result: ProcessResult = {
      total: notifications.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    for (const notification of notifications as ScheduledNotification[]) {
      try {
        // Mark as sending (prevents duplicate processing)
        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'sending',
            attempts: notification.attempts + 1,
            last_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', notification.id)
          .eq('status', 'scheduled') // Optimistic lock

        const sendResult = await processNotification(supabase, tg, notification)

        if (sendResult.success) {
          // Mark as sent
          await supabase
            .from('scheduled_notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', notification.id)

          result.sent++
        } else {
          // Determine if we should retry or mark as failed
          const newAttempts = notification.attempts + 1
          const isFinalAttempt = newAttempts >= notification.max_attempts
          const isSkippable = sendResult.error === 'No linked Telegram account found'
            || sendResult.error === 'User has notifications disabled'
            || sendResult.error === 'User has not given LGPD consent'

          if (isSkippable) {
            // Skip permanently — user can't receive Telegram notifications
            await supabase
              .from('scheduled_notifications')
              .update({
                status: 'failed',
                last_error: sendResult.error,
                updated_at: new Date().toISOString(),
              })
              .eq('id', notification.id)

            result.skipped++
          } else if (isFinalAttempt) {
            // Max attempts reached
            await supabase
              .from('scheduled_notifications')
              .update({
                status: 'failed',
                last_error: sendResult.error,
                updated_at: new Date().toISOString(),
              })
              .eq('id', notification.id)

            result.failed++
          } else {
            // Retry: put back to scheduled status
            await supabase
              .from('scheduled_notifications')
              .update({
                status: 'scheduled',
                last_error: sendResult.error,
                updated_at: new Date().toISOString(),
              })
              .eq('id', notification.id)

            result.failed++
          }

          result.errors.push(`${notification.id}: ${sendResult.error}`)
        }
      } catch (err) {
        const error = err as Error
        console.error(`${LOG_PREFIX} Error processing ${notification.id}: ${error.message}`)

        // Mark as failed on unexpected error
        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'failed',
            last_error: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notification.id)

        result.failed++
        result.errors.push(`${notification.id}: ${error.message}`)
      }
    }

    const durationMs = Date.now() - startTime
    console.log(
      `${LOG_PREFIX} Done: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped in ${durationMs}ms`,
    )

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        duration_ms: durationMs,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const err = error as Error
    console.error(`${LOG_PREFIX} Fatal error: ${err.message}`)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
