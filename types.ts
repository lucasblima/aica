
export interface User {
  id: string;
  name: string;
  role: string;
  phone: string;
  avatar_url?: string;
  email?: string;
}

// B2B Entities based on SQL Schema

export interface Association {
  id: string;
  name: string;
  cnpj?: string;
  isActive: boolean;
  planeSyncStatus: 'synced' | 'pending' | 'failed';
  membersCount: number;
}

export interface AssociationDetail {
  id: string;
  name: string;
  cnpj: string;
  workspaceSlug: string;
  membersCount: number;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSync: string;
  healthScore: number; // 0-100
  projectsCount: number;
}

export interface MetricCard {
  label: string;
  value: string | number;
  trend?: number; // percentage
  trendDirection?: 'up' | 'down' | 'neutral';
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  iconName: string;
}

export interface WorkItemB2B {
  id: string;
  title: string;
  associationName: string;
  state: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string; // ISO Date
  assigneeName?: string;
  isOverdue: boolean;
  syncStatus: 'synced' | 'failed';
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string; // e.g., "moveu tarefa", "criou ciclo"
  target: string;
  timestamp: string; // "2 min ago"
  type: 'success' | 'info' | 'warning';
}

export interface SystemHealth {
  syncSuccessRate: number; // 0-100
  failedSyncs: number;
  activeWebhooks: number;
}

export type ViewState = 'vida' | 'agenda';
