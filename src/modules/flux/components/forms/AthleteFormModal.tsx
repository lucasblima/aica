/**
 * AthleteFormModal Component (Refactored v2.0)
 *
 * Modal for creating/editing athletes with:
 * - 5 Accordion sections (BasicInfo, Modalities, Account, Health Config, Performance)
 * - Integrated modality + level selection
 * - Health documentation configuration (coach perspective)
 * - Form validation and submission
 * - Dirty state warning on close
 * - Ceramic design system styling
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, ChevronDown, User, Target, Settings, Heart, Zap, Info } from 'lucide-react';
import type { Athlete, AthleteStatus, TrainingModality, SimpleAthleteLevel, ModalityLevel } from '../../types/flux';
import { AthleteProfileService } from '../../services/athleteProfileService';
import { SIMPLE_LEVEL_LABELS } from '../../types/flux';

interface AthleteFormModalProps {
  mode: 'create' | 'edit';
  initialData?: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onSave: (athlete: Partial<Athlete> & { modalityLevels?: ModalityLevel[] }) => Promise<void>;
}

// Form data type
interface FormData {
  name: string;
  email: string;
  phone: string;
  modalityLevels: ModalityLevel[]; // Multiple modalities with levels
  status: AthleteStatus;
  trial_expires_at: string;
  // Health configuration (coach perspective)
  requires_cardio_exam: boolean;
  requires_clearance_cert: boolean;
  allow_parq_onboarding: boolean;
  // Performance thresholds
  ftp: string;
  pace_threshold: string;
  swim_css: string;
}

// Modality options
const MODALITY_OPTIONS: { value: TrainingModality; label: string; icon: string }[] = [
  { value: 'swimming', label: 'Natação', icon: '🏊' },
  { value: 'running', label: 'Corrida', icon: '🏃' },
  { value: 'cycling', label: 'Ciclismo', icon: '🚴' },
  { value: 'strength', label: 'Musculação', icon: '🏋️' },
  { value: 'walking', label: 'Caminhada', icon: '🚶' },
];

// Level options (simplified to 3)
const LEVEL_OPTIONS: { value: SimpleAthleteLevel; label: string }[] = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

// Status options
const STATUS_OPTIONS: { value: AthleteStatus; label: string; description: string; color: string }[] = [
  { value: 'active', label: 'Ativo', description: 'Atleta está treinando normalmente', color: 'text-ceramic-success' },
  { value: 'trial', label: 'Período de Teste', description: 'Atleta em período experimental', color: 'text-ceramic-info' },
  { value: 'paused', label: 'Pausado', description: 'Treinos temporariamente suspensos', color: 'text-ceramic-warning' },
  { value: 'churned', label: 'Desistente', description: 'Não está mais treinando', color: 'text-ceramic-error' },
];

export default function AthleteFormModal({
  mode,
  initialData,
  isOpen,
  onClose,
  onSave,
}: AthleteFormModalProps) {
  // Initial form state
  const getInitialFormData = (): FormData => {
    if (initialData) {
      return {
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        modalityLevels: initialData.modality ? [{ modality: initialData.modality, level: 'iniciante' }] : [],
        status: initialData.status || 'active',
        trial_expires_at: initialData.trial_expires_at || '',
        requires_cardio_exam: initialData.requires_cardio_exam || false,
        requires_clearance_cert: initialData.requires_clearance_cert || false,
        allow_parq_onboarding: initialData.allow_parq_onboarding || false,
        ftp: initialData.ftp?.toString() || '',
        pace_threshold: initialData.pace_threshold || '',
        swim_css: initialData.swim_css || '',
      };
    }
    return {
      name: '',
      email: '',
      phone: '',
      modalityLevels: [],
      status: 'active',
      trial_expires_at: '',
      requires_cardio_exam: false,
      requires_clearance_cert: false,
      allow_parq_onboarding: false,
      ftp: '',
      pace_threshold: '',
      swim_css: '',
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'modalityLevels', string>>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // Accordion state (5 sections)
  const [openSections, setOpenSections] = useState({
    basic: true,
    modalities: false,
    account: false,
    health: false,
    performance: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Load athlete profiles when editing
  useEffect(() => {
    const loadProfiles = async () => {
      if (mode === 'edit' && initialData?.id && isOpen) {
        setIsLoadingProfiles(true);
        try {
          const { data: profiles, error } = await AthleteProfileService.getProfilesByAthleteId(
            initialData.id
          );

          if (error) {
            console.error('Error loading athlete profiles:', error);
            return;
          }

          if (profiles && profiles.length > 0) {
            // Map profiles to modalityLevels
            const modalityLevels: ModalityLevel[] = profiles.map((profile) => ({
              modality: profile.modality,
              // Map from AthleteLevel to SimpleAthleteLevel
              level: profile.level.startsWith('iniciante') ? 'iniciante'
                : profile.level.startsWith('intermediario') ? 'intermediario'
                : 'avancado'
            }));

            setFormData((prev) => ({
              ...prev,
              modalityLevels,
            }));
          }
        } catch (error) {
          console.error('Error loading athlete profiles:', error);
        } finally {
          setIsLoadingProfiles(false);
        }
      }
    };

    loadProfiles();
  }, [mode, initialData?.id, isOpen]);

  // Handle input change
  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Handle modality selection
  const handleModalityToggle = (modality: TrainingModality) => {
    const existingIndex = formData.modalityLevels.findIndex(ml => ml.modality === modality);

    if (existingIndex >= 0) {
      // Remove modality
      setFormData(prev => ({
        ...prev,
        modalityLevels: prev.modalityLevels.filter((_, i) => i !== existingIndex)
      }));
    } else {
      // Add modality with default level 'iniciante'
      setFormData(prev => ({
        ...prev,
        modalityLevels: [...prev.modalityLevels, { modality, level: 'iniciante' }]
      }));
    }

    setIsDirty(true);
    // Clear modality error
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.modalityLevels;
      return newErrors;
    });
  };

  // Handle level change for specific modality
  const handleLevelChange = (modality: TrainingModality, level: SimpleAthleteLevel) => {
    setFormData(prev => ({
      ...prev,
      modalityLevels: prev.modalityLevels.map(ml =>
        ml.modality === modality ? { ...ml, level } : ml
      )
    }));
    setIsDirty(true);
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData | 'modalityLevels', string>> = {};

    // Required fields
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Nome é obrigatório (min. 2 caracteres)';
    }

    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Telefone inválido (formato: +5511987654321)';
    }

    if (!formData.modalityLevels || formData.modalityLevels.length === 0) {
      newErrors.modalityLevels = 'Selecione pelo menos uma modalidade';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Trial expiration required if status is trial
    if (formData.status === 'trial' && !formData.trial_expires_at) {
      newErrors.trial_expires_at = 'Data de expiração obrigatória para período de teste';
    }

    // FTP validation (optional but must be positive if provided)
    if (formData.ftp && (isNaN(Number(formData.ftp)) || Number(formData.ftp) <= 0)) {
      newErrors.ftp = 'FTP deve ser um número positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Build athlete data
      const athleteData: Partial<Athlete> & { modalityLevels?: ModalityLevel[] } = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        modality: formData.modalityLevels[0].modality, // Primary modality
        level: formData.modalityLevels[0].level === 'iniciante' ? 'iniciante_1'
          : formData.modalityLevels[0].level === 'intermediario' ? 'intermediario_1'
          : 'avancado', // Map to full AthleteLevel
        status: formData.status,
        trial_expires_at: formData.status === 'trial' ? formData.trial_expires_at : undefined,
        requires_cardio_exam: formData.requires_cardio_exam,
        requires_clearance_cert: formData.requires_clearance_cert,
        allow_parq_onboarding: formData.allow_parq_onboarding,
        ftp: formData.ftp ? Number(formData.ftp) : undefined,
        pace_threshold: formData.pace_threshold.trim() || undefined,
        swim_css: formData.swim_css.trim() || undefined,
        modalityLevels: formData.modalityLevels, // Pass for profile sync
      };

      await onSave(athleteData);

      setSubmitSuccess(true);
      setIsDirty(false);

      // Reset form data after successful save
      setFormData(getInitialFormData());
      setErrors({});

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving athlete:', error);

      // Show detailed error message
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else if (typeof error === 'string') {
        setSubmitError(error);
      } else if (error && typeof error === 'object' && 'message' in error) {
        setSubmitError(String(error.message));
      } else {
        setSubmitError('Erro desconhecido ao salvar atleta. Verifique o console para mais detalhes.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close with dirty check
  const handleCloseClick = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'Você tem alterações não salvas. Deseja realmente sair?'
      );
      if (!confirmed) return;
    }

    // Reset form on close
    setFormData(getInitialFormData());
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsDirty(false);

    onClose();
  };

  const errorCount = Object.keys(errors).length;
  const isFormValid = errorCount === 0 && formData.name && formData.phone && formData.modalityLevels.length > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseClick();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-3xl max-h-[90vh] bg-ceramic-base rounded-2xl shadow-ceramic-deep overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
            <div>
              <h2 className="text-2xl font-black text-ceramic-text-primary">
                {mode === 'create' ? 'Novo Atleta' : 'Editar Atleta'}
              </h2>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                {mode === 'create'
                  ? 'Cadastre um novo atleta no sistema'
                  : 'Atualize as informações do atleta'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseClick}
              className="p-2 hover:bg-white/30 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-4">
              {/* Error Summary */}
              {submitError && (
                <div className="flex items-start gap-3 p-4 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-ceramic-error mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ceramic-error">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 bg-ceramic-success/10 border border-ceramic-success/20 rounded-lg"
                >
                  <CheckCircle className="w-5 h-5 text-ceramic-success mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ceramic-success">
                      Atleta salvo com sucesso!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Section 1: Basic Info */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('basic')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <User className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      1. Informações Básicas
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.basic ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.basic && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        placeholder="Nome completo do atleta"
                      />
                      {errors.name && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        placeholder="email@exemplo.com"
                      />
                      {errors.email && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.email}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Telefone (WhatsApp) *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        placeholder="+5511987654321"
                      />
                      {errors.phone && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Modalities (NEW) */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('modalities')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <Target className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      2. Modalidades *
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.modalities ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.modalities && (
                  <div className="p-4 pt-0 space-y-4">
                    <p className="text-xs text-ceramic-text-secondary italic">
                      Selecione uma ou mais modalidades e defina o nível para cada uma
                    </p>

                    {MODALITY_OPTIONS.map((modality) => {
                      const modalityLevel = formData.modalityLevels.find(ml => ml.modality === modality.value);
                      const isSelected = !!modalityLevel;

                      return (
                        <div key={modality.value} className="space-y-2">
                          {/* Modality Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleModalityToggle(modality.value)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all border-2 ${
                              isSelected
                                ? 'bg-ceramic-success/10 border-ceramic-success shadow-md'
                                : 'ceramic-inset border-transparent hover:border-ceramic-border'
                            }`}
                          >
                            <span className="text-2xl">{modality.icon}</span>
                            <span className={`text-sm font-bold flex-1 text-left ${
                              isSelected
                                ? 'text-ceramic-success'
                                : 'text-ceramic-text-secondary'
                            }`}>
                              {modality.label}
                            </span>
                            {isSelected && (
                              <CheckCircle className="w-6 h-6 text-ceramic-success flex-shrink-0" />
                            )}
                          </button>

                          {/* Level Selection (only if modality is selected) */}
                          {isSelected && (
                            <AnimatePresence>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pl-12 pr-4 space-y-1"
                              >
                                <label className="block text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1">
                                  Nível
                                </label>
                                <div className="flex gap-2">
                                  {LEVEL_OPTIONS.map((level) => (
                                    <button
                                      key={level.value}
                                      type="button"
                                      onClick={() => handleLevelChange(modality.value, level.value)}
                                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                        modalityLevel?.level === level.value
                                          ? 'bg-ceramic-accent text-white shadow-md'
                                          : 'ceramic-inset text-ceramic-text-secondary hover:bg-white/50'
                                      }`}
                                    >
                                      {level.label}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </AnimatePresence>
                          )}
                        </div>
                      );
                    })}

                    {errors.modalityLevels && (
                      <p className="text-xs text-ceramic-error mt-1">{errors.modalityLevels}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Account Settings (renumbered) */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('account')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <Settings className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      3. Configurações de Conta
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.account ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.account && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Status
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleChange('status', option.value)}
                            className={`px-3 py-3 rounded-lg transition-all text-left ${
                              formData.status === option.value
                                ? 'ceramic-card bg-ceramic-base shadow-md'
                                : 'ceramic-inset hover:bg-white/50'
                            }`}
                            title={option.description}
                          >
                            <div className="space-y-1">
                              <span className={`text-xs font-bold block ${
                                formData.status === option.value
                                  ? option.color
                                  : 'text-ceramic-text-secondary'
                              }`}>
                                {option.label}
                              </span>
                              <span className="text-[10px] text-ceramic-text-secondary block">
                                {option.description}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trial Expiration (only if status is trial) */}
                    {formData.status === 'trial' && (
                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                          Data de Expiração do Trial *
                        </label>
                        <input
                          type="date"
                          value={formData.trial_expires_at}
                          onChange={(e) => handleChange('trial_expires_at', e.target.value)}
                          className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        />
                        {errors.trial_expires_at && (
                          <p className="text-xs text-ceramic-error mt-1">{errors.trial_expires_at}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Health Configuration (REFACTORED) */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('health')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <Heart className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      4. Dados de Saúde
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.health ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.health && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* Info Notice */}
                    <div className="flex items-start gap-3 p-4 bg-ceramic-info/10 border border-ceramic-info/20 rounded-lg">
                      <Info className="w-5 h-5 text-ceramic-info mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-ceramic-info mb-2">
                          📋 Configuração de Onboarding de Saúde
                        </p>
                        <p className="text-sm text-ceramic-text-primary leading-relaxed">
                          Defina as regras de documentação e onboarding para este atleta. Dados detalhados de anamnese serão coletados via IA no módulo Flux.
                        </p>
                      </div>
                    </div>

                    {/* A. Documentation Requirements */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                        Documentação Exigida
                      </label>

                      {/* Cardiological Exam */}
                      <div className="flex items-center justify-between p-3 ceramic-inset rounded-lg mb-2">
                        <div>
                          <p className="text-sm font-medium text-ceramic-text-primary">Exame Cardiológico</p>
                          <p className="text-xs text-ceramic-text-secondary">Laudo médico cardiológico</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('requires_cardio_exam', !formData.requires_cardio_exam)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.requires_cardio_exam ? 'bg-ceramic-success' : 'bg-ceramic-text-secondary/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.requires_cardio_exam ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Clearance Certificate */}
                      <div className="flex items-center justify-between p-3 ceramic-inset rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-ceramic-text-primary">Atestado de Liberação</p>
                          <p className="text-xs text-ceramic-text-secondary">Liberação médica para atividade física</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('requires_clearance_cert', !formData.requires_clearance_cert)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.requires_clearance_cert ? 'bg-ceramic-success' : 'bg-ceramic-text-secondary/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.requires_clearance_cert ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* B. Onboarding Permissions */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                        Permissões de Onboarding
                      </label>

                      {/* PAR-Q Questionnaire */}
                      <div className="flex items-center justify-between p-3 ceramic-inset rounded-lg">
                        <div className="flex-1 mr-4">
                          <p className="text-sm font-medium text-ceramic-text-primary">Liberar Questionário PAR-Q</p>
                          <p className="text-xs text-ceramic-text-secondary">
                            Atleta poderá responder PAR-Q + Termo de Responsabilidade no Flux
                          </p>
                          {formData.allow_parq_onboarding && (
                            <p className="text-xs text-ceramic-warning mt-1 font-medium">
                              ⚠️ Prescrição técnica será liberada apenas após assinatura
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('allow_parq_onboarding', !formData.allow_parq_onboarding)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.allow_parq_onboarding ? 'bg-ceramic-success' : 'bg-ceramic-text-secondary/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.allow_parq_onboarding ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Performance Thresholds (renumbered) */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('performance')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <Zap className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      5. Limiar de Desempenho (Opcional)
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.performance ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.performance && (
                  <div className="p-4 pt-0 space-y-4">
                    <p className="text-xs text-ceramic-text-secondary italic">
                      Configure os valores de limiar de acordo com as modalidades selecionadas
                    </p>

                    {/* FTP (for cycling) */}
                    {formData.modalityLevels.some(ml => ml.modality === 'cycling') && (
                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                          🚴 FTP (Functional Threshold Power)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={formData.ftp}
                            onChange={(e) => handleChange('ftp', e.target.value)}
                            className="flex-1 ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                            placeholder="250"
                            min="0"
                          />
                          <span className="text-xs text-ceramic-text-secondary font-medium">watts</span>
                        </div>
                        {errors.ftp && (
                          <p className="text-xs text-ceramic-error mt-1">{errors.ftp}</p>
                        )}
                      </div>
                    )}

                    {/* Pace Threshold (for running) */}
                    {formData.modalityLevels.some(ml => ml.modality === 'running') && (
                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                          🏃 Pace Limiar
                        </label>
                        <input
                          type="text"
                          value={formData.pace_threshold}
                          onChange={(e) => handleChange('pace_threshold', e.target.value)}
                          className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                          placeholder="4:30/km"
                        />
                      </div>
                    )}

                    {/* CSS (for swimming) */}
                    {formData.modalityLevels.some(ml => ml.modality === 'swimming') && (
                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                          🏊 CSS (Critical Swim Speed)
                        </label>
                        <input
                          type="text"
                          value={formData.swim_css}
                          onChange={(e) => handleChange('swim_css', e.target.value)}
                          className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                          placeholder="1:30/100m"
                        />
                      </div>
                    )}

                    {formData.modalityLevels.length === 0 && (
                      <p className="text-xs text-ceramic-text-secondary italic">
                        Selecione pelo menos uma modalidade para configurar os limiares
                      </p>
                    )}

                    {formData.modalityLevels.length > 0 &&
                     !formData.modalityLevels.some(ml => ['cycling', 'running', 'swimming'].includes(ml.modality)) && (
                      <p className="text-xs text-ceramic-text-secondary italic">
                        Limiares específicos não aplicáveis para as modalidades selecionadas
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-ceramic-text-secondary/10 bg-white/20">
            <div className="flex items-center gap-2">
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-ceramic-error">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {errorCount} erro{errorCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {isDirty && !errorCount && (
                <span className="text-xs text-ceramic-text-secondary">Alterações não salvas</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCloseClick}
                className="px-4 py-2 rounded-lg text-sm font-medium text-ceramic-text-primary hover:bg-white/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{mode === 'create' ? 'Criar Atleta' : 'Salvar Alterações'}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
