
import { User, Association, WorkItemB2B, ActivityLog, SystemHealth, AssociationDetail } from './types';

export const MOCK_DB = {
  currentUser: {
    id: 'admin-01',
    name: 'Gestor Sênior',
    role: 'Admin do Sistema',
    phone: '0000',
    email: 'gestor@aica.system',
    avatar_url: 'GS'
  } as User,

  // ZONA 1: KPI DATA
  kpi: {
    totalAssociations: 42,
    activeUsers: 158,
    creditsUsed: 14500,
    creditsTotal: 20000,
    activeUsersTrend: 12, // +12%
    assocTrend: 5, // +5%
  },

  systemHealth: {
    syncSuccessRate: 98.5,
    failedSyncs: 3,
    activeWebhooks: 12,
  } as SystemHealth,

  // ZONA 2: ANALYTICS DATA
  workloadDistribution: {
    backlog: 45,
    todo: 32,
    in_progress: 28,
    review: 12,
    done: 156 // Completed this cycle
  },

  priorityDistribution: {
    urgent: 8,
    high: 15,
    medium: 42,
    low: 20
  },

  // DATA FOR ASSOCIATIONS VIEW
  associationsList: [
    {
      id: 'asc-01',
      name: 'Assoc. Moradores Gávea',
      cnpj: '12.345.678/0001-90',
      workspaceSlug: 'amagapa-ws',
      membersCount: 145,
      syncStatus: 'synced',
      lastSync: '2 min atrás',
      healthScore: 98,
      projectsCount: 4
    },
    {
      id: 'asc-02',
      name: 'ONG Pedrinho Social',
      cnpj: '98.765.432/0001-10',
      workspaceSlug: 'pedrinho-social',
      membersCount: 23,
      syncStatus: 'failed',
      lastSync: '4 horas atrás',
      healthScore: 65,
      projectsCount: 2
    },
    {
      id: 'asc-03',
      name: 'Cond. Edifício Solar',
      cnpj: '45.123.789/0001-55',
      workspaceSlug: 'ed-solar',
      membersCount: 89,
      syncStatus: 'synced',
      lastSync: '10 min atrás',
      healthScore: 92,
      projectsCount: 3
    },
    {
      id: 'asc-04',
      name: 'Assoc. Com. Vila Nova',
      cnpj: '33.444.555/0001-22',
      workspaceSlug: 'vila-nova',
      membersCount: 310,
      syncStatus: 'pending',
      lastSync: '1 hora atrás',
      healthScore: 88,
      projectsCount: 6
    },
    {
      id: 'asc-05',
      name: 'Instituto Tech For Good',
      cnpj: '11.222.333/0001-44',
      workspaceSlug: 'tech-good',
      membersCount: 12,
      syncStatus: 'synced',
      lastSync: '5 min atrás',
      healthScore: 100,
      projectsCount: 1
    }
  ] as AssociationDetail[],

  // ZONA 3: RISK RADAR (Exceções)
  riskItems: [
    {
      id: 'wi-102',
      title: 'Renovação Certificado Digital',
      associationName: 'Assoc. Moradores Gávea',
      state: 'todo',
      priority: 'urgent',
      dueDate: '2023-10-24', // Past date
      assigneeName: 'Carlos Fin.',
      isOverdue: true,
      syncStatus: 'synced'
    },
    {
      id: 'wi-105',
      title: 'Sync Falhou: Lote de Faturas',
      associationName: 'ONG Pedrinho',
      state: 'in_progress',
      priority: 'high',
      dueDate: '2023-10-26',
      assigneeName: 'Sistema',
      isOverdue: false,
      syncStatus: 'failed'
    },
    {
      id: 'wi-108',
      title: 'Aprovação de Orçamento Obras',
      associationName: 'Cond. Edifício Solar',
      state: 'review',
      priority: 'urgent',
      dueDate: '2023-10-25',
      assigneeName: 'Ana Síndica',
      isOverdue: true,
      syncStatus: 'synced'
    }
  ] as WorkItemB2B[],

  // ZONA 3: ACTIVITY FEED
  recentActivity: [
    {
      id: 'log-1',
      user: 'João Dev',
      action: 'moveu para Done',
      target: 'API Integration v2',
      timestamp: '2 min atrás',
      type: 'success'
    },
    {
      id: 'log-2',
      user: 'Maria Gestora',
      action: 'criou novo ciclo',
      target: 'Ciclo Outubro/24',
      timestamp: '15 min atrás',
      type: 'info'
    },
    {
      id: 'log-3',
      user: 'Sistema',
      action: 'falha de sincronização',
      target: 'Plane.so Webhook',
      timestamp: '42 min atrás',
      type: 'warning'
    },
    {
      id: 'log-4',
      user: 'Pedro Financeiro',
      action: 'anexou comprovante',
      target: 'Pagamento CEMIG',
      timestamp: '1h atrás',
      type: 'info'
    }
  ] as ActivityLog[]
};
