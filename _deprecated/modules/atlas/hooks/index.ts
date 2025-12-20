/**
 * Atlas Module - Hook Exports
 *
 * Centralized export point for all Atlas hooks
 */

// Task hooks
export { useAtlasTasks } from './useAtlasTasks';
export { useTaskCategorization } from './useTaskCategorization';
export { useConnectionTasks } from './useConnectionTasks';

// Project hooks (NEW - Workstream D Part 2)
export {
  useProjects,
  useProject,
  useProjectTasks,
  useCreateProject,
  useUpdateProject,
  useDeleteProject
} from './useProjects';
