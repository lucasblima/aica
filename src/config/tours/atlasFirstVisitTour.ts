import { TourConfig } from '@/contexts/TourContext';

/**
 * Atlas (Meu Dia) first-visit tour
 * Introduces the task management and Eisenhower Matrix features
 */
export const atlasFirstVisitTour: TourConfig = {
  key: 'atlas-first-visit',
  name: 'Atlas Task Management',
  module: 'atlas',
  autoStart: true,
  steps: [
    {
      target: '[data-tour="atlas-header"]',
      content:
        'Bem-vindo ao Meu Dia! Aqui você gerencia suas tarefas e prioridades de forma visual e intuitiva.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="eisenhower-matrix"]',
      content:
        'A Matriz de Eisenhower ajuda você a priorizar tarefas em 4 quadrantes: Urgente & Importante, Importante, Urgente e Nem Urgente Nem Importante.',
      placement: 'center',
    },
    {
      target: '[data-tour="quadrant-1"]',
      content:
        'Quadrante 1: Tarefas urgentes e importantes. Essas devem ser suas prioridades imediatas.',
      placement: 'right',
    },
    {
      target: '[data-tour="quadrant-2"]',
      content:
        'Quadrante 2: Tarefas importantes mas não urgentes. Invest em planejamento estratégico aqui.',
      placement: 'right',
    },
    {
      target: '[data-tour="quadrant-3"]',
      content:
        'Quadrante 3: Tarefas urgentes mas não importantes. Delegue ou minimize essas tarefas.',
      placement: 'left',
    },
    {
      target: '[data-tour="quadrant-4"]',
      content:
        'Quadrante 4: Nem urgente nem importante. Evite gastar tempo aqui, ou faça em tempo ocioso.',
      placement: 'left',
    },
    {
      target: '[data-tour="add-task-button"]',
      content:
        'Clique aqui para adicionar uma nova tarefa. Você pode arrastar tarefas entre quadrantes para reclassificá-las.',
      placement: 'top',
    },
    {
      target: '[data-tour="task-filters"]',
      content:
        'Use esses filtros para visualizar apenas as tarefas que você deseja focar. Você pode filtrar por status, prioridade ou tags.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="xp-badge"]',
      content:
        'Você ganha XP ao completar tarefas! Isso te ajuda a subir de nível e desbloquear badges e recompensas.',
      placement: 'left',
    },
  ],
};
