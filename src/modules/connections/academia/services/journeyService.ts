import { supabase } from '@/lib/supabase';
import type {
  AcademiaJourney,
  CreateJourneyPayload,
  UpdateJourneyPayload,
  JourneyStatus,
} from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('journeyService');

/**
 * Journey Service
 *
 * Handles all CRUD operations and business logic for Academia learning journeys.
 * Supports courses, books, certifications, and other learning paths with progress tracking.
 */
export const journeyService = {
  /**
   * Get all journeys for a space
   * Ordered by: active first, then by creation date
   */
  async getJourneys(spaceId: string): Promise<AcademiaJourney[]> {
    try {
      const { data, error } = await supabase
        .from('academia_journeys')
        .select('*')
        .eq('space_id', spaceId)
        .order('status')
        .order('created_at', { ascending: false });

      if (error) {
        log.error('Error fetching journeys:', error);
        throw new Error(`Failed to fetch journeys: ${error.message}`);
      }

      return data as AcademiaJourney[];
    } catch (error) {
      log.error('Error in getJourneys:', error);
      throw error;
    }
  },

  /**
   * Get journeys filtered by status
   */
  async getJourneysByStatus(
    spaceId: string,
    status: JourneyStatus
  ): Promise<AcademiaJourney[]> {
    try {
      const { data, error } = await supabase
        .from('academia_journeys')
        .select('*')
        .eq('space_id', spaceId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        log.error('Error fetching journeys by status:', error);
        throw new Error(`Failed to fetch ${status} journeys: ${error.message}`);
      }

      return data as AcademiaJourney[];
    } catch (error) {
      log.error('Error in getJourneysByStatus:', error);
      throw error;
    }
  },

  /**
   * Get active journeys (currently in progress)
   */
  async getActiveJourneys(spaceId: string): Promise<AcademiaJourney[]> {
    return this.getJourneysByStatus(spaceId, 'active');
  },

  /**
   * Get a single journey by ID
   */
  async getJourneyById(id: string): Promise<AcademiaJourney> {
    try {
      const { data, error } = await supabase
        .from('academia_journeys')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        log.error('Error fetching journey:', error);
        throw new Error(`Failed to fetch journey: ${error.message}`);
      }

      if (!data) {
        throw new Error('Journey not found');
      }

      return data as AcademiaJourney;
    } catch (error) {
      log.error('Error in getJourneyById:', error);
      throw error;
    }
  },

  /**
   * Create a new journey
   */
  async createJourney(
    spaceId: string,
    payload: CreateJourneyPayload
  ): Promise<AcademiaJourney> {
    try {
      const journeyData = {
        space_id: spaceId,
        ...payload,
        completed_modules: 0,
        progress_pct: 0,
        logged_hours: 0,
        status: 'planned' as JourneyStatus,
      };

      const { data, error } = await supabase
        .from('academia_journeys')
        .insert(journeyData)
        .select()
        .single();

      if (error) {
        log.error('Error creating journey:', error);
        throw new Error(`Failed to create journey: ${error.message}`);
      }

      return data as AcademiaJourney;
    } catch (error) {
      log.error('Error in createJourney:', error);
      throw error;
    }
  },

  /**
   * Update an existing journey
   */
  async updateJourney(
    id: string,
    payload: UpdateJourneyPayload
  ): Promise<AcademiaJourney> {
    try {
      const updateData = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('academia_journeys')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating journey:', error);
        throw new Error(`Failed to update journey: ${error.message}`);
      }

      if (!data) {
        throw new Error('Journey not found');
      }

      return data as AcademiaJourney;
    } catch (error) {
      log.error('Error in updateJourney:', error);
      throw error;
    }
  },

  /**
   * Update journey progress
   * Automatically calculates progress percentage if total_modules is set
   */
  async updateProgress(
    id: string,
    completedModules: number
  ): Promise<AcademiaJourney> {
    try {
      // First fetch the journey to get total_modules
      const journey = await this.getJourneyById(id);

      const updateData: UpdateJourneyPayload = {
        completed_modules: completedModules,
      };

      // Calculate progress percentage if total_modules is known
      if (journey.total_modules && journey.total_modules > 0) {
        updateData.progress_pct = Math.round(
          (completedModules / journey.total_modules) * 100
        );
      }

      // Auto-complete if all modules are done
      if (
        journey.total_modules &&
        completedModules >= journey.total_modules &&
        journey.status !== 'completed'
      ) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
      }

      return this.updateJourney(id, updateData);
    } catch (error) {
      log.error('Error in updateProgress:', error);
      throw error;
    }
  },

  /**
   * Log time spent on a journey
   */
  async logTime(id: string, hoursToAdd: number): Promise<AcademiaJourney> {
    try {
      const journey = await this.getJourneyById(id);

      return this.updateJourney(id, {
        logged_hours: journey.logged_hours + hoursToAdd,
      });
    } catch (error) {
      log.error('Error in logTime:', error);
      throw error;
    }
  },

  /**
   * Start a journey (set status to active and set started_at)
   */
  async startJourney(id: string): Promise<AcademiaJourney> {
    try {
      return this.updateJourney(id, {
        status: 'active',
        started_at: new Date().toISOString(),
      });
    } catch (error) {
      log.error('Error in startJourney:', error);
      throw error;
    }
  },

  /**
   * Complete a journey
   */
  async completeJourney(id: string): Promise<AcademiaJourney> {
    try {
      return this.updateJourney(id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_pct: 100,
      });
    } catch (error) {
      log.error('Error in completeJourney:', error);
      throw error;
    }
  },

  /**
   * Pause a journey
   */
  async pauseJourney(id: string): Promise<AcademiaJourney> {
    try {
      return this.updateJourney(id, {
        status: 'paused',
      });
    } catch (error) {
      log.error('Error in pauseJourney:', error);
      throw error;
    }
  },

  /**
   * Resume a paused journey
   */
  async resumeJourney(id: string): Promise<AcademiaJourney> {
    try {
      return this.updateJourney(id, {
        status: 'active',
      });
    } catch (error) {
      log.error('Error in resumeJourney:', error);
      throw error;
    }
  },

  /**
   * Delete a journey
   */
  async deleteJourney(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('academia_journeys')
        .delete()
        .eq('id', id);

      if (error) {
        log.error('Error deleting journey:', error);
        throw new Error(`Failed to delete journey: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in deleteJourney:', error);
      throw error;
    }
  },

  /**
   * Get journey statistics for a space
   */
  async getJourneyStats(spaceId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    totalHoursLogged: number;
    averageProgress: number;
  }> {
    try {
      const journeys = await this.getJourneys(spaceId);

      const stats = {
        total: journeys.length,
        active: journeys.filter((j) => j.status === 'active').length,
        completed: journeys.filter((j) => j.status === 'completed').length,
        totalHoursLogged: journeys.reduce((sum, j) => sum + j.logged_hours, 0),
        averageProgress:
          journeys.length > 0
            ? Math.round(
                journeys.reduce((sum, j) => sum + j.progress_pct, 0) / journeys.length
              )
            : 0,
      };

      return stats;
    } catch (error) {
      log.error('Error in getJourneyStats:', error);
      throw error;
    }
  },
};
