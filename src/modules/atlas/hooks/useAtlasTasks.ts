import { useState, useCallback } from 'react';
import { AtlasTask, TaskInput } from '../types/plane';
import { atlasService, ValidationError, AuthenticationError, DatabaseError } from '../services/atlasService';
import { notificationService } from '../../../services/notificationService';

export const useAtlasTasks = (initialTasks: AtlasTask[] = []) => {
    const [tasks, setTasks] = useState<AtlasTask[]>(initialTasks);
    const [isSyncing, setIsSyncing] = useState(false);

    const addTask = useCallback(async (input: TaskInput) => {
        // 1. Optimistic Update: Create a temporary task immediately
        const tempId = `temp_${Date.now()}`;
        const optimisticTask: AtlasTask = {
            ...input,
            id: tempId,
            isOptimistic: true,
        };

        // Add to UI immediately ("Zero Latency Feel")
        setTasks((prev) => [optimisticTask, ...prev]);
        setIsSyncing(true);

        try {
            // 2. Async Sync: Create task in Supabase
            const realTask = await atlasService.createTask(input);

            // 3. Reconcile: Replace temp task with real task from server
            setTasks((prev) =>
                prev.map((t) => (t.id === tempId ? { ...realTask, isOptimistic: false } : t))
            );

            // 4. Show success notification
            notificationService.showSuccess(
                'Tarefa criada!',
                `"${realTask.title}" foi adicionada com sucesso.`
            );
        } catch (error) {
            // 4. Rollback: Remove the optimistic task if sync fails
            console.error('[useAtlasTasks] Failed to create task:', error);
            setTasks((prev) => prev.filter((t) => t.id !== tempId));

            // 5. Show error notification with specific message
            if (error instanceof ValidationError) {
                notificationService.showError('Erro de validação', error.message);
            } else if (error instanceof AuthenticationError) {
                notificationService.showError('Erro de autenticação', error.message);
            } else if (error instanceof DatabaseError) {
                notificationService.showError('Erro ao salvar', error.message);
            } else {
                notificationService.showError(
                    'Erro inesperado',
                    'Não foi possível criar a tarefa. Tente novamente.'
                );
            }
        } finally {
            setIsSyncing(false);
        }
    }, []);

    return {
        tasks,
        setTasks, // Exposed for initial loading
        addTask,
        isSyncing
    };
};
