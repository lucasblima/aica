/**
 * useContactAppearances — fetches cross-module appearances for a platform contact
 *
 * Calls the `get_contact_appearances` RPC which returns episodes, athletes,
 * connection spaces, and grant collaborations linked to a given contact.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useContactAppearances');

export interface EpisodeAppearance {
  id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  episode_theme: string | null;
}

export interface AthleteAppearance {
  id: string;
  name: string;
  modality: string;
  level: string;
  status: string;
  invitation_status: string | null;
}

export interface ConnectionAppearance {
  id: string;
  space_name: string;
  role: string;
  joined_at: string | null;
}

export interface GrantAppearance {
  id: string;
  project_name: string;
  role: string;
  status: string;
}

export interface ContactAppearances {
  episodes: EpisodeAppearance[];
  athletes: AthleteAppearance[];
  connections: ConnectionAppearance[];
  grants: GrantAppearance[];
}

const EMPTY_APPEARANCES: ContactAppearances = {
  episodes: [],
  athletes: [],
  connections: [],
  grants: [],
};

export function useContactAppearances(contactId: string | null) {
  const [appearances, setAppearances] = useState<ContactAppearances>(EMPTY_APPEARANCES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contactId) {
      setAppearances(EMPTY_APPEARANCES);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_contact_appearances', {
        p_contact_id: contactId,
      });

      if (rpcError) {
        log.error('get_contact_appearances RPC error:', rpcError);
        setError(rpcError.message);
        return;
      }

      // The RPC returns a JSON object with episodes, athletes, connections, grants arrays
      const result = (typeof data === 'string' ? JSON.parse(data) : data) as ContactAppearances;

      setAppearances({
        episodes: result.episodes || [],
        athletes: result.athletes || [],
        connections: result.connections || [],
        grants: result.grants || [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('useContactAppearances error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { appearances, isLoading, error, refresh };
}
