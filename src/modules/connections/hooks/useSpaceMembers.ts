/**
 * useSpaceMembers Hook
 *
 * Manages members of a connection space.
 * Handles member CRUD operations and permission management.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { memberService } from '../services/memberService';
import type { ConnectionMember, AddMemberPayload, MemberRole } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('useSpaceMembers');

interface UseSpaceMembersReturn {
  members: ConnectionMember[];
  loading: boolean;
  error: Error | null;
  isAdmin: boolean;
  isAdminLoading: boolean;
  addMember: (payload: AddMemberPayload) => Promise<ConnectionMember>;
  removeMember: (memberId: string) => Promise<void>;
  updateRole: (memberId: string, role: MemberRole) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing space members
 *
 * @example
 * ```tsx
 * const { members, loading, isAdmin, addMember, removeMember, updateRole } = useSpaceMembers(spaceId);
 *
 * // Add a new member
 * await addMember({
 *   external_name: 'John Doe',
 *   external_email: 'john@example.com',
 *   role: 'member'
 * });
 *
 * // Update member role
 * await updateRole(memberId, 'admin');
 *
 * // Remove member
 * await removeMember(memberId);
 * ```
 */
export function useSpaceMembers(spaceId: string | undefined): UseSpaceMembersReturn {
  const { user } = useAuth();
  const [members, setMembers] = useState<ConnectionMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await memberService.getMembers(spaceId);
      setMembers(data);
    } catch (err) {
      setError(err as Error);
      log.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, spaceId]);

  // Check if current user is admin
  const checkIsAdmin = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      setIsAdminLoading(true);
      const adminStatus = await memberService.isAdmin(spaceId);
      setIsAdmin(adminStatus);
    } catch (err) {
      log.error('Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setIsAdminLoading(false);
    }
  }, [user?.id, spaceId]);

  // Add new member
  const addMember = useCallback(
    async (payload: AddMemberPayload): Promise<ConnectionMember> => {
      if (!user?.id || !spaceId) throw new Error('User not authenticated or space ID missing');

      try {
        setLoading(true);
        setError(null);

        const newMember = await memberService.addMember(spaceId, payload);

        // Add to local state
        setMembers((prev) => [...prev, newMember]);

        return newMember;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, spaceId]
  );

  // Remove member
  const removeMember = useCallback(
    async (memberId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        await memberService.removeMember(memberId);

        // Remove from local state
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Update member role
  const updateRole = useCallback(
    async (memberId: string, role: MemberRole): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        setLoading(true);
        setError(null);

        const updatedMember = await memberService.updateRole(memberId, role);

        // Update local state
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? updatedMember : m))
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Refresh members
  const refresh = useCallback(async () => {
    await fetchMembers();
    await checkIsAdmin();
  }, [fetchMembers, checkIsAdmin]);

  // Auto-fetch on mount and when spaceId changes
  useEffect(() => {
    if (user?.id && spaceId) {
      fetchMembers();
      checkIsAdmin();
    }
  }, [user?.id, spaceId, fetchMembers, checkIsAdmin]);

  return {
    members,
    loading,
    error,
    isAdmin,
    isAdminLoading,
    addMember,
    removeMember,
    updateRole,
    refresh,
  };
}

export default useSpaceMembers;
