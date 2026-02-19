import { TourConfig } from '@/contexts/TourContext';

/**
 * Grants first-visit tour
 * Introduces grant opportunity discovery, application tracking, and AI-powered matching
 */
export const grantsFirstVisitTour: TourConfig = {
  key: 'grants-first-visit',
  name: 'Grants Discovery & Tracking',
  module: 'grants',
  autoStart: false,
  steps: [
    {
      target: '[data-tour="grants-header"]',
      content:
        'Bem-vindo ao Grants! Aqui você descobre oportunidades de financiamento, subsídios e editais relevantes para seu perfil.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="opportunities-list"]',
      content:
        'Veja todas as oportunidades de grants disponíveis. Nossas recomendações usam IA para encontrar as melhores opções para você.',
      placement: 'right',
    },
    {
      target: '[data-tour="opportunity-filter"]',
      content:
        'Filtre por tipo de grant, área temática, valor disponível ou deadline. Personalize sua busca conforme suas necessidades.',
      placement: 'left',
    },
    {
      target: '[data-tour="edital-parser"]',
      content:
        'Carregue PDFs de editais e nosso AI extrai automaticamente as informações principais: requisitos, prazos, valores.',
      placement: 'top',
    },
    {
      target: '[data-tour="opportunity-detail"]',
      content:
        'Veja detalhes completos de cada grant. Leia sobre requisitos, deadline, processo de aplicação e documentação necessária.',
      placement: 'center',
    },
    {
      target: '[data-tour="saved-opportunities"]',
      content:
        'Marque grants favoritos para acompanhamento. Você recebe notificações quando deadlines se aproximam.',
      placement: 'left',
    },
    {
      target: '[data-tour="application-tracking"]',
      content:
        'Acompanhe o status de suas aplicações: submetida, em análise, aprovada ou rejeitada. Mantenha histórico completo.',
      placement: 'right',
    },
    {
      target: '[data-tour="ai-briefing"]',
      content:
        'Obtenha resumos inteligentes de cada edital. A IA analisa e destaca as informações mais importantes para sua candidatura.',
      placement: 'left',
    },
  ],
};
