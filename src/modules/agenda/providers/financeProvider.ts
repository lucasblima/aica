/**
 * Finance Timeline Provider
 *
 * Queries finance_transactions for the given date range and transforms
 * recurring or upcoming transactions into timeline reminders.
 *
 * Uses `transaction_date` as the temporal field. Colors:
 * - Income: green (#10B981)
 * - Expense: red (#EF4444)
 */

import type { TimelineProvider } from './types';
import type { TimelineEvent, DateRange } from '../types';
import { supabase } from '@/services/supabaseClient';

const COLOR_INCOME = '#10B981';
const COLOR_EXPENSE = '#EF4444';

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(amount));
}

export const financeProvider: TimelineProvider = {
  source: 'finance',

  async getEvents(userId: string, range: DateRange): Promise<TimelineEvent[]> {
    const startStr = formatDate(range.start);
    const endStr = formatDate(range.end);

    const { data, error } = await supabase
      .from('finance_transactions')
      .select('id, description, amount, type, category, transaction_date, is_recurring')
      .eq('user_id', userId)
      .gte('transaction_date', startStr)
      .lte('transaction_date', endStr)
      .order('transaction_date', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((tx) => {
      const isIncome = tx.type === 'income';
      const color = isIncome ? COLOR_INCOME : COLOR_EXPENSE;
      const prefix = isIncome ? 'Receita' : 'Despesa';
      const icon = isIncome ? 'trending-up' : 'trending-down';

      return {
        id: `finance-${tx.id}`,
        title: `${prefix}: ${tx.description}`,
        start: `${tx.transaction_date}T00:00:00`,
        end: null,
        allDay: true,
        source: 'finance',
        sourceId: tx.id,
        color,
        icon,
        isReadOnly: true,
        metadata: {
          amount: tx.amount,
          formattedAmount: formatCurrency(tx.amount),
          type: tx.type,
          category: tx.category,
          isRecurring: tx.is_recurring,
        },
      };
    });
  },
};
