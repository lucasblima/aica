import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { FinanceAccount } from '../types';

const log = createNamespacedLogger('AccountService');

/**
 * Fetch all active accounts for a user (default account first).
 */
export async function getAccounts(userId: string): Promise<FinanceAccount[]> {
  try {
    const { data, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('account_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error fetching accounts:', error);
    throw error;
  }
}

/**
 * Create a new financial account.
 */
export async function createAccount(
  userId: string,
  account: {
    account_name: string;
    bank_name?: string | null;
    account_type: FinanceAccount['account_type'];
    is_default?: boolean;
    color?: string;
    icon?: string;
  }
): Promise<FinanceAccount> {
  try {
    const { data, error } = await supabase
      .from('finance_accounts')
      .insert({
        user_id: userId,
        account_name: account.account_name,
        bank_name: account.bank_name ?? null,
        account_type: account.account_type,
        is_default: account.is_default ?? false,
        color: account.color ?? '#F59E0B',
        icon: account.icon ?? 'building',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error creating account:', error);
    throw error;
  }
}

/**
 * Update an existing account.
 */
export async function updateAccount(
  accountId: string,
  updates: Partial<Pick<FinanceAccount, 'account_name' | 'bank_name' | 'account_type' | 'color' | 'icon' | 'is_active'>>
): Promise<FinanceAccount> {
  try {
    const { data, error } = await supabase
      .from('finance_accounts')
      .update(updates)
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error updating account:', error);
    throw error;
  }
}

/**
 * Soft-delete an account (set is_active = false).
 */
export async function deleteAccount(accountId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('finance_accounts')
      .update({ is_active: false })
      .eq('id', accountId);

    if (error) throw error;
  } catch (error) {
    log.error('Error deleting account:', error);
    throw error;
  }
}

/**
 * Set a specific account as the default, unsetting any existing default.
 */
export async function setDefaultAccount(
  userId: string,
  accountId: string
): Promise<void> {
  try {
    // Unset current defaults
    const { error: unsetError } = await supabase
      .from('finance_accounts')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);

    if (unsetError) throw unsetError;

    // Set new default
    const { error: setError } = await supabase
      .from('finance_accounts')
      .update({ is_default: true })
      .eq('id', accountId);

    if (setError) throw setError;
  } catch (error) {
    log.error('Error setting default account:', error);
    throw error;
  }
}
