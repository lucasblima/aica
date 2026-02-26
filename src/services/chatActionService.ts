/**
 * Chat Action Service
 *
 * Executes deterministic chat actions (complete task, create moment, etc.)
 * by calling the gemini-chat Edge Function with action_type execute_chat_action.
 *
 * Supports batch task creation via 'create_tasks' action type,
 * which executes multiple 'create_task' calls in parallel.
 */

import { GeminiClient } from '@/lib/gemini';
import type { ChatAction } from '@/types/chatActions';

export async function executeChatAction(
  action: ChatAction
): Promise<{ success: boolean; error?: string; results?: unknown[] }> {
  const client = GeminiClient.getInstance();

  // Batch task creation — execute each individually
  if (action.type === 'create_tasks' && Array.isArray(action.params.tasks)) {
    const tasks = action.params.tasks as unknown as Array<Record<string, string>>;
    const results = await Promise.allSettled(
      tasks.map(task =>
        client.call({
          action: 'execute_chat_action',
          payload: {
            action_type: 'create_task',
            params: task,
          },
        })
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: failed === 0,
      results: results.map(r =>
        r.status === 'fulfilled' ? r.value : { error: (r as PromiseRejectedResult).reason?.message }
      ),
      error: failed > 0 ? `${succeeded} criadas, ${failed} falharam` : undefined,
    };
  }

  const response = await client.call({
    action: 'execute_chat_action',
    payload: {
      action_type: action.type,
      params: action.params,
    },
  });
  return response?.result || { success: false, error: 'No response' };
}
