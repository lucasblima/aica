/**
 * useMentorships Hook
 *
 * Manages mentorship relationships with session scheduling.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { mentorshipService } from '../services/mentorshipService';
import type {
  AcademiaMentorship,
  CreateMentorshipPayload,
  UpdateMentorshipPayload,
  MentorshipRelationType,
} from '../types';

interface UseMentorshipsOptions {
  spaceId: string;
  relationType?: MentorshipRelationType;
  autoFetch?: boolean;
}

interface UseMentorshipsReturn {
  mentorships: AcademiaMentorship[];
  loading: boolean;
  error: Error | null;
  createMentorship: (payload: CreateMentorshipPayload) => Promise<AcademiaMentorship>;
  updateMentorship: (
    id: string,
    payload: UpdateMentorshipPayload
  ) => Promise<AcademiaMentorship>;
  scheduleNextSession: (id: string, date: string) => Promise<AcademiaMentorship>;
  completeSession: (id: string, nextDate?: string) => Promise<AcademiaMentorship>;
  pauseMentorship: (id: string) => Promise<AcademiaMentorship>;
  resumeMentorship: (id: string) => Promise<AcademiaMentorship>;
  completeMentorship: (id: string) => Promise<AcademiaMentorship>;
  deleteMentorship: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing Academia mentorships
 *
 * @example
 * ```tsx
 * const { mentorships, loading, createMentorship, scheduleNextSession } = useMentorships({
 *   spaceId: 'space-123',
 *   relationType: 'receiving'
 * });
 *
 * // Create a new mentorship
 * await createMentorship({
 *   relationship_type: 'receiving',
 *   mentor_member_id: 'member-456',
 *   focus_areas: ['React', 'TypeScript'],
 *   frequency: 'weekly'
 * });
 * ```
 */
export function useMentorships(options: UseMentorshipsOptions): UseMentorshipsReturn {
  const { user } = useAuth();
  const { spaceId, relationType, autoFetch = true } = options;

  const [mentorships, setMentorships] = useState<AcademiaMentorship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch mentorships
  const fetchMentorships = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      setLoading(true);
      setError(null);

      const data = relationType
        ? await mentorshipService.getMentorshipsByType(spaceId, relationType)
        : await mentorshipService.getMentorships(spaceId);

      setMentorships(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching mentorships:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId, relationType]);

  // Create new mentorship
  const createMentorship = useCallback(
    async (payload: CreateMentorshipPayload): Promise<AcademiaMentorship> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const newMentorship = await mentorshipService.createMentorship(spaceId, payload);

        // Add to list if it matches current filter
        if (!relationType || newMentorship.relationship_type === relationType) {
          setMentorships((prev) => [newMentorship, ...prev]);
        }

        return newMentorship;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, spaceId, relationType]
  );

  // Update mentorship
  const updateMentorship = useCallback(
    async (
      id: string,
      payload: UpdateMentorshipPayload
    ): Promise<AcademiaMentorship> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updatedMentorship = await mentorshipService.updateMentorship(id, payload);

        setMentorships((prev) =>
          prev.map((mentorship) =>
            mentorship.id === id ? updatedMentorship : mentorship
          )
        );

        return updatedMentorship;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Schedule next session
  const scheduleNextSession = useCallback(
    async (id: string, date: string): Promise<AcademiaMentorship> => {
      return updateMentorship(id, { next_session_at: date });
    },
    [updateMentorship]
  );

  // Complete session
  const completeSession = useCallback(
    async (id: string, nextDate?: string): Promise<AcademiaMentorship> => {
      return updateMentorship(id, {
        next_session_at: nextDate,
      });
    },
    [updateMentorship]
  );

  // Pause mentorship
  const pauseMentorship = useCallback(
    async (id: string): Promise<AcademiaMentorship> => {
      return updateMentorship(id, { status: 'paused' });
    },
    [updateMentorship]
  );

  // Resume mentorship
  const resumeMentorship = useCallback(
    async (id: string): Promise<AcademiaMentorship> => {
      return updateMentorship(id, { status: 'active' });
    },
    [updateMentorship]
  );

  // Complete mentorship
  const completeMentorship = useCallback(
    async (id: string): Promise<AcademiaMentorship> => {
      return updateMentorship(id, {
        status: 'completed',
        ended_at: new Date().toISOString(),
      });
    },
    [updateMentorship]
  );

  // Delete mentorship
  const deleteMentorship = useCallback(
    async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await mentorshipService.deleteMentorship(id);

        setMentorships((prev) => prev.filter((mentorship) => mentorship.id !== id));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Refresh mentorships
  const refresh = useCallback(async () => {
    await fetchMentorships();
  }, [fetchMentorships]);

  // Auto-fetch on mount and dependencies change
  useEffect(() => {
    if (autoFetch && user?.id && spaceId) {
      fetchMentorships();
    }
  }, [autoFetch, user?.id, spaceId, fetchMentorships]);

  return {
    mentorships,
    loading,
    error,
    createMentorship,
    updateMentorship,
    scheduleNextSession,
    completeSession,
    pauseMentorship,
    resumeMentorship,
    completeMentorship,
    deleteMentorship,
    refresh,
  };
}

export default useMentorships;
