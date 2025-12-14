import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '../services/resourceService';
import type {
  CreateResourcePayload,
  UpdateResourcePayload,
  CheckoutResourcePayload,
} from '../types';

export function useResources(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-resources', spaceId],
    queryFn: () => resourceService.getResources(spaceId),
    enabled: !!spaceId,
  });
}

export function useAvailableResources(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-resources', spaceId, 'available'],
    queryFn: () => resourceService.getAvailableResources(spaceId),
    enabled: !!spaceId,
  });
}

export function useResourcesByCategory(spaceId: string, category: string) {
  return useQuery({
    queryKey: ['tribo-resources', spaceId, 'category', category],
    queryFn: () => resourceService.getResourcesByCategory(spaceId, category),
    enabled: !!spaceId && !!category,
  });
}

export function useResource(resourceId: string) {
  return useQuery({
    queryKey: ['tribo-resource', resourceId],
    queryFn: () => resourceService.getResource(resourceId),
    enabled: !!resourceId,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateResourcePayload) =>
      resourceService.createResource(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-resources', variables.spaceId],
      });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      resourceId,
      payload,
    }: {
      resourceId: string;
      payload: UpdateResourcePayload;
    }) => resourceService.updateResource(resourceId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-resource', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-resources', data.spaceId],
      });
    },
  });
}

export function useCheckoutResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckoutResourcePayload) =>
      resourceService.checkoutResource(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-resource', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-resources', data.spaceId],
      });
    },
  });
}

export function useReturnResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resourceId: string) => resourceService.returnResource(resourceId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-resource', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-resources', data.spaceId],
      });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resourceId: string) => resourceService.deleteResource(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribo-resources'] });
    },
  });
}

export function useMemberResources(memberId: string) {
  return useQuery({
    queryKey: ['tribo-member-resources', memberId],
    queryFn: () => resourceService.getMemberResources(memberId),
    enabled: !!memberId,
  });
}

export function useOverdueResources(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-resources', spaceId, 'overdue'],
    queryFn: () => resourceService.getOverdueResources(spaceId),
    enabled: !!spaceId,
  });
}
