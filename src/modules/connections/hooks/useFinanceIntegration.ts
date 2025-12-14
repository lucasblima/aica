/**
 * Finance Integration Hooks
 *
 * React hooks for integrating Connection transactions with Personal Finance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  syncToPersonalFinance,
  importFromPersonalFinance,
  getSpaceFinanceSummary,
  getUserBalance,
  markSplitAsPaid,
  getSplitPaymentStatus,
  getDefaultDateRange,
  type SpaceFinanceSummary,
  type UserBalance,
  type SyncOptions,
} from '../services/financeIntegrationService';
import { supabase } from '../../../services/supabaseClient';

// ============================================================================
// SPACE FINANCE SUMMARY
// ============================================================================

export function useSpaceFinanceSummary(
  spaceId: string,
  dateRange?: { start: string; end: string }
) {
  const range = dateRange || getDefaultDateRange();

  return useQuery<SpaceFinanceSummary>({
    queryKey: ['space-finance-summary', spaceId, range],
    queryFn: () => getSpaceFinanceSummary(spaceId, range),
    enabled: !!spaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// USER BALANCE
// ============================================================================

export function useUserBalance(spaceId: string) {
  return useQuery<UserBalance>({
    queryKey: ['user-balance', spaceId],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');
      return getUserBalance(spaceId, userId);
    },
    enabled: !!spaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// SYNC TO PERSONAL FINANCE
// ============================================================================

export function useSyncToPersonalFinance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      options,
    }: {
      transactionId: string;
      options?: SyncOptions;
    }) => syncToPersonalFinance(transactionId, options),
    onSuccess: () => {
      // Invalidate finance queries
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
}

// ============================================================================
// IMPORT FROM PERSONAL FINANCE
// ============================================================================

export function useImportFromPersonalFinance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spaceId,
      transactionIds,
    }: {
      spaceId: string;
      transactionIds: string[];
    }) => importFromPersonalFinance(spaceId, transactionIds),
    onSuccess: (_, variables) => {
      // Invalidate connection transaction queries
      queryClient.invalidateQueries({ queryKey: ['connection-transactions', variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ['space-finance-summary', variables.spaceId] });
    },
  });
}

// ============================================================================
// SPLIT PAYMENT TRACKING
// ============================================================================

export function useMarkSplitAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      memberId,
    }: {
      transactionId: string;
      memberId: string;
    }) => markSplitAsPaid(transactionId, memberId),
    onSuccess: () => {
      // Invalidate balance and summary queries
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['space-finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['split-payment-status'] });
    },
  });
}

export function useSplitPaymentStatus(transactionId: string) {
  return useQuery({
    queryKey: ['split-payment-status', transactionId],
    queryFn: () => getSplitPaymentStatus(transactionId),
    enabled: !!transactionId,
  });
}

// ============================================================================
// COMBINED HOOK FOR FINANCE INTEGRATION
// ============================================================================

/**
 * Main hook that provides all finance integration functionality
 */
export function useFinanceIntegration(spaceId: string) {
  const summary = useSpaceFinanceSummary(spaceId);
  const balance = useUserBalance(spaceId);
  const syncToPersonal = useSyncToPersonalFinance();
  const importFromPersonal = useImportFromPersonalFinance();
  const markAsPaid = useMarkSplitAsPaid();

  return {
    // Summary data
    summary: summary.data,
    balance: balance.data,
    isLoading: summary.isLoading || balance.isLoading,
    error: summary.error || balance.error,

    // Mutations
    syncToPersonal,
    importFromPersonal,
    markAsPaid,

    // Refetch functions
    refetchSummary: summary.refetch,
    refetchBalance: balance.refetch,
  };
}
