/**
 * ModuleAgentChat — Reusable AI Agent Chat for any AICA module
 *
 * Uses the centralized useAgentChat hook which routes through
 * gemini-chat Edge Function via GeminiClient.
 *
 * Each module configures its own display name, icon, and suggested prompts.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, X } from 'lucide-react';
import { useAgentChat } from '@/hooks/useAgentChat';
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
    sendMessage: sendAgentMessage,
    isLoading,
    messages,
    clearMessages,
  } = useAgentChat(module);

  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Hide welcome after first message
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    }
  }, [messages.length]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return;
    setInput('');
    try {
      await sendAgentMessage(content.trim(), undefined, moduleData);
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
    clearMessages();
    setShowWelcome(true);
  };

  if (!isOpen) return null;

  const defaultWelcome = `Ola! Sou o assistente de **${displayName}**. Como posso ajudar?`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div className="w-full max-w-md h-[70vh] max-h-[600px] bg-ceramic-base rounded-2xl shadow-ceramic-elevated border border-ceramic-border flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-ceramic-border bg-ceramic-base/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${accentBg}/10 flex items-center justify-center`}>
                {icon || <Sparkles className={`w-5 h-5 ${accentColor}`} />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ceramic-text-primary">
                  Agente {displayName}
                </h3>
                <p className="text-xs text-ceramic-text-secondary">Assistente IA</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleNewSession}
                  className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg hover:bg-ceramic-cool"
                  title="Nova conversa"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Welcome message */}
          {showWelcome && messages.length === 0 && (
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
          {messages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
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

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts — show only before first user message */}
        {showWelcome && messages.length === 0 && suggestedPrompts.length > 0 && (
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
      </div>
    </div>
  );
};

export default ModuleAgentChat;
