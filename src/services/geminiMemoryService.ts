/**
 * Gemini Memory Service
 *
 * Handles AI-powered extraction of insights from messages:
 * 1. Sentiment analysis
 * 2. Trigger identification (psychological/contextual triggers)
 * 3. Subject categorization (life areas)
 * 4. Summary generation
 * 5. Importance scoring
 * 6. Embedding generation for semantic search
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ExtractedInsight } from '../types/memoryTypes';

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
 */
export async function extractMessageInsights(
  messageText: string
): Promise<ExtractedInsight> {
  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const systemPrompt = `You are an AI that analyzes WhatsApp messages and extracts structured psychological and contextual insights.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks, no explanations.

Analyze the following message and extract insights:

Message: "${messageText}"

Respond with EXACTLY this JSON structure:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentiment_score": <number from -1 to 1>,
  "triggers": [<array of identified triggers from this list: ${COMMON_TRIGGERS.join(', ')}>],
  "subjects": [<array of life areas from this list: ${LIFE_SUBJECTS.join(', ')}>],
  "summary": "<concise summary of message meaning, max 500 chars>",
  "importance": <number from 0 to 1>,
  "suggested_memory_tags": [<array of useful tags>]
}

Guidelines:
- sentiment_score: -1 (very negative) to 1 (very positive)
- triggers: Only include triggers that are clearly present in the message
- subjects: Only include subjects that are clearly mentioned or implied
- importance: 0=trivial mention, 0.5=moderate relevance, 1=critical/urgent
- summary: Concise, focus on meaning not quoting, max 500 chars
- tags: Useful categorization for searching/filtering later`;

    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();

    // Parse JSON response
    const insight = parseInsightResponse(response);
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
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = client.getGenerativeModel({
      model: 'embedding-001',
    });

    const result = await model.embedContent(text);
    const embedding = result.embedding;

    if (!embedding || !embedding.values || embedding.values.length === 0) {
      throw new Error('Empty embedding received from Gemini');
    }

    return embedding.values;
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
 */
export async function generateDailyReportInsights(input: DailyReportInput): Promise<{
  summary: string;
  key_insights: string[];
  patterns_detected: string[];
  ai_recommendations: string[];
  suggested_focus_areas: string[];
}> {
  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const memoriesText = input.memories
      .map(
        (m) =>
          `- [${m.sentiment}] ${m.summary} (Triggers: ${m.triggers.join(', ') || 'none'})`
      )
      .join('\n');

    const prompt = `Analyze this day's activity and generate insights:

Date: ${input.date}
Tasks: ${input.tasks_completed}/${input.tasks_total} completed
Mood: ${input.mood || 'not recorded'}
Key Interactions: ${input.contacts_interacted.join(', ') || 'none'}

Memories & Interactions:
${memoriesText}

Generate a JSON response with:
{
  "summary": "<1-2 sentence summary of the day>",
  "key_insights": ["<insight1>", "<insight2>", "<insight3>"],
  "patterns_detected": ["<pattern1>", "<pattern2>"],
  "ai_recommendations": ["<recommendation1>", "<recommendation2>"],
  "suggested_focus_areas": ["<area1>", "<area2>"]
}

Focus on:
- Patterns in mood and interactions
- Productivity trends
- Relationship dynamics
- Stress levels
- Opportunities for improvement`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON response
    let insights;
    try {
      insights = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }

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
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const memoriesText = recentMemories
      .map((m) => `[${m.sentiment}] ${m.summary}`)
      .join('\n');

    const prompt = `Analyze the interaction history with ${contactName} and provide context:

Recent Interactions:
${memoriesText}

Generate JSON:
{
  "relationship_status": "close|friendly|professional|distant|conflicted",
  "key_topics": ["topic1", "topic2"],
  "sentiment_trend": "improving|stable|declining",
  "suggested_conversation_starters": ["starter1", "starter2"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    let context;
    try {
      context = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      context = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }

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
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const prompt = `Extract any suggested tasks or work items from this message:

"${messageText}"

Respond with JSON array:
[
  {
    "title": "Task title",
    "description": "Optional details",
    "priority": "urgent|high|medium|low"
  }
]

If no clear tasks, return empty array [].
Only include explicit or strongly implied action items.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    let items;
    try {
      items = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter((item) => item.title && item.priority).slice(0, 5);
  } catch (error) {
    console.error('Error extracting work items:', error);
    return [];
  }
}
