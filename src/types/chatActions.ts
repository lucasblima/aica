/**
 * Chat Action Buttons — Types
 *
 * Deterministic action suggestions generated server-side from
 * keyword matching on user message + context data.
 * Max 3 buttons per message.
 */

export type ChatActionType =
  | 'complete_task'
  | 'start_task'
  | 'update_priority'
  | 'reschedule_task'
  | 'create_moment'
  | 'create_task'
  | 'create_tasks';

export interface ChatAction {
  /** Unique action ID (e.g., "complete_task_abc123") */
  id: string;
  /** Action type for the execute handler */
  type: ChatActionType;
  /** Button label in Portuguese (e.g., "Concluir tarefa") */
  label: string;
  /** Lucide icon name (e.g., "CheckCircle", "Play", "Calendar") */
  icon: string;
  /** Source module for the action */
  module: 'atlas' | 'journey' | 'agenda';
  /** Parameters passed to execute_chat_action */
  params: Record<string, string | number | boolean>;
}

export type ChatActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ChatActionState {
  action: ChatAction;
  status: ChatActionStatus;
  errorMessage?: string;
}
