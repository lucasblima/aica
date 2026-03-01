/**
 * Demo Data for AICA Landing Page
 *
 * All hardcoded data for interactive landing demos.
 * No auth, no Supabase — pure TypeScript data.
 * All text in Brazilian Portuguese.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface HeroDashboard {
  tasksToday: number;
  balance: number;
  streakDays: number;
  cpPoints: number;
  momentsCount: number;
  nextEvent: {
    title: string;
    time: string;
    type: 'meeting' | 'task' | 'personal';
  };
  insight: string;
}

export interface AtlasTask {
  id: string;
  title: string;
  quadrant: 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important';
  completed: boolean;
  dueTime?: string;
}

export interface JourneyDay {
  day: number;
  intensity: 0 | 1 | 2 | 3;
  emoji: string;
}

export interface EmotionSummary {
  emotion: string;
  count: number;
  color: string;
}

export interface JourneyDemo {
  heatmap: JourneyDay[];
  emotions: EmotionSummary[];
}

export interface StudioPhase {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'pending';
  icon: string;
}

export interface StudioDemo {
  episodeTitle: string;
  guestName: string;
  phases: StudioPhase[];
}

export interface GrantBreakdownItem {
  label: string;
  score: number;
}

export interface GrantsDemo {
  title: string;
  deadline: string;
  matchScore: number;
  breakdown: GrantBreakdownItem[];
  value: string;
  duration: string;
}

export interface FinanceMonth {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface FinanceDemo {
  months: FinanceMonth[];
  burnRate: number;
}

export interface ConnectionNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  avatar: string;
}

export interface ConnectionLink {
  source: string;
  target: string;
}

export interface ConnectionsDemo {
  contacts: ConnectionNode[];
  links: ConnectionLink[];
  spaces: string[];
}

export interface FluxExercise {
  name: string;
  sets: number;
  reps: string;
}

export interface FluxBlock {
  day: string;
  dayLabel: string;
  modality: string;
  color: string;
  exercises: FluxExercise[];
}

export interface AgendaEvent {
  id: string;
  day: string;
  title: string;
  color: string;
  time: string;
}

export interface TelegramCommand {
  command: string;
  description: string;
  userMessage: string;
  botResponse: string;
}

// ─── Data ────────────────────────────────────────────────────────────

export const heroDashboard: HeroDashboard = {
  tasksToday: 3,
  balance: 2400,
  streakDays: 47,
  cpPoints: 1240,
  momentsCount: 156,
  nextEvent: {
    title: 'Reuniao de alinhamento',
    time: '14:00',
    type: 'meeting',
  },
  insight:
    'Seu padrao de foco e mais forte pela manha — 73% das tarefas concluidas antes das 12h.',
};

export const atlasDemo: AtlasTask[] = [
  {
    id: 'at-1',
    title: 'Revisar proposta do cliente Nexus',
    quadrant: 'urgent-important',
    completed: false,
    dueTime: '10:00',
  },
  {
    id: 'at-2',
    title: 'Preparar apresentacao de resultados Q1',
    quadrant: 'urgent-important',
    completed: true,
    dueTime: '14:00',
  },
  {
    id: 'at-3',
    title: 'Estudar framework de automacao',
    quadrant: 'not-urgent-important',
    completed: false,
  },
  {
    id: 'at-4',
    title: 'Responder emails pendentes',
    quadrant: 'urgent-not-important',
    completed: false,
    dueTime: '16:00',
  },
  {
    id: 'at-5',
    title: 'Organizar pasta de downloads',
    quadrant: 'not-urgent-not-important',
    completed: false,
  },
];

export const journeyDemo: JourneyDemo = {
  heatmap: [
    { day: 1, intensity: 2, emoji: '😊' },
    { day: 2, intensity: 3, emoji: '🔥' },
    { day: 3, intensity: 1, emoji: '😐' },
    { day: 4, intensity: 2, emoji: '💡' },
    { day: 5, intensity: 3, emoji: '🚀' },
    { day: 6, intensity: 2, emoji: '😊' },
    { day: 7, intensity: 0, emoji: '😴' },
    { day: 8, intensity: 1, emoji: '🌧️' },
    { day: 9, intensity: 2, emoji: '💪' },
    { day: 10, intensity: 3, emoji: '🎯' },
    { day: 11, intensity: 2, emoji: '😊' },
    { day: 12, intensity: 1, emoji: '😐' },
    { day: 13, intensity: 2, emoji: '💡' },
    { day: 14, intensity: 3, emoji: '🔥' },
    { day: 15, intensity: 0, emoji: '😴' },
    { day: 16, intensity: 1, emoji: '🌱' },
    { day: 17, intensity: 2, emoji: '📝' },
    { day: 18, intensity: 3, emoji: '🎉' },
    { day: 19, intensity: 2, emoji: '😊' },
    { day: 20, intensity: 1, emoji: '🤔' },
    { day: 21, intensity: 3, emoji: '🏆' },
    { day: 22, intensity: 2, emoji: '💪' },
    { day: 23, intensity: 2, emoji: '🎯' },
    { day: 24, intensity: 1, emoji: '📚' },
    { day: 25, intensity: 3, emoji: '🔥' },
    { day: 26, intensity: 2, emoji: '😊' },
    { day: 27, intensity: 3, emoji: '🚀' },
    { day: 28, intensity: 2, emoji: '✨' },
  ],
  emotions: [
    { emotion: 'Motivacao', count: 42, color: '#f59e0b' },
    { emotion: 'Gratidao', count: 38, color: '#10b981' },
    { emotion: 'Foco', count: 31, color: '#3b82f6' },
    { emotion: 'Ansiedade', count: 12, color: '#ef4444' },
    { emotion: 'Tranquilidade', count: 27, color: '#8b5cf6' },
  ],
};

export const studioDemo: StudioDemo = {
  episodeTitle: 'O Futuro da IA no Brasil',
  guestName: 'Dra. Marina Costa',
  phases: [
    { id: 'st-1', label: 'Pesquisa', status: 'completed', icon: '🔍' },
    { id: 'st-2', label: 'Roteiro', status: 'completed', icon: '📝' },
    { id: 'st-3', label: 'Gravacao', status: 'active', icon: '🎙️' },
    { id: 'st-4', label: 'Edicao', status: 'pending', icon: '✂️' },
    { id: 'st-5', label: 'Publicacao', status: 'pending', icon: '📡' },
  ],
};

export const grantsDemo: GrantsDemo = {
  title: 'Edital FAPESP — Pesquisa Inovadora em IA 2026',
  deadline: '2026-04-15',
  matchScore: 87,
  breakdown: [
    { label: 'Area de atuacao', score: 95 },
    { label: 'Requisitos academicos', score: 88 },
    { label: 'Orcamento compativel', score: 82 },
    { label: 'Experiencia previa', score: 79 },
    { label: 'Alinhamento tematico', score: 91 },
  ],
  value: 'R$ 180.000,00',
  duration: '24 meses',
};

export const financeDemo: FinanceDemo = {
  months: [
    { month: 'Jan', income: 8500, expense: 6100, balance: 2400 },
    { month: 'Fev', income: 9200, expense: 6800, balance: 2400 },
    { month: 'Mar', income: 8800, expense: 7100, balance: 1700 },
  ],
  burnRate: 6667,
};

export const connectionsDemo: ConnectionsDemo = {
  contacts: [
    { id: 'cn-1', name: 'Carlos Mendes', role: 'Mentor', x: 50, y: 20, avatar: 'CM' },
    { id: 'cn-2', name: 'Ana Ribeiro', role: 'Colega', x: 25, y: 45, avatar: 'AR' },
    { id: 'cn-3', name: 'Pedro Santos', role: 'Cliente', x: 75, y: 40, avatar: 'PS' },
    { id: 'cn-4', name: 'Julia Ferreira', role: 'Parceira', x: 40, y: 70, avatar: 'JF' },
    { id: 'cn-5', name: 'Rafael Lima', role: 'Amigo', x: 65, y: 75, avatar: 'RL' },
    { id: 'cn-6', name: 'Beatriz Alves', role: 'Orientadora', x: 15, y: 25, avatar: 'BA' },
  ],
  links: [
    { source: 'cn-1', target: 'cn-2' },
    { source: 'cn-1', target: 'cn-6' },
    { source: 'cn-2', target: 'cn-4' },
    { source: 'cn-3', target: 'cn-5' },
    { source: 'cn-4', target: 'cn-5' },
    { source: 'cn-6', target: 'cn-2' },
  ],
  spaces: ['Trabalho', 'Academia', 'Familia', 'Projetos'],
};

export const fluxDemo: FluxBlock[] = [
  {
    day: 'seg',
    dayLabel: 'Segunda',
    modality: 'Forca',
    color: '#ef4444',
    exercises: [
      { name: 'Agachamento', sets: 4, reps: '8-10' },
      { name: 'Supino reto', sets: 4, reps: '8-10' },
      { name: 'Remada curvada', sets: 3, reps: '10-12' },
    ],
  },
  {
    day: 'ter',
    dayLabel: 'Terca',
    modality: 'Cardio',
    color: '#3b82f6',
    exercises: [
      { name: 'Corrida intervalada', sets: 6, reps: '400m' },
      { name: 'Burpees', sets: 3, reps: '15' },
      { name: 'Pular corda', sets: 4, reps: '2min' },
    ],
  },
  {
    day: 'qua',
    dayLabel: 'Quarta',
    modality: 'Mobilidade',
    color: '#8b5cf6',
    exercises: [
      { name: 'Yoga — Saudacao ao sol', sets: 3, reps: '5 ciclos' },
      { name: 'Alongamento de isquiotibiais', sets: 3, reps: '30s' },
      { name: 'Foam roller — Coluna', sets: 2, reps: '2min' },
    ],
  },
  {
    day: 'qui',
    dayLabel: 'Quinta',
    modality: 'Forca',
    color: '#ef4444',
    exercises: [
      { name: 'Levantamento terra', sets: 4, reps: '6-8' },
      { name: 'Desenvolvimento militar', sets: 4, reps: '8-10' },
      { name: 'Rosca direta', sets: 3, reps: '12' },
    ],
  },
  {
    day: 'sex',
    dayLabel: 'Sexta',
    modality: 'HIIT',
    color: '#f59e0b',
    exercises: [
      { name: 'Kettlebell swing', sets: 5, reps: '15' },
      { name: 'Box jump', sets: 4, reps: '10' },
      { name: 'Mountain climbers', sets: 4, reps: '20' },
    ],
  },
  {
    day: 'sab',
    dayLabel: 'Sabado',
    modality: 'Esporte',
    color: '#10b981',
    exercises: [
      { name: 'Futebol — Pelada', sets: 1, reps: '90min' },
      { name: 'Alongamento pos-jogo', sets: 1, reps: '15min' },
    ],
  },
  {
    day: 'dom',
    dayLabel: 'Domingo',
    modality: 'Descanso ativo',
    color: '#6b7280',
    exercises: [
      { name: 'Caminhada leve', sets: 1, reps: '40min' },
      { name: 'Meditacao guiada', sets: 1, reps: '15min' },
    ],
  },
];

export const agendaDemo: AgendaEvent[] = [
  { id: 'ag-1', day: 'seg', title: 'Daily standup', color: '#3b82f6', time: '09:00' },
  { id: 'ag-2', day: 'seg', title: 'Reuniao de alinhamento', color: '#f59e0b', time: '14:00' },
  { id: 'ag-3', day: 'ter', title: 'Review de sprint', color: '#8b5cf6', time: '10:00' },
  { id: 'ag-4', day: 'qua', title: 'Mentoria com Carlos', color: '#10b981', time: '11:00' },
  { id: 'ag-5', day: 'qui', title: 'Workshop de IA', color: '#ef4444', time: '15:00' },
  { id: 'ag-6', day: 'qui', title: 'Happy hour da equipe', color: '#f59e0b', time: '18:00' },
  { id: 'ag-7', day: 'sex', title: 'Entrega do relatorio', color: '#3b82f6', time: '12:00' },
  { id: 'ag-8', day: 'sab', title: 'Pelada com amigos', color: '#10b981', time: '10:00' },
];

export const telegramCommands: TelegramCommand[] = [
  {
    command: '/resumo',
    description: 'Resumo do dia',
    userMessage: '/resumo',
    botResponse:
      'Bom dia! Aqui esta seu resumo:\n\n' +
      '📋 3 tarefas pendentes (1 urgente)\n' +
      '📅 2 reunioes hoje\n' +
      '💰 Saldo: R$ 2.400\n' +
      '🔥 Streak: 47 dias\n\n' +
      'Sua tarefa mais urgente: "Revisar proposta do cliente Nexus" as 10h.',
  },
  {
    command: '/tarefa',
    description: 'Adicionar tarefa rapida',
    userMessage: '/tarefa Ligar para o contador amanha as 9h',
    botResponse:
      'Tarefa criada com sucesso!\n\n' +
      '✅ "Ligar para o contador"\n' +
      '📅 Amanha, 09:00\n' +
      '📊 Quadrante: Urgente & Importante\n\n' +
      'Adicionei ao seu Atlas e ao calendario.',
  },
  {
    command: '/gasto',
    description: 'Registrar gasto',
    userMessage: '/gasto 45.90 Almoco no restaurante',
    botResponse:
      'Gasto registrado!\n\n' +
      '💸 R$ 45,90 — Almoco no restaurante\n' +
      '🏷️ Categoria: Alimentacao\n' +
      '📊 Gasto diario acumulado: R$ 127,40\n\n' +
      'Voce esta dentro do orcamento diario (limite: R$ 220).',
  },
  {
    command: '/humor',
    description: 'Registrar momento emocional',
    userMessage: '/humor Ansioso com a apresentacao, mas animado com o resultado',
    botResponse:
      'Momento registrado no Journey!\n\n' +
      '🎭 Emocoes detectadas: Ansiedade (40%), Animacao (60%)\n' +
      '✨ +15 Pontos de Consciencia\n' +
      '📊 Tendencia da semana: Motivacao crescente\n\n' +
      'Dica: Respiracao 4-7-8 pode ajudar com a ansiedade antes da apresentacao.',
  },
];
