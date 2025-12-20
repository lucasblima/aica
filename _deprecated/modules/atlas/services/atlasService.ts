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
            const workItemData: any = {
                user_id: user.id, // CRITICAL: Must include user_id for RLS policies
                title: taskInput.title,
                description: taskInput.description || null,
                priority: taskInput.priority || 'medium',
                due_date: taskInput.target_date || null,
                archived: false,
                is_completed: false,
                // Eisenhower Matrix dimensions
                is_urgent: taskInput.is_urgent ?? false,
                is_important: taskInput.is_important ?? false
                // Note: status column exists in DB but Supabase cache may not be updated
                // Default value 'todo' will be set by DB
                // Note: priority_quadrant is computed automatically by database trigger
            };

            // Add connection references if provided
            if (taskInput.connection_space_id) {
                workItemData.connection_space_id = taskInput.connection_space_id;
            }
            if (taskInput.habitat_property_id) {
                workItemData.habitat_property_id = taskInput.habitat_property_id;
            }
            if (taskInput.ventures_entity_id) {
                workItemData.ventures_entity_id = taskInput.ventures_entity_id;
            }
            if (taskInput.academia_journey_id) {
                workItemData.academia_journey_id = taskInput.academia_journey_id;
            }
            if (taskInput.tribo_ritual_id) {
                workItemData.tribo_ritual_id = taskInput.tribo_ritual_id;
            }

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
                // Eisenhower Matrix fields
                is_urgent: data.is_urgent ?? false,
                is_important: data.is_important ?? false,
                priority_quadrant: data.priority_quadrant as AtlasTask['priority_quadrant'],
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
        connection_space_id?: string; // NEW: Filter by connection space
    }): Promise<AtlasTask[]> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            // Build select clause with optional JOIN for connection space name
            const selectClause = filters?.connection_space_id
                ? 'work_items.*, connection_spaces!connection_space_id(name)'
                : '*';

            let query = supabase
                .from('work_items')
                .select(selectClause)
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

            if (filters?.connection_space_id) {
                query = query.eq('connection_space_id', filters.connection_space_id);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[atlasService] Failed to fetch tasks:', error);
                throw new DatabaseError('Erro ao buscar tarefas', error);
            }

            // Map to AtlasTask format
            return (data || []).map((item: any) => ({
                id: item.id,
                title: item.title,
                description: item.description || undefined,
                priority: item.priority as AtlasTask['priority'],
                status: item.status as AtlasTask['status'],
                start_date: item.start_date || undefined,
                target_date: item.due_date || undefined,
                created_at: item.created_at,
                updated_at: item.updated_at,
                // Eisenhower Matrix fields
                is_urgent: item.is_urgent ?? false,
                is_important: item.is_important ?? false,
                priority_quadrant: item.priority_quadrant as AtlasTask['priority_quadrant'],
                // Connection fields
                connection_space_id: item.connection_space_id || undefined,
                habitat_property_id: item.habitat_property_id || undefined,
                ventures_entity_id: item.ventures_entity_id || undefined,
                academia_journey_id: item.academia_journey_id || undefined,
                tribo_ritual_id: item.tribo_ritual_id || undefined,
                // Connection space name from JOIN (if filtered by connection)
                connection_space_name: item.connection_spaces?.name || undefined,
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

            // Eisenhower Matrix dimension updates
            if (updates.is_urgent !== undefined) updateData.is_urgent = updates.is_urgent;
            if (updates.is_important !== undefined) updateData.is_important = updates.is_important;
            // Note: priority_quadrant will be auto-updated by database trigger

            // Add connection reference updates
            if (updates.connection_space_id !== undefined) {
                updateData.connection_space_id = updates.connection_space_id;
            }
            if (updates.habitat_property_id !== undefined) {
                updateData.habitat_property_id = updates.habitat_property_id;
            }
            if (updates.ventures_entity_id !== undefined) {
                updateData.ventures_entity_id = updates.ventures_entity_id;
            }
            if (updates.academia_journey_id !== undefined) {
                updateData.academia_journey_id = updates.academia_journey_id;
            }
            if (updates.tribo_ritual_id !== undefined) {
                updateData.tribo_ritual_id = updates.tribo_ritual_id;
            }

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
                // Eisenhower Matrix fields
                is_urgent: data.is_urgent ?? false,
                is_important: data.is_important ?? false,
                priority_quadrant: data.priority_quadrant as AtlasTask['priority_quadrant'],
                // Connection fields
                connection_space_id: data.connection_space_id || undefined,
                habitat_property_id: data.habitat_property_id || undefined,
                ventures_entity_id: data.ventures_entity_id || undefined,
                academia_journey_id: data.academia_journey_id || undefined,
                tribo_ritual_id: data.tribo_ritual_id || undefined,
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
     * Syncs is_completed flag with status field and sets completed_at timestamp
     * CRITICAL FIX: Updates BOTH is_completed AND status to maintain data consistency
     */
    toggleTaskCompletion: async (taskId: string): Promise<AtlasTask> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            // First, get current state - SELECT BOTH is_completed and status
            const { data: currentTask, error: fetchError } = await supabase
                .from('work_items')
                .select('is_completed, status')
                .eq('id', taskId)
                .eq('user_id', user.id)
                .single();

            if (fetchError || !currentTask) {
                throw new DatabaseError('Tarefa não encontrada', fetchError);
            }

            // Toggle completion state
            const newCompletionState = !currentTask.is_completed;

            // CRITICAL: Sync status with completion state to fix desincronização
            const newStatus = newCompletionState ? 'completed' : 'todo';

            // Prepare update payload with BOTH fields synced
            const updatePayload: any = {
                is_completed: newCompletionState,
                status: newStatus // THIS FIX ensures status stays in sync
            };

            // Set completed_at timestamp when completing
            if (newCompletionState) {
                updatePayload.completed_at = new Date().toISOString();
            } else {
                updatePayload.completed_at = null;
            }

            const { data, error } = await supabase
                .from('work_items')
                .update(updatePayload)
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

            console.log('[atlasService] Task completion toggled successfully:', {
                taskId,
                isCompleted: data.is_completed,
                status: data.status,
                completedAt: data.completed_at
            });

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
                // Eisenhower Matrix fields
                is_urgent: data.is_urgent ?? false,
                is_important: data.is_important ?? false,
                priority_quadrant: data.priority_quadrant as AtlasTask['priority_quadrant'],
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
     * Move task to specific Eisenhower Matrix quadrant
     * Updates is_urgent and is_important based on quadrant
     * Database trigger will auto-compute priority_quadrant
     */
    moveTaskToQuadrant: async (taskId: string, quadrant: 'urgent-important' | 'important' | 'urgent' | 'low'): Promise<AtlasTask> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            // Map quadrant to is_urgent and is_important booleans
            let is_urgent: boolean;
            let is_important: boolean;

            switch (quadrant) {
                case 'urgent-important':
                    is_urgent = true;
                    is_important = true;
                    break;
                case 'important':
                    is_urgent = false;
                    is_important = true;
                    break;
                case 'urgent':
                    is_urgent = true;
                    is_important = false;
                    break;
                case 'low':
                default:
                    is_urgent = false;
                    is_important = false;
                    break;
            }

            const { data, error } = await supabase
                .from('work_items')
                .update({
                    is_urgent,
                    is_important
                    // priority_quadrant will be auto-updated by database trigger
                })
                .eq('id', taskId)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) {
                console.error('[atlasService] Failed to move task to quadrant:', error);
                throw new DatabaseError('Erro ao mover tarefa para quadrante', error);
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
                // Eisenhower Matrix fields
                is_urgent: data.is_urgent ?? false,
                is_important: data.is_important ?? false,
                priority_quadrant: data.priority_quadrant as AtlasTask['priority_quadrant'],
                created_at: data.created_at,
                updated_at: data.updated_at,
                isOptimistic: false
            };
        } catch (error) {
            if (error instanceof AuthenticationError || error instanceof DatabaseError) {
                throw error;
            }
            console.error('[atlasService] Unexpected error moving task to quadrant:', error);
            throw new DatabaseError('Erro inesperado ao mover tarefa', error);
        }
    },

    /**
     * Get categories - Creates default categories if none exist
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

            // If no categories exist, create default ones
            if (!data || data.length === 0) {
                console.log('[atlasService] No categories found, creating defaults...');
                await atlasService.createDefaultCategories();

                // Fetch again after creating
                const { data: newData, error: newError } = await supabase
                    .from('task_categories')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('name', { ascending: true });

                if (newError) {
                    console.error('[atlasService] Failed to fetch categories after creation:', newError);
                    throw new DatabaseError('Erro ao buscar categorias', newError);
                }

                return newData || [];
            }

            return data || [];
        } catch (error) {
            if (error instanceof AuthenticationError || error instanceof DatabaseError) {
                throw error;
            }
            console.error('[atlasService] Unexpected error fetching categories:', error);
            throw new DatabaseError('Erro inesperado ao buscar categorias', error);
        }
    },

    /**
     * Create default categories for current user
     */
    createDefaultCategories: async (): Promise<void> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                throw new AuthenticationError('Você precisa estar autenticado');
            }

            const defaultCategories = [
                { name: 'Pessoal', color: '#3B82F6', icon: '👤' },
                { name: 'Trabalho', color: '#10B981', icon: '💼' },
                { name: 'Saúde', color: '#EF4444', icon: '❤️' },
                { name: 'Educação', color: '#8B5CF6', icon: '📚' },
                { name: 'Finanças', color: '#F59E0B', icon: '💰' },
                { name: 'Casa', color: '#06B6D4', icon: '🏠' }
            ];

            const categoriesToInsert = defaultCategories.map(cat => ({
                user_id: user.id,
                name: cat.name,
                color: cat.color,
                icon: cat.icon,
                is_system: true
            }));

            const { error } = await supabase
                .from('task_categories')
                .insert(categoriesToInsert);

            if (error) {
                console.error('[atlasService] Failed to create default categories:', error);
                throw new DatabaseError('Erro ao criar categorias padrão', error);
            }

            console.log('[atlasService] Default categories created successfully');
        } catch (error) {
            if (error instanceof AuthenticationError || error instanceof DatabaseError) {
                throw error;
            }
            console.error('[atlasService] Unexpected error creating default categories:', error);
            throw new DatabaseError('Erro inesperado ao criar categorias', error);
        }
    }
};
