/**
 * useDunbarLayers Hook
 * Sprint 4: Connections — Dunbar layer classification + visualization data
 *
 * Fetches contacts grouped by their Dunbar layer for the concentric
 * circles visualization (DunbarLayerMap).
 *
 * @example
 * const { layers, isLoading } = useDunbarLayers()
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import {
  getDunbarLayerLabel,
  getDunbarLayerDescription,
  type DunbarLayer,
  type DunbarLayerData,
} from '../services/networkScoring';

const log = createNamespacedLogger('useDunbarLayers');

// ============================================================================
// TYPES
// ============================================================================

export interface UseDunbarLayersReturn {
  layers: DunbarLayerData[];
  isLoading: boolean;
  error: string | null;
  totalContacts: number;
  refresh: () => Promise<void>;
}

const LAYER_ORDER: DunbarLayer[] = [5, 15, 50, 150, 500];

// ============================================================================
// HOOK
// ============================================================================

export function useDunbarLayers(): UseDunbarLayersReturn {
  const [layers, setLayers] = useState<DunbarLayerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalContacts, setTotalContacts] = useState(0);

  const fetchLayers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: contacts, error: fetchError } = await supabase
        .from('contact_network')
        .select('id, name, dunbar_layer, relationship_score')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('dunbar_layer', 'is', null);

      if (fetchError) throw fetchError;

      const grouped: Record<number, { id: string; name: string; score: number }[]> = {};
      for (const c of contacts ?? []) {
        const layer = c.dunbar_layer as DunbarLayer;
        if (!grouped[layer]) grouped[layer] = [];
        grouped[layer].push({
          id: c.id,
          name: c.name ?? 'Sem nome',
          score: c.relationship_score ?? 0,
        });
      }

      // Sort contacts within each layer by score descending
      for (const layer of Object.keys(grouped)) {
        grouped[Number(layer)].sort((a, b) => b.score - a.score);
      }

      const layerData: DunbarLayerData[] = LAYER_ORDER.map(layer => ({
        layer,
        label: getDunbarLayerLabel(layer),
        description: getDunbarLayerDescription(layer),
        contacts: grouped[layer] ?? [],
        capacity: layer,
        fill: (grouped[layer]?.length ?? 0) / layer,
      }));

      setLayers(layerData);
      setTotalContacts(contacts?.length ?? 0);
    } catch (err) {
      log.error('Failed to fetch Dunbar layers:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar camadas Dunbar');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchLayers();
  }, [fetchLayers]);

  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  return {
    layers,
    isLoading,
    error,
    totalContacts,
    refresh,
  };
}

export default useDunbarLayers;
