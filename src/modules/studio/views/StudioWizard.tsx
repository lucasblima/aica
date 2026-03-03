/**
 * StudioWizard Component
 *
 * Generic wizard shell for creating new projects in the Studio module.
 * Routes to the appropriate form component based on projectType.
 * Currently supports podcast; video/article show a "coming soon" placeholder.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import type { StudioWizardProps, StudioProject, DeepResearchResult } from '../types/studio';
import { getProjectTypeConfig } from '../config/projectTypeConfigs';
import { PodcastWizardForm, ComingSoonForm } from '../components/wizard';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('StudioWizard');

// ============================================================================
// TYPES
// ============================================================================

interface WizardFormData {
  title: string;
  guestName: string;
  guestContext: string;
  theme: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  season: string;
  guestContactId: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCATIONS = [
  'Radio Tupi',
  'Estudio Remoto',
  'Podcast House',
  'Outro'
];

// ============================================================================
// COMPONENT
// ============================================================================

export const StudioWizard: React.FC<StudioWizardProps> = ({
  showId,
  userId,
  projectType = 'podcast',
  onComplete,
  onCancel
}) => {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const [researchResults, setResearchResults] = useState<DeepResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<WizardFormData>({
    title: '',
    guestName: '',
    guestContext: '',
    theme: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    location: LOCATIONS[0],
    season: '1',
    guestContactId: null,
  });

  const config = getProjectTypeConfig(projectType);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStartResearch = useCallback(async () => {
    setIsResearching(true);
    setResearchError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('studio-deep-research', {
        body: {
          guestName: formData.guestName,
          guestContext: formData.guestContext.trim() || formData.guestName.trim(),
          researchDepth: 'standard',
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro na pesquisa');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Pesquisa nao retornou resultados');
      }

      const result = data.data as DeepResearchResult;
      setResearchResults(result);
      setCurrentStep(3);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido na pesquisa';
      setResearchError(message);
      log.error('Deep research error:', err);
    } finally {
      setIsResearching(false);
    }
  }, [formData.guestName, formData.guestContext]);

  const handleCreate = async () => {
    if (!formData.guestName.trim()) {
      setError('Nome do convidado e obrigatorio');
      return;
    }
    if (!showId || showId.trim() === '') {
      setError('Erro: Podcast nao selecionado. Por favor, selecione um podcast primeiro.');
      return;
    }

    setIsCreatingProject(true);
    setError(null);

    try {
      // Build insert payload, including research data so it persists to the workspace
      const insertPayload: Record<string, any> = {
        show_id: showId,
        user_id: userId,
        title: formData.title.trim() || `Episodio com ${formData.guestName.trim()}`,
        description: formData.description || null,
        guest_name: formData.guestName || null,
        guest_reference: formData.guestContext || null,
        guest_contact_id: formData.guestContactId || null,
        episode_theme: formData.theme || null,
        status: 'draft',
        scheduled_date: formData.scheduledDate || null,
        scheduled_time: formData.scheduledTime || null,
        location: formData.location || null,
        season: formData.season || '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Persist research results so the workspace can load them (#662)
      // Only columns that exist on podcast_episodes: biography, controversies, ice_breakers
      // (technical_sheet, suggested_topics, deep_research live on podcast_guest_research table)
      if (researchResults?.dossier) {
        insertPayload.biography = researchResults.dossier.biography || null;
        insertPayload.controversies = researchResults.dossier.controversies || [];
        insertPayload.ice_breakers = researchResults.dossier.iceBreakers || [];
      }

      const { data: episode, error: dbError } = await supabase
        .from('podcast_episodes')
        .insert(insertPayload)
        .select()
        .single();

      if (dbError) {
        throw new Error(`Erro ao criar episodio: ${dbError.message}`);
      }

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
          guestContext: formData.guestContext,
          episodeTheme: formData.theme,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          location: formData.location,
          season: formData.season,
          recordingDuration: 0,
          ...(researchResults ? { deepResearch: researchResults } : {}),
        }
      };

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
      formData.guestName.trim() ||
      formData.guestContext.trim()
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

  const canCreate =
    projectType === 'podcast' &&
    formData.guestName.trim().length > 0;

  const isComingSoon = config.comingSoon;

  const progressPercent = isComingSoon
    ? 0
    : (currentStep / 4) * 100;

  const inputClasses = "w-full px-4 py-3 rounded-xl bg-ceramic-base text-ceramic-text-primary placeholder-ceramic-text-secondary border-2 border-ceramic-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all";

  // ============================================================================
  // RENDER FORM CONTENT
  // ============================================================================

  const renderFormContent = () => {
    switch (projectType) {
      case 'podcast':
        return (
          <PodcastWizardForm
            formData={formData}
            onChange={handleFieldChange}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            researchResults={researchResults}
            onStartResearch={handleStartResearch}
            isResearching={isResearching}
            researchError={researchError}
            inputClasses={inputClasses}
          />
        );
      default:
        return <ComingSoonForm typeConfig={config} />;
    }
  };

  // ============================================================================
  // HEADER LABELS
  // ============================================================================

  const stepLabels: Record<number, string> = {
    1: 'Quem e o convidado?',
    2: 'Pesquisando...',
    3: 'Escolha tema e titulo',
    4: 'Confirmar e criar',
  };

  const headerTitle = projectType === 'podcast'
    ? 'Novo Episodio'
    : `Novo ${config.label}`;

  const headerSubtitle = projectType === 'podcast'
    ? stepLabels[currentStep] || ''
    : config.description;

  // Hide bottom actions during loading step or when on step 1/3 (they have their own buttons)
  const showBottomActions = projectType !== 'podcast' || currentStep === 4;

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
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do formulario"
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content Area */}
        <div className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 id="wizard-title" className="text-3xl font-bold text-ceramic-text-primary">
                {headerTitle}
              </h2>
              <p className="text-ceramic-text-secondary">
                {headerSubtitle}
              </p>
            </div>

            {/* Form Content — routed by projectType */}
            {renderFormContent()}

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

            {/* Actions — shown on step 4 (confirm) or non-podcast types */}
            {showBottomActions && (
              <div className="flex gap-3 pt-4">
                <button
                  data-testid="wizard-cancel-button"
                  onClick={handleCancel}
                  disabled={isCreatingProject}
                  className="flex-1 py-3 px-6 rounded-xl text-ceramic-text-secondary font-bold hover:bg-ceramic-base disabled:opacity-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  data-testid="create-button"
                  onClick={handleCreate}
                  disabled={!canCreate || isCreatingProject}
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
                      Criar Episodio
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Cancel link on steps 1-3 */}
            {projectType === 'podcast' && !showBottomActions && (
              <div className="text-center pt-2">
                <button
                  data-testid="wizard-cancel-button"
                  onClick={handleCancel}
                  className="text-sm text-ceramic-text-secondary hover:text-ceramic-error transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </motion.div>
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
                    Cancelar criacao?
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary mt-1">
                    Voce perdera todas as informacoes preenchidas.
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
