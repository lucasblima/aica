/**
 * PodcastWorkspace - Main workspace container for podcast episode management
 * Handles loading, saving, and rendering of all workspace stages
 */

import React, { Suspense, useState } from 'react';
import { PodcastWorkspaceProvider, usePodcastWorkspace } from '../../context/PodcastWorkspaceContext';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';
import { useAutoSave } from '../../hooks/useAutoSave';
import WorkspaceHeader from './WorkspaceHeader';
import StageStepper from './StageStepper';
import StageRenderer from './StageRenderer';
import type { Dossier, CustomSource } from '../../types/workspace';

interface PodcastWorkspaceProps {
  episodeId: string;
  showId: string;
  showTitle: string;
  onBack: () => void;
  onGenerateDossier?: (guestName: string, theme: string, customSources?: CustomSource[]) => Promise<Dossier>;
  onSearchGuestProfile?: (name: string, reference: string) => Promise<any>;
}

/**
 * Inner component that uses workspace context
 * Separated to ensure context is available
 */
function WorkspaceContent({ onBack }: { onBack: () => void }) {
  const { state, actions, stageCompletions } = usePodcastWorkspace();
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save with visual feedback
  useAutoSave({
    state,
    enabled: true,
    debounceMs: 2000,
    onSaveStart: () => setIsSaving(true),
    onSaveSuccess: () => {
      setIsSaving(false);
      actions.hydrate({ isDirty: false, lastSaved: new Date() });
    },
    onSaveError: (error) => {
      setIsSaving(false);
      console.error('Auto-save error:', error);
    },
  });

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Carregando episódio...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Erro ao Carregar</h2>
          <p className="text-gray-600 mb-4">{state.error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
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

      {/* Stage Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        }>
          <StageRenderer currentStage={state.currentStage} />
        </Suspense>
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
  // Load initial state from database
  const { state: initialState, error: loadError } = useWorkspaceState({
    episodeId,
    showId,
    showTitle,
  });

  // Handle save callback
  const handleSave = async (state: any) => {
    // Save is handled by useAutoSave hook inside WorkspaceContent
    console.log('[PodcastWorkspace] Manual save triggered');
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Erro ao Carregar</h2>
          <p className="text-gray-600 mb-4">{loadError}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

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
