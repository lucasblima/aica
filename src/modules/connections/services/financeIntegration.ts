/**
 * Finance Integration Service
 *
 * Integrates Connection Archetypes with the Finance module.
 * Provides specialized financial operations for Habitat and Ventures archetypes.
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SharedExpense {
  id: string;
  space_id: string;
  description: string;
  total_amount: number;
  currency: string;
  split_type: 'equal' | 'percentage' | 'custom';
  splits: ExpenseSplit[];
  paid_by: string; // member_id
  created_at: string;
  settled: boolean;
}

export interface ExpenseSplit {
  member_id: string;
  amount: number;
  percentage?: number;
  paid: boolean;
}

export interface MemberBalance {
  owes: number;
  owed: number;
  net: number;
}

export interface VentureFinance {
  mrr: number;
  burnRate: number;
  runway: number;
}

// ============================================================================
// HABITAT: SHARED EXPENSES
// ============================================================================

/**
 * Creates a shared expense in a Habitat space
 * Supports equal split, percentage split, or custom amounts
 */
export async function createSharedExpense(
  spaceId: string,
  expense: Omit<SharedExpense, 'id' | 'created_at'>
): Promise<SharedExpense> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Validate space exists and is Habitat archetype
    const { data: space, error: spaceError } = await supabase
      .from('connection_spaces')
      .select('archetype')
      .eq('id', spaceId)
      .eq('user_id', userId)
      .single();

    if (spaceError) throw spaceError;
    if (!space) throw new Error('Space not found');
    if (space.archetype !== 'habitat') {
      throw new Error('Shared expenses are only supported for Habitat spaces');
    }

    // Validate splits sum to total amount
    const totalSplit = expense.splits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplit - expense.total_amount) > 0.01) {
      throw new Error('Split amounts must sum to total amount');
    }

    // Create transaction record
    const transactionData = {
      space_id: spaceId,
      title: expense.description,
      description: expense.description,
      amount: expense.total_amount,
      currency: expense.currency,
      transaction_type: 'expense' as const,
      category: 'shared_expense',
      paid_by: expense.paid_by,
      split_type: expense.split_type,
      split_data: expense.splits.reduce((acc, split) => ({
        ...acc,
        [split.member_id]: split.amount
      }), {}),
      transaction_date: new Date().toISOString(),
      is_settled: expense.settled,
    };

    const { data: transaction, error: txError } = await supabase
      .from('connection_transactions')
      .insert([transactionData])
      .select()
      .single();

    if (txError) throw txError;

    return {
      id: transaction.id,
      space_id: spaceId,
      description: expense.description,
      total_amount: expense.total_amount,
      currency: expense.currency,
      split_type: expense.split_type,
      splits: expense.splits,
      paid_by: expense.paid_by,
      created_at: transaction.created_at,
      settled: expense.settled,
    };
  } catch (error) {
    console.error('Error creating shared expense:', error);
    throw error;
  }
}

/**
 * Retrieves all shared expenses for a Habitat space
 */
export async function getSpaceExpenses(spaceId: string): Promise<SharedExpense[]> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const { data: transactions, error } = await supabase
      .from('connection_transactions')
      .select('*')
      .eq('space_id', spaceId)
      .eq('transaction_type', 'expense')
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return transactions.map(tx => ({
      id: tx.id,
      space_id: tx.space_id,
      description: tx.description || tx.title,
      total_amount: tx.amount,
      currency: tx.currency,
      split_type: tx.split_type,
      splits: Object.entries(tx.split_data as Record<string, number>).map(([memberId, amount]) => ({
        member_id: memberId,
        amount,
        paid: tx.is_settled,
      })),
      paid_by: tx.paid_by,
      created_at: tx.created_at,
      settled: tx.is_settled,
    }));
  } catch (error) {
    console.error('Error fetching space expenses:', error);
    throw error;
  }
}

/**
 * Marks an expense as settled for a specific member
 */
export async function settleExpense(
  expenseId: string,
  memberId: string
): Promise<void> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Get transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('connection_transactions')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (fetchError) throw fetchError;
    if (!transaction) throw new Error('Expense not found');

    // Update split data to mark member as paid
    const splitData = transaction.split_data as Record<string, number>;

    // Check if all members have paid
    const { data: members, error: membersError } = await supabase
      .from('connection_members')
      .select('id')
      .eq('space_id', transaction.space_id);

    if (membersError) throw membersError;

    const allMemberIds = members.map(m => m.id);
    const allPaid = allMemberIds.every(id => id === memberId || splitData[id] === 0);

    // Update transaction
    const { error: updateError } = await supabase
      .from('connection_transactions')
      .update({
        is_settled: allPaid,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expenseId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error settling expense:', error);
    throw error;
  }
}

/**
 * Calculates the balance for a member in a Habitat space
 * Returns how much they owe, are owed, and net balance
 */
export async function calculateMemberBalance(
  spaceId: string,
  memberId: string
): Promise<MemberBalance> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Get all transactions for the space
    const { data: transactions, error } = await supabase
      .from('connection_transactions')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_settled', false);

    if (error) throw error;

    let owes = 0;
    let owed = 0;

    transactions.forEach(tx => {
      const splitData = tx.split_data as Record<string, number>;
      const memberShare = splitData[memberId] || 0;

      if (tx.paid_by === memberId) {
        // Member paid, calculate what others owe them
        const othersShare = Object.entries(splitData)
          .filter(([id]) => id !== memberId)
          .reduce((sum, [, amount]) => sum + amount, 0);
        owed += othersShare;
      } else {
        // Someone else paid, member owes their share
        owes += memberShare;
      }
    });

    return {
      owes,
      owed,
      net: owed - owes,
    };
  } catch (error) {
    console.error('Error calculating member balance:', error);
    throw error;
  }
}

// ============================================================================
// VENTURES: BUSINESS FINANCE
// ============================================================================

/**
 * Synchronizes and calculates financial metrics for a Ventures space
 * Returns MRR, burn rate, and runway
 */
export async function syncVentureFinance(ventureId: string): Promise<VentureFinance> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Validate space exists and is Ventures archetype
    const { data: space, error: spaceError } = await supabase
      .from('connection_spaces')
      .select('archetype, settings')
      .eq('id', ventureId)
      .eq('user_id', userId)
      .single();

    if (spaceError) throw spaceError;
    if (!space) throw new Error('Venture not found');
    if (space.archetype !== 'ventures') {
      throw new Error('This operation is only supported for Ventures spaces');
    }

    // Calculate date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month revenue
    const { data: currentRevenue, error: revenueError } = await supabase
      .from('connection_transactions')
      .select('amount')
      .eq('space_id', ventureId)
      .eq('transaction_type', 'income')
      .gte('transaction_date', currentMonthStart.toISOString());

    if (revenueError) throw revenueError;

    const mrr = currentRevenue.reduce((sum, tx) => sum + tx.amount, 0);

    // Get last month expenses for burn rate
    const { data: lastMonthExpenses, error: expenseError } = await supabase
      .from('connection_transactions')
      .select('amount')
      .eq('space_id', ventureId)
      .eq('transaction_type', 'expense')
      .gte('transaction_date', lastMonthStart.toISOString())
      .lte('transaction_date', lastMonthEnd.toISOString());

    if (expenseError) throw expenseError;

    const burnRate = lastMonthExpenses.reduce((sum, tx) => sum + tx.amount, 0);

    // Get total cash balance
    const { data: allTransactions, error: allTxError } = await supabase
      .from('connection_transactions')
      .select('amount, transaction_type')
      .eq('space_id', ventureId);

    if (allTxError) throw allTxError;

    const cashBalance = allTransactions.reduce((sum, tx) => {
      return sum + (tx.transaction_type === 'income' ? tx.amount : -tx.amount);
    }, 0);

    // Calculate runway (months of cash left at current burn rate)
    const runway = burnRate > 0 ? cashBalance / burnRate : Infinity;

    return {
      mrr,
      burnRate,
      runway: Math.floor(runway * 10) / 10, // Round to 1 decimal
    };
  } catch (error) {
    console.error('Error syncing venture finance:', error);
    throw error;
  }
}

/**
 * Tracks business expenses for a Ventures space
 * Categorizes expenses and links to specific projects/initiatives
 */
export async function trackBusinessExpense(
  ventureId: string,
  expense: {
    description: string;
    amount: number;
    category: string;
    projectId?: string;
    receiptUrl?: string;
  }
): Promise<void> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const transactionData = {
      space_id: ventureId,
      title: expense.description,
      description: expense.description,
      amount: expense.amount,
      currency: 'BRL',
      transaction_type: 'expense' as const,
      category: expense.category,
      paid_by: userId,
      split_type: 'payer_only' as const,
      split_data: { [userId]: expense.amount },
      receipt_url: expense.receiptUrl,
      transaction_date: new Date().toISOString(),
      is_settled: true,
    };

    const { error } = await supabase
      .from('connection_transactions')
      .insert([transactionData]);

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking business expense:', error);
    throw error;
  }
}

/**
 * Records revenue for a Ventures space
 * Supports MRR tracking and categorization
 */
export async function recordRevenue(
  ventureId: string,
  revenue: {
    description: string;
    amount: number;
    category: string;
    isRecurring?: boolean;
  }
): Promise<void> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const transactionData = {
      space_id: ventureId,
      title: revenue.description,
      description: revenue.description,
      amount: revenue.amount,
      currency: 'BRL',
      transaction_type: 'income' as const,
      category: revenue.category,
      paid_by: userId,
      split_type: 'payer_only' as const,
      split_data: { [userId]: revenue.amount },
      transaction_date: new Date().toISOString(),
      is_settled: true,
    };

    const { error } = await supabase
      .from('connection_transactions')
      .insert([transactionData]);

    if (error) throw error;
  } catch (error) {
    console.error('Error recording revenue:', error);
    throw error;
  }
}
