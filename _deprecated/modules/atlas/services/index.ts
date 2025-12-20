/**
 * Atlas Module - Service Exports
 *
 * Centralized export point for all Atlas services
 */

// Task service
export { atlasService } from './atlasService';
export type {
  ValidationError,
  AuthenticationError,
  DatabaseError
} from './atlasService';

// Project service (NEW - Workstream D Part 2)
export { projectService } from './projectService';
export type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectFilters,
  ProjectValidationError,
  ProjectAuthenticationError,
  ProjectDatabaseError
} from './projectService';
