import { supabase } from '@/services/supabaseClient';
import type {
  VenturesMilestone,
  CreateMilestonePayload,
  UpdateMilestonePayload,
  MilestoneStatus,
  MilestoneCategory,
} from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('milestoneService');

/**
 * Milestone Service
 *
 * Handles all CRUD operations for Ventures milestones.
 */
export const milestoneService = {
  /**
   * Get all milestones for a specific entity
   */
  async getMilestonesByEntity(entityId: string): Promise<VenturesMilestone[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_milestones')
        .select('*')
        .eq('entity_id', entityId)
        .order('target_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false });

      if (error) {
        log.error('Error fetching milestones:', error);
        throw new Error(`Failed to fetch milestones: ${error.message}`);
      }

      return data as VenturesMilestone[];
    } catch (error) {
      log.error('Error in getMilestonesByEntity:', error);
      throw error;
    }
  },

  /**
   * Get milestones filtered by status
   */
  async getMilestonesByStatus(
    entityId: string,
    status: MilestoneStatus
  ): Promise<VenturesMilestone[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_milestones')
        .select('*')
        .eq('entity_id', entityId)
        .eq('status', status)
        .order('target_date', { ascending: true, nullsFirst: false });

      if (error) {
        log.error('Error fetching milestones by status:', error);
        throw new Error(`Failed to fetch milestones: ${error.message}`);
      }

      return data as VenturesMilestone[];
    } catch (error) {
      log.error('Error in getMilestonesByStatus:', error);
      throw error;
    }
  },

  /**
   * Get milestones filtered by category
   */
  async getMilestonesByCategory(
    entityId: string,
    category: MilestoneCategory
  ): Promise<VenturesMilestone[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_milestones')
        .select('*')
        .eq('entity_id', entityId)
        .eq('category', category)
        .order('target_date', { ascending: true, nullsFirst: false });

      if (error) {
        log.error('Error fetching milestones by category:', error);
        throw new Error(`Failed to fetch milestones: ${error.message}`);
      }

      return data as VenturesMilestone[];
    } catch (error) {
      log.error('Error in getMilestonesByCategory:', error);
      throw error;
    }
  },

  /**
   * Get active milestones (pending or in_progress)
   */
  async getActiveMilestones(entityId: string): Promise<VenturesMilestone[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_milestones')
        .select('*')
        .eq('entity_id', entityId)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('target_date', { ascending: true, nullsFirst: false });

      if (error) {
        log.error('Error fetching active milestones:', error);
        throw new Error(`Failed to fetch active milestones: ${error.message}`);
      }

      return data as VenturesMilestone[];
    } catch (error) {
      log.error('Error in getActiveMilestones:', error);
      throw error;
    }
  },

  /**
   * Get a single milestone by ID
   */
  async getMilestoneById(milestoneId: string): Promise<VenturesMilestone> {
    try {
      const { data, error } = await supabase
        .from('ventures_milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

      if (error) {
        log.error('Error fetching milestone:', error);
        throw new Error(`Failed to fetch milestone: ${error.message}`);
      }

      if (!data) {
        throw new Error('Milestone not found');
      }

      return data as VenturesMilestone;
    } catch (error) {
      log.error('Error in getMilestoneById:', error);
      throw error;
    }
  },

  /**
   * Create a new milestone
   */
  async createMilestone(payload: CreateMilestonePayload): Promise<VenturesMilestone> {
    try {
      const { data, error } = await supabase
        .from('ventures_milestones')
        .insert({
          ...payload,
          status: payload.status ?? 'pending',
          priority: payload.priority ?? 'medium',
          progress_pct: payload.progress_pct ?? 0,
        })
        .select()
        .single();

      if (error) {
        log.error('Error creating milestone:', error);
        throw new Error(`Failed to create milestone: ${error.message}`);
      }

      return data as VenturesMilestone;
    } catch (error) {
      log.error('Error in createMilestone:', error);
      throw error;
    }
  },

  /**
   * Update an existing milestone
   */
  async updateMilestone(
    milestoneId: string,
    payload: UpdateMilestonePayload
  ): Promise<VenturesMilestone> {
    try {
      // If status is being set to 'achieved', automatically set achieved_at
      const updates: UpdateMilestonePayload & { achieved_at?: string } = { ...payload };
      if (payload.status === 'achieved' && !payload.achieved_at) {
        updates.achieved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('ventures_milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) {
        log.error('Error updating milestone:', error);
        throw new Error(`Failed to update milestone: ${error.message}`);
      }

      if (!data) {
        throw new Error('Milestone not found');
      }

      return data as VenturesMilestone;
    } catch (error) {
      log.error('Error in updateMilestone:', error);
      throw error;
    }
  },

  /**
   * Update milestone progress
   */
  async updateProgress(
    milestoneId: string,
    currentValue: number,
    progressPct: number
  ): Promise<VenturesMilestone> {
    try {
      // Automatically update status based on progress
      let status: MilestoneStatus = 'in_progress';
      if (progressPct === 0) {
        status = 'pending';
      } else if (progressPct >= 100) {
        status = 'achieved';
      }

      const updates: UpdateMilestonePayload & { achieved_at?: string } = {
        current_value: currentValue,
        progress_pct: Math.min(100, Math.max(0, progressPct)),
        status,
      };

      // Set achieved_at if milestone is complete
      if (status === 'achieved') {
        updates.achieved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('ventures_milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) {
        log.error('Error updating milestone progress:', error);
        throw new Error(`Failed to update milestone progress: ${error.message}`);
      }

      if (!data) {
        throw new Error('Milestone not found');
      }

      return data as VenturesMilestone;
    } catch (error) {
      log.error('Error in updateProgress:', error);
      throw error;
    }
  },

  /**
   * Delete a milestone
   */
  async deleteMilestone(milestoneId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ventures_milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) {
        log.error('Error deleting milestone:', error);
        throw new Error(`Failed to delete milestone: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in deleteMilestone:', error);
      throw error;
    }
  },

  /**
   * Get milestones that depend on a specific milestone
   */
  async getDependentMilestones(milestoneId: string): Promise<VenturesMilestone[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_milestones')
        .select('*')
        .eq('depends_on_milestone_id', milestoneId)
        .order('target_date', { ascending: true, nullsFirst: false });

      if (error) {
        log.error('Error fetching dependent milestones:', error);
        throw new Error(`Failed to fetch dependent milestones: ${error.message}`);
      }

      return data as VenturesMilestone[];
    } catch (error) {
      log.error('Error in getDependentMilestones:', error);
      throw error;
    }
  },
};
