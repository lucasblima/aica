/**
 * StudioMainView - Main component for Studio module
 * Implements Finite State Machine (FSM) for view navigation
 *
 * CRITICAL PATTERNS:
 * - Uses SWITCH statement for mode-based rendering (NOT if-else)
 * - ONE useEffect for initialization ONLY
 * - ZERO useEffect for navigation logic
 * - All transitions via explicit callbacks (NO side effects)
 */

import { useTourAutoStart } from '@/hooks/useTourAutoStart';
import React, { useEffect, useCallback } from 'react';
import { useStudio } from '../context/StudioContext';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabaseClient';
import type { StudioProject } from '../types/studio';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('StudioMainView');

// Lazy load views for better performance
const StudioLibrary = React.lazy(() => import('./StudioLibrary'));
const PodcastShowPage = React.lazy(() => import('./PodcastShowPage'));
const StudioWizard = React.lazy(() => import('./StudioWizard'));
const StudioWorkspace = React.lazy(() => import('./StudioWorkspace'));

/**
 * Loading screen component
 */
function LoadingScreen() {
  return (
    <div data-testid="loading-screen" className="flex items-center justify-center h-screen bg-ceramic-base">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
        <p className="text-ceramic-text-secondary">Carregando Studio...</p>
      </div>
    </div>
  );
}

/**
 * Error screen component
 */
function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div data-testid="error-screen" className="flex items-center justify-center h-screen bg-ceramic-base">
      <div className="text-center max-w-md">
        <div className="text-ceramic-error mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-ceramic-text-primary mb-2">Erro</h2>
        <p className="text-ceramic-text-secondary mb-4">{error}</p>
        <button
          data-testid="retry-button"
          onClick={onRetry}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}

/**
 * StudioMainView - Main component
 * Manages view state and renders appropriate component based on mode
 */
/* data-tour markers: studio-header, studio-shows-list, create-show-button, wizard-button, guest-management, episode-production, studio-library, workspace-view */
export default function StudioMainView() {

  useTourAutoStart('studio-first-visit');  const { state, actions } = useStudio();
  const { user } = useAuth();

  // CRITICAL: ONLY ONE useEffect for initialization
  // This runs ONCE when component mounts
  useEffect(() => {
    // Set user ID from auth
    if (user?.id) {
      actions.setUserId(user.id);
    }

    // If we're in LOADING mode and not actively loading, decide initial mode
    // This happens on first render only
    if (state.mode === 'LOADING' && !state.isLoading) {
      // TODO: In the future, check for active project in URL or localStorage
      // For now, always start in LIBRARY mode
      actions.goToLibrary();
    }
  }, [user?.id, state.mode, state.isLoading, actions]);

  // ============================================
  // TRANSITION HANDLERS (Explicit, NO useEffect!)
  // ============================================

  /**
   * Handler for selecting a project from library
   * Transitions: LIBRARY -> WORKSPACE
   */
  const handleSelectProject = useCallback((project: StudioProject) => {
    actions.goToWorkspace(project);
  }, [actions]);

  /**
   * Handler for creating a new project
   * Transitions: LIBRARY -> WIZARD
   */
  const handleCreateNew = useCallback(() => {
    if (state.currentShowId) {
      actions.goToWizard();
    } else {
      actions.goToLibrary();
    }
  }, [actions, state.currentShowId]);

  /**
   * Handler for going back to library
   * Transitions: WORKSPACE/WIZARD -> LIBRARY
   */
  const handleBackToLibrary = useCallback(() => {
    actions.goToLibrary();
  }, [actions]);

  /**
   * Handler for completing wizard
   * Transitions: WIZARD -> WORKSPACE
   */
  const handleWizardComplete = useCallback((project: StudioProject) => {
    actions.goToWorkspace(project);
  }, [actions]);

  /**
   * Handler for error retry
   * Transitions: ERROR -> LIBRARY
   */
  const handleRetry = useCallback(() => {
    actions.clearError();
    actions.goToLibrary();
  }, [actions]);

  /**
   * Handler for selecting a show (podcast-specific)
   * Transitions: LIBRARY -> SHOW_PAGE
   */
  const handleSelectShow = useCallback((showId: string, showTitle: string) => {
    actions.goToShowPage(showId, showTitle);
  }, [actions]);

  /**
   * Handler for selecting an episode from show page
   * Transitions: SHOW_PAGE -> WORKSPACE
   */
  const handleSelectEpisode = useCallback(async (episodeId: string) => {
    try {
      // Fetch episode data from database
      const { data: episode, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('id', episodeId)
        .single();

      if (error) throw error;
      if (!episode) throw new Error('Episódio não encontrado');

      // Convert to StudioProject
      const project: StudioProject = {
        id: episode.id,
        type: 'podcast',
        title: episode.title || 'Untitled Episode',
        description: episode.description,
        showId: episode.show_id,
        showTitle: state.currentShowTitle || 'Unknown Show',
        status: episode.status || 'draft',
        createdAt: new Date(episode.created_at),
        updatedAt: new Date(episode.updated_at),
        metadata: {
          type: 'podcast',
          guestName: episode.guest_name,
          episodeTheme: episode.episode_theme,
          scheduledTime: episode.scheduled_time,
          recordingDuration: episode.recording_duration,
        },
      };

      // Navigate to workspace
      actions.goToWorkspace(project);
    } catch (error) {
      log.error('[StudioMainView] Error selecting episode:', error);
      actions.setError('Erro ao carregar episódio');
    }
  }, [actions, state.currentShowTitle]);

  // ============================================
  // RENDER LOGIC (FSM with SWITCH)
  // ============================================

  // Show error screen if error exists
  if (state.error) {
    return <ErrorScreen error={state.error} onRetry={handleRetry} />;
  }

  // Show loading screen if in LOADING mode or actively loading
  if (state.isLoading || state.mode === 'LOADING') {
    return <LoadingScreen />;
  }

  // Render based on current mode using SWITCH (NOT if-else!)
  switch (state.mode) {
    case 'WORKSPACE':
      // CRITICAL: Ensure currentProject exists before rendering
      if (!state.currentProject) {
        log.error('[StudioMainView] In WORKSPACE mode but no currentProject!');
        actions.setError('Projeto não encontrado');
        return null;
      }

      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <StudioWorkspace
            project={state.currentProject}
            onBack={handleBackToLibrary}
          />
        </React.Suspense>
      );

    case 'SHOW_PAGE':
      // CRITICAL: Show page requires showId and showTitle
      if (!state.currentShowId || !state.currentShowTitle) {
        log.error('[StudioMainView] In SHOW_PAGE mode but no currentShowId/currentShowTitle!');
        actions.setError('Podcast não encontrado');
        return null;
      }

      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <PodcastShowPage
            showId={state.currentShowId}
            showTitle={state.currentShowTitle}
            onBack={handleBackToLibrary}
            onSelectEpisode={handleSelectEpisode}
            onCreateEpisode={handleCreateNew}
            userEmail={user?.email || ''}
            onLogout={() => {
              // TODO: Implement logout
              log.debug('[StudioMainView] Logout clicked');
            }}
          />
        </React.Suspense>
      );

    case 'WIZARD':
      // CRITICAL: Wizard requires showId for podcasts
      if (!state.currentShowId) {
        log.warn('[StudioMainView] In WIZARD mode but no currentShowId');
        // For now, allow wizard to handle this case
      }

      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <StudioWizard
            showId={state.currentShowId || ''}
            userId={state.userId || ''}
            onComplete={handleWizardComplete}
            onCancel={handleBackToLibrary}
          />
        </React.Suspense>
      );

    case 'LIBRARY':
    default:
      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <StudioLibrary
            onSelectShow={handleSelectShow}
            onSelectProject={handleSelectProject}
            onCreateNew={handleCreateNew}
            userEmail={user?.email}
            onLogout={() => {
              // TODO: Implement logout
              log.debug('[StudioMainView] Logout clicked');
            }}
          />
        </React.Suspense>
      );
  }
}
