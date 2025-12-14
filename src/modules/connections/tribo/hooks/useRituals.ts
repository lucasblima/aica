import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ritualService } from '../services/ritualService';
import type {
  CreateRitualPayload,
  UpdateRitualPayload,
  CreateOccurrencePayload,
  UpdateOccurrencePayload,
  RSVPPayload,
  BringListItem,
} from '../types';

// ============= RITUALS =============

export function useRituals(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-rituals', spaceId],
    queryFn: () => ritualService.getRituals(spaceId),
    enabled: !!spaceId,
  });
}

export function useActiveRituals(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-rituals', spaceId, 'active'],
    queryFn: () => ritualService.getActiveRituals(spaceId),
    enabled: !!spaceId,
  });
}

export function useRitual(ritualId: string) {
  return useQuery({
    queryKey: ['tribo-ritual', ritualId],
    queryFn: () => ritualService.getRitual(ritualId),
    enabled: !!ritualId,
  });
}

export function useCreateRitual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRitualPayload) => ritualService.createRitual(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tribo-rituals', variables.spaceId] });
    },
  });
}

export function useUpdateRitual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ritualId,
      payload,
    }: {
      ritualId: string;
      payload: UpdateRitualPayload;
    }) => ritualService.updateRitual(ritualId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tribo-ritual', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tribo-rituals', data.spaceId] });
    },
  });
}

export function useDeleteRitual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ritualId: string) => ritualService.deleteRitual(ritualId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribo-rituals'] });
    },
  });
}

// ============= OCCURRENCES =============

export function useOccurrences(ritualId: string) {
  return useQuery({
    queryKey: ['tribo-occurrences', ritualId],
    queryFn: () => ritualService.getOccurrences(ritualId),
    enabled: !!ritualId,
  });
}

export function useUpcomingOccurrences(spaceId: string, limit?: number) {
  return useQuery({
    queryKey: ['tribo-occurrences', spaceId, 'upcoming', limit],
    queryFn: () => ritualService.getUpcomingOccurrences(spaceId, limit),
    enabled: !!spaceId,
  });
}

export function useOccurrence(occurrenceId: string) {
  return useQuery({
    queryKey: ['tribo-occurrence', occurrenceId],
    queryFn: () => ritualService.getOccurrence(occurrenceId),
    enabled: !!occurrenceId,
  });
}

export function useCreateOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOccurrencePayload) =>
      ritualService.createOccurrence(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrences', data.ritualId],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrences', data.ritual?.spaceId, 'upcoming'],
      });
    },
  });
}

export function useUpdateOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      occurrenceId,
      payload,
    }: {
      occurrenceId: string;
      payload: UpdateOccurrencePayload;
    }) => ritualService.updateOccurrence(occurrenceId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrence', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrences', data.ritualId],
      });
    },
  });
}

export function useRSVP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RSVPPayload) => ritualService.rsvp(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrence', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrences'],
      });
    },
  });
}

export function useUpdateBringList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      occurrenceId,
      bringList,
    }: {
      occurrenceId: string;
      bringList: BringListItem[];
    }) => ritualService.updateBringList(occurrenceId, bringList),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrence', data.id],
      });
    },
  });
}

export function useAssignBringListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      occurrenceId,
      itemId,
      memberId,
    }: {
      occurrenceId: string;
      itemId: string;
      memberId: string;
    }) => ritualService.assignBringListItem(occurrenceId, itemId, memberId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrence', data.id],
      });
    },
  });
}

export function useToggleBringListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      occurrenceId,
      itemId,
    }: {
      occurrenceId: string;
      itemId: string;
    }) => ritualService.toggleBringListItem(occurrenceId, itemId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-occurrence', data.id],
      });
    },
  });
}

export function useDeleteOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (occurrenceId: string) =>
      ritualService.deleteOccurrence(occurrenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribo-occurrences'] });
    },
  });
}
