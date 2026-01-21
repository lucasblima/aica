/**
 * WorkspaceContext - State Management for Edital Workspace
 * Uses React Context + useReducer for local state management
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type {
  EditalWorkspaceState,
  WorkspaceAction,
  WorkspaceActions,
  StageId,
  StageCompletionMap,
  StageCompletionStatus,
  RequiredDocument,
  EditalPhase,
} from '../types/workspace';
import type { GrantResponse, ProjectDocument, FormField } from '../types';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Workspacecontext');

// ============================================
// REDUCER
// ============================================

function workspaceReducer(
  state: EditalWorkspaceState,
  action: WorkspaceAction
): EditalWorkspaceState {
  switch (action.type) {
    // Navigation
    case 'SET_STAGE':
      return {
        ...state,
        currentStage: action.payload,
        visitedStages: state.visitedStages.includes(action.payload)
          ? state.visitedStages
          : [...state.visitedStages, action.payload],
      };

    case 'MARK_STAGE_VISITED':
      return {
        ...state,
        visitedStages: state.visitedStages.includes(action.payload)
          ? state.visitedStages
          : [...state.visitedStages, action.payload],
      };

    // Stage 1: PDF Upload
    case 'UPDATE_PDF':
      return {
        ...state,
        pdfUpload: { ...state.pdfUpload, ...action.payload },
        isDirty: true,
      };

    case 'RESET_PDF':
      return {
        ...state,
        pdfUpload: {
          file: null,
          path: null,
          textContent: null,
          processingStatus: 'idle',
          error: null,
        },
        isDirty: true,
      };

    // Stage 2: Form Fields
    case 'UPDATE_FORM_FIELDS':
      return {
        ...state,
        formFields: { ...state.formFields, ...action.payload },
        isDirty: true,
      };

    case 'SET_FORM_FIELDS':
      return {
        ...state,
        formFields: { ...state.formFields, fields: action.payload, isDirty: true },
        isDirty: true,
      };

    case 'ADD_FORM_FIELD':
      return {
        ...state,
        formFields: {
          ...state.formFields,
          fields: [...state.formFields.fields, action.payload],
          isDirty: true,
        },
        isDirty: true,
      };

    case 'REMOVE_FORM_FIELD':
      return {
        ...state,
        formFields: {
          ...state.formFields,
          fields: state.formFields.fields.filter(f => f.id !== action.payload),
          isDirty: true,
        },
        isDirty: true,
      };

    case 'UPDATE_FORM_FIELD':
      return {
        ...state,
        formFields: {
          ...state.formFields,
          fields: state.formFields.fields.map(f =>
            f.id === action.payload.id ? { ...f, ...action.payload.updates } : f
          ),
          isDirty: true,
        },
        isDirty: true,
      };

    // Stage 3: Drafting
    case 'UPDATE_DRAFTING':
      return {
        ...state,
        drafting: { ...state.drafting, ...action.payload },
        isDirty: true,
      };

    case 'SET_RESPONSE':
      return {
        ...state,
        drafting: {
          ...state.drafting,
          responses: {
            ...state.drafting.responses,
            [action.payload.fieldId]: action.payload.response,
          },
        },
        isDirty: true,
      };

    case 'SET_ALL_RESPONSES':
      return {
        ...state,
        drafting: {
          ...state.drafting,
          responses: action.payload,
        },
      };

    case 'SET_ACTIVE_FIELD':
      return {
        ...state,
        drafting: { ...state.drafting, activeFieldId: action.payload },
      };

    case 'START_GENERATION':
      return {
        ...state,
        drafting: {
          ...state.drafting,
          generationQueue: action.payload,
          isGenerating: true,
        },
      };

    case 'FINISH_GENERATION':
      return {
        ...state,
        drafting: {
          ...state.drafting,
          generationQueue: [],
          isGenerating: false,
        },
      };

    // Stage 4: Documents
    case 'UPDATE_DOCUMENTS':
      return {
        ...state,
        documents: { ...state.documents, ...action.payload },
        isDirty: true,
      };

    case 'SET_REQUIRED_DOCS':
      return {
        ...state,
        documents: {
          ...state.documents,
          requiredDocs: action.payload,
          checklistProgress: calculateChecklistProgress(action.payload),
        },
        isDirty: true,
      };

    case 'TOGGLE_DOC_STATUS':
      const updatedDocs: RequiredDocument[] = state.documents.requiredDocs.map(doc =>
        doc.id === action.payload
          ? { ...doc, status: (doc.status === 'available' ? 'required' : 'available') as RequiredDocument['status'] }
          : doc
      );
      return {
        ...state,
        documents: {
          ...state.documents,
          requiredDocs: updatedDocs,
          checklistProgress: calculateChecklistProgress(updatedDocs),
        },
        isDirty: true,
      };

    case 'ADD_UPLOADED_DOC':
      return {
        ...state,
        documents: {
          ...state.documents,
          uploadedDocs: [...state.documents.uploadedDocs, action.payload],
        },
        isDirty: true,
      };

    case 'REMOVE_UPLOADED_DOC':
      return {
        ...state,
        documents: {
          ...state.documents,
          uploadedDocs: state.documents.uploadedDocs.filter(d => d.id !== action.payload),
        },
        isDirty: true,
      };

    // Stage 5: Timeline
    case 'UPDATE_TIMELINE':
      return {
        ...state,
        timeline: { ...state.timeline, ...action.payload },
        isDirty: true,
      };

    case 'SET_TIMELINE_PHASES':
      return {
        ...state,
        timeline: { ...state.timeline, phases: action.payload, extractionStatus: 'done' },
        isDirty: true,
      };

    // Briefing context
    case 'UPDATE_BRIEFING_CONTEXT':
      return {
        ...state,
        briefingContext: { ...state.briefingContext, ...action.payload },
        isDirty: true,
      };

    case 'SET_BRIEFING_FIELD':
      return {
        ...state,
        briefingContext: {
          ...state.briefingContext,
          [action.payload.fieldId]: action.payload.value,
        },
        isDirty: true,
      };

    // Global
    case 'HYDRATE':
      return {
        ...state,
        ...action.payload,
        isDirty: false,
      };

    case 'MARK_SAVED':
      return {
        ...state,
        lastSaved: new Date(),
        isDirty: false,
      };

    case 'MARK_DIRTY':
      return {
        ...state,
        isDirty: true,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'RESET_WORKSPACE':
      return {
        ...state,
        currentStage: 'setup',
        visitedStages: ['setup'],
        isDirty: false,
        error: null,
      };

    default:
      return state;
  }
}

// ============================================
// HELPERS
// ============================================

function calculateChecklistProgress(docs: RequiredDocument[]): number {
  if (docs.length === 0) return 0;
  const completed = docs.filter(d => d.status === 'available' || d.status === 'uploaded').length;
  return Math.round((completed / docs.length) * 100);
}

// ============================================
// CONTEXT
// ============================================

interface WorkspaceContextValue {
  state: EditalWorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  actions: WorkspaceActions;
  stageCompletions: StageCompletionMap;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ============================================
// HOOK
// ============================================

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

interface WorkspaceProviderProps {
  children: React.ReactNode;
  initialState: EditalWorkspaceState;
  onSave?: (state: EditalWorkspaceState) => Promise<void>;
  onGenerateField?: (fieldId: string) => Promise<string>;
  onSaveResponse?: (fieldId: string, content: string, status?: string) => Promise<GrantResponse>;
}

export function WorkspaceProvider({
  children,
  initialState,
  onSave,
  onGenerateField,
  onSaveResponse,
}: WorkspaceProviderProps) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // Calculate stage completions
  const stageCompletions = useMemo<StageCompletionMap>(() => {
    return {
      setup: calculateSetupCompletion(state),
      structure: calculateStructureCompletion(state),
      drafting: calculateDraftingCompletion(state),
      docs: calculateDocsCompletion(state),
      timeline: calculateTimelineCompletion(state),
    };
  }, [state]);

  // Create actions
  const actions = useMemo<WorkspaceActions>(() => ({
    // Navigation
    setStage: (stageId: StageId) => {
      dispatch({ type: 'SET_STAGE', payload: stageId });
    },

    // Stage 1: PDF
    uploadPdf: async (file: File) => {
      // Implementation will be handled in the stage component
      dispatch({ type: 'UPDATE_PDF', payload: { file, processingStatus: 'uploading' } });
    },
    deletePdf: async () => {
      dispatch({ type: 'RESET_PDF' });
    },

    // Stage 2: Form Fields
    parseFieldsWithAI: async () => {
      dispatch({ type: 'UPDATE_FORM_FIELDS', payload: { parsingStatus: 'parsing' } });
    },
    extractFieldsFromPdf: async () => {
      dispatch({ type: 'UPDATE_FORM_FIELDS', payload: { parsingStatus: 'parsing' } });
    },
    setFormFields: (fields: FormField[]) => {
      dispatch({ type: 'SET_FORM_FIELDS', payload: fields });
    },
    addFormField: (field: FormField) => {
      dispatch({ type: 'ADD_FORM_FIELD', payload: field });
    },
    removeFormField: (fieldId: string) => {
      dispatch({ type: 'REMOVE_FORM_FIELD', payload: fieldId });
    },
    updateFormField: (fieldId: string, updates: Partial<FormField>) => {
      dispatch({ type: 'UPDATE_FORM_FIELD', payload: { id: fieldId, updates } });
    },

    // Stage 3: Drafting
    generateField: async (fieldId: string) => {
      if (!onGenerateField) return;
      dispatch({ type: 'SET_ACTIVE_FIELD', payload: fieldId });
      dispatch({ type: 'START_GENERATION', payload: [fieldId] });
      try {
        const content = await onGenerateField(fieldId);
        if (onSaveResponse) {
          const response = await onSaveResponse(fieldId, content, 'generated');
          dispatch({ type: 'SET_RESPONSE', payload: { fieldId, response } });
        }
      } catch (error) {
        log.error('Error generating field:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Erro ao gerar campo' });
      } finally {
        dispatch({ type: 'FINISH_GENERATION' });
      }
    },
    generateAllFields: async () => {
      if (!onGenerateField) return;
      const fieldIds = state.formFields.fields
        .filter(f => !state.drafting.responses[f.id]?.content)
        .map(f => f.id);
      dispatch({ type: 'START_GENERATION', payload: fieldIds });

      for (const fieldId of fieldIds) {
        dispatch({ type: 'SET_ACTIVE_FIELD', payload: fieldId });
        try {
          const content = await onGenerateField(fieldId);
          if (onSaveResponse) {
            const response = await onSaveResponse(fieldId, content, 'generated');
            dispatch({ type: 'SET_RESPONSE', payload: { fieldId, response } });
          }
        } catch (error) {
          log.error(`Error generating field ${fieldId}:`, error);
        }
      }

      dispatch({ type: 'FINISH_GENERATION' });
      dispatch({ type: 'SET_ACTIVE_FIELD', payload: null });
    },
    approveField: async (fieldId: string) => {
      const response = state.drafting.responses[fieldId];
      if (response && onSaveResponse) {
        const updated = await onSaveResponse(fieldId, response.content, 'approved');
        dispatch({ type: 'SET_RESPONSE', payload: { fieldId, response: updated } });
      }
    },
    editResponse: async (fieldId: string, content: string) => {
      if (onSaveResponse) {
        const response = await onSaveResponse(fieldId, content, 'editing');
        dispatch({ type: 'SET_RESPONSE', payload: { fieldId, response } });
      }
    },
    copyToClipboard: async (fieldId: string) => {
      const response = state.drafting.responses[fieldId];
      if (response?.content) {
        await navigator.clipboard.writeText(response.content);
      }
    },

    // Stage 4: Documents
    extractRequiredDocs: async () => {
      // Will be implemented with AI extraction
    },
    toggleDocumentStatus: (docId: string) => {
      dispatch({ type: 'TOGGLE_DOC_STATUS', payload: docId });
    },
    uploadDocument: async (docId: string, file: File) => {
      // Will upload and link to required doc
    },

    // Stage 5: Timeline
    extractTimeline: async () => {
      dispatch({ type: 'UPDATE_TIMELINE', payload: { extractionStatus: 'extracting' } });
    },

    // Briefing
    updateBriefingField: (fieldId: string, value: string) => {
      dispatch({ type: 'SET_BRIEFING_FIELD', payload: { fieldId, value } });
    },

    // Global
    save: async () => {
      if (onSave) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          await onSave(state);
          dispatch({ type: 'MARK_SAVED' });
        } catch (error) {
          log.error('Error saving workspace:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Erro ao salvar' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    },
  }), [state, onSave, onGenerateField, onSaveResponse]);

  const value = useMemo(
    () => ({ state, dispatch, actions, stageCompletions }),
    [state, actions, stageCompletions]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ============================================
// COMPLETION CALCULATORS
// ============================================

function calculateSetupCompletion(state: EditalWorkspaceState): StageCompletionStatus {
  if (state.pdfUpload.textContent && state.pdfUpload.processingStatus === 'done') {
    return 'complete';
  }
  if (state.pdfUpload.path || state.pdfUpload.processingStatus === 'uploading') {
    return 'partial';
  }
  return 'none';
}

function calculateStructureCompletion(state: EditalWorkspaceState): StageCompletionStatus {
  const fieldCount = state.formFields.fields.length;
  if (fieldCount === 0) return 'none';
  const requiredFieldsComplete = state.formFields.fields.every(f => f.label && f.label.trim().length > 0);
  return requiredFieldsComplete ? 'complete' : 'partial';
}

function calculateDraftingCompletion(state: EditalWorkspaceState): StageCompletionStatus {
  const totalFields = state.formFields.fields.length;
  if (totalFields === 0) return 'none';

  const responsesWithContent = Object.values(state.drafting.responses).filter(
    r => r && r.content && r.content.trim().length > 0
  ).length;

  const approvedResponses = Object.values(state.drafting.responses).filter(
    r => r && r.status === 'approved'
  ).length;

  if (approvedResponses === totalFields) return 'complete';
  if (responsesWithContent > 0) return 'partial';
  return 'none';
}

function calculateDocsCompletion(state: EditalWorkspaceState): StageCompletionStatus {
  const { requiredDocs } = state.documents;
  if (requiredDocs.length === 0) return 'none';

  const completedDocs = requiredDocs.filter(
    d => d.status === 'available' || d.status === 'uploaded'
  ).length;

  if (completedDocs === requiredDocs.length) return 'complete';
  if (completedDocs > 0) return 'partial';
  return 'none';
}

function calculateTimelineCompletion(state: EditalWorkspaceState): StageCompletionStatus {
  if (state.timeline.phases.length > 0) return 'complete';
  if (state.timeline.extractionStatus === 'extracting') return 'partial';
  return 'none';
}

export default WorkspaceContext;
