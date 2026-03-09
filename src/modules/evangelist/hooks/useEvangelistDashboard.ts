import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as evangelistService from '../services/evangelistService';
import type {
  Evangelist,
  ReferralConversion,
  CommissionEntry,
  TierHistoryEntry,
  EvangelistStats,
} from '../types';

interface UseEvangelistDashboardReturn {
  profile: Evangelist | null;
  conversions: ReferralConversion[];
  ledger: CommissionEntry[];
  tierHistory: TierHistoryEntry[];
  stats: EvangelistStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEvangelistDashboard(): UseEvangelistDashboardReturn {
  const { user } = useAuth();

  const [profile, setProfile] = useState<Evangelist | null>(null);
  const [conversions, setConversions] = useState<ReferralConversion[]>([]);
  const [ledger, setLedger] = useState<CommissionEntry[]>([]);
  const [tierHistory, setTierHistory] = useState<TierHistoryEntry[]>([]);
  const [stats, setStats] = useState<EvangelistStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Fetch profile
      const evangelistProfile =
        await evangelistService.getMyEvangelistProfile(user.id);
      setProfile(evangelistProfile);

      if (!evangelistProfile) {
        // User is not an evangelist — clear everything
        setConversions([]);
        setLedger([]);
        setTierHistory([]);
        setStats(null);
        return;
      }

      // Step 2: Fetch remaining data in parallel
      const [conversionsData, ledgerData, tierHistoryData, statsData] =
        await Promise.all([
          evangelistService.getMyReferralConversions(evangelistProfile.id),
          evangelistService.getMyCommissionLedger(evangelistProfile.id),
          evangelistService.getMyTierHistory(evangelistProfile.id),
          evangelistService.getReferralStats(
            evangelistProfile.id,
            evangelistProfile.tier
          ),
        ]);

      setConversions(conversionsData);
      setLedger(ledgerData);
      setTierHistory(tierHistoryData);
      setStats(statsData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar dados do evangelista';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  return {
    profile,
    conversions,
    ledger,
    tierHistory,
    stats,
    isLoading,
    error,
    refresh,
  };
}

export default useEvangelistDashboard;
