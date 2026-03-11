import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build chainable mock for Supabase
function createChainableMock(terminal: Record<string, unknown> = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const methods = [
    'select', 'eq', 'single', 'insert', 'update', 'order',
    'gte', 'lte', 'not', 'limit', 'delete',
  ];

  for (const method of methods) {
    chain[method] = vi.fn();
  }

  // By default every method returns the chain so calls can be chained
  for (const method of methods) {
    chain[method].mockReturnValue({ ...chain, ...terminal });
  }

  return chain;
}

const mockChain = createChainableMock({ data: [], error: null });
const mockFrom = vi.fn(() => mockChain);
const mockGetUser = vi.fn();

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  calculateMemberBalance,
  type MemberBalance,
} from '../financeIntegration';

// ============================================================================
// calculateMemberBalance — PURE LOGIC via mock data
//
// The function calculates owes/owed/net from a list of unsettled transactions.
// We test the *calculation logic* by controlling the mock data returned by Supabase.
// ============================================================================

describe('calculateMemberBalance', () => {
  const SPACE_ID = 'space-1';
  const MEMBER_A = 'member-a'; // the member we're computing balance for
  const MEMBER_B = 'member-b';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  /** Helper: set up the chain so the second `.eq` (is_settled=false) returns `txns` */
  function mockTransactions(txns: Record<string, unknown>[]) {
    // The function calls:
    //   supabase.from('connection_transactions').select('*').eq('space_id', id).eq('is_settled', false)
    // Our chain returns { data: txns, error: null } at the end of the chain.
    const terminalChain = createChainableMock({ data: txns, error: null });
    const eqSettled = vi.fn(() => ({ ...terminalChain, data: txns, error: null }));
    const eqSpace = vi.fn(() => ({ eq: eqSettled, data: txns, error: null }));
    const selectAll = vi.fn(() => ({ eq: eqSpace }));
    mockFrom.mockReturnValue({ select: selectAll });
  }

  it('returns zero balance when no transactions exist', async () => {
    mockTransactions([]);
    const result = await calculateMemberBalance(SPACE_ID, MEMBER_A);
    expect(result).toEqual({ owes: 0, owed: 0, net: 0 });
  });

  it('member owes when someone else paid', async () => {
    mockTransactions([
      {
        id: 'tx-1',
        paid_by: MEMBER_B,
        split_data: { [MEMBER_A]: 30, [MEMBER_B]: 70 },
        space_id: SPACE_ID,
      },
    ]);
    const result = await calculateMemberBalance(SPACE_ID, MEMBER_A);
    expect(result.owes).toBe(30);
    expect(result.owed).toBe(0);
    expect(result.net).toBe(-30);
  });

  it('member is owed when they paid for others', async () => {
    mockTransactions([
      {
        id: 'tx-2',
        paid_by: MEMBER_A,
        split_data: { [MEMBER_A]: 50, [MEMBER_B]: 50 },
        space_id: SPACE_ID,
      },
    ]);
    const result = await calculateMemberBalance(SPACE_ID, MEMBER_A);
    // MEMBER_A paid — others owe them their share (MEMBER_B's 50)
    expect(result.owed).toBe(50);
    expect(result.owes).toBe(0);
    expect(result.net).toBe(50);
  });

  it('net balances across multiple transactions', async () => {
    mockTransactions([
      {
        id: 'tx-1',
        paid_by: MEMBER_A,
        split_data: { [MEMBER_A]: 40, [MEMBER_B]: 60 },
        space_id: SPACE_ID,
      },
      {
        id: 'tx-2',
        paid_by: MEMBER_B,
        split_data: { [MEMBER_A]: 25, [MEMBER_B]: 75 },
        space_id: SPACE_ID,
      },
    ]);
    const result = await calculateMemberBalance(SPACE_ID, MEMBER_A);
    // tx-1: A paid, owed=60 (B's share)
    // tx-2: B paid, owes=25 (A's share)
    expect(result.owed).toBe(60);
    expect(result.owes).toBe(25);
    expect(result.net).toBe(35);
  });

  it('handles member with no share in split_data', async () => {
    mockTransactions([
      {
        id: 'tx-1',
        paid_by: MEMBER_B,
        split_data: { [MEMBER_B]: 100 }, // MEMBER_A not in split at all
        space_id: SPACE_ID,
      },
    ]);
    const result = await calculateMemberBalance(SPACE_ID, MEMBER_A);
    expect(result.owes).toBe(0);
    expect(result.owed).toBe(0);
    expect(result.net).toBe(0);
  });

  it('throws when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(calculateMemberBalance(SPACE_ID, MEMBER_A)).rejects.toThrow(
      'User not authenticated'
    );
  });
});
