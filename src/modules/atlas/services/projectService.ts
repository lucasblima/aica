import { supabase } from '../../../services/supabaseClient';

/**
 * Project interface matching task_projects table schema
 */
export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  connection_space_id?: string;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  color?: string;
  icon?: string;
  target_date?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // From view join
  total_tasks?: number;
  completed_tasks?: number;
  progress_percentage?: number;
}

export interface CreateProjectPayload {
  title: string;
  description?: string;
  connection_space_id?: string;
  status?: 'active' | 'completed' | 'archived' | 'on_hold';
  color?: string;
  icon?: string;
  target_date?: string;
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string;
  connection_space_id?: string;
  status?: 'active' | 'completed' | 'archived' | 'on_hold';
  color?: string;
  icon?: string;
  target_date?: string;
}

export interface ProjectFilters {
  status?: 'active' | 'completed' | 'archived' | 'on_hold';
  connection_space_id?: string;
}

/**
 * Custom error classes for better error handling
 */
export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectValidationError';
  }
}

export class ProjectAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectAuthenticationError';
  }
}

export class ProjectDatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'ProjectDatabaseError';
  }
}

/**
 * Validates project input before sending to database
 */
function validateProjectInput(input: CreateProjectPayload | UpdateProjectPayload): void {
  if ('title' in input && input.title !== undefined) {
    if (!input.title || input.title.trim().length === 0) {
      throw new ProjectValidationError('O título do projeto é obrigatório');
    }

    if (input.title.length > 200) {
      throw new ProjectValidationError('O título do projeto deve ter no máximo 200 caracteres');
    }
  }

  if (input.description && input.description.length > 2000) {
    throw new ProjectValidationError('A descrição deve ter no máximo 2000 caracteres');
  }

  const validStatuses = ['active', 'completed', 'archived', 'on_hold'];
  if (input.status && !validStatuses.includes(input.status)) {
    throw new ProjectValidationError(`Status inválido. Use: ${validStatuses.join(', ')}`);
  }

  if (input.target_date) {
    const date = new Date(input.target_date);
    if (isNaN(date.getTime())) {
      throw new ProjectValidationError('Data alvo inválida');
    }
  }
}

/**
 * Project Service - CRUD operations for task projects
 */
export const projectService = {
  /**
   * CREATE - Create new project
   */
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    try {
      // 1. Validate input
      validateProjectInput(payload);

      // 2. Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new ProjectAuthenticationError('Erro ao verificar autenticação: ' + authError.message);
      }

      if (!user) {
        throw new ProjectAuthenticationError('Você precisa estar autenticado para criar projetos');
      }

      // 3. Prepare data for insert
      const projectData: any = {
        user_id: user.id,
        title: payload.title,
        description: payload.description || null,
        status: payload.status || 'active',
        color: payload.color || '#3B82F6',
        icon: payload.icon || '📋',
        target_date: payload.target_date || null,
        connection_space_id: payload.connection_space_id || null,
        started_at: new Date().toISOString(),
      };

      // 4. Insert into Supabase
      const { data, error } = await supabase
        .from('task_projects')
        .insert([projectData])
        .select()
        .single();

      if (error) {
        console.error('[projectService] Failed to create project:', error);

        if (error.code === '23505') {
          throw new ProjectDatabaseError('Este projeto já existe', error);
        } else if (error.code === '23503') {
          throw new ProjectDatabaseError('Erro de referência no banco de dados', error);
        } else if (error.message.includes('permission')) {
          throw new ProjectDatabaseError('Você não tem permissão para criar projetos', error);
        } else {
          throw new ProjectDatabaseError('Erro ao salvar projeto no banco de dados', error);
        }
      }

      if (!data) {
        throw new ProjectDatabaseError('Nenhum dado retornado após criar o projeto');
      }

      return data as Project;
    } catch (error) {
      if (error instanceof ProjectValidationError ||
          error instanceof ProjectAuthenticationError ||
          error instanceof ProjectDatabaseError) {
        throw error;
      }

      console.error('[projectService] Unexpected error creating project:', error);
      throw new ProjectDatabaseError('Erro inesperado ao criar projeto. Tente novamente.', error);
    }
  },

  /**
   * READ - Get all projects with optional filters
   */
  async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new ProjectAuthenticationError('Você precisa estar autenticado');
      }

      let query = supabase
        .from('task_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.connection_space_id) {
        query = query.eq('connection_space_id', filters.connection_space_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[projectService] Failed to fetch projects:', error);
        throw new ProjectDatabaseError('Erro ao buscar projetos', error);
      }

      return (data || []) as Project[];
    } catch (error) {
      if (error instanceof ProjectAuthenticationError || error instanceof ProjectDatabaseError) {
        throw error;
      }
      console.error('[projectService] Unexpected error fetching projects:', error);
      throw new ProjectDatabaseError('Erro inesperado ao buscar projetos', error);
    }
  },

  /**
   * READ - Get single project by ID
   */
  async getProjectById(projectId: string): Promise<Project> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new ProjectAuthenticationError('Você precisa estar autenticado');
      }

      const { data, error } = await supabase
        .from('task_projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[projectService] Failed to fetch project:', error);
        throw new ProjectDatabaseError('Erro ao buscar projeto', error);
      }

      if (!data) {
        throw new ProjectDatabaseError('Projeto não encontrado');
      }

      return data as Project;
    } catch (error) {
      if (error instanceof ProjectAuthenticationError || error instanceof ProjectDatabaseError) {
        throw error;
      }
      console.error('[projectService] Unexpected error fetching project:', error);
      throw new ProjectDatabaseError('Erro inesperado ao buscar projeto', error);
    }
  },

  /**
   * READ - Get project with progress data from view
   */
  async getProjectWithProgress(projectId: string): Promise<Project> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new ProjectAuthenticationError('Você precisa estar autenticado');
      }

      // Try to fetch from view first (includes progress data)
      const { data: viewData, error: viewError } = await supabase
        .from('project_progress')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!viewError && viewData) {
        return viewData as Project;
      }

      // Fallback to regular table if view doesn't exist yet
      return await this.getProjectById(projectId);
    } catch (error) {
      if (error instanceof ProjectAuthenticationError || error instanceof ProjectDatabaseError) {
        throw error;
      }
      console.error('[projectService] Unexpected error fetching project with progress:', error);
      throw new ProjectDatabaseError('Erro inesperado ao buscar projeto', error);
    }
  },

  /**
   * READ - Get all projects with progress data
   */
  async getProjectsWithProgress(filters?: ProjectFilters): Promise<Project[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new ProjectAuthenticationError('Você precisa estar autenticado');
      }

      let query = supabase
        .from('project_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.connection_space_id) {
        query = query.eq('connection_space_id', filters.connection_space_id);
      }

      const { data, error } = await query;

      // If view doesn't exist yet, fallback to regular getProjects
      if (error) {
        console.warn('[projectService] project_progress view not available, using fallback');
        return await this.getProjects(filters);
      }

      return (data || []) as Project[];
    } catch (error) {
      if (error instanceof ProjectAuthenticationError || error instanceof ProjectDatabaseError) {
        throw error;
      }
      console.error('[projectService] Unexpected error fetching projects with progress:', error);
      throw new ProjectDatabaseError('Erro inesperado ao buscar projetos', error);
    }
  },

  /**
   * UPDATE - Update existing project
   */
  async updateProject(projectId: string, payload: UpdateProjectPayload): Promise<Project> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new ProjectAuthenticationError('Você precisa estar autenticado');
      }

      // Validate updates
      validateProjectInput(payload);

      // Map updates to database schema
      const updateData: any = {};

      if (payload.title !== undefined) updateData.title = payload.title;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.status !== undefined) {
        updateData.status = payload.status;
        // Set completed_at when marking as completed
        if (payload.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        } else if (updateData.completed_at !== undefined) {
          updateData.completed_at = null;
        }
      }
      if (payload.color !== undefined) updateData.color = payload.color;
      if (payload.icon !== undefined) updateData.icon = payload.icon;
      if (payload.target_date !== undefined) updateData.target_date = payload.target_date;
      if (payload.connection_space_id !== undefined) {
        updateData.connection_space_id = payload.connection_space_id;
      }

      const { data, error } = await supabase
        .from('task_projects')
        .update(updateData)
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[projectService] Failed to update project:', error);
        throw new ProjectDatabaseError('Erro ao atualizar projeto', error);
      }

      if (!data) {
        throw new ProjectDatabaseError('Projeto não encontrado');
      }

      return data as Project;
    } catch (error) {
      if (error instanceof ProjectValidationError ||
          error instanceof ProjectAuthenticationError ||
          error instanceof ProjectDatabaseError) {
        throw error;
      }
      console.error('[projectService] Unexpected error updating project:', error);
      throw new ProjectDatabaseError('Erro inesperado ao atualizar projeto', error);
    }
  },

  /**
   * DELETE - Delete project (soft delete by archiving)
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new ProjectAuthenticationError('Você precisa estar autenticado');
      }

      // Soft delete: archive instead of actually deleting
      const { error } = await supabase
        .from('task_projects')
        .update({ status: 'archived' })
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[projectService] Failed to delete project:', error);
        throw new ProjectDatabaseError('Erro ao deletar projeto', error);
      }
    } catch (error) {
      if (error instanceof ProjectAuthenticationError || error instanceof ProjectDatabaseError) {
        throw error;
      }
      console.error('[projectService] Unexpected error deleting project:', error);
      throw new ProjectDatabaseError('Erro inesperado ao deletar projeto', error);
    }
  },

  /**
   * HARD DELETE - Permanently delete project (use with caution)
   */
  async hardDeleteProject(projectId: string): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new ProjectAuthenticationError('Você precisa estar autenticado');
      }

      const { error } = await supabase
        .from('task_projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[projectService] Failed to hard delete project:', error);
        throw new ProjectDatabaseError('Erro ao deletar projeto permanentemente', error);
      }
    } catch (error) {
      if (error instanceof ProjectAuthenticationError || error instanceof ProjectDatabaseError) {
        throw error;
      }
      console.error('[projectService] Unexpected error hard deleting project:', error);
      throw new ProjectDatabaseError('Erro inesperado ao deletar projeto', error);
    }
  },
};
