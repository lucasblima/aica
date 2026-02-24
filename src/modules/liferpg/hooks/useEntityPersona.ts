/**
 * useEntityPersona — Load persona + stats + HP
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { EntityPersona, PersonaDashboardData } from '../types/liferpg';

const log = createNamespacedLogger('useEntityPersona');

interface UseEntityPersonaOptions {
  personaId?: string;
  autoLoad?: boolean;
}

interface UseEntityPersonaReturn {
  persona: EntityPersona | null;
  dashboard: PersonaDashboardData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateHP: (newHP: number) => Promise<void>;
}

export function useEntityPersona({
  personaId,
  autoLoad = true,
}: UseEntityPersonaOptions = {}): UseEntityPersonaReturn {
  const [persona, setPersona] = useState<EntityPersona | null>(null);
  const [dashboard, setDashboard] = useState<PersonaDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (!personaId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_persona_dashboard', {
        p_persona_id: personaId,
      });

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || 'Failed to load dashboard');

      setPersona(data.persona);
      setDashboard({
        persona: data.persona,
        pendingQuests: data.pendingQuests || [],
        recentEvents: data.recentEvents || [],
        inventorySummary: data.inventorySummary || {
          totalItems: 0,
          totalValue: 0,
          lowConditionCount: 0,
          expiringCount: 0,
        },
        pendingFeedback: data.pendingFeedback || [],
      });
    } catch (err) {
      log.error('Failed to load persona dashboard', { err });
      setError((err as Error).message);
      errorRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  const updateHP = useCallback(async (newHP: number) => {
    if (!personaId) return;

    const { error: updateError } = await supabase
      .from('entity_personas')
      .update({ hp: Math.max(0, Math.min(100, newHP)) })
      .eq('id', personaId);

    if (updateError) {
      log.error('Failed to update HP', { updateError });
      return;
    }

    setPersona((prev) => prev ? { ...prev, hp: newHP } : null);
  }, [personaId]);

  useEffect(() => {
    if (autoLoad && personaId && !errorRef.current) {
      loadDashboard();
    }
  }, [autoLoad, personaId, loadDashboard]);

  const reload = useCallback(async () => {
    errorRef.current = false;
    await loadDashboard();
  }, [loadDashboard]);

  return { persona, dashboard, loading, error, reload, updateHP };
}

/**
 * useEntityPersonaList — Load all personas for the current user
 */
export function useEntityPersonaList() {
  const [personas, setPersonas] = useState<EntityPersona[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: queryError } = await supabase
        .from('entity_personas')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setPersonas(data || []);
    } catch (err) {
      log.error('Failed to load personas', { err });
      setError((err as Error).message);
      errorRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!errorRef.current) {
      load();
    }
  }, [load]);

  const reload = useCallback(async () => {
    errorRef.current = false;
    await load();
  }, [load]);

  return { personas, loading, error, reload };
}
