/**
 * useMyAthleteProfile — hook for athlete portal
 *
 * Calls RPC get_my_athlete_profile() to fetch the current user's
 * athlete data (if they are linked to an athlete record).
 */

import { useState, useEffect } from 'react';
import type { MyAthleteProfile } from '../types';
import { AthleteService } from '../services/athleteService';

export function useMyAthleteProfile() {
  const [profile, setProfile] = useState<MyAthleteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error: rpcError } = await AthleteService.getMyAthleteProfile();
        if (cancelled) return;

        if (rpcError) {
          setError('Não foi possível carregar seu perfil de atleta.');
          console.error('[useMyAthleteProfile]', rpcError);
        } else {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Erro ao carregar perfil.');
          console.error('[useMyAthleteProfile]', err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: rpcError } = await AthleteService.getMyAthleteProfile();
    if (rpcError) {
      setError('Não foi possível carregar seu perfil de atleta.');
    } else {
      setProfile(data);
    }
    setIsLoading(false);
  };

  return {
    profile,
    isLoading,
    error,
    isLinked: !!profile,
    refetch,
  };
}
