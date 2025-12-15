import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discussionService } from '../services/discussionService';
import type {
  CreateDiscussionPayload,
  UpdateDiscussionPayload,
  VotePollPayload,
  CreateReplyPayload,
  UpdateReplyPayload,
  AddReactionPayload,
} from '../types';

// ============= DISCUSSIONS =============

export function useDiscussions(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-discussions', spaceId],
    queryFn: () => discussionService.getDiscussions(spaceId),
    enabled: !!spaceId,
  });
}

export function useRecentDiscussions(spaceId: string, limit: number = 5) {
  return useQuery({
    queryKey: ['tribo-discussions', spaceId, 'recent', limit],
    queryFn: () => discussionService.getRecentDiscussions(spaceId, limit),
    enabled: !!spaceId,
  });
}

export function useDiscussionsByCategory(spaceId: string, category: string) {
  return useQuery({
    queryKey: ['tribo-discussions', spaceId, 'category', category],
    queryFn: () => discussionService.getDiscussionsByCategory(spaceId, category),
    enabled: !!spaceId && !!category,
  });
}

export function useActivePolls(spaceId: string) {
  return useQuery({
    queryKey: ['tribo-discussions', spaceId, 'polls', 'active'],
    queryFn: () => discussionService.getActivePolls(spaceId),
    enabled: !!spaceId,
  });
}

export function useDiscussion(discussionId: string) {
  return useQuery({
    queryKey: ['tribo-discussion', discussionId],
    queryFn: () => discussionService.getDiscussion(discussionId),
    enabled: !!discussionId,
  });
}

export function useCreateDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDiscussionPayload) =>
      discussionService.createDiscussion(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-discussions', variables.spaceId],
      });
    },
  });
}

export function useUpdateDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      discussionId,
      payload,
    }: {
      discussionId: string;
      payload: UpdateDiscussionPayload;
    }) => discussionService.updateDiscussion(discussionId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-discussion', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-discussions', data.spaceId],
      });
    },
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VotePollPayload) => discussionService.votePoll(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-discussion', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-discussions', data.spaceId],
      });
    },
  });
}

export function useDeleteDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (discussionId: string) =>
      discussionService.deleteDiscussion(discussionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribo-discussions'] });
    },
  });
}

// ============= REPLIES =============

export function useReplies(discussionId: string) {
  return useQuery({
    queryKey: ['tribo-replies', discussionId],
    queryFn: () => discussionService.getReplies(discussionId),
    enabled: !!discussionId,
  });
}

export function useThreadedReplies(discussionId: string) {
  return useQuery({
    queryKey: ['tribo-replies', discussionId, 'threaded'],
    queryFn: () => discussionService.getThreadedReplies(discussionId),
    enabled: !!discussionId,
  });
}

export function useCreateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReplyPayload) =>
      discussionService.createReply(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-replies', data.discussionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['tribo-discussion', data.discussionId],
      });
    },
  });
}

export function useUpdateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      replyId,
      payload,
    }: {
      replyId: string;
      payload: UpdateReplyPayload;
    }) => discussionService.updateReply(replyId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-replies', data.discussionId],
      });
    },
  });
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddReactionPayload) =>
      discussionService.addReaction(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tribo-replies', data.discussionId],
      });
    },
  });
}

export function useDeleteReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (replyId: string) => discussionService.deleteReply(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribo-replies'] });
      queryClient.invalidateQueries({ queryKey: ['tribo-discussions'] });
    },
  });
}
