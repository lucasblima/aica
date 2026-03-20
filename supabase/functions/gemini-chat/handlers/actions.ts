// handlers/actions.ts — Chat action execution (permanent)
// Intent classification logic lives in _shared/intent-classifier.ts
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { classifyIntent } from '../../_shared/intent-classifier.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Re-export for backward compatibility (index.ts imports from here)
export const handleClassifyIntent = classifyIntent

// ============================================================================
// EXECUTE CHAT ACTION HANDLER
// ============================================================================

const ALLOWED_ACTION_TYPES = ['complete_task', 'start_task', 'update_priority', 'reschedule_task', 'create_moment'] as const

export async function handleExecuteChatAction(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: { action_type: string; params: Record<string, any> }
): Promise<{ success: boolean; action_type: string; result?: any; error?: string }> {
  const { action_type, params } = payload

  if (!action_type || !ALLOWED_ACTION_TYPES.includes(action_type as any)) {
    return { success: false, action_type: action_type || 'unknown', error: `Tipo de acao invalido: ${action_type}` }
  }

  if (!params || typeof params !== 'object') {
    return { success: false, action_type, error: 'Parametros invalidos' }
  }

  try {
    switch (action_type) {
      case 'complete_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, status')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'start_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, status')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'update_priority': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
        if (params.is_urgent !== undefined) updateData.is_urgent = Boolean(params.is_urgent)
        if (params.is_important !== undefined) updateData.is_important = Boolean(params.is_important)
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update(updateData)
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, is_urgent, is_important')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'reschedule_task': {
        if (!params.task_id) return { success: false, action_type, error: 'task_id e obrigatorio' }
        if (!params.new_date) return { success: false, action_type, error: 'new_date e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('work_items')
          .update({ due_date: params.new_date, updated_at: new Date().toISOString() })
          .eq('id', params.task_id)
          .eq('user_id', userId)
          .select('id, title, due_date')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      case 'create_moment': {
        if (!params.content) return { success: false, action_type, error: 'content e obrigatorio' }
        const { data, error } = await supabaseAdmin
          .from('moments')
          .insert({
            user_id: userId,
            content: params.content,
            emotion: params.emotion || 'neutral',
            type: params.type || 'text',
          })
          .select('id, content, emotion')
          .single()
        if (error) return { success: false, action_type, error: error.message }
        return { success: true, action_type, result: data }
      }

      default:
        return { success: false, action_type, error: `Tipo de acao nao implementado: ${action_type}` }
    }
  } catch (error) {
    console.error(`[execute_chat_action] Error executing ${action_type}:`, (error as Error).message)
    return { success: false, action_type, error: (error as Error).message }
  }
}
