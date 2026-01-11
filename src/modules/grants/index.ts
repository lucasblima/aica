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
  // Sponsorship types (Issue #97)
  CaptureStatus,
  DeliverableCategory,
  SponsorStatus,
  ProjectApprovalFields,
  SponsorshipTier,
  TierDeliverable,
  ProjectSponsor,
  CreateSponsorshipTierDTO,
  UpdateSponsorshipTierDTO,
  CreateTierDeliverableDTO,
  UpdateTierDeliverableDTO,
  CreateProjectSponsorDTO,
  UpdateProjectSponsorDTO,
  UpdateProjectApprovalDTO,
  ProjectSponsorshipContext,
  CaptureProgress,
  TierAvailability,
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
  // Sponsorship constants (Issue #97)
  CAPTURE_STATUS_LABELS,
  CAPTURE_STATUS_COLORS,
  DELIVERABLE_CATEGORY_LABELS,
  SPONSOR_STATUS_LABELS,
  SPONSOR_STATUS_COLORS,
  CONFIRMED_SPONSOR_STATUSES,
  SPONSOR_PIPELINE_ORDER,
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

// Sponsorship hooks (Issue #97)
export {
  useSponsorshipTiers,
  useTierDeliverables,
  useProjectSponsors,
  useCaptureProgress,
} from './hooks/useSponsorship';

// Sponsorship services (Issue #97)
export {
  getProjectTiers,
  getTierById,
  createTier,
  updateTier,
  deleteTier,
  reorderTiers,
  getTierDeliverables,
  addDeliverable,
  updateDeliverable,
  deleteDeliverable,
  bulkAddDeliverables,
  getProjectSponsors,
  getSponsorsByStatus,
  getSponsorById,
  addSponsor,
  updateSponsor,
  updateSponsorStatus,
  deleteSponsor,
  recordPayment,
  updateProjectApproval,
  getCaptureProgress,
  getTiersAvailability,
  getProjectSponsorshipContext,
  getCapturedByStatus,
  getSponsorsWithUpcomingPayments,
  duplicateTiersStructure,
} from './services/sponsorshipService';
