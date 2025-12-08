/**
 * Agent Chat Component
 *
 * Conversational interface for the Finance AI Agent.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, TrendingDown, PieChart, AlertTriangle, Loader2 } from 'lucide-react';
import { financeAgentService } from '../../services/financeAgentService';
import type { AgentContext } from '../../types';

// =====================================================
// Types
// =====================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  userId: string;
  context: AgentContext;
  sessionId?: string;
  onNewSession?: (sessionId: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => Promise<string>;
}

// =====================================================
// Component
// =====================================================

export const AgentChat: React.FC<AgentChatProps> = ({
  userId,
  context,
  sessionId: initialSessionId,
  onNewSession,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId || crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'analyze',
      label: 'Analisar gastos',
      icon: <PieChart className="w-4 h-4" />,
      action: () => financeAgentService.analyzeSpending(userId, context),
    },
    {
      id: 'savings',
      label: 'Sugerir economia',
      icon: <TrendingDown className="w-4 h-4" />,
      action: () => financeAgentService.suggestSavings(userId, context),
    },
    {
      id: 'anomalies',
      label: 'Identificar anomalias',
      icon: <AlertTriangle className="w-4 h-4" />,
      action: () => financeAgentService.identifyAnomalies(userId, context),
    },
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load session history
  useEffect(() => {
    if (initialSessionId) {
      loadHistory();
    } else {
      // Add welcome message for new sessions
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Ola! Sou o **Aica Finance**, seu assistente financeiro pessoal.

Tenho acesso aos seus dados financeiros e posso ajudar com:
- Analise de gastos e tendencias
- Sugestoes de economia
- Identificacao de anomalias
- Planejamento de orcamento

Como posso ajudar hoje?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [initialSessionId]);

  const loadHistory = async () => {
    if (!initialSessionId) return;

    try {
      const history = await financeAgentService.getSessionHistory(userId, initialSessionId);
      setMessages(
        history.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }))
      );
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get conversation history for context
      const history = messages
        .filter((m) => m.role !== 'assistant' || !m.content.includes('Sou o **Aica Finance**'))
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await financeAgentService.chat(
        userId,
        sessionId,
        content.trim(),
        history,
        context
      );

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onNewSession?.(sessionId);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: action.label,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await action.action();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Quick action error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatContent = (content: string) => {
    // Safety check for non-string content
    if (typeof content !== 'string') {
      console.warn('AgentChat: received non-string content:', content);
      return '';
    }

    // Simple markdown rendering
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] p-4 rounded-2xl
                ${message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'ceramic-card rounded-bl-md'
                }
              `}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600">Aica Finance</span>
                </div>
              )}
              <div
                className={`text-sm leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-ceramic-text-primary'
                  }`}
                dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
              />
              <p
                className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-ceramic-text-secondary'
                  }`}
              >
                {message.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="ceramic-card p-4 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                <span className="text-sm text-ceramic-text-secondary">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 ceramic-card text-sm font-medium text-ceramic-text-primary hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta sobre financas..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 ceramic-inset rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
