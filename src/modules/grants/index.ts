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
  // Organizations types
  OrganizationType,
  RelationshipType,
  BrandColors,
  SocialLinks,
  Organization,
  OrganizationRelationship,
  OrganizationMember,
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
  CreateRelationshipDTO,
  CreateMemberDTO,
} from './types';

export {
  FUNDING_AGENCIES,
  ELIGIBLE_THEMES,
  PROJECT_STATUS_LABELS,
  RESPONSE_STATUS_LABELS,
  BRIEFING_SECTIONS,
  // Organizations constants
  ORGANIZATION_TYPE_LABELS,
  RELATIONSHIP_TYPE_LABELS,
  AREAS_OF_ACTIVITY_OPTIONS,
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
// Organizations hooks
export {
  useOrganizations,
  useOrganization,
  useOrganizationRelationships,
  useOrganizationMembers,
} from './hooks/useOrganizations';

// Services
export { getOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } from './services';
export { getProjects, createProject, updateProject, deleteProject } from './services';
export { getBriefings, updateBriefing } from './services';
export { getResponses, updateResponse, generateField } from './services';

// Organizations services
export {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationRelationships,
  createRelationship,
  updateRelationship,
  deleteRelationship,
  getOrganizationMembers,
  addOrganizationMember,
  updateOrganizationMember,
  removeOrganizationMember,
  searchOrganizations,
  getOrganizationsByArea,
  getOrganizationsByType,
  countOrganizations,
  checkDuplicateDocument,
} from './services/organizationService';
