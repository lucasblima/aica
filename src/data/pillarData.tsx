/**
 * Pillar Data Configuration
 * Defines the 4 core pillars of Aica with their visual and textual properties
 *
 * The 4 Pillars represent the main modules:
 * 1. Atlas - Daily task and time management
 * 2. Jornada - Personal moments and journaling
 * 3. Podcast - Audio/podcast content creation
 * 4. Financeiro - Financial management
 */

import {
  CheckSquare,
  Heart,
  Mic,
  TrendingUp,
} from 'lucide-react';

export interface Pillar {
  id: 'atlas' | 'jornada' | 'podcast' | 'financeiro';
  name: string;
  headline: string;
  description: string;
  benefits: string[];
  icon: React.ReactNode;
  iconName: string;
  color: string;
  backgroundColor: string;
  gradientStart: string;
  gradientEnd: string;
  example: string;
  exampleDescription: string;
  ctaLabel: string;
  learnMoreUrl: string;
  documentationUrl: string;
  order: number;
  isNew?: boolean;
}

export const PILLARS: Record<Pillar['id'], Pillar> = {
  atlas: {
    id: 'atlas',
    name: 'Atlas',
    headline: 'Apresentamos o Atlas',
    description: 'Organize suas tarefas diárias e semanais com clareza',
    benefits: [
      'Priorização com a matriz de Eisenhower',
      'Organização visual do seu dia',
      'Clareza mental e produtividade',
      'Rastreamento de progresso',
    ],
    icon: <CheckSquare size={120} />,
    iconName: 'CheckSquare',
    color: '#6B9EFF',
    backgroundColor: '#EEF3FF',
    gradientStart: '#6B9EFF',
    gradientEnd: '#4A7FE8',
    example: 'Crie tarefas para organizar sua semana',
    exampleDescription:
      'Defina suas prioridades, organize por contexto e acompanhe seu progresso em tempo real com a matriz de Eisenhower.',
    ctaLabel: 'Explorar Atlas',
    learnMoreUrl: '/docs/atlas',
    documentationUrl: '/tutorials/atlas-getting-started',
    order: 1,
    isNew: false,
  },

  jornada: {
    id: 'jornada',
    name: 'Jornada',
    headline: 'Apresentamos a Jornada',
    description: 'Capture seus momentos e reflexões pessoais',
    benefits: [
      'Registro de momentos significativos',
      'Reflexão estruturada',
      'Identificar padrões emocionais',
      'Visualizar crescimento pessoal',
    ],
    icon: <Heart size={120} />,
    iconName: 'Heart',
    color: '#845EF7',
    backgroundColor: '#F3EDFF',
    gradientStart: '#845EF7',
    gradientEnd: '#6D39E0',
    example: 'Registre um desafio que superou',
    exampleDescription:
      'Capture seus momentos significativos, reflexões e aprendizados. Entenda seus padrões emocionais ao longo do tempo.',
    ctaLabel: 'Explorar Jornada',
    learnMoreUrl: '/docs/jornada',
    documentationUrl: '/tutorials/jornada-getting-started',
    order: 2,
    isNew: false,
  },

  podcast: {
    id: 'podcast',
    name: 'Podcast',
    headline: 'Apresentamos o Podcast',
    description: 'Crie, edite e compartilhe episódios de podcast',
    benefits: [
      'Produção de áudio de qualidade profissional',
      'Edição intuitiva e acessível',
      'Conexão com sua audiência',
      'Compartilhamento em múltiplas plataformas',
    ],
    icon: <Mic size={120} />,
    iconName: 'Mic',
    color: '#FF922B',
    backgroundColor: '#FFF4E6',
    gradientStart: '#FF922B',
    gradientEnd: '#E67700',
    example: 'Produza seu primeiro episódio',
    exampleDescription:
      'Grave, edite e publique episódios de podcast. Compartilhe suas histórias e conecte-se com uma audiência global.',
    ctaLabel: 'Explorar Podcast',
    learnMoreUrl: '/docs/podcast',
    documentationUrl: '/tutorials/podcast-getting-started',
    order: 3,
    isNew: true,
  },

  financeiro: {
    id: 'financeiro',
    name: 'Financeiro',
    headline: 'Apresentamos o Financeiro',
    description: 'Organize sua vida financeira de forma inteligente',
    benefits: [
      'Planejamento financeiro estruturado',
      'Rastreamento de despesas e receitas',
      'Otimização da relação com dinheiro',
      'Metas financeiras personalizadas',
    ],
    icon: <TrendingUp size={120} />,
    iconName: 'TrendingUp',
    color: '#51CF66',
    backgroundColor: '#E7F7E7',
    gradientStart: '#51CF66',
    gradientEnd: '#38A169',
    example: 'Crie seu primeiro orçamento',
    exampleDescription:
      'Defina orçamentos, rastreie gastos e otimize sua relação com o dinheiro. Alcance suas metas financeiras com clareza.',
    ctaLabel: 'Explorar Financeiro',
    learnMoreUrl: '/docs/financeiro',
    documentationUrl: '/tutorials/financeiro-getting-started',
    order: 4,
    isNew: false,
  },
};

/**
 * Get all pillars in order
 */
export const getPillars = (): Pillar[] => {
  return Object.values(PILLARS).sort((a, b) => a.order - b.order);
};

/**
 * Get a specific pillar by ID
 */
export const getPillarById = (id: Pillar['id']): Pillar | null => {
  return PILLARS[id] || null;
};

/**
 * Get pillars that are marked as new
 */
export const getNewPillars = (): Pillar[] => {
  return getPillars().filter((pillar) => pillar.isNew);
};
