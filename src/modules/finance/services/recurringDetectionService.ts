import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { FinanceTransaction, RecurringSummaryItem } from '../types';

const log = createNamespacedLogger('RecurringDetectionService');

/**
 * Run server-side recurring transaction detection via RPC.
 * Returns the number of newly marked recurring transactions.
 */
export async function detectRecurring(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('detect_recurring_transactions', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data ?? 0;
  } catch (error) {
    log.error('Error detecting recurring transactions:', error);
    throw error;
  }
}

/**
 * Fetch all transactions marked as recurring.
 */
export async function getRecurringTransactions(
  userId: string
): Promise<FinanceTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_recurring', true)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error fetching recurring transactions:', error);
    throw error;
  }
}

/**
 * Manually mark or unmark a transaction as recurring.
 */
export async function markAsRecurring(
  transactionId: string,
  isRecurring: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('finance_transactions')
      .update({ is_recurring: isRecurring })
      .eq('id', transactionId);

    if (error) throw error;
  } catch (error) {
    log.error('Error marking transaction recurring:', error);
    throw error;
  }
}

/**
 * Get a summary of recurring transactions grouped by normalized description.
 * Returns description, count, average amount, total amount, and last date.
 */
export async function getRecurringSummary(
  userId: string
): Promise<RecurringSummaryItem[]> {
  try {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('description, amount, transaction_date')
      .eq('user_id', userId)
      .eq('is_recurring', true)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    const MAX_TRANSACTIONS = 10000;
    let txList = data || [];
    if (txList.length === 0) return [];

    if (txList.length > MAX_TRANSACTIONS) {
      log.warn(`[Recurring] ${txList.length} transactions exceeds cap, using most recent ${MAX_TRANSACTIONS}`);
      txList = txList.slice(0, MAX_TRANSACTIONS);
    }

    // Group by normalized description
    const groups = new Map<string, { amounts: number[]; lastDate: string }>();

    for (const tx of txList) {
      const key = tx.description.trim().toLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.amounts.push(Math.abs(Number(tx.amount)));
        if (tx.transaction_date > existing.lastDate) {
          existing.lastDate = tx.transaction_date;
        }
      } else {
        groups.set(key, {
          amounts: [Math.abs(Number(tx.amount))],
          lastDate: tx.transaction_date,
        });
      }
    }

    const summary: RecurringSummaryItem[] = [];
    for (const [desc, group] of groups) {
      const total = group.amounts.reduce((s, a) => s + a, 0);
      summary.push({
        description: desc,
        count: group.amounts.length,
        average_amount: total / group.amounts.length,
        total_amount: total,
        last_date: group.lastDate,
      });
    }

    // Sort by total_amount descending
    summary.sort((a, b) => b.total_amount - a.total_amount);

    return summary;
  } catch (error) {
    log.error('Error fetching recurring summary:', error);
    throw error;
  }
}
