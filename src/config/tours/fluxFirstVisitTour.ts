import { TourConfig } from '@/contexts/TourContext';

/**
 * Flux (Training Management) first-visit tour
 * Introduces athlete management, training templates, canvas planning, and alerts
 */
export const fluxFirstVisitTour: TourConfig = {
  key: 'flux-first-visit',
  name: 'Flux Training Management',
  module: 'flux',
  autoStart: true,
  steps: [
    {
      target: '[data-tour="flux-header"]',
      content:
        'Bem-vindo ao Flux! Aqui voce gerencia treinos de natacao, corrida, ciclismo e forca para seus atletas.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="flux-quick-tools"]',
      content:
        'Acesse rapidamente a Biblioteca de templates, o Canvas de microciclos e seus proprios treinos.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="flux-filters"]',
      content:
        'Filtre atletas por modalidade e nivel. Use a busca para encontrar rapidamente quem precisa de atencao.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="flux-athletes-grid"]',
      content:
        'Seus atletas aparecem aqui com status colorimetrico de adesao. Clique em um atleta para ver detalhes e prescrever treinos.',
      placement: 'top',
    },
    {
      target: '[data-tour="flux-add-athlete"]',
      content:
        'Cadastre novos atletas com modalidade, nivel e dados de contato. Envie convites por email para que acompanhem seus treinos.',
      placement: 'left',
    },
  ],
};
