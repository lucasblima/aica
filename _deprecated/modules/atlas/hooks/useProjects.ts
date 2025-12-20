import { useState, useEffect, useCallback } from 'react';
import {
  projectService,
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectFilters,
  ProjectValidationError,
  ProjectAuthenticationError,
  ProjectDatabaseError
} from '../services/projectService';
import { atlasService } from '../services/atlasService';
import { AtlasTask } from '../types/plane';
import { notificationService } from '../../../services/notificationService';

/**
 * Hook for managing multiple projects with optional filters
 *
 * @example
 * ```tsx
 * const { projects, loading, createProject, refresh } = useProjects({ status: 'active' });
 * ```
 */
export function useProjects(filters?: ProjectFilters) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await projectService.getProjectsWithProgress(filters);
      setProjects(data);
    } catch (err) {
      setError(err as Error);
      console.error('[useProjects] Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.connection_space_id]);

  // Create project
  const createProject = useCallback(async (payload: CreateProjectPayload): Promise<Project | null> => {
    try {
      setLoading(true);
      setError(null);

      const newProject = await projectService.createProject(payload);

      // Optimistically add to local state
      setProjects(prev => [newProject, ...prev]);

      notificationService.showSuccess(
        'Projeto criado!',
        `"${newProject.title}" foi criado com sucesso.`
      );

      return newProject;
    } catch (err) {
      setError(err as Error);
      console.error('[useProjects] Error creating project:', err);

      // Show appropriate error message
      if (err instanceof ProjectValidationError) {
        notificationService.showError('Erro de validação', err.message);
      } else if (err instanceof ProjectAuthenticationError) {
        notificationService.showError('Erro de autenticação', err.message);
      } else if (err instanceof ProjectDatabaseError) {
        notificationService.showError('Erro ao salvar', err.message);
      } else {
        notificationService.showError(
          'Erro inesperado',
          'Não foi possível criar o projeto. Tente novamente.'
        );
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh projects list
  const refresh = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    createProject,
    refresh,
  };
}

/**
 * Hook for managing a single project with its tasks
 *
 * @example
 * ```tsx
 * const { project, tasks, loading, updateProject, deleteProject } = useProject(projectId);
 * ```
 */
export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<AtlasTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch project with progress
  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await projectService.getProjectWithProgress(projectId);
      setProject(data);
    } catch (err) {
      setError(err as Error);
      console.error('[useProject] Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch tasks for this project
  const fetchTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      // Get all tasks filtered by project_id
      const allTasks = await atlasService.getTasks({
        archived: false,
      });

      // Filter tasks that belong to this project
      // Note: This assumes work_items table has project_id column
      const projectTasks = allTasks.filter((task: any) => task.project_id === projectId);
      setTasks(projectTasks);
    } catch (err) {
      console.error('[useProject] Error fetching tasks:', err);
      setTasks([]);
    }
  }, [projectId]);

  // Update project
  const updateProject = useCallback(async (payload: UpdateProjectPayload): Promise<Project | null> => {
    if (!projectId) return null;

    try {
      setLoading(true);
      setError(null);

      const updated = await projectService.updateProject(projectId, payload);
      setProject(updated);

      notificationService.showSuccess(
        'Projeto atualizado!',
        'As alterações foram salvas com sucesso.'
      );

      return updated;
    } catch (err) {
      setError(err as Error);
      console.error('[useProject] Error updating project:', err);

      if (err instanceof ProjectValidationError) {
        notificationService.showError('Erro de validação', err.message);
      } else if (err instanceof ProjectDatabaseError) {
        notificationService.showError('Erro ao salvar', err.message);
      } else {
        notificationService.showError(
          'Erro inesperado',
          'Não foi possível atualizar o projeto.'
        );
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Delete project
  const deleteProject = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;

    try {
      setLoading(true);
      setError(null);

      await projectService.deleteProject(projectId);

      notificationService.showSuccess(
        'Projeto arquivado!',
        'O projeto foi movido para arquivados.'
      );

      return true;
    } catch (err) {
      setError(err as Error);
      console.error('[useProject] Error deleting project:', err);

      notificationService.showError(
        'Erro ao arquivar',
        'Não foi possível arquivar o projeto.'
      );

      return false;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Refresh project and tasks
  const refresh = useCallback(async () => {
    await Promise.all([fetchProject(), fetchTasks()]);
  }, [fetchProject, fetchTasks]);

  // Auto-fetch on mount
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchTasks();
    }
  }, [projectId, fetchProject, fetchTasks]);

  return {
    project,
    tasks,
    loading,
    error,
    updateProject,
    deleteProject,
    refresh,
  };
}

/**
 * Hook for managing tasks within a specific project
 *
 * @example
 * ```tsx
 * const { tasks, loading, addTask, removeTask } = useProjectTasks(projectId);
 * ```
 */
export function useProjectTasks(projectId: string | undefined) {
  const [tasks, setTasks] = useState<AtlasTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch tasks for this project
  const fetchTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const allTasks = await atlasService.getTasks({
        archived: false,
      });

      // Filter by project_id
      const projectTasks = allTasks.filter((task: any) => task.project_id === projectId);
      setTasks(projectTasks);
    } catch (err) {
      setError(err as Error);
      console.error('[useProjectTasks] Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Add task to project
  const addTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (!projectId) return false;

    try {
      setLoading(true);
      setError(null);

      // Update task to link it to this project
      await atlasService.updateTask(taskId, {
        // Note: This assumes work_items table has project_id column
        project_id: projectId
      } as any);

      // Refresh tasks
      await fetchTasks();

      notificationService.showSuccess(
        'Tarefa adicionada!',
        'A tarefa foi vinculada ao projeto.'
      );

      return true;
    } catch (err) {
      setError(err as Error);
      console.error('[useProjectTasks] Error adding task:', err);

      notificationService.showError(
        'Erro ao adicionar',
        'Não foi possível vincular a tarefa ao projeto.'
      );

      return false;
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTasks]);

  // Remove task from project
  const removeTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Update task to unlink it from project
      await atlasService.updateTask(taskId, {
        project_id: null
      } as any);

      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId));

      notificationService.showSuccess(
        'Tarefa removida!',
        'A tarefa foi desvinculada do projeto.'
      );

      return true;
    } catch (err) {
      setError(err as Error);
      console.error('[useProjectTasks] Error removing task:', err);

      notificationService.showError(
        'Erro ao remover',
        'Não foi possível desvincular a tarefa.'
      );

      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh tasks
  const refresh = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  // Auto-fetch on mount
  useEffect(() => {
    if (projectId) {
      fetchTasks();
    }
  }, [projectId, fetchTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    removeTask,
    refresh,
  };
}

/**
 * Hook for creating a new project with wizard-style flow
 *
 * @example
 * ```tsx
 * const { createProject, isCreating } = useCreateProject();
 * await createProject({ title: 'New Project', color: '#FF0000' });
 * ```
 */
export function useCreateProject() {
  const [isCreating, setIsCreating] = useState(false);

  const createProject = useCallback(async (payload: CreateProjectPayload): Promise<Project | null> => {
    try {
      setIsCreating(true);

      const newProject = await projectService.createProject(payload);

      notificationService.showSuccess(
        'Projeto criado!',
        `"${newProject.title}" foi criado com sucesso.`
      );

      return newProject;
    } catch (err) {
      console.error('[useCreateProject] Error:', err);

      if (err instanceof ProjectValidationError) {
        notificationService.showError('Erro de validação', err.message);
      } else if (err instanceof ProjectAuthenticationError) {
        notificationService.showError('Erro de autenticação', err.message);
      } else if (err instanceof ProjectDatabaseError) {
        notificationService.showError('Erro ao salvar', err.message);
      } else {
        notificationService.showError(
          'Erro inesperado',
          'Não foi possível criar o projeto.'
        );
      }

      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createProject,
    isCreating,
  };
}

/**
 * Hook for updating a project with validation
 *
 * @example
 * ```tsx
 * const { updateProject, isUpdating } = useUpdateProject(projectId);
 * await updateProject({ title: 'Updated Title' });
 * ```
 */
export function useUpdateProject(projectId: string | undefined) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProject = useCallback(async (payload: UpdateProjectPayload): Promise<Project | null> => {
    if (!projectId) return null;

    try {
      setIsUpdating(true);

      const updated = await projectService.updateProject(projectId, payload);

      notificationService.showSuccess(
        'Projeto atualizado!',
        'As alterações foram salvas.'
      );

      return updated;
    } catch (err) {
      console.error('[useUpdateProject] Error:', err);

      if (err instanceof ProjectValidationError) {
        notificationService.showError('Erro de validação', err.message);
      } else if (err instanceof ProjectDatabaseError) {
        notificationService.showError('Erro ao salvar', err.message);
      } else {
        notificationService.showError(
          'Erro inesperado',
          'Não foi possível atualizar o projeto.'
        );
      }

      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [projectId]);

  return {
    updateProject,
    isUpdating,
  };
}

/**
 * Hook for deleting a project
 *
 * @example
 * ```tsx
 * const { deleteProject, isDeleting } = useDeleteProject();
 * await deleteProject(projectId);
 * ```
 */
export function useDeleteProject() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      setIsDeleting(true);

      await projectService.deleteProject(projectId);

      notificationService.showSuccess(
        'Projeto arquivado!',
        'O projeto foi movido para arquivados.'
      );

      return true;
    } catch (err) {
      console.error('[useDeleteProject] Error:', err);

      notificationService.showError(
        'Erro ao arquivar',
        'Não foi possível arquivar o projeto.'
      );

      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    deleteProject,
    isDeleting,
  };
}
