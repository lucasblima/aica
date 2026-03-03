/**
 * useTemplateForm Hook (V3)
 *
 * Manages form state, validation, and submission for workout template creation/editing.
 * Auto-generates name and description from exercise structure using market-standard terminology.
 * Name/description are editable in edit mode but not shown in create mode.
 *
 * Fixes:
 * - #422: Full form reset when opening in create mode (no stale data)
 * - #412: Auto-regenerate description when series change (unless manually edited)
 * - #421: Persist description correctly on save, return full updated template
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
  is_public: boolean; // #458: Public (marketplace) vs Private (coach-only)
}

type FormErrors = Partial<Record<keyof TemplateFormState, string>>;

interface UseTemplateFormProps {
  mode?: 'create' | 'edit';
  isOpen?: boolean;
  initialData?: WorkoutTemplate;
  onSuccess?: (template: WorkoutTemplate) => void;
  /** When true, skip WorkoutTemplateService save and return form data directly via onSuccess */
  skipServiceSave?: boolean;
}

const EMPTY_FORM_STATE: TemplateFormState = {
  modality: '',
  name: undefined,
  description: undefined,
  exercise_structure: {
    warmup: '',
    series: [],
    cooldown: '',
  },
  coach_notes: '',
  is_public: false, // #458: Default to private (safer)
};

export function useTemplateForm({ mode, isOpen, initialData, onSuccess, skipServiceSave }: UseTemplateFormProps = {}) {
  // Form state
  const [formData, setFormData] = useState<TemplateFormState>(() => {
    if (initialData) {
      return {
        modality: initialData.modality,
        name: initialData.name,
        description: initialData.description,
        exercise_structure: initialData.exercise_structure as ExerciseStructureV2,
        coach_notes: initialData.coach_notes || '',
        is_public: initialData.is_public ?? false,
      };
    }

    return { ...EMPTY_FORM_STATE, exercise_structure: { warmup: '', series: [], cooldown: '' } };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // #412: Track whether the user has manually edited the description field
  const [isDescriptionManuallyEdited, setIsDescriptionManuallyEdited] = useState(false);

  // Track whether to skip the next formData change for dirty tracking.
  // This prevents initialData load from marking the form as dirty.
  const skipNextDirty = useRef(true);

  // #422: Reset form completely when drawer opens in create mode
  useEffect(() => {
    if (isOpen && mode === 'create') {
      skipNextDirty.current = true;
      setFormData({ ...EMPTY_FORM_STATE, exercise_structure: { warmup: '', series: [], cooldown: '' } });
      setErrors({});
      setTouched(new Set());
      setIsDirty(false);
      setIsDescriptionManuallyEdited(false);
    }
  }, [isOpen, mode]);

  // Sync form state when initialData changes (async load for edit mode)
  useEffect(() => {
    if (initialData) {
      skipNextDirty.current = true;
      setFormData({
        modality: initialData.modality,
        name: initialData.name,
        description: initialData.description,
        exercise_structure: initialData.exercise_structure as ExerciseStructureV2,
        coach_notes: initialData.coach_notes || '',
        is_public: initialData.is_public ?? false,
      });
      setErrors({});
      setTouched(new Set());
      setIsDirty(false);
      // In edit mode, treat the loaded description as "manual" so it's preserved
      setIsDescriptionManuallyEdited(!!initialData.description);
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

  // #412: Auto-regenerate description when series change (unless manually edited)
  const prevSeriesRef = useRef<string>('');
  useEffect(() => {
    const series = formData.exercise_structure?.series || [];
    const modality = formData.modality;
    const seriesKey = JSON.stringify(series);

    // Skip if series haven't actually changed, or if no modality is set
    if (seriesKey === prevSeriesRef.current || !modality) {
      return;
    }
    prevSeriesRef.current = seriesKey;

    // Only auto-update if user hasn't manually edited the description
    if (!isDescriptionManuallyEdited && formData.exercise_structure) {
      const autoDescription = generateWorkoutDescription(modality, formData.exercise_structure);
      const autoName = generateWorkoutName(modality, series);
      setFormData((prev) => ({
        ...prev,
        description: autoDescription || prev.description,
        name: prev.name || autoName,
      }));
    }
  }, [formData.exercise_structure?.series, formData.modality, isDescriptionManuallyEdited]);

  // Field validation
  const validateField = useCallback((name: keyof TemplateFormState, value: TemplateFormState[keyof TemplateFormState]): string | null => {
    switch (name) {
      case 'modality':
        if (!value) {
          return 'Modalidade é obrigatória';
        }
        return null;

      case 'exercise_structure': {
        const struct = value as ExerciseStructureV2 | undefined;
        if (!struct || !struct.series || struct.series.length === 0) {
          return 'Adicione pelo menos uma série';
        }

        // Validate series data
        for (const series of struct.series) {
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

        if (struct.warmup && struct.warmup.length > 140) {
          return 'Aquecimento deve ter no máximo 140 caracteres';
        }
        if (struct.cooldown && struct.cooldown.length > 140) {
          return 'Desaquecimento deve ter no máximo 140 caracteres';
        }

        return null;
      }

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
  const handleChange = useCallback((name: keyof TemplateFormState, value: TemplateFormState[keyof TemplateFormState]) => {
    // #412: Track manual description edits
    if (name === 'description') {
      setIsDescriptionManuallyEdited(true);
    }

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
  const handleSubmit = useCallback(async (): Promise<{ success: boolean; data?: WorkoutTemplate; error?: unknown }> => {
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

      // #421: Always compute the final description — use manual if edited, else auto-generated
      const finalName = formData.name || autoName;
      const finalDescription = formData.description || autoDescription;

      // #611: When skipServiceSave is true, return form data directly without DB save
      // Used by Canvas editor to update workout slots instead of templates
      if (skipServiceSave) {
        const templateFromForm: WorkoutTemplate = {
          ...(initialData || {
            id: '',
            user_id: '',
            created_at: '',
            updated_at: '',
            usage_count: 0,
          }),
          name: finalName,
          description: finalDescription,
          modality,
          category: 'main',
          duration: initialData?.duration || 0,
          intensity: initialData?.intensity || 'medium',
          exercise_structure: formData.exercise_structure,
          coach_notes: formData.coach_notes,
          is_public: formData.is_public,
        };
        setIsDirty(false);
        onSuccess?.(templateFromForm);
        return { success: true, data: templateFromForm };
      }

      const payload: CreateWorkoutTemplateV2Input = {
        name: finalName,
        description: finalDescription,
        modality,
        category: 'main',
        exercise_structure: formData.exercise_structure,
      };

      const extras = { coach_notes: formData.coach_notes, is_public: formData.is_public };

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
        // #421: Ensure the returned template has the correct name/description
        // (in case the DB didn't return them, overlay with what we sent)
        const savedTemplate: WorkoutTemplate = {
          ...result.data,
          name: result.data.name || finalName,
          description: result.data.description || finalDescription,
        };
        setIsDirty(false);
        onSuccess?.(savedTemplate);
        return { success: true, data: savedTemplate };
      }

      return { success: false, error: 'Erro desconhecido' };
    } catch (error) {
      console.error('[useTemplateForm] Unexpected error:', error);
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, initialData, onSuccess, validateAll, skipServiceSave]);

  // Reset form
  const resetForm = useCallback(() => {
    skipNextDirty.current = true;
    setFormData({ ...EMPTY_FORM_STATE, exercise_structure: { warmup: '', series: [], cooldown: '' } });
    setErrors({});
    setTouched(new Set());
    setIsDirty(false);
    setIsDescriptionManuallyEdited(false);
  }, []);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isDescriptionManuallyEdited,
    setIsDescriptionManuallyEdited,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
  };
}
