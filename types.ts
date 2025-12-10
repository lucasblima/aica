
export interface User {
  id: string;
  name: string;
  role: string;
  phone: string;
  avatar_url?: string;
  email?: string;
  birthDate?: string; // ISO Date YYYY-MM-DD
}

export interface LifeEvent {
  id: string;
  title: string;
  description?: string;
  weekNumber: number;
  eventDate?: string;
  type: 'milestone' | 'goal' | 'memory';
  status: 'planned' | 'completed' | 'skipped';
}

// B2B Entities based on SQL Schema

export interface Association {
  id: string;
  name: string;
  cnpj?: string;
  isActive: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
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
  type: 'personal' | 'association' | 'company' | 'network';
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

export type ViewState = 'vida' | 'agenda' | 'association_detail' | 'podcast' | 'finance' | 'finance_agent' | 'journey' | 'grants' | 'ai-cost' | 'file-search-analytics';

export type Quadrant = 'urgent-important' | 'important' | 'urgent' | 'low';

export interface Task {
  id: string;
  title: string;
  due_date?: string;
  priority_quadrant?: Quadrant;
  associations?: { name: string };
  estimated_duration?: number;
  scheduled_time?: string;
  completed_at?: string;
  priority?: string;
}
