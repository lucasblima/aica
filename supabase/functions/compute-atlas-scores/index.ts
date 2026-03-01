/**
 * Edge Function: compute-atlas-scores
 * Atlas Module — Cognitive Science Task Scoring
 *
 * Pure computation endpoint (no Gemini API calls).
 * Batch-scores a user's work_items using cognitive science formulas:
 *   - Cognitive Load Score (Sweller 1988)
 *   - Flow Probability (Csikszentmihalyi 1990)
 *   - Planning Fallacy Multiplier (Buehler et al. 1994)
 *   - Scientific Priority Score (composite weighted)
 *
 * Auth: JWT via Supabase anon key (read), service role (writes)
 * Endpoint: POST /functions/v1/compute-atlas-scores
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const log = createNamespacedLogger('compute-atlas-scores')

// =============================================================================
// TYPES
// =============================================================================

interface RequestBody {
  taskIds?: string[]
}

interface WorkItem {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: string | null
  priority_quadrant: number | null
  status: string
  due_date: string | null
  estimated_duration: number | null
  parent_task_id: string | null
  tags: string[] | null
  context_category: string | null
  energy_level_required: string | null
}

interface CognitiveProfile {
  chronotype: string
  peak_hours: number[] | null
  ultradian_period_minutes: number
  avg_planning_fallacy: number
  energy_pattern: Record<string, string> | null
  task_category_multipliers: Record<string, number> | null
}

interface TaskScores {
  id: string
  cognitive_load_score: number
  flow_probability: number
  planning_fallacy_multiplier: number
  scientific_priority_score: number
}

// =============================================================================
// DEFAULT COGNITIVE PROFILE
// =============================================================================

const DEFAULT_PROFILE: CognitiveProfile = {
  chronotype: 'neutral',
  peak_hours: [9, 10, 11, 14, 15, 16],
  ultradian_period_minutes: 90,
  avg_planning_fallacy: 1.5,
  energy_pattern: {
    '6': 'low', '7': 'medium', '8': 'high', '9': 'peak', '10': 'peak',
    '11': 'high', '12': 'medium', '13': 'low', '14': 'medium', '15': 'high',
    '16': 'high', '17': 'medium', '18': 'low', '19': 'low', '20': 'low',
  },
  task_category_multipliers: null,
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Cognitive Load Score (Sweller 1988)
 * elements * interactivity * (1 / experience)
 * Normalized to 0-1 range.
 */
function computeCognitiveLoad(task: WorkItem, subtaskCount: number): number {
  // Elements: based on subtask count (more subtasks = more elements to track)
  const elements = Math.min(subtaskCount + 1, 10) / 10 // normalize 0-1

  // Interactivity: based on priority level (higher priority = more interactivity required)
  const interactivityMap: Record<string, number> = {
    urgent: 1.0,
    high: 0.8,
    medium: 0.5,
    low: 0.3,
    none: 0.1,
  }
  const interactivity = interactivityMap[task.priority || 'medium'] ?? 0.5

  // Experience estimate: inverse — tasks with more description/tags suggest familiarity
  const hasDescription = task.description && task.description.length > 50
  const hasTags = task.tags && task.tags.length > 0
  const experienceFactor = 1 + (hasDescription ? 0.3 : 0) + (hasTags ? 0.2 : 0)

  const raw = elements * interactivity * (1 / experienceFactor)
  return clamp(raw, 0, 1)
}

/**
 * Flow Probability (Csikszentmihalyi 1990)
 * balance = 1 - |challenge - skill| / max(challenge, skill, 1)
 * Adjusted by goal clarity (+0.2 if has due_date) and feedback (+0.1 if has description)
 * Clamped to 0-1.
 */
function computeFlowProbability(task: WorkItem, cognitiveLoad: number): number {
  // Challenge: derived from cognitive load (higher load = higher challenge)
  const challenge = cognitiveLoad

  // Skill: estimated from priority quadrant (Q2 important+not-urgent implies competence)
  const skillMap: Record<number, number> = {
    1: 0.6, // do: urgent+important, moderate skill assumed
    2: 0.8, // schedule: important but planned, higher skill
    3: 0.4, // delegate: urgent but not important, lower skill match
    4: 0.3, // eliminate: neither, poor fit
  }
  const skill = skillMap[task.priority_quadrant || 0] ?? 0.5

  // Balance: how close challenge matches skill
  const maxVal = Math.max(challenge, skill, 0.01)
  const balance = 1 - Math.abs(challenge - skill) / maxVal

  // Goal clarity: having a due date adds structure
  const goalClarity = task.due_date ? 0.2 : 0

  // Feedback availability: description provides context/feedback loop
  const feedback = task.description ? 0.1 : 0

  const raw = balance * (1 + goalClarity + feedback)
  return clamp(raw, 0, 1)
}

/**
 * Planning Fallacy Multiplier (Buehler et al. 1994)
 * Uses the user's rolling average from their cognitive profile.
 */
function computePlanningFallacy(profile: CognitiveProfile): number {
  return Math.max(1.0, Math.min(3.0, profile.avg_planning_fallacy))
}

/**
 * Scientific Priority Score (composite weighted)
 * 0.30 * urgencyFromDueDate
 * + 0.25 * importanceFromQuadrant
 * + 0.20 * energyMatchForTimeOfDay
 * + 0.15 * contextSimilarity
 * - 0.10 * switchCost
 * Normalized to 0-1.
 */
function computeScientificPriority(
  task: WorkItem,
  profile: CognitiveProfile,
  previousCategory: string | null
): number {
  // Urgency from due date (0-1): closer deadline = higher urgency
  const urgency = computeUrgencyFromDueDate(task.due_date)

  // Importance from Eisenhower quadrant (0-1)
  const importanceMap: Record<number, number> = {
    1: 1.0,  // Q1: urgent + important
    2: 0.85, // Q2: important, not urgent
    3: 0.5,  // Q3: urgent, not important
    4: 0.15, // Q4: neither
  }
  const importance = importanceMap[task.priority_quadrant || 0] ?? 0.5

  // Energy match for current time of day (0-1)
  const energyMatch = computeEnergyMatch(task, profile)

  // Context similarity (0-1): same category as previous task = lower switch cost
  const contextSimilarity = (previousCategory && task.context_category === previousCategory) ? 0.8 : 0.3

  // Switch cost (0-1): different category = higher cost
  const switchCost = (previousCategory && task.context_category !== previousCategory) ? 0.6 : 0.1

  const raw = 0.30 * urgency
    + 0.25 * importance
    + 0.20 * energyMatch
    + 0.15 * contextSimilarity
    - 0.10 * switchCost

  return clamp(raw, 0, 1)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

/**
 * Urgency from due date: exponential decay based on days remaining.
 * 0 days = 1.0, 7 days = ~0.5, 30+ days = ~0.1
 */
function computeUrgencyFromDueDate(dueDate: string | null): number {
  if (!dueDate) return 0.2 // no deadline = low urgency

  const now = new Date()
  const due = new Date(dueDate)
  const daysRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  if (daysRemaining <= 0) return 1.0 // overdue
  if (daysRemaining <= 1) return 0.95
  if (daysRemaining <= 3) return 0.8
  if (daysRemaining <= 7) return 0.5
  if (daysRemaining <= 14) return 0.3
  return 0.1
}

/**
 * Energy match: how well the task's energy requirement matches the user's
 * current energy level based on their chronotype/pattern.
 */
function computeEnergyMatch(task: WorkItem, profile: CognitiveProfile): number {
  const currentHour = new Date().getUTCHours()
  // Approximate BRT (UTC-3) — adjust if user timezone is available
  const localHour = (currentHour - 3 + 24) % 24

  const energyLevels: Record<string, number> = {
    low: 0.25,
    medium: 0.5,
    high: 0.75,
    peak: 1.0,
  }

  // User's current energy from their pattern
  const userEnergy = energyLevels[
    profile.energy_pattern?.[String(localHour)] || 'medium'
  ] ?? 0.5

  // Task's required energy
  const taskEnergy = energyLevels[task.energy_level_required || 'medium'] ?? 0.5

  // Best match when task energy requirement is close to or below user energy
  if (userEnergy >= taskEnergy) {
    // User has enough energy — good match
    return 0.8 + 0.2 * (1 - (userEnergy - taskEnergy))
  } else {
    // User energy is lower than task needs — poor match
    return 0.3 * (userEnergy / taskEnergy)
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // =========================================================================
    // AUTH: validate JWT using anon client
    // =========================================================================
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    log.info(`Scoring tasks for user ${user.id}`)

    // =========================================================================
    // PARSE BODY
    // =========================================================================
    let body: RequestBody = {}
    try {
      body = await req.json()
    } catch {
      // empty body is valid — score all open tasks
    }

    const { taskIds } = body

    // =========================================================================
    // SERVICE CLIENT for writes
    // =========================================================================
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // =========================================================================
    // FETCH COGNITIVE PROFILE (or use defaults)
    // =========================================================================
    const { data: profileRow } = await serviceClient
      .from('user_cognitive_profiles')
      .select('chronotype, peak_hours, ultradian_period_minutes, avg_planning_fallacy, energy_pattern, task_category_multipliers')
      .eq('user_id', user.id)
      .maybeSingle()

    const profile: CognitiveProfile = profileRow
      ? {
          chronotype: profileRow.chronotype || DEFAULT_PROFILE.chronotype,
          peak_hours: profileRow.peak_hours || DEFAULT_PROFILE.peak_hours,
          ultradian_period_minutes: profileRow.ultradian_period_minutes || DEFAULT_PROFILE.ultradian_period_minutes,
          avg_planning_fallacy: profileRow.avg_planning_fallacy || DEFAULT_PROFILE.avg_planning_fallacy,
          energy_pattern: profileRow.energy_pattern || DEFAULT_PROFILE.energy_pattern,
          task_category_multipliers: profileRow.task_category_multipliers || DEFAULT_PROFILE.task_category_multipliers,
        }
      : { ...DEFAULT_PROFILE }

    // =========================================================================
    // FETCH WORK ITEMS
    // =========================================================================
    let query = serviceClient
      .from('work_items')
      .select('id, user_id, title, description, priority, priority_quadrant, status, due_date, estimated_duration, parent_task_id, tags, context_category, energy_level_required')
      .eq('user_id', user.id)

    if (taskIds && taskIds.length > 0) {
      query = query.in('id', taskIds)
    } else {
      // Score all non-done tasks
      query = query.not('status', 'in', '("completed","cancelled")')
    }

    const { data: tasks, error: tasksError } = await query

    if (tasksError) {
      log.error('Failed to fetch work_items', tasksError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch tasks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { scoredCount: 0, tasks: [] } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    log.info(`Scoring ${tasks.length} tasks`)

    // =========================================================================
    // COUNT SUBTASKS per parent
    // =========================================================================
    const parentIds = tasks.map((t: WorkItem) => t.id)
    const { data: subtaskCounts } = await serviceClient
      .from('work_items')
      .select('parent_task_id')
      .in('parent_task_id', parentIds)

    const subtaskCountMap: Record<string, number> = {}
    if (subtaskCounts) {
      for (const row of subtaskCounts) {
        const pid = row.parent_task_id as string
        subtaskCountMap[pid] = (subtaskCountMap[pid] || 0) + 1
      }
    }

    // =========================================================================
    // COMPUTE SCORES
    // =========================================================================
    const scoredTasks: TaskScores[] = []
    let previousCategory: string | null = null

    for (const task of tasks as WorkItem[]) {
      const subtaskCount = subtaskCountMap[task.id] || 0

      const cognitiveLoad = computeCognitiveLoad(task, subtaskCount)
      const flowProbability = computeFlowProbability(task, cognitiveLoad)
      const planningFallacy = computePlanningFallacy(profile)
      const scientificPriority = computeScientificPriority(task, profile, previousCategory)

      scoredTasks.push({
        id: task.id,
        cognitive_load_score: round4(cognitiveLoad),
        flow_probability: round4(flowProbability),
        planning_fallacy_multiplier: round4(planningFallacy),
        scientific_priority_score: round4(scientificPriority),
      })

      previousCategory = task.context_category
    }

    // =========================================================================
    // BATCH UPDATE work_items
    // =========================================================================
    const updatePromises = scoredTasks.map((scored) =>
      serviceClient
        .from('work_items')
        .update({
          cognitive_load_score: scored.cognitive_load_score,
          flow_probability: scored.flow_probability,
          planning_fallacy_multiplier: scored.planning_fallacy_multiplier,
          scientific_priority_score: scored.scientific_priority_score,
        })
        .eq('id', scored.id)
    )

    const updateResults = await Promise.all(updatePromises)
    const failedUpdates = updateResults.filter((r) => r.error)
    if (failedUpdates.length > 0) {
      log.warn(`${failedUpdates.length} task updates failed`, failedUpdates.map((r) => r.error))
    }

    // =========================================================================
    // FIRE-AND-FORGET: score_attribution_log
    // =========================================================================
    serviceClient
      .from('score_attribution_log')
      .insert(
        scoredTasks.map((scored) => ({
          user_id: user.id,
          model_id: 'cognitive_load',
          entity_type: 'work_item',
          entity_id: scored.id,
          scores: {
            cognitive_load_score: scored.cognitive_load_score,
            flow_probability: scored.flow_probability,
            planning_fallacy_multiplier: scored.planning_fallacy_multiplier,
            scientific_priority_score: scored.scientific_priority_score,
          },
          computed_at: new Date().toISOString(),
        }))
      )
      .then(({ error }) => {
        if (error) {
          log.warn('Failed to log score attribution', error)
        }
      })
      .catch((err: Error) => {
        log.warn('score_attribution_log insert failed', err.message)
      })

    // =========================================================================
    // RESPONSE
    // =========================================================================
    log.info(`Scored ${scoredTasks.length} tasks successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          scoredCount: scoredTasks.length,
          tasks: scoredTasks,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    log.error('Unhandled error', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
