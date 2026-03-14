/**
 * Channel Router — Notification Delivery
 * Routes to user's preferred channels via agent_notifications + direct Edge Function calls.
 * Spec: docs/superpowers/specs/2026-03-13-agent-ecosystem-design.md § 2.5
 */
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type NotificationCategory =
  | 'morning_briefing' | 'urgent_alert' | 'insight'
  | 'achievement' | 'deadline_reminder' | 'weekly_summary'

export type DeliveryChannel = 'in_app' | 'telegram' | 'email'

export interface NotificationMessage {
  title: string
  body: string
  agent?: string
  actionable?: boolean
  metadata?: Record<string, unknown>
}

export interface DeliveryResult {
  channel: DeliveryChannel
  success: boolean
  error?: string
}

const CATEGORY_DEFAULTS: Record<NotificationCategory, DeliveryChannel[]> = {
  morning_briefing: ['telegram', 'in_app'],
  urgent_alert: ['telegram', 'in_app', 'email'],
  insight: ['in_app'],
  achievement: ['in_app'],
  deadline_reminder: ['telegram', 'in_app'],
  weekly_summary: ['email', 'in_app'],
}

export async function routeNotification(
  supabase: SupabaseClient,
  userId: string,
  category: NotificationCategory,
  message: NotificationMessage
): Promise<DeliveryResult[]> {
  const { data: pref } = await supabase
    .from('user_channel_preferences')
    .select('preferred_channels, quiet_hours_start, quiet_hours_end')
    .eq('user_id', userId)
    .eq('notification_category', category)
    .maybeSingle()

  let channels: DeliveryChannel[] = pref?.preferred_channels ?? CATEGORY_DEFAULTS[category] ?? ['in_app']

  // Quiet hours: use DB timezone-aware comparison
  if (pref?.quiet_hours_start && pref?.quiet_hours_end) {
    const { data: timeCheck } = await supabase.rpc('is_quiet_hours', {
      p_start: pref.quiet_hours_start,
      p_end: pref.quiet_hours_end,
    }).maybeSingle()
    if (timeCheck?.is_quiet) {
      channels = channels.filter(c => c === 'in_app')
    }
  }

  const results: DeliveryResult[] = []
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'in_app':
          await supabase.from('agent_notifications').insert({
            user_id: userId,
            agent_name: message.agent || 'system',
            notification_type: 'insight',
            title: message.title.substring(0, 200),
            body: message.body.substring(0, 500),
            metadata: message.metadata || {},
          })
          results.push({ channel, success: true })
          break

        case 'telegram': {
          // Check if user has linked Telegram
          const { data: link } = await supabase
            .from('user_telegram_links')
            .select('telegram_chat_id, notification_enabled')
            .eq('user_id', userId)
            .eq('notification_enabled', true)
            .maybeSingle()

          if (link?.telegram_chat_id) {
            // Also insert into agent_notifications (Telegram cron reads from there)
            await supabase.from('agent_notifications').insert({
              user_id: userId,
              agent_name: message.agent || 'system',
              notification_type: 'insight',
              title: `[Telegram] ${message.title}`.substring(0, 200),
              body: message.body.substring(0, 500),
              metadata: { ...message.metadata, delivery_channel: 'telegram' },
            })
          }
          results.push({ channel, success: true })
          break
        }

        case 'email':
          // Queue in agent_notifications with email flag for notification-scheduler
          await supabase.from('agent_notifications').insert({
            user_id: userId,
            agent_name: message.agent || 'system',
            notification_type: 'insight',
            title: `[Email] ${message.title}`.substring(0, 200),
            body: message.body.substring(0, 500),
            metadata: { ...message.metadata, delivery_channel: 'email' },
          })
          results.push({ channel, success: true })
          break
      }
    } catch (err) {
      console.error(`Channel ${channel} delivery failed:`, err)
      results.push({ channel, success: false, error: err instanceof Error ? err.message : 'Unknown' })
    }
  }
  return results
}
