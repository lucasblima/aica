/**
 * Exercise Service
 *
 * CRUD operations for the exercises table.
 * Supports filtering by modality, category, and search.
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { ExerciseCategory, TrainingModality } from '../types/flux';

const log = createNamespacedLogger('ExerciseService');

// ============================================================================
// Types
// ============================================================================

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: ExerciseCategory;
  modality: string;
  muscle_groups: string[];
  equipment: string[];
  difficulty_level: 'iniciante' | 'intermediario' | 'avancado';
  video_url: string | null;
  instructions: string | null;
  default_sets: number | null;
  default_reps: string | null;
  default_rest: string | null;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExerciseInput {
  name: string;
  description?: string;
  category: ExerciseCategory;
  modality: string;
  muscle_groups?: string[];
  equipment?: string[];
  difficulty_level?: 'iniciante' | 'intermediario' | 'avancado';
  video_url?: string;
  instructions?: string;
  default_sets?: number;
  default_reps?: string;
  default_rest?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface UpdateExerciseInput {
  id: string;
  name?: string;
  description?: string;
  category?: ExerciseCategory;
  modality?: string;
  muscle_groups?: string[];
  equipment?: string[];
  difficulty_level?: 'iniciante' | 'intermediario' | 'avancado';
  video_url?: string;
  instructions?: string;
  default_sets?: number;
  default_reps?: string;
  default_rest?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface ExerciseFilters {
  modality?: string;
  category?: ExerciseCategory;
  difficulty_level?: 'iniciante' | 'intermediario' | 'avancado';
  search?: string;
  include_public?: boolean;
}

// ============================================================================
// Service
// ============================================================================

export class ExerciseService {
  /**
   * Get exercises for the current user with optional filters.
   * Always includes public exercises when include_public is true (default).
   */
  static async getExercises(
    filters?: ExerciseFilters
  ): Promise<{ data: Exercise[] | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      let query = supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      // Show own exercises + public exercises by default
      const includePublic = filters?.include_public !== false;
      if (includePublic) {
        query = query.or(`user_id.eq.${userData.user.id},is_public.eq.true`);
      } else {
        query = query.eq('user_id', userData.user.id);
      }

      if (filters?.modality) {
        query = query.eq('modality', filters.modality);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      log.error('Error fetching exercises:', error);
      return { data: null, error };
    }
  }

  /**
   * Get a single exercise by ID
   */
  static async getExerciseById(
    id: string
  ): Promise<{ data: Exercise | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      log.error('Error fetching exercise:', error);
      return { data: null, error };
    }
  }

  /**
   * Create a new exercise
   */
  static async createExercise(
    input: CreateExerciseInput
  ): Promise<{ data: Exercise | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          ...input,
          user_id: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      log.info('Created exercise', { id: data.id, name: input.name });
      return { data, error: null };
    } catch (error) {
      log.error('Error creating exercise:', error);
      return { data: null, error };
    }
  }

  /**
   * Update an existing exercise (own exercises only)
   */
  static async updateExercise(
    input: UpdateExerciseInput
  ): Promise<{ data: Exercise | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      log.info('Updated exercise', { id });
      return { data, error: null };
    } catch (error) {
      log.error('Error updating exercise:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete an exercise (own exercises only)
   */
  static async deleteExercise(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;

      log.info('Deleted exercise', { id });
      return { error: null };
    } catch (error) {
      log.error('Error deleting exercise:', error);
      return { error };
    }
  }

  /**
   * Get exercises grouped by category for a given modality
   */
  static async getExercisesByCategory(
    modality: string
  ): Promise<{ data: Record<string, Exercise[]> | null; error: any }> {
    const { data, error } = await this.getExercises({ modality });

    if (error || !data) return { data: null, error };

    const grouped: Record<string, Exercise[]> = {};
    for (const exercise of data) {
      if (!grouped[exercise.category]) {
        grouped[exercise.category] = [];
      }
      grouped[exercise.category].push(exercise);
    }

    return { data: grouped, error: null };
  }
}
