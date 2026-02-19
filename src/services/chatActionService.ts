/**
 * Chat Action Service
 *
 * Executes deterministic chat actions (complete task, create moment, etc.)
 * by calling the gemini-chat Edge Function with action_type execute_chat_action.
 */

import { GeminiClient } from '@/lib/gemini';
import type { ChatAction } from '@/types/chatActions';

export async function executeChatAction(
  action: ChatAction
): Promise<{ success: boolean; error?: string }> {
  const client = GeminiClient.getInstance();
  const response = await client.call({
    action: 'execute_chat_action',
    payload: {
      action_type: action.type,
      params: action.params,
    },
  });
  return response?.result || { success: false, error: 'No response' };
}
