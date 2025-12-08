import { supabase } from '../../../services/supabaseClient';
import { TaskInput, AtlasTask } from '../types/plane';

/**
 * Validation error types
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class DatabaseError extends Error {
    constructor(message: string, public originalError?: any) {
        super(message);
        this.name = 'DatabaseError';
    }
}

/**
 * Validates TaskInput before sending to database
 */
function validateTaskInput(taskInput: TaskInput): void {
    // Title is required and must be non-empty
    if (!taskInput.title || taskInput.title.trim().length === 0) {
        throw new ValidationError('O título da tarefa é obrigatório');
    }

    // Title length limit (database constraint)
    if (taskInput.title.length > 500) {
        throw new ValidationError('O título da tarefa deve ter no máximo 500 caracteres');
    }

    // Description length limit
    if (taskInput.description && taskInput.description.length > 5000) {
        throw new ValidationError('A descrição deve ter no máximo 5000 caracteres');
    }

    // Priority validation
    const validPriorities: TaskInput['priority'][] = ['urgent', 'high', 'medium', 'low', 'none'];
    if (taskInput.priority && !validPriorities.includes(taskInput.priority)) {
        throw new ValidationError(`Prioridade inválida. Use: ${validPriorities.join(', ')}`);
    }

    // Date validation
    if (taskInput.target_date) {
        const date = new Date(taskInput.target_date);
        if (isNaN(date.getTime())) {
            throw new ValidationError('Data de vencimento inválida');
        }
    }
}

/**
 * Atlas Service - Task Management with CRUD operations
 */
export const atlasService = {
    /**
     * CREATE - Add new task
     */
    createTask: async (taskInput: TaskInput): Promise<AtlasTask> => {
        try {
            // 1. Validate input
            validateTaskInput(taskInput);

            // 2. Get authenticated user
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError) {
                throw new AuthenticationError('Erro ao verificar autenticação: ' + authError.message);
            }

            if (!user) {
                throw new AuthenticationError('Você precisa estar autenticado para criar tarefas');
            }

            // 3. Map Atlas TaskInput to Supabase work_items schema
            const workItemData = {
                user_id: user.id, // CRITICAL: Must include user_id for RLS policies
                title: taskInput.title,
                description: taskInput.description || null,
                priority: taskInput.priority || 'medium',
                due_date: taskInput.target_date || null,
                archived: false,
                is_completed: false,
                status: 'todo'
            };

            // 4. Insert into Supabase
            const { data, error } = await supabase
                .from('work_items')
                .insert([workItemData])
                .select()
                .single();

            if (error) {
                console.error('[atlasService] Failed to create task:', error);

                // Provide user-friendly error messages
                if (error.code === '23505') {
                    throw new DatabaseError('Esta tarefa já existe', error);
                } else if (error.code === '23503') {
                    throw new DatabaseError('Erro de referência no banco de dados', error);
                } else if (error.message.includes('permission')) {
                    throw new DatabaseError('Você não tem permissão para criar tarefas', error);
                } else {
                    throw new DatabaseError('Erro ao salvar tarefa no banco de dados', error);
                }
            }

            if (!data) {
                throw new DatabaseError('Nenhum dado retornado após criar a tarefa');
            }

            // 5. Map response to AtlasTask format
            const atlasTask: AtlasTask = {
                id: data.id,
                title: data.title,
                description: data.description || undefined,
                priority: data.priority as AtlasTask['priority'],
                status: data.status as AtlasTask['status'],
                start_date: data.start_date || undefined,
                target_date: data.due_date || undefined,
                created_at: data.created_at,
                updated_at: data.updated_at,
                isOptimistic: false
            };

            return atlasTask;
        } catch (error) {
            // Re-throw custom errors as-is (they already have user-friendly messages)
            if (error instanceof ValidationError ||
                error instanceof AuthenticationError ||
                error instanceof DatabaseError) {
                throw error;
            }

            // Log unexpected errors
            console.error('[atlasService] Unexpected error creating task:', error);

            // Wrap unexpected errors
            throw new DatabaseError(
                'Erro inesperado ao criar tarefa. Tente novamente.',
                error
            );
        }
    },

    /**
     * READ - Get all tasks
     */
    getTasks: async (filters?: {
        archived?: boolean;
        completed?: boolean;
        categoryId?: string;
    }): Promise<AtlasTask[]> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            let query = supabase
                .from('work_items')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters?.archived !== undefined) {
                query = query.eq('archived', filters.archived);
            }

            if (filters?.completed !== undefined) {
                query = query.eq('is_completed', filters.completed);
            }

            if (filters?.categoryId) {
                query = query.eq('category_id', filters.categoryId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[atlasService] Failed to fetch tasks:', error);
                throw new DatabaseError('Erro ao buscar tarefas', error);
            }

            // Map to AtlasTask format
            return (data || []).map(item => ({
                id: item.id,
                title: item.title,
                description: item.description || undefined,
                priority: item.priority as AtlasTask['priority'],
                status: item.status as AtlasTask['status'],
                start_date: item.start_date || undefined,
                target_date: item.due_date || undefined,
                created_at: item.created_at,
                updated_at: item.updated_at,
                isOptimistic: false
            }));
        } catch (error) {
            if (error instanceof AuthenticationError || error instanceof DatabaseError) {
                throw error;
            }
            console.error('[atlasService] Unexpected error fetching tasks:', error);
            throw new DatabaseError('Erro inesperado ao buscar tarefas', error);
        }
    },

    /**
     * UPDATE - Update existing task
     */
    updateTask: async (taskId: string, updates: Partial<TaskInput>): Promise<AtlasTask> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            // Validate updates
            if (updates.title !== undefined && updates.title.trim().length === 0) {
                throw new ValidationError('O título não pode ser vazio');
            }

            // Map updates to database schema
            const updateData: any = {};

            if (updates.title !== undefined) updateData.title = updates.title;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.priority !== undefined) updateData.priority = updates.priority;
            if (updates.target_date !== undefined) updateData.due_date = updates.target_date;

            const { data, error } = await supabase
                .from('work_items')
                .update(updateData)
                .eq('id', taskId)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) {
                console.error('[atlasService] Failed to update task:', error);
                throw new DatabaseError('Erro ao atualizar tarefa', error);
            }

            if (!data) {
                throw new DatabaseError('Tarefa não encontrada');
            }

            return {
                id: data.id,
                title: data.title,
                description: data.description || undefined,
                priority: data.priority as AtlasTask['priority'],
                status: data.status as AtlasTask['status'],
                start_date: data.start_date || undefined,
                target_date: data.due_date || undefined,
                created_at: data.created_at,
                updated_at: data.updated_at,
                isOptimistic: false
            };
        } catch (error) {
            if (error instanceof ValidationError ||
                error instanceof AuthenticationError ||
                error instanceof DatabaseError) {
                throw error;
            }
            console.error('[atlasService] Unexpected error updating task:', error);
            throw new DatabaseError('Erro inesperado ao atualizar tarefa', error);
        }
    },

    /**
     * DELETE - Remove task
     */
    deleteTask: async (taskId: string): Promise<void> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            const { error } = await supabase
                .from('work_items')
                .delete()
                .eq('id', taskId)
                .eq('user_id', user.id);

            if (error) {
                console.error('[atlasService] Failed to delete task:', error);
                throw new DatabaseError('Erro ao deletar tarefa', error);
            }
        } catch (error) {
            if (error instanceof AuthenticationError || error instanceof DatabaseError) {
                throw error;
            }
            console.error('[atlasService] Unexpected error deleting task:', error);
            throw new DatabaseError('Erro inesperado ao deletar tarefa', error);
        }
    },

    /**
     * Toggle task completion status
     */
    toggleTaskCompletion: async (taskId: string): Promise<AtlasTask> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            // First, get current state
            const { data: currentTask, error: fetchError } = await supabase
                .from('work_items')
                .select('is_completed')
                .eq('id', taskId)
                .eq('user_id', user.id)
                .single();

            if (fetchError || !currentTask) {
                throw new DatabaseError('Tarefa não encontrada', fetchError);
            }

            // Toggle completion
            const newCompletionState = !currentTask.is_completed;

            const { data, error } = await supabase
                .from('work_items')
                .update({
                    is_completed: newCompletionState,
                    status: newCompletionState ? 'completed' : 'todo'
                })
                .eq('id', taskId)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) {
                console.error('[atlasService] Failed to toggle task completion:', error);
                throw new DatabaseError('Erro ao atualizar status da tarefa', error);
            }

            if (!data) {
                throw new DatabaseError('Nenhum dado retornado após atualização');
            }

            return {
                id: data.id,
                title: data.title,
                description: data.description || undefined,
                priority: data.priority as AtlasTask['priority'],
                status: data.status as AtlasTask['status'],
                start_date: data.start_date || undefined,
                target_date: data.due_date || undefined,
                created_at: data.created_at,
                updated_at: data.updated_at,
                isOptimistic: false
            };
        } catch (error) {
            if (error instanceof AuthenticationError || error instanceof DatabaseError) {
                throw error;
            }
            console.error('[atlasService] Unexpected error toggling task:', error);
            throw new DatabaseError('Erro inesperado ao alternar tarefa', error);
        }
    },

    /**
     * Get categories
     */
    getCategories: async (): Promise<Array<{
        id: string;
        name: string;
        color: string;
        icon?: string;
        is_system: boolean;
    }>> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            const { data, error } = await supabase
                .from('task_categories')
                .select('*')
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            if (error) {
                console.error('[atlasService] Failed to fetch categories:', error);
                throw new DatabaseError('Erro ao buscar categorias', error);
            }

            return data || [];
        } catch (error) {
            if (error instanceof AuthenticationError || error instanceof DatabaseError) {
                throw error;
            }
            console.error('[atlasService] Unexpected error fetching categories:', error);
            throw new DatabaseError('Erro inesperado ao buscar categorias', error);
        }
    }
};
