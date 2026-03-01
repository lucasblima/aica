/**
 * Atlas Scoring Service — Scientific task scoring formulas
 *
 * Implements 8 cognitive science formulas for task prioritization and flow optimization.
 * All scores are normalized 0-1 unless otherwise noted.
 *
 * References:
 * 1. Cognitive Load Theory (Sweller 1988)
 * 2. Flow Theory (Csikszentmihalyi 1990)
 * 3. Planning Fallacy (Buehler et al. 1994)
 * 4. Task Switching (Rubinstein et al. 2001)
 * 5. Zeigarnik Effect / Relief (Masicampo & Baumeister 2011)
 * 6. Decision Fatigue (Danziger et al. 2011) — CONTESTED
 * 7. Attention Restoration Theory (Kaplan 1995)
 */

import { supabase } from '@/services/supabaseClient'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('atlasScoring')

// =============================================================================
// TYPES
// =============================================================================

export type Chronotype = 'morning_lark' | 'night_owl' | 'intermediate'
export type EnergyLevel = 'peak' | 'sustain' | 'rest'
export type TaskComplexity = 'low' | 'medium' | 'high'

export interface CognitiveProfile {
  id: string
  user_id: string
  chronotype: Chronotype
  peak_hours: [number, number] // e.g. [9, 12] = 9:00-12:00
  avg_focus_minutes: number
  planning_fallacy_multiplier: number
  decisions_today: number
  last_break_at: string | null
  preferred_break_type: 'nature' | 'social' | 'exercise' | 'rest'
  created_at: string
  updated_at: string
}

export interface TaskScores {
  cognitiveLoad: number        // 0-1, Sweller 1988
  flowProbability: number      // 0-1, Csikszentmihalyi 1990
  correctedDuration: number    // minutes, Buehler et al. 1994
  scientificPriority: number   // 0-1, composite
  switchCost: number           // minutes, Rubinstein et al. 2001
  zeigarnikRelief: number      // 0-1, Masicampo & Baumeister 2011
  decisionFatigue: number      // 0-1, Danziger et al. 2011 — CONTESTED
  attentionRestoration: number // 0-10, Kaplan 1995
}

export interface FlowZoneState {
  isInFlowZone: boolean
  flowProbability: number
  currentEnergyLevel: EnergyLevel
  optimalTaskTypes: TaskComplexity[]
  nextFlowWindow: { start: number; end: number } | null
}

export interface WorkItemForScoring {
  id: string
  title: string
  description?: string | null
  priority?: string | null
  priority_quadrant?: string | null
  due_date?: string | null
  estimated_duration?: number | null
  actual_duration?: number | null
  completed_at?: string | null
  tags?: string[] | null
  subtask_count?: number
  has_notes?: boolean
  complexity?: TaskComplexity
  context_category?: string | null
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Priority formula weights (must sum to ~1.0 with switchCost subtracted) */
const PRIORITY_WEIGHTS = {
  urgency: 0.30,
  importance: 0.30,
  energyMatch: 0.20,
  contextSimilarity: 0.15,
  switchCost: 0.05,
}

/** Context-switch cost by complexity (minutes), Rubinstein et al. 2001 */
const SWITCH_COST_BY_COMPLEXITY: Record<TaskComplexity, number> = {
  low: 2,
  medium: 5,
  high: 12,
}

// =============================================================================
// 1. COGNITIVE LOAD — Sweller 1988
// =============================================================================

/**
 * Compute Cognitive Load using Cognitive Load Theory.
 * CL = elements * interactivity * (1 / expertise)
 * Normalized to 0-1 range.
 *
 * @param elements - Number of information elements (subtasks, dependencies). 1-20.
 * @param interactivity - How much elements interact (0-1). Higher = more complex.
 * @param expertise - User expertise with this type of task (0.1-1). Lower = higher load.
 */
export function computeCognitiveLoad(
  elements: number,
  interactivity: number,
  expertise: number,
): number {
  const clampedElements = Math.max(1, Math.min(elements, 20))
  const clampedInteractivity = Math.max(0, Math.min(interactivity, 1))
  const clampedExpertise = Math.max(0.1, Math.min(expertise, 1))

  const rawCL = clampedElements * clampedInteractivity * (1 / clampedExpertise)
  // Max possible: 20 * 1 * (1/0.1) = 200. Normalize to 0-1.
  return Math.min(rawCL / 20, 1)
}

/**
 * Estimate cognitive load from work item properties.
 * Uses heuristics when explicit values aren't available.
 */
function estimateCognitiveLoad(item: WorkItemForScoring, profile: CognitiveProfile): number {
  const elements = Math.max(1, (item.subtask_count ?? 1) + (item.description ? 2 : 0))
  const interactivity = item.complexity === 'high' ? 0.8
    : item.complexity === 'medium' ? 0.5
    : 0.2
  // Expertise approximation: longer avg focus = more experienced
  const expertise = Math.min(1, profile.avg_focus_minutes / 60)

  return computeCognitiveLoad(elements, interactivity, expertise)
}

// =============================================================================
// 2. FLOW PROBABILITY — Csikszentmihalyi 1990
// =============================================================================

/**
 * Compute Flow Probability based on challenge/skill balance.
 *
 * Flow occurs when challenge ~= skill. Too easy → boredom. Too hard → anxiety.
 * FP = balanceRatio * goalClarity * feedbackQuality
 *
 * @param challenge - Task difficulty (0-1)
 * @param skill - User skill level for this task type (0-1)
 * @param goalClarity - How clear the task goal is (0-1)
 * @param feedbackQuality - How quickly user gets feedback on progress (0-1)
 */
export function computeFlowProbability(
  challenge: number,
  skill: number,
  goalClarity: number,
  feedbackQuality: number,
): number {
  const clampedChallenge = Math.max(0.01, Math.min(challenge, 1))
  const clampedSkill = Math.max(0.01, Math.min(skill, 1))
  const clampedGoalClarity = Math.max(0, Math.min(goalClarity, 1))
  const clampedFeedback = Math.max(0, Math.min(feedbackQuality, 1))

  // Balance ratio: 1.0 when challenge == skill, drops toward 0 as they diverge
  const ratio = Math.min(clampedChallenge, clampedSkill) / Math.max(clampedChallenge, clampedSkill)
  // Boost when both are above average (0.5) — flow needs sufficient engagement
  const aboveAvgMod = (clampedChallenge + clampedSkill) / 2 > 0.4 ? 1.0 : 0.7

  return ratio * aboveAvgMod * clampedGoalClarity * clampedFeedback
}

/**
 * Estimate flow probability from work item + profile context.
 */
function estimateFlowProbability(item: WorkItemForScoring, profile: CognitiveProfile): number {
  const challenge = item.complexity === 'high' ? 0.85
    : item.complexity === 'medium' ? 0.55
    : 0.25
  const skill = Math.min(1, profile.avg_focus_minutes / 60)
  const goalClarity = (item.description && item.due_date) ? 0.9
    : item.description ? 0.7
    : item.due_date ? 0.6
    : 0.4
  const feedbackQuality = (item.subtask_count ?? 0) > 0 ? 0.8 : 0.5

  return computeFlowProbability(challenge, skill, goalClarity, feedbackQuality)
}

// =============================================================================
// 3. PLANNING FALLACY — Buehler et al. 1994
// =============================================================================

/**
 * Correct estimated duration using the Planning Fallacy multiplier.
 * corrected = estimate * personalMultiplier
 *
 * The multiplier is a rolling average of actual/estimated for completed tasks.
 * Default multiplier is 1.5 (most people underestimate by ~50%).
 */
export function correctPlanningFallacy(
  estimatedMinutes: number,
  personalMultiplier: number,
): number {
  return Math.round(estimatedMinutes * Math.max(1, personalMultiplier))
}

/**
 * Update the user's planning fallacy multiplier after completing a task.
 * Uses exponential moving average with alpha=0.3 (recent tasks weighted more).
 */
export async function updatePlanningFallacyMultiplier(
  userId: string,
  taskId: string,
  actualMinutes: number,
): Promise<number> {
  // Get the task's estimated duration
  const { data: task, error: taskError } = await supabase
    .from('work_items')
    .select('estimated_duration')
    .eq('id', taskId)
    .single()

  if (taskError || !task?.estimated_duration) {
    log.warn('Cannot update planning fallacy: missing task or estimate', { taskId })
    return 1.5 // default
  }

  const taskRatio = actualMinutes / task.estimated_duration

  // Get current multiplier
  const { data: profile, error: profileError } = await supabase
    .from('user_cognitive_profiles')
    .select('planning_fallacy_multiplier')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    log.warn('Cannot update planning fallacy: no cognitive profile', { userId })
    return taskRatio
  }

  // Exponential moving average: new = alpha * observation + (1 - alpha) * old
  const alpha = 0.3
  const oldMultiplier = profile.planning_fallacy_multiplier ?? 1.5
  const newMultiplier = alpha * taskRatio + (1 - alpha) * oldMultiplier

  const { error: updateError } = await supabase
    .from('user_cognitive_profiles')
    .update({
      planning_fallacy_multiplier: Math.round(newMultiplier * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    log.error('Failed to update planning fallacy multiplier:', updateError)
    return oldMultiplier
  }

  log.info(`Planning fallacy updated: ${oldMultiplier} -> ${newMultiplier}`, { userId, taskId })
  return newMultiplier
}

// =============================================================================
// 4. SCIENTIFIC PRIORITY — Composite
// =============================================================================

/**
 * Compute scientific task priority as a weighted composite.
 * score = w1*urgency + w2*importance + w3*energyMatch + w4*contextSim - w5*switchCost
 *
 * All inputs 0-1 except switchCost which is normalized internally.
 */
function computeScientificPriority(
  urgency: number,
  importance: number,
  energyMatch: number,
  contextSimilarity: number,
  normalizedSwitchCost: number,
): number {
  const raw =
    PRIORITY_WEIGHTS.urgency * Math.max(0, Math.min(urgency, 1)) +
    PRIORITY_WEIGHTS.importance * Math.max(0, Math.min(importance, 1)) +
    PRIORITY_WEIGHTS.energyMatch * Math.max(0, Math.min(energyMatch, 1)) +
    PRIORITY_WEIGHTS.contextSimilarity * Math.max(0, Math.min(contextSimilarity, 1)) -
    PRIORITY_WEIGHTS.switchCost * Math.max(0, Math.min(normalizedSwitchCost, 1))

  return Math.max(0, Math.min(raw, 1))
}

/**
 * Derive urgency score from due date.
 */
function deriveUrgency(dueDate: string | null | undefined): number {
  if (!dueDate) return 0.3 // no due date = low urgency
  const now = Date.now()
  const due = new Date(dueDate).getTime()
  const hoursUntilDue = (due - now) / (1000 * 60 * 60)

  if (hoursUntilDue < 0) return 1.0       // overdue
  if (hoursUntilDue < 4) return 0.95      // due in < 4h
  if (hoursUntilDue < 24) return 0.8      // due today
  if (hoursUntilDue < 72) return 0.6      // due in 1-3 days
  if (hoursUntilDue < 168) return 0.4     // due this week
  return 0.2                               // due later
}

/**
 * Derive importance from priority quadrant.
 */
function deriveImportance(quadrant: string | null | undefined): number {
  switch (quadrant) {
    case 'urgent-important': return 1.0
    case 'important': return 0.85
    case 'urgent': return 0.6
    case 'low': return 0.3
    default: return 0.5
  }
}

/**
 * Compute energy match: how well task complexity aligns with current energy level.
 */
function computeEnergyMatch(complexity: TaskComplexity, energyLevel: EnergyLevel): number {
  const matchMatrix: Record<EnergyLevel, Record<TaskComplexity, number>> = {
    peak: { high: 1.0, medium: 0.7, low: 0.3 },
    sustain: { high: 0.5, medium: 1.0, low: 0.7 },
    rest: { high: 0.1, medium: 0.5, low: 1.0 },
  }
  return matchMatrix[energyLevel][complexity]
}

// =============================================================================
// 5. SWITCH COST — Rubinstein et al. 2001
// =============================================================================

/**
 * Compute effective task duration including context-switch cost.
 * effective = baseDuration + nSwitches * costPerSwitch[complexity]
 *
 * @param baseDuration - Task duration in minutes (before switching overhead)
 * @param nSwitches - Number of context switches expected
 * @param complexity - Task complexity level
 * @returns Effective duration in minutes
 */
export function computeSwitchCost(
  baseDuration: number,
  nSwitches: number,
  complexity: TaskComplexity,
): number {
  const costPerSwitch = SWITCH_COST_BY_COMPLEXITY[complexity]
  return baseDuration + nSwitches * costPerSwitch
}

// =============================================================================
// 6. ZEIGARNIK RELIEF — Masicampo & Baumeister 2011
// =============================================================================

/**
 * Compute Zeigarnik relief score: how well a task is captured in the system.
 * The Zeigarnik effect causes incomplete tasks to occupy working memory.
 * Capturing task details provides cognitive relief even before completion.
 *
 * Scoring: each capture element contributes to relief:
 * - Has due date: +0.25
 * - Has subtasks: +0.25
 * - Has notes/description: +0.25
 * - Has priority assigned: +0.25
 */
function computeZeigarnikRelief(item: WorkItemForScoring): number {
  let score = 0
  if (item.due_date) score += 0.25
  if ((item.subtask_count ?? 0) > 0) score += 0.25
  if (item.description || item.has_notes) score += 0.25
  if (item.priority_quadrant && item.priority_quadrant !== 'low') score += 0.25
  return score
}

// =============================================================================
// 7. DECISION FATIGUE — Danziger et al. 2011
// ** CONTESTED: The original "hungry judges" study has faced replication challenges.
// ** Treat this score as one signal among many, not a definitive measure.
// =============================================================================

/**
 * Compute decision fatigue score based on time-of-day and decisions made today.
 *
 * CONTESTED SCIENCE: The Danziger et al. 2011 "judges" study has been criticized
 * for confounds and replication failures. This implementation uses a simplified
 * model that may not reflect actual fatigue dynamics.
 *
 * @param hour - Current hour (0-23)
 * @param decisionsToday - Number of decisions made today
 * @returns Fatigue score 0-1 (higher = more fatigued)
 */
function computeDecisionFatigue(hour: number, decisionsToday: number): number {
  // Time component: fatigue increases through the day, dips after lunch
  let timeFatigue: number
  if (hour < 10) timeFatigue = 0.1
  else if (hour < 12) timeFatigue = 0.3
  else if (hour < 14) timeFatigue = 0.5 // post-lunch dip
  else if (hour < 16) timeFatigue = 0.4
  else if (hour < 18) timeFatigue = 0.6
  else timeFatigue = 0.8

  // Decision count component: each decision adds incremental fatigue
  // Diminishing returns via log scale. ~20 decisions = 0.5 fatigue contribution
  const decisionFatigue = Math.min(1, Math.log2(decisionsToday + 1) / Math.log2(21))

  // Weighted combination: time matters more than count
  return Math.min(1, timeFatigue * 0.6 + decisionFatigue * 0.4)
}

// =============================================================================
// 8. ATTENTION RESTORATION — Kaplan 1995
// =============================================================================

export type BreakActivity = 'nature' | 'change' | 'explore' | 'social' | 'screen' | 'rest'

/**
 * Compute attention restoration score for a break activity.
 * Based on Attention Restoration Theory (Kaplan 1995):
 * - Nature exposure provides highest restoration (+3)
 * - Environment change provides moderate restoration (+2)
 * - Exploration / novelty provides some restoration (+1)
 *
 * @param activity - Type of break activity
 * @param durationMinutes - Break duration in minutes
 * @returns Restoration score 0-10
 */
export function computeAttentionRestoration(
  activity: BreakActivity,
  durationMinutes: number,
): number {
  const activityScores: Record<BreakActivity, number> = {
    nature: 3,
    change: 2,
    explore: 1,
    social: 1.5,
    rest: 1,
    screen: 0.5,
  }

  const baseScore = activityScores[activity]
  // Duration bonus: diminishing returns after 15 minutes
  const durationBonus = Math.min(2, durationMinutes / 15)
  // Scale to 0-10
  return Math.min(10, (baseScore + durationBonus) * 2)
}

// =============================================================================
// COMPOSITE SCORING
// =============================================================================

/**
 * Compute current energy level based on chronotype and time of day.
 */
export function getCurrentEnergyLevel(profile: CognitiveProfile): EnergyLevel {
  const hour = new Date().getHours()
  const [peakStart, peakEnd] = profile.peak_hours

  if (hour >= peakStart && hour < peakEnd) return 'peak'

  // Sustain zone: 2 hours before and after peak
  const sustainStart = peakStart - 2
  const sustainEnd = peakEnd + 2
  if (hour >= sustainStart && hour < sustainEnd) return 'sustain'

  return 'rest'
}

/**
 * Score a single work item against a cognitive profile.
 * Returns all 8 scientific scores.
 */
export function scoreWorkItem(
  item: WorkItemForScoring,
  profile: CognitiveProfile,
): TaskScores {
  const complexity: TaskComplexity = item.complexity ?? 'medium'
  const energyLevel = getCurrentEnergyLevel(profile)
  const hour = new Date().getHours()

  const cognitiveLoad = estimateCognitiveLoad(item, profile)
  const flowProbability = estimateFlowProbability(item, profile)
  const correctedDuration = correctPlanningFallacy(
    item.estimated_duration ?? 30,
    profile.planning_fallacy_multiplier,
  )
  const switchCost = computeSwitchCost(
    item.estimated_duration ?? 30,
    1, // assume 1 switch for individual scoring
    complexity,
  )
  const zeigarnikRelief = computeZeigarnikRelief(item)
  const decisionFatigue = computeDecisionFatigue(hour, profile.decisions_today)
  const attentionRestoration = computeAttentionRestoration(
    profile.preferred_break_type === 'exercise' ? 'change' : profile.preferred_break_type,
    15,
  )

  const urgency = deriveUrgency(item.due_date)
  const importance = deriveImportance(item.priority_quadrant)
  const energyMatch = computeEnergyMatch(complexity, energyLevel)
  const contextSimilarity = 0.5 // default when no previous task context
  const normalizedSwitchCost = Math.min(1, (switchCost - (item.estimated_duration ?? 30)) / 30)

  const scientificPriority = computeScientificPriority(
    urgency,
    importance,
    energyMatch,
    contextSimilarity,
    normalizedSwitchCost,
  )

  return {
    cognitiveLoad,
    flowProbability,
    correctedDuration,
    scientificPriority,
    switchCost,
    zeigarnikRelief,
    decisionFatigue,
    attentionRestoration,
  }
}

/**
 * Batch score all work items, sorted by scientific priority (descending).
 */
export function batchScoreWorkItems(
  items: WorkItemForScoring[],
  profile: CognitiveProfile,
): Array<{ item: WorkItemForScoring; scores: TaskScores }> {
  return items
    .map(item => ({
      item,
      scores: scoreWorkItem(item, profile),
    }))
    .sort((a, b) => b.scores.scientificPriority - a.scores.scientificPriority)
}

/**
 * Determine current flow zone state for task recommendations.
 */
/**
 * Compute Atlas domain score for Life Score composition.
 * Weighted combination of flow probability, task completion rate, and planning accuracy.
 *
 * @param avgFlowProbability - Average flow probability across tasks (0-1)
 * @param taskCompletionRate - Ratio of completed tasks (0-1)
 * @param planningAccuracy - 1 - abs(1 - planningFallacyMultiplier), clamped to 0-1
 * @returns Normalized domain score (0-1)
 */
export function computeAtlasDomainScore(
  avgFlowProbability: number,
  taskCompletionRate: number,
  planningAccuracy: number
): number {
  return 0.35 * Math.max(0, Math.min(avgFlowProbability, 1))
    + 0.40 * Math.max(0, Math.min(taskCompletionRate, 1))
    + 0.25 * Math.max(0, Math.min(planningAccuracy, 1));
}

export function computeFlowZoneState(profile: CognitiveProfile): FlowZoneState {
  const energyLevel = getCurrentEnergyLevel(profile)
  const hour = new Date().getHours()
  const [peakStart, peakEnd] = profile.peak_hours

  // Flow probability based on energy + fatigue
  const fatigue = computeDecisionFatigue(hour, profile.decisions_today)
  const energyFactor = energyLevel === 'peak' ? 0.9 : energyLevel === 'sustain' ? 0.6 : 0.2
  const flowProbability = energyFactor * (1 - fatigue * 0.5)

  // Optimal task types for current energy
  const optimalTaskTypes: TaskComplexity[] =
    energyLevel === 'peak' ? ['high', 'medium'] :
    energyLevel === 'sustain' ? ['medium', 'low'] :
    ['low']

  // Next flow window
  let nextFlowWindow: { start: number; end: number } | null = null
  if (energyLevel !== 'peak') {
    if (hour < peakStart) {
      nextFlowWindow = { start: peakStart, end: peakEnd }
    } else {
      // Next day's peak
      nextFlowWindow = { start: peakStart + 24, end: peakEnd + 24 }
    }
  }

  return {
    isInFlowZone: flowProbability > 0.6,
    flowProbability,
    currentEnergyLevel: energyLevel,
    optimalTaskTypes,
    nextFlowWindow,
  }
}
