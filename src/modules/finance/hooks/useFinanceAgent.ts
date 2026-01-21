/**
 * useFinanceAgent Hook
 *
 * Manages finance agent chat state and interactions.
 */

import { useState, useCallback, useEffect } from 'react';
import { financeAgentService } from '../services/financeAgentService';
import type { AgentContext, FinanceAgentMessage, DateRange } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useFinanceAgent');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseFinanceAgentReturn {
  messages: Message[];
  context: AgentContext | null;
  loading: boolean;
  contextLoading: boolean;
  error: string | null;
  sessionId: string;
  sendMessage: (content: string) => Promise<void>;
  loadContext: (dateRange?: DateRange) => Promise<void>;
  startNewSession: () => void;
  analyzeSpending: () => Promise<void>;
  suggestSavings: () => Promise<void>;
  identifyAnomalies: () => Promise<void>;
}

export function useFinanceAgent(userId: string): UseFinanceAgentReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<AgentContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());

  // Load context on mount
  useEffect(() => {
    loadContext();
  }, [userId]);

  const loadContext = useCallback(
    async (dateRange?: DateRange) => {
      if (!userId) return;

      try {
        setContextLoading(true);
        setError(null);
        const ctx = await financeAgentService.buildContext(userId, dateRange);
        setContext(ctx);
      } catch (err) {
        console.error('Error loading context:', err);
        setError('Erro ao carregar dados financeiros');
      } finally {
        setContextLoading(false);
      }
    },
    [userId]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !context || loading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      try {
        const history = messages.map((m) => ({
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
      } catch (err) {
        console.error('Chat error:', err);
        setError('Erro ao enviar mensagem');

        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [userId, sessionId, context, messages, loading]
  );

  const startNewSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setError(null);
  }, []);

  const analyzeSpending = useCallback(async () => {
    if (!context) return;

    setLoading(true);
    try {
      const response = await financeAgentService.analyzeSpending(userId, context);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: 'Analise meus gastos',
          timestamp: new Date(),
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Analyze spending error:', err);
      setError('Erro ao analisar gastos');
    } finally {
      setLoading(false);
    }
  }, [userId, context]);

  const suggestSavings = useCallback(async () => {
    if (!context) return;

    setLoading(true);
    try {
      const response = await financeAgentService.suggestSavings(userId, context);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: 'Sugira formas de economizar',
          timestamp: new Date(),
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Suggest savings error:', err);
      setError('Erro ao sugerir economia');
    } finally {
      setLoading(false);
    }
  }, [userId, context]);

  const identifyAnomalies = useCallback(async () => {
    if (!context) return;

    setLoading(true);
    try {
      const response = await financeAgentService.identifyAnomalies(userId, context);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: 'Identifique anomalias',
          timestamp: new Date(),
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Identify anomalies error:', err);
      setError('Erro ao identificar anomalias');
    } finally {
      setLoading(false);
    }
  }, [userId, context]);

  return {
    messages,
    context,
    loading,
    contextLoading,
    error,
    sessionId,
    sendMessage,
    loadContext,
    startNewSession,
    analyzeSpending,
    suggestSavings,
    identifyAnomalies,
  };
}

export default useFinanceAgent;
