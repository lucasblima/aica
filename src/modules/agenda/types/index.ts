import type { Task, Quadrant } from '@/types';

export type AgendaMode = 'agenda' | 'list' | 'kanban' | 'matrix' | 'calendar';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time?: string | null;
  all_day: boolean;
  timezone: string;
  recurrence_rule?: string | null;
  source: 'manual' | 'google' | 'apple' | 'outlook' | 'flux' | 'finance' | 'studio';
  external_id?: string | null;
  external_url?: string | null;
  sync_status: 'synced' | 'pending' | 'conflict';
  last_synced_at?: string | null;
  color?: string | null;
  category?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  source: string;
  sourceId: string;
  color?: string;
  icon?: string;
  isReadOnly?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TimeBlock {
  taskId: string;
  scheduledTime: string;
  duration: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type { Task, Quadrant };
