/**
 * StudioWizard Component
 *
 * Generic wizard shell for creating new projects in the Studio module.
 * Routes to the appropriate form component based on projectType.
 * Currently supports podcast; video/article show a "coming soon" placeholder.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import type { StudioWizardProps, StudioProject } from '../types/studio';
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
  theme: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  season: string;
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

  const modalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<WizardFormData>({
    title: '',
    guestName: '',
    theme: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    location: LOCATIONS[0],
    season: '1'
  });

  const config = getProjectTypeConfig(projectType);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      setError('Titulo e obrigatorio');
      return;
    }
    if (!formData.guestName.trim()) {
      setError('Nome do convidado e obrigatorio');
      return;
    }
    if (!formData.theme.trim()) {
      setError('Tema e obrigatorio');
      return;
    }
    if (!showId || showId.trim() === '') {
      setError('Erro: Podcast nao selecionado. Por favor, selecione um podcast primeiro.');
      return;
    }

    setIsCreatingProject(true);
    setError(null);

    try {
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
          episodeTheme: formData.theme,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          location: formData.location,
          season: formData.season,
          recordingDuration: 0
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

  const canCreate =
    projectType === 'podcast' &&
    formData.title.trim().length > 0 &&
    formData.guestName.trim().length > 0 &&
    formData.theme.trim().length > 0;

  const isComingSoon = config.comingSoon;

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

  const headerTitle = projectType === 'podcast'
    ? 'Novo Episodio'
    : `Novo ${config.label}`;

  const headerSubtitle = projectType === 'podcast'
    ? 'Preencha os dados essenciais para criar seu episodio'
    : config.description;

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
            aria-valuenow={canCreate ? 100 : (isComingSoon ? 0 : 50)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do formulario"
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
            initial={{ width: '0%' }}
            animate={{ width: canCreate ? '100%' : (isComingSoon ? '0%' : '50%') }}
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

            {/* Actions */}
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
