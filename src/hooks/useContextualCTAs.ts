/**
 * useContextualCTAs — Generates contextual CTAs from real user data
 *
 * Priority ordering:
 * 1. Overdue/urgent tasks -> "Concluir: {title}" or "Pesquisar sobre {title}"
 * 2. Finance alert (negative balance) -> "Revisar financas do mes"
 * 3. Streak at risk (no recent moments) -> "Registrar momento do dia"
 * 4. Upcoming event soon -> "Preparar para: {event}"
 * 5. Daily question fallback -> random question from FALLBACK pool
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserAIContext, type UserAIContext } from '@/services/userAIContextService'
import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('useContextualCTAs')

const MAX_CTAS = 5

export interface ContextualCTA {
  id: string
  label: string
  icon: string
  action: 'navigate' | 'chat' | 'input'
  actionPayload: string
  category: string
  color: string
}

/** Fallback questions used when no contextual data is available */
const FALLBACK_QUESTIONS = [
  'O que voce quer conquistar hoje?',
  'Como voce esta se sentindo neste momento?',
  'Qual area da sua vida precisa de mais atencao?',
  'O que te deixaria orgulhoso hoje?',
  'Como voce pode se cuidar melhor agora?',
  'Qual foi a melhor parte do seu dia?',
  'O que voce aprendeu recentemente?',
  'Com quem voce gostaria de se reconectar?',
]

function pickRandomQuestions(count: number): string[] {
  const shuffled = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

interface PendingTask {
  title: string
  priority: string
  status: string
}

async function fetchPendingTasks(userId: string): Promise<PendingTask[]> {
  try {
    const { data, error } = await supabase
      .from('work_items')
      .select('title, priority, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'todo', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !data) return []
    return data.filter((t: any) => t.title) as PendingTask[]
  } catch {
    return []
  }
}

/** Generates a contextual action label for a task based on its title */
function taskToCTA(task: PendingTask, index: number): ContextualCTA {
  const title = task.title.slice(0, 40)

  // Alternate between actionable CTA styles for variety
  if (index % 2 === 0) {
    return {
      id: `task-action-${index}`,
      label: `Pesquisar sobre: ${title}`,
      icon: 'Search',
      action: 'chat',
      actionPayload: `Pesquisar sobre ${task.title}`,
      category: 'task',
      color: 'text-ceramic-info bg-ceramic-info/10',
    }
  }

  return {
    id: `task-complete-${index}`,
    label: `Concluir: ${title}`,
    icon: 'CheckSquare',
    action: 'navigate',
    actionPayload: 'agenda',
    category: 'task',
    color: 'text-blue-600 bg-blue-500/10',
  }
}

function buildCTAs(context: UserAIContext, pendingTasks: PendingTask[]): ContextualCTA[] {
  const ctas: ContextualCTA[] = []

  // 1. Pending tasks — mix of "Pesquisar sobre" and "Concluir"
  for (let i = 0; i < pendingTasks.length && ctas.length < 2; i++) {
    ctas.push(taskToCTA(pendingTasks[i], i))
  }

  // 2. Finance alert (negative balance)
  if (context.financeSummary && context.financeSummary.balance < 0 && ctas.length < MAX_CTAS) {
    ctas.push({
      id: 'finance-alert',
      label: 'Revisar financas do mes',
      icon: 'DollarSign',
      action: 'navigate',
      actionPayload: 'finance',
      category: 'finance',
      color: 'text-red-600 bg-red-500/10',
    })
  }

  // 3. Streak at risk (no recent moments)
  if (context.recentMoments.length === 0 && ctas.length < MAX_CTAS) {
    ctas.push({
      id: 'streak-risk',
      label: 'Registrar momento do dia',
      icon: 'Sparkles',
      action: 'chat',
      actionPayload: 'Quero registrar um momento do meu dia',
      category: 'journey',
      color: 'text-amber-600 bg-amber-500/10',
    })
  }

  // 4. Upcoming events
  if (context.upcomingEvents && context.upcomingEvents.length > 0 && ctas.length < MAX_CTAS) {
    const event = context.upcomingEvents[0]
    ctas.push({
      id: 'event-upcoming',
      label: `Preparar para: ${event.title.slice(0, 30)}`,
      icon: 'Calendar',
      action: 'navigate',
      actionPayload: 'agenda',
      category: 'agenda',
      color: 'text-purple-600 bg-purple-500/10',
    })
  }

  // 5. Fill remaining slots with daily question fallbacks
  const remaining = MAX_CTAS - ctas.length
  if (remaining > 0) {
    const questions = pickRandomQuestions(remaining)
    for (const q of questions) {
      ctas.push({
        id: `question-${ctas.length}`,
        label: q,
        icon: 'HelpCircle',
        action: 'input',
        actionPayload: q,
        category: 'question',
        color: 'text-ceramic-text-secondary bg-ceramic-cool',
      })
    }
  }

  return ctas.slice(0, MAX_CTAS)
}

export function useContextualCTAs() {
  const { user } = useAuth()
  const [ctas, setCtas] = useState<ContextualCTA[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEmpty, setIsEmpty] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    if (!user?.id) {
      setIsLoading(false)
      setIsEmpty(true)
      return
    }

    fetchedRef.current = true

    async function load() {
      try {
        setIsLoading(true)
        const [context, pendingTasks] = await Promise.all([
          getUserAIContext(),
          fetchPendingTasks(user!.id),
        ])

        if (!context) {
          setIsEmpty(true)
          setCtas([])
          return
        }

        // Detect truly empty user (no data at all across modules)
        const hasAnyData =
          context.pendingTasks > 0 ||
          context.completedTasksToday > 0 ||
          context.recentMoments.length > 0 ||
          context.activeGrants > 0 ||
          context.upcomingEpisodes > 0 ||
          context.financeSummary !== null ||
          (context.upcomingEvents && context.upcomingEvents.length > 0)

        if (!hasAnyData) {
          setIsEmpty(true)
          setCtas([])
          return
        }

        const built = buildCTAs(context, pendingTasks)
        setCtas(built)
        setIsEmpty(false)
      } catch (err) {
        log.error('Failed to build contextual CTAs:', err)
        setIsEmpty(true)
        setCtas([])
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [user?.id])

  return { ctas, isLoading, isEmpty }
}
