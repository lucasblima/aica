/**
 * Module Agent UI Configurations
 *
 * Defines display settings, suggested prompts, and accent colors
 * for each module's AI agent chat interface.
 */

import type { AgentModule } from '@/lib/agents';
import type { SuggestedPrompt } from './ModuleAgentChat';

export interface ModuleAgentUIConfig {
  module: AgentModule;
  displayName: string;
  accentColor: string;
  accentBg: string;
  welcomeMessage: string;
  placeholder: string;
  suggestedPrompts: SuggestedPrompt[];
}

export const MODULE_AGENT_CONFIGS: Record<Exclude<AgentModule, 'coordinator'>, ModuleAgentUIConfig> = {
  atlas: {
    module: 'atlas',
    displayName: 'Atlas',
    accentColor: 'text-blue-500',
    accentBg: 'bg-blue-500',
    welcomeMessage: `Olá! Sou o assistente do **Atlas**, seu módulo de produtividade.\n\nPosso ajudar com:\n- Organizar e priorizar tarefas\n- Criar listas e planos de ação\n- Analisar sua matriz de prioridades\n- Sugerir proximos passos`,
    placeholder: 'Pergunte sobre suas tarefas...',
    suggestedPrompts: [
      { label: 'Priorizar tarefas', prompt: 'Quais sao minhas tarefas mais urgentes e importantes? Me ajude a priorizar.' },
      { label: 'Plano semanal', prompt: 'Me ajude a criar um plano semanal com base nas minhas tarefas pendentes.' },
      { label: 'Revisar progresso', prompt: 'Como esta meu progresso nas tarefas desta semana?' },
    ],
  },

  captacao: {
    module: 'captacao',
    displayName: 'Captacao',
    accentColor: 'text-purple-500',
    accentBg: 'bg-purple-500',
    welcomeMessage: `Olá! Sou o assistente de **Captacao de Recursos**.\n\nPosso ajudar com:\n- Buscar editais e oportunidades\n- Analisar requisitos de editais\n- Preparar documentação\n- Acompanhar prazos`,
    placeholder: 'Pergunte sobre editais e captacao...',
    suggestedPrompts: [
      { label: 'Editais abertos', prompt: 'Quais editais estão abertos que se encaixam no meu perfil?' },
      { label: 'Analisar edital', prompt: 'Me ajude a analisar os requisitos do último edital que cadastrei.' },
      { label: 'Checklist projeto', prompt: 'Qual a checklist para submissao de um projeto de pesquisa?' },
    ],
  },

  studio: {
    module: 'studio',
    displayName: 'Studio',
    accentColor: 'text-rose-500',
    accentBg: 'bg-rose-500',
    welcomeMessage: `Olá! Sou o assistente do **Studio**, seu módulo de produção de conteúdo.\n\nPosso ajudar com:\n- Sugerir convidados para episodios\n- Criar roteiros e pautas\n- Pesquisar temas\n- Planejar calendário de conteúdo`,
    placeholder: 'Pergunte sobre produção de conteúdo...',
    suggestedPrompts: [
      { label: 'Sugerir convidado', prompt: 'Sugira convidados para um episódio sobre inteligencia artificial.' },
      { label: 'Criar roteiro', prompt: 'Me ajude a criar um roteiro para o próximo episódio.' },
      { label: 'Ideias de pauta', prompt: 'Quais temas estão em alta para produção de conteúdo?' },
    ],
  },

  journey: {
    module: 'journey',
    displayName: 'Journey',
    accentColor: 'text-teal-500',
    accentBg: 'bg-teal-500',
    welcomeMessage: `Olá! Sou o assistente do **Journey**, seu diário de consciência.\n\nPosso ajudar com:\n- Refletir sobre seus momentos\n- Identificar padrões emocionais\n- Sugerir práticas de bem-estar\n- Analisar tendências de humor`,
    placeholder: 'Reflita sobre seu dia...',
    suggestedPrompts: [
      { label: 'Reflexão do dia', prompt: 'Me ajude a refletir sobre o meu dia. Quais foram os momentos mais significativos?' },
      { label: 'Padrões emocionais', prompt: 'Quais padrões emocionais você identifica nas minhas ultimas anotações?' },
      { label: 'Práticas de bem-estar', prompt: 'Sugira práticas de bem-estar baseadas no meu histórico recente.' },
    ],
  },

  finance: {
    module: 'finance',
    displayName: 'Finance',
    accentColor: 'text-amber-500',
    accentBg: 'bg-amber-500',
    welcomeMessage: `Olá! Sou o assistente de **Finanças**, seu consultor financeiro pessoal.\n\nPosso ajudar com:\n- Analisar gastos e tendências\n- Sugerir economias\n- Identificar anomalias\n- Planejar orçamento`,
    placeholder: 'Pergunte sobre suas finanças...',
    suggestedPrompts: [
      { label: 'Analisar gastos', prompt: 'Análise meus gastos recentes e identifique onde posso economizar.' },
      { label: 'Sugerir economia', prompt: 'Quais gastos posso reduzir ou eliminar? Seja pratico e especifico.' },
      { label: 'Identificar anomalias', prompt: 'Identifique transações anomalas ou fora do padrão no meu histórico.' },
    ],
  },

  connections: {
    module: 'connections',
    displayName: 'Connections',
    accentColor: 'text-green-500',
    accentBg: 'bg-green-500',
    welcomeMessage: `Olá! Sou o assistente de **Connections**, seu módulo de relacionamentos.\n\nPosso ajudar com:\n- Analisar sua rede de contatos\n- Sugerir ações de networking\n- Resumir conversas\n- Identificar oportunidades de conexão`,
    placeholder: 'Pergunte sobre seus contatos...',
    suggestedPrompts: [
      { label: 'Resumir contatos', prompt: 'Me de um resumo dos meus contatos mais ativos recentemente.' },
      { label: 'Sugerir networking', prompt: 'Quais ações de networking posso tomar esta semana?' },
      { label: 'Análise de rede', prompt: 'Como esta a saúde da minha rede de contatos?' },
    ],
  },

  flux: {
    module: 'flux',
    displayName: 'Flux',
    accentColor: 'text-orange-500',
    accentBg: 'bg-orange-500',
    welcomeMessage: `Olá! Sou o assistente do **Flux**, seu módulo de treinamento.\n\nPosso ajudar com:\n- Planejar blocos de treino\n- Recomendar exercicios da sua biblioteca\n- Analisar performance dos atletas\n- Sugerir ajustes de carga\n- Monitorar alertas`,
    placeholder: 'Pergunte sobre treinos...',
    suggestedPrompts: [
      { label: 'Recomendar exercicios', prompt: 'Recomende exercicios da minha biblioteca para um atleta iniciante de natação.' },
      { label: 'Planejar treino', prompt: 'Me ajude a planejar o próximo bloco de treino com base nos meus templates.' },
      { label: 'Analisar performance', prompt: 'Como esta a performance dos meus atletas esta semana?' },
      { label: 'Ajustar carga', prompt: 'Sugira ajustes de carga para o microciclo ativo.' },
    ],
  },

  agenda: {
    module: 'agenda',
    displayName: 'Agenda',
    accentColor: 'text-indigo-500',
    accentBg: 'bg-indigo-500',
    welcomeMessage: `Olá! Sou o assistente da **Agenda**, seu organizador de compromissos.\n\nPosso ajudar com:\n- Organizar sua agenda\n- Sugerir horarios\n- Preparar para reunioes\n- Analisar sua rotina`,
    placeholder: 'Pergunte sobre sua agenda...',
    suggestedPrompts: [
      { label: 'Resumo do dia', prompt: 'Qual o resumo dos meus compromissos de hoje?' },
      { label: 'Organizar semana', prompt: 'Me ajude a organizar minha agenda da semana.' },
      { label: 'Preparar reunião', prompt: 'Me ajude a preparar para minha proxima reunião.' },
    ],
  },
};

/**
 * Get the UI config for a specific module agent
 */
export function getModuleAgentConfig(module: AgentModule): ModuleAgentUIConfig | undefined {
  if (module === 'coordinator') return undefined;
  return MODULE_AGENT_CONFIGS[module];
}
