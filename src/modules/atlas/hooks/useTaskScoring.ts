/**
 * useTaskScoring Hook
 * Scores work items using Atlas cognitive science formulas.
 */

import { useState, useCallback } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabaseClient'
import {
  scoreWorkItem,
  batchScoreWorkItems,
  type CognitiveProfile,
  type TaskScores,
  type WorkItemForScoring,
} from '../services/atlasScoring'

const log = createNamespacedLogger('useTaskScoring')

interface ScoredTask {
  item: WorkItemForScoring
  scores: TaskScores
}

interface UseTaskScoringReturn {
  tasks: WorkItemForScoring[]
  scoredTasks: ScoredTask[]
  isScoring: boolean
  error: Error | null
  scoreTask: (taskId: string) => Promise<ScoredTask | null>
  scoreAllTasks: () => Promise<void>
}

export function useTaskScoring(profile: CognitiveProfile | null): UseTaskScoringReturn {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<WorkItemForScoring[]>([])
  const [scoredTasks, setScoredTasks] = useState<ScoredTask[]>([])
  const [isScoring, setIsScoring] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTasks = useCallback(async (): Promise<WorkItemForScoring[]> => {
    if (!user?.id) return []

    const { data, error: fetchError } = await supabase
      .from('work_items')
      .select('id, title, description, priority, priority_quadrant, due_date, estimated_duration, actual_duration, completed_at, tags')
      .eq('created_by', user.id)
      .is('completed_at', null)
      .eq('archived', false)
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    return (data ?? []).map(item => ({
      ...item,
      subtask_count: 0,
      has_notes: !!item.description,
      complexity: inferComplexity(item.estimated_duration, item.description),
    }))
  }, [user?.id])

  const scoreTask = useCallback(async (taskId: string): Promise<ScoredTask | null> => {
    if (!user?.id || !profile) return null

    try {
      setIsScoring(true)
      setError(null)

      const { data: task, error: fetchError } = await supabase
        .from('work_items')
        .select('id, title, description, priority, priority_quadrant, due_date, estimated_duration, actual_duration, completed_at, tags')
        .eq('id', taskId)
        .single()

      if (fetchError || !task) {
        throw new Error(fetchError?.message ?? 'Tarefa nao encontrada')
      }

      const workItem: WorkItemForScoring = {
        ...task,
        subtask_count: 0,
        has_notes: !!task.description,
        complexity: inferComplexity(task.estimated_duration, task.description),
      }

      const scores = scoreWorkItem(workItem, profile)
      const scored = { item: workItem, scores }

      setScoredTasks(prev => {
        const existing = prev.findIndex(s => s.item.id === taskId)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = scored
          return updated
        }
        return [...prev, scored]
      })

      return scored
    } catch (err) {
      const e = err as Error
      setError(e)
      log.error('Error scoring task:', e)
      return null
    } finally {
      setIsScoring(false)
    }
  }, [user?.id, profile])

  const scoreAllTasks = useCallback(async () => {
    if (!user?.id || !profile) return

    try {
      setIsScoring(true)
      setError(null)

      const fetchedTasks = await fetchTasks()
      setTasks(fetchedTasks)

      const scored = batchScoreWorkItems(fetchedTasks, profile)
      setScoredTasks(scored)

      log.info(`Scored ${scored.length} tasks`)
    } catch (err) {
      const e = err as Error
      setError(e)
      log.error('Error scoring tasks:', e)
    } finally {
      setIsScoring(false)
    }
  }, [user?.id, profile, fetchTasks])

  return {
    tasks,
    scoredTasks,
    isScoring,
    error,
    scoreTask,
    scoreAllTasks,
  }
}

/** Infer task complexity from duration and description length. */
function inferComplexity(
  estimatedDuration: number | null | undefined,
  description: string | null | undefined,
): 'low' | 'medium' | 'high' {
  const duration = estimatedDuration ?? 30
  const descLength = description?.length ?? 0

  if (duration > 120 || descLength > 500) return 'high'
  if (duration > 45 || descLength > 150) return 'medium'
  return 'low'
}
