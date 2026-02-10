/**
 * StudioWizard Component
 *
 * Multi-step wizard for creating new projects in the Studio module.
 * Currently supports podcast projects with extensibility for future project types.
 *
 * Features:
 * - Step 1: Project type selection (only "podcast" enabled)
 * - Step 2: Basic information (title, description, theme)
 * - Step 3: Project-specific configuration (for podcasts: guest info, scheduling)
 * - Automatic episode creation in Supabase
 * - Returns StudioProject via onComplete callback
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Podcast,
  Video,
  FileText,
  Calendar,
  MapPin,
  User,
  Users,
  Hash
} from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import type { StudioWizardProps, StudioProject } from '../types/studio';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('StudioWizard');

// ============================================================================
// TYPES
// ============================================================================

type ProjectTypeOption = 'podcast' | 'video' | 'article';

type GuestType = 'individual' | 'duo' | 'trio' | 'panel';

interface WizardFormData {
  projectType: ProjectTypeOption;
  title: string;
  description: string;
  theme: string;

  // Podcast-specific fields
  guestType: GuestType;
  guestName: string;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  season: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCATIONS = [
  'Rádio Tupi',
  'Estúdio Remoto',
  'Podcast House',
  'Outro'
];

const PROJECT_TYPES = [
  {
    id: 'podcast' as ProjectTypeOption,
    label: 'Podcast',
    description: 'Crie um novo episódio de podcast',
    icon: Podcast,
    enabled: true
  },
  {
    id: 'video' as ProjectTypeOption,
    label: 'Vídeo',
    description: 'Produção de vídeo',
    icon: Video,
    enabled: false,
    badge: 'Em breve'
  },
  {
    id: 'article' as ProjectTypeOption,
    label: 'Artigo',
    description: 'Escrever um novo artigo',
    icon: FileText,
    enabled: false,
    badge: 'Em breve'
  }
];

const GUEST_TYPES = [
  { id: 'individual' as GuestType, label: 'Individual', description: '1 convidado' },
  { id: 'duo' as GuestType, label: 'Dupla', description: '2 convidados' },
  { id: 'trio' as GuestType, label: 'Trio', description: '3 convidados' },
  { id: 'panel' as GuestType, label: 'Painel', description: '4+ convidados' }
];

// ============================================================================
// COMPONENT
// ============================================================================

export const StudioWizard: React.FC<StudioWizardProps> = ({
  showId,
  userId,
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<WizardFormData>({
    projectType: 'podcast',
    title: '',
    description: '',
    theme: '',
    guestType: 'individual',
    guestName: '',
    scheduledDate: '',
    scheduledTime: '',
    location: LOCATIONS[0],
    season: '1'
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleProjectTypeSelect = (type: ProjectTypeOption) => {
    const selectedType = PROJECT_TYPES.find(t => t.id === type);
    if (selectedType?.enabled) {
      setFormData(prev => ({ ...prev, projectType: type }));
      setStep(1);
      setError(null);
    }
  };

  const handleNext = () => {
    // Validate current step
    if (step === 1) {
      if (!formData.title.trim()) {
        setError('Título é obrigatório');
        return;
      }
    }

    setStep((prev) => (prev + 1) as 0 | 1 | 2);
    setError(null);
  };

  const handleBack = () => {
    setStep((prev) => (prev - 1) as 0 | 1 | 2);
    setError(null);
  };

  const handleCreate = async () => {
    // Validate podcast-specific fields
    if (formData.projectType === 'podcast') {
      // Validate show ID is provided
      if (!showId || showId.trim() === '') {
        setError('Erro: Podcast não selecionado. Por favor, selecione um podcast primeiro.');
        return;
      }

      if (!formData.guestName.trim()) {
        setError('Nome do convidado é obrigatório');
        return;
      }
      if (!formData.theme.trim()) {
        setError('Tema é obrigatório');
        return;
      }
    }

    setIsCreatingProject(true);
    setError(null);

    try {
      // Create episode in Supabase
      const { data: episode, error: dbError } = await supabase
        .from('podcast_episodes')
        .insert({
          show_id: showId,
          user_id: userId,
          title: formData.title,
          description: formData.description || null,
          guest_name: formData.guestName || null,
          episode_theme: formData.theme || null,
          status: 'draft',
          scheduled_date: formData.scheduledDate || null,
          location: formData.location || null,
          season: formData.season || '1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Erro ao criar episódio: ${dbError.message}`);
      }

      // Convert episode to StudioProject
      const project: StudioProject = {
        id: episode.id,
        type: 'podcast',
        title: episode.title,
        description: episode.description,
        showId: showId,
        status: 'draft',
        createdAt: new Date(episode.created_at),
        updatedAt: new Date(episode.updated_at),
        metadata: {
          type: 'podcast',
          guestName: formData.guestName,
          episodeTheme: formData.theme,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          location: formData.location,
          season: formData.season,
          recordingDuration: 0
        }
      };

      // Call completion callback
      onComplete(project);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      log.error('Error creating project:', err);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleCancel = () => {
    if (hasEnteredData()) {
      setShowCancelConfirmation(true);
    } else {
      onCancel();
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirmation(false);
    onCancel();
  };

  const hasEnteredData = (): boolean => {
    return !!(
      formData.title.trim() ||
      formData.description.trim() ||
      formData.theme.trim() ||
      formData.guestName.trim()
    );
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [hasEnteredData]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const canProceedStep1 = formData.title.trim().length > 0;
  const canProceedStep2 =
    formData.guestName.trim().length > 0 &&
    formData.theme.trim().length > 0;

  const progressPercentage = (step / 2) * 100;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full flex items-center justify-center p-4" data-testid="studio-wizard">
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-ceramic-base rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-1 bg-ceramic-cool relative">
          <motion.div
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Passo ${step + 1} de 3`}
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center items-center gap-2 py-4 px-8 bg-ceramic-base border-b border-ceramic-border">
          {[0, 1, 2].map((stepIndex) => (
            <div key={stepIndex} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  stepIndex === step
                    ? 'bg-amber-500 text-white shadow-lg'
                    : stepIndex < step
                    ? 'bg-ceramic-success text-white'
                    : 'bg-ceramic-cool text-ceramic-text-secondary'
                }`}
              >
                {stepIndex < step ? '✓' : stepIndex + 1}
              </div>
              {stepIndex < 2 && (
                <div
                  className={`w-8 h-1 mx-2 ${
                    stepIndex < step
                      ? 'bg-ceramic-success'
                      : stepIndex === step
                      ? 'bg-amber-500'
                      : 'bg-ceramic-cool'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* STEP 0: Project Type Selection */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 id="wizard-title" className="text-3xl font-bold text-ceramic-text-primary">
                    Novo Projeto
                  </h2>
                  <p className="text-ceramic-text-secondary">
                    Escolha o tipo de projeto que deseja criar
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PROJECT_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.projectType === type.id;

                    return (
                      <motion.button
                        key={type.id}
                        onClick={() => handleProjectTypeSelect(type.id)}
                        disabled={!type.enabled}
                        whileHover={type.enabled ? { scale: 1.05 } : undefined}
                        whileTap={type.enabled ? { scale: 0.95 } : undefined}
                        className={`relative p-6 rounded-2xl border-2 transition-all ${
                          type.enabled
                            ? isSelected
                              ? 'border-amber-500 bg-amber-50 shadow-lg cursor-pointer'
                              : 'border-ceramic-border bg-ceramic-base hover:border-ceramic-cool cursor-pointer'
                            : 'border-ceramic-border bg-ceramic-base cursor-not-allowed opacity-60'
                        }`}
                      >
                        {/* Badge for disabled types */}
                        {!type.enabled && (
                          <div className="absolute -top-2 -right-2 px-3 py-1 bg-ceramic-border text-white text-xs font-bold rounded-full">
                            {type.badge}
                          </div>
                        )}

                        {/* Selection indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg"
                          >
                            <Sparkles className="w-4 h-4 text-white" />
                          </motion.div>
                        )}

                        <div className="flex flex-col items-center text-center space-y-3">
                          <div
                            className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all ${
                              type.enabled && isSelected
                                ? 'bg-amber-500'
                                : 'bg-ceramic-base'
                            }`}
                          >
                            <Icon
                              className={`w-8 h-8 ${
                                type.enabled && isSelected
                                  ? 'text-white'
                                  : 'text-ceramic-text-secondary'
                              }`}
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-ceramic-text-primary">
                              {type.label}
                            </h3>
                            <p className="text-xs text-ceramic-text-secondary mt-1">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    data-testid="wizard-cancel-button"
                    onClick={handleCancel}
                    className="flex-1 py-3 px-6 rounded-xl text-ceramic-text-secondary font-bold hover:bg-ceramic-base transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 1: Basic Information */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-ceramic-text-primary">
                    Informações Básicas
                  </h2>
                  <p className="text-ceramic-text-secondary">
                    Complete os detalhes do seu {formData.projectType}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      Título
                    </label>
                    <input
                      data-testid="episode-title"
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Ex: Conversa com Eduardo Paes"
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary placeholder-ceramic-text-secondary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      Descrição (Opcional)
                    </label>
                    <textarea
                      data-testid="episode-description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          description: e.target.value
                        }))
                      }
                      placeholder="Adicione detalhes sobre o episódio..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary placeholder-ceramic-text-secondary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Theme */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      Tema
                    </label>
                    <input
                      type="text"
                      value={formData.theme}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, theme: e.target.value }))
                      }
                      placeholder="Ex: Políticas Públicas, Inovação"
                      className="w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary placeholder-ceramic-text-secondary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-ceramic-error-bg border border-ceramic-error/30 flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-ceramic-error">{error}</p>
                    </motion.div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-4">
                  <button
                    data-testid="wizard-back-button"
                    onClick={handleBack}
                    className="flex-1 py-3 px-6 rounded-xl text-ceramic-text-secondary font-bold hover:bg-ceramic-base transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <button
                    data-testid="next-button"
                    onClick={handleNext}
                    disabled={!canProceedStep1}
                    className="flex-1 py-3 px-6 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Project-Specific Configuration (Podcasts) */}
            {step === 2 && formData.projectType === 'podcast' && (
              <motion.div
                key="step2-podcast"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-ceramic-text-primary">
                    Configurar Convidado
                  </h2>
                  <p className="text-ceramic-text-secondary">
                    Defina os detalhes do episódio
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Guest Type */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      Tipo de Convidado
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {GUEST_TYPES.map((guestTypeOption) => (
                        <motion.button
                          key={guestTypeOption.id}
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              guestType: guestTypeOption.id
                            }))
                          }
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            formData.guestType === guestTypeOption.id
                              ? 'border-amber-500 bg-amber-50'
                              : 'border-ceramic-border bg-ceramic-base hover:border-ceramic-cool'
                          }`}
                        >
                          <div className="text-sm font-bold text-ceramic-text-primary">
                            {guestTypeOption.label}
                          </div>
                          <div className="text-xs text-ceramic-text-secondary mt-1">
                            {guestTypeOption.description}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Guest Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      <User className="w-3 h-3 inline mr-1" />
                      Nome do Convidado
                    </label>
                    <input
                      data-testid="guest-name"
                      type="text"
                      value={formData.guestName}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          guestName: e.target.value
                        }))
                      }
                      placeholder="Ex: João Silva"
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary placeholder-ceramic-text-secondary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Scheduling Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Data (Opcional)
                      </label>
                      <input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            scheduledDate: e.target.value
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                        Hora (Opcional)
                      </label>
                      <input
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            scheduledTime: e.target.value
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Local (Opcional)
                      </label>
                      <select
                        value={formData.location}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            location: e.target.value
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      >
                        {LOCATIONS.map(loc => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Season */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                        <Hash className="w-3 h-3 inline mr-1" />
                        Temporada (Opcional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.season}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            season: e.target.value
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-ceramic-error-bg border border-ceramic-error/30 flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-ceramic-error">{error}</p>
                    </motion.div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleBack}
                    disabled={isCreatingProject}
                    className="flex-1 py-3 px-6 rounded-xl text-ceramic-text-secondary font-bold hover:bg-ceramic-base disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <button
                    data-testid="create-button"
                    onClick={handleCreate}
                    disabled={!canProceedStep2 || isCreatingProject}
                    className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isCreatingProject ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Criar Episódio
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
            onClick={() => setShowCancelConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-ceramic-base rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ceramic-text-primary">
                    Cancelar criação?
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary mt-1">
                    Você perderá todas as informações preenchidas.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirmation(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary font-bold hover:bg-ceramic-cool transition-colors"
                >
                  Continuar
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 px-4 py-3 rounded-xl bg-ceramic-error text-white font-bold hover:bg-ceramic-error/90 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudioWizard;
