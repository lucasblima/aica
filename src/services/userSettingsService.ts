/**
 * User Settings Service
 *
 * Service for managing user preferences and settings, including AI budget configuration.
 * Uses the user_ai_settings table for budget data (not auth.users metadata)
 */

import { supabase } from './supabaseClient';
import type { UserAIBudget } from '../types/aiCost';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('UserSettingsService');


// =====================================================
// AI Budget Management
// =====================================================

/**
 * Get user's AI budget settings from user_ai_settings table
 */
export async function getUserAIBudget(): Promise<number> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get settings from user_ai_settings table
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('ai_budget_monthly_usd')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no settings exist yet, create with defaults
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await supabase
          .from('user_ai_settings')
          .insert({ user_id: user.id })
          .select('ai_budget_monthly_usd')
          .single();

        if (insertError) throw insertError;
        return newSettings?.ai_budget_monthly_usd || 10.00;
      }
      throw error;
    }

    return data?.ai_budget_monthly_usd || 10.00;
  } catch (error) {
    log.error('[userSettings] Error getting AI budget:', { error: error });
    return 10.00; // Default budget
  }
}

/**
 * Update user's AI budget in user_ai_settings table
 */
export async function updateUserAIBudget(budget: number): Promise<void> {
  if (budget < 0) {
    throw new Error('Budget cannot be negative');
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('User not authenticated');

  // Upsert into user_ai_settings table
  const { error } = await supabase
    .from('user_ai_settings')
    .upsert({
      user_id: user.id,
      ai_budget_monthly_usd: budget,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    log.error('[userSettings] Error updating AI budget:', { error: error });
    throw error;
  }

  log.debug('[userSettings] AI budget updated to:', budget);
}

/**
 * Get complete AI budget settings (with metadata) from user_ai_settings table
 */
export async function getAIBudgetSettings(): Promise<UserAIBudget> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Create default settings if they don't exist
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await supabase
          .from('user_ai_settings')
          .insert({ user_id: user.id })
          .select('*')
          .single();

        if (insertError) throw insertError;

        return {
          monthly_ai_budget_usd: newSettings?.ai_budget_monthly_usd || 10.00,
          created_at: newSettings?.created_at,
          updated_at: newSettings?.updated_at
        };
      }
      throw error;
    }

    return {
      monthly_ai_budget_usd: data?.ai_budget_monthly_usd || 10.00,
      created_at: data?.created_at,
      updated_at: data?.updated_at
    };
  } catch (error) {
    log.error('[userSettings] Error getting AI budget settings:', { error: error });
    return {
      monthly_ai_budget_usd: 10.00,
      created_at: undefined,
      updated_at: undefined
    };
  }
}

/**
 * Clear user's AI budget (set to 0)
 */
export async function clearUserAIBudget(): Promise<void> {
  await updateUserAIBudget(0);
}

// =====================================================
// General User Settings
// =====================================================

/**
 * Get all user metadata
 */
export async function getUserMetadata(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) throw error;
    if (!data.user) throw new Error('User not authenticated');

    return data.user.user_metadata || {};
  } catch (error) {
    log.error('[userSettings] Error getting user metadata:', { error: error });
    return {};
  }
}

/**
 * Update user metadata (merges with existing)
 */
export async function updateUserMetadata(metadata: Record<string, any>): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: metadata
  });

  if (error) {
    log.error('[userSettings] Error updating user metadata:', { error: error });
    throw error;
  }

  log.debug('[userSettings] User metadata updated');
}

// =====================================================
// Notification Preferences (Future Enhancement)
// =====================================================

export interface NotificationPreferences {
  budget_alert_80: boolean;
  budget_alert_90: boolean;
  budget_alert_100: boolean;
  daily_summary: boolean;
  weekly_summary: boolean;
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const metadata = await getUserMetadata();

  return {
    budget_alert_80: metadata.budget_alert_80 ?? true,
    budget_alert_90: metadata.budget_alert_90 ?? true,
    budget_alert_100: metadata.budget_alert_100 ?? true,
    daily_summary: metadata.daily_summary ?? false,
    weekly_summary: metadata.weekly_summary ?? false
  };
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  await updateUserMetadata(preferences);
}
