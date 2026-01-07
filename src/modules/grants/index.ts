/**
 * Grants Module Public API
 *
 * This module provides grant opportunity tracking and project briefing generation
 * for managing funding opportunities and application writing.
 */

// Types
export type {
  GrantOpportunity,
  GrantProject,
  GrantBriefing,
  GrantResponse,
  ProjectDocument,
  OpportunityDocument,
  GuestResearch,
  CreateOpportunityPayload,
  CreateProjectPayload,
  UpdateBriefingPayload,
  UpdateResponsePayload,
  GenerateFieldPayload,
  DashboardGrantStats,
  BriefingData,
} from './types';

export {
  FUNDING_AGENCIES,
  ELIGIBLE_THEMES,
  PROJECT_STATUS_LABELS,
  RESPONSE_STATUS_LABELS,
  BRIEFING_SECTIONS,
} from './types';

// Views
export { default as GrantsModuleView } from './views/GrantsModuleView';

// Context
export { WorkspaceContext, WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';

// Hooks
export { useGrantProject } from './hooks/useGrantProject';
export { useGrantOpportunity } from './hooks/useGrantOpportunity';
export { useGrantBriefing } from './hooks/useGrantBriefing';
export { useGrantResponse } from './hooks/useGrantResponse';

// Services
export { getOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } from './services';
export { getProjects, createProject, updateProject, deleteProject } from './services';
export { getBriefings, updateBriefing } from './services';
export { getResponses, updateResponse, generateField } from './services';
