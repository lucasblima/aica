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

import React, { useEffect, useCallback } from 'react';
import { useStudio } from '../context/StudioContext';
import { useAuth } from '../../../hooks/useAuth';
import type { StudioProject } from '../types/studio';

// Lazy load views for better performance
const StudioLibrary = React.lazy(() => import('./StudioLibrary'));
const StudioWizard = React.lazy(() => import('./StudioWizard'));
const StudioWorkspace = React.lazy(() => import('./StudioWorkspace'));

/**
 * Loading screen component
 */
function LoadingScreen() {
  return (
    <div data-testid="loading-screen" className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
        <p className="text-gray-600">Carregando Studio...</p>
      </div>
    </div>
  );
}

/**
 * Error screen component
 */
function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div data-testid="error-screen" className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Erro</h2>
        <p className="text-gray-600 mb-4">{error}</p>
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
export default function StudioMainView() {
  const { state, actions } = useStudio();
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
    actions.goToWizard();
  }, [actions]);

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
   * This does NOT change mode, only updates show selection
   */
  const handleSelectShow = useCallback((showId: string) => {
    // In the future, we could fetch show details here
    // For now, just store the ID
    actions.selectShow(showId, 'Show Title'); // TODO: Fetch actual title
  }, [actions]);

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
        console.error('[StudioMainView] In WORKSPACE mode but no currentProject!');
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

    case 'WIZARD':
      // CRITICAL: Wizard requires showId for podcasts
      if (!state.currentShowId) {
        console.warn('[StudioMainView] In WIZARD mode but no currentShowId');
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
              console.log('[StudioMainView] Logout clicked');
            }}
          />
        </React.Suspense>
      );
  }
}
