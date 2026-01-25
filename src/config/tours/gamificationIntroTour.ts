import { TourConfig } from '@/contexts/TourContext';

/**
 * Gamification intro tour
 * Introduces XP, Consciousness Points, badges, and efficiency score
 */
export const gamificationIntroTour: TourConfig = {
  key: 'gamification-intro',
  name: 'Gamificação e Progresso',
  module: 'general',
  autoStart: false, // Triggered after first task completion
  steps: [
    {
      target: '[data-tour="gamification-widget"]',
      content:
        'Este é seu painel de gamificação! Aqui você acompanha seu progresso, XP, nível e conquistas.',
      placement: 'left',
    },
    {
      target: '[data-tour="xp-display"]',
      content:
        'XP (Experience Points) mede sua QUANTIDADE de ações. Complete tarefas, mantenha streaks e explore o app para ganhar XP!',
      placement: 'bottom',
    },
    {
      target: '[data-tour="cp-display"]',
      content:
        'CP (Consciousness Points) mede a QUALIDADE das suas ações. Foque em presença, reflexão e conexões para ganhar CP.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="streak-display"]',
      content:
        'Seu streak mostra sua consistência. Não se preocupe - temos períodos de graça para dias difíceis!',
      placement: 'bottom',
    },
    {
      target: '[data-tour="efficiency-score"]',
      content:
        'Sua pontuação de eficiência combina 5 componentes: conclusão, foco, consistência, alinhamento e tempo. Qualidade sobre quantidade!',
      placement: 'left',
    },
    {
      target: '[data-tour="badges-section"]',
      content:
        'Desbloqueie badges por conquistas especiais. Cada badge conta uma história sobre sua jornada de crescimento.',
      placement: 'top',
    },
  ],
};
