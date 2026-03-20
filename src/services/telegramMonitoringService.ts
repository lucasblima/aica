import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  TelegramStats,
  TelegramMessageLogEntry,
  TelegramUserStatus,
  TelegramConversation,
  TelegramErrorLog,
} from '@/types/telegramMonitoring';

const log = createNamespacedLogger('telegramMonitoring');

/**
 * Fetches aggregated 24h Telegram pipeline statistics.
 * Admin-only — RPC checks is_admin() server-side.
 */
export async function getAdminTelegramStats(): Promise<TelegramStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_admin_telegram_stats');

    if (error) {
      log.error('get_admin_telegram_stats RPC error:', error);
      return null;
    }

    return data as TelegramStats;
  } catch (err) {
    log.error('getAdminTelegramStats error:', err);
    return null;
  }
}

/**
 * Fetches recent Telegram message log entries with user info.
 * Admin-only — RPC checks is_admin() server-side.
 */
export async function getAdminTelegramMessageLog(
  limit?: number,
  status?: string
): Promise<TelegramMessageLogEntry[]> {
  try {
    const params: Record<string, unknown> = {};
    if (limit !== undefined) params.p_limit = limit;
    if (status !== undefined) params.p_status = status;

    const { data, error } = await supabase.rpc('get_admin_telegram_message_log', params);

    if (error) {
      log.error('get_admin_telegram_message_log RPC error:', error);
      return [];
    }

    return (data ?? []) as TelegramMessageLogEntry[];
  } catch (err) {
    log.error('getAdminTelegramMessageLog error:', err);
    return [];
  }
}

/**
 * Fetches Telegram account linking status and consent metrics.
 * Admin-only — RPC checks is_admin() server-side.
 */
export async function getAdminTelegramUserStatus(): Promise<TelegramUserStatus | null> {
  try {
    const { data, error } = await supabase.rpc('get_admin_telegram_user_status');

    if (error) {
      log.error('get_admin_telegram_user_status RPC error:', error);
      return null;
    }

    return data as TelegramUserStatus;
  } catch (err) {
    log.error('getAdminTelegramUserStatus error:', err);
    return null;
  }
}

/**
 * Fetches active Telegram conversations with user info.
 * Admin-only — RPC checks is_admin() server-side.
 */
export async function getAdminTelegramConversations(
  limit?: number
): Promise<TelegramConversation[]> {
  try {
    const params: Record<string, unknown> = {};
    if (limit !== undefined) params.p_limit = limit;

    const { data, error } = await supabase.rpc('get_admin_telegram_conversations', params);

    if (error) {
      log.error('get_admin_telegram_conversations RPC error:', error);
      return [];
    }

    return (data ?? []) as TelegramConversation[];
  } catch (err) {
    log.error('getAdminTelegramConversations error:', err);
    return [];
  }
}

/**
 * Fetches Telegram error rate and failed message details.
 * Admin-only — RPC checks is_admin() server-side.
 */
export async function getAdminTelegramErrorLog(
  limit?: number,
  hours?: number
): Promise<TelegramErrorLog | null> {
  try {
    const params: Record<string, unknown> = {};
    if (limit !== undefined) params.p_limit = limit;
    if (hours !== undefined) params.p_hours = hours;

    const { data, error } = await supabase.rpc('get_admin_telegram_error_log', params);

    if (error) {
      log.error('get_admin_telegram_error_log RPC error:', error);
      return null;
    }

    return data as TelegramErrorLog;
  } catch (err) {
    log.error('getAdminTelegramErrorLog error:', err);
    return null;
  }
}
