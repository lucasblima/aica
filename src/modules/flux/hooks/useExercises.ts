/**
 * useExercises Hook
 *
 * Fetches and manages exercise library data for the Flux module.
 * Supports filtering by modality, category, and search.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ExerciseService,
  type Exercise,
  type ExerciseFilters,
  type CreateExerciseInput,
  type UpdateExerciseInput,
} from '../services/exerciseService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useExercises');

export interface UseExercisesOptions {
  modality?: string;
  category?: string;
  difficulty_level?: 'iniciante' | 'intermediario' | 'avancado';
  search?: string;
  includePublic?: boolean;
}

export interface UseExercisesReturn {
  exercises: Exercise[];
  isLoading: boolean;
  error: Error | null;
  createExercise: (input: CreateExerciseInput) => Promise<Exercise | null>;
  updateExercise: (input: UpdateExerciseInput) => Promise<Exercise | null>;
  deleteExercise: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useExercises(options?: UseExercisesOptions): UseExercisesReturn {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filters = useMemo<ExerciseFilters>(
    () => ({
      modality: options?.modality,
      category: options?.category as any,
      difficulty_level: options?.difficulty_level,
      search: options?.search,
      include_public: options?.includePublic !== false,
    }),
    [options?.modality, options?.category, options?.difficulty_level, options?.search, options?.includePublic]
  );

  const loadExercises = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await ExerciseService.getExercises(filters);

      if (fetchError) throw fetchError;

      setExercises(data || []);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Erro ao carregar exercicios');
      setError(e);
      log.error('Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const createExercise = useCallback(
    async (input: CreateExerciseInput): Promise<Exercise | null> => {
      const { data, error: createError } = await ExerciseService.createExercise(input);

      if (createError) {
        setError(createError instanceof Error ? createError : new Error(String(createError)));
        return null;
      }

      if (data) {
        setExercises((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      }

      return data;
    },
    []
  );

  const updateExercise = useCallback(
    async (input: UpdateExerciseInput): Promise<Exercise | null> => {
      const { data, error: updateError } = await ExerciseService.updateExercise(input);

      if (updateError) {
        setError(updateError instanceof Error ? updateError : new Error(String(updateError)));
        return null;
      }

      if (data) {
        setExercises((prev) =>
          prev.map((e) => (e.id === data.id ? data : e))
        );
      }

      return data;
    },
    []
  );

  const deleteExercise = useCallback(
    async (id: string): Promise<boolean> => {
      const { error: deleteError } = await ExerciseService.deleteExercise(id);

      if (deleteError) {
        setError(deleteError instanceof Error ? deleteError : new Error(String(deleteError)));
        return false;
      }

      setExercises((prev) => prev.filter((e) => e.id !== id));
      return true;
    },
    []
  );

  return {
    exercises,
    isLoading,
    error,
    createExercise,
    updateExercise,
    deleteExercise,
    refresh: loadExercises,
  };
}
