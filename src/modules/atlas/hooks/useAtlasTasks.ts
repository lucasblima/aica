import { useState, useCallback } from 'react';
import { AtlasTask, PlaneTaskInput } from '../types/plane';
import { atlasService } from '../services/atlasService';

export const useAtlasTasks = (initialTasks: AtlasTask[] = []) => {
    const [tasks, setTasks] = useState<AtlasTask[]>(initialTasks);
    const [isSyncing, setIsSyncing] = useState(false);

    const addTask = useCallback(async (input: PlaneTaskInput) => {
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
            // 2. Async Sync: Send to n8n for processing
            const realTask = await atlasService.createTask(input);

            // 3. Reconcile: Replace temp task with real task from server
            setTasks((prev) =>
                prev.map((t) => (t.id === tempId ? { ...realTask, isOptimistic: false } : t))
            );
        } catch (error) {
            // 4. Rollback: Remove the optimistic task if sync fails
            console.error('Failed to create task:', error);
            setTasks((prev) => prev.filter((t) => t.id !== tempId));
            // Here you would typically trigger a toast notification
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
