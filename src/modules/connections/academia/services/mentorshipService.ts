import { supabase } from '@/lib/supabase';
import type {
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('mentorshipService');
  AcademiaMentorship,
  CreateMentorshipPayload,
  UpdateMentorshipPayload,
  MentorshipStatus,
  MentorshipRelationType,
} from '../types';

/**
 * Mentorship Service
 *
 * Handles all CRUD operations and business logic for Academia mentorships.
 * Supports both giving and receiving mentorship with session scheduling.
 */
export const mentorshipService = {
  /**
   * Get all mentorships for a space
   */
  async getMentorships(spaceId: string): Promise<AcademiaMentorship[]> {
    try {
      const { data, error } = await supabase
        .from('academia_mentorships')
        .select('*')
        .eq('space_id', spaceId)
        .order('status')
        .order('next_session_at', { ascending: true, nullsFirst: false });

      if (error) {
        log.error('Error fetching mentorships:', error);
        throw new Error(`Failed to fetch mentorships: ${error.message}`);
      }

      return data as AcademiaMentorship[];
    } catch (error) {
      log.error('Error in getMentorships:', error);
      throw error;
    }
  },

  /**
   * Get mentorships by type (giving or receiving)
   */
  async getMentorshipsByType(
    spaceId: string,
    relationType: MentorshipRelationType
  ): Promise<AcademiaMentorship[]> {
    try {
      const { data, error } = await supabase
        .from('academia_mentorships')
        .select('*')
        .eq('space_id', spaceId)
        .eq('relationship_type', relationType)
        .order('next_session_at', { ascending: true, nullsFirst: false });

      if (error) {
        log.error('Error fetching mentorships by type:', error);
        throw new Error(`Failed to fetch ${relationType} mentorships: ${error.message}`);
      }

      return data as AcademiaMentorship[];
    } catch (error) {
      log.error('Error in getMentorshipsByType:', error);
      throw error;
    }
  },

  /**
   * Get active mentorships
   */
  async getActiveMentorships(spaceId: string): Promise<AcademiaMentorship[]> {
    try {
      const { data, error } = await supabase
        .from('academia_mentorships')
        .select('*')
        .eq('space_id', spaceId)
        .eq('status', 'active')
        .order('next_session_at', { ascending: true, nullsFirst: false });

      if (error) {
        log.error('Error fetching active mentorships:', error);
        throw new Error(`Failed to fetch active mentorships: ${error.message}`);
      }

      return data as AcademiaMentorship[];
    } catch (error) {
      log.error('Error in getActiveMentorships:', error);
      throw error;
    }
  },

  /**
   * Get upcoming mentorship sessions (within next 7 days)
   */
  async getUpcomingSessions(spaceId: string): Promise<AcademiaMentorship[]> {
    try {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('academia_mentorships')
        .select('*')
        .eq('space_id', spaceId)
        .eq('status', 'active')
        .gte('next_session_at', now.toISOString())
        .lte('next_session_at', oneWeekFromNow.toISOString())
        .order('next_session_at', { ascending: true });

      if (error) {
        log.error('Error fetching upcoming sessions:', error);
        throw new Error(`Failed to fetch upcoming sessions: ${error.message}`);
      }

      return data as AcademiaMentorship[];
    } catch (error) {
      log.error('Error in getUpcomingSessions:', error);
      throw error;
    }
  },

  /**
   * Get a single mentorship by ID
   */
  async getMentorshipById(id: string): Promise<AcademiaMentorship> {
    try {
      const { data, error } = await supabase
        .from('academia_mentorships')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        log.error('Error fetching mentorship:', error);
        throw new Error(`Failed to fetch mentorship: ${error.message}`);
      }

      if (!data) {
        throw new Error('Mentorship not found');
      }

      return data as AcademiaMentorship;
    } catch (error) {
      log.error('Error in getMentorshipById:', error);
      throw error;
    }
  },

  /**
   * Create a new mentorship
   */
  async createMentorship(
    spaceId: string,
    payload: CreateMentorshipPayload
  ): Promise<AcademiaMentorship> {
    try {
      const mentorshipData = {
        space_id: spaceId,
        ...payload,
        duration_minutes: payload.duration_minutes || 60,
        objectives: payload.objectives || [],
        status: 'active' as MentorshipStatus,
      };

      const { data, error } = await supabase
        .from('academia_mentorships')
        .insert(mentorshipData)
        .select()
        .single();

      if (error) {
        log.error('Error creating mentorship:', error);
        throw new Error(`Failed to create mentorship: ${error.message}`);
      }

      return data as AcademiaMentorship;
    } catch (error) {
      log.error('Error in createMentorship:', error);
      throw error;
    }
  },

  /**
   * Update an existing mentorship
   */
  async updateMentorship(
    id: string,
    payload: UpdateMentorshipPayload
  ): Promise<AcademiaMentorship> {
    try {
      const updateData = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('academia_mentorships')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating mentorship:', error);
        throw new Error(`Failed to update mentorship: ${error.message}`);
      }

      if (!data) {
        throw new Error('Mentorship not found');
      }

      return data as AcademiaMentorship;
    } catch (error) {
      log.error('Error in updateMentorship:', error);
      throw error;
    }
  },

  /**
   * Schedule next session
   */
  async scheduleNextSession(id: string, sessionDate: string): Promise<AcademiaMentorship> {
    try {
      return this.updateMentorship(id, {
        next_session_at: sessionDate,
      });
    } catch (error) {
      log.error('Error in scheduleNextSession:', error);
      throw error;
    }
  },

  /**
   * Complete current session and optionally schedule next one
   */
  async completeSession(
    id: string,
    nextSessionDate?: string
  ): Promise<AcademiaMentorship> {
    try {
      return this.updateMentorship(id, {
        next_session_at: nextSessionDate,
      });
    } catch (error) {
      log.error('Error in completeSession:', error);
      throw error;
    }
  },

  /**
   * Pause a mentorship
   */
  async pauseMentorship(id: string): Promise<AcademiaMentorship> {
    try {
      return this.updateMentorship(id, {
        status: 'paused',
      });
    } catch (error) {
      log.error('Error in pauseMentorship:', error);
      throw error;
    }
  },

  /**
   * Resume a paused mentorship
   */
  async resumeMentorship(id: string): Promise<AcademiaMentorship> {
    try {
      return this.updateMentorship(id, {
        status: 'active',
      });
    } catch (error) {
      log.error('Error in resumeMentorship:', error);
      throw error;
    }
  },

  /**
   * Complete a mentorship
   */
  async completeMentorship(id: string): Promise<AcademiaMentorship> {
    try {
      return this.updateMentorship(id, {
        status: 'completed',
        ended_at: new Date().toISOString(),
      });
    } catch (error) {
      log.error('Error in completeMentorship:', error);
      throw error;
    }
  },

  /**
   * Delete a mentorship
   */
  async deleteMentorship(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('academia_mentorships')
        .delete()
        .eq('id', id);

      if (error) {
        log.error('Error deleting mentorship:', error);
        throw new Error(`Failed to delete mentorship: ${error.message}`);
      }
    } catch (error) {
      log.error('Error in deleteMentorship:', error);
      throw error;
    }
  },

  /**
   * Get mentorship statistics for a space
   */
  async getMentorshipStats(spaceId: string): Promise<{
    total: number;
    active: number;
    giving: number;
    receiving: number;
    upcomingSessions: number;
  }> {
    try {
      const mentorships = await this.getMentorships(spaceId);
      const upcomingSessions = await this.getUpcomingSessions(spaceId);

      return {
        total: mentorships.length,
        active: mentorships.filter((m) => m.status === 'active').length,
        giving: mentorships.filter((m) => m.relationship_type === 'giving').length,
        receiving: mentorships.filter((m) => m.relationship_type === 'receiving').length,
        upcomingSessions: upcomingSessions.length,
      };
    } catch (error) {
      log.error('Error in getMentorshipStats:', error);
      throw error;
    }
  },
};
