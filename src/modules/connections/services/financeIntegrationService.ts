/**
 * Finance Integration Service
 *
 * Integrates Connection Transactions with Personal Finance module.
 * Handles transaction synchronization, split payment tracking, and balance calculations.
 */

import { supabase } from '../../../services/supabaseClient';
import type { ConnectionTransaction, TransactionSplit } from '../types';
import type { FinanceTransaction } from '../../finance/types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('FinanceIntegrationService');

// ============================================================================
// TYPES
// ============================================================================

export interface SpaceFinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  pendingPayments: number;
  byCategory: { category: string; amount: number }[];
  byMember: {
    memberId: string;
    name: string;
    paid: number;
    pending: number;
  }[];
}

export interface UserBalance {
  totalOwed: number;      // Quanto o usuário deve
  totalToReceive: number; // Quanto o usuário tem a receber
  netBalance: number;     // Saldo líquido
  pendingItems: {
    transactionId: string;
    description: string;
    amount: number;
    type: 'owed' | 'receivable';
    date: string;
  }[];
}

export interface SyncOptions {
  personalCategoryId?: string;
  autoSync?: boolean;
  syncRecurring?: boolean;
}

// ============================================================================
// SYNC TO PERSONAL FINANCE
// ============================================================================

/**
 * Synchronizes a connection transaction to personal finance
 * Only syncs the user's portion of a split transaction
 */
export async function syncToPersonalFinance(
  connectionTransactionId: string,
  options: SyncOptions = {}
): Promise<string> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Get connection transaction
    const { data: connTx, error: fetchError } = await supabase
      .from('connection_transactions')
      .select('*, connection_spaces(name, archetype)')
      .eq('id', connectionTransactionId)
      .single();

    if (fetchError) throw fetchError;
    if (!connTx) throw new Error('Transaction not found');

    // Calculate user's portion
    const userPortion = calculateUserPortion(connTx, userId);

    // Create finance transaction
    const financeTransaction: Partial<FinanceTransaction> = {
      user_id: userId,
      description: `${connTx.description} (${connTx.connection_spaces?.name || 'Connection'})`,
      original_description: connTx.description,
      amount: userPortion,
      type: connTx.type as 'income' | 'expense',
      category: options.personalCategoryId || mapConnectionCategory(connTx.category),
      transaction_date: connTx.transaction_date,
      is_recurring: connTx.is_recurring && (options.syncRecurring ?? false),
      notes: `Synced from ${connTx.connection_spaces?.archetype || 'connection'} space`,
      tags: ['connection', connTx.connection_spaces?.archetype || 'shared'],
    };

    const { data: createdTx, error: createError } = await supabase
      .from('finance_transactions')
      .insert([financeTransaction])
      .select()
      .single();

    if (createError) throw createError;

    // Update connection transaction to link it
    await supabase
      .from('connection_transactions')
      .update({
        personal_transaction_id: createdTx.id
      })
      .eq('id', connectionTransactionId);

    return createdTx.id;
  } catch (error) {
    log.error('Error syncing to personal finance:', error);
    throw error;
  }
}

/**
 * Import transactions from personal finance to a connection space
 */
export async function importFromPersonalFinance(
  spaceId: string,
  personalTransactionIds: string[]
): Promise<ConnectionTransaction[]> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Fetch personal transactions
    const { data: personalTxs, error: fetchError } = await supabase
      .from('finance_transactions')
      .select('*')
      .in('id', personalTransactionIds)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    // Create connection transactions
    const connectionTxs = personalTxs.map(tx => ({
      space_id: spaceId,
      created_by: userId,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      transaction_date: tx.transaction_date,
      split_type: 'payer_only' as const,
      split_data: {},
      is_paid: true,
      paid_at: new Date().toISOString(),
      paid_by: userId,
      is_recurring: tx.is_recurring,
      personal_transaction_id: tx.id,
    }));

    const { data: created, error: createError } = await supabase
      .from('connection_transactions')
      .insert(connectionTxs)
      .select();

    if (createError) throw createError;

    return created as ConnectionTransaction[];
  } catch (error) {
    log.error('Error importing from personal finance:', error);
    throw error;
  }
}

// ============================================================================
// SPACE FINANCE SUMMARY
// ============================================================================

/**
 * Get financial summary for a connection space
 */
export async function getSpaceFinanceSummary(
  spaceId: string,
  dateRange?: { start: string; end: string }
): Promise<SpaceFinanceSummary> {
  try {
    let query = supabase
      .from('connection_transactions')
      .select('*, connection_members!created_by(id, external_name, user_id)')
      .eq('space_id', spaceId);

    if (dateRange) {
      query = query
        .gte('transaction_date', dateRange.start)
        .lte('transaction_date', dateRange.end);
    }

    const { data: transactions, error } = await query;
    if (error) throw error;

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate pending payments
    const pendingPayments = transactions
      .filter(t => !t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Group by category
    const categoryMap: Record<string, number> = {};
    transactions.forEach(t => {
      const category = t.category || 'other';
      categoryMap[category] = (categoryMap[category] || 0) + Number(t.amount);
    });

    const byCategory = Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Group by member
    const memberMap: Record<string, { name: string; paid: number; pending: number }> = {};

    transactions.forEach(t => {
      const memberId = t.created_by;
      const memberName = t.connection_members?.external_name || 'Unknown';

      if (!memberMap[memberId]) {
        memberMap[memberId] = { name: memberName, paid: 0, pending: 0 };
      }

      const amount = Number(t.amount);
      if (t.is_paid) {
        memberMap[memberId].paid += amount;
      } else {
        memberMap[memberId].pending += amount;
      }
    });

    const byMember = Object.entries(memberMap).map(([memberId, data]) => ({
      memberId,
      ...data,
    }));

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      pendingPayments,
      byCategory,
      byMember,
    };
  } catch (error) {
    log.error('Error fetching space finance summary:', error);
    throw error;
  }
}

// ============================================================================
// USER BALANCE
// ============================================================================

/**
 * Calculate what a user owes or is owed in a space
 */
export async function getUserBalance(
  spaceId: string,
  userId: string
): Promise<UserBalance> {
  try {
    const { data: transactions, error } = await supabase
      .from('connection_transactions')
      .select('*')
      .eq('space_id', spaceId);

    if (error) throw error;

    let totalOwed = 0;
    let totalToReceive = 0;
    const pendingItems: UserBalance['pendingItems'] = [];

    transactions.forEach(tx => {
      const splits = tx.split_data as TransactionSplit[];
      if (!splits || splits.length === 0) return;

      // Find user's split
      const userSplit = splits.find(s => s.member_id === userId);
      if (!userSplit) return;

      const amount = userSplit.amount || (tx.amount * (userSplit.percentage || 0) / 100);

      if (!userSplit.paid) {
        if (tx.created_by === userId) {
          // User paid for others - they owe user
          totalToReceive += amount;
          pendingItems.push({
            transactionId: tx.id,
            description: tx.description,
            amount,
            type: 'receivable',
            date: tx.transaction_date,
          });
        } else {
          // User owes for this transaction
          totalOwed += amount;
          pendingItems.push({
            transactionId: tx.id,
            description: tx.description,
            amount,
            type: 'owed',
            date: tx.transaction_date,
          });
        }
      }
    });

    return {
      totalOwed,
      totalToReceive,
      netBalance: totalToReceive - totalOwed,
      pendingItems: pendingItems.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  } catch (error) {
    log.error('Error calculating user balance:', error);
    throw error;
  }
}

// ============================================================================
// SPLIT PAYMENT TRACKING
// ============================================================================

/**
 * Mark a split as paid for a specific member
 */
export async function markSplitAsPaid(
  transactionId: string,
  memberId: string
): Promise<void> {
  try {
    // Get transaction
    const { data: tx, error: fetchError } = await supabase
      .from('connection_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw fetchError;

    // Update split data
    const splits = (tx.split_data as TransactionSplit[]) || [];
    const updatedSplits = splits.map(split =>
      split.member_id === memberId
        ? { ...split, paid: true }
        : split
    );

    // Check if all splits are paid
    const allPaid = updatedSplits.every(s => s.paid);

    // Update transaction
    const { error: updateError } = await supabase
      .from('connection_transactions')
      .update({
        split_data: updatedSplits,
        is_paid: allPaid,
        paid_at: allPaid ? new Date().toISOString() : tx.paid_at,
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;
  } catch (error) {
    log.error('Error marking split as paid:', error);
    throw error;
  }
}

/**
 * Get split payment status for a transaction
 */
export async function getSplitPaymentStatus(
  transactionId: string
): Promise<{
  total: number;
  paid: number;
  pending: number;
  members: {
    memberId: string;
    name: string;
    amount: number;
    paid: boolean;
  }[];
}> {
  try {
    const { data: tx, error: fetchError } = await supabase
      .from('connection_transactions')
      .select('*, connection_members(*)')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw fetchError;

    const splits = (tx.split_data as TransactionSplit[]) || [];
    let paidAmount = 0;
    let pendingAmount = 0;

    const members = splits.map(split => {
      const amount = split.amount || (tx.amount * (split.percentage || 0) / 100);

      if (split.paid) {
        paidAmount += amount;
      } else {
        pendingAmount += amount;
      }

      return {
        memberId: split.member_id,
        name: 'Member', // Would need to join with members table
        amount,
        paid: split.paid,
      };
    });

    return {
      total: tx.amount,
      paid: paidAmount,
      pending: pendingAmount,
      members,
    };
  } catch (error) {
    log.error('Error getting split payment status:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate user's portion of a transaction
 */
function calculateUserPortion(
  transaction: any,
  userId: string
): number {
  const splits = transaction.split_data as TransactionSplit[];

  if (!splits || splits.length === 0) {
    return transaction.amount;
  }

  const userSplit = splits.find(s => s.member_id === userId);
  if (!userSplit) return 0;

  return userSplit.amount || (transaction.amount * (userSplit.percentage || 0) / 100);
}

/**
 * Map connection category to finance category
 */
function mapConnectionCategory(connectionCategory?: string): string {
  const mapping: Record<string, string> = {
    'rent': 'housing',
    'utilities': 'housing',
    'groceries': 'food',
    'supplies': 'shopping',
    'maintenance': 'housing',
    'equipment': 'shopping',
    'event': 'entertainment',
    'contribution': 'other',
  };

  return mapping[connectionCategory || ''] || 'other';
}

/**
 * Get default date range (current month)
 */
export function getDefaultDateRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
