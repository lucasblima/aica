/**
 * Guest Identification Wizard
 *
 * Multi-step wizard for guest identification and episode creation.
 *
 * Workflow:
 * - Public Figure: Step 0 → Step 1a → Step 2 → Step 3
 * - Direct Contact: Step 0 → Step 1b → Step 3 (skips Step 2)
 *
 * Steps:
 * - Step 0 (guest-type): Choose between Public Figure or Direct Contact
 * - Step 1a (search-public): Search and select public figure
 * - Step 1b (manual-form): Manual contact information entry
 * - Step 2 (confirm-profile): Confirm public figure profile (public-figure only)
 * - Step 3 (episode-details): Episode details and scheduling
 */

import React, { useState } from 'react';
import type {
  WizardStep,
  GuestType,
  WizardState,
  EpisodeCreationData,
  GuestProfile
} from '../types/wizard.types';
import { GuestTypeSelector, GuestManualForm, EpisodeDetailsForm } from './wizard';
import { createEpisode, type PodcastEpisode } from '../services/episodeService';

// Component Props
export interface GuestIdentificationWizardProps {
  showId: string;
  userId: string;
  onComplete: (episode: PodcastEpisode) => void;
  onCancel: () => void;
}

// Initial wizard state
const initialState: WizardState = {
  currentStep: 'guest-type',
  guestType: null,
  guestData: {
    name: '',
    email: undefined,
    phone: undefined,
    reference: undefined,
    confirmedProfile: undefined,
  },
  episodeData: {
    theme: '',
    themeMode: 'auto',
    season: 1,
    location: '',
    scheduledDate: undefined,
    scheduledTime: undefined,
  },
};

export const GuestIdentificationWizard: React.FC<GuestIdentificationWizardProps> = ({
  showId,
  userId,
  onComplete,
  onCancel,
}) => {
  // Wizard state management
  const [wizardState, setWizardState] = useState<WizardState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Calculate progress percentage based on current step
  const getProgressPercentage = (): number => {
    const stepOrder: WizardStep[] =
      wizardState.guestType === 'public-figure'
        ? ['guest-type', 'search-public', 'confirm-profile', 'episode-details']
        : ['guest-type', 'manual-form', 'episode-details'];

    const currentIndex = stepOrder.indexOf(wizardState.currentStep);
    const totalSteps = stepOrder.length;

    return ((currentIndex + 1) / totalSteps) * 100;
  };

  // Navigation handlers
  const handleNext = (stepData?: Partial<WizardState>) => {
    setWizardState((prev) => {
      const updated = { ...prev, ...stepData };

      // Determine next step based on current step and guest type
      let nextStep: WizardStep = prev.currentStep;

      switch (prev.currentStep) {
        case 'guest-type':
          nextStep = updated.guestType === 'public-figure' ? 'search-public' : 'manual-form';
          break;
        case 'search-public':
          nextStep = 'confirm-profile';
          break;
        case 'manual-form':
          nextStep = 'episode-details';
          break;
        case 'confirm-profile':
          nextStep = 'episode-details';
          break;
        case 'episode-details':
          // Final step - will call onComplete
          break;
      }

      return { ...updated, currentStep: nextStep };
    });
  };

  const handleBack = () => {
    setWizardState((prev) => {
      // Determine previous step based on current step and guest type
      let prevStep: WizardStep = prev.currentStep;

      switch (prev.currentStep) {
        case 'search-public':
        case 'manual-form':
          prevStep = 'guest-type';
          break;
        case 'confirm-profile':
          prevStep = 'search-public';
          break;
        case 'episode-details':
          prevStep = prev.guestType === 'public-figure' ? 'confirm-profile' : 'manual-form';
          break;
      }

      return { ...prev, currentStep: prevStep };
    });
  };

  const handleCancel = () => {
    // Reset state and call parent cancel handler
    setWizardState(initialState);
    onCancel();
  };

  const handleComplete = async (finalEpisodeData: Partial<WizardState['episodeData']>) => {
    // Reset error state
    setSaveError(null);
    setIsSaving(true);

    try {
      console.log('[GuestIdentificationWizard] Starting episode creation...');

      // Merge final episode data
      const completeData: EpisodeCreationData = {
        // Guest information
        guest_name: wizardState.guestData.name,
        guest_email: wizardState.guestData.email,
        guest_phone: wizardState.guestData.phone,
        guest_reference: wizardState.guestData.reference,
        guest_profile: wizardState.guestData.confirmedProfile,

        // Episode information
        episode_theme: finalEpisodeData.theme || wizardState.episodeData.theme,
        theme_mode: finalEpisodeData.themeMode || wizardState.episodeData.themeMode,
        season: finalEpisodeData.season || wizardState.episodeData.season,
        location: finalEpisodeData.location || wizardState.episodeData.location,
        scheduled_date: finalEpisodeData.scheduledDate || wizardState.episodeData.scheduledDate,
        scheduled_time: finalEpisodeData.scheduledTime || wizardState.episodeData.scheduledTime,

        // Metadata
        status: 'draft',
      };

      console.log('[GuestIdentificationWizard] Episode data prepared:', completeData);

      // Save episode to Supabase
      const { data: episode, error } = await createEpisode({
        ...completeData,
        show_id: showId,
        guest_type: wizardState.guestType || 'direct-contact',
      });

      if (error || !episode) {
        console.error('[GuestIdentificationWizard] Error creating episode:', error);
        setSaveError(error?.message || 'Erro ao salvar episódio. Tente novamente.');
        return;
      }

      console.log('[GuestIdentificationWizard] Episode created successfully:', episode.id);

      // Call parent completion handler with the created episode
      onComplete(episode);
    } catch (error) {
      console.error('[GuestIdentificationWizard] Unexpected error:', error);
      setSaveError('Erro inesperado ao salvar episódio. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Update wizard state helpers
  const updateGuestType = (guestType: GuestType) => {
    handleNext({ guestType });
  };

  const updateGuestData = (data: Partial<WizardState['guestData']>) => {
    setWizardState((prev) => ({
      ...prev,
      guestData: { ...prev.guestData, ...data },
    }));
  };

  const updateEpisodeData = (data: Partial<WizardState['episodeData']>) => {
    setWizardState((prev) => ({
      ...prev,
      episodeData: { ...prev.episodeData, ...data },
    }));
  };

  // Handler for manual form submission
  const handleManualFormSubmit = (data: { name: string; phone: string; email: string }) => {
    setWizardState((prev) => ({
      ...prev,
      guestData: {
        ...prev.guestData,
        name: data.name,
        phone: data.phone,
        email: data.email,
      },
    }));
    handleNext();
  };

  // Render current step
  const renderStep = () => {
    switch (wizardState.currentStep) {
      case 'guest-type':
        return (
          <GuestTypeSelector
            onSelectType={updateGuestType}
            onCancel={handleCancel}
          />
        );

      case 'search-public':
        return (
          <div
            data-testid="guest-search-form-placeholder"
            className="ceramic-card p-8 space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-ceramic-text-primary">
                Buscar Figura Pública
              </h2>
              <p className="text-ceramic-text-secondary">
                GuestNameSearchForm será implementado na Task 1.3
              </p>
            </div>

            {/* Temporary action buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleBack}
                className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  updateGuestData({ name: 'Teste Convidado' });
                  handleNext();
                }}
                className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all"
              >
                Continuar (Teste)
              </button>
            </div>
          </div>
        );

      case 'manual-form':
        return (
          <GuestManualForm
            initialData={{
              name: wizardState.guestData.name,
              phone: wizardState.guestData.phone || '',
              email: wizardState.guestData.email || '',
            }}
            onSubmit={handleManualFormSubmit}
            onBack={handleBack}
          />
        );

      case 'confirm-profile':
        return (
          <div
            data-testid="guest-profile-confirmation-placeholder"
            className="ceramic-card p-8 space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-ceramic-text-primary">
                Confirmar Perfil
              </h2>
              <p className="text-ceramic-text-secondary">
                GuestProfileConfirmation será implementado na Task 1.5
              </p>
            </div>

            {/* Temporary action buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleBack}
                className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={() => handleNext()}
                className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all"
              >
                Confirmar (Teste)
              </button>
            </div>
          </div>
        );

      case 'episode-details':
        return (
          <div className="space-y-4">
            {/* Error message */}
            {saveError && (
              <div className="ceramic-card p-4 bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-red-800 font-bold mb-1">Erro ao Salvar</h3>
                    <p className="text-red-700 text-sm">{saveError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Episode details form */}
            <EpisodeDetailsForm
              guestName={wizardState.guestData.name}
              initialData={{
                theme: wizardState.episodeData.theme,
                season: wizardState.episodeData.season,
                location: wizardState.episodeData.location,
                scheduledDate: wizardState.episodeData.scheduledDate,
                scheduledTime: wizardState.episodeData.scheduledTime,
                themeMode: wizardState.episodeData.themeMode,
              }}
              onSubmit={(data) => {
                updateEpisodeData(data);
                handleComplete(data);
              }}
              onBack={handleBack}
              isLoading={isSaving}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-ceramic-text-secondary">
          <span>Progresso</span>
          <span>{Math.round(getProgressPercentage())}%</span>
        </div>
        <div className="h-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {renderStep()}
    </div>
  );
};

export default GuestIdentificationWizard;
