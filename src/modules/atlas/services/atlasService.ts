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
 * Atlas Service - Task Management
 *
 * TEMPORARY IMPLEMENTATION:
 * Creates tasks directly in Supabase (work_items table) instead of going through n8n/Plane.
 * This bypasses the external integration temporarily to ensure the UI works.
 *
 * TODO: Re-enable n8n/Plane integration once webhook is configured properly.
 */
export const atlasService = {
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

            // 2. Map Atlas TaskInput to Supabase work_items schema
            const workItemData = {
                title: taskInput.title,
                description: taskInput.description || null,
                priority: taskInput.priority || 'medium',
                // Map priority to quadrant (following AgendaView.tsx logic)
                priority_quadrant: mapPriorityToQuadrant(taskInput.priority),
                due_date: taskInput.target_date || null,
                estimated_duration: null, // Can be enhanced later
                scheduled_time: null,
                completed_at: null,
                archived: false,
                created_by: user.id,
                // Association & state are optional for quick-add
                association_id: null,
                module_id: null,
                state_id: null
            };

            // 3. Insert into Supabase
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

            // 4. Map response to AtlasTask format
            const atlasTask: AtlasTask = {
                id: data.id,
                title: data.title,
                description: data.description || undefined,
                priority: data.priority as AtlasTask['priority'],
                status: 'todo', // Default status for new tasks
                start_date: undefined,
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
    }
};

/**
 * Maps Atlas priority to Eisenhower Matrix quadrant
 * Based on AgendaView.tsx:66-69 logic
 */
function mapPriorityToQuadrant(priority: TaskInput['priority']): 'urgent-important' | 'important' | 'urgent' | 'low' {
    switch (priority) {
        case 'urgent':
            return 'urgent';
        case 'high':
            return 'important';
        case 'medium':
            return 'urgent-important';
        case 'low':
        case 'none':
        default:
            return 'low';
    }
}
