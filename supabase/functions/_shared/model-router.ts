/**
 * Model Router — Intelligent AI Model Selection
 *
 * Routes AI calls to the most cost-efficient model based on complexity level.
 * Implements automatic escalation when low-confidence responses are detected.
 *
 * Usage:
 *   import { callAI } from '../_shared/model-router.ts';
 *   const result = await callAI({ prompt, complexity: 'medium', expectJson: true });
 *
 * @see docs/OPENCLAW_ADAPTATION.md Section 3
 * @issue #252
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

// ============================================================================
// TYPES
// ============================================================================

export type ComplexityLevel = 'low' | 'medium' | 'high';

export interface CallAIOptions {
  prompt: string;
  systemPrompt?: string;
  complexity: ComplexityLevel;
  expectJson?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface CallAIResult {
  text: string;
  model: string;
  tokens: { input: number; output: number };
  latencyMs: number;
  wasEscalated: boolean;
  confidence: number;
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const MODEL_MAP: Record<ComplexityLevel, string> = {
  low: 'gemini-2.5-flash',
  medium: 'gemini-2.5-flash',
  high: 'gemini-2.5-pro',
};

const ESCALATION_MAP: Record<ComplexityLevel, string | null> = {
  low: null,
  medium: 'gemini-2.5-pro',
  high: null,
};

const TEMPERATURE_DEFAULTS: Record<ComplexityLevel, number> = {
  low: 0.1,
  medium: 0.3,
  high: 0.5,
};

const MAX_TOKENS_DEFAULTS: Record<ComplexityLevel, number> = {
  low: 512,
  medium: 2048,
  high: 4096,
};

const CONFIDENCE_THRESHOLD = 0.6;

// ============================================================================
// CONFIDENCE ASSESSMENT
// ============================================================================

/**
 * Assess the confidence of an AI response.
 * Returns a score between 0 and 1.
 */
export function assessConfidence(text: string, expectJson?: boolean): number {
  let score = 1.0;

  // Empty or very short response
  if (!text || text.trim().length === 0) return 0;
  if (text.trim().length < 20) score -= 0.3;

  // JSON validity check
  if (expectJson) {
    try {
      // Try to extract JSON from potential markdown fences
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                        text.match(/\{[\s\S]*\}/) ||
                        text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        JSON.parse(jsonStr);
      } else {
        score -= 0.4;
      }
    } catch {
      score -= 0.4;
    }
  }

  // Uncertainty signals
  const uncertaintyPhrases = [
    'i cannot', 'i\'m not sure', 'i don\'t know',
    'nao consigo', 'nao tenho certeza', 'nao sei',
    'unable to', 'not enough information',
  ];
  const lowerText = text.toLowerCase();
  for (const phrase of uncertaintyPhrases) {
    if (lowerText.includes(phrase)) {
      score -= 0.3;
      break;
    }
  }

  // Repetition detection
  const words = text.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 10) {
    const uniqueRatio = new Set(words).size / words.length;
    if (uniqueRatio < 0.3) score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Route an AI call to the most cost-efficient model.
 *
 * For 'medium' complexity: starts with Flash, escalates to Pro if confidence < 0.6.
 * For 'low': always Flash (no escalation).
 * For 'high': always Pro (no escalation).
 */
export async function callAI(options: CallAIOptions): Promise<CallAIResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const primaryModel = MODEL_MAP[options.complexity];
  const temperature = options.temperature ?? TEMPERATURE_DEFAULTS[options.complexity];
  const maxOutputTokens = options.maxOutputTokens ?? MAX_TOKENS_DEFAULTS[options.complexity];
  const startTime = Date.now();

  // Primary call
  let result = await callGeminiModel(genAI, primaryModel, options, temperature, maxOutputTokens);
  result.latencyMs = Date.now() - startTime;

  // Confidence-based escalation for medium complexity
  if (options.complexity === 'medium' && ESCALATION_MAP.medium) {
    const confidence = assessConfidence(result.text, options.expectJson);
    result.confidence = confidence;

    if (confidence < CONFIDENCE_THRESHOLD) {
      console.log(
        `[MODEL-ROUTER] Escalating ${primaryModel} → ${ESCALATION_MAP.medium} ` +
        `(confidence: ${confidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD})`
      );
      const escalatedResult = await callGeminiModel(
        genAI, ESCALATION_MAP.medium!, options, temperature, maxOutputTokens
      );
      escalatedResult.latencyMs = Date.now() - startTime;
      escalatedResult.wasEscalated = true;
      escalatedResult.confidence = assessConfidence(escalatedResult.text, options.expectJson);
      return escalatedResult;
    }
  } else {
    result.confidence = assessConfidence(result.text, options.expectJson);
  }

  return result;
}

// ============================================================================
// INTERNAL: Gemini API Call
// ============================================================================

async function callGeminiModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  options: CallAIOptions,
  temperature: number,
  maxOutputTokens: number,
): Promise<CallAIResult> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
    ...(options.systemPrompt ? { systemInstruction: options.systemPrompt } : {}),
  });

  const result = await model.generateContent(options.prompt);
  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  return {
    text,
    model: modelName,
    tokens: {
      input: usage?.promptTokenCount ?? 0,
      output: usage?.candidatesTokenCount ?? 0,
    },
    latencyMs: 0,
    wasEscalated: false,
    confidence: 0,
  };
}

// ============================================================================
// USE CASE COMPLEXITY MAP
// ============================================================================

/**
 * Maps action names to their recommended complexity level.
 * Used by Edge Functions to auto-select complexity.
 */
export const USE_CASE_TO_COMPLEXITY: Record<string, ComplexityLevel> = {
  // LOW — Fast, simple tasks (< 200ms target)
  'categorize_task': 'low',
  'suggest_priority': 'low',
  'generate_tags': 'low',
  'analyze_moment_sentiment': 'low',
  'extract_task_from_voice': 'low',
  'sentiment_analysis': 'low',

  // MEDIUM — Standard tasks (< 3s target)
  'chat_aica': 'medium',
  'finance_chat': 'medium',
  'extract_insights': 'medium',
  'generate_daily_question': 'medium',
  'suggest_guest': 'medium',
  'suggest_topic': 'medium',
  'analyze_news': 'medium',
  'refine_pauta_section': 'medium',
  'contact_context': 'medium',
  'analyze_moment': 'medium',
  'evaluate_quality': 'medium',

  // HIGH — Complex reasoning (< 15s target)
  'run_life_council': 'high',
  'synthesize_patterns': 'high',
  'generate_field_content': 'high',
  'generate_dossier': 'high',
  'generate_weekly_summary': 'high',
  'generate_pauta_outline': 'high',
  'generate_pauta_questions': 'high',
  'enrich_pauta_with_sources': 'high',
  'deep_research': 'high',
  'research_guest': 'high',
  'analyze_spending': 'high',
  'predict_expenses': 'high',
  'parse_statement': 'high',
  'daily_report': 'high',
  'weekly_summary': 'high',
};

/**
 * Get the recommended complexity level for an action.
 * Defaults to 'medium' for unknown actions.
 */
export function getComplexityForAction(action: string): ComplexityLevel {
  return USE_CASE_TO_COMPLEXITY[action] || 'medium';
}

// ============================================================================
// JSON EXTRACTION HELPER (shared across Edge Functions)
// ============================================================================

/**
 * Extract JSON from AI response text, handling markdown fences and preamble.
 * Reuses the proven extractJSON pattern from gemini-chat.
 */
export function extractJSON<T = unknown>(text: string): T {
  // 1. Strip code fences FIRST
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').trim()

  // 2. Try direct parse
  try {
    return JSON.parse(cleaned)
  } catch {
    // continue to fallback strategies
  }

  // 3. Try both { } and [ ] candidates in order of first appearance
  const candidates = [
    { start: cleaned.indexOf('{'), endChar: '}' },
    { start: cleaned.indexOf('['), endChar: ']' },
  ]
    .filter(({ start }) => start >= 0)
    .sort((a, b) => a.start - b.start)

  for (const { start, endChar } of candidates) {
    const end = cleaned.lastIndexOf(endChar)
    if (end <= start) continue
    try {
      return JSON.parse(cleaned.slice(start, end + 1))
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Failed to extract JSON from AI response: ${text.substring(0, 200)}...`)
}
