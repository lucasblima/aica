/**
 * useModuleRegistry Hook
 * CS-001: Module Registry + Feature Flags
 *
 * Fetches modules from module_registry table and provides
 * status checks, waitlist management, and Realtime updates.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

const log = createNamespacedLogger('useModuleRegistry');

// ============================================================================
// TYPES
// ============================================================================

export type ModuleStatus = 'hidden' | 'teaser' | 'preview' | 'beta' | 'live';

export interface ModuleRegistryEntry {
  id: string;
  name: string;
  description: string | null;
  icon_emoji: string | null;
  status: ModuleStatus;
  sort_order: number;
  teaser_headline: string | null;
  teaser_description: string | null;
  teaser_illustration_url: string | null;
  teaser_features: string[];
  preview_enabled: boolean;
  preview_component: string | null;
  ai_preview_enabled: boolean;
  ai_preview_system_prompt: string | null;
  waitlist_count: number;
  estimated_launch: string | null;
  category: string | null;
  color_primary: string | null;
  color_secondary: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseModuleRegistryReturn {
  modules: ModuleRegistryEntry[];
  isLoading: boolean;
  error: Error | null;
  getModule: (moduleId: string) => ModuleRegistryEntry | undefined;
  isLive: (moduleId: string) => boolean;
  isTeaser: (moduleId: string) => boolean;
  isPreview: (moduleId: string) => boolean;
  isBeta: (moduleId: string) => boolean;
  joinWaitlist: (moduleId: string) => Promise<boolean>;
  leaveWaitlist: (moduleId: string) => Promise<boolean>;
  isOnWaitlist: (moduleId: string) => boolean;
  waitlistCount: (moduleId: string) => number;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useModuleRegistry(): UseModuleRegistryReturn {
  const [modules, setModules] = useState<ModuleRegistryEntry[]>([]);
  const [userWaitlistIds, setUserWaitlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // --------------------------------------------------------------------------
  // FETCH MODULES
  // --------------------------------------------------------------------------

  const fetchModules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('module_registry')
        .select('*')
        .neq('status', 'hidden')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const mapped: ModuleRegistryEntry[] = (data || []).map((m) => ({
        ...m,
        teaser_features: Array.isArray(m.teaser_features) ? m.teaser_features : [],
      }));

      setModules(mapped);
    } catch (err) {
      const e = err as Error;
      log.error('fetchModules error:', { error: e.message });
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // FETCH USER WAITLIST
  // --------------------------------------------------------------------------

  const fetchUserWaitlist = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserWaitlistIds(new Set());
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('module_waitlist')
        .select('module_id')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      setUserWaitlistIds(new Set((data || []).map((w) => w.module_id)));
    } catch (err) {
      log.error('fetchUserWaitlist error:', { error: (err as Error).message });
    }
  }, []);

  // --------------------------------------------------------------------------
  // JOIN / LEAVE WAITLIST
  // --------------------------------------------------------------------------

  const joinWaitlist = useCallback(async (moduleId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error: insertError } = await supabase
        .from('module_waitlist')
        .insert({ module_id: moduleId, user_id: user.id });

      if (insertError) {
        // Unique constraint violation = already on waitlist
        if (insertError.code === '23505') return true;
        throw insertError;
      }

      setUserWaitlistIds((prev) => new Set([...prev, moduleId]));

      // Optimistic update of waitlist count
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, waitlist_count: m.waitlist_count + 1 } : m
        )
      );

      return true;
    } catch (err) {
      log.error('joinWaitlist error:', { error: (err as Error).message });
      return false;
    }
  }, []);

  const leaveWaitlist = useCallback(async (moduleId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error: deleteError } = await supabase
        .from('module_waitlist')
        .delete()
        .eq('module_id', moduleId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setUserWaitlistIds((prev) => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });

      // Optimistic update of waitlist count
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, waitlist_count: Math.max(0, m.waitlist_count - 1) }
            : m
        )
      );

      return true;
    } catch (err) {
      log.error('leaveWaitlist error:', { error: (err as Error).message });
      return false;
    }
  }, []);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  const getModule = useCallback(
    (moduleId: string) => modules.find((m) => m.id === moduleId),
    [modules]
  );

  const isLive = useCallback(
    (moduleId: string) => getModule(moduleId)?.status === 'live',
    [getModule]
  );

  const isTeaser = useCallback(
    (moduleId: string) => getModule(moduleId)?.status === 'teaser',
    [getModule]
  );

  const isPreview = useCallback(
    (moduleId: string) => getModule(moduleId)?.status === 'preview',
    [getModule]
  );

  const isBeta = useCallback(
    (moduleId: string) => getModule(moduleId)?.status === 'beta',
    [getModule]
  );

  const isOnWaitlist = useCallback(
    (moduleId: string) => userWaitlistIds.has(moduleId),
    [userWaitlistIds]
  );

  const waitlistCountFn = useCallback(
    (moduleId: string) => getModule(moduleId)?.waitlist_count ?? 0,
    [getModule]
  );

  const refresh = useCallback(async () => {
    await Promise.all([fetchModules(), fetchUserWaitlist()]);
  }, [fetchModules, fetchUserWaitlist]);

  // --------------------------------------------------------------------------
  // REALTIME SUBSCRIPTION — waitlist count updates
  // --------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      const newChannel = supabase
        .channel('module-registry-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'module_registry',
          },
          (payload) => {
            if (cancelled) return;
            const updated = payload.new as ModuleRegistryEntry & { teaser_features: unknown };
            setModules((prev) =>
              prev.map((m) =>
                m.id === updated.id
                  ? {
                      ...m,
                      ...updated,
                      teaser_features: Array.isArray(updated.teaser_features)
                        ? updated.teaser_features as string[]
                        : [],
                    }
                  : m
              )
            );
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            log.error('Realtime subscription error', { status, err });
          }
        });

      if (!cancelled) {
        channelRef.current = newChannel;
      } else {
        newChannel.unsubscribe();
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // INITIAL FETCH
  // --------------------------------------------------------------------------

  useEffect(() => {
    fetchModules();
    fetchUserWaitlist();
  }, [fetchModules, fetchUserWaitlist]);

  return {
    modules,
    isLoading,
    error,
    getModule,
    isLive,
    isTeaser,
    isPreview,
    isBeta,
    joinWaitlist,
    leaveWaitlist,
    isOnWaitlist,
    waitlistCount: waitlistCountFn,
    refresh,
  };
}

export default useModuleRegistry;
