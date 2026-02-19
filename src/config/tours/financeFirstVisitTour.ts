import { TourConfig } from '@/contexts/TourContext';

/**
 * Finance first-visit tour
 * Introduces financial tracking, budget management, and AI-powered financial insights
 */
export const financeFirstVisitTour: TourConfig = {
  key: 'finance-first-visit',
  name: 'Finance Budget & Tracking',
  module: 'finance',
  autoStart: false,
  steps: [
    {
      target: '[data-tour="finance-header"]',
      content:
        'Bem-vindo ao Finance! Aqui você acompanha suas finanças pessoais, gastos, receitas e obtém insights inteligentes sobre seu dinheiro.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="balance-overview"]',
      content:
        'Veja seu saldo total em tempo real. Este é um snapshot rápido da sua saúde financeira atual.',
      placement: 'right',
    },
    {
      target: '[data-tour="income-expenses"]',
      content:
        'Acompanhe receitas e despesas lado a lado. Veja quanto você está ganhando versus gastando em cada período.',
      placement: 'left',
    },
    {
      target: '[data-tour="budget-categories"]',
      content:
        'Organize seus gastos por categorias (alimentação, transporte, saúde, etc). Defina limites de orçamento e monitore progresso.',
      placement: 'right',
    },
    {
      target: '[data-tour="transaction-list"]',
      content:
        'Veja todas as suas transações aqui. Filtre por categoria, data ou valor para encontrar rapidamente o que procura.',
      placement: 'center',
    },
    {
      target: '[data-tour="upload-statement"]',
      content:
        'Carregue extratos bancários (PDF ou CSV). Nosso AI extrai e categoriza automaticamente suas transações.',
      placement: 'top',
    },
    {
      target: '[data-tour="ai-insights"]',
      content:
        'Obtenha recomendações inteligentes sobre economia, padrões de gasto e oportunidades financeiras baseadas em seus dados.',
      placement: 'left',
    },
    {
      target: '[data-tour="goals-tracking"]',
      content:
        'Defina metas financeiras (economizar, investir, pagar dívida) e acompanhe seu progresso ao longo do tempo.',
      placement: 'right',
    },
  ],
};
