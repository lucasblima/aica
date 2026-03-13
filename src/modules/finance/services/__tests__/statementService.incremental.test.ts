/**
 * Tests for incremental import behavior in statementService.
 *
 * Verifies that overlap checks and duplicate file hash checks
 * no longer block re-imports (Tasks 1-3 of incremental import).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../../../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://test' }, error: null }),
      })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

vi.mock('../../../../lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../accountService', () => ({
  ensureAccountExists: vi.fn().mockResolvedValue('mock-account-id'),
}));

vi.mock('../csvParserService', () => ({
  csvParserService: {
    parseCSV: vi.fn(),
  },
}));

import { statementService } from '../statementService';

describe('statementService — incremental import (Tasks 1-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 3: checkDuplicate always returns false', () => {
    it('returns false regardless of inputs', async () => {
      const result = await statementService.checkDuplicate('user-123', 'abc123hash');
      expect(result).toBe(false);
    });

    it('does not query the database', async () => {
      const { supabase } = await import('../../../../services/supabaseClient');
      await statementService.checkDuplicate('user-123', 'abc123hash');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Task 1: saveParsedData does not throw on overlap', () => {
    it('does not throw when overlapping statements exist', async () => {
      const { supabase } = await import('../../../../services/supabaseClient');

      // Mock checkPeriodOverlap to return overlapping statements
      const mockFrom = vi.fn();
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'stmt-1' }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockFrom.mockReturnValue(mockChain);
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

      // Spy on checkPeriodOverlap to return overlap
      const checkPeriodSpy = vi.spyOn(statementService, 'checkPeriodOverlap');
      checkPeriodSpy.mockResolvedValue({
        hasOverlap: true,
        overlapping: [
          { id: 'other-stmt-1', file_name: 'old.csv', bank_name: 'Nubank', period_start: '2024-01-01', period_end: '2024-01-31' },
        ],
      });

      // saveParsedData should NOT throw on overlap (Task 1)
      // It will still throw because no transactions, but NOT because of overlap
      const parsed = {
        bankName: 'Nubank',
        accountType: 'checking' as const,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        openingBalance: 1000,
        closingBalance: 1500,
        currency: 'BRL',
        transactions: [], // empty to trigger the "no transactions" error, not overlap
      };

      await expect(
        statementService.saveParsedData('stmt-new', 'user-123', parsed, '# Markdown')
      ).rejects.toThrow('Nenhuma transação foi identificada no extrato');

      // Verify it did NOT throw an overlap error
      checkPeriodSpy.mockRestore();
    });
  });
});
