/**
 * Test Data Fixture
 * Provides reusable test data for onboarding flow (trails, answers, moments, etc.)
 */

/**
 * Trail selection test data
 */
export const TRAIL_DATA = {
  // Health & Emotional trail
  HEALTH_EMOTIONAL: {
    name: 'Saúde Emocional',
    id: 'health-emotional',
    icon: 'Heart',
    expectedQuestions: [
      'Como está sua saúde emocional?',
      'Qual é seu maior desafio emocional?',
    ],
  },

  // Finance trail
  FINANCE: {
    name: 'Finanças',
    id: 'finance',
    icon: 'DollarSign',
    expectedQuestions: [
      'Como está sua situação financeira?',
      'Qual é sua maior preocupação financeira?',
    ],
  },

  // Relationships trail
  RELATIONSHIPS: {
    name: 'Relacionamentos',
    id: 'relationships',
    icon: 'Users',
    expectedQuestions: [
      'Como estão seus relacionamentos?',
      'Qual é o seu principal desafio relacional?',
    ],
  },

  // Growth trail
  GROWTH: {
    name: 'Crescimento',
    id: 'growth',
    icon: 'TrendingUp',
    expectedQuestions: [
      'Como está seu crescimento pessoal?',
      'Em qual área você deseja crescer mais?',
    ],
  },

  // Health & Physical trail
  HEALTH_PHYSICAL: {
    name: 'Saúde Física',
    id: 'health-physical',
    icon: 'Activity',
    expectedQuestions: [
      'Como está sua saúde física?',
      'Qual é seu objetivo de saúde?',
    ],
  },
};

/**
 * Moment capture test data
 */
export const MOMENT_DATA = {
  // Moment types (usually 6 options)
  TYPES: [
    'Alegria',
    'Tristeza',
    'Gratidão',
    'Reflexão',
    'Aprendizado',
    'Conquista',
  ],

  // Emotions (usually 5 + custom)
  EMOTIONS: ['Feliz', 'Triste', 'Ansioso', 'Calmo', 'Motivado'],

  // Life areas (multiple choice)
  LIFE_AREAS: [
    'Profissão',
    'Relacionamentos',
    'Saúde',
    'Financeiro',
    'Pessoal',
    'Espiritual',
  ],

  // Sample reflections
  REFLECTIONS: [
    'Hoje aprendi algo importante sobre mim.',
    'Estou grato pelos momentos com minha família.',
    'Estou focado em melhorar minha saúde mental.',
    'Alcancei um objetivo importante no trabalho.',
    'Preciso de mais tempo para reflexão.',
  ],

  // Social proof examples
  SOCIAL_PROOFS: [
    '1.234 pessoas completaram este momento hoje',
    '98% dizem que se sentem melhor após capturar',
    'Sua reflexão será usada para recomendações',
  ],
};

/**
 * Recommendation testing data
 */
export const RECOMMENDATION_DATA = {
  // Sample recommended modules (max 6)
  MODULES: [
    {
      title: 'Atlas - Navegação de Vida',
      description: 'Entenda seu propósito e direção',
      confidence: '92%',
    },
    {
      title: 'Jornada - Momentos',
      description: 'Capture e analise seus momentos',
      confidence: '87%',
    },
    {
      title: 'Podcast - Crescimento',
      description: 'Ouça histórias inspiradoras',
      confidence: '85%',
    },
    {
      title: 'Financeiro - Planejamento',
      description: 'Organize suas finanças',
      confidence: '78%',
    },
    {
      title: 'Saúde - Bem-estar',
      description: 'Cuide de sua saúde mental',
      confidence: '75%',
    },
    {
      title: 'Relacionamentos',
      description: 'Fortaleça suas conexões',
      confidence: '72%',
    },
  ],

  // Feedback reasons for rejection
  REJECTION_REASONS: [
    'Não me interessa',
    'Já conheço bem esse assunto',
    'Não é relevante no momento',
    'Preciso focar em outra coisa',
    'Outro motivo',
  ],
};

/**
 * Sign up test data
 */
export const SIGNUP_DATA = {
  VALID_EMAILS: [
    'user@example.com',
    'test.user@domain.co.uk',
    'user+tag@company.com',
    'name123@test.org',
  ],

  INVALID_EMAILS: [
    'notanemail',
    '@nodomain.com',
    'user@',
    'user @example.com',
    'user@example',
  ],

  VALID_PASSWORDS: [
    'MyPassword123!',
    'Secure@Pass2024',
    'Complex!Pass#123',
  ],

  WEAK_PASSWORDS: [
    '123456',
    'password',
    'aaaaaa',
    '12345678',
    'abcdefgh',
  ],
};

/**
 * Helper function to get random item from array
 */
export function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper function to get random items from array
 */
export function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * Generate sample moment text
 */
export function generateMomentText(timestamp?: Date): string {
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  const texts = [
    'Tive um momento de clareza importante hoje.',
    'Refletindo sobre meu crescimento pessoal.',
    'Muito grato pelas pessoas ao meu redor.',
    'Aprendi uma lição valiosa hoje.',
    'Estou no caminho certo para meus objetivos.',
  ];
  return `${getRandomItem(texts)} (${time})`;
}

/**
 * Generate unique test scenario
 */
export function generateTestScenario() {
  return {
    momentType: getRandomItem(MOMENT_DATA.TYPES),
    emotion: getRandomItem(MOMENT_DATA.EMOTIONS),
    lifeAreas: getRandomItems(MOMENT_DATA.LIFE_AREAS, 2),
    reflection: getRandomItem(MOMENT_DATA.REFLECTIONS),
    timestamp: new Date(),
  };
}
