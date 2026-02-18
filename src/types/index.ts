/**
 * Core application types
 */

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  is_urgent: boolean;
  is_important: boolean;
  due_date?: string | null;
  scheduled_time?: string | null;
  estimated_duration?: number | null;
  archived: boolean;
  created_at: string;
  updated_at?: string;
  parent_task_id?: string | null;
  task_type?: 'task' | 'list' | 'event';
  checklist?: Array<{ text: string; done: boolean }> | null;
}

export type Quadrant = 'urgent-important' | 'important' | 'urgent' | 'low';
