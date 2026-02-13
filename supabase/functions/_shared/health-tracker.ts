/**
 * AI Health Tracker — Auto-Correction System
 *
 * Monitors Edge Function AI call health and generates alerts
 * when prompts fail repeatedly (3+ consecutive failures → critical).
 *
 * Usage:
 *   import { withHealthTracking } from '../_shared/health-tracker.ts';
 *   const result = await withHealthTracking(
 *     { functionName: 'gemini-chat', actionName: 'chat_aica' },
 *     supabaseClient,
 *     async () => { return await callAI(...); }
 *   );
 *
 * @see docs/OPENCLAW_ADAPTATION.md Section 4
 * @issue #253
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================================================
// TYPES
// ============================================================================

export interface HealthTrackOptions {
  functionName: string;
  actionName: string;
  promptHash?: string;
}

interface TrackFailureResult {
  should_alert: boolean;
  consecutive_failures: number;
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Record a successful AI call.
 * Resets consecutive failure count and updates health status to 'healthy'.
 */
export async function trackSuccess(
  opts: HealthTrackOptions,
  supabaseClient: ReturnType<typeof createClient>,
): Promise<void> {
  try {
    await supabaseClient.rpc('track_ai_success', {
      p_function_name: opts.functionName,
      p_action_name: opts.actionName,
      p_prompt_hash: opts.promptHash || null,
    });
  } catch (error) {
    // Health tracking should never break the main flow
    console.warn(`[HEALTH-TRACKER] Failed to track success: ${error}`);
  }
}

/**
 * Record a failed AI call.
 * Increments consecutive failures and returns whether alert threshold was reached.
 */
export async function trackFailure(
  opts: HealthTrackOptions,
  error: Error,
  context: Record<string, unknown>,
  supabaseClient: ReturnType<typeof createClient>,
): Promise<TrackFailureResult> {
  try {
    const { data, error: rpcError } = await supabaseClient.rpc('track_ai_failure', {
      p_function_name: opts.functionName,
      p_action_name: opts.actionName,
      p_error_message: error.message.substring(0, 500),
      p_error_context: context,
    });

    if (rpcError) {
      console.warn(`[HEALTH-TRACKER] RPC error: ${rpcError.message}`);
      return { should_alert: false, consecutive_failures: 0 };
    }

    const result = data?.[0] || { should_alert: false, consecutive_failures: 0 };

    if (result.should_alert) {
      console.error(
        `[AUTO-CORRECTION] ALERT: ${opts.functionName}/${opts.actionName} ` +
        `has ${result.consecutive_failures} consecutive failures. ` +
        `Last error: ${error.message.substring(0, 200)}. ` +
        `Consider refactoring the prompt or checking the Gemini API status.`
      );
    }

    return result;
  } catch (trackError) {
    // Health tracking should never break the main flow
    console.warn(`[HEALTH-TRACKER] Failed to track failure: ${trackError}`);
    return { should_alert: false, consecutive_failures: 0 };
  }
}

// ============================================================================
// CONVENIENCE WRAPPER
// ============================================================================

/**
 * Wraps an async AI operation with automatic health tracking.
 * Tracks success on completion, failure on error.
 * Re-throws the original error after tracking.
 *
 * @example
 * const result = await withHealthTracking(
 *   { functionName: 'gemini-chat', actionName: 'chat_aica' },
 *   supabaseClient,
 *   async () => {
 *     return await callAI({ prompt: '...', complexity: 'medium' });
 *   }
 * );
 */
export async function withHealthTracking<T>(
  opts: HealthTrackOptions,
  supabaseClient: ReturnType<typeof createClient>,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    const result = await operation();
    // Fire-and-forget success tracking
    trackSuccess(opts, supabaseClient).catch(() => {});
    return result;
  } catch (error) {
    // Fire-and-forget failure tracking
    trackFailure(
      opts,
      error instanceof Error ? error : new Error(String(error)),
      { timestamp: new Date().toISOString() },
      supabaseClient,
    ).catch(() => {});
    throw error;
  }
}

// ============================================================================
// PROMPT HASH UTILITY
// ============================================================================

/**
 * Generate a simple hash of a prompt for tracking prompt versions.
 * Uses a basic djb2 hash — not cryptographic, just for comparison.
 */
export function hashPrompt(prompt: string): string {
  let hash = 5381;
  for (let i = 0; i < Math.min(prompt.length, 500); i++) {
    hash = ((hash << 5) + hash) + prompt.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `p_${Math.abs(hash).toString(36)}`;
}
