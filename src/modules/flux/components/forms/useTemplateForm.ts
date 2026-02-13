/**
 * useTemplateForm Hook (V2)
 *
 * Manages form state, validation, and submission for workout template creation/editing.
 * Provides inline validation on blur and comprehensive validation on submit.
 *
 * Simplified from V1:
 * - Removed: duration, intensity, ftp_percentage, pace_zone, css_percentage, rpe
 * - Removed: tags, level, is_public, is_favorite
 * - Updated: exercise_structure uses ExerciseStructureV2 with warmup/series/cooldown
 */

import { useState, useCallback, useEffect } from 'react';
import { WorkoutTemplateService } from '../../services/workoutTemplateService';
import type { WorkoutTemplate, TrainingModality } from '../../types/flow';
import type {
  WorkoutCategorySimplified,
  ExerciseStructureV2,
  CreateWorkoutTemplateV2Input,
} from '../../types/series';

export interface TemplateFormState {
  modality: TrainingModality | '';
  category: WorkoutCategorySimplified | '';

  // Exercise structure with warmup/series/cooldown
  exercise_structure?: ExerciseStructureV2;
}

type FormErrors = Partial<Record<keyof TemplateFormState, string>>;

interface UseTemplateFormProps {
  initialData?: WorkoutTemplate;
  onSuccess?: (template: WorkoutTemplate) => void;
}

export function useTemplateForm({ initialData, onSuccess }: UseTemplateFormProps = {}) {
  // Form state
  const [formData, setFormData] = useState<TemplateFormState>(() => {
    if (initialData) {
      return {
        modality: initialData.modality,
        category: initialData.category as WorkoutCategorySimplified,
        exercise_structure: initialData.exercise_structure as ExerciseStructureV2,
      };
    }

    return {
      modality: '',
      category: '',
      exercise_structure: {
        warmup: '',
        series: [],
        cooldown: '',
      },
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Track dirty state
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  // Field validation
  const validateField = useCallback((name: keyof TemplateFormState, value: any): string | null => {
    switch (name) {
      case 'modality':
        if (!value) {
          return 'Modalidade é obrigatória';
        }
        return null;

      case 'category':
        if (!value) {
          return 'Estrutura da série é obrigatória';
        }
        return null;

      case 'exercise_structure':
        if (!value || !value.series || value.series.length === 0) {
          return 'Adicione pelo menos uma série';
        }

        // Validate series data
        for (const series of value.series) {
          // Validate work_value for cardio
          if ('work_value' in series && series.work_value <= 0) {
            return 'Valor de trabalho deve ser maior que zero em todas as séries';
          }

          // Validate distance for swimming
          if ('distance_meters' in series && series.distance_meters <= 0) {
            return 'Distância deve ser maior que zero em todas as séries';
          }

          // Validate reps for strength
          if ('reps' in series && series.reps <= 0) {
            return 'Repetições devem ser maiores que zero em todas as séries';
          }

          // Validate load for strength (can be 0 for bodyweight)
          if ('load_kg' in series && series.load_kg < 0) {
            return 'Carga não pode ser negativa';
          }

          // Validate rest
          if (series.rest_value < 0) {
            return 'Descanso não pode ser negativo';
          }
        }

        // Validate warmup length
        if (value.warmup && value.warmup.length > 280) {
          return 'Aquecimento deve ter no máximo 280 caracteres';
        }

        // Validate cooldown length
        if (value.cooldown && value.cooldown.length > 280) {
          return 'Desaquecimento deve ter no máximo 280 caracteres';
        }

        return null;

      default:
        return null;
    }
  }, []);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    (['modality', 'category', 'exercise_structure'] as const).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  // Handle field change
  const handleChange = useCallback((name: keyof TemplateFormState, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (touched.has(name)) {
      const error = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error || undefined,
      }));
    }
  }, [touched, validateField]);

  // Handle field blur
  const handleBlur = useCallback((name: keyof TemplateFormState) => {
    setTouched((prev) => new Set(prev).add(name));

    const error = validateField(name, formData[name]);
    setErrors((prev) => ({
      ...prev,
      [name]: error || undefined,
    }));
  }, [formData, validateField]);

  // Handle submit
  const handleSubmit = useCallback(async (): Promise<{ success: boolean; data?: WorkoutTemplate; error?: any }> => {
    // Mark all fields as touched
    const allFields = new Set(Object.keys(formData));
    setTouched(allFields);

    // Validate all fields
    if (!validateAll()) {
      return { success: false, error: 'Corrija os erros antes de salvar' };
    }

    setIsSubmitting(true);

    try {
      const payload: CreateWorkoutTemplateV2Input = {
        name: `Treino de ${formData.modality}`, // Auto-generated name
        description: undefined,
        modality: formData.modality as TrainingModality,
        category: formData.category as WorkoutCategorySimplified,
        exercise_structure: formData.exercise_structure,
      };

      // TODO: Update WorkoutTemplateService to support V2 structure
      // For now, log the payload and return success
      console.log('[useTemplateForm] V2 payload:', payload);

      // Temporary mock success
      const mockResult: WorkoutTemplate = {
        id: initialData?.id || crypto.randomUUID(),
        user_id: initialData?.user_id || 'current-user-id',
        ...payload,
        // V1 compatibility fields (will be removed when service is updated)
        duration: 0,
        intensity: 'medium' as any,
        created_at: initialData?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: initialData?.usage_count || 0,
      } as any;

      setIsDirty(false);
      onSuccess?.(mockResult);
      return { success: true, data: mockResult };

      /* TODO: Uncomment when WorkoutTemplateService supports V2
      let result;
      if (initialData) {
        result = await WorkoutTemplateService.updateTemplateV2({
          id: initialData.id,
          ...payload,
        });
      } else {
        result = await WorkoutTemplateService.createTemplateV2(payload);
      }

      if (result.error) {
        console.error('[useTemplateForm] Error saving template:', result.error);
        return { success: false, error: result.error };
      }

      if (result.data) {
        setIsDirty(false);
        onSuccess?.(result.data);
        return { success: true, data: result.data };
      }

      return { success: false, error: 'Unknown error' };
      */
    } catch (error) {
      console.error('[useTemplateForm] Unexpected error:', error);
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, initialData, onSuccess, validateAll]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      modality: '',
      category: '',
      exercise_structure: {
        warmup: '',
        series: [],
        cooldown: '',
      },
    });
    setErrors({});
    setTouched(new Set());
    setIsDirty(false);
  }, []);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
  };
}
