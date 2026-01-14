/**
 * useChatMessages Hook
 * Epic #132 - AICA Billing & Unified Chat System
 *
 * React hook for managing unified chat messages with real-time updates,
 * optimistic UI, and rate limiting awareness.
 *
 * @module hooks/useChatMessages
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import {
  unifiedChatService,
  type ChatMessage,
  type ChatChannel,
  type ModelTier,
  type RateLimitStatus,
} from '@/services/unifiedChatService';

// =============================================================================
// TYPES
// =============================================================================

export interface UseChatMessagesOptions {
  channel: ChatChannel;
  sessionId?: string;
  autoFetch?: boolean;
  realtime?: boolean;
  modelTier?: ModelTier;
  onError?: (error: Error) => void;
  onRateLimited?: (status: RateLimitStatus) => void;
}

export interface UseChatMessagesReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: Error | null;
  sessionId: string;
  rateLimitStatus: RateLimitStatus | null;
  sendMessage: (content: string, context?: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearMessages: () => void;
  startNewSession: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useChatMessages(
  userId: string | null | undefined,
  options: UseChatMessagesOptions
): UseChatMessagesReturn {
  const {
    channel,
    sessionId: initialSessionId,
    autoFetch = true,
    realtime = true,
    modelTier = 'standard',
    onError,
    onRateLimited,
  } = options;

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState(
    initialSessionId || unifiedChatService.createSessionId()
  );
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);

  // Refs for stable callbacks
  const onErrorRef = useRef(onError);
  const onRateLimitedRef = useRef(onRateLimited);

  useEffect(() => {
    onErrorRef.current = onError;
    onRateLimitedRef.current = onRateLimited;
  }, [onError, onRateLimited]);

  // ---------------------------------------------------------------------------
  // Load History
  // ---------------------------------------------------------------------------

  const loadHistory = useCallback(async () => {
    if (!userId || !sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const history = await unifiedChatService.getSessionMessages(sessionId);
      setMessages(history);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load history');
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, sessionId]);

  // Auto-fetch on mount or session change
  useEffect(() => {
    if (autoFetch && userId && sessionId) {
      loadHistory();
    }
  }, [autoFetch, userId, sessionId, loadHistory]);

  // ---------------------------------------------------------------------------
  // Real-time Subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!realtime || !userId || !sessionId) return;

    const subscription = supabase
      .channel(`chat_messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;

          // Only add if not already in messages (avoid duplicates from optimistic updates)
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [realtime, userId, sessionId]);

  // ---------------------------------------------------------------------------
  // Send Message
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string, context?: string) => {
      if (!userId || !content.trim() || isSending) return;

      setIsSending(true);
      setError(null);

      // Optimistic update: add user message immediately
      const optimisticUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        session_id: sessionId,
        channel,
        role: 'user',
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMessage]);

      try {
        const response = await unifiedChatService.sendMessage(userId, {
          session_id: sessionId,
          channel,
          content: content.trim(),
          context,
          model_tier: modelTier,
        });

        // Update rate limit status
        if (response.rate_limited) {
          const newStatus = await unifiedChatService.checkRateLimit(userId, modelTier);
          setRateLimitStatus(newStatus);
          onRateLimitedRef.current?.(newStatus);
        }

        // Replace optimistic message with real one and add response
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== optimisticUserMessage.id);
          return [...filtered, response.message, response.response];
        });
      } catch (err) {
        // Rollback optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMessage.id));

        const error = err instanceof Error ? err : new Error('Failed to send message');
        setError(error);
        onErrorRef.current?.(error);
      } finally {
        setIsSending(false);
      }
    },
    [userId, sessionId, channel, modelTier, isSending]
  );

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const startNewSession = useCallback(() => {
    const newSessionId = unifiedChatService.createSessionId();
    setSessionId(newSessionId);
    setMessages([]);
    setError(null);
    setRateLimitStatus(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    messages,
    isLoading,
    isSending,
    error,
    sessionId,
    rateLimitStatus,
    sendMessage,
    loadHistory,
    clearMessages,
    startNewSession,
  };
}

export default useChatMessages;
