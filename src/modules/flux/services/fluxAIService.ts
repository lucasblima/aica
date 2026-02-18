/**
 * Flux AI Service — Wraps the flux-training-analysis Edge Function
 *
 * Provides typed methods for AI-powered training analysis:
 *   - analyzeLoad: Weekly load analysis with suggestions and adjustments
 *   - suggestRecovery: Recovery strategies based on fatigue
 *   - weeklySummary: Narrative weekly training summary
 */

import { supabase } from '@/services/supabaseClient';
import type { WorkoutBlockData } from '../components/canvas/WorkoutBlock';
import type { AthleteLevel } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface LoadSuggestion {
  type: 'warning' | 'success' | 'info';
  text: string;
}

export interface LoadAdjustmentAI {
  dayOfWeek: number;
  workoutId: string;
  adjustment: 'reduce' | 'increase' | 'remove';
  percentage?: number;
  reason: string;
}

export interface LoadAnalysisResult {
  suggestions: LoadSuggestion[];
  adjustments: LoadAdjustmentAI[];
  loadLevel: 'low' | 'moderate' | 'high' | 'overload';
  tssEstimate: number;
  narrative: string;
}

export interface RecoveryResult {
  suggestions: LoadSuggestion[];
  narrative: string;
}

export interface WeeklySummaryResult {
  summary: string;
  highlights: string[];
}

// ============================================================================
// SERVICE
// ============================================================================

export class FluxAIService {
  /**
   * Analyze weekly training load using AI.
   * Returns personalized suggestions, adjustments, and a narrative summary.
   */
  static async analyzeLoad(
    weekWorkouts: WorkoutBlockData[],
    athleteProfile: {
      level: AthleteLevel;
      ftp?: number;
      pace_threshold?: string;
    },
  ): Promise<LoadAnalysisResult> {
    const { data, error } = await supabase.functions.invoke('flux-training-analysis', {
      body: {
        action: 'analyze_load',
        payload: { weekWorkouts, athleteProfile },
      },
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'AI analysis failed');
    }

    return data.data as LoadAnalysisResult;
  }

  /**
   * Get AI-powered recovery suggestions based on recent workouts and fatigue.
   */
  static async suggestRecovery(
    recentWorkouts: WorkoutBlockData[],
    fatigueLevel: number,
    sleepQuality?: number,
  ): Promise<RecoveryResult> {
    const { data, error } = await supabase.functions.invoke('flux-training-analysis', {
      body: {
        action: 'suggest_recovery',
        payload: { recentWorkouts, fatigueLevel, sleepQuality },
      },
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Recovery suggestion failed');
    }

    return data.data as RecoveryResult;
  }

  /**
   * Generate a narrative weekly training summary.
   */
  static async weeklySummary(
    weekWorkouts: WorkoutBlockData[],
    athleteLevel: AthleteLevel,
  ): Promise<WeeklySummaryResult> {
    const { data, error } = await supabase.functions.invoke('flux-training-analysis', {
      body: {
        action: 'weekly_training_summary',
        payload: { weekWorkouts, athleteLevel },
      },
    });

    if (error) {
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Weekly summary failed');
    }

    return data.data as WeeklySummaryResult;
  }
}
