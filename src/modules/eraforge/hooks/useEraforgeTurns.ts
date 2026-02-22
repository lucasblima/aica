/**
 * useEraforgeTurns - Turn management hook
 *
 * Manages turn lifecycle: fetch, submit decision, track history.
 * Consumes EraforgeGameContext for current world/child.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { useEraforgeGame } from '../contexts/EraforgeGameContext';
import type { Turn, TurnCreateInput, TurnConsequences } from '../types/eraforge.types';

const log = createNamespacedLogger('useEraforgeTurns');

export interface UseEraforgeTurnsResult {
  turns: Turn[];
  currentTurn: Turn | null;
  loading: boolean;
  error: string | null;
  fetchTurns: () => Promise<void>;
  submitDecision: (turnId: string, decision: string, consequences: TurnConsequences) => Promise<void>;
  createTurn: (input: TurnCreateInput) => Promise<Turn | null>;
}

export function useEraforgeTurns(): UseEraforgeTurnsResult {
  const { state } = useEraforgeGame();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTurn = state.currentScenario;

  const fetchTurns = useCallback(async () => {
    if (!state.currentWorld || !state.currentChild) {
      log.debug('No world/child selected, skipping fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('eraforge_turns')
        .select('*')
        .eq('world_id', state.currentWorld.id)
        .eq('child_id', state.currentChild.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        log.error('Error fetching turns:', fetchError);
        setError(fetchError.message);
      } else {
        setTurns(data ?? []);
      }
    } catch (err) {
      log.error('Unexpected error fetching turns:', err);
      setError('Erro ao carregar turnos');
    } finally {
      setLoading(false);
    }
  }, [state.currentWorld, state.currentChild]);

  const submitDecision = useCallback(async (
    turnId: string,
    decision: string,
    consequences: TurnConsequences
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('eraforge_turns')
        .update({ decision, consequences })
        .eq('id', turnId);

      if (updateError) {
        log.error('Error submitting decision:', updateError);
        setError(updateError.message);
      } else {
        setTurns(prev =>
          prev.map(t => t.id === turnId ? { ...t, decision, consequences } : t)
        );
      }
    } catch (err) {
      log.error('Unexpected error submitting decision:', err);
      setError('Erro ao enviar decisao');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTurn = useCallback(async (input: TurnCreateInput): Promise<Turn | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('eraforge_turns')
        .insert(input)
        .select()
        .single();

      if (insertError) {
        log.error('Error creating turn:', insertError);
        setError(insertError.message);
        return null;
      }

      if (data) {
        setTurns(prev => [data, ...prev]);
      }
      return data;
    } catch (err) {
      log.error('Unexpected error creating turn:', err);
      setError('Erro ao criar turno');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    turns,
    currentTurn,
    loading,
    error,
    fetchTurns,
    submitDecision,
    createTurn,
  };
}
