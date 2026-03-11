import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('CategoryService');

// =====================================================
// Types
// =====================================================

export interface FinanceCategoryRow {
  id: string;
  user_id: string;
  key: string;
  label: string;
  icon: string;
  color: string;
  is_expense: boolean;
  sort_order: number;
  created_at: string;
}

export interface CreateCategoryInput {
  key?: string;
  label: string;
  icon?: string;
  color?: string;
  is_expense?: boolean;
}

export interface UpdateCategoryInput {
  label?: string;
  icon?: string;
  color?: string;
  is_expense?: boolean;
  sort_order?: number;
}

// =====================================================
// Helpers
// =====================================================

/**
 * Generate a key from a label: lowercase, strip accents, replace non-alphanumeric with _,
 * trim leading/trailing underscores.
 */
export function generateKeyFromLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// =====================================================
// Service Functions
// =====================================================

/**
 * Fetch all categories for a user, ordered by sort_order ASC.
 * If the user has no categories, seeds defaults via RPC and re-fetches.
 */
export async function getCategories(userId: string): Promise<FinanceCategoryRow[]> {
  try {
    const { data, error } = await supabase
      .from('finance_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      log.info('No categories found, seeding defaults', { userId });
      const { error: seedError } = await supabase.rpc('seed_default_categories', {
        p_user_id: userId,
      });
      if (seedError) {
        log.error('Error seeding default categories:', seedError);
        throw seedError;
      }

      const { data: seeded, error: refetchError } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (refetchError) throw refetchError;
      return seeded || [];
    }

    return data;
  } catch (error) {
    log.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Create a new category for the user.
 * Auto-generates key from label if not provided.
 * Sets sort_order to max + 1.
 */
export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<FinanceCategoryRow> {
  try {
    const key = input.key || generateKeyFromLabel(input.label);

    // Get max sort_order for this user
    const { data: maxData, error: maxError } = await supabase
      .from('finance_categories')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (maxError) throw maxError;

    const nextOrder = maxData && maxData.length > 0 ? maxData[0].sort_order + 1 : 0;

    const { data, error } = await supabase
      .from('finance_categories')
      .insert({
        user_id: userId,
        key,
        label: input.label,
        icon: input.icon ?? '📁',
        color: input.color ?? '#6B7280',
        is_expense: input.is_expense ?? true,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error creating category:', error);
    throw error;
  }
}

/**
 * Update an existing category by id.
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<FinanceCategoryRow> {
  try {
    const { data, error } = await supabase
      .from('finance_categories')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Delete a category and optionally migrate its transactions to another category key.
 * Uses an RPC to handle the migration atomically.
 */
export async function deleteCategoryWithMigration(
  categoryId: string,
  migrateToKey?: string
): Promise<{ success: boolean; migrated_transactions?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('delete_category_with_migration', {
      p_category_id: categoryId,
      p_migrate_to_key: migrateToKey || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    log.error('Error deleting category with migration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the count of transactions for a given category key and user.
 */
export async function getTransactionCountByCategory(
  userId: string,
  categoryKey: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('finance_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', categoryKey);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    log.error('Error getting transaction count by category:', error);
    throw error;
  }
}
