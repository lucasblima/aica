// ==========================================================================
// context-builder.ts — User context and suggested actions for chat agents
// Extracted from gemini-chat/index.ts
// ==========================================================================

import type { UserContextResult, ChatAction } from './gemini-types.ts'

// ============================================================================
// BUILD USER CONTEXT (async, fetches data from Supabase)
// ============================================================================

export async function buildUserContext(supabaseAdmin: any, userId: string, module: string): Promise<UserContextResult> {
  const contextParts: string[] = []
  const rawData: UserContextResult['rawData'] = { tasks: [], moments: [], transactions: [], events: [] }
  console.log(`[buildUserContext] Starting for userId=${userId}, module=${module}`)

  try {
    // Always fetch basic stats for coordinator context
    if (module === 'atlas' || module === 'coordinator') {
      const { data: tasks, error: tasksError } = await supabaseAdmin
        .from('work_items')
        .select('id, title, status, priority, is_urgent, is_important, due_date, scheduled_time, task_type, checklist')
        .eq('user_id', userId)
        .neq('status', 'done')
        .eq('archived', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20)

      console.log(`[buildUserContext] tasks query: count=${tasks?.length || 0}, error=${tasksError?.message || 'none'}`)
      if (tasks?.length) {
        rawData.tasks = tasks
        contextParts.push(`### Tarefas Abertas (${tasks.length})`)
        tasks.forEach(t => {
          const urgImp = [t.is_urgent && 'URGENTE', t.is_important && 'IMPORTANTE'].filter(Boolean).join(', ')
          const due = t.due_date ? ` | Prazo: ${t.due_date}` : ''
          const time = t.scheduled_time ? ` às ${t.scheduled_time}` : ''
          const type = t.task_type && t.task_type !== 'task' ? ` [${t.task_type}]` : ''
          contextParts.push(`- ${t.title}${type} (${t.status}${urgImp ? ' | ' + urgImp : ''}${due}${time})`)
        })
      } else {
        contextParts.push('### Tarefas: Nenhuma tarefa aberta')
      }
    }

    if (module === 'journey' || module === 'coordinator') {
      const { data: moments } = await supabaseAdmin
        .from('moments')
        .select('content, emotion, created_at, tags, sentiment_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(7)

      if (moments?.length) {
        rawData.moments = moments
        contextParts.push(`\n### Momentos Recentes (${moments.length})`)
        moments.forEach(m => {
          const date = new Date(m.created_at).toLocaleDateString('pt-BR')
          const sentiment = m.sentiment_data?.sentiment || 'não analisado'
          contextParts.push(`- [${date}] ${m.emotion || '?'} | ${m.content?.substring(0, 100)}... (${sentiment})`)
        })
      }
    }

    if (module === 'finance' || module === 'coordinator') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: transactions } = await supabaseAdmin
        .from('finance_transactions')
        .select('description, amount, type, category, date')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.split('T')[0])
        .order('date', { ascending: false })
        .limit(30)

      if (transactions?.length) {
        rawData.transactions = transactions
        const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)
        const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
        contextParts.push(`\n### Finanças (últimos 30 dias)`)
        contextParts.push(`- Receitas: R$ ${income.toFixed(2)}`)
        contextParts.push(`- Despesas: R$ ${expense.toFixed(2)}`)
        contextParts.push(`- Saldo período: R$ ${(income - expense).toFixed(2)}`)
        contextParts.push(`- ${transactions.length} transações`)

        // Top 5 most recent for detail
        if (module === 'finance') {
          contextParts.push(`\nÚltimas transações:`)
          transactions.slice(0, 10).forEach(t => {
            contextParts.push(`- ${t.date}: ${t.description} (R$ ${t.amount.toFixed(2)}, ${t.category || 'sem categoria'})`)
          })
        }
      }
    }

    if (module === 'connections') {
      const { data: spaces } = await supabaseAdmin
        .from('connection_spaces')
        .select('id, name, archetype, description')
        .eq('user_id', userId)
        .limit(10)

      if (spaces?.length) {
        contextParts.push(`\n### Espaços de Conexão (${spaces.length})`)
        for (const space of spaces) {
          const { count } = await supabaseAdmin
            .from('connection_members')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', space.id)
          contextParts.push(`- ${space.name} (${space.archetype}) — ${count || 0} membros`)
        }
      }
    }

    if (module === 'studio') {
      const { data: shows } = await supabaseAdmin
        .from('podcast_shows')
        .select('id, name, description')
        .eq('user_id', userId)
        .limit(5)

      if (shows?.length) {
        contextParts.push(`\n### Podcasts (${shows.length})`)
        for (const show of shows) {
          const { data: episodes } = await supabaseAdmin
            .from('podcast_episodes')
            .select('title, status, guest_name')
            .eq('show_id', show.id)
            .order('created_at', { ascending: false })
            .limit(5)

          contextParts.push(`- ${show.name}: ${episodes?.length || 0} episódios recentes`)
          episodes?.forEach(ep => {
            contextParts.push(`  · ${ep.title} (${ep.status})${ep.guest_name ? ' — Convidado: ' + ep.guest_name : ''}`)
          })
        }
      }
    }

    if (module === 'flux') {
      const { data: athletes } = await supabaseAdmin
        .from('athletes')
        .select('id, name, modality, status')
        .eq('coach_id', userId)
        .eq('status', 'active')
        .limit(10)

      if (athletes?.length) {
        contextParts.push(`\n### Atletas Ativos (${athletes.length})`)
        athletes.forEach(a => {
          contextParts.push(`- ${a.name} (${a.modality || 'geral'})`)
        })

        // Get active microcycles
        const athleteIds = athletes.map(a => a.id)
        const { data: microcycles } = await supabaseAdmin
          .from('microcycles')
          .select('athlete_id, name, start_date, end_date, status')
          .in('athlete_id', athleteIds)
          .eq('status', 'active')
          .limit(10)

        if (microcycles?.length) {
          contextParts.push(`\nMicrociclos Ativos:`)
          microcycles.forEach(m => {
            const athlete = athletes.find(a => a.id === m.athlete_id)
            contextParts.push(`- ${athlete?.name}: ${m.name} (${m.start_date} a ${m.end_date})`)
          })
        }
      }

      // Exercise Library RAG: load coach's workout templates for AI context
      const { data: templates } = await supabaseAdmin
        .from('workout_templates')
        .select('name, category, modality, intensity, duration, description, level_range, rpe, tags')
        .eq('user_id', userId)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(20)

      if (templates?.length) {
        contextParts.push(`\n### Biblioteca de Exercícios do Coach (${templates.length} templates)`)
        contextParts.push(`Use estes templates para recomendar exercícios personalizados:`)
        templates.forEach((t: any) => {
          const desc = t.description ? ` — ${t.description.substring(0, 60)}` : ''
          const levels = t.level_range?.length ? ` | Níveis: ${t.level_range.join(', ')}` : ''
          const rpe = t.rpe ? ` | RPE ${t.rpe}` : ''
          const tags = t.tags?.length ? ` [${t.tags.join(', ')}]` : ''
          contextParts.push(`- ${t.name} (${t.category}/${t.modality}, ${t.intensity}, ${t.duration}min${rpe})${levels}${desc}${tags}`)
        })
      }
    }

    if (module === 'agenda' || module === 'coordinator') {
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: events } = await supabaseAdmin
        .from('calendar_events')
        .select('title, start_time, end_time, location, description')
        .eq('user_id', userId)
        .gte('start_time', today)
        .lte('start_time', nextWeek)
        .order('start_time', { ascending: true })
        .limit(15)

      if (events?.length) {
        rawData.events = events
        contextParts.push(`\n### Agenda (próximos 7 dias — ${events.length} eventos)`)
        events.forEach(e => {
          const date = new Date(e.start_time).toLocaleDateString('pt-BR')
          const time = new Date(e.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          contextParts.push(`- [${date} ${time}] ${e.title}${e.location ? ' @ ' + e.location : ''}`)
        })
      }
    }

    // Fetch Life Council insights for coordinator and journey agents
    if (module === 'coordinator' || module === 'journey') {
      const { data: councilInsights } = await supabaseAdmin
        .from('daily_council_insights')
        .select('insight_type, content, action_items, overall_status, headline, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (councilInsights?.length) {
        contextParts.push(`\n### Insights do Life Council (últimos ${councilInsights.length})`)
        councilInsights.forEach((insight: any) => {
          const date = new Date(insight.created_at).toLocaleDateString('pt-BR')
          const status = insight.overall_status ? ` [${insight.overall_status}]` : ''
          const headline = insight.headline ? ` — ${insight.headline}` : ''
          contextParts.push(`- [${date}]${status}${headline} ${insight.insight_type}: ${typeof insight.content === 'string' ? insight.content.substring(0, 200) : JSON.stringify(insight.content).substring(0, 200)}`)
          if (insight.action_items?.length) {
            insight.action_items.slice(0, 2).forEach((item: string) => {
              contextParts.push(`  · Ação: ${item}`)
            })
          }
        })
      }
    }

    // Fetch user behavioral patterns for personalized responses (all modules)
    {
      const { data: patterns } = await supabaseAdmin
        .from('user_patterns')
        .select('pattern_type, description, confidence, evidence_count, last_observed')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('confidence', 0.5)
        .order('confidence', { ascending: false })
        .limit(5)

      if (patterns?.length) {
        contextParts.push(`\n### Padrões Comportamentais do Usuário (${patterns.length})`)
        contextParts.push(`Use estes padrões para personalizar suas respostas:`)
        patterns.forEach((p: any) => {
          const lastSeen = p.last_observed ? new Date(p.last_observed).toLocaleDateString('pt-BR') : 'N/A'
          contextParts.push(`- [${p.pattern_type}] ${p.description} (confiança: ${(p.confidence * 100).toFixed(0)}%, evidências: ${p.evidence_count || 0}, visto: ${lastSeen})`)
        })
      }
    }

    // Fetch weekly summary for coordinator and journey
    if (module === 'coordinator' || module === 'journey') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: weeklySummaries } = await supabaseAdmin
        .from('weekly_summaries')
        .select('summary_data, week_start, week_end, created_at')
        .eq('user_id', userId)
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(1)

      if (weeklySummaries?.length) {
        const ws = weeklySummaries[0]
        const data = typeof ws.summary_data === 'string' ? JSON.parse(ws.summary_data) : ws.summary_data
        if (data) {
          contextParts.push(`\n### Resumo Semanal (${ws.week_start || ''} a ${ws.week_end || ''})`)
          if (data.emotionalTrend) contextParts.push(`- Tendência emocional: ${data.emotionalTrend}`)
          if (data.dominantEmotions?.length) contextParts.push(`- Emoções dominantes: ${data.dominantEmotions.join(', ')}`)
          if (data.insights?.length) {
            data.insights.slice(0, 3).forEach((insight: string) => {
              contextParts.push(`- Insight: ${insight}`)
            })
          }
          if (data.suggestedFocus) contextParts.push(`- Foco sugerido: ${data.suggestedFocus}`)
        }
      }
    }

    // Fetch recent chat conversation summaries for cross-session memory
    {
      const { data: chatSummaries } = await supabaseAdmin
        .from('chat_conversation_summaries')
        .select('summary, key_topics, key_decisions, emotional_themes, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (chatSummaries?.length) {
        contextParts.push(`\n## Conversas Anteriores`)
        chatSummaries.forEach((cs: any, idx: number) => {
          const date = new Date(cs.created_at).toLocaleDateString('pt-BR')
          contextParts.push(`### Sessão ${idx + 1} (${date}): ${cs.summary}`)
          if (cs.key_topics?.length) {
            contextParts.push(`Tópicos: ${cs.key_topics.join(', ')}`)
          }
          if (cs.key_decisions?.length) {
            contextParts.push(`Decisões: ${cs.key_decisions.join(', ')}`)
          }
          if (cs.emotional_themes?.length) {
            contextParts.push(`Temas emocionais: ${cs.emotional_themes.join(', ')}`)
          }
        })
      }
    }

  } catch (error) {
    console.warn('[buildUserContext] Partial failure:', (error as Error).message)
    contextParts.push('\n(Alguns dados não puderam ser carregados)')
  }

  const contextString = contextParts.length === 0 ? '' : contextParts.join('\n')
  return { contextString, rawData }
}

// ============================================================================
// SUGGESTED QUESTIONS GENERATOR (pure function, no async)
// Moved from handlers/chat.ts to eliminate cross-handler imports
// ============================================================================

export function generateSuggestedQuestions(
  _userMessage: string,
  _aiResponse: string,
  module: string,
  rawData: UserContextResult['rawData']
): string[] {
  const questions: string[] = []

  // Context-aware suggestions based on module and data
  if (module === 'atlas' && rawData.tasks.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const overdue = rawData.tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done')
    if (overdue.length > 0) questions.push(`Tenho ${overdue.length} tarefa(s) atrasada(s). Pode me ajudar a priorizar?`)
  }
  if (module === 'journey') {
    questions.push('Como estou me sentindo em relação à semana passada?')
  }
  if (module === 'finance' && rawData.transactions.length > 0) {
    questions.push('Qual foi meu maior gasto este mês?')
  }
  if (module === 'coordinator') {
    if (rawData.tasks.length > 0) questions.push('Quais são minhas prioridades para hoje?')
    if (rawData.moments.length > 0) questions.push('Quais padrões você nota nas minhas reflexões recentes?')
    if (rawData.events.length > 0) questions.push('O que tenho na agenda para amanhã?')
  }

  // Always limit to 3 suggestions
  return questions.slice(0, 3)
}

// ============================================================================
// SUGGESTED ACTIONS GENERATOR (pure function, no async)
// ============================================================================

export function generateSuggestedActions(message: string, rawData: UserContextResult['rawData']): ChatAction[] {
  const actions: ChatAction[] = []
  const msg = message.toLowerCase()
  const today = new Date().toISOString().split('T')[0]

  // Keyword groups
  const completeKeywords = ['concluir', 'terminar', 'feita', 'pronta', 'finalizar', 'completar', 'terminei', 'fiz', 'concluida', 'concluido']
  const startKeywords = ['comecar', 'iniciar', 'start', 'comecei', 'vou fazer', 'vou comecar']
  const priorityKeywords = ['prioridade', 'urgente', 'importante', 'priorizar', 'urgencia']
  const rescheduleKeywords = ['reagendar', 'adiar', 'mudar data', 'postergar', 'remarcar']
  const momentKeywords = ['momento', 'reflexao', 'registrar', 'sentimento', 'diario', 'como me sinto', 'estou sentindo']

  // Find overdue tasks
  const overdueTasks = rawData.tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done')

  // Complete task
  if (completeKeywords.some(k => msg.includes(k)) && rawData.tasks.length > 0) {
    // Try to find a task matching keywords from the message
    const openTasks = rawData.tasks.filter(t => t.status !== 'done')
    const matchedTask = openTasks.find(t => {
      const titleLower = t.title.toLowerCase()
      // Check if any word from the message (4+ chars) matches part of the task title
      const msgWords = msg.split(/\s+/).filter(w => w.length >= 4)
      return msgWords.some(w => titleLower.includes(w))
    }) || openTasks[0]

    if (matchedTask) {
      actions.push({
        id: `complete_task_${matchedTask.id}`,
        type: 'complete_task',
        label: `Concluir "${matchedTask.title.substring(0, 30)}${matchedTask.title.length > 30 ? '...' : ''}"`,
        icon: 'CheckCircle',
        module: 'atlas',
        params: { task_id: matchedTask.id },
      })
    }
  }

  // Start task
  if (startKeywords.some(k => msg.includes(k)) && rawData.tasks.length > 0) {
    const todoTasks = rawData.tasks.filter(t => t.status === 'todo' || t.status === 'backlog')
    const matchedTask = todoTasks.find(t => {
      const titleLower = t.title.toLowerCase()
      const msgWords = msg.split(/\s+/).filter(w => w.length >= 4)
      return msgWords.some(w => titleLower.includes(w))
    }) || todoTasks[0]

    if (matchedTask && !actions.some(a => a.type === 'complete_task' && a.params.task_id === matchedTask.id)) {
      actions.push({
        id: `start_task_${matchedTask.id}`,
        type: 'start_task',
        label: `Iniciar "${matchedTask.title.substring(0, 30)}${matchedTask.title.length > 30 ? '...' : ''}"`,
        icon: 'Play',
        module: 'atlas',
        params: { task_id: matchedTask.id },
      })
    }
  }

  // Update priority
  if (priorityKeywords.some(k => msg.includes(k)) && rawData.tasks.length > 0) {
    const openTasks = rawData.tasks.filter(t => t.status !== 'done')
    const matchedTask = openTasks.find(t => {
      const titleLower = t.title.toLowerCase()
      const msgWords = msg.split(/\s+/).filter(w => w.length >= 4)
      return msgWords.some(w => titleLower.includes(w))
    }) || openTasks[0]

    if (matchedTask && !actions.some(a => a.params.task_id === matchedTask.id)) {
      actions.push({
        id: `update_priority_${matchedTask.id}`,
        type: 'update_priority',
        label: `Priorizar "${matchedTask.title.substring(0, 30)}${matchedTask.title.length > 30 ? '...' : ''}"`,
        icon: 'Star',
        module: 'atlas',
        params: { task_id: matchedTask.id, is_urgent: true, is_important: true },
      })
    }
  }

  // Reschedule overdue tasks
  if (rescheduleKeywords.some(k => msg.includes(k)) && overdueTasks.length > 0) {
    const target = overdueTasks[0]
    if (!actions.some(a => a.params.task_id === target.id)) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      actions.push({
        id: `reschedule_task_${target.id}`,
        type: 'reschedule_task',
        label: `Reagendar "${target.title.substring(0, 30)}${target.title.length > 30 ? '...' : ''}"`,
        icon: 'Calendar',
        module: 'atlas',
        params: { task_id: target.id, new_date: tomorrow },
      })
    }
  }

  // Create moment
  if (momentKeywords.some(k => msg.includes(k))) {
    actions.push({
      id: `create_moment_${Date.now()}`,
      type: 'create_moment',
      label: 'Registrar momento',
      icon: 'PenLine',
      module: 'journey',
      params: { content: message.substring(0, 500), emotion: 'thoughtful', type: 'text' },
    })
  }

  // Fallback: if overdue tasks exist and no actions matched yet, suggest reschedule
  if (actions.length === 0 && overdueTasks.length > 0) {
    const target = overdueTasks[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    actions.push({
      id: `reschedule_task_${target.id}`,
      type: 'reschedule_task',
      label: `Reagendar "${target.title.substring(0, 30)}${target.title.length > 30 ? '...' : ''}" (atrasada)`,
      icon: 'Calendar',
      module: 'atlas',
      params: { task_id: target.id, new_date: tomorrow },
    })
  }

  return actions.slice(0, 3)
}
