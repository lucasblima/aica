/**
 * PodcastWorkspace - Main workspace container for podcast episode management
 *
 * Handles loading, saving, and rendering of all workspace stages. Provides the
 * context provider for workspace state and orchestrates the complete episode
 * creation workflow.
 *
 * Migration Note: Migrated from _deprecated/modules/podcast/components/workspace/PodcastWorkspace.tsx
 * Wave 6: Integration - Workspace Container Component
 *
 * Changes:
 * - Updated imports to @/modules/studio/* paths
 * - Applied Ceramic Design System to error/loading states
 * - Enhanced accessibility with aria-labels
 * - All components now imported from migrated locations
 * - Maintained auto-save and state management logic
 *
 * Architecture:
 * - PodcastWorkspaceProvider: Context provider for workspace state
 * - useWorkspaceState: Hook for loading initial state from database
 * - useAutoSave: Hook for auto-saving changes with 2s debounce
 * - WorkspaceContent: Inner component that uses workspace context
 * - WorkspaceHeader: Header with breadcrumb and save status
 * - StageStepper: Stage navigation with completion indicators
 * - StageRenderer: Lazy-loads and renders active stage component
 *
 * Accessibility Features:
 * - Loading state with aria-label
 * - Error state with clear messaging
 * - Screen reader friendly status updates
 *
 * Design System: Ceramic Design System
 * - Background: bg-ceramic-base, bg-ceramic-surface
 * - Text: text-ceramic-primary, text-ceramic-secondary
 * - Loading spinner: border-orange-500
 * - Error state: red-500
 *
 * @see PodcastWorkspaceProvider for state management
 * @see useWorkspaceState for initial state loading
 * @see useAutoSave for auto-save functionality
 */

import React, { Component, Suspense, useState } from 'react';
import { PodcastWorkspaceProvider, usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import { useWorkspaceState } from '@/modules/studio/hooks/useWorkspaceState';
import { useAutoSave } from '@/modules/studio/hooks/useAutoSave';
import WorkspaceHeader from './WorkspaceHeader';
import StageStepper from './StageStepper';
import StageRenderer from './StageRenderer';
import type { Dossier, WorkspaceCustomSource } from '@/modules/studio/types';
import { createNamespacedLogger } from '@/lib/logger';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const log = createNamespacedLogger('PodcastWorkspace');

/**
 * Error boundary for workspace stage rendering
 */
interface StageErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface StageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class StageErrorBoundary extends Component<StageErrorBoundaryProps, StageErrorBoundaryState> {
  state: StageErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): StageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.error('Stage rendering error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-ceramic-base p-8">
          <div className="text-center max-w-md">
            <div className="p-4 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 mb-6">
              <AlertCircle className="w-10 h-10 text-ceramic-error mx-auto mb-3" />
              <h3 className="text-lg font-bold text-ceramic-primary mb-2">
                Erro ao renderizar estagio
              </h3>
              <p className="text-sm text-ceramic-secondary">
                Ocorreu um erro inesperado neste estagio. Seus dados foram preservados.
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PodcastWorkspaceProps {
  episodeId: string;
  showId: string;
  showTitle: string;
  onBack: () => void;
  onGenerateDossier?: (guestName: string, theme: string, customSources?: WorkspaceCustomSource[]) => Promise<Dossier>;
  onSearchGuestProfile?: (name: string, reference: string) => Promise<any>;
}

/**
 * Inner component that uses workspace context
 * Separated to ensure context is available
 */
function WorkspaceContent({ onBack }: { onBack: () => void }) {
  const { state, actions, stageCompletions } = usePodcastWorkspace();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // DEBUG: Log workspace content state
  log.debug('[WorkspaceContent] Rendering with state:', {
    isLoading: state.isLoading,
    error: state.error,
    currentStage: state.currentStage,
    visitedStages: state.visitedStages
  });

  // Auto-save with visual feedback
  useAutoSave({
    state,
    enabled: true,
    debounceMs: 2000,
    onSaveStart: () => { setIsSaving(true); setSaveError(null); },
    onSaveSuccess: () => {
      setIsSaving(false);
      setSaveError(null);
      actions.hydrate({ isDirty: false, lastSaved: new Date() });
    },
    onSaveError: (error) => {
      setIsSaving(false);
      setSaveError('Erro ao salvar automaticamente. Suas alteracoes serao salvas na proxima tentativa.');
      log.error('Auto-save error:', error);
    },
  });

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-ceramic-base">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"
            role="status"
            aria-label="Carregando episódio"
          />
          <p className="text-ceramic-secondary">Carregando episódio...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-ceramic-base">
        <div className="text-center max-w-md">
          <div className="text-ceramic-error mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-ceramic-primary mb-2">Erro ao Carregar</h2>
          <p className="text-ceramic-secondary mb-4">{state.error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            aria-label="Voltar ao dashboard do estúdio"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-ceramic-base">
      {/* Header */}
      <WorkspaceHeader
        showTitle={state.showTitle}
        episodeTitle={state.setup.guestName || 'Novo Episódio'}
        lastSaved={state.lastSaved}
        isSaving={isSaving}
        isDirty={state.isDirty}
        onBack={onBack}
      />

      {/* Stage Navigation */}
      <StageStepper
        currentStage={state.currentStage}
        completions={stageCompletions}
        onStageChange={actions.setStage}
      />

      {/* Auto-save Error Banner */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 p-3 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ceramic-error font-medium flex-1">{saveError}</p>
            <button
              onClick={() => setSaveError(null)}
              className="text-xs text-ceramic-error hover:underline flex-shrink-0"
            >
              Fechar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage Content */}
      <div className="flex-1 overflow-hidden">
        <StageErrorBoundary>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"
                role="status"
                aria-label="Carregando estágio"
              />
            </div>
          }>
            <StageRenderer currentStage={state.currentStage} />
          </Suspense>
        </StageErrorBoundary>
      </div>
    </div>
  );
}

/**
 * Main workspace component with provider wrapper
 */
export default function PodcastWorkspace({
  episodeId,
  showId,
  showTitle,
  onBack,
  onGenerateDossier,
  onSearchGuestProfile,
}: PodcastWorkspaceProps) {
  const [retryKey, setRetryKey] = useState(0);

  return (
    <PodcastWorkspaceInner
      key={retryKey}
      episodeId={episodeId}
      showId={showId}
      showTitle={showTitle}
      onBack={onBack}
      onGenerateDossier={onGenerateDossier}
      onSearchGuestProfile={onSearchGuestProfile}
      onRetry={() => setRetryKey(k => k + 1)}
    />
  );
}

function PodcastWorkspaceInner({
  episodeId,
  showId,
  showTitle,
  onBack,
  onGenerateDossier,
  onSearchGuestProfile,
  onRetry,
}: PodcastWorkspaceProps & { onRetry: () => void }) {
  // Load initial state from database
  const { state: initialState, error: loadError } = useWorkspaceState({
    episodeId,
    showId,
    showTitle,
  });

  // DEBUG: Log workspace state
  log.debug('[PodcastWorkspace] Initial state loaded:', {
    isLoading: initialState.isLoading,
    error: initialState.error,
    currentStage: initialState.currentStage,
    episodeId
  });

  // Handle save callback
  const handleSave = async (state: any) => {
    // Save is handled by useAutoSave hook inside WorkspaceContent
    log.debug('[PodcastWorkspace] Manual save triggered');
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-ceramic-base">
        <div className="text-center max-w-md">
          <div className="text-ceramic-error mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-ceramic-primary mb-2">Erro ao Carregar</h2>
          <p className="text-ceramic-secondary mb-4">{loadError}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Tentar novamente
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 border border-ceramic-border text-ceramic-secondary rounded-lg hover:bg-ceramic-cool transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-border focus:ring-offset-2"
              aria-label="Voltar ao dashboard do estúdio"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wait for initial state to finish loading before mounting Provider
  // This ensures the reducer is initialized with the correct isLoading state
  if (initialState.isLoading) {
    log.debug('[PodcastWorkspace] Waiting for initial state to load...');
    return (
      <div className="flex items-center justify-center h-screen bg-ceramic-base">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"
            role="status"
            aria-label="Carregando episódio"
          />
          <p className="text-ceramic-secondary">Carregando episódio...</p>
        </div>
      </div>
    );
  }

  log.debug('[PodcastWorkspace] Mounting provider with loaded state:', {
    currentStage: initialState.currentStage,
    isLoading: initialState.isLoading,
    hasError: !!initialState.error
  });

  return (
    <PodcastWorkspaceProvider
      initialState={initialState}
      onSave={handleSave}
      onGenerateDossier={onGenerateDossier}
      onSearchGuestProfile={onSearchGuestProfile}
    >
      <WorkspaceContent onBack={onBack} />
    </PodcastWorkspaceProvider>
  );
}
