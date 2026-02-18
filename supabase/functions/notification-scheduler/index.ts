/**
 * Notification Scheduler Edge Function
 *
 * Processes due scheduled_notifications:
 * - In-app: inserts into notification_log
 * - Email: sends via Resend API
 * - Updates recurrence and completion status
 *
 * Designed to be invoked by pg_cron every 5 minutes or on-demand.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts'

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
  is_recurring: boolean
  recurrence_pattern: string | null
  recurrence_end_date: string | null
  status: string
  attempts: number
  max_attempts: number
  priority: number
}

interface ProcessingResult {
  notificationId: string
  channel: 'in_app' | 'email'
  status: 'success' | 'failed'
  error?: string
}

// ============================================================================
// RESEND EMAIL
// ============================================================================

async function sendEmailViaResend(
  resendApiKey: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Aica Life OS <noreply@aica.guru>',
        to,
        subject,
        html: body,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || `Resend API error: ${response.status}` }
    }

    return { success: true, messageId: data.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown email error' }
  }
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }
  return rendered
}

function generateNotificationEmailHTML(subject: string, body: string, recipientName: string | null): string {
  const greeting = recipientName ? `Ola, ${recipientName}!` : 'Ola!'
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:30px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;font-weight:700;">Aica Life OS</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 16px;color:#1e293b;font-size:18px;font-weight:600;">${greeting}</p>
              <div style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;white-space:pre-line;">${body}</div>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">Enviado automaticamente por Aica Life OS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

// ============================================================================
// RECURRENCE CALCULATOR
// ============================================================================

function calculateNextRun(scheduledFor: string, pattern: string | null): string | null {
  if (!pattern) return null

  const date = new Date(scheduledFor)

  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'weekdays': {
      const day = date.getDay()
      if (day === 5) date.setDate(date.getDate() + 3) // Fri -> Mon
      else if (day === 6) date.setDate(date.getDate() + 2) // Sat -> Mon
      else date.setDate(date.getDate() + 1)
      break
    }
    case 'weekends': {
      const dow = date.getDay()
      if (dow === 0) date.setDate(date.getDate() + 6) // Sun -> Sat
      else if (dow === 6) date.setDate(date.getDate() + 1) // Sat -> Sun
      else date.setDate(date.getDate() + (6 - dow)) // Weekday -> Sat
      break
    }
    default:
      date.setDate(date.getDate() + 1)
  }

  return date.toISOString()
}

// ============================================================================
// PROCESS SINGLE NOTIFICATION
// ============================================================================

async function processNotification(
  supabase: ReturnType<typeof createClient>,
  notification: ScheduledNotification,
  resendApiKey: string | undefined,
): Promise<ProcessingResult> {
  const renderedMessage = renderTemplate(notification.message_template, notification.message_variables)
  const startedAt = new Date().toISOString()

  // Determine channel based on notification type and available config
  // If we have a target_phone that looks like an email, use email channel
  // Otherwise default to in_app
  const isEmail = notification.target_phone.includes('@')
  const channel: 'in_app' | 'email' = isEmail ? 'email' : 'in_app'

  try {
    if (channel === 'email') {
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY not configured for email notifications')
      }

      const subject = `Aica: ${notification.notification_type === 'reminder' ? 'Lembrete' : 'Notificacao'}`
      const emailHtml = generateNotificationEmailHTML(subject, renderedMessage, notification.target_name)
      const emailResult = await sendEmailViaResend(resendApiKey, notification.target_phone, subject, emailHtml)

      if (!emailResult.success) {
        throw new Error(emailResult.error || 'Email send failed')
      }
    }

    // Log successful delivery
    await supabase.from('notification_log').insert({
      notification_id: notification.id,
      user_id: notification.user_id,
      target_phone: notification.target_phone,
      attempt_number: notification.attempts + 1,
      status: 'success',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    })

    // Update the notification as sent
    const updateData: Record<string, unknown> = {
      status: 'sent',
      sent_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      attempts: notification.attempts + 1,
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('scheduled_notifications')
      .update(updateData)
      .eq('id', notification.id)

    // Handle recurrence: create next occurrence if recurring
    if (notification.is_recurring && notification.recurrence_pattern) {
      const nextRun = calculateNextRun(notification.scheduled_for, notification.recurrence_pattern)

      if (nextRun) {
        // Check recurrence end date
        const pastEnd = notification.recurrence_end_date &&
          new Date(nextRun) > new Date(notification.recurrence_end_date)

        if (!pastEnd) {
          // Use the DB function for creating next recurring notification
          await supabase.rpc('create_next_recurring_notification', {
            notification_id: notification.id,
          })
        }
      }
    }

    return { notificationId: notification.id, channel, status: 'success' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Log failed delivery
    await supabase.from('notification_log').insert({
      notification_id: notification.id,
      user_id: notification.user_id,
      target_phone: notification.target_phone,
      attempt_number: notification.attempts + 1,
      status: 'failed',
      error_message: errorMessage,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    })

    // Update the notification with failure info
    const newAttempts = notification.attempts + 1
    const shouldComplete = newAttempts >= notification.max_attempts

    await supabase
      .from('scheduled_notifications')
      .update({
        status: shouldComplete ? 'failed' : 'scheduled',
        last_attempt_at: new Date().toISOString(),
        last_error: errorMessage,
        attempts: newAttempts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification.id)

    return { notificationId: notification.id, channel, status: 'failed', error: errorMessage }
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse optional body params
    const body = await req.json().catch(() => ({}))
    const batchSize = body.batch_size || 50

    // Query due notifications
    const { data: dueNotifications, error: queryError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString())
      .is('deleted_at', null)
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(batchSize)

    if (queryError) {
      console.error('[notification-scheduler] Query error:', queryError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to query notifications', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No due notifications' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[notification-scheduler] Processing ${dueNotifications.length} due notifications`)

    // Process each notification
    const results: ProcessingResult[] = []
    for (const notification of dueNotifications as ScheduledNotification[]) {
      const result = await processNotification(supabase, notification, resendApiKey)
      results.push(result)
    }

    const succeeded = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'failed').length

    console.log(`[notification-scheduler] Done: ${succeeded} succeeded, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        succeeded,
        failed,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('[notification-scheduler] Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
