import { useState, useMemo, useCallback } from 'react';
import type { Task } from '@/types';

export type TaskStatusFilter = 'all' | 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriorityFilter = 'all' | 'urgent-important' | 'important' | 'urgent' | 'low';
export type TaskSortBy = 'created_at' | 'due_date' | 'priority' | 'title';

export interface TaskFilters {
  status: TaskStatusFilter;
  priority: TaskPriorityFilter;
  tags: string[];
  searchQuery: string;
  sortBy: TaskSortBy;
}

const DEFAULT_FILTERS: TaskFilters = {
  status: 'all',
  priority: 'all',
  tags: [],
  searchQuery: '',
  sortBy: 'created_at',
};

export function useTaskFilters(tasks: Task[]) {
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);

  const setStatus = useCallback((status: TaskStatusFilter) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const setPriority = useCallback((priority: TaskPriorityFilter) => {
    setFilters(prev => ({ ...prev, priority }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, []);

  const setSortBy = useCallback((sortBy: TaskSortBy) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Extract all unique tags from tasks
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => {
      task.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [tasks]);

  // Compute counts per status
  const taskCounts = useMemo(() => {
    const counts = { all: tasks.length, todo: 0, in_progress: 0, completed: 0, cancelled: 0 };
    tasks.forEach(task => {
      const status = task.status || 'todo';
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [tasks]);

  // Filter + sort
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(t => {
        const status = t.status || 'todo';
        return status === filters.status;
      });
    }

    // Priority filter
    if (filters.priority !== 'all') {
      result = result.filter(t => {
        if (filters.priority === 'urgent-important') return t.is_urgent && t.is_important;
        if (filters.priority === 'important') return !t.is_urgent && t.is_important;
        if (filters.priority === 'urgent') return t.is_urgent && !t.is_important;
        return !t.is_urgent && !t.is_important; // 'low'
      });
    }

    // Tag filter
    if (filters.tags.length > 0) {
      result = result.filter(t =>
        filters.tags.some(tag => t.tags?.includes(tag))
      );
    }

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'due_date':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        case 'priority': {
          const priorityOrder = (t: Task) => {
            if (t.is_urgent && t.is_important) return 0;
            if (!t.is_urgent && t.is_important) return 1;
            if (t.is_urgent && !t.is_important) return 2;
            return 3;
          };
          return priorityOrder(a) - priorityOrder(b);
        }
        case 'title':
          return a.title.localeCompare(b.title, 'pt-BR');
        case 'created_at':
        default:
          return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });

    return result;
  }, [tasks, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.priority !== 'all') count++;
    if (filters.tags.length > 0) count++;
    if (filters.searchQuery.trim()) count++;
    if (filters.sortBy !== 'created_at') count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredTasks,
    availableTags,
    taskCounts,
    activeFilterCount,
    setStatus,
    setPriority,
    setSearchQuery,
    setSortBy,
    toggleTag,
    clearFilters,
  };
}
