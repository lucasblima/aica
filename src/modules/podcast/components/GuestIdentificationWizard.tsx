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
import { GuestTypeSelector, GuestManualForm, GuestNameSearchForm, GuestProfileConfirmation, EpisodeDetailsForm } from './wizard';
import { createEpisode, type PodcastEpisode } from '../services/episodeService';
import { searchGuestProfile } from '../services/guestResearchService';
import { useXPNotifications } from '@/contexts/XPNotificationContext';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GuestIdentificationWizard');

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
  const [isSearchingGuest, setIsSearchingGuest] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // XP notifications hook
  const { showXPGain } = useXPNotifications();

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
      log.debug('[GuestIdentificationWizard] Starting episode creation...');

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

      log.debug('[GuestIdentificationWizard] Episode data prepared:', completeData);

      // Save episode to Supabase
      const { data: episode, error } = await createEpisode({
        ...completeData,
        show_id: showId,
        guest_type: wizardState.guestType || 'direct-contact',
      });

      if (error || !episode) {
        log.error('[GuestIdentificationWizard] Error creating episode:', error);
        setSaveError(error?.message || 'Erro ao salvar episódio. Tente novamente.');
        return;
      }

      log.debug('[GuestIdentificationWizard] Episode created successfully:', episode.id);

      // Call parent completion handler with the created episode
      onComplete(episode);
    } catch (error) {
      log.error('[GuestIdentificationWizard] Unexpected error:', error);
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

  // Handler for guest search (Public Figure flow)
  const handleGuestSearch = async (data: { name: string; reference: string }) => {
    log.debug('[GuestIdentificationWizard] Starting guest research...', data);

    // Clear any previous search error
    setSearchError(null);
    setIsSearchingGuest(true);

    try {
      // Call Gemini API to research the guest
      const profile = await searchGuestProfile(data.name, data.reference);

      log.debug('[GuestIdentificationWizard] Guest research completed', {
        name: profile.name,
        confidence: profile.confidence_score,
        isReliable: profile.is_reliable,
      });

      // Save profile to wizard state
      setWizardState((prev) => ({
        ...prev,
        guestData: {
          ...prev.guestData,
          name: data.name,
          reference: data.reference,
          confirmedProfile: profile,
        },
      }));

      // Award XP for successful guest identification (50 XP)
      // Only award if the research was reliable and has good confidence
      if (profile.is_reliable && profile.confidence_score && profile.confidence_score >= 30) {
        showXPGain(50);
        log.debug('[GuestIdentificationWizard] Awarded 50 XP for successful guest research');
      }

      // Advance to Step 2 (Profile Confirmation)
      handleNext();
    } catch (error) {
      log.error('[GuestIdentificationWizard] Error searching for guest:', error);

      // Show user-friendly error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao pesquisar convidado. Por favor, tente novamente.';

      setSearchError(errorMessage);

      // Fallback profile - allow user to continue with basic profile
      const fallbackProfile: import('../types/wizard.types').GuestProfile = {
        name: data.name,
        title: 'Perfil indisponível',
        biography: 'Não foi possível buscar informações automáticas. Continue com dados manuais.',
        recent_facts: [],
        topics_of_interest: [],
        confidence_score: 0,
      };

      // Save fallback profile to wizard state
      setWizardState((prev) => ({
        ...prev,
        guestData: {
          ...prev.guestData,
          name: data.name,
          reference: data.reference,
          confirmedProfile: fallbackProfile,
        },
      }));

      // Still advance to next step with fallback profile
      // This prevents user from being blocked by API errors
      handleNext();
    } finally {
      setIsSearchingGuest(false);
    }
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
          <div className="space-y-4">
            {/* Error message */}
            {searchError && (
              <div className="ceramic-card p-4 bg-ceramic-error/10 border border-ceramic-error/30">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-ceramic-text-primary font-bold mb-1">Erro na Pesquisa</h3>
                    <p className="text-ceramic-error text-sm">{searchError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search form */}
            <GuestNameSearchForm
              initialData={{
                name: wizardState.guestData.name,
                reference: wizardState.guestData.reference || '',
              }}
              onSearch={handleGuestSearch}
              onBack={handleBack}
              isSearching={isSearchingGuest}
            />
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
          <GuestProfileConfirmation
            profile={wizardState.guestData.confirmedProfile!}
            onConfirm={() => handleNext()}
            onSearchAgain={handleBack}
          />
        );

      case 'episode-details':
        return (
          <div className="space-y-4">
            {/* Error message */}
            {saveError && (
              <div className="ceramic-card p-4 bg-ceramic-error/10 border border-ceramic-error/30">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-ceramic-text-primary font-bold mb-1">Erro ao Salvar</h3>
                    <p className="text-ceramic-error text-sm">{saveError}</p>
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
        <div className="h-1 bg-gradient-to-r from-ceramic-cool to-ceramic-border rounded-full overflow-hidden">
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
