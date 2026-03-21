/**
 * actions.ts — Server-side action executor for gemini-chat-v2.
 *
 * Executes DB operations directly. No dependency on Gemini function calling.
 * Each action is a simple function: params in → result out.
 */

export interface ActionResult {
  success: boolean
  message?: string
  error?: string
  data?: any
}

type ActionFn = (
  supabaseAdmin: any,
  userId: string,
  params: Record<string, any>,
) => Promise<ActionResult>

// ============================================================================
// ACTION: create_task
// ============================================================================

const createTask: ActionFn = async (supabaseAdmin, userId, params) => {
  const { title, description, is_urgent = false, is_important = false, due_date, priority } = params

  if (!title) return { success: false, error: 'Titulo da tarefa e obrigatorio.' }

  const { data: task, error } = await supabaseAdmin
    .from('work_items')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      status: 'todo',
      is_urgent,
      is_important,
      priority: priority || 'medium',
      due_date: due_date || null,
      archived: false,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, title, status, is_urgent, is_important, priority, due_date')
    .single()

  if (error) {
    console.error('[create_task] failed')
    return { success: false, error: 'Erro ao criar tarefa.' }
  }

  const quadrant = is_urgent && is_important ? 'Q1 (Fazer Agora)'
    : !is_urgent && is_important ? 'Q2 (Planejar)'
    : is_urgent && !is_important ? 'Q3 (Delegar)'
    : 'Q4 (Eliminar)'

  console.log(`[create_task] ok: ${task.id} → ${quadrant}`)
  return {
    success: true,
    message: `Tarefa "${task.title}" criada! Eisenhower: ${quadrant}.${due_date ? ' Prazo: ' + due_date + '.' : ''}`,
    data: task,
  }
}

// ============================================================================
// ACTION: create_event
// ============================================================================

const createEvent: ActionFn = async (supabaseAdmin, userId, params) => {
  const { title, start_time, end_time, description, location } = params

  if (!title || !start_time) return { success: false, error: 'Titulo e horario sao obrigatorios.' }

  const startDate = new Date(start_time)
  if (isNaN(startDate.getTime())) {
    return { success: false, error: 'Data de inicio invalida.' }
  }

  if (end_time) {
    const endDate = new Date(end_time)
    if (isNaN(endDate.getTime())) {
      return { success: false, error: 'Data de termino invalida.' }
    }
  }

  const defaultEnd = new Date(startDate.getTime() + 60 * 60 * 1000).toISOString()

  const { data: event, error } = await supabaseAdmin
    .from('calendar_events')
    .insert({
      user_id: userId,
      title,
      start_time,
      end_time: end_time || defaultEnd,
      description: description || null,
      location: location || null,
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, title, start_time, end_time, location')
    .single()

  if (error) {
    console.error('[create_event] failed')
    return { success: false, error: 'Erro ao criar evento.' }
  }

  const dateStr = new Date(event.start_time).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const timeStr = new Date(event.start_time).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

  console.log(`[create_event] ok: ${event.id}`)
  return {
    success: true,
    message: `Evento "${event.title}" agendado para ${dateStr} as ${timeStr}${event.location ? ' em ' + event.location : ''}.`,
    data: event,
  }
}

// ============================================================================
// ACTION: create_moment
// ============================================================================

const createMoment: ActionFn = async (supabaseAdmin, userId, params) => {
  const { content, emotion = 'neutral', tags } = params

  if (!content) return { success: false, error: 'Conteudo do momento e obrigatorio.' }

  const { data: moment, error } = await supabaseAdmin
    .from('moments')
    .insert({
      user_id: userId,
      content,
      emotion,
      type: 'text',
      tags: tags || [],
      created_at: new Date().toISOString(),
    })
    .select('id, content, emotion, created_at')
    .single()

  if (error) {
    console.error('[create_moment] failed')
    return { success: false, error: 'Erro ao registrar momento.' }
  }

  console.log('[create_moment] ok')
  return {
    success: true,
    message: `Momento registrado com emocao: ${emotion}.`,
    data: moment,
  }
}

// ============================================================================
// ACTION: complete_task
// ============================================================================

const completeTask: ActionFn = async (supabaseAdmin, userId, params) => {
  const { task_id } = params

  if (!task_id) return { success: false, error: 'ID da tarefa e obrigatorio.' }

  const { data: existing } = await supabaseAdmin
    .from('work_items')
    .select('id, title, status')
    .eq('id', task_id)
    .eq('user_id', userId)
    .single()

  if (!existing) return { success: false, error: 'Tarefa nao encontrada.' }
  if (existing.status === 'completed') return { success: true, message: `"${existing.title}" ja estava concluida.` }

  const { error } = await supabaseAdmin
    .from('work_items')
    .update({ status: 'completed', is_completed: true, completed_at: new Date().toISOString() })
    .eq('id', task_id)
    .eq('user_id', userId)

  if (error) return { success: false, error: 'Erro ao concluir tarefa.' }

  console.log(`[complete_task] ok: ${task_id}`)
  return { success: true, message: `Tarefa "${existing.title}" concluida!` }
}

// ============================================================================
// DISPATCHER
// ============================================================================

const ACTIONS: Record<string, ActionFn> = {
  create_task: createTask,
  create_event: createEvent,
  create_moment: createMoment,
  complete_task: completeTask,
}

export async function executeAction(
  supabaseAdmin: any,
  userId: string,
  action: string,
  params: Record<string, any>,
): Promise<ActionResult> {
  const fn = ACTIONS[action]
  if (!fn) {
    console.warn(`[action] Unknown action: ${action}`)
    return { success: false, error: `Acao desconhecida: ${action}` }
  }
  try {
    return await fn(supabaseAdmin, userId, params)
  } catch (error) {
    console.error(`[action] ${action} threw:`, (error as Error).message)
    return { success: false, error: 'Erro inesperado ao executar acao.' }
  }
}
