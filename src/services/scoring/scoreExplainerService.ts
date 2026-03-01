/**
 * Score Explainer Service
 * Issue #575: Scientific foundations for AICA Life OS
 *
 * Provides user-facing explanations for every scientific score in AICA.
 * "How is this calculated?" — transparency is a core design principle.
 *
 * Every score must be explainable: methodology, formula, scale, and
 * whether the underlying science is contested.
 */

import type { ScoreExplanation, AicaDomain } from './types';

// ============================================================================
// SCORE EXPLANATIONS CATALOG
// ============================================================================

/**
 * Explanations indexed by model_id (matches scientific_model_registry.id).
 */
const EXPLANATIONS: Record<string, ScoreExplanation> = {
  // === CROSS-MODULE ===
  life_score: {
    title: 'Life Score',
    summary: 'Pontuação composta que integra todas as áreas da sua vida, calculada como média geométrica ponderada.',
    methodology: 'Média Geométrica Ponderada — mesma abordagem do IDH (UNDP)',
    brazilianValidation: undefined,
    formulaDescription: 'Multiplica cada pontuação de domínio elevada ao seu peso, depois extrai a raiz pelo total de pesos. Domínios fracos puxam o score para baixo (incentiva equilíbrio).',
    scaleDescription: '0-1, onde 0.80+ = prosperando, 0.66+ = suficiente, 0.40+ = em crescimento',
    isContested: false,
    improvementTips: [
      'Foque na área com menor pontuação — ela tem maior impacto na média geométrica',
      'Mantenha equilíbrio entre as áreas em vez de maximizar apenas uma',
      'Ajuste os pesos no menu de configuração para refletir suas prioridades atuais',
    ],
  },

  negative_spiral: {
    title: 'Detecção de Espiral Negativa',
    summary: 'Alerta quando 3+ áreas correlacionadas declinam simultaneamente, indicando um problema sistêmico.',
    methodology: 'Análise de correlação entre domínios + padrões de comorbidade clínica',
    formulaDescription: 'Monitora pares de domínios correlacionados (ex: bem-estar ↔ produtividade). Alerta quando ambos caem juntos.',
    scaleDescription: 'Alerta binário com severidade (aviso ou crítico)',
    isContested: false,
    improvementTips: [
      'Priorize UMA área para focar — evite tentar resolver tudo ao mesmo tempo',
      'Busque apoio social — conversar com alguém de confiança ajuda',
      'Considere reduzir compromissos temporariamente',
    ],
  },

  // === ATLAS ===
  cognitive_load: {
    title: 'Carga Cognitiva',
    summary: 'Estima a demanda mental de uma tarefa baseado na complexidade dos elementos e sua interatividade.',
    methodology: 'Teoria da Carga Cognitiva — Sweller (1988)',
    formulaDescription: 'CL = elementos × interatividade × (1/expertise). Maior carga = mais difícil processar.',
    scaleDescription: '0-1 normalizado, onde 0.8+ = carga alta (requer foco total)',
    isContested: false,
    improvementTips: [
      'Quebre tarefas complexas em subtarefas menores',
      'Elimine distrações durante tarefas de alta carga cognitiva',
      'Faça pausas entre sessões de trabalho intenso',
    ],
  },

  flow_state: {
    title: 'Probabilidade de Flow',
    summary: 'Probabilidade de entrar em estado de fluxo (foco total), baseada no equilíbrio desafio-habilidade.',
    methodology: 'Teoria do Flow — Csikszentmihalyi (1990)',
    formulaDescription: 'Maior quando o desafio é ~igual à habilidade, com objetivos claros e feedback imediato.',
    scaleDescription: '0-1, onde 0.8+ = condições ideais para flow',
    isContested: false,
    improvementTips: [
      'Ajuste a dificuldade da tarefa — nem muito fácil, nem muito difícil',
      'Defina objetivos claros antes de começar',
      'Elimine interrupções para manter o estado de flow',
    ],
  },

  planning_fallacy: {
    title: 'Correção da Falácia do Planejamento',
    summary: 'Corrige estimativas de tempo usando seu histórico pessoal de precisão.',
    methodology: 'Falácia do Planejamento — Buehler, Griffin & Ross (1994)',
    formulaDescription: 'Tempo corrigido = estimativa × multiplicador pessoal (média móvel de real/estimado).',
    scaleDescription: 'Multiplicador > 1.0 indica tendência a subestimar. Média geral: 1.5x',
    isContested: false,
    improvementTips: [
      'Registre o tempo real das tarefas para melhorar suas estimativas',
      'Use a estimativa corrigida para planejar seu dia',
      'Adicione buffers para tarefas com alta incerteza',
    ],
  },

  decision_fatigue: {
    title: 'Fadiga de Decisão',
    summary: 'Sugere agendar decisões complexas no início do dia, quando a capacidade de decisão é maior.',
    methodology: 'Danziger, Levav & Avnaim-Pesso (2011)',
    formulaDescription: 'Heurística prática: capacidade de decisão diminui ao longo do dia.',
    scaleDescription: 'Qualitativo — guia de agendamento',
    isContested: true,
    contestedNote: 'A teoria de "esgotamento do ego" subjacente falhou em replicações. Usamos como heurística prática, não como lei científica.',
    improvementTips: [
      'Agende decisões importantes para o início do dia',
      'Reduza decisões triviais com rotinas e hábitos',
      'Faça uma pausa antes de decisões importantes no final do dia',
    ],
  },

  // === JOURNEY ===
  perma_profiler: {
    title: 'PERMA-Profiler (Bem-estar)',
    summary: 'Avaliação completa do bem-estar em 5 dimensões: Emoções Positivas, Engajamento, Relacionamentos, Significado e Realização.',
    methodology: 'PERMA-Profiler — Butler & Kern (2016)',
    brazilianValidation: 'Validado em português por de Carvalho et al. (2021), CFI=0.97',
    formulaDescription: '23 itens, escala 0-10. 5 subescalas = média de 3 itens cada. Flourishing = média de 15+1 itens.',
    scaleDescription: '0-10, onde 8+ = alto bem-estar',
    isContested: false,
    improvementTips: [
      'Identifique qual dimensão (P, E, R, M, A) está mais baixa',
      'Pratique gratidão diária para melhorar Emoções Positivas',
      'Busque atividades que gerem Flow para melhorar Engajamento',
    ],
  },

  swls: {
    title: 'Satisfação com a Vida (SWLS)',
    summary: 'Medida global de satisfação com a vida usando 5 perguntas simples.',
    methodology: 'SWLS — Diener et al. (1985)',
    brazilianValidation: 'Validado em português por Gouveia et al. (2009)',
    formulaDescription: '5 itens, escala 1-7. Soma total: 5-35.',
    scaleDescription: '5-35. 31+ = extremamente satisfeito, 20 = neutro, <9 = insatisfeito',
    isContested: false,
    improvementTips: [
      'Reflita sobre o que "vida ideal" significa para você (item 3 do SWLS)',
      'Pequenas mudanças consistentes têm mais impacto que grandes gestos',
      'Redefina expectativas se necessário — satisfação é relativa ao seu ideal',
    ],
  },

  // === CONNECTIONS ===
  dunbar_layers: {
    title: 'Camadas de Dunbar',
    summary: 'Classifica seus contatos em camadas baseadas na frequência e proximidade — do círculo íntimo (5) aos conhecidos (500).',
    methodology: 'Número de Dunbar — Dunbar (1992, 2024)',
    formulaDescription: 'Classificação por frequência + profundidade de interação: 5 (íntimos) → 15 (próximos) → 50 (amigos) → 150 (significativos) → 500 (conhecidos).',
    scaleDescription: 'Camadas: 5, 15, 50, 150, 500',
    isContested: false,
    improvementTips: [
      'Priorize manter contato com as camadas 5 e 15 — são os relacionamentos mais valiosos',
      'Relacionamentos decaem sem interação — uma mensagem simples já ajuda',
      'Diversifique suas conexões entre diferentes contextos de vida',
    ],
  },

  gottman_ratio: {
    title: 'Razão de Gottman',
    summary: 'Proporção entre interações positivas e negativas — 5:1 ou melhor indica relacionamento saudável.',
    methodology: 'Gottman & Levenson (1992)',
    formulaDescription: 'positivas / negativas >= 5.0 = saudável. Abaixo de 5:1 indica risco.',
    scaleDescription: 'Razão ≥ 5:1 = saudável, < 5:1 = atenção, < 1:1 = crítico',
    isContested: false,
    improvementTips: [
      'Aumente interações positivas: elogios, gratidão, atos de cuidado',
      'Não evite conflitos — resolva-os com respeito',
      'Uma interação negativa exige ~5 positivas para reequilibrar',
    ],
  },

  // === FINANCE ===
  finhealth_score: {
    title: 'Saúde Financeira',
    summary: 'Avaliação em 4 componentes: gastar, poupar, emprestar e planejar.',
    methodology: 'Financial Health Network (2024)',
    formulaDescription: '4 componentes (gasto, poupança, dívida, planejamento): 0-100 cada. Média = score composto.',
    scaleDescription: '0-100. 80+ = saudável, 40-79 = administrando, <40 = vulnerável',
    isContested: false,
    improvementTips: [
      'Comece pelo componente com menor score',
      'Construa uma reserva de emergência (mínimo 3 meses)',
      'Mantenha a relação dívida/renda abaixo de 36%',
    ],
  },

  prospect_theory: {
    title: 'Aversão à Perda',
    summary: 'Perder R$100 dói 2.25x mais do que ganhar R$100 alegra — usamos isso para motivar economia.',
    methodology: 'Teoria dos Prospectos — Kahneman & Tversky (1979)',
    formulaDescription: 'v(x) = x ≥ 0 ? x^0.88 : -2.25 × (-x)^0.88. Lambda (λ) = 2.25.',
    scaleDescription: 'Multiplicador de sensibilidade à perda',
    isContested: false,
    improvementTips: [
      'Use o "frame de perda" para motivar poupança — quanto você PERDE por mês por não poupar?',
      'Automatize transferências para poupança (evita decisão ativa)',
      'Visualize o custo de oportunidade de compras impulsivas',
    ],
  },

  // === GRANTS ===
  researcher_strength: {
    title: 'Força do Pesquisador (RSS)',
    summary: 'Score composto da produção científica: h-index, citações, impacto de revistas e colaboração.',
    methodology: 'Composto: h-index (Hirsch 2005), m-quociente, fator de impacto, centralidade',
    formulaDescription: 'RSS = 0.30×h + 0.20×citações + 0.15×m-quociente + 0.20×IF + 0.15×centralidade (normalizados).',
    scaleDescription: '0-1 normalizado na área de atuação',
    isContested: false,
    improvementTips: [
      'Publique em periódicos de maior impacto para melhorar o IF médio',
      'Colabore com pesquisadores de diferentes instituições',
      'Mantenha perfil atualizado no Lattes e ORCID',
    ],
  },

  // === STUDIO ===
  guest_scoring: {
    title: 'Score de Convidado',
    summary: 'Avaliação de candidatos a convidados do podcast em 4 dimensões: expertise, alcance, relevância e diversidade.',
    methodology: 'Composto: melhores práticas de produção de podcast',
    formulaDescription: '0.30×expertise + 0.25×alcance + 0.30×relevância + 0.15×diversidade.',
    scaleDescription: '0-1, onde 0.8+ = convidado excelente',
    isContested: false,
    improvementTips: [
      'Priorize relevância para o tema do episódio',
      'Diversifique perfis de convidados ao longo da temporada',
      'Considere convidados de menor alcance mas alta expertise',
    ],
  },

  // === FLUX ===
  ctl_atl_tsb: {
    title: 'Balanço de Estresse de Treino (TSB)',
    summary: 'Monitora a relação entre carga crônica (fitness) e aguda (fadiga) para otimizar desempenho.',
    methodology: 'Modelo dose-resposta — Banister et al. (1975), Coggan/Allen (2003)',
    formulaDescription: 'CTL = média 42 dias de TSS. ATL = média 7 dias. TSB = CTL - ATL. Positivo = descansado, negativo = fatigado.',
    scaleDescription: 'TSB > 0 = recuperado, -10 a 0 = produtivo, < -30 = risco de overtraining',
    isContested: false,
    improvementTips: [
      'Mantenha TSB entre -10 e +10 para treino produtivo',
      'Não treine pesado quando TSB < -30',
      'Use semanas de recuperação a cada 3-4 semanas de carga',
    ],
  },
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get explanation for a specific score model.
 */
export function getScoreExplanation(modelId: string): ScoreExplanation | null {
  return EXPLANATIONS[modelId] ?? null;
}

/**
 * Get all available explanations.
 */
export function getAllExplanations(): Record<string, ScoreExplanation> {
  return { ...EXPLANATIONS };
}

/**
 * Get explanations for a specific AICA domain/module.
 */
export function getExplanationsForDomain(domain: AicaDomain): ScoreExplanation[] {
  // Map domain to model prefixes
  const domainModels: Record<AicaDomain, string[]> = {
    atlas: ['cognitive_load', 'flow_state', 'planning_fallacy', 'decision_fatigue'],
    journey: ['perma_profiler', 'swls'],
    connections: ['dunbar_layers', 'gottman_ratio'],
    finance: ['finhealth_score', 'prospect_theory'],
    grants: ['researcher_strength'],
    studio: ['guest_scoring'],
    flux: ['ctl_atl_tsb'],
  };

  const modelIds = domainModels[domain] ?? [];
  return modelIds
    .map(id => EXPLANATIONS[id])
    .filter((e): e is ScoreExplanation => e !== undefined);
}

/**
 * Get contested models (for transparency UI).
 */
export function getContestedModels(): { modelId: string; explanation: ScoreExplanation }[] {
  return Object.entries(EXPLANATIONS)
    .filter(([, e]) => e.isContested)
    .map(([modelId, explanation]) => ({ modelId, explanation }));
}
