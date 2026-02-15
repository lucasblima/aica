/**
 * AthleteFormDrawer Component
 *
 * Drawer lateral (desktop) / bottom (mobile) para criação/edição de atletas.
 * Inspirado no design da Apple - transições suaves, contexto preservado.
 *
 * Features:
 * - Desktop: Slide-in da direita (600-700px width)
 * - Mobile: Slide-in de baixo (full-height)
 * - Backdrop translúcido (preserva contexto)
 * - Swipe to dismiss (mobile)
 * - 3 seções: Basic Info + Modalities + Health Config
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import { X, AlertCircle, CheckCircle, ChevronDown, User, Target, Heart, Info } from 'lucide-react';
import type { Athlete, AthleteStatus, TrainingModality, SimpleAthleteLevel, ModalityLevel, AthleteLevel } from '../../types/flux';
import { AthleteProfileService } from '../../services/athleteProfileService';
import { SIMPLE_LEVEL_LABELS } from '../../types/flux';

interface AthleteFormDrawerProps {
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
  // Health configuration (coach perspective)
  requires_cardio_exam: boolean;
  requires_clearance_cert: boolean;
  allow_parq_onboarding: boolean;
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

export default function AthleteFormDrawer({
  mode,
  initialData,
  isOpen,
  onClose,
  onSave,
}: AthleteFormDrawerProps) {
  // Initial form state
  const getInitialFormData = (): FormData => {
    if (initialData) {
      return {
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        modalityLevels: initialData.modality ? [{ modality: initialData.modality, level: 'iniciante' }] : [],
        requires_cardio_exam: initialData.requires_cardio_exam || false,
        requires_clearance_cert: initialData.requires_clearance_cert || false,
        allow_parq_onboarding: initialData.allow_parq_onboarding || false,
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
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'modalityLevels', string>>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // Accordion state (3 sections)
  const [openSections, setOpenSections] = useState({
    basic: true,
    modalities: false,
    health: false,
  });

  // Swipe to dismiss (mobile)
  const y = useMotionValue(0);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
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
          : 'avancado' as AthleteLevel, // Map to full AthleteLevel
        status: 'active', // Default to active (no longer configurable in modal)
        requires_cardio_exam: formData.requires_cardio_exam,
        requires_clearance_cert: formData.requires_clearance_cert,
        allow_parq_onboarding: formData.allow_parq_onboarding,
        modalityLevels: formData.modalityLevels, // Pass for profile sync
      };

      await onSave(athleteData);

      setSubmitSuccess(true);
      setIsDirty(false);

      // Reset form data after successful save
      setFormData(getInitialFormData());
      setErrors({});

      // Auto-close after 1 second
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1000);
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

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close drawer if dragged down >150px on mobile
    if (info.offset.y > 150) {
      handleCloseClick();
    }
  };

  const errorCount = Object.keys(errors).length;
  const isFormValid = errorCount === 0 && formData.name && formData.phone && formData.modalityLevels.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={handleCloseClick}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] lg:w-[700px] bg-ceramic-base shadow-2xl flex flex-col
                       sm:rounded-l-2xl overflow-hidden"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center py-2 bg-ceramic-base border-b border-ceramic-text-secondary/10">
              <div className="w-12 h-1 rounded-full bg-ceramic-text-secondary/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10 bg-white/20">
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

            {/* Form Content (scrollable) */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
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
                          disabled={initialData?.invitation_status === 'connected'}
                          className={`w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 ${
                            initialData?.invitation_status === 'connected' ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          placeholder="email@exemplo.com"
                        />
                        {errors.email && (
                          <p className="text-xs text-ceramic-error mt-1">{errors.email}</p>
                        )}
                        {/* Connection status hints */}
                        {formData.email && initialData?.invitation_status === 'connected' && (
                          <p className="text-xs text-ceramic-success mt-1.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-ceramic-success" />
                            Conectado
                          </p>
                        )}
                        {formData.email && initialData?.invitation_status !== 'connected' && formData.email.includes('@') && (
                          <p className="text-xs text-ceramic-text-secondary mt-1.5">
                            Quando {formData.name || 'o atleta'} criar conta AICA, será conectado automaticamente
                          </p>
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

                {/* Section 2: Modalities */}
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

                {/* Section 3: Health Configuration */}
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
                        3. Dados de Saúde
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
              </div>
            </form>

            {/* Footer (fixed) */}
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
                  onClick={handleFormSubmit}
                  disabled={!isFormValid || isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
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
        </>
      )}
    </AnimatePresence>
  );
}
