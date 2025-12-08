/**
 * Gemini Memory Service
 *
 * Refatorado para usar backend seguro via Edge Functions
 * - Remove API key exposta no frontend
 * - Usa GeminiClient para chamadas autenticadas
 * - Adiciona cache, retry e rate limiting automático
 *
 * Handles AI-powered extraction of insights from messages:
 * 1. Sentiment analysis
 * 2. Trigger identification (psychological/contextual triggers)
 * 3. Subject categorization (life areas)
 * 4. Summary generation
 * 5. Importance scoring
 * 6. Embedding generation for semantic search
 */

import { GeminiClient } from '@/lib/gemini';
import { ExtractedInsight } from '../types/memoryTypes';

// Initialize Gemini client
const geminiClient = GeminiClient.getInstance();

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SENTIMENTS = ['positive', 'negative', 'neutral', 'mixed'] as const;

const COMMON_TRIGGERS = [
  'work_deadline',
  'personal_stress',
  'celebration',
  'conflict',
  'achievement',
  'health_concern',
  'financial_concern',
  'relationship_issue',
  'learning_opportunity',
  'major_decision',
  'loss_or_grief',
  'unexpected_event',
  'social_interaction',
  'travel_or_change',
  'time_pressure',
];

const LIFE_SUBJECTS = [
  'work',
  'finances',
  'health',
  'relationships',
  'learning',
  'personal_growth',
  'family',
  'friends',
  'hobby',
  'spirituality',
  'career',
  'education',
  'wellness',
  'community',
];

// ============================================================================
// MESSAGE ANALYSIS
// ============================================================================

/**
 * Extract structured insights from a message using Gemini
 * Returns sentiment, triggers, subjects, summary, and importance score
 * Uses Edge Function backend for secure processing
 */
export async function extractMessageInsights(
  messageText: string
): Promise<ExtractedInsight> {
  try {
    const response = await geminiClient.call({
      action: 'extract_insights',
      payload: {
        messageText,
        validSentiments: VALID_SENTIMENTS,
        triggers: COMMON_TRIGGERS,
        subjects: LIFE_SUBJECTS
      },
      model: 'fast' // Fast model sufficient for sentiment analysis
    });

    // Parse and validate the response
    const insight = parseInsightResponse(
      typeof response.result === 'string' ? response.result : JSON.stringify(response.result)
    );
    return insight;
  } catch (error) {
    console.error('Error extracting message insights:', error);
    throw new Error(
      `Failed to extract insights from message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse and validate Gemini response
 */
function parseInsightResponse(response: string): ExtractedInsight {
  try {
    // Try direct JSON parse first
    let insight = JSON.parse(response);

    // If wrapped in markdown code blocks, extract JSON
    if (typeof insight === 'string') {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insight = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not find JSON in response');
      }
    }

    // Validate and sanitize
    return validateInsight(insight);
  } catch (error) {
    console.error('Error parsing insight response:', error);
    throw new Error(
      `Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate and sanitize extracted insight
 */
function validateInsight(data: any): ExtractedInsight {
  // Validate sentiment
  if (!VALID_SENTIMENTS.includes(data.sentiment)) {
    data.sentiment = 'neutral';
  }

  // Validate sentiment_score
  data.sentiment_score = Math.max(-1, Math.min(1, parseFloat(data.sentiment_score) || 0));

  // Validate and filter triggers
  if (!Array.isArray(data.triggers)) {
    data.triggers = [];
  }
  data.triggers = data.triggers.filter((t: string) =>
    COMMON_TRIGGERS.includes(t)
  );

  // Validate and filter subjects
  if (!Array.isArray(data.subjects)) {
    data.subjects = [];
  }
  data.subjects = data.subjects.filter((s: string) =>
    LIFE_SUBJECTS.includes(s)
  );

  // Validate summary
  if (!data.summary || typeof data.summary !== 'string') {
    data.summary = 'Message received';
  }
  data.summary = data.summary.substring(0, 500).trim();

  // Validate importance
  data.importance = Math.max(0, Math.min(1, parseFloat(data.importance) || 0.5));

  // Validate tags
  if (!Array.isArray(data.suggested_memory_tags)) {
    data.suggested_memory_tags = [];
  }
  data.suggested_memory_tags = data.suggested_memory_tags
    .filter((t: string) => typeof t === 'string' && t.length > 0)
    .slice(0, 10); // Max 10 tags

  return {
    sentiment: data.sentiment,
    sentiment_score: data.sentiment_score,
    triggers: data.triggers,
    subjects: data.subjects,
    summary: data.summary,
    importance: data.importance,
    suggested_memory_tags: data.suggested_memory_tags,
  };
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate vector embedding for a text using Gemini Embedding API
 * Used for semantic similarity search in memories
 * Uses Edge Function backend with latest embedding model (text-embedding-004)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await geminiClient.call({
      action: 'generate_embedding',
      payload: { text },
      model: 'embedding' // Uses text-embedding-004
    });

    const embedding = response.result;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Empty embedding received from backend');
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// MEMORY SIMILARITY SEARCH
// ============================================================================

/**
 * Calculate cosine similarity between two embeddings
 * Returns score between 0 and 1 (1 = identical, 0 = completely different)
 */
export function calculateSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimensions for similarity calculation');
  }

  const dotProduct = embedding1.reduce((sum, a, i) => sum + a * embedding2[i], 0);
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

// ============================================================================
// DAILY REPORT GENERATION
// ============================================================================

export interface DailyReportInput {
  date: string; // ISO date
  tasks_completed: number;
  tasks_total: number;
  mood?: string;
  memories: Array<{
    sentiment: string;
    triggers: string[];
    subjects: string[];
    summary: string;
  }>;
  contacts_interacted: string[]; // Contact names
}

/**
 * Generate AI insights for a daily report
 * Uses Edge Function backend for secure processing
 */
export async function generateDailyReportInsights(input: DailyReportInput): Promise<{
  summary: string;
  key_insights: string[];
  patterns_detected: string[];
  ai_recommendations: string[];
  suggested_focus_areas: string[];
}> {
  try {
    const response = await geminiClient.call({
      action: 'generate_daily_report',
      payload: input,
      model: 'smart' // Use smarter model for comprehensive analysis
    });

    // Parse the response
    const insights = typeof response.result === 'string'
      ? JSON.parse(response.result)
      : response.result;

    if (!insights) {
      throw new Error('Failed to parse daily report response');
    }

    // Ensure arrays
    return {
      summary: insights.summary || '',
      key_insights: Array.isArray(insights.key_insights) ? insights.key_insights : [],
      patterns_detected: Array.isArray(insights.patterns_detected) ? insights.patterns_detected : [],
      ai_recommendations: Array.isArray(insights.ai_recommendations)
        ? insights.ai_recommendations
        : [],
      suggested_focus_areas: Array.isArray(insights.suggested_focus_areas)
        ? insights.suggested_focus_areas
        : [],
    };
  } catch (error) {
    console.error('Error generating daily report insights:', error);
    throw new Error(
      `Failed to generate daily report: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// CONTACT CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract context about a contact from their memories
 * Used for intelligent conversation suggestions
 * Uses Edge Function backend for secure processing
 */
export async function extractContactContext(
  contactName: string,
  recentMemories: Array<{
    sentiment: string;
    summary: string;
    triggers: string[];
  }>
): Promise<{
  relationship_status: string;
  key_topics: string[];
  sentiment_trend: string;
  suggested_conversation_starters: string[];
}> {
  try {
    const response = await geminiClient.call({
      action: 'extract_contact_context',
      payload: {
        contactName,
        recentMemories
      },
      model: 'fast' // Fast model sufficient for context extraction
    });

    const context = typeof response.result === 'string'
      ? JSON.parse(response.result)
      : response.result;

    if (!context) {
      return {
        relationship_status: 'unknown',
        key_topics: [],
        sentiment_trend: 'unknown',
        suggested_conversation_starters: [],
      };
    }

    return {
      relationship_status: context.relationship_status || 'unknown',
      key_topics: Array.isArray(context.key_topics) ? context.key_topics : [],
      sentiment_trend: context.sentiment_trend || 'unknown',
      suggested_conversation_starters: Array.isArray(context.suggested_conversation_starters)
        ? context.suggested_conversation_starters
        : [],
    };
  } catch (error) {
    console.error('Error extracting contact context:', error);
    return {
      relationship_status: 'unknown',
      key_topics: [],
      sentiment_trend: 'unknown',
      suggested_conversation_starters: [],
    };
  }
}

// ============================================================================
// SUGGESTED WORK ITEMS
// ============================================================================

/**
 * Extract suggested work items/tasks from a message
 * Uses Edge Function backend for secure processing
 */
export async function extractSuggestedWorkItems(
  messageText: string
): Promise<
  Array<{
    title: string;
    description?: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }>
> {
  try {
    const response = await geminiClient.call({
      action: 'extract_work_items',
      payload: { messageText },
      model: 'fast' // Fast model sufficient for task extraction
    });

    const items = Array.isArray(response.result)
      ? response.result
      : (typeof response.result === 'string' ? JSON.parse(response.result) : []);

    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter((item) => item.title && item.priority).slice(0, 5);
  } catch (error) {
    console.error('Error extracting work items:', error);
    return [];
  }
}
