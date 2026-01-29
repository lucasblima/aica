/**
 * useInviteSystem Hook
 *
 * React hook for managing the viral invite system.
 * Provides invite stats, generation, and sharing functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getInviteStats,
  generateInviteToken,
  getInviteUrl,
  copyInviteLink,
  shareInvite,
  getReferralHistory,
  processPendingInvite,
  getPendingInvites,
  revokeInvite as revokeInviteService,
  type InviteStats,
  type Referral,
  type AcceptInviteResult
} from '../services/inviteSystemService';

interface UseInviteSystemReturn {
  // State
  stats: InviteStats | null;
  referrals: Referral[];
  pendingInvites: Referral[];
  loading: boolean;
  generating: boolean;
  revoking: string | null; // ID being revoked
  currentToken: string | null;
  currentUrl: string | null;

  // Actions
  generateInvite: () => Promise<string | null>;
  copyLink: () => Promise<boolean>;
  shareLink: () => Promise<boolean>;
  refreshStats: () => Promise<void>;
  refreshReferrals: () => Promise<void>;
  refreshPendingInvites: () => Promise<void>;
  revokeInvite: (referralId: string) => Promise<boolean>;

  // Computed
  hasInvites: boolean;
  availableCount: number;
  pendingCount: number;
}

export function useInviteSystem(): UseInviteSystemReturn {
  const { user, isAuthenticated } = useAuth();

  // State
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  // Computed
  const hasInvites = (stats?.available ?? 0) > 0;
  const availableCount = stats?.available ?? 0;
  const pendingCount = pendingInvites.length;
  const currentUrl = currentToken ? getInviteUrl(currentToken) : null;

  // Fetch stats on mount and auth change
  const refreshStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getInviteStats();
      setStats(data);
    } catch (error) {
      console.error('[useInviteSystem] Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch referral history
  const refreshReferrals = useCallback(async () => {
    if (!isAuthenticated) {
      setReferrals([]);
      return;
    }

    try {
      const data = await getReferralHistory();
      setReferrals(data);
    } catch (error) {
      console.error('[useInviteSystem] Error fetching referrals:', error);
    }
  }, [isAuthenticated]);

  // Fetch pending invites
  const refreshPendingInvites = useCallback(async () => {
    if (!isAuthenticated) {
      setPendingInvites([]);
      return;
    }

    try {
      const data = await getPendingInvites();
      setPendingInvites(data);
    } catch (error) {
      console.error('[useInviteSystem] Error fetching pending invites:', error);
    }
  }, [isAuthenticated]);

  // Revoke an invite
  const revokeInvite = useCallback(async (referralId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;

    setRevoking(referralId);
    try {
      const result = await revokeInviteService(referralId);

      if (result.success) {
        // Remove from pending list
        setPendingInvites(prev => prev.filter(r => r.id !== referralId));
        // Refresh stats to update available count
        await refreshStats();
        return true;
      } else {
        console.error('[useInviteSystem] Revoke failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[useInviteSystem] Error revoking invite:', error);
      return false;
    } finally {
      setRevoking(null);
    }
  }, [isAuthenticated, refreshStats]);

  // Generate new invite
  const generateInvite = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated || !hasInvites) return null;

    setGenerating(true);
    try {
      const result = await generateInviteToken();

      if (result.success && result.token) {
        setCurrentToken(result.token);
        // Refresh stats to update available count
        await refreshStats();
        return result.token;
      } else {
        console.error('[useInviteSystem] Generate failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('[useInviteSystem] Error generating invite:', error);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [isAuthenticated, hasInvites, refreshStats]);

  // Copy current link to clipboard
  const copyLink = useCallback(async (): Promise<boolean> => {
    if (!currentToken) {
      // Generate new token if none exists
      const token = await generateInvite();
      if (!token) return false;
      return copyInviteLink(token);
    }
    return copyInviteLink(currentToken);
  }, [currentToken, generateInvite]);

  // Share current link
  const shareLink = useCallback(async (): Promise<boolean> => {
    if (!currentToken) {
      // Generate new token if none exists
      const token = await generateInvite();
      if (!token) return false;
      return shareInvite(token);
    }
    return shareInvite(currentToken);
  }, [currentToken, generateInvite]);

  // Process pending invite on login
  useEffect(() => {
    async function checkPendingInvite() {
      if (isAuthenticated && user) {
        const result = await processPendingInvite();
        if (result?.success) {
          console.log('[useInviteSystem] Pending invite accepted:', result);
          // Could show a toast notification here
        }
      }
    }

    checkPendingInvite();
  }, [isAuthenticated, user]);

  // Initial data fetch
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    stats,
    referrals,
    pendingInvites,
    loading,
    generating,
    revoking,
    currentToken,
    currentUrl,
    generateInvite,
    copyLink,
    shareLink,
    refreshStats,
    refreshReferrals,
    refreshPendingInvites,
    revokeInvite,
    hasInvites,
    availableCount,
    pendingCount
  };
}

export default useInviteSystem;
