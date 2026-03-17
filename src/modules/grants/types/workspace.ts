/**
 * Workspace Types - Non-Linear Stage Navigation
 * "Open Workspace" Model for Edital Projects
 */

import type { FormField, GrantResponse, ProjectDocument, EvaluationCriterion } from '../types';

// ============================================
// STAGE DEFINITIONS
// ============================================

export type StageId = 'setup' | 'structure' | 'drafting' | 'docs' | 'timeline';

export type StageCompletionStatus = 'none' | 'partial' | 'complete';

export interface StageDefinition {
  id: StageId;
  label: string;
  shortLabel: string;
  description: string;
}

export const EDITAL_STAGES: StageDefinition[] = [
  {
    id: 'setup',
    label: '1. Contexto & PDF',
    shortLabel: 'Contexto',
    description: 'Upload e processamento do PDF do edital'
  },
  {
    id: 'structure',
    label: '2. Perguntas',
    shortLabel: 'Perguntas',
    description: 'Definir/extrair os campos do formulario'
  },
  {
    id: 'drafting',
    label: '3. Preenchimento IA',
    shortLabel: 'Redacao',
    description: 'Interface Smart Copy para responder perguntas'
  },
  {
    id: 'docs',
    label: '4. Documentação',
    shortLabel: 'Docs',
    description: 'Checklist de documentos de habilitacao'
  },
  {
    id: 'timeline',
    label: '5. Cronograma',
    shortLabel: 'Cronograma',
    description: 'Timeline das fases externas do edital'
  },
];

// ============================================
// STAGE-SPECIFIC STATE TYPES
// ============================================

// Stage 1: Contexto (PDF)
export interface PdfUploadState {
  file: File | null;
  path: string | null;
  textContent: string | null;
  processingStatus: 'idle' | 'uploading' | 'extracting' | 'done' | 'error';
  error: string | null;
}

// Stage 2: Estrutura (Perguntas)
export interface FormFieldsState {
  fields: FormField[];
  isDirty: boolean;
  sourceText: string; // Raw pasted text for AI parsing
  parsingStatus: 'idle' | 'parsing' | 'done' | 'error';
}

// Stage 3: Redacao (IA)
export interface DraftingState {
  responses: Record<string, GrantResponse>;
  activeFieldId: string | null;
  generationQueue: string[];
  isGenerating: boolean;
}

// Stage 4: Habilitacao (Docs)
export interface RequiredDocument {
  id: string;
  name: string;
  description?: string;
  status: 'required' | 'available' | 'uploaded';
  uploadedPath?: string;
  uploadedFileName?: string;
  dueDate?: string;
}

export interface DocumentsState {
  requiredDocs: RequiredDocument[];
  uploadedDocs: ProjectDocument[];
  checklistProgress: number;
}

// Stage 5: Cronograma (Externo)
export interface EditalPhase {
  id: string;
  name: string;
  description?: string;
  date: string;
  status: 'completed' | 'active' | 'pending';
}

export interface TimelineState {
  phases: EditalPhase[];
  extractionStatus: 'idle' | 'extracting' | 'done' | 'error';
}

// ============================================
// MAIN WORKSPACE STATE
// ============================================

export interface EditalWorkspaceState {
  // Navigation
  currentStage: StageId;
  visitedStages: StageId[];

  // Stage 1: Contexto (PDF)
  pdfUpload: PdfUploadState;

  // Stage 2: Estrutura (Perguntas)
  formFields: FormFieldsState;

  // Stage 3: Redacao (IA)
  drafting: DraftingState;

  // Stage 4: Habilitacao (Docs)
  documents: DocumentsState;

  // Stage 5: Cronograma (Externo)
  timeline: TimelineState;

  // Briefing context (from old system - for AI generation)
  briefingContext: Record<string, string>;

  // Evaluation criteria (from edital)
  evaluationCriteria: EvaluationCriterion[];

  // Global metadata
  projectId: string;
  opportunityId: string;
  projectName: string;
  opportunityTitle: string;
  lastSaved: Date | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// ACTION TYPES
// ============================================

export type WorkspaceAction =
  // Navigation
  | { type: 'SET_STAGE'; payload: StageId }
  | { type: 'MARK_STAGE_VISITED'; payload: StageId }

  // Stage 1: PDF Upload
  | { type: 'UPDATE_PDF'; payload: Partial<PdfUploadState> }
  | { type: 'RESET_PDF' }

  // Stage 2: Form Fields
  | { type: 'UPDATE_FORM_FIELDS'; payload: Partial<FormFieldsState> }
  | { type: 'SET_FORM_FIELDS'; payload: FormField[] }
  | { type: 'ADD_FORM_FIELD'; payload: FormField }
  | { type: 'REMOVE_FORM_FIELD'; payload: string }
  | { type: 'UPDATE_FORM_FIELD'; payload: { id: string; updates: Partial<FormField> } }

  // Stage 3: Drafting
  | { type: 'UPDATE_DRAFTING'; payload: Partial<DraftingState> }
  | { type: 'SET_RESPONSE'; payload: { fieldId: string; response: GrantResponse } }
  | { type: 'SET_ALL_RESPONSES'; payload: Record<string, GrantResponse> }
  | { type: 'SET_ACTIVE_FIELD'; payload: string | null }
  | { type: 'START_GENERATION'; payload: string[] }
  | { type: 'FINISH_GENERATION' }

  // Stage 4: Documents
  | { type: 'UPDATE_DOCUMENTS'; payload: Partial<DocumentsState> }
  | { type: 'SET_REQUIRED_DOCS'; payload: RequiredDocument[] }
  | { type: 'TOGGLE_DOC_STATUS'; payload: string }
  | { type: 'ADD_UPLOADED_DOC'; payload: ProjectDocument }
  | { type: 'REMOVE_UPLOADED_DOC'; payload: string }

  // Stage 5: Timeline
  | { type: 'UPDATE_TIMELINE'; payload: Partial<TimelineState> }
  | { type: 'SET_TIMELINE_PHASES'; payload: EditalPhase[] }

  // Briefing context
  | { type: 'UPDATE_BRIEFING_CONTEXT'; payload: Record<string, string> }
  | { type: 'SET_BRIEFING_FIELD'; payload: { fieldId: string; value: string } }

  // Global
  | { type: 'HYDRATE'; payload: Partial<EditalWorkspaceState> }
  | { type: 'MARK_SAVED' }
  | { type: 'MARK_DIRTY' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_WORKSPACE' };

// ============================================
// INITIAL STATE FACTORY
// ============================================

export const createInitialWorkspaceState = (
  projectId: string,
  opportunityId: string,
  projectName: string = '',
  opportunityTitle: string = ''
): EditalWorkspaceState => ({
  // Navigation
  currentStage: 'setup',
  visitedStages: ['setup'],

  // Stage 1: PDF
  pdfUpload: {
    file: null,
    path: null,
    textContent: null,
    processingStatus: 'idle',
    error: null,
  },

  // Stage 2: Form Fields
  formFields: {
    fields: [],
    isDirty: false,
    sourceText: '',
    parsingStatus: 'idle',
  },

  // Stage 3: Drafting
  drafting: {
    responses: {},
    activeFieldId: null,
    generationQueue: [],
    isGenerating: false,
  },

  // Stage 4: Documents
  documents: {
    requiredDocs: [],
    uploadedDocs: [],
    checklistProgress: 0,
  },

  // Stage 5: Timeline
  timeline: {
    phases: [],
    extractionStatus: 'idle',
  },

  // Briefing
  briefingContext: {},
  evaluationCriteria: [],

  // Global
  projectId,
  opportunityId,
  projectName,
  opportunityTitle,
  lastSaved: null,
  isDirty: false,
  isLoading: false,
  error: null,
});

// ============================================
// UTILITY TYPES
// ============================================

export interface StageCompletionMap {
  setup: StageCompletionStatus;
  structure: StageCompletionStatus;
  drafting: StageCompletionStatus;
  docs: StageCompletionStatus;
  timeline: StageCompletionStatus;
}

export interface WorkspaceActions {
  // Navigation
  setStage: (stageId: StageId) => void;

  // Stage 1: PDF
  uploadPdf: (file: File) => Promise<void>;
  deletePdf: () => Promise<void>;

  // Stage 2: Form Fields
  parseFieldsWithAI: () => Promise<void>;
  extractFieldsFromPdf: () => Promise<void>;
  setFormFields: (fields: FormField[]) => void;
  addFormField: (field: FormField) => void;
  removeFormField: (fieldId: string) => void;
  updateFormField: (fieldId: string, updates: Partial<FormField>) => void;

  // Stage 3: Drafting
  generateField: (fieldId: string) => Promise<void>;
  generateAllFields: () => Promise<void>;
  approveField: (fieldId: string) => Promise<void>;
  editResponse: (fieldId: string, content: string) => Promise<void>;
  copyToClipboard: (fieldId: string) => Promise<void>;

  // Stage 4: Documents
  extractRequiredDocs: () => Promise<void>;
  toggleDocumentStatus: (docId: string) => void;
  uploadDocument: (docId: string, file: File) => Promise<void>;

  // Stage 5: Timeline
  extractTimeline: () => Promise<void>;

  // Briefing
  updateBriefingField: (fieldId: string, value: string) => void;

  // Global
  save: () => Promise<void>;
}
