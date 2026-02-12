/**
 * useTemplateForm Hook
 *
 * Manages form state, validation, and submission for workout template creation/editing.
 * Provides inline validation on blur and comprehensive validation on submit.
 */

import { useState, useCallback, useEffect } from 'react';
import { WorkoutTemplateService } from '../../services/workoutTemplateService';
import type {
  WorkoutTemplate,
  CreateWorkoutTemplateInput,
  WorkoutCategory,
  WorkoutIntensity,
  TrainingModality,
  AthleteLevel,
  PaceZone,
  ExerciseStructure,
} from '../../types/flow';

export interface TemplateFormState {
  name: string;
  description?: string;
  category: WorkoutCategory | '';
  modality: TrainingModality | '';
  duration: number;
  intensity: WorkoutIntensity | '';

  // Intensity fields (modality-dependent)
  ftp_percentage?: number;
  pace_zone?: PaceZone;
  css_percentage?: number;
  rpe?: number;

  // Exercise structure (category-dependent)
  exercise_structure?: ExerciseStructure;

  // Organization
  tags?: string[];
  level?: AthleteLevel[];
  is_public?: boolean;
  is_favorite?: boolean;
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
        name: initialData.name,
        description: initialData.description,
        category: initialData.category,
        modality: initialData.modality,
        duration: initialData.duration,
        intensity: initialData.intensity,
        ftp_percentage: initialData.ftp_percentage,
        pace_zone: initialData.pace_zone,
        css_percentage: initialData.css_percentage,
        rpe: initialData.rpe,
        exercise_structure: initialData.exercise_structure,
        tags: initialData.tags || [],
        level: initialData.level || [],
        is_public: initialData.is_public || false,
        is_favorite: initialData.is_favorite || false,
      };
    }

    return {
      name: '',
      description: '',
      category: '',
      modality: '',
      duration: 30,
      intensity: '',
      tags: [],
      level: [],
      is_public: false,
      is_favorite: false,
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
      case 'name':
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          return 'Nome é obrigatório';
        }
        if (typeof value === 'string' && value.length < 3) {
          return 'Nome deve ter no mínimo 3 caracteres';
        }
        if (typeof value === 'string' && value.length > 100) {
          return 'Nome deve ter no máximo 100 caracteres';
        }
        return null;

      case 'category':
        if (!value) {
          return 'Categoria é obrigatória';
        }
        return null;

      case 'modality':
        if (!value) {
          return 'Modalidade é obrigatória';
        }
        return null;

      case 'duration':
        if (!value || value < 1) {
          return 'Duração deve ser no mínimo 1 minuto';
        }
        if (value > 600) {
          return 'Duração deve ser no máximo 600 minutos (10h)';
        }
        return null;

      case 'intensity':
        if (!value) {
          return 'Intensidade é obrigatória';
        }
        return null;

      case 'ftp_percentage':
        if (value !== undefined && value !== null && (value < 40 || value > 150)) {
          return 'FTP deve estar entre 40% e 150%';
        }
        return null;

      case 'css_percentage':
        if (value !== undefined && value !== null && (value < 50 || value > 120)) {
          return 'CSS deve estar entre 50% e 120%';
        }
        return null;

      case 'rpe':
        if (value !== undefined && value !== null && (value < 1 || value > 10)) {
          return 'RPE deve estar entre 1 e 10';
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
    (['name', 'category', 'modality', 'duration', 'intensity'] as const).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Intensity validation (at least one metric must be set)
    const hasIntensityMetric =
      formData.ftp_percentage !== undefined ||
      formData.pace_zone !== undefined ||
      formData.css_percentage !== undefined ||
      formData.rpe !== undefined;

    if (!hasIntensityMetric) {
      newErrors.rpe = 'Defina ao menos uma métrica de intensidade';
    }

    // Conditional intensity validation
    if (formData.ftp_percentage !== undefined) {
      const error = validateField('ftp_percentage', formData.ftp_percentage);
      if (error) newErrors.ftp_percentage = error;
    }

    if (formData.css_percentage !== undefined) {
      const error = validateField('css_percentage', formData.css_percentage);
      if (error) newErrors.css_percentage = error;
    }

    if (formData.rpe !== undefined) {
      const error = validateField('rpe', formData.rpe);
      if (error) newErrors.rpe = error;
    }

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
      const payload: CreateWorkoutTemplateInput = {
        name: formData.name,
        description: formData.description,
        category: formData.category as WorkoutCategory,
        modality: formData.modality as TrainingModality,
        duration: formData.duration,
        intensity: formData.intensity as WorkoutIntensity,
        exercise_structure: formData.exercise_structure,
        ftp_percentage: formData.ftp_percentage,
        pace_zone: formData.pace_zone,
        css_percentage: formData.css_percentage,
        rpe: formData.rpe,
        tags: formData.tags,
        level: formData.level,
        is_public: formData.is_public,
      };

      let result;
      if (initialData) {
        // Update existing
        result = await WorkoutTemplateService.updateTemplate({
          id: initialData.id,
          ...payload,
        });
      } else {
        // Create new
        result = await WorkoutTemplateService.createTemplate(payload);
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
      name: '',
      description: '',
      category: '',
      modality: '',
      duration: 30,
      intensity: '',
      tags: [],
      level: [],
      is_public: false,
      is_favorite: false,
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
