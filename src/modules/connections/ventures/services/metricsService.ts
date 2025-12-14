import { supabase } from '@/lib/supabase';
import type {
  VenturesMetrics,
  CreateMetricsPayload,
  UpdateMetricsPayload,
  PeriodType,
} from '../types';

/**
 * Metrics Service
 *
 * Handles all CRUD operations for Ventures financial metrics and KPIs.
 */
export const metricsService = {
  /**
   * Get all metrics for a specific entity
   */
  async getMetricsByEntity(entityId: string): Promise<VenturesMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_metrics')
        .select('*')
        .eq('entity_id', entityId)
        .order('period_start', { ascending: false });

      if (error) {
        console.error('Error fetching metrics:', error);
        throw new Error(`Failed to fetch metrics: ${error.message}`);
      }

      return data as VenturesMetrics[];
    } catch (error) {
      console.error('Error in getMetricsByEntity:', error);
      throw error;
    }
  },

  /**
   * Get metrics for a specific period type
   */
  async getMetricsByPeriodType(
    entityId: string,
    periodType: PeriodType
  ): Promise<VenturesMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_metrics')
        .select('*')
        .eq('entity_id', entityId)
        .eq('period_type', periodType)
        .order('period_start', { ascending: false });

      if (error) {
        console.error('Error fetching metrics by period type:', error);
        throw new Error(`Failed to fetch metrics: ${error.message}`);
      }

      return data as VenturesMetrics[];
    } catch (error) {
      console.error('Error in getMetricsByPeriodType:', error);
      throw error;
    }
  },

  /**
   * Get the current period metrics
   */
  async getCurrentMetrics(entityId: string): Promise<VenturesMetrics | null> {
    try {
      const { data, error } = await supabase
        .from('ventures_metrics')
        .select('*')
        .eq('entity_id', entityId)
        .eq('is_current', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current metrics:', error);
        throw new Error(`Failed to fetch current metrics: ${error.message}`);
      }

      return data as VenturesMetrics | null;
    } catch (error) {
      console.error('Error in getCurrentMetrics:', error);
      throw error;
    }
  },

  /**
   * Get a single metrics entry by ID
   */
  async getMetricsById(metricsId: string): Promise<VenturesMetrics> {
    try {
      const { data, error } = await supabase
        .from('ventures_metrics')
        .select('*')
        .eq('id', metricsId)
        .single();

      if (error) {
        console.error('Error fetching metrics:', error);
        throw new Error(`Failed to fetch metrics: ${error.message}`);
      }

      if (!data) {
        throw new Error('Metrics not found');
      }

      return data as VenturesMetrics;
    } catch (error) {
      console.error('Error in getMetricsById:', error);
      throw error;
    }
  },

  /**
   * Create new metrics entry
   */
  async createMetrics(payload: CreateMetricsPayload): Promise<VenturesMetrics> {
    try {
      // If this is marked as current, unset other current metrics for the same entity
      if (payload.is_current) {
        await supabase
          .from('ventures_metrics')
          .update({ is_current: false })
          .eq('entity_id', payload.entity_id);
      }

      const { data, error } = await supabase
        .from('ventures_metrics')
        .insert({
          ...payload,
          is_current: payload.is_current ?? false,
          is_projected: payload.is_projected ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating metrics:', error);
        throw new Error(`Failed to create metrics: ${error.message}`);
      }

      return data as VenturesMetrics;
    } catch (error) {
      console.error('Error in createMetrics:', error);
      throw error;
    }
  },

  /**
   * Update existing metrics
   */
  async updateMetrics(
    metricsId: string,
    payload: UpdateMetricsPayload
  ): Promise<VenturesMetrics> {
    try {
      // If setting this as current, get the entity_id first
      if (payload.is_current) {
        const { data: currentMetrics } = await supabase
          .from('ventures_metrics')
          .select('entity_id')
          .eq('id', metricsId)
          .single();

        if (currentMetrics) {
          // Unset other current metrics for the same entity
          await supabase
            .from('ventures_metrics')
            .update({ is_current: false })
            .eq('entity_id', currentMetrics.entity_id)
            .neq('id', metricsId);
        }
      }

      const { data, error } = await supabase
        .from('ventures_metrics')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', metricsId)
        .select()
        .single();

      if (error) {
        console.error('Error updating metrics:', error);
        throw new Error(`Failed to update metrics: ${error.message}`);
      }

      if (!data) {
        throw new Error('Metrics not found');
      }

      return data as VenturesMetrics;
    } catch (error) {
      console.error('Error in updateMetrics:', error);
      throw error;
    }
  },

  /**
   * Delete metrics entry
   */
  async deleteMetrics(metricsId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ventures_metrics')
        .delete()
        .eq('id', metricsId);

      if (error) {
        console.error('Error deleting metrics:', error);
        throw new Error(`Failed to delete metrics: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteMetrics:', error);
      throw error;
    }
  },

  /**
   * Get metrics history for charting (last N periods)
   */
  async getMetricsHistory(
    entityId: string,
    periodType: PeriodType,
    limit: number = 12
  ): Promise<VenturesMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('ventures_metrics')
        .select('*')
        .eq('entity_id', entityId)
        .eq('period_type', periodType)
        .eq('is_projected', false) // Only actual data, not projections
        .order('period_start', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching metrics history:', error);
        throw new Error(`Failed to fetch metrics history: ${error.message}`);
      }

      // Return in chronological order (oldest first)
      return (data as VenturesMetrics[]).reverse();
    } catch (error) {
      console.error('Error in getMetricsHistory:', error);
      throw error;
    }
  },
};
