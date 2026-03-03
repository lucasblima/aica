import { useState, useCallback, useRef } from 'react';
import { usePodcastWorkspace } from '../context/PodcastWorkspaceContext';
import { supabase } from '@/services/supabaseClient';
import { getCachedSession } from '@/services/authCacheService';
import type { ResearchChatContext } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useResearchChat');

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** If this message suggests a card insertion */
  suggestedCard?: {
    title: string;
    text: string;
    targetSection: 'bio' | 'ficha' | 'noticias';
  };
}

export function useResearchChat() {
  const { state, actions } = usePodcastWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { dossier, suggestionCards, chatOpen } = state.research;
  const { guestName, theme } = state.setup;

  // Build system context for chat
  const buildContext = useCallback((): string => {
    const approvedCards = suggestionCards
      .filter(c => c.status === 'inserted')
      .map(c => c.title);
    const discardedCards = suggestionCards
      .filter(c => c.status === 'discarded')
      .map(c => c.title);

    return `Voce e Aica, assistente de pesquisa para podcast. Contexto:
- Convidado: ${guestName}
- Tema: ${theme || 'geral'}
- Biografia: ${dossier?.biography?.substring(0, 2000) || 'Nao disponivel'}
- Controversias: ${dossier?.controversies?.join('; ') || 'Nenhuma'}
- Cards aprovados: ${approvedCards.join(', ') || 'Nenhum'}
- Cards descartados: ${discardedCards.join(', ') || 'Nenhum'}

Ajude o entrevistador com pesquisa, perguntas e preparacao. Responda em portugues brasileiro.
Se sugerir informacao que deveria ser adicionada ao dossie, formate assim:
[SUGESTAO_DOSSIER: titulo | secao (bio/ficha/noticias) | texto completo]`;
  }, [guestName, theme, dossier, suggestionCards]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const { session } = await getCachedSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      // Call gemini-chat with research context
      // Legacy path expects: message, systemPrompt, history [{role, content}]
      const { data, error: fnError } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: content,
          systemPrompt: buildContext(),
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        log.error('gemini-chat error:', fnError);
        throw new Error(fnError.message || 'Erro na funcao gemini-chat');
      }

      const responseText = data?.response || data?.result?.response || data?.text || 'Sem resposta';

      // Parse any dossier suggestions from the response
      let suggestedCard: ChatMessage['suggestedCard'] | undefined;
      const suggestionMatch = responseText.match(
        /\[SUGESTAO_DOSSIER:\s*([^|]+)\|\s*([^|]+)\|\s*([^\]]+)\]/
      );
      if (suggestionMatch) {
        suggestedCard = {
          title: suggestionMatch[1].trim(),
          targetSection: suggestionMatch[2].trim() as 'bio' | 'ficha' | 'noticias',
          text: suggestionMatch[3].trim(),
        };
      }

      // Clean the response text (remove suggestion markers)
      const cleanText = responseText.replace(/\[SUGESTAO_DOSSIER:[^\]]+\]/g, '').trim();

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: cleanText,
        timestamp: new Date(),
        suggestedCard,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro no chat';
      setError(message);
      log.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, buildContext]);

  // Toggle chat panel
  const toggleChat = useCallback((open?: boolean) => {
    actions.toggleChat(open);
  }, [actions]);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    isOpen: chatOpen,
    sendMessage,
    toggleChat,
    clearChat,
  };
}
