/**
 * useRelationshipScore Hook
 * Sprint 4: Connections — Per-contact scientific scoring
 *
 * Fetches and manages relationship scores for a single contact,
 * including Dunbar layer, tie strength, decay, and Gottman ratio.
 *
 * @example
 * const { score, isLoading, recalculate } = useRelationshipScore(contactId)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import {
  scoreContact,
  getDunbarLayerLabel,
  type RelationshipScoreResult,
  type ContactScoreInput,
} from '../services/networkScoring';

const log = createNamespacedLogger('useRelationshipScore');

// ============================================================================
// TYPES
// ============================================================================

export interface UseRelationshipScoreReturn {
  score: RelationshipScoreResult | null;
  isLoading: boolean;
  isRecalculating: boolean;
  error: string | null;
  recalculate: () => Promise<void>;
  dunbarLabel: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useRelationshipScore(
  contactId: string | null
): UseRelationshipScoreReturn {
  const [score, setScore] = useState<RelationshipScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAndScore = useCallback(async (showRecalculating = false) => {
    if (!contactId) {
      setScore(null);
      return;
    }

    if (showRecalculating) {
      setIsRecalculating(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch contact data
      const { data: contact, error: fetchError } = await supabase
        .from('contact_network')
        .select('id, relationship_type, interaction_count, last_interaction_at, health_score, sentiment_trend')
        .eq('id', contactId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!contact) throw new Error('Contact not found');

      // Fetch interaction quality counts
      const { data: interactions } = await supabase
        .from('connection_interactions')
        .select('quality')
        .eq('contact_id', contactId)
        .eq('user_id', user.id);

      const positiveCount = interactions?.filter(i => i.quality === 'positive').length ?? 0;
      const negativeCount = interactions?.filter(i => i.quality === 'negative').length ?? 0;

      const input: ContactScoreInput = {
        contactId: contact.id,
        relationshipType: contact.relationship_type ?? 'contact',
        interactionCount: contact.interaction_count ?? 0,
        lastInteractionAt: contact.last_interaction_at,
        healthScore: contact.health_score ?? 50,
        sentimentTrend: contact.sentiment_trend ?? 'unknown',
        positiveInteractions: positiveCount,
        negativeInteractions: negativeCount,
      };

      const result = scoreContact(input);
      setScore(result);

      // Persist scores to contact_network
      await supabase
        .from('contact_network')
        .update({
          dunbar_layer: result.dunbarLayer,
          tie_strength: result.tieStrength,
          relationship_score: result.compositeScore,
          gottman_ratio: result.gottmanRatio,
        })
        .eq('id', contactId)
        .eq('user_id', user.id);
    } catch (err) {
      log.error('Relationship scoring failed:', err);
      setError(err instanceof Error ? err.message : 'Erro ao calcular score');
    } finally {
      setIsLoading(false);
      setIsRecalculating(false);
    }
  }, [contactId]);

  const recalculate = useCallback(async () => {
    await fetchAndScore(true);
  }, [fetchAndScore]);

  useEffect(() => {
    fetchAndScore();
  }, [fetchAndScore]);

  return {
    score,
    isLoading,
    isRecalculating,
    error,
    recalculate,
    dunbarLabel: score ? getDunbarLayerLabel(score.dunbarLayer) : null,
  };
}

export default useRelationshipScore;
