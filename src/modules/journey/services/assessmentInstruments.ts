/**
 * Assessment Instruments — Psychometric Scoring Service
 * Issue #575, Sprint 3: Journey Validated Psychometric Well-Being
 *
 * Implements scoring for 6 validated psychometric instruments:
 * 1. PERMA-Profiler (Butler & Kern, 2016) — PT-BR: de Carvalho et al. (2021)
 * 2. SWLS (Diener et al., 1985) — PT-BR: Gouveia et al. (2009)
 * 3. PANAS (Watson, Clark & Tellegen, 1988) — PT-BR: Carvalho et al. (2013)
 * 4. MAAS (Brown & Ryan, 2003) — PT-BR: Barros et al. (2015)
 * 5. Affect Grid (Russell, Weiss & Mendelsohn, 1989)
 * 6. InCharge Financial Well-Being (Prawitz et al., 2006) — PT-BR: Ponchio et al. (2019)
 */

import type {
  AssessmentInstrument,
  AssessmentItem,
  ScoringRule,
} from '@/services/scoring/types';

// ============================================================================
// INSTRUMENT DEFINITIONS
// ============================================================================

const PERMA_PROFILER: AssessmentInstrument = {
  id: 'perma_profiler',
  name: 'PERMA-Profiler',
  shortName: 'PERMA',
  description: 'Avalia 5 pilares do florescimento humano: Emoção Positiva, Engajamento, Relacionamentos, Significado e Realização.',
  language: 'pt-BR',
  validationReference: 'Butler & Kern (2016). PT-BR: de Carvalho et al. (2021), CFI=0.97.',
  estimatedMinutes: 5,
  scoreRange: { min: 0, max: 10 },
  items: [
    // Positive Emotion (P)
    { code: 'P1', text: 'Com que frequência você se sente alegre?', subscale: 'positive_emotion', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'P2', text: 'Com que frequência você se sente positivo(a)?', subscale: 'positive_emotion', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'P3', text: 'Em geral, quanto você se sente contente?', subscale: 'positive_emotion', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    // Engagement (E)
    { code: 'E1', text: 'Com que frequência você fica absorto(a) no que está fazendo?', subscale: 'engagement', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'E2', text: 'Com que frequência você perde noção do tempo enquanto faz algo que gosta?', subscale: 'engagement', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'E3', text: 'Quão envolvido(a) e interessado(a) você se sente em suas atividades diárias?', subscale: 'engagement', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    // Relationships (R)
    { code: 'R1', text: 'Até que ponto você se sente amado(a)?', subscale: 'relationships', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    { code: 'R2', text: 'Quão satisfeito(a) você está com seus relacionamentos pessoais?', subscale: 'relationships', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    { code: 'R3', text: 'Até que ponto você recebe ajuda e apoio de outras pessoas quando precisa?', subscale: 'relationships', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    // Meaning (M)
    { code: 'M1', text: 'Em geral, até que ponto você leva uma vida com propósito e significado?', subscale: 'meaning', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    { code: 'M2', text: 'Até que ponto você sente que o que faz na vida tem valor e é significativo?', subscale: 'meaning', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    { code: 'M3', text: 'Até que ponto você tem um senso de direção na vida?', subscale: 'meaning', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    // Accomplishment (A)
    { code: 'A1', text: 'Com que frequência você sente que está progredindo em direção a seus objetivos?', subscale: 'accomplishment', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'A2', text: 'Com que frequência você alcança metas importantes que estabeleceu para si?', subscale: 'accomplishment', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'A3', text: 'Até que ponto você é capaz de lidar com suas responsabilidades diárias?', subscale: 'accomplishment', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    // Negative Emotion (N) — filler / overall health / loneliness
    { code: 'N1', text: 'Com que frequência você se sente ansioso(a)?', subscale: 'negative_emotion', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'N2', text: 'Com que frequência você se sente triste?', subscale: 'negative_emotion', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'N3', text: 'Com que frequência você se sente com raiva?', subscale: 'negative_emotion', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    // Health (H)
    { code: 'H1', text: 'Comparado com outras pessoas da sua idade, como você classifica sua saúde física?', subscale: 'health', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Terrível', scaleMaxLabel: 'Excelente' },
    { code: 'H2', text: 'Quão satisfeito(a) você está com sua saúde atual?', subscale: 'health', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    { code: 'H3', text: 'Comparado com outras pessoas da sua idade, quão saudável é você?', subscale: 'health', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    // Overall wellbeing
    { code: 'HAP', text: 'Em geral, até que ponto você se considera uma pessoa feliz?', subscale: 'happiness', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
    // Loneliness
    { code: 'LON', text: 'Quão solitário(a) você se sente na vida diária?', subscale: 'loneliness', inputType: 'likert', scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Nada', scaleMaxLabel: 'Completamente' },
  ],
  scoringRules: [
    { subscale: 'positive_emotion', itemCodes: ['P1', 'P2', 'P3'], aggregation: 'mean' },
    { subscale: 'engagement', itemCodes: ['E1', 'E2', 'E3'], aggregation: 'mean' },
    { subscale: 'relationships', itemCodes: ['R1', 'R2', 'R3'], aggregation: 'mean' },
    { subscale: 'meaning', itemCodes: ['M1', 'M2', 'M3'], aggregation: 'mean' },
    { subscale: 'accomplishment', itemCodes: ['A1', 'A2', 'A3'], aggregation: 'mean' },
    { subscale: 'negative_emotion', itemCodes: ['N1', 'N2', 'N3'], aggregation: 'mean' },
    { subscale: 'health', itemCodes: ['H1', 'H2', 'H3'], aggregation: 'mean' },
  ],
};

const SWLS: AssessmentInstrument = {
  id: 'swls',
  name: 'Escala de Satisfação com a Vida (SWLS)',
  shortName: 'SWLS',
  description: 'Avalia a satisfação global com a vida em 5 itens.',
  language: 'pt-BR',
  validationReference: 'Diener et al. (1985). PT-BR: Gouveia et al. (2009).',
  estimatedMinutes: 2,
  scoreRange: { min: 5, max: 35 },
  items: [
    { code: 'S1', text: 'Na maioria dos aspectos, minha vida está próxima do meu ideal.', subscale: 'life_satisfaction', inputType: 'likert', scaleMin: 1, scaleMax: 7, scaleMinLabel: 'Discordo totalmente', scaleMaxLabel: 'Concordo totalmente' },
    { code: 'S2', text: 'As condições da minha vida são excelentes.', subscale: 'life_satisfaction', inputType: 'likert', scaleMin: 1, scaleMax: 7, scaleMinLabel: 'Discordo totalmente', scaleMaxLabel: 'Concordo totalmente' },
    { code: 'S3', text: 'Estou satisfeito(a) com minha vida.', subscale: 'life_satisfaction', inputType: 'likert', scaleMin: 1, scaleMax: 7, scaleMinLabel: 'Discordo totalmente', scaleMaxLabel: 'Concordo totalmente' },
    { code: 'S4', text: 'Até agora, tenho conseguido as coisas importantes que quero na vida.', subscale: 'life_satisfaction', inputType: 'likert', scaleMin: 1, scaleMax: 7, scaleMinLabel: 'Discordo totalmente', scaleMaxLabel: 'Concordo totalmente' },
    { code: 'S5', text: 'Se pudesse viver minha vida de novo, não mudaria quase nada.', subscale: 'life_satisfaction', inputType: 'likert', scaleMin: 1, scaleMax: 7, scaleMinLabel: 'Discordo totalmente', scaleMaxLabel: 'Concordo totalmente' },
  ],
  scoringRules: [
    { subscale: 'life_satisfaction', itemCodes: ['S1', 'S2', 'S3', 'S4', 'S5'], aggregation: 'sum' },
  ],
};

const PANAS: AssessmentInstrument = {
  id: 'panas',
  name: 'Escala de Afetos Positivos e Negativos (PANAS)',
  shortName: 'PANAS',
  description: 'Avalia 10 emoções positivas e 10 emoções negativas experimentadas recentemente.',
  language: 'pt-BR',
  validationReference: 'Watson, Clark & Tellegen (1988). PT-BR: Carvalho et al. (2013), alpha=0.88.',
  estimatedMinutes: 4,
  scoreRange: { min: 10, max: 50 },
  items: [
    // Positive Affect items
    { code: 'PA1', text: 'Interessado(a)', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA2', text: 'Animado(a)', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA3', text: 'Forte', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA4', text: 'Entusiasmado(a)', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA5', text: 'Orgulhoso(a)', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA6', text: 'Alerta', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA7', text: 'Inspirado(a)', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA8', text: 'Determinado(a)', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA9', text: 'Atencioso(a)', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'PA10', text: 'Ativo(a)', subscale: 'positive_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    // Negative Affect items
    { code: 'NA1', text: 'Angustiado(a)', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA2', text: 'Aflito(a)', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA3', text: 'Culpado(a)', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA4', text: 'Assustado(a)', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA5', text: 'Hostil', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA6', text: 'Irritado(a)', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA7', text: 'Envergonhado(a)', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA8', text: 'Nervoso(a)', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA9', text: 'Agitado(a)', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
    { code: 'NA10', text: 'Com medo', subscale: 'negative_affect', inputType: 'likert', scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Muito pouco ou nada', scaleMaxLabel: 'Extremamente' },
  ],
  scoringRules: [
    { subscale: 'positive_affect', itemCodes: ['PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6', 'PA7', 'PA8', 'PA9', 'PA10'], aggregation: 'sum' },
    { subscale: 'negative_affect', itemCodes: ['NA1', 'NA2', 'NA3', 'NA4', 'NA5', 'NA6', 'NA7', 'NA8', 'NA9', 'NA10'], aggregation: 'sum' },
  ],
};

const MAAS: AssessmentInstrument = {
  id: 'maas',
  name: 'Escala de Atenção e Consciência Plena (MAAS)',
  shortName: 'MAAS',
  description: 'Avalia a disposição para atenção plena no dia a dia. Itens descrevem experiências de falta de atenção (escala invertida).',
  language: 'pt-BR',
  validationReference: 'Brown & Ryan (2003). PT-BR: Barros et al. (2015), alpha=0.83.',
  estimatedMinutes: 4,
  scoreRange: { min: 1, max: 6 },
  // MAAS items use a "reverse" scale by design: 1="Quase sempre" (low mindfulness),
  // 6="Quase nunca" (high mindfulness). isReversed is set to true for documentation
  // but no numeric reversal is needed — higher raw values already map to greater mindfulness.
  items: [
    { code: 'MA1', text: 'Posso experienciar uma emoção e só tomo consciência dela algum tempo depois.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA2', text: 'Quebro ou derrubo coisas por descuido, por não prestar atenção ou por estar pensando em outra coisa.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA3', text: 'Acho difícil permanecer focado(a) no que está acontecendo no presente.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA4', text: 'Tendo a andar rapidamente para chegar ao meu destino sem prestar atenção ao que experiencio no caminho.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA5', text: 'Não costumo notar sensações de tensão física ou desconforto até que realmente chamem minha atenção.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA6', text: 'Esqueço o nome de uma pessoa quase imediatamente após ter sido apresentado(a).', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA7', text: 'Parece que estou funcionando no "piloto automático" sem muita consciência do que estou fazendo.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA8', text: 'Faço atividades apressadamente sem estar realmente atento(a) a elas.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA9', text: 'Fico tão focado(a) no objetivo que quero atingir que perco noção do que estou fazendo no momento para chegar lá.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA10', text: 'Faço tarefas automaticamente, sem ter consciência do que estou fazendo.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA11', text: 'Dou por mim a ouvir alguém com um ouvido enquanto faço outra coisa ao mesmo tempo.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA12', text: 'Conduzo no "piloto automático" e depois pergunto a mim mesmo(a) por que fui àquele lugar.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA13', text: 'Dou por mim a preocupar-me com o futuro ou com o passado.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA14', text: 'Dou por mim a fazer coisas sem prestar atenção.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
    { code: 'MA15', text: 'Como lanches sem ter consciência de que estou comendo.', subscale: 'mindfulness', inputType: 'likert', scaleMin: 1, scaleMax: 6, scaleMinLabel: 'Quase sempre', scaleMaxLabel: 'Quase nunca', isReversed: true },
  ],
  scoringRules: [
    { subscale: 'mindfulness', itemCodes: ['MA1', 'MA2', 'MA3', 'MA4', 'MA5', 'MA6', 'MA7', 'MA8', 'MA9', 'MA10', 'MA11', 'MA12', 'MA13', 'MA14', 'MA15'], aggregation: 'mean' },
  ],
};

const AFFECT_GRID: AssessmentInstrument = {
  id: 'affect_grid',
  name: 'Grade de Afeto (Affect Grid)',
  shortName: 'Affect Grid',
  description: 'Avaliação rápida do afeto atual em duas dimensões: valência (agradável-desagradável) e arousal (ativação-desativação).',
  language: 'pt-BR',
  validationReference: 'Russell, Weiss & Mendelsohn (1989). The Affect Grid.',
  estimatedMinutes: 1,
  scoreRange: { min: 1, max: 9 },
  items: [
    { code: 'AG_V', text: 'Toque no ponto que melhor representa como você se sente agora (eixo horizontal: desagradável → agradável).', subscale: 'valence', inputType: 'grid_tap', scaleMin: 1, scaleMax: 9, scaleMinLabel: 'Desagradável', scaleMaxLabel: 'Agradável' },
    { code: 'AG_A', text: 'Toque no ponto que melhor representa como você se sente agora (eixo vertical: sonolento → ativo).', subscale: 'arousal', inputType: 'grid_tap', scaleMin: 1, scaleMax: 9, scaleMinLabel: 'Sonolento', scaleMaxLabel: 'Ativo' },
  ],
  scoringRules: [
    { subscale: 'valence', itemCodes: ['AG_V'], aggregation: 'mean' },
    { subscale: 'arousal', itemCodes: ['AG_A'], aggregation: 'mean' },
  ],
};

const INCHARGE: AssessmentInstrument = {
  id: 'incharge',
  name: 'InCharge — Bem-Estar Financeiro',
  shortName: 'InCharge',
  description: 'Avalia o nível de estresse e bem-estar financeiro percebido.',
  language: 'pt-BR',
  validationReference: 'Prawitz et al. (2006). InCharge FDW Scale. PT-BR: Ponchio et al. (2019).',
  estimatedMinutes: 2,
  scoreRange: { min: 1, max: 10 },
  items: [
    { code: 'IC1', text: 'Qual é seu nível de estresse financeiro hoje?', subscale: 'financial_wellbeing', inputType: 'likert', scaleMin: 1, scaleMax: 10, scaleMinLabel: 'Estresse esmagador', scaleMaxLabel: 'Sem estresse' },
    { code: 'IC2', text: 'Quão satisfeito(a) você está com sua situação financeira atual?', subscale: 'financial_wellbeing', inputType: 'likert', scaleMin: 1, scaleMax: 10, scaleMinLabel: 'Nada satisfeito', scaleMaxLabel: 'Completamente satisfeito' },
    { code: 'IC3', text: 'Com que frequência você pensa que sua renda é suficiente para cobrir as despesas?', subscale: 'financial_wellbeing', inputType: 'likert', scaleMin: 1, scaleMax: 10, scaleMinLabel: 'Nunca', scaleMaxLabel: 'Sempre' },
    { code: 'IC4', text: 'Em que ponto você sente que sua situação financeira controla sua vida?', subscale: 'financial_wellbeing', inputType: 'likert', scaleMin: 1, scaleMax: 10, scaleMinLabel: 'Controlado totalmente', scaleMaxLabel: 'Nenhum controle' },
    { code: 'IC5', text: 'Em que ponto você se sente confortável com as dívidas atuais?', subscale: 'financial_wellbeing', inputType: 'likert', scaleMin: 1, scaleMax: 10, scaleMinLabel: 'Muito desconfortável', scaleMaxLabel: 'Muito confortável' },
    { code: 'IC6', text: 'Com que frequência você se preocupa em conseguir cumprir suas obrigações financeiras mensais?', subscale: 'financial_wellbeing', inputType: 'likert', scaleMin: 1, scaleMax: 10, scaleMinLabel: 'O tempo todo', scaleMaxLabel: 'Nunca' },
    { code: 'IC7', text: 'Em geral, como você classifica sua saúde financeira?', subscale: 'financial_wellbeing', inputType: 'likert', scaleMin: 1, scaleMax: 10, scaleMinLabel: 'Muito ruim', scaleMaxLabel: 'Muito boa' },
    { code: 'IC8', text: 'Quão seguro(a) você se sente quanto ao futuro financeiro?', subscale: 'financial_wellbeing', inputType: 'likert', scaleMin: 1, scaleMax: 10, scaleMinLabel: 'Nada seguro', scaleMaxLabel: 'Completamente seguro' },
  ],
  scoringRules: [
    { subscale: 'financial_wellbeing', itemCodes: ['IC1', 'IC2', 'IC3', 'IC4', 'IC5', 'IC6', 'IC7', 'IC8'], aggregation: 'mean' },
  ],
};

// ============================================================================
// INSTRUMENT REGISTRY
// ============================================================================

const INSTRUMENTS: Record<string, AssessmentInstrument> = {
  perma_profiler: PERMA_PROFILER,
  swls: SWLS,
  panas: PANAS,
  maas: MAAS,
  affect_grid: AFFECT_GRID,
  incharge: INCHARGE,
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that all required items are present and values are within valid ranges.
 */
export function validateResponses(
  instrument: AssessmentInstrument,
  responses: Record<string, number>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const item of instrument.items) {
    if (!(item.code in responses)) {
      errors.push(`Missing response for item: ${item.code}`);
    } else {
      const value = responses[item.code];
      const min = item.scaleMin ?? 0;
      const max = item.scaleMax ?? 10;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`Invalid value for ${item.code}: expected a finite number, got ${String(value)}`);
      } else if (value < min || value > max) {
        errors.push(`Out of range for ${item.code}: ${value} (expected ${min}-${max})`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Score a completed assessment.
 * Returns subscale scores and composite score.
 *
 * Validates that all required items are present and values are within
 * each item's valid range before scoring. Throws if validation fails.
 */
export function scoreAssessment(
  instrumentId: string,
  responses: Record<string, number>
): { subscaleScores: Record<string, number>; compositeScore: number } {
  const instrument = INSTRUMENTS[instrumentId];
  if (!instrument) {
    throw new Error(`Unknown instrument: ${instrumentId}`);
  }

  // Guard: empty or null responses
  if (!responses || Object.keys(responses).length === 0) {
    throw new Error(`Empty responses for ${instrumentId}: at least one response required`);
  }

  // Validate all responses before scoring
  const validation = validateResponses(instrument, responses);
  if (!validation.valid) {
    throw new Error(
      `Invalid assessment responses for ${instrumentId}: ${validation.errors.join('; ')}`
    );
  }

  const subscaleScores: Record<string, number> = {};

  for (const rule of instrument.scoringRules) {
    const values: number[] = [];
    for (const code of rule.itemCodes) {
      const raw = responses[code];
      if (raw == null) continue;
      values.push(raw);
    }

    if (values.length === 0) continue;

    if (rule.aggregation === 'sum') {
      subscaleScores[rule.subscale] = values.reduce((a, b) => a + b, 0);
    } else {
      // mean
      subscaleScores[rule.subscale] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  // Compute composite based on instrument type
  const compositeScore = computeComposite(instrumentId, subscaleScores);

  return { subscaleScores, compositeScore };
}

function computeComposite(instrumentId: string, subscaleScores: Record<string, number>): number {
  switch (instrumentId) {
    case 'perma_profiler': {
      // Flourishing = mean of P, E, R, M, A subscales
      const pillarKeys = ['positive_emotion', 'engagement', 'relationships', 'meaning', 'accomplishment'];
      const pillarScores = pillarKeys.map(k => subscaleScores[k]).filter(v => v != null);
      return pillarScores.length > 0
        ? pillarScores.reduce((a, b) => a + b, 0) / pillarScores.length
        : 0;
    }
    case 'swls':
      return subscaleScores['life_satisfaction'] ?? 0;
    case 'panas': {
      // Affect balance = PA - NA (can be negative)
      const pa = subscaleScores['positive_affect'] ?? 0;
      const na = subscaleScores['negative_affect'] ?? 0;
      return pa - na;
    }
    case 'maas':
      return subscaleScores['mindfulness'] ?? 0;
    case 'affect_grid': {
      // Composite = valence (1-9 scale)
      return subscaleScores['valence'] ?? 5;
    }
    case 'incharge':
      return subscaleScores['financial_wellbeing'] ?? 0;
    default:
      return 0;
  }
}

/**
 * Normalize a raw instrument score to 0-1 for Life Score composition.
 */
export function normalizeScore(instrumentId: string, rawScore: number): number {
  const instrument = INSTRUMENTS[instrumentId];
  if (!instrument) return 0;

  const { min, max } = instrument.scoreRange;

  switch (instrumentId) {
    case 'panas': {
      // Affect balance ranges from -40 (all negative) to +40 (all positive)
      // Normalize to 0-1 where 0 = worst, 1 = best
      return Math.max(0, Math.min(1, (rawScore + 40) / 80));
    }
    default: {
      // Standard min-max normalization
      return Math.max(0, Math.min(1, (rawScore - min) / (max - min)));
    }
  }
}

/**
 * Compute Journey domain score for Life Score composition.
 * Weighted combination of PERMA flourishing, life satisfaction, and momentary affect.
 *
 * @param permaScore - Normalized PERMA flourishing score (0-1)
 * @param swlsScore - Normalized SWLS satisfaction score (0-1)
 * @param emaValence - Normalized Affect Grid valence (0-1)
 * @returns Normalized domain score (0-1)
 */
export function computeJourneyDomainScore(
  permaScore: number,
  swlsScore: number,
  emaValence: number
): number {
  return 0.40 * Math.max(0, Math.min(permaScore, 1))
    + 0.30 * Math.max(0, Math.min(swlsScore, 1))
    + 0.30 * Math.max(0, Math.min(emaValence, 1));
}

/**
 * Get a specific instrument definition.
 */
export function getInstrumentDefinition(instrumentId: string): AssessmentInstrument | undefined {
  return INSTRUMENTS[instrumentId];
}

/**
 * Get all available instruments.
 */
export function getAllInstruments(): AssessmentInstrument[] {
  return Object.values(INSTRUMENTS);
}

/**
 * Get instrument IDs.
 */
export function getAllInstrumentIds(): string[] {
  return Object.keys(INSTRUMENTS);
}
