import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { atlasService } from '../services/atlasService';
import { TaskInput, AtlasTask } from '../types/plane';

/**
 * Hook options for filtering connection tasks
 */
export interface UseConnectionTasksOptions {
  /** Filter by connection space ID */
  spaceId?: string;
  /** Filter by archetype-specific entity */
  archetypeRef?: {
    type: 'habitat' | 'ventures' | 'academia' | 'tribo';
    entityId: string;
  };
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to fetch tasks linked to a specific connection space or archetype entity
 * 
 * @example
 * // Get all tasks for a connection space
 * const { data: tasks, isLoading } = useConnectionTasks({ spaceId: 'space-123' });
 * 
 * @example
 * // Get tasks for a specific Habitat property
 * const { data: tasks } = useConnectionTasks({
 *   spaceId: 'space-123',
 *   archetypeRef: { type: 'habitat', entityId: 'property-456' }
 * });
 */
export function useConnectionTasks(options: UseConnectionTasksOptions) {
  const { spaceId, archetypeRef, enabled = true } = options;

  return useQuery({
    queryKey: ['connection-tasks', spaceId, archetypeRef?.type, archetypeRef?.entityId],
    queryFn: async () => {
      // Fetch tasks filtered by connection space
      const tasks = await atlasService.getTasks({
        connection_space_id: spaceId,
      });

      // Further filter by archetype-specific entity if provided
      if (archetypeRef) {
        return tasks.filter(task => {
          switch (archetypeRef.type) {
            case 'habitat':
              return task.habitat_property_id === archetypeRef.entityId;
            case 'ventures':
              return task.ventures_entity_id === archetypeRef.entityId;
            case 'academia':
              return task.academia_journey_id === archetypeRef.entityId;
            case 'tribo':
              return task.tribo_ritual_id === archetypeRef.entityId;
            default:
              return false;
          }
        });
      }

      return tasks;
    },
    enabled: enabled && !!spaceId,
  });
}

/**
 * Hook to create a task linked to a connection space
 */
export function useCreateConnectionTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskInput: TaskInput) => atlasService.createTask(taskInput),
    onSuccess: (data) => {
      // Invalidate all connection task queries
      queryClient.invalidateQueries({ queryKey: ['connection-tasks'] });
      
      // Also invalidate general tasks if this affects them
      if (data.connection_space_id) {
        queryClient.invalidateQueries({
          queryKey: ['connection-tasks', data.connection_space_id],
        });
      }
    },
  });
}

/**
 * Hook to update a task's connection references
 */
export function useUpdateConnectionTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<TaskInput>;
    }) => atlasService.updateTask(taskId, updates),
    onSuccess: (data) => {
      // Invalidate all connection task queries
      queryClient.invalidateQueries({ queryKey: ['connection-tasks'] });

      // Invalidate specific space queries
      if (data.connection_space_id) {
        queryClient.invalidateQueries({
          queryKey: ['connection-tasks', data.connection_space_id],
        });
      }
    },
  });
}

/**
 * Hook to get tasks for a specific Habitat property
 */
export function useHabitatPropertyTasks(spaceId: string, propertyId: string) {
  return useConnectionTasks({
    spaceId,
    archetypeRef: { type: 'habitat', entityId: propertyId },
  });
}

/**
 * Hook to get tasks for a specific Ventures entity
 */
export function useVenturesEntityTasks(spaceId: string, entityId: string) {
  return useConnectionTasks({
    spaceId,
    archetypeRef: { type: 'ventures', entityId },
  });
}

/**
 * Hook to get tasks for a specific Academia journey
 */
export function useAcademiaJourneyTasks(spaceId: string, journeyId: string) {
  return useConnectionTasks({
    spaceId,
    archetypeRef: { type: 'academia', entityId: journeyId },
  });
}

/**
 * Hook to get tasks for a specific Tribo ritual
 */
export function useTriboRitualTasks(spaceId: string, ritualId: string) {
  return useConnectionTasks({
    spaceId,
    archetypeRef: { type: 'tribo', entityId: ritualId },
  });
}
