/**
 * AIChatPreview — AI demo chat for Coming Soon modules
 * CS-003: AI Chat Preview
 *
 * Features:
 * - Chat bubbles with module avatar
 * - Suggested question chips
 * - "X mensagens restantes" counter
 * - Waitlist CTA at end of conversation
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { ModuleRegistryEntry } from '@/hooks/useModuleRegistry';
import { WaitlistButton } from './WaitlistButton';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatPreviewProps {
  module: ModuleRegistryEntry;
  isOnWaitlist: boolean;
  onJoinWaitlist: () => Promise<boolean>;
  onLeaveWaitlist: () => Promise<boolean>;
  onClose: () => void;
}

export function AIChatPreview({
  module,
  isOnWaitlist,
  onJoinWaitlist,
  onLeaveWaitlist,
  onClose,
}: AIChatPreviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState(10);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const colorPrimary = module.color_primary || '#F59E0B';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load initial suggestions
  useEffect(() => {
    sendMessage('Ola! O que voce pode fazer?', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (text: string, isInitial = false) => {
    if (!text.trim() || isLoading || limitReached) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];

    if (!isInitial) {
      setMessages(updatedMessages);
    }
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('module-preview-chat', {
        body: {
          module_id: module.id,
          message: text.trim(),
          chat_history: isInitial ? [] : messages,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
      };

      setMessages((prev) => {
        const base = isInitial ? [userMessage] : prev;
        return [...base, assistantMessage];
      });
      setRemaining(data.remaining_messages ?? 0);
      setSuggestions(data.suggested_questions ?? []);
      setLimitReached(data.limit_reached ?? false);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        className="w-full max-w-lg bg-ceramic-base rounded-2xl shadow-ceramic-elevated overflow-hidden flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 text-white"
          style={{ backgroundColor: colorPrimary }}
        >
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">
            {module.icon_emoji || '🤖'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate">{module.name} Preview</h3>
            <p className="text-xs opacity-80">Demonstracao interativa com IA</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-ceramic-text-primary text-white rounded-br-md'
                      : 'bg-ceramic-cool text-ceramic-text-primary rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3" style={{ color: colorPrimary }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colorPrimary }}>
                        {module.name}
                      </span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-ceramic-text-secondary text-sm"
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: colorPrimary }} />
              <span>Pensando...</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {suggestions.length > 0 && !isLoading && !limitReached && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-cool-hover transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Limit reached — Waitlist CTA */}
        {limitReached && (
          <div className="px-4 py-3 border-t border-ceramic-border bg-ceramic-cool/50 flex flex-col items-center gap-2">
            <p className="text-xs text-ceramic-text-secondary text-center">
              Gostou da demo? Entre na lista de espera!
            </p>
            <WaitlistButton
              isOnWaitlist={isOnWaitlist}
              onJoin={onJoinWaitlist}
              onLeave={onLeaveWaitlist}
              colorPrimary={colorPrimary}
            />
          </div>
        )}

        {/* Input bar */}
        {!limitReached && (
          <form onSubmit={handleSubmit} className="border-t border-ceramic-border p-3 flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte algo..."
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-xl bg-ceramic-cool text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 outline-none focus:ring-2 transition-shadow"
                style={{ '--tw-ring-color': `${colorPrimary}40` } as React.CSSProperties}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              style={{ backgroundColor: colorPrimary }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Remaining counter */}
        {!limitReached && (
          <div className="px-4 pb-2 flex items-center justify-center gap-1.5">
            <MessageCircle className="w-3 h-3 text-ceramic-text-secondary" />
            <span className="text-[11px] text-ceramic-text-secondary">
              {remaining} {remaining === 1 ? 'mensagem restante' : 'mensagens restantes'}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default AIChatPreview;
