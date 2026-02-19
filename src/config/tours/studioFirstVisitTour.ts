import { TourConfig } from '@/contexts/TourContext';

/**
 * Studio (Podcast Production) first-visit tour
 * Introduces podcast workflow, guest management, and content production
 */
export const studioFirstVisitTour: TourConfig = {
  key: 'studio-first-visit',
  name: 'Studio Podcast Production',
  module: 'studio',
  autoStart: false,
  steps: [
    {
      target: '[data-tour="studio-header"]',
      content:
        'Bem-vindo ao Studio! Aqui você gerencia seus podcasts, convidados e conteúdo de áudio. Transforme sua voz em impacto.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="studio-shows-list"]',
      content:
        'Seus shows de podcast aparecem aqui. Cada show tem sua própria biblioteca de episódios, convidados e configurações.',
      placement: 'right',
    },
    {
      target: '[data-tour="create-show-button"]',
      content:
        'Clique para criar um novo podcast show. Configure nome, descrição, e foto de capa.',
      placement: 'top',
    },
    {
      target: '[data-tour="wizard-button"]',
      content:
        'O Assistente (Wizard) guia você pelo processo de criar um novo episódio, desde a pesquisa até a publicação final.',
      placement: 'left',
    },
    {
      target: '[data-tour="guest-management"]',
      content:
        'Gerencie seus convidados aqui. Você pode manter um database de contatos, agendamentos e histórico de aparições.',
      placement: 'right',
    },
    {
      target: '[data-tour="episode-production"]',
      content:
        'Veja seus episódios em diferentes estágios: planejamento, gravação, edição e publicado. Acompanhe o progresso de cada um.',
      placement: 'left',
    },
    {
      target: '[data-tour="studio-library"]',
      content:
        'Sua biblioteca contém áudios, jingles, músicas de fundo e outros recursos. Organize seus ativos de produção aqui.',
      placement: 'center',
    },
    {
      target: '[data-tour="workspace-view"]',
      content:
        'No workspace, você edita episódios, adiciona transições, efeitos sonoros e prepara o conteúdo final para publicação.',
      placement: 'top',
    },
  ],
};
