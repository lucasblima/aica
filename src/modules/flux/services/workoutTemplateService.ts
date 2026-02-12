/**
 * Workout Template Service
 *
 * CRUD operations for workout templates with filtering, search, and usage tracking
 */

import { supabase } from '@/services/supabaseClient';
import type {
  WorkoutTemplate,
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  TemplateFilters,
  TemplateUsageStats,
} from '../types/flow';

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
    input: CreateWorkoutTemplateInput
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
    input: UpdateWorkoutTemplateInput
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
        .single();

      return { data, error };
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
    templates: CreateWorkoutTemplateInput[]
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
}
