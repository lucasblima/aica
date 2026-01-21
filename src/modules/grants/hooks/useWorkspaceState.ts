/**
 * useWorkspaceState - Hook for initializing and hydrating workspace state
 * Loads project data from Supabase and creates initial state
 */

import { useState, useEffect, useCallback } from 'react';
import {
  EditalWorkspaceState,
  createInitialWorkspaceState,
  StageId,
} from '../types/workspace';
import type { GrantOpportunity, GrantProject, GrantResponse, FormField } from '../types';
import {
  getProject,
  getBriefing,
  listResponses,
} from '../services/grantService';
import { listProjectDocuments } from '../services/projectDocumentService';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Useworkspacestate');

interface UseWorkspaceStateOptions {
  projectId: string;
  opportunityId: string;
  project?: GrantProject | null;
  opportunity?: GrantOpportunity | null;
}

interface UseWorkspaceStateResult {
  initialState: EditalWorkspaceState | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook to initialize workspace state from project and opportunity data
 */
export function useWorkspaceState({
  projectId,
  opportunityId,
  project: providedProject,
  opportunity: providedOpportunity,
}: UseWorkspaceStateOptions): UseWorkspaceStateResult {
  const [initialState, setInitialState] = useState<EditalWorkspaceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use provided data or fetch from service
      let project = providedProject;
      let opportunity = providedOpportunity;

      if (!project) {
        project = await getProject(projectId);
      }

      if (!opportunity && project?.opportunity) {
        opportunity = project.opportunity;
      }

      if (!project || !opportunity) {
        throw new Error('Projeto ou oportunidade nao encontrado');
      }

      // Load briefing data
      const briefing = await getBriefing(projectId);
      const briefingContext = briefing?.briefing_data || {};

      // Load responses
      const responsesList = await listResponses(projectId);
      const responses: Record<string, GrantResponse> = {};
      responsesList.forEach(r => {
        responses[r.field_id] = r;
      });

      // Load project documents
      const documents = await listProjectDocuments(projectId);

      // Determine initial stage based on project status
      const initialStage = determineInitialStage(project, opportunity, responses);

      // Create initial state
      const state = createInitialWorkspaceState(
        projectId,
        opportunityId,
        project.project_name,
        opportunity.title
      );

      // Hydrate with loaded data
      const hydratedState: EditalWorkspaceState = {
        ...state,
        currentStage: initialStage,
        visitedStages: [initialStage],

        // Stage 1: PDF
        pdfUpload: {
          file: null,
          path: opportunity.edital_pdf_path || null,
          textContent: opportunity.edital_text_content || null,
          processingStatus: opportunity.edital_text_content ? 'done' : 'idle',
          error: null,
        },

        // Stage 2: Form Fields
        formFields: {
          fields: opportunity.form_fields || [],
          isDirty: false,
          sourceText: '',
          parsingStatus: opportunity.form_fields?.length > 0 ? 'done' : 'idle',
        },

        // Stage 3: Drafting
        drafting: {
          responses,
          activeFieldId: null,
          generationQueue: [],
          isGenerating: false,
        },

        // Stage 4: Documents
        documents: {
          requiredDocs: [], // Will be extracted from PDF
          uploadedDocs: documents,
          checklistProgress: 0,
        },

        // Stage 5: Timeline
        timeline: {
          phases: [], // Will be extracted from PDF
          extractionStatus: 'idle',
        },

        // Context
        briefingContext,
        evaluationCriteria: opportunity.evaluation_criteria || [],

        // Metadata
        projectName: project.project_name,
        opportunityTitle: opportunity.title,
        lastSaved: project.updated_at ? new Date(project.updated_at) : null,
        isDirty: false,
        isLoading: false,
        error: null,
      };

      setInitialState(hydratedState);
    } catch (err) {
      log.error('Error loading workspace:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar workspace');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, opportunityId, providedProject, providedOpportunity]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  return {
    initialState,
    isLoading,
    error,
    reload: loadWorkspaceData,
  };
}

/**
 * Determine the initial stage based on project progress
 */
function determineInitialStage(
  project: GrantProject,
  opportunity: GrantOpportunity,
  responses: Record<string, GrantResponse>
): StageId {
  // If no PDF uploaded, start at setup
  if (!opportunity.edital_pdf_path && !opportunity.edital_text_content) {
    return 'setup';
  }

  // If no form fields, go to structure
  if (!opportunity.form_fields || opportunity.form_fields.length === 0) {
    return 'structure';
  }

  // If has form fields but no responses, go to drafting
  const hasResponses = Object.keys(responses).length > 0;
  if (!hasResponses) {
    return 'drafting';
  }

  // Check project status for more specific routing
  switch (project.status) {
    case 'draft':
    case 'briefing':
      return 'drafting';
    case 'generating':
    case 'review':
      return 'drafting';
    case 'submitted':
    case 'approved':
    case 'rejected':
      return 'drafting'; // Show results
    default:
      return 'setup';
  }
}

export default useWorkspaceState;
