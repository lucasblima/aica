/**
 * useMyAthleteProfile — hook for athlete portal
 *
 * Calls RPC get_my_athlete_profile() to fetch the current user's
 * athlete data (if they are linked to an athlete record).
 * Also fetches the user's Google OAuth avatar from auth metadata
 * since the RPC doesn't return avatar_url.
 */

import { useState, useEffect } from 'react';
import type { MyAthleteProfile } from '../types';
import { AthleteService } from '../services/athleteService';
import { supabase } from '@/services/supabaseClient';

export function useMyAthleteProfile() {
  const [profile, setProfile] = useState<MyAthleteProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Fetch athlete profile and user auth data in parallel
        const [profileResult, userResult] = await Promise.all([
          AthleteService.getMyAthleteProfile(),
          supabase.auth.getUser(),
        ]);
        if (cancelled) return;

        if (profileResult.error) {
          setError('Não foi possível carregar seu perfil de atleta.');
          console.error('[useMyAthleteProfile]', profileResult.error);
        } else {
          setProfile(profileResult.data);
        }

        // Extract avatar_url from Google OAuth user metadata
        const meta = userResult.data?.user?.user_metadata;
        if (meta?.avatar_url) {
          setAvatarUrl(meta.avatar_url as string);
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
    avatarUrl,
    isLoading,
    error,
    isLinked: !!profile,
    refetch,
  };
}
