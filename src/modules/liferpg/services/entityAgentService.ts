/**
 * Entity Agent Service
 *
 * Calls the entity-agent-chat Edge Function to chat with entity personas.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { isValidTone, type EntityAgentResponse } from '../types/liferpg';

const log = createNamespacedLogger('EntityAgentService');

export interface ChatMessage {
  role: 'user' | 'entity';
  content: string;
}

export interface EntityChatResult {
  success: boolean;
  data?: EntityAgentResponse;
  error?: string;
}

export class EntityAgentService {
  /**
   * Send a message to an entity persona's AI agent.
   */
  static async chat(
    personaId: string,
    message: string,
    history: ChatMessage[] = []
  ): Promise<EntityChatResult> {
    try {
      log.debug('Sending chat message', { personaId, messageLength: message.length });

      const { data, error } = await supabase.functions.invoke('entity-agent-chat', {
        body: {
          persona_id: personaId,
          message,
          history: history.map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            content: h.content,
          })),
        },
      });

      if (error) {
        log.error('Edge function error', { error });
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Unknown error' };
      }

      // Runtime validation of tone field
      const responseData = data.data as EntityAgentResponse;
      if (responseData && !isValidTone(responseData.tone)) {
        log.warn('Invalid tone from API, defaulting to neutral', { tone: responseData.tone });
        responseData.tone = 'neutral';
      }

      return { success: true, data: responseData };
    } catch (err) {
      log.error('Chat failed', { err });
      return { success: false, error: (err as Error).message };
    }
  }
}
