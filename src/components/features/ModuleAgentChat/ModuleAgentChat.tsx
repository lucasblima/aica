/**
 * ModuleAgentChat — Reusable AI Agent Chat for any AICA module
 *
 * Now uses useModuleChatSession for persistent chat history
 * stored in chat_sessions/chat_messages (Supabase).
 *
 * Each module configures its own display name, icon, and suggested prompts.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, X, Clock, Plus, ChevronLeft, Trash2 } from 'lucide-react';
import { useModuleChatSession } from '@/hooks/useModuleChatSession';
import { formatMarkdownToHTML } from '@/lib/formatMarkdown';
import type { AgentModule } from '@/lib/agents';

// =====================================================
// Types
// =====================================================

export interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon?: React.ReactNode;
}

export interface ModuleAgentChatProps {
  /** Which agent module to connect to */
  module: AgentModule;
  /** Display name shown in the header (e.g., "Atlas", "Finance") */
  displayName: string;
  /** Icon element shown next to the display name */
  icon?: React.ReactNode;
  /** Accent color class for the module (e.g., "text-amber-500", "text-emerald-500") */
  accentColor?: string;
  /** Background accent class (e.g., "bg-amber-500", "bg-emerald-500") */
  accentBg?: string;
  /** Suggested quick-action prompts in Portuguese */
  suggestedPrompts?: SuggestedPrompt[];
  /** Welcome message override */
  welcomeMessage?: string;
  /** Input placeholder override */
  placeholder?: string;
  /** Optional module-specific context data to send with each message */
  moduleData?: Record<string, any>;
  /** Whether the chat is open (controlled externally) */
  isOpen: boolean;
  /** Callback to close the chat */
  onClose: () => void;
}

// =====================================================
// Helper: relative date formatter
// =====================================================

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atras`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// =====================================================
// Component
// =====================================================

export const ModuleAgentChat: React.FC<ModuleAgentChatProps> = ({
  module,
  displayName,
  icon,
  accentColor = 'text-ceramic-accent',
  accentBg = 'bg-amber-500',
  suggestedPrompts = [],
  welcomeMessage,
  placeholder,
  moduleData,
  isOpen,
  onClose,
}) => {
  const {
    session,
    sessions,
    messages,
    isLoading,
    error,
    sendMessage,
    createNewSession,
    switchSession,
    archiveSession,
    showSessions,
    setShowSessions,
  } = useModuleChatSession(module);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isNewConversation = messages.length === 0;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return;
    setInput('');
    try {
      await sendMessage(content.trim(), moduleData);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const handleNewSession = () => {
    createNewSession();
  };

  if (!isOpen) return null;

  const defaultWelcome = `Olá! Sou o assistente de **${displayName}**. Como posso ajudar?`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div className="w-full max-w-md h-[70vh] max-h-[600px] bg-ceramic-base rounded-2xl shadow-ceramic-elevated border border-ceramic-border flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-ceramic-border bg-ceramic-base/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showSessions ? (
                <button
                  onClick={() => setShowSessions(false)}
                  className="p-1.5 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg hover:bg-ceramic-cool"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className={`w-9 h-9 rounded-full ${accentBg}/10 flex items-center justify-center`}>
                  {icon || <Sparkles className={`w-5 h-5 ${accentColor}`} />}
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-ceramic-text-primary">
                  {showSessions ? 'Histórico' : `Agente ${displayName}`}
                </h3>
                <p className="text-xs text-ceramic-text-secondary">
                  {showSessions
                    ? `${sessions.length} conversa${sessions.length !== 1 ? 's' : ''}`
                    : 'Assistente IA'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!showSessions && sessions.length > 0 && (
                <button
                  onClick={() => setShowSessions(true)}
                  className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg hover:bg-ceramic-cool"
                  title="Histórico de conversas"
                >
                  <Clock className="w-4 h-4" />
                </button>
              )}
              {!showSessions && (
                <button
                  onClick={handleNewSession}
                  className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg hover:bg-ceramic-cool"
                  title="Nova conversa"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg hover:bg-ceramic-cool"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Session History Sidebar */}
        {showSessions ? (
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-ceramic-text-secondary px-6">
                <Clock className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Nenhuma conversa salva</p>
              </div>
            ) : (
              <div className="py-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-ceramic-cool transition-colors ${
                      session?.id === s.id ? 'bg-ceramic-cool' : ''
                    }`}
                    onClick={() => switchSession(s.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ceramic-text-primary truncate">
                        {s.title || 'Conversa sem título'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-ceramic-text-secondary">
                          {formatRelativeDate(s.updated_at)}
                        </span>
                        {s.message_count != null && s.message_count > 0 && (
                          <span className="text-xs text-ceramic-text-secondary">
                            · {s.message_count} msg
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveSession(s.id);
                      }}
                      className="p-1.5 text-ceramic-text-secondary hover:text-ceramic-error opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-ceramic-cool"
                      title="Arquivar conversa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* New conversation button at bottom of sidebar */}
            <div className="px-4 py-3 border-t border-ceramic-border">
              <button
                onClick={() => {
                  handleNewSession();
                  setShowSessions(false);
                }}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 ${accentBg} text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity`}
              >
                <Plus className="w-4 h-4" />
                Nova conversa
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Welcome message */}
              {isNewConversation && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-3 ceramic-card rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className={`w-3.5 h-3.5 ${accentColor}`} />
                      <span className={`text-xs font-medium ${accentColor}`}>
                        {displayName}
                      </span>
                    </div>
                    <div
                      className="text-sm leading-relaxed text-ceramic-text-primary"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdownToHTML(welcomeMessage || defaultWelcome),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[85%] p-3 rounded-2xl
                      ${message.role === 'user'
                        ? `${accentBg} text-white rounded-br-md`
                        : 'ceramic-card rounded-bl-md'
                      }
                    `}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className={`w-3.5 h-3.5 ${accentColor}`} />
                        <span className={`text-xs font-medium ${accentColor}`}>
                          {displayName}
                        </span>
                      </div>
                    )}
                    <div
                      className={`text-sm leading-relaxed ${
                        message.role === 'user' ? 'text-white' : 'text-ceramic-text-primary'
                      }`}
                      dangerouslySetInnerHTML={{ __html: formatMarkdownToHTML(message.content) }}
                    />
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="ceramic-card p-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2">
                      <Loader2 className={`w-4 h-4 ${accentColor} animate-spin`} />
                      <span className="text-sm text-ceramic-text-secondary">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex justify-center">
                  <p className="text-xs text-ceramic-error bg-ceramic-error/10 px-3 py-1.5 rounded-full">
                    {error}
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested prompts — show only for new conversations */}
            {isNewConversation && suggestedPrompts.length > 0 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((sp, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedPrompt(sp.prompt)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 ceramic-card text-xs font-medium text-ceramic-text-primary hover:scale-[1.02] transition-transform disabled:opacity-50"
                    >
                      {sp.icon}
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 p-3 border-t border-ceramic-border">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder || `Pergunte ao ${displayName}...`}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2.5 ceramic-inset rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isLoading}
                  className={`p-2.5 ${accentBg} text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModuleAgentChat;
