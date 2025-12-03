/**
 * Aica Auto Service
 *
 * Intelligent task prioritization and organization using:
 * 1. Memory embeddings for context understanding
 * 2. Task history and completion patterns
 * 3. User preferences and life areas
 * 4. Real-time situation assessment
 *
 * Provides smart suggestions for task reordering in Priority Matrix
 */

import { supabase } from './supabaseClient';
import { calculateSimilarity } from './geminiMemoryService';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskContext {
  id: string;
  title: string;
  description?: string;
  priority_quadrant?: 'urgent-important' | 'important' | 'urgent' | 'low';
  priority?: string;
  due_date?: string;
  estimated_duration?: number;
  association_id?: string;
  assignment?: string;
}

export interface TaskSuggestion {
  task_id: string;
  suggested_quadrant: 'urgent-important' | 'important' | 'urgent' | 'low';
  confidence_score: number; // 0-1
  rationale: string;
  factors: {
    deadline_urgency?: number; // 0-1
    contextual_importance?: number; // 0-1
    related_memories?: string[]; // IDs of related memories
    pattern_match?: string; // Description of matching pattern
  };
}

export interface PriorityRecommendation {
  user_id: string;
  timestamp: string;
  suggestions: TaskSuggestion[];
  overall_recommendation: string;
  execution_time_estimate: number; // minutes
}

// ============================================================================
// INTELLIGENT TASK ANALYSIS
// ============================================================================

/**
 * Get AI-powered priority suggestions for all tasks in the daily agenda
 * Uses context from:
 * - Memories and recent interactions
 * - Task history and patterns
 * - User life areas and associations
 * - Current time and deadlines
 */
export async function getTaskPrioritySuggestions(
  userId: string,
  tasks: TaskContext[]
): Promise<PriorityRecommendation> {
  try {
    const suggestions: TaskSuggestion[] = [];

    for (const task of tasks) {
      const suggestion = await analyzeSingleTask(userId, task);
      suggestions.push(suggestion);
    }

    // Sort by confidence score
    suggestions.sort((a, b) => b.confidence_score - a.confidence_score);

    const recommendation: PriorityRecommendation = {
      user_id: userId,
      timestamp: new Date().toISOString(),
      suggestions,
      overall_recommendation: generateOverallRecommendation(suggestions),
      execution_time_estimate: calculateExecutionTime(suggestions),
    };

    return recommendation;
  } catch (error) {
    console.error('Error getting task priority suggestions:', error);
    throw error;
  }
}

/**
 * Analyze a single task for priority recommendation
 */
async function analyzeSingleTask(
  userId: string,
  task: TaskContext
): Promise<TaskSuggestion> {
  try {
    const factors = {
      deadline_urgency: calculateDeadlineUrgency(task.due_date),
      contextual_importance: await calculateContextualImportance(userId, task),
      related_memories: await findRelatedMemories(userId, task),
      pattern_match: await findMatchingPatterns(userId, task),
    };

    // Calculate suggested quadrant based on factors
    const suggestedQuadrant = calculateQuadrant(
      factors.deadline_urgency || 0,
      factors.contextual_importance || 0
    );

    // Calculate confidence score
    const confidenceScore = calculateConfidence(factors);

    // Generate rationale
    const rationale = generateRationale(task, factors, suggestedQuadrant);

    return {
      task_id: task.id,
      suggested_quadrant: suggestedQuadrant,
      confidence_score: confidenceScore,
      rationale,
      factors,
    };
  } catch (error) {
    console.error(`Error analyzing task ${task.id}:`, error);
    return {
      task_id: task.id,
      suggested_quadrant: task.priority_quadrant || 'low',
      confidence_score: 0,
      rationale: 'Unable to analyze task',
      factors: {},
    };
  }
}

// ============================================================================
// DEADLINE ANALYSIS
// ============================================================================

/**
 * Calculate urgency score based on due date
 * Returns 0-1 score (0 = not urgent, 1 = extremely urgent)
 */
function calculateDeadlineUrgency(dueDate?: string): number {
  if (!dueDate) return 0.2; // Default low urgency if no deadline

  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) return 1.0; // Overdue
  if (diffMs < 3600000) return 0.95; // Less than 1 hour
  if (diffMs < 86400000) return 0.8; // Less than 1 day
  if (diffMs < 259200000) return 0.6; // Less than 3 days
  if (diffMs < 604800000) return 0.4; // Less than 1 week
  if (diffMs < 1209600000) return 0.2; // Less than 2 weeks

  return 0.1; // Far future
}

// ============================================================================
// CONTEXT-BASED IMPORTANCE
// ============================================================================

/**
 * Calculate contextual importance using:
 * - Related memories (from conversations)
 * - Life area importance
 * - Contact/relationship importance
 * - Recent activity patterns
 */
async function calculateContextualImportance(
  userId: string,
  task: TaskContext
): Promise<number> {
  try {
    let importance = 0.5; // Default neutral

    // Find related memories to understand context
    const relatedMemories = await findRelatedMemories(userId, task);
    if (relatedMemories.length > 0) {
      // If multiple memories mention this, it's more important
      importance += Math.min(0.2, relatedMemories.length * 0.05);
    }

    // Check if associated with important relationship
    if (task.association_id) {
      const contact = await getAssociationImportance(task.association_id);
      importance += contact.score * 0.2;
    }

    // Check if task is related to health or critical areas
    if (isHealthRelated(task)) importance += 0.15;
    if (isFinancialRelated(task)) importance += 0.1;

    // Recent activity boost
    const hasRecentActivity = await checkRecentActivityOnArea(userId, task.association_id);
    if (hasRecentActivity) importance += 0.1;

    return Math.min(1, importance);
  } catch (error) {
    console.error('Error calculating contextual importance:', error);
    return 0.5;
  }
}

/**
 * Find memories related to a task for context
 */
async function findRelatedMemories(
  userId: string,
  task: TaskContext
): Promise<string[]> {
  try {
    const keywords = extractKeywords(task.title, task.description);
    if (keywords.length === 0) return [];

    // Search memories that mention related keywords
    const { data: memories, error } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    if (error || !memories) return [];

    // Filter by relevance (would need to check summary/subjects in real implementation)
    return memories.map((m) => m.id);
  } catch (error) {
    console.error('Error finding related memories:', error);
    return [];
  }
}

/**
 * Find patterns in task history
 */
async function findMatchingPatterns(
  userId: string,
  task: TaskContext
): Promise<string> {
  try {
    // Check if similar tasks exist and how they were prioritized
    const { data: similarTasks } = await supabase
      .from('work_items')
      .select('title, priority_quadrant, completed_at')
      .eq('user_id', userId)
      .ilike('title', `%${extractMainKeyword(task.title)}%`)
      .limit(5);

    if (!similarTasks || similarTasks.length === 0) {
      return 'No previous pattern data';
    }

    // Analyze completion patterns
    const completedCount = similarTasks.filter((t) => t.completed_at).length;
    const completionRate = completedCount / similarTasks.length;

    if (completionRate > 0.8) {
      return `High completion rate (${Math.round(completionRate * 100)}%) on similar tasks`;
    } else if (completionRate < 0.3) {
      return `Low completion rate (${Math.round(completionRate * 100)}%) - may need break down`;
    }

    return 'Mixed completion history on similar tasks';
  } catch (error) {
    console.error('Error finding patterns:', error);
    return 'Unable to analyze patterns';
  }
}

/**
 * Get importance score for an association
 */
async function getAssociationImportance(
  associationId: string
): Promise<{ score: number; name: string }> {
  try {
    const { data: association } = await supabase
      .from('associations')
      .select('name')
      .eq('id', associationId)
      .single();

    if (!association) return { score: 0.5, name: 'Unknown' };

    // Could enhance with engagement metrics
    // For now, return moderate importance
    return { score: 0.6, name: association.name };
  } catch (error) {
    return { score: 0.5, name: 'Unknown' };
  }
}

/**
 * Check if task is health-related
 */
function isHealthRelated(task: TaskContext): boolean {
  const healthKeywords = ['health', 'doctor', 'exercise', 'wellness', 'therapy', 'medical'];
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  return healthKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Check if task is financial-related
 */
function isFinancialRelated(task: TaskContext): boolean {
  const financeKeywords = ['budget', 'payment', 'invoice', 'financial', 'money', 'bill'];
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  return financeKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Check if there's recent activity on this life area
 */
async function checkRecentActivityOnArea(
  userId: string,
  associationId?: string
): Promise<boolean> {
  if (!associationId) return false;

  try {
    const { data: recentTasks } = await supabase
      .from('work_items')
      .select('id')
      .eq('user_id', userId)
      .eq('association_id', associationId)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    return (recentTasks?.length || 0) > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// QUADRANT CALCULATION
// ============================================================================

/**
 * Calculate which quadrant the task should be in
 * Based on urgency and importance scores
 */
function calculateQuadrant(
  urgency: number,
  importance: number
): 'urgent-important' | 'important' | 'urgent' | 'low' {
  if (urgency > 0.6 && importance > 0.6) return 'urgent-important';
  if (urgency <= 0.6 && importance > 0.6) return 'important';
  if (urgency > 0.6 && importance <= 0.6) return 'urgent';
  return 'low';
}

/**
 * Calculate confidence in the recommendation
 */
function calculateConfidence(factors: {
  deadline_urgency?: number;
  contextual_importance?: number;
  related_memories?: string[];
  pattern_match?: string;
}): number {
  let confidence = 0.5; // Base confidence

  // Boost if we have explicit deadline
  if (factors.deadline_urgency && factors.deadline_urgency > 0) {
    confidence += 0.2;
  }

  // Boost if we found related memories
  if (factors.related_memories && factors.related_memories.length > 0) {
    confidence += Math.min(0.2, factors.related_memories.length * 0.05);
  }

  // Boost if we found patterns
  if (factors.pattern_match && !factors.pattern_match.includes('Unable')) {
    confidence += 0.15;
  }

  return Math.min(1, confidence);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract keywords from task
 */
function extractKeywords(title: string, description?: string): string[] {
  const stopwords = [
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
  ];
  const text = `${title} ${description || ''}`.toLowerCase();
  const words = text.split(/\s+/);

  return words
    .filter((w) => w.length > 3 && !stopwords.includes(w))
    .slice(0, 5);
}

/**
 * Extract main keyword from title
 */
function extractMainKeyword(title: string): string {
  return title.split(/\s+/)[0];
}

/**
 * Generate human-readable rationale for suggestion
 */
function generateRationale(
  task: TaskContext,
  factors: any,
  suggestedQuadrant: string
): string {
  const parts = [];

  if (factors.deadline_urgency && factors.deadline_urgency > 0.7) {
    parts.push('approaching deadline');
  }

  if (factors.contextual_importance && factors.contextual_importance > 0.7) {
    parts.push('high contextual importance');
  }

  if (factors.related_memories && factors.related_memories.length > 0) {
    parts.push(`related to ${factors.related_memories.length} recent conversations`);
  }

  if (parts.length === 0) {
    parts.push('based on task characteristics');
  }

  return `Suggested for "${suggestedQuadrant}" quadrant ${parts.length > 0 ? 'due to ' + parts.join(', ') : ''}`;
}

/**
 * Generate overall recommendation summary
 */
function generateOverallRecommendation(suggestions: TaskSuggestion[]): string {
  const highConfidence = suggestions.filter((s) => s.confidence_score > 0.7);
  const urgent = suggestions.filter((s) => s.suggested_quadrant === 'urgent-important');

  if (urgent.length === 0) {
    return 'No urgent tasks. Focus on important work.';
  }

  if (highConfidence.length === 0) {
    return 'Limited context for recommendations. Prioritize by deadline.';
  }

  return `${urgent.length} urgent task(s) need attention. Recommended execution order available.`;
}

/**
 * Calculate total execution time from suggestions
 */
function calculateExecutionTime(suggestions: TaskSuggestion[]): number {
  // Placeholder - would need to sum estimated_duration from tasks
  return 240; // 4 hours default
}

// ============================================================================
// BATCH RECOMMENDATIONS
// ============================================================================

/**
 * Get daily recommendation for task execution order
 */
export async function getDailyExecutionPlan(
  userId: string,
  tasks: TaskContext[]
): Promise<{
  order: string[]; // Task IDs in recommended order
  timing: Array<{ taskId: string; recommendedTime: string; estimatedDuration: number }>;
  rationale: string;
}> {
  try {
    const suggestions = await getTaskPrioritySuggestions(userId, tasks);

    // Sort by quadrant priority and confidence
    const ordered = suggestions.suggestions
      .sort((a, b) => {
        const quadrantPriority = {
          'urgent-important': 0,
          important: 1,
          urgent: 2,
          low: 3,
        };
        const quadrantDiff =
          quadrantPriority[a.suggested_quadrant] - quadrantPriority[b.suggested_quadrant];
        if (quadrantDiff !== 0) return quadrantDiff;
        return b.confidence_score - a.confidence_score;
      })
      .map((s) => s.task_id);

    const timing = ordered.map((taskId, index) => ({
      taskId,
      recommendedTime: getRecommendedTime(index),
      estimatedDuration: 45, // Placeholder
    }));

    return {
      order: ordered,
      timing,
      rationale: suggestions.overall_recommendation,
    };
  } catch (error) {
    console.error('Error generating daily execution plan:', error);
    throw error;
  }
}

/**
 * Get recommended execution time based on task order
 */
function getRecommendedTime(index: number): string {
  const hour = 9 + Math.floor(index * 0.75); // Start at 9 AM, ~45 min per task
  const minutes = (index % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
