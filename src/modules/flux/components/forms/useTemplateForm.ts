/**
 * useTemplateForm Hook (V2)
 *
 * Manages form state, validation, and submission for workout template creation/editing.
 * Auto-generates name and description from exercise structure using market-standard terminology.
 * Name/description are editable in edit mode but not shown in create mode.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { WorkoutTemplateService } from '../../services/workoutTemplateService';
import type { WorkoutTemplate, TrainingModality } from '../../types/flow';
import type {
  ExerciseStructureV2,
  CreateWorkoutTemplateV2Input,
} from '../../types/series';
import { generateWorkoutName, generateWorkoutDescription } from '../../types/series';

export interface TemplateFormState {
  modality: TrainingModality | '';
  name?: string; // Editable in edit mode, auto-generated in create
  description?: string; // Editable in edit mode, auto-generated in create
  exercise_structure?: ExerciseStructureV2;
  coach_notes?: string; // Free-text notes from the coach
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
        name: initialData.name,
        description: initialData.description,
        exercise_structure: initialData.exercise_structure as ExerciseStructureV2,
        coach_notes: (initialData as any).coach_notes || '',
      };
    }

    return {
      modality: '',
      exercise_structure: {
        warmup: '',
        series: [],
        cooldown: '',
      },
      coach_notes: '',
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Track whether to skip the next formData change for dirty tracking.
  // This prevents initialData load from marking the form as dirty.
  const skipNextDirty = useRef(true);

  // Sync form state when initialData changes (async load for edit mode)
  useEffect(() => {
    if (initialData) {
      skipNextDirty.current = true;
      setFormData({
        modality: initialData.modality,
        name: initialData.name,
        description: initialData.description,
        exercise_structure: initialData.exercise_structure as ExerciseStructureV2,
        coach_notes: (initialData as any).coach_notes || '',
      });
      setErrors({});
      setTouched(new Set());
      setIsDirty(false);
    }
  }, [initialData]);

  // Track dirty state — skip changes caused by initial load or initialData sync
  useEffect(() => {
    if (skipNextDirty.current) {
      skipNextDirty.current = false;
      return;
    }
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

      case 'exercise_structure':
        if (!value || !value.series || value.series.length === 0) {
          return 'Adicione pelo menos uma série';
        }

        // Validate series data
        for (const series of value.series) {
          if ('work_value' in series && series.work_value <= 0) {
            return 'Valor de trabalho deve ser maior que zero em todas as séries';
          }
          if ('distance_meters' in series && series.distance_meters <= 0) {
            return 'Distância deve ser maior que zero em todas as séries';
          }
          if ('reps' in series && series.reps <= 0) {
            return 'Repetições devem ser maiores que zero em todas as séries';
          }
          if ('load_kg' in series && series.load_kg < 0) {
            return 'Carga não pode ser negativa';
          }
          if ((series.rest_minutes ?? 0) < 0 || (series.rest_seconds ?? 0) < 0) {
            return 'Intervalo não pode ser negativo';
          }
        }

        if (value.warmup && value.warmup.length > 140) {
          return 'Aquecimento deve ter no máximo 140 caracteres';
        }
        if (value.cooldown && value.cooldown.length > 140) {
          return 'Desaquecimento deve ter no máximo 140 caracteres';
        }

        return null;

      default:
        return null;
    }
  }, []);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    (['modality', 'exercise_structure'] as const).forEach((field) => {
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
    const allFields = new Set(Object.keys(formData));
    setTouched(allFields);

    if (!validateAll()) {
      return { success: false, error: 'Corrija os erros antes de salvar' };
    }

    setIsSubmitting(true);

    try {
      const modality = formData.modality as TrainingModality;
      const series = formData.exercise_structure?.series || [];

      // Auto-generate name/description if not manually set (or use edited values)
      const autoName = generateWorkoutName(modality, series);
      const autoDescription = formData.exercise_structure
        ? generateWorkoutDescription(modality, formData.exercise_structure)
        : undefined;

      const payload: CreateWorkoutTemplateV2Input = {
        name: formData.name || autoName,
        description: formData.description || autoDescription,
        modality,
        category: 'main',
        exercise_structure: formData.exercise_structure,
      };

      const extras = { coach_notes: formData.coach_notes };

      let result;
      if (initialData) {
        result = await WorkoutTemplateService.updateTemplateV2({
          id: initialData.id,
          ...payload,
        }, extras);
      } else {
        result = await WorkoutTemplateService.createTemplateV2(payload, extras);
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

      return { success: false, error: 'Erro desconhecido' };
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
      exercise_structure: {
        warmup: '',
        series: [],
        cooldown: '',
      },
      coach_notes: '',
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
