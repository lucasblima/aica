/**
 * Workout Template Service
 *
 * CRUD operations for workout templates with filtering, search, and usage tracking
 */

import { supabase } from '@/services/supabaseClient';
import type {
  WorkoutTemplate,
  TemplateFilters,
  TemplateUsageStats,
  WorkoutIntensity,
} from '../types/flow';
import type {
  CreateWorkoutTemplateV2Input,
  UpdateWorkoutTemplateV2Input,
  WorkoutSeries,
} from '../types/series';
import { calculateTotalDuration } from '../types/series';

export class WorkoutTemplateService {
  /**
   * Get all templates for current user with optional filters
   */
  static async getTemplates(
    filters?: TemplateFilters
  ): Promise<{ data: WorkoutTemplate[] | null; error: any }> {
    try {
      let query = supabase
        .from('workout_templates')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.modality) {
        query = query.eq('modality', filters.modality);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.intensity) {
        query = query.eq('intensity', filters.intensity);
      }

      if (filters?.favorites_only) {
        query = query.eq('is_favorite', true);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tags.cs.{${filters.search}}`
        );
      }

      const { data, error } = await query;

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error fetching templates:', error);
      return { data: null, error };
    }
  }

  /**
   * Get single template by ID
   */
  static async getTemplateById(
    id: string
  ): Promise<{ data: WorkoutTemplate | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error fetching template:', error);
      return { data: null, error };
    }
  }

  /**
   * Get public templates (for inspiration/sharing)
   */
  static async getPublicTemplates(
    modality?: string
  ): Promise<{ data: WorkoutTemplate[] | null; error: any }> {
    try {
      let query = supabase
        .from('workout_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false })
        .limit(50);

      if (modality) {
        query = query.eq('modality', modality);
      }

      const { data, error } = await query;

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error fetching public templates:', error);
      return { data: null, error };
    }
  }

  /**
   * Create new template
   */
  static async createTemplate(
    input: CreateWorkoutTemplateV2Input
  ): Promise<{ data: WorkoutTemplate | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          ...input,
          user_id: userData.user.id,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error creating template:', error);
      return { data: null, error };
    }
  }

  /**
   * Update existing template
   */
  static async updateTemplate(
    input: UpdateWorkoutTemplateV2Input
  ): Promise<{ data: WorkoutTemplate | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('workout_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error updating template:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.from('workout_templates').delete().eq('id', id);

      return { error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error deleting template:', error);
      return { error };
    }
  }

  /**
   * Toggle favorite status
   */
  static async toggleFavorite(
    id: string,
    is_favorite: boolean
  ): Promise<{ data: WorkoutTemplate | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .update({ is_favorite, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();

      return { data: data ?? null, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error toggling favorite:', error);
      return { data: null, error };
    }
  }

  /**
   * Duplicate template (create copy)
   */
  static async duplicateTemplate(
    id: string
  ): Promise<{ data: WorkoutTemplate | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Get original template
      const { data: original, error: fetchError } = await this.getTemplateById(id);
      if (fetchError || !original) {
        return { data: null, error: fetchError };
      }

      // Create duplicate
      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          user_id: userData.user.id,
          name: `${original.name} (cópia)`,
          description: original.description,
          category: original.category,
          modality: original.modality,
          duration: original.duration,
          intensity: original.intensity,
          exercise_structure: original.exercise_structure,
          ftp_percentage: original.ftp_percentage,
          pace_zone: original.pace_zone,
          css_percentage: original.css_percentage,
          rpe: original.rpe,
          tags: original.tags,
          level: original.level,
          is_public: false,
          is_favorite: false,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error duplicating template:', error);
      return { data: null, error };
    }
  }

  /**
   * Get usage statistics for templates
   */
  static async getUsageStats(): Promise<{
    data: TemplateUsageStats[] | null;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, name, usage_count, updated_at')
        .order('usage_count', { ascending: false })
        .limit(20);

      if (error) return { data: null, error };

      const stats: TemplateUsageStats[] = data.map((template) => ({
        template_id: template.id,
        template_name: template.name,
        usage_count: template.usage_count,
        last_used_at: template.updated_at,
      }));

      return { data: stats, error: null };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error fetching usage stats:', error);
      return { data: null, error };
    }
  }

  /**
   * Bulk create templates (for import/seed)
   */
  static async bulkCreateTemplates(
    templates: CreateWorkoutTemplateV2Input[]
  ): Promise<{ data: WorkoutTemplate[] | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const templatesWithUser = templates.map((t) => ({
        ...t,
        user_id: userData.user.id,
      }));

      const { data, error } = await supabase
        .from('workout_templates')
        .insert(templatesWithUser)
        .select();

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error bulk creating templates:', error);
      return { data: null, error };
    }
  }

  // ==========================================================================
  // V2 METHODS (Series-based exercise structure)
  // ==========================================================================

  /**
   * Derive intensity from highest zone in series.
   * Strength (no zones) defaults to 'medium'.
   */
  private static deriveIntensityFromSeries(series: WorkoutSeries[]): WorkoutIntensity {
    let highest = 0;
    for (const s of series) {
      if ('zone' in s) {
        const num = parseInt(s.zone.replace('Z', ''), 10);
        if (num > highest) highest = num;
      }
    }
    if (highest === 0) return 'medium'; // strength or empty
    return `z${highest}` as WorkoutIntensity;
  }

  /**
   * Create template using V2 structure (warmup/series/cooldown)
   */
  static async createTemplateV2(
    input: CreateWorkoutTemplateV2Input,
    extras?: { coach_notes?: string }
  ): Promise<{ data: WorkoutTemplate | null; error: any }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const duration = input.exercise_structure?.series
        ? calculateTotalDuration(input.exercise_structure.series)
        : 0;

      const intensity = input.exercise_structure?.series?.length
        ? this.deriveIntensityFromSeries(input.exercise_structure.series)
        : 'medium';

      const insertData: Record<string, any> = {
        user_id: userData.user.id,
        name: input.name,
        description: input.description || null,
        modality: input.modality,
        category: input.category || 'main',
        duration,
        intensity,
        exercise_structure: input.exercise_structure,
      };

      if (extras?.coach_notes !== undefined) {
        insertData.coach_notes = extras.coach_notes || null;
      }

      const { data, error } = await supabase
        .from('workout_templates')
        .insert(insertData)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error creating V2 template:', error);
      return { data: null, error };
    }
  }

  /**
   * Update template using V2 structure
   */
  static async updateTemplateV2(
    input: UpdateWorkoutTemplateV2Input,
    extras?: { coach_notes?: string }
  ): Promise<{ data: WorkoutTemplate | null; error: any }> {
    try {
      const { id, ...updates } = input;

      const dbUpdates: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Recalculate duration and intensity if exercise_structure changed
      if (updates.exercise_structure?.series) {
        dbUpdates.duration = calculateTotalDuration(updates.exercise_structure.series);
        dbUpdates.intensity = this.deriveIntensityFromSeries(updates.exercise_structure.series);
      }

      if (extras?.coach_notes !== undefined) {
        dbUpdates.coach_notes = extras.coach_notes || null;
      }

      const { data, error } = await supabase
        .from('workout_templates')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[WorkoutTemplateService] Error updating V2 template:', error);
      return { data: null, error };
    }
  }
}
