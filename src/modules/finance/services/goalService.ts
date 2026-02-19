import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { FinanceGoal, GoalProgress } from '../types';

const log = createNamespacedLogger('GoalService');

/**
 * Fetch all goals for a user (active first, then by deadline).
 */
export async function getGoals(userId: string): Promise<FinanceGoal[]> {
  try {
    const { data, error } = await supabase
      .from('finance_goals')
      .select('*')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('deadline', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error fetching goals:', error);
    throw error;
  }
}

/**
 * Get all goals with calculated progress via RPC.
 */
export async function getGoalProgress(userId: string): Promise<GoalProgress[]> {
  try {
    const { data, error } = await supabase.rpc('get_goal_progress', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error fetching goal progress:', error);
    throw error;
  }
}

/**
 * Create a new financial goal.
 */
export async function createGoal(
  userId: string,
  goal: {
    title: string;
    goal_type: FinanceGoal['goal_type'];
    target_amount: number;
    current_amount?: number;
    deadline?: string | null;
    category?: string | null;
  }
): Promise<FinanceGoal> {
  try {
    const { data, error } = await supabase
      .from('finance_goals')
      .insert({
        user_id: userId,
        title: goal.title,
        goal_type: goal.goal_type,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount ?? 0,
        deadline: goal.deadline ?? null,
        category: goal.category ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error creating goal:', error);
    throw error;
  }
}

/**
 * Update an existing goal.
 */
export async function updateGoal(
  goalId: string,
  updates: Partial<Pick<FinanceGoal, 'title' | 'goal_type' | 'target_amount' | 'current_amount' | 'deadline' | 'category' | 'is_active'>>
): Promise<FinanceGoal> {
  try {
    const { data, error } = await supabase
      .from('finance_goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error updating goal:', error);
    throw error;
  }
}

/**
 * Delete a goal.
 */
export async function deleteGoal(goalId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('finance_goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  } catch (error) {
    log.error('Error deleting goal:', error);
    throw error;
  }
}

/**
 * Update the current_amount of a goal (e.g. add a deposit).
 */
export async function updateGoalProgress(
  goalId: string,
  amount: number
): Promise<FinanceGoal> {
  try {
    const { data, error } = await supabase
      .from('finance_goals')
      .update({ current_amount: amount })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error updating goal progress:', error);
    throw error;
  }
}
