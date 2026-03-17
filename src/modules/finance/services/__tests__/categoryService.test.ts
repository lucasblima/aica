/**
 * Category Service Tests
 *
 * Validates CRUD operations for finance_categories including:
 * - getCategories: fetching + auto-seeding when empty
 * - createCategory: key auto-generation from label
 * - updateCategory: partial updates
 * - deleteCategoryWithMigration: RPC delegation
 * - getTransactionCountByCategory: count query
 *
 * Run with:
 *   npx vitest run src/modules/finance/services/__tests__/categoryService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger to avoid noise in test output
vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Supabase mock — use vi.hoisted to declare mock fns available to the hoisted vi.mock factory
const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategoryWithMigration,
  getTransactionCountByCategory,
  generateKeyFromLabel,
} from '../categoryService';

// =====================================================
// Test data
// =====================================================

const TEST_USER_ID = 'user-abc-123';

const mockCategories = [
  {
    id: 'cat-1',
    user_id: TEST_USER_ID,
    key: 'alimentacao',
    label: 'Alimentacao',
    icon: '🍔',
    color: '#F59E0B',
    is_expense: true,
    sort_order: 0,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    user_id: TEST_USER_ID,
    key: 'transporte',
    label: 'Transporte',
    icon: '🚗',
    color: '#3B82F6',
    is_expense: true,
    sort_order: 1,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'cat-3',
    user_id: TEST_USER_ID,
    key: 'salario',
    label: 'Salario',
    icon: '💰',
    color: '#10B981',
    is_expense: false,
    sort_order: 2,
    created_at: '2026-03-01T00:00:00Z',
  },
];

// =====================================================
// Tests
// =====================================================

describe('generateKeyFromLabel', () => {
  it('should lowercase and strip accents', () => {
    expect(generateKeyFromLabel('Alimentação')).toBe('alimentacao');
  });

  it('should replace non-alphanumeric with underscore', () => {
    expect(generateKeyFromLabel('Saúde & Bem-Estar')).toBe('saude_bem_estar');
  });

  it('should trim leading and trailing underscores', () => {
    expect(generateKeyFromLabel('  Café da Manhã  ')).toBe('cafe_da_manha');
  });

  it('should handle simple labels', () => {
    expect(generateKeyFromLabel('Food')).toBe('food');
  });
});

describe('getCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return sorted categories when they exist', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getCategories(TEST_USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('finance_categories');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('user_id', TEST_USER_ID);
    expect(chain.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    expect(result).toEqual(mockCategories);
    expect(result).toHaveLength(3);
  });

  it('should seed defaults and re-fetch when no categories exist', async () => {
    const emptyChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const seededChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(emptyChain)
      .mockReturnValueOnce(seededChain);

    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await getCategories(TEST_USER_ID);

    expect(mockRpc).toHaveBeenCalledWith('seed_default_categories', {
      p_user_id: TEST_USER_ID,
    });

    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockCategories);
  });

  it('should throw when supabase returns an error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(getCategories(TEST_USER_ID)).rejects.toEqual({ message: 'DB error' });
  });
});

describe('createCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-generate key from label when key not provided', async () => {
    const newCategory = {
      ...mockCategories[0],
      key: 'educacao',
      label: 'Educação',
      sort_order: 3,
    };

    const maxChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ sort_order: 2 }], error: null }),
    };

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newCategory, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(maxChain)
      .mockReturnValueOnce(insertChain);

    const result = await createCategory(TEST_USER_ID, { label: 'Educação' });

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: TEST_USER_ID,
        key: 'educacao',
        label: 'Educação',
        sort_order: 3,
      })
    );
    expect(result).toEqual(newCategory);
  });

  it('should use provided key when given', async () => {
    const newCategory = {
      ...mockCategories[0],
      key: 'custom_key',
      label: 'Custom Label',
      sort_order: 3,
    };

    const maxChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ sort_order: 2 }], error: null }),
    };

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newCategory, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(maxChain)
      .mockReturnValueOnce(insertChain);

    await createCategory(TEST_USER_ID, { key: 'custom_key', label: 'Custom Label' });

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'custom_key' })
    );
  });

  it('should set sort_order to 0 when no categories exist', async () => {
    const newCategory = { ...mockCategories[0], sort_order: 0 };

    const maxChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newCategory, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(maxChain)
      .mockReturnValueOnce(insertChain);

    await createCategory(TEST_USER_ID, { label: 'First' });

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sort_order: 0 })
    );
  });

  it('should use default icon and color when not provided', async () => {
    const newCategory = { ...mockCategories[0] };

    const maxChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newCategory, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(maxChain)
      .mockReturnValueOnce(insertChain);

    await createCategory(TEST_USER_ID, { label: 'Teste' });

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: '\u{1F4C1}',
        color: '#6B7280',
        is_expense: true,
      })
    );
  });
});

describe('updateCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update and return the updated category', async () => {
    const updated = { ...mockCategories[0], label: 'Nova Label' };

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await updateCategory('cat-1', { label: 'Nova Label' });

    expect(mockFrom).toHaveBeenCalledWith('finance_categories');
    expect(chain.update).toHaveBeenCalledWith({ label: 'Nova Label' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'cat-1');
    expect(result).toEqual(updated);
  });
});

describe('deleteCategoryWithMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call RPC with categoryId and migrateToKey', async () => {
    const rpcResult = { success: true, migrated_transactions: 5 };
    mockRpc.mockResolvedValue({ data: rpcResult, error: null });

    const result = await deleteCategoryWithMigration('cat-1', 'other');

    expect(mockRpc).toHaveBeenCalledWith('delete_category_with_migration', {
      p_category_id: 'cat-1',
      p_migrate_to_key: 'other',
    });
    expect(result).toEqual(rpcResult);
  });

  it('should pass null for migrateToKey when not provided', async () => {
    const rpcResult = { success: true, migrated_transactions: 0 };
    mockRpc.mockResolvedValue({ data: rpcResult, error: null });

    await deleteCategoryWithMigration('cat-1');

    expect(mockRpc).toHaveBeenCalledWith('delete_category_with_migration', {
      p_category_id: 'cat-1',
      p_migrate_to_key: null,
    });
  });

  it('should return error result on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

    const result = await deleteCategoryWithMigration('cat-1', 'other');

    expect(result).toEqual({
      success: false,
      error: expect.any(String),
    });
  });
});

describe('getTransactionCountByCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the count of transactions for a category', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 42, error: null }),
      }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getTransactionCountByCategory(TEST_USER_ID, 'alimentacao');

    expect(mockFrom).toHaveBeenCalledWith('finance_transactions');
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(result).toBe(42);
  });

  it('should return 0 when count is null', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: null, error: null }),
      }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getTransactionCountByCategory(TEST_USER_ID, 'nonexistent');

    expect(result).toBe(0);
  });
});
