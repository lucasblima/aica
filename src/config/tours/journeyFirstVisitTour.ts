import { TourConfig } from '@/contexts/TourContext';

/**
 * Journey (Conscientização) first-visit tour
 * Introduces consciousness points, moments tracking, and personal growth
 */
export const journeyFirstVisitTour: TourConfig = {
  key: 'journey-first-visit',
  name: 'Journey Consciousness & Moments',
  module: 'journey',
  autoStart: true,
  steps: [
    {
      target: '[data-tour="journey-header"]',
      content:
        'Bem-vindo à sua Jornada! Aqui você registra momentos significativos e acompanha sua evolução pessoal e consciência.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="consciousness-score"]',
      content:
        'Seu score de Consciência reflete o nível de auto-conhecimento e crescimento pessoal. Aumenta com reflexão e ações intencionais.',
      placement: 'right',
    },
    {
      target: '[data-tour="consciousness-points"]',
      content:
        'Você ganha Pontos de Consciência ao registrar momentos, refletir sobre experiências e completar jornadas de crescimento.',
      placement: 'left',
    },
    {
      target: '[data-tour="moments-timeline"]',
      content:
        'Sua timeline de momentos captura memórias importantes. Você pode adicionar notas, emoções e aprendizados de cada experiência.',
      placement: 'center',
    },
    {
      target: '[data-tour="add-moment-button"]',
      content:
        'Clique para registrar um novo momento. Capture emoções, insights e o contexto do que você está vivendo agora.',
      placement: 'top',
    },
    {
      target: '[data-tour="emotion-picker"]',
      content:
        'Registre suas emoções atuais. Isso ajuda você a entender padrões emocionais e gatilhos ao longo do tempo.',
      placement: 'right',
    },
    {
      target: '[data-tour="growth-insights"]',
      content:
        'Insights gerados por IA analisam seus momentos e sugerem áreas de crescimento e padrões interessantes na sua jornada.',
      placement: 'left',
    },
  ],
};
