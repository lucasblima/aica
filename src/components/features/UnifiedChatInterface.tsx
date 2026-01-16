/**
 * UnifiedChatInterface Component
 * Epic #132 - AICA Billing & Unified Chat System
 *
 * A reusable chat interface that works across all channels (Web, WhatsApp, Voice).
 * Features rate limiting awareness, optimistic updates, and Framer Motion animations.
 *
 * @module components/features/UnifiedChatInterface
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  Zap,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useChatMessages, type UseChatMessagesOptions } from '@/hooks/useChatMessages';
import type { ChatMessage, ChatChannel, ModelTier, RateLimitStatus } from '@/services/unifiedChatService';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedChatInterfaceProps {
  userId: string;
  channel: ChatChannel;
  sessionId?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  welcomeMessage?: string;
  modelTier?: ModelTier;
  showRateLimitStatus?: boolean;
  showQuickActions?: boolean;
  quickActions?: QuickAction[];
  onSessionChange?: (sessionId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  prompt: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'help', label: 'Ajuda', icon: <MessageSquare className="w-4 h-4" />, prompt: 'Como voce pode me ajudar?' },
  { id: 'status', label: 'Meu status', icon: <Zap className="w-4 h-4" />, prompt: 'Qual e meu status atual?' },
];

const ANIMATION_VARIANTS = {
  message: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -20 },
  },
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  },
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function RateLimitBanner({ status }: { status: RateLimitStatus }) {
  const resetDate = new Date(status.reset_time);
  const minutesRemaining = Math.ceil((resetDate.getTime() - Date.now()) / 60000);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2"
    >
      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-800">
          Limite de tokens atingido. Recarrega em {minutesRemaining} minutos.
        </p>
        {status.queue_position !== undefined && status.queue_position > 0 && (
          <p className="text-xs text-amber-600 mt-0.5">
            Posicao na fila: {status.queue_position}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function MessageBubble({
  message,
  isLatest,
}: {
  message: ChatMessage;
  isLatest: boolean;
}) {
  const isUser = message.role === 'user';
  const isQueued = message.metadata?.queued === true;

  const formatContent = (content: string): string => {
    if (typeof content !== 'string') return '';

    const html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br />');

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['strong', 'em', 'code', 'br'],
      ALLOWED_ATTR: ['class'],
    });
  };

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.message}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          max-w-[85%] p-4 rounded-2xl shadow-sm
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white border border-gray-100 rounded-bl-md'
          }
          ${isQueued ? 'opacity-75' : ''}
        `}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-purple-600">AICA</span>
            {isQueued && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                Na fila
              </span>
            )}
          </div>
        )}

        <div
          className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-gray-800'}`}
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />

        <div className="flex items-center justify-between mt-2">
          <p className={`text-xs ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
            {new Date(message.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {message.tokens_used && !isUser && (
            <p className="text-xs text-gray-400">
              {message.tokens_used} tokens
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex justify-start"
    >
      <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
          <span className="text-sm text-gray-500">AICA esta pensando...</span>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function UnifiedChatInterface({
  userId,
  channel,
  sessionId: initialSessionId,
  title = 'AICA Chat',
  subtitle,
  placeholder = 'Digite sua mensagem...',
  welcomeMessage = 'Ola! Sou a AICA, sua assistente pessoal. Como posso ajudar?',
  modelTier = 'standard',
  showRateLimitStatus = true,
  showQuickActions = true,
  quickActions = DEFAULT_QUICK_ACTIONS,
  onSessionChange,
  onError,
  className = '',
}: UnifiedChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options: UseChatMessagesOptions = {
    channel,
    sessionId: initialSessionId,
    modelTier,
    onError,
    onRateLimited: (status) => {
      console.log('[UnifiedChatInterface] Rate limited:', status);
    },
  };

  const {
    messages,
    isLoading,
    isSending,
    error,
    sessionId,
    rateLimitStatus,
    sendMessage,
    startNewSession,
  } = useChatMessages(userId, options);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent of session changes
  useEffect(() => {
    onSessionChange?.(sessionId);
  }, [sessionId, onSessionChange]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput('');
    await sendMessage(content);
    inputRef.current?.focus();
  }, [input, isSending, sendMessage]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle quick action
  const handleQuickAction = async (action: QuickAction) => {
    if (isSending) return;
    await sendMessage(action.prompt);
  };

  // Display messages (include welcome message if empty)
  const displayMessages: ChatMessage[] = messages.length > 0
    ? messages
    : [
        {
          id: 'welcome',
          user_id: userId,
          session_id: sessionId,
          channel,
          role: 'assistant',
          content: welcomeMessage,
          created_at: new Date().toISOString(),
        },
      ];

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            onClick={startNewSession}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Nova conversa"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rate Limit Banner */}
      <AnimatePresence>
        {showRateLimitStatus && rateLimitStatus && !rateLimitStatus.allowed && (
          <RateLimitBanner status={rateLimitStatus} />
        )}
      </AnimatePresence>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <motion.div
            variants={ANIMATION_VARIANTS.container}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {displayMessages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLatest={index === displayMessages.length - 1}
                />
              ))}

              {isSending && <TypingIndicator />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      {showQuickActions && messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={isSending}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isSending}
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnifiedChatInterface;
