import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fundService } from '../services/fundService';
import type {
  CreateFundPayload,
  UpdateFundPayload,
  CreateContributionPayload,
  ConfirmContributionPayload,
} from '../types';

// ============= FUNDS =============

export function useFunds(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-funds', spaceId],
    queryFn: () => fundService.getFunds(spaceId),
    enabled: !!spaceId,
  });
}

export function useActiveFunds(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-funds', spaceId, 'active'],
    queryFn: () => fundService.getActiveFunds(spaceId),
    enabled: !!spaceId,
  });
}

export function useFund(fundId: string) {
  return useQuery({
    queryKey: ['tribo-fund', fundId],
    queryFn: () => fundService.getFund(fundId),
    enabled: !!fundId,
  });
}

export function useCreateFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFundPayload) => fundService.createFund(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tribo-funds', variables.spaceId] });
    },
  });
}

export function useUpdateFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fundId,
      payload,
    }: {
      fundId: string;
      payload: UpdateFundPayload;
    }) => fundService.updateFund(fundId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tribo-fund', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tribo-funds', data.spaceId] });
    },
  });
}

export function useDeleteFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fundId: string) => fundService.deleteFund(fundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribo-funds'] });
    },
  });
}

// ============= CONTRIBUTIONS =============

export function useContributions(fundId: string) {
  return useQuery({
    queryKey: ['tribo-contributions', fundId],
    queryFn: () => fundService.getContributions(fundId),
    enabled: !!fundId,
  });
}

export function useMemberContributions(memberId: string) {
  return useQuery({
    queryKey: ['tribo-member-contributions', memberId],
    queryFn: () => fundService.getMemberContributions(memberId),
    enabled: !!memberId,
  });
}

export function useCreateContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateContributionPayload) =>
      fundService.createContribution(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-contributions', data.fundId],
      });
      queryClient.invalidateQueries({ queryKey: ['tribo-fund', data.fundId] });
    },
  });
}

export function useConfirmContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConfirmContributionPayload) =>
      fundService.confirmContribution(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-contributions', data.fundId],
      });
      queryClient.invalidateQueries({ queryKey: ['tribo-fund', data.fundId] });
    },
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contributionId: string) =>
      fundService.deleteContribution(contributionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribo-contributions'] });
      queryClient.invalidateQueries({ queryKey: ['tribo-funds'] });
    },
  });
}

export function useFundStats(fundId: string) {
  return useQuery({
    queryKey: ['tribo-fund-stats', fundId],
    queryFn: () => fundService.getFundStats(fundId),
    enabled: !!fundId,
  });
}
