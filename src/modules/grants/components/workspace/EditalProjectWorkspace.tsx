/**
 * EditalProjectWorkspace - Main container for the non-linear stage workspace
 * Replaces the separate briefing and generation views with a unified interface
 */

import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, FileText, Loader2 } from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from '../../context/WorkspaceContext';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';
import { useAutoSave } from '../../hooks/useAutoSave';
import { StageStepper } from './StageStepper';
import { WorkspaceHeader } from './WorkspaceHeader';
import { StageRenderer } from './StageRenderer';
import type { GrantProject, GrantOpportunity, GrantResponse } from '../../types';
import type { StageId, EditalWorkspaceState } from '../../types/workspace';

interface EditalProjectWorkspaceProps {
  project: GrantProject;
  opportunity: GrantOpportunity;
  onBack: () => void;
  onGenerateField: (fieldId: string) => Promise<string>;
  onSaveResponse: (fieldId: string, content: string, status?: string) => Promise<GrantResponse>;
  onProposalComplete?: () => Promise<void>;
}

/**
 * Inner workspace component that uses the context
 */
const WorkspaceContent: React.FC<{
  onBack: () => void;
  editalTextContent?: string | null;
}> = ({ onBack, editalTextContent }) => {
  const { state, dispatch, actions, stageCompletions } = useWorkspace();
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // Auto-save setup
  const { isSaving, lastSaved } = useAutoSave({
    state,
    enabled: true,
    debounceMs: 2000,
    onSaveStart: () => dispatch({ type: 'SET_LOADING', payload: true }),
    onSaveSuccess: () => dispatch({ type: 'MARK_SAVED' }),
    onSaveError: (error) => dispatch({ type: 'SET_ERROR', payload: error.message }),
  });

  const handleStageSelect = useCallback((stageId: StageId) => {
    actions.setStage(stageId);
  }, [actions]);

  return (
    <div className="h-screen bg-[#F0EFE9] flex flex-col overflow-hidden">
      {/* Header */}
      <WorkspaceHeader
        projectName={state.projectName}
        opportunityTitle={state.opportunityTitle}
        onBack={onBack}
        isSaving={isSaving}
        lastSaved={lastSaved}
        pdfCharCount={editalTextContent?.length}
        documentCount={state.documents.uploadedDocs.length}
        onShowPdf={editalTextContent ? () => setShowPdfModal(true) : undefined}
        onShowDocuments={() => setShowDocsModal(true)}
      />

      {/* Stage Navigation */}
      <div className="flex-shrink-0 bg-white">
        <div className="max-w-6xl mx-auto">
          <StageStepper
            currentStage={state.currentStage}
            stageCompletions={stageCompletions}
            onStageSelect={handleStageSelect}
          />
        </div>
      </div>

      {/* Stage Content */}
      <StageRenderer currentStage={state.currentStage} />

      {/* PDF Content Modal */}
      <AnimatePresence>
        {showPdfModal && editalTextContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPdfModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="ceramic-card max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#5C554B]/10">
                <div className="flex items-center gap-3">
                  <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#5C554B]">
                      Conteudo do Edital
                    </h2>
                    <p className="text-xs text-[#948D82]">
                      {Math.round(editalTextContent.length / 1000)}k caracteres extraidos do PDF
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="ceramic-concave w-10 h-10 flex items-center justify-center text-[#5C554B] hover:scale-95 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="ceramic-tray p-6 rounded-lg">
                  <pre className="text-xs text-[#948D82] whitespace-pre-wrap font-mono leading-relaxed">
                    {editalTextContent}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end p-6 border-t border-[#5C554B]/10">
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="ceramic-concave px-6 py-2 font-bold text-[#5C554B] hover:scale-95 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Main workspace component with provider setup
 */
export const EditalProjectWorkspace: React.FC<EditalProjectWorkspaceProps> = ({
  project,
  opportunity,
  onBack,
  onGenerateField,
  onSaveResponse,
  onProposalComplete,
}) => {
  // Load initial workspace state
  const { initialState, isLoading, error, reload } = useWorkspaceState({
    projectId: project.id,
    opportunityId: opportunity.id,
    project,
    opportunity,
  });

  // Loading state
  if (isLoading || !initialState) {
    return (
      <div className="h-screen bg-[#F0EFE9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#D97706] animate-spin" />
          <span className="text-sm text-[#948D82]">Carregando workspace...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-[#F0EFE9] flex items-center justify-center">
        <div className="ceramic-card p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erro ao carregar</h2>
          <p className="text-sm text-[#948D82] mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onBack}
              className="ceramic-concave px-6 py-2 font-bold text-[#5C554B] hover:scale-95 transition-all"
            >
              Voltar
            </button>
            <button
              onClick={reload}
              className="ceramic-concave px-6 py-2 font-bold text-[#D97706] hover:scale-95 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider
      initialState={initialState}
      onGenerateField={onGenerateField}
      onSaveResponse={onSaveResponse}
    >
      <WorkspaceContent
        onBack={onBack}
        editalTextContent={opportunity.edital_text_content}
      />
    </WorkspaceProvider>
  );
};

export default EditalProjectWorkspace;
