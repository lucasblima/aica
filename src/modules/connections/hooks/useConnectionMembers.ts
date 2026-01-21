import { useState, useEffect, useCallback, useMemo } from 'react';
import * as memberService from '../services/connectionMemberService';
import type {
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('useConnectionMembers');
  ConnectionMember,
  AddMemberPayload,
  MemberRole
} from '../types';

interface UseConnectionMembersOptions {
  spaceId: string;
  autoFetch?: boolean;
}

interface UseConnectionMembersReturn {
  members: ConnectionMember[];
  isLoading: boolean;
  error: Error | null;

  // CRUD operations
  add: (input: Omit<AddMemberPayload, 'space_id'>) => Promise<ConnectionMember>;
  updateRole: (memberId: string, role: MemberRole) => Promise<void>;
  updateContext: (memberId: string, label: string, data: Record<string, unknown>) => Promise<void>;
  remove: (memberId: string) => Promise<void>;

  // Utilities
  refresh: () => Promise<void>;
  getById: (memberId: string) => ConnectionMember | undefined;

  // Computed
  byRole: Record<MemberRole, ConnectionMember[]>;
  owners: ConnectionMember[];
  admins: ConnectionMember[];
  totalCount: number;
}

export function useConnectionMembers(
  options: UseConnectionMembersOptions
): UseConnectionMembersReturn {
  const { spaceId, autoFetch = true } = options;

  const [members, setMembers] = useState<ConnectionMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!spaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await memberService.getSpaceMembers(spaceId);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch members'));
      log.error('[useConnectionMembers] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (autoFetch && spaceId) {
      fetchMembers();
    }
  }, [autoFetch, spaceId, fetchMembers]);

  const add = useCallback(async (input: Omit<AddMemberPayload, 'space_id'>) => {
    const newMember = await memberService.addMember({ ...input, space_id: spaceId });
    setMembers(prev => [...prev, newMember]);
    return newMember;
  }, [spaceId]);

  const updateRole = useCallback(async (memberId: string, role: MemberRole) => {
    await memberService.updateMemberRole(memberId, role);
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, role } : m
    ));
  }, []);

  const updateContext = useCallback(async (
    memberId: string,
    label: string,
    data: Record<string, unknown>
  ) => {
    await memberService.updateMemberContext(memberId, label, data);
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, context_label: label, context_data: data } : m
    ));
  }, []);

  const remove = useCallback(async (memberId: string) => {
    await memberService.removeMember(memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }, []);

  const getById = useCallback((memberId: string) => {
    return members.find(m => m.id === memberId);
  }, [members]);

  // Computed values
  const byRole = useMemo(() => ({
    owner: members.filter(m => m.role === 'owner'),
    admin: members.filter(m => m.role === 'admin'),
    member: members.filter(m => m.role === 'member'),
    guest: members.filter(m => m.role === 'guest'),
  }), [members]);

  const owners = useMemo(() => members.filter(m => m.role === 'owner'), [members]);
  const admins = useMemo(() => members.filter(m => m.role === 'admin'), [members]);

  return {
    members,
    isLoading,
    error,
    add,
    updateRole,
    updateContext,
    remove,
    refresh: fetchMembers,
    getById,
    byRole,
    owners,
    admins,
    totalCount: members.length,
  };
}

export default useConnectionMembers;
