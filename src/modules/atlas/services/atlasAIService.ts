/**
 * Atlas AI Service — Frontend client for atlas-task-intelligence Edge Function
 *
 * Provides AI-powered task intelligence:
 * - Priority suggestion (Eisenhower quadrant)
 * - Task decomposition into subtasks
 * - Daily briefing generation
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('atlasAIService')

// =============================================================================
// TYPES
// =============================================================================

export interface PrioritySuggestion {
  quadrant: 'do' | 'schedule' | 'delegate' | 'eliminate'
  confidence: number
  reasoning: string
  is_urgent: boolean
  is_important: boolean
}

export interface Subtask {
  title: string
  estimatedMinutes: number
  priority: 'high' | 'medium' | 'low'
}

export interface TaskDecomposition {
  subtasks: Subtask[]
  totalEstimate: string
}

export interface DailyBriefing {
  briefing: string
  topPriority: string
  suggestedOrder: string[]
}

// =============================================================================
// QUADRANT MAPPING
// =============================================================================

/** Map AI quadrant labels to work_items quadrant values */
export const QUADRANT_MAP: Record<PrioritySuggestion['quadrant'], {
  quadrant: string
  label: string
  is_urgent: boolean
  is_important: boolean
}> = {
  do: { quadrant: 'urgent-important', label: 'Urgente & Importante', is_urgent: true, is_important: true },
  schedule: { quadrant: 'important', label: 'Importante, Não Urgente', is_urgent: false, is_important: true },
  delegate: { quadrant: 'urgent', label: 'Urgente, Não Importante', is_urgent: true, is_important: false },
  eliminate: { quadrant: 'low', label: 'Nem Urgente, Nem Importante', is_urgent: false, is_important: false },
}

// =============================================================================
// API CALLS
// =============================================================================

async function invokeAtlasAI<T>(action: string, payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('atlas-task-intelligence', {
    body: { action, payload },
  })

  if (error) {
    log.error(`AI ${action} error:`, error)
    throw new Error(error.message || `Erro ao chamar IA: ${action}`)
  }

  if (!data?.success) {
    const msg = data?.error || 'Resposta inesperada da IA'
    log.error(`AI ${action} failed:`, msg)
    throw new Error(msg)
  }

  return data.data as T
}

/**
 * Suggest Eisenhower quadrant for a task based on title and description.
 */
export async function suggestPriority(
  title: string,
  description?: string,
  dueDate?: string,
  tags?: string[],
): Promise<PrioritySuggestion> {
  return invokeAtlasAI<PrioritySuggestion>('suggest_priority', {
    title,
    description,
    dueDate,
    tags,
  })
}

/**
 * Decompose a complex task into actionable subtasks.
 */
export async function decomposeTask(
  title: string,
  description?: string,
  estimatedHours?: number,
): Promise<TaskDecomposition> {
  return invokeAtlasAI<TaskDecomposition>('decompose_task', {
    title,
    description,
    estimatedHours,
  })
}

/**
 * Generate a daily briefing based on current tasks.
 */
export async function getDailyBriefing(
  tasks: Array<{
    title: string
    priority: string
    dueDate?: string
    status: string
    quadrant?: string
  }>,
): Promise<DailyBriefing> {
  return invokeAtlasAI<DailyBriefing>('daily_briefing', { tasks })
}
