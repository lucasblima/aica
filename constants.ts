
import { User, WorkItem, Category, Connection } from './types';

export const MOCK_DB = {
  user: {
    id: 'u-cristiano-001',
    name: 'Cristiano',
    role: 'Gestor da Vida',
    phone: '12345',
    credits_balance: 2450,
    user_status: 'connected',
  } as User,

  categories: [
    {
      id: 'cat-finance',
      name: 'Finanças',
      type: 'finance',
      colorBg: 'bg-emerald-500',
      colorText: 'text-emerald-600',
      iconName: 'Wallet',
      description: 'Contas'
    },
    {
      id: 'cat-health',
      name: 'Saúde',
      type: 'health',
      colorBg: 'bg-orange-500',
      colorText: 'text-orange-600',
      iconName: 'Heart',
      description: 'Corpo'
    },
    {
      id: 'cat-work',
      name: 'Associações',
      type: 'work',
      colorBg: 'bg-blue-600',
      colorText: 'text-blue-600',
      iconName: 'Building2',
      description: 'Projetos'
    },
    {
      id: 'cat-education',
      name: 'Educação',
      type: 'education',
      colorBg: 'bg-purple-600',
      colorText: 'text-purple-600',
      iconName: 'BookOpen',
      description: 'Estudos'
    }
  ] as Category[],

  work_items: [
    // MANHÃ
    {
      id: 't-01',
      title: 'Caminhada',
      description: 'Parque',
      categoryId: 'cat-health',
      priority: 'medium',
      isCompleted: true,
      startTime: '07:00',
      endTime: '08:00',
      durationLabel: '1h'
    },
    {
      id: 't-02',
      title: 'Cloro na Caixa D\'água',
      description: 'Manutenção casa',
      categoryId: 'cat-health', 
      priority: 'urgent',
      isCompleted: false,
      startTime: '09:00',
      endTime: '10:00',
      durationLabel: '1h'
    },

    // ALMOÇO/MEIO DIA - FINANCEIRO
    {
      id: 't-07',
      title: 'Pagar Internet',
      description: 'Vencimento hoje',
      categoryId: 'cat-finance',
      priority: 'urgent',
      isCompleted: true,
      startTime: '12:00',
      endTime: '12:30',
      durationLabel: '30min'
    },

    // TARDE - TRABALHO
    {
      id: 't-03',
      title: 'Reunião Diretoria',
      description: 'AMAGAPA',
      categoryId: 'cat-work',
      priority: 'high',
      isCompleted: false,
      startTime: '14:00',
      endTime: '15:30',
      durationLabel: '1h 30min'
    },
    {
      id: 't-04',
      title: 'Vistoria Rua Zola',
      description: 'Verificar limpeza',
      categoryId: 'cat-work',
      priority: 'medium',
      isCompleted: false,
      startTime: '16:00',
      endTime: '17:00',
      durationLabel: '1h'
    },

    // NOITE - EDUCAÇÃO & SAÚDE
    {
      id: 't-05',
      title: 'Aula Inglês',
      description: 'Verbo To Be',
      categoryId: 'cat-education',
      priority: 'high',
      isCompleted: false,
      startTime: '18:00',
      endTime: '19:00',
      durationLabel: '1h'
    },
    {
      id: 't-06',
      title: 'Krav Maga',
      description: 'Treino Mestre Carlos',
      categoryId: 'cat-health',
      priority: 'urgent',
      isCompleted: false,
      startTime: '19:30',
      endTime: '21:00',
      durationLabel: '1h 30min'
    },
  ] as WorkItem[],

  connections: [] as Connection[]
};
