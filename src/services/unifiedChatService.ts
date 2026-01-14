/**
 * Unified Chat Service
 * Epic #132 - AICA Billing & Unified Chat System
 *
 * Provides a unified interface for multi-channel chat (Web, WhatsApp, Voice)
 * with rate limiting, token tracking, and message persistence.
 *
 * @module services/unifiedChatService
 */

import { supabase } from './supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export type ChatChannel = 'web' | 'whatsapp' | 'voice' | 'api';
export type MessageRole = 'user' | 'assistant' | 'system';
export type ModelTier = 'premium' | 'standard' | 'lite';

export interface ChatMessage {
  id: string;
  user_id: string;
  session_id: string;
  channel: ChatChannel;
  role: MessageRole;
  content: string;
  model_used?: string;
  tokens_used?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface SendMessageRequest {
  session_id: string;
  channel: ChatChannel;
  content: string;
  context?: string;
  model_tier?: ModelTier;
  metadata?: Record<string, unknown>;
}

export interface SendMessageResponse {
  message: ChatMessage;
  response: ChatMessage;
  tokens_used: number;
  rate_limited: boolean;
  queued?: boolean;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining_tokens: number;
  reset_time: string;
  queue_position?: number;
  retry_after?: number;
}

export interface ChatSession {
  id: string;
  user_id: string;
  channel: ChatChannel;
  title?: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

// =============================================================================
// MODEL CONFIGURATION
// =============================================================================

const MODEL_BY_TIER: Record<ModelTier, string> = {
  premium: 'gemini-1.5-pro',
  standard: 'gemini-2.0-flash-exp',
  lite: 'gemini-2.0-flash-lite',
};

const ESTIMATED_TOKENS_PER_MESSAGE = 500;

// =============================================================================
// SERVICE CLASS
// =============================================================================

class UnifiedChatService {
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  }

  // ---------------------------------------------------------------------------
  // Rate Limiting
  // ---------------------------------------------------------------------------

  async checkRateLimit(
    userId: string,
    modelTier: ModelTier = 'standard',
    estimatedTokens: number = ESTIMATED_TOKENS_PER_MESSAGE
  ): Promise<RateLimitStatus> {
    try {
      const { data, error } = await supabase.functions.invoke('check-rate-limit', {
        body: {
          user_id: userId,
          model_tier: modelTier,
          estimated_tokens: estimatedTokens,
        },
      });

      if (error) throw error;

      return data as RateLimitStatus;
    } catch (error) {
      console.error('[UnifiedChatService] Rate limit check failed:', error);
      // Default to allowed if rate limit check fails (fail open for UX)
      return {
        allowed: true,
        remaining_tokens: 999999,
        reset_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Message Persistence
  // ---------------------------------------------------------------------------

  async saveMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: message.user_id,
        session_id: message.session_id,
        channel: message.channel,
        role: message.role,
        content: message.content,
        model_used: message.model_used,
        tokens_used: message.tokens_used,
        metadata: message.metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSessionMessages(
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getUserSessions(
    userId: string,
    channel?: ChatChannel,
    limit: number = 20
  ): Promise<ChatSession[]> {
    let query = supabase
      .from('chat_messages')
      .select('session_id, channel, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query.limit(limit * 10); // Get more to group

    if (error) throw error;

    // Group by session_id and aggregate
    const sessionMap = new Map<string, ChatSession>();

    for (const msg of data || []) {
      const existing = sessionMap.get(msg.session_id);
      if (existing) {
        existing.message_count++;
        if (msg.created_at > existing.last_message_at) {
          existing.last_message_at = msg.created_at;
        }
      } else {
        sessionMap.set(msg.session_id, {
          id: msg.session_id,
          user_id: userId,
          channel: msg.channel,
          message_count: 1,
          last_message_at: msg.created_at,
          created_at: msg.created_at,
        });
      }
    }

    return Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
      .slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Send Message (Main Entry Point)
  // ---------------------------------------------------------------------------

  async sendMessage(
    userId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const modelTier = request.model_tier || 'standard';

    // Check rate limit
    const rateLimitStatus = await this.checkRateLimit(
      userId,
      modelTier,
      ESTIMATED_TOKENS_PER_MESSAGE
    );

    // Save user message first
    const userMessage = await this.saveMessage({
      user_id: userId,
      session_id: request.session_id,
      channel: request.channel,
      role: 'user',
      content: request.content,
      metadata: request.metadata,
    });

    // If rate limited, queue the request
    if (!rateLimitStatus.allowed) {
      const queueResult = await this.queueMessage(userId, request, userMessage.id);

      // Return a placeholder response
      const placeholderResponse = await this.saveMessage({
        user_id: userId,
        session_id: request.session_id,
        channel: request.channel,
        role: 'assistant',
        content: `Sua mensagem foi recebida e esta na fila (posicao ${rateLimitStatus.queue_position || 1}). Voce sera notificado quando a resposta estiver pronta.`,
        metadata: { queued: true, queue_id: queueResult.id },
      });

      return {
        message: userMessage,
        response: placeholderResponse,
        tokens_used: 0,
        rate_limited: true,
        queued: true,
      };
    }

    // Get conversation history for context
    const history = await this.getSessionMessages(request.session_id, 10);
    const historyFormatted = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call AI service
    const aiResponse = await this.callAIService(
      request.content,
      historyFormatted,
      request.context,
      modelTier
    );

    // Save assistant response
    const assistantMessage = await this.saveMessage({
      user_id: userId,
      session_id: request.session_id,
      channel: request.channel,
      role: 'assistant',
      content: aiResponse.content,
      model_used: MODEL_BY_TIER[modelTier],
      tokens_used: aiResponse.tokens_used,
    });

    // Record token usage
    await this.recordTokenUsage(userId, modelTier, aiResponse.tokens_used);

    return {
      message: userMessage,
      response: assistantMessage,
      tokens_used: aiResponse.tokens_used,
      rate_limited: false,
    };
  }

  // ---------------------------------------------------------------------------
  // AI Service Integration
  // ---------------------------------------------------------------------------

  private async callAIService(
    message: string,
    history: Array<{ role: string; content: string }>,
    context?: string,
    modelTier: ModelTier = 'standard'
  ): Promise<{ content: string; tokens_used: number }> {
    const systemPrompt = `Voce e a AICA, uma assistente pessoal inteligente.
Seja util, concisa e amigavel.
Responda em portugues brasileiro.
${context ? `Contexto adicional: ${context}` : ''}`;

    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: {
        action: 'finance_chat', // Use existing chat action
        payload: {
          message,
          history,
          systemPrompt,
          model: modelTier === 'premium' ? 'smart' : 'fast',
        },
      },
    });

    if (error) throw error;

    const result = data.result;
    const tokensUsed = data.usageMetadata
      ? (data.usageMetadata.promptTokenCount || 0) + (data.usageMetadata.candidatesTokenCount || 0)
      : ESTIMATED_TOKENS_PER_MESSAGE;

    return {
      content: result.response || 'Desculpe, nao consegui processar sua mensagem.',
      tokens_used: tokensUsed,
    };
  }

  // ---------------------------------------------------------------------------
  // Queue Management
  // ---------------------------------------------------------------------------

  private async queueMessage(
    userId: string,
    request: SendMessageRequest,
    userMessageId: string
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('action_queue')
      .insert({
        user_id: userId,
        action_type: 'ai_completion',
        payload: {
          action: 'chat_response',
          data: {
            session_id: request.session_id,
            channel: request.channel,
            user_message_id: userMessageId,
            content: request.content,
            context: request.context,
          },
          model_tier: request.model_tier || 'standard',
          estimated_tokens: ESTIMATED_TOKENS_PER_MESSAGE,
          callback_table: 'chat_messages',
          callback_id: userMessageId,
        },
        priority: 'normal',
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  // ---------------------------------------------------------------------------
  // Token Usage Tracking
  // ---------------------------------------------------------------------------

  private async recordTokenUsage(
    userId: string,
    modelTier: ModelTier,
    tokensUsed: number
  ): Promise<void> {
    try {
      await supabase.rpc('record_token_usage', {
        p_user_id: userId,
        p_model_tier: modelTier,
        p_tokens_used: tokensUsed,
        p_request_type: 'chat',
      });
    } catch (error) {
      console.error('[UnifiedChatService] Failed to record token usage:', error);
      // Non-blocking - don't throw
    }
  }

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  createSessionId(): string {
    return crypto.randomUUID();
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw error;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const unifiedChatService = new UnifiedChatService();
export default unifiedChatService;
