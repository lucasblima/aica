/**
 * useAthleteForm Hook
 *
 * Shared form logic for athlete creation/editing.
 * Used by both AthleteFormDrawer and AthleteFormModal.
 *
 * Encapsulates:
 * - Form state and field handlers
 * - Modality/level selection
 * - Validation
 * - Submit with error handling
 * - Profile loading on edit
 * - Dirty state tracking
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Athlete,
  TrainingModality,
  SimpleAthleteLevel,
  ModalityLevel,
  AthleteLevel,
} from '../types/flux';
import { AthleteProfileService } from '../services/athleteProfileService';

// ============================================
// TYPES
// ============================================

export interface AthleteFormData {
  name: string;
  email: string;
  phone: string;
  modalityLevels: ModalityLevel[];
  requires_cardio_exam: boolean;
  requires_clearance_cert: boolean;
  allow_parq_onboarding: boolean;
  auth_user_id?: string;
  invitation_status?: 'none' | 'pending' | 'connected';
}

export interface AthleteFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  modalityLevels?: string;
}

export interface UseAthleteFormOptions {
  mode: 'create' | 'edit';
  initialData?: Athlete;
  isOpen: boolean;
  onSave: (athlete: Partial<Athlete> & { modalityLevels?: ModalityLevel[] }) => Promise<string | void>;
  onClose: () => void;
  autoCloseDelayMs?: number;
}

export interface UseAthleteFormReturn {
  formData: AthleteFormData;
  errors: AthleteFormErrors;
  isDirty: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  isLoadingProfiles: boolean;
  isFormValid: boolean;
  errorCount: number;
  lastCreatedId: string | null;
  handleChange: (field: keyof AthleteFormData, value: string | boolean | undefined) => void;
  handleModalityToggle: (modality: TrainingModality) => void;
  handleLevelChange: (modality: TrainingModality, level: SimpleAthleteLevel) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleClose: () => void;
  resetForm: () => void;
}

// ============================================
// CONSTANTS (shared by both Drawer and Modal)
// ============================================

export const MODALITY_OPTIONS: { value: TrainingModality; label: string; icon: string }[] = [
  { value: 'swimming', label: 'Natacao', icon: '\u{1F3CA}' },
  { value: 'running', label: 'Corrida', icon: '\u{1F3C3}' },
  { value: 'cycling', label: 'Ciclismo', icon: '\u{1F6B4}' },
  { value: 'strength', label: 'Musculacao', icon: '\u{1F3CB}\uFE0F' },
  { value: 'walking', label: 'Caminhada', icon: '\u{1F6B6}' },
  { value: 'triathlon', label: 'Triatleta', icon: '\u{1F3C5}' },
];

export const LEVEL_OPTIONS: { value: SimpleAthleteLevel; label: string }[] = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediario' },
  { value: 'avancado', label: 'Avancado' },
];

// ============================================
// HOOK
// ============================================

export function useAthleteForm({
  mode,
  initialData,
  isOpen,
  onSave,
  onClose,
  autoCloseDelayMs = 1000,
}: UseAthleteFormOptions): UseAthleteFormReturn {
  const getInitialFormData = useCallback((): AthleteFormData => {
    if (initialData) {
      return {
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        modalityLevels: initialData.modality
          ? [{ modality: initialData.modality, level: 'iniciante' }]
          : [],
        requires_cardio_exam: initialData.requires_cardio_exam || false,
        requires_clearance_cert: initialData.requires_clearance_cert || false,
        allow_parq_onboarding: initialData.allow_parq_onboarding || false,
        auth_user_id: initialData.auth_user_id,
        invitation_status: initialData.invitation_status,
      };
    }
    return {
      name: '',
      email: '',
      phone: '',
      modalityLevels: [],
      requires_cardio_exam: false,
      requires_clearance_cert: false,
      allow_parq_onboarding: false,
      auth_user_id: undefined,
      invitation_status: undefined,
    };
  }, [initialData]);

  const [formData, setFormData] = useState<AthleteFormData>(getInitialFormData);
  const [errors, setErrors] = useState<AthleteFormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  // Re-initialize form data when opening with new initialData
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
      setSubmitError(null);
      setSubmitSuccess(false);
      setIsDirty(false);
    }
  }, [isOpen, getInitialFormData]);

  // Load athlete profiles when editing
  useEffect(() => {
    const loadProfiles = async () => {
      if (mode === 'edit' && initialData?.id && isOpen) {
        setIsLoadingProfiles(true);
        try {
          const { data: profiles, error } =
            await AthleteProfileService.getProfilesByAthleteId(initialData.id);

          if (error) {
            console.error('Error loading athlete profiles:', error);
            return;
          }

          if (profiles && profiles.length > 0) {
            const modalityLevels: ModalityLevel[] = profiles.map((profile) => ({
              modality: profile.modality,
              level: profile.level as ModalityLevel['level'],
            }));

            setFormData((prev) => ({ ...prev, modalityLevels }));
          }
        } catch (err) {
          console.error('Error loading athlete profiles:', err);
        } finally {
          setIsLoadingProfiles(false);
        }
      }
    };

    loadProfiles();
  }, [mode, initialData?.id, isOpen]);

  const handleChange = useCallback(
    (field: keyof AthleteFormData, value: string | boolean | undefined) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof AthleteFormErrors];
        return newErrors;
      });
    },
    []
  );

  const handleModalityToggle = useCallback((modality: TrainingModality) => {
    setFormData((prev) => {
      const existingIndex = prev.modalityLevels.findIndex(
        (ml) => ml.modality === modality
      );
      if (existingIndex >= 0) {
        return {
          ...prev,
          modalityLevels: prev.modalityLevels.filter((_, i) => i !== existingIndex),
        };
      }
      return {
        ...prev,
        modalityLevels: [...prev.modalityLevels, { modality, level: 'iniciante' }],
      };
    });
    setIsDirty(true);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.modalityLevels;
      return newErrors;
    });
  }, []);

  const handleLevelChange = useCallback(
    (modality: TrainingModality, level: SimpleAthleteLevel) => {
      setFormData((prev) => ({
        ...prev,
        modalityLevels: prev.modalityLevels.map((ml) =>
          ml.modality === modality ? { ...ml, level } : ml
        ),
      }));
      setIsDirty(true);
    },
    []
  );

  const validate = useCallback((): boolean => {
    const newErrors: AthleteFormErrors = {};

    // In create mode, name/phone are filled by the athlete during onboarding
    if (mode === 'edit') {
      if (!formData.name || formData.name.trim().length < 2) {
        newErrors.name = 'Nome e obrigatorio (min. 2 caracteres)';
      }

      if (!formData.phone || formData.phone.length < 10) {
        newErrors.phone = 'Telefone invalido (formato: +5511987654321)';
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsDirty(false);
  }, [getInitialFormData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setSubmitSuccess(false);

      if (!validate()) return;

      setIsSubmitting(true);

      try {
        const isCreate = mode === 'create';
        const hasModalities = formData.modalityLevels.length > 0;
        const athleteData: Partial<Athlete> & { modalityLevels?: ModalityLevel[] } = {
          name: isCreate ? 'Atleta (pendente)' : formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: isCreate ? '+0000000000' : formData.phone.trim(),
          modality: hasModalities ? formData.modalityLevels[0].modality : undefined,
          level: hasModalities ? formData.modalityLevels[0].level as AthleteLevel : 'iniciante',
          practiced_modalities: hasModalities ? formData.modalityLevels.map((ml) => ml.modality) : [],
          status: isCreate ? 'trial' : 'active',
          invitation_status: isCreate ? 'pending' : formData.invitation_status,
          requires_cardio_exam: formData.requires_cardio_exam,
          requires_clearance_cert: formData.requires_clearance_cert,
          allow_parq_onboarding: formData.allow_parq_onboarding,
          modalityLevels: formData.modalityLevels,
          ...(formData.auth_user_id && {
            auth_user_id: formData.auth_user_id,
            invitation_status: formData.invitation_status || 'connected',
          }),
        };

        const resultId = await onSave(athleteData);

        setSubmitSuccess(true);
        setLastCreatedId(resultId || null);
        setIsDirty(false);

        // In create mode, don't auto-close — show invite link
        if (mode === 'create') {
          // Keep form open to display the invite link
        } else {
          setFormData(getInitialFormData());
          setErrors({});
          setTimeout(() => {
            setSubmitSuccess(false);
            onClose();
          }, autoCloseDelayMs);
        }
      } catch (error: unknown) {
        console.error('Error saving athlete:', error);

        if (error instanceof Error) {
          setSubmitError(error.message);
        } else if (typeof error === 'string') {
          setSubmitError(error);
        } else if (error && typeof error === 'object' && 'message' in error) {
          setSubmitError(String((error as { message: unknown }).message));
        } else {
          setSubmitError(
            'Erro desconhecido ao salvar atleta. Verifique o console para mais detalhes.'
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, onSave, onClose, getInitialFormData, autoCloseDelayMs]
  );

  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'Voce tem alteracoes nao salvas. Deseja realmente sair?'
      );
      if (!confirmed) return;
    }
    resetForm();
    onClose();
  }, [isDirty, resetForm, onClose]);

  const errorCount = Object.keys(errors).length;
  const isFormValid =
    errorCount === 0 &&
    (mode === 'create'
      ? true  // Create mode: no name/phone required (athlete fills during onboarding)
      : !!formData.name && !!formData.phone);

  return {
    formData,
    errors,
    isDirty,
    isSubmitting,
    submitError,
    submitSuccess,
    isLoadingProfiles,
    isFormValid,
    errorCount,
    lastCreatedId,
    handleChange,
    handleModalityToggle,
    handleLevelChange,
    handleSubmit,
    handleClose,
    resetForm,
  };
}
