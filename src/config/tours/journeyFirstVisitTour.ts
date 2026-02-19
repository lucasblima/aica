import { TourConfig } from '@/contexts/TourContext';

/**
 * Journey (Conscientização) first-visit tour
 * Introduces consciousness points, moments tracking, and personal growth
 */
export const journeyFirstVisitTour: TourConfig = {
  key: 'journey-first-visit',
  name: 'Journey Consciousness & Moments',
  module: 'journey',
  autoStart: false,
  steps: [
    {
      target: '[data-tour="journey-header"]',
      content:
        'Bem-vindo à sua Jornada! Aqui você registra momentos significativos e acompanha sua evolução pessoal e consciência.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="consciousness-points"]',
      content:
        'Seus Pontos de Consciência (CP) refletem seu nível de auto-conhecimento. Aumentam com reflexões, momentos registrados e perguntas respondidas.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="quick-capture"]',
      content:
        'Capture um novo momento aqui. Escreva ou grave áudio — a IA analisa e gera tags e insights automaticamente.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="daily-question"]',
      content:
        'Todo dia uma pergunta de reflexão personalizada. Responder rende Pontos de Consciência e ajuda a IA a te conhecer melhor.',
      placement: 'right',
    },
    {
      target: '[data-tour="moments-timeline"]',
      content:
        'Sua timeline unificada mostra momentos, perguntas respondidas e reflexões. Use as abas para ver Insights, buscar ou iniciar entrevistas.',
      placement: 'top',
    },
  ],
};
