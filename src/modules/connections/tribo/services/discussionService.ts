import { supabase } from '@/services/supabaseClient';
import type {
  Discussion,
  CreateDiscussionPayload,
  UpdateDiscussionPayload,
  VotePollPayload,
  DiscussionReply,
  CreateReplyPayload,
  UpdateReplyPayload,
  AddReactionPayload,
  PollOption,
} from '../types';

export const discussionService = {
  // ============= DISCUSSIONS =============

  // Get all discussions for a space
  async getDiscussions(spaceId: string): Promise<Discussion[]> {
    const { data, error } = await supabase
      .from('tribo_discussions')
      .select(
        `
        *,
        author:auth.users!created_by(
          id,
          raw_user_meta_data
        )
      `
      )
      .eq('space_id', spaceId)
      .order('is_pinned', { ascending: false })
      .order('last_reply_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformDiscussionFromDB);
  },

  // Get recent discussions for a space (limited)
  async getRecentDiscussions(spaceId: string, limit: number = 5): Promise<Discussion[]> {
    const { data, error } = await supabase
      .from('tribo_discussions')
      .select(
        `
        *,
        author:auth.users!created_by(
          id,
          raw_user_meta_data
        )
      `
      )
      .eq('space_id', spaceId)
      .order('is_pinned', { ascending: false })
      .order('last_reply_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(transformDiscussionFromDB);
  },

  // Get discussions by category
  async getDiscussionsByCategory(
    spaceId: string,
    category: string
  ): Promise<Discussion[]> {
    const { data, error } = await supabase
      .from('tribo_discussions')
      .select(
        `
        *,
        author:auth.users!created_by(
          id,
          raw_user_meta_data
        )
      `
      )
      .eq('space_id', spaceId)
      .eq('category', category)
      .order('is_pinned', { ascending: false })
      .order('last_reply_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformDiscussionFromDB);
  },

  // Get active polls
  async getActivePolls(spaceId: string): Promise<Discussion[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('tribo_discussions')
      .select(
        `
        *,
        author:auth.users!created_by(
          id,
          raw_user_meta_data
        )
      `
      )
      .eq('space_id', spaceId)
      .eq('is_poll', true)
      .or(`poll_deadline.is.null,poll_deadline.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformDiscussionFromDB);
  },

  // Get single discussion with replies
  async getDiscussion(discussionId: string): Promise<Discussion> {
    const { data, error } = await supabase
      .from('tribo_discussions')
      .select(
        `
        *,
        author:auth.users!created_by(
          id,
          raw_user_meta_data
        ),
        replies:tribo_discussion_replies(
          *,
          author:auth.users!author_id(
            id,
            raw_user_meta_data
          )
        )
      `
      )
      .eq('id', discussionId)
      .single();

    if (error) throw error;

    return transformDiscussionFromDB(data, data.replies);
  },

  // Create discussion
  async createDiscussion(payload: CreateDiscussionPayload): Promise<Discussion> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    // Prepare poll options if it's a poll
    let pollOptions: PollOption[] = [];
    if (payload.isPoll && payload.pollOptions) {
      pollOptions = payload.pollOptions.map((text, index) => ({
        id: `opt_${index}`,
        text,
        votes: 0,
      }));
    }

    const { data, error } = await supabase
      .from('tribo_discussions')
      .insert({
        space_id: payload.spaceId,
        created_by: userData.user.id,
        title: payload.title,
        content: payload.content,
        category: payload.category || 'general',
        is_poll: payload.isPoll || false,
        poll_options: pollOptions,
        poll_deadline: payload.pollDeadline,
      })
      .select(
        `
        *,
        author:auth.users!created_by(
          id,
          raw_user_meta_data
        )
      `
      )
      .single();

    if (error) throw error;

    return transformDiscussionFromDB(data);
  },

  // Update discussion
  async updateDiscussion(
    discussionId: string,
    payload: UpdateDiscussionPayload
  ): Promise<Discussion> {
    const updateData: any = {};

    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.content !== undefined) updateData.content = payload.content;
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.isPinned !== undefined) updateData.is_pinned = payload.isPinned;
    if (payload.isResolved !== undefined) {
      updateData.is_resolved = payload.isResolved;
      if (payload.isResolved) {
        updateData.resolved_at = new Date().toISOString();
      } else {
        updateData.resolved_at = null;
      }
    }

    const { data, error } = await supabase
      .from('tribo_discussions')
      .update(updateData)
      .eq('id', discussionId)
      .select(
        `
        *,
        author:auth.users!created_by(
          id,
          raw_user_meta_data
        )
      `
      )
      .single();

    if (error) throw error;

    return transformDiscussionFromDB(data);
  },

  // Vote on poll
  async votePoll(payload: VotePollPayload): Promise<Discussion> {
    // Get current discussion
    const discussion = await this.getDiscussion(payload.discussionId);

    if (!discussion.isPoll) {
      throw new Error('This discussion is not a poll');
    }

    // Check if poll is still active
    if (
      discussion.pollDeadline &&
      new Date(discussion.pollDeadline) < new Date()
    ) {
      throw new Error('Poll has ended');
    }

    // Update poll votes
    const updatedVotes = {
      ...discussion.pollVotes,
      [payload.memberId]: payload.optionId,
    };

    // Update vote counts in options
    const updatedOptions = discussion.pollOptions.map((opt) => ({
      ...opt,
      votes: Object.values(updatedVotes).filter((v) => v === opt.id).length,
    }));

    const { data, error } = await supabase
      .from('tribo_discussions')
      .update({
        poll_votes: updatedVotes,
        poll_options: updatedOptions,
      })
      .eq('id', payload.discussionId)
      .select(
        `
        *,
        author:auth.users!created_by(
          id,
          raw_user_meta_data
        )
      `
      )
      .single();

    if (error) throw error;

    return transformDiscussionFromDB(data);
  },

  // Delete discussion
  async deleteDiscussion(discussionId: string): Promise<void> {
    const { error } = await supabase
      .from('tribo_discussions')
      .delete()
      .eq('id', discussionId);

    if (error) throw error;
  },

  // ============= REPLIES =============

  // Get replies for a discussion
  async getReplies(discussionId: string): Promise<DiscussionReply[]> {
    const { data, error } = await supabase
      .from('tribo_discussion_replies')
      .select(
        `
        *,
        author:auth.users!author_id(
          id,
          raw_user_meta_data
        )
      `
      )
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(transformReplyFromDB);
  },

  // Create reply
  async createReply(payload: CreateReplyPayload): Promise<DiscussionReply> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tribo_discussion_replies')
      .insert({
        discussion_id: payload.discussionId,
        author_id: userData.user.id,
        content: payload.content,
        parent_reply_id: payload.parentReplyId,
      })
      .select(
        `
        *,
        author:auth.users!author_id(
          id,
          raw_user_meta_data
        )
      `
      )
      .single();

    if (error) throw error;

    return transformReplyFromDB(data);
  },

  // Update reply
  async updateReply(
    replyId: string,
    payload: UpdateReplyPayload
  ): Promise<DiscussionReply> {
    const updateData: any = {};

    if (payload.content !== undefined) updateData.content = payload.content;

    const { data, error } = await supabase
      .from('tribo_discussion_replies')
      .update(updateData)
      .eq('id', replyId)
      .select(
        `
        *,
        author:auth.users!author_id(
          id,
          raw_user_meta_data
        )
      `
      )
      .single();

    if (error) throw error;

    return transformReplyFromDB(data);
  },

  // Add reaction to reply
  async addReaction(payload: AddReactionPayload): Promise<DiscussionReply> {
    const { data: currentReply } = await supabase
      .from('tribo_discussion_replies')
      .select('reactions')
      .eq('id', payload.replyId)
      .single();

    const reactions = currentReply?.reactions || {};
    const emojiReactions = reactions[payload.emoji] || [];

    // Toggle reaction
    const updatedReactions = {
      ...reactions,
      [payload.emoji]: emojiReactions.includes(payload.userId)
        ? emojiReactions.filter((id: string) => id !== payload.userId)
        : [...emojiReactions, payload.userId],
    };

    const { data, error } = await supabase
      .from('tribo_discussion_replies')
      .update({ reactions: updatedReactions })
      .eq('id', payload.replyId)
      .select(
        `
        *,
        author:auth.users!author_id(
          id,
          raw_user_meta_data
        )
      `
      )
      .single();

    if (error) throw error;

    return transformReplyFromDB(data);
  },

  // Delete reply
  async deleteReply(replyId: string): Promise<void> {
    const { error } = await supabase
      .from('tribo_discussion_replies')
      .delete()
      .eq('id', replyId);

    if (error) throw error;
  },

  // Get threaded replies
  async getThreadedReplies(discussionId: string): Promise<DiscussionReply[]> {
    const allReplies = await this.getReplies(discussionId);

    // Build reply tree
    const replyMap = new Map<string, DiscussionReply>();
    const rootReplies: DiscussionReply[] = [];

    // First pass: create map
    allReplies.forEach((reply) => {
      replyMap.set(reply.id, { ...reply, replies: [] });
    });

    // Second pass: build tree
    allReplies.forEach((reply) => {
      const replyNode = replyMap.get(reply.id)!;
      if (reply.parentReplyId) {
        const parent = replyMap.get(reply.parentReplyId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(replyNode);
        }
      } else {
        rootReplies.push(replyNode);
      }
    });

    return rootReplies;
  },
};

// ============= TRANSFORMERS =============

function transformDiscussionFromDB(data: any, replies?: any[]): Discussion {
  return {
    id: data.id,
    spaceId: data.space_id,
    createdBy: data.created_by,
    title: data.title,
    content: data.content,
    category: data.category,
    isPoll: data.is_poll,
    pollOptions: data.poll_options || [],
    pollVotes: data.poll_votes || {},
    pollDeadline: data.poll_deadline,
    isPinned: data.is_pinned,
    isResolved: data.is_resolved,
    resolvedAt: data.resolved_at,
    replyCount: data.reply_count,
    lastReplyAt: data.last_reply_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    author: data.author
      ? {
          id: data.author.id,
          displayName:
            data.author.raw_user_meta_data?.display_name ||
            data.author.raw_user_meta_data?.full_name ||
            'Anonymous',
          avatarUrl: data.author.raw_user_meta_data?.avatar_url,
        }
      : undefined,
    replies: replies ? replies.map(transformReplyFromDB) : undefined,
  };
}

function transformReplyFromDB(data: any): DiscussionReply {
  return {
    id: data.id,
    discussionId: data.discussion_id,
    authorId: data.author_id,
    content: data.content,
    parentReplyId: data.parent_reply_id,
    reactions: data.reactions || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    author: data.author
      ? {
          id: data.author.id,
          displayName:
            data.author.raw_user_meta_data?.display_name ||
            data.author.raw_user_meta_data?.full_name ||
            'Anonymous',
          avatarUrl: data.author.raw_user_meta_data?.avatar_url,
        }
      : undefined,
  };
}
