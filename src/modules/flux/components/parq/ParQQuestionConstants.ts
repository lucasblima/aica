import type { FollowUpCategory, FollowUpCategoryBlock, MedicalDocumentType, ParQRiskLevel } from '../../types/parq';

// 7 classic PAR-Q+ questions (validated standard)
export const PARQ_CLASSIC_QUESTIONS = [
  {
    id: 'q1',
    text: 'Algum médico já disse que você possui alguma condição cardíaca e que só deveria realizar atividade física recomendada por um médico?',
  },
  {
    id: 'q2',
    text: 'Você sente dor no peito quando pratica atividade física?',
  },
  {
    id: 'q3',
    text: 'No último mês, você sentiu dor no peito quando não estava praticando atividade física?',
  },
  {
    id: 'q4',
    text: 'Você perde o equilíbrio por causa de tontura ou já perdeu a consciência?',
  },
  {
    id: 'q5',
    text: 'Você possui algum problema ósseo ou articular que pode ser agravado pela atividade física?',
  },
  {
    id: 'q6',
    text: 'Algum médico está prescrevendo medicamentos para sua pressão arterial ou condição cardíaca?',
  },
  {
    id: 'q7',
    text: 'Você conhece alguma outra razão pela qual não deveria praticar atividade física?',
  },
];

// Follow-up categories with sub-questions
export const PARQ_FOLLOWUP_CATEGORIES: FollowUpCategoryBlock[] = [
  {
    category: 'cardiovascular',
    label: 'Condições Cardiovasculares',
    questions: [
      { id: 'cv1', text: 'Você tem ou já teve diagnóstico de doença cardíaca, insuficiência cardíaca ou arritmia?', answer: false },
      { id: 'cv2', text: 'Você já teve um ataque cardíaco ou fez cirurgia no coração?', answer: false },
      { id: 'cv3', text: 'Você utiliza marcapasso ou desfibrilador cardíaco?', answer: false },
      { id: 'cv4', text: 'Você tem pressão alta não controlada (acima de 160/90)?', answer: false },
    ],
  },
  {
    category: 'respiratory',
    label: 'Condições Respiratórias',
    questions: [
      { id: 'rp1', text: 'Você tem asma ou doença pulmonar crônica (DPOC)?', answer: false },
      { id: 'rp2', text: 'Você sente falta de ar em repouso ou durante atividades leves?', answer: false },
      { id: 'rp3', text: 'Você utiliza suplemento de oxigênio?', answer: false },
    ],
  },
  {
    category: 'musculoskeletal',
    label: 'Condições Musculoesqueléticas',
    questions: [
      { id: 'ms1', text: 'Você tem artrite, osteoporose ou problemas na coluna?', answer: false },
      { id: 'ms2', text: 'Você fez alguma cirurgia ortopédica nos últimos 12 meses?', answer: false },
      { id: 'ms3', text: 'Você tem alguma prótese articular (quadril, joelho)?', answer: false },
      { id: 'ms4', text: 'Você sente dor crônica que limita suas atividades diárias?', answer: false },
    ],
  },
  {
    category: 'neurological',
    label: 'Condições Neurológicas',
    questions: [
      { id: 'ne1', text: 'Você tem epilepsia, convulsões ou outra condição neurológica?', answer: false },
      { id: 'ne2', text: 'Você teve AVC (derrame) ou ataque isquêmico transitório?', answer: false },
      { id: 'ne3', text: 'Você tem formigamento ou dormência frequente nos membros?', answer: false },
    ],
  },
  {
    category: 'metabolic',
    label: 'Condições Metabólicas',
    questions: [
      { id: 'mt1', text: 'Você tem diabetes tipo 1 ou tipo 2?', answer: false },
      { id: 'mt2', text: 'Você já teve episódios de hipoglicemia durante exercício?', answer: false },
      { id: 'mt3', text: 'Você tem problemas de tireoide não controlados?', answer: false },
    ],
  },
  {
    category: 'mental_health',
    label: 'Saúde Mental',
    questions: [
      { id: 'mh1', text: 'Você tem diagnóstico de transtorno de ansiedade ou depressão?', answer: false },
      { id: 'mh2', text: 'Você toma medicação para condições de saúde mental?', answer: false },
      { id: 'mh3', text: 'Você tem ou teve transtorno alimentar?', answer: false },
    ],
  },
  {
    category: 'spinal',
    label: 'Coluna Vertebral',
    questions: [
      { id: 'sp1', text: 'Você tem hérnia de disco ou protrusão discal diagnosticada?', answer: false },
      { id: 'sp2', text: 'Você tem escoliose significativa ou outra deformidade da coluna?', answer: false },
      { id: 'sp3', text: 'Você já fez cirurgia na coluna?', answer: false },
    ],
  },
  {
    category: 'cancer',
    label: 'Histórico Oncológico',
    questions: [
      { id: 'ca1', text: 'Você está em tratamento ativo para câncer (quimioterapia, radioterapia)?', answer: false },
      { id: 'ca2', text: 'Você completou tratamento oncológico nos últimos 12 meses?', answer: false },
    ],
  },
  {
    category: 'pregnancy',
    label: 'Gravidez',
    questions: [
      { id: 'pg1', text: 'Você está grávida ou teve parto nos últimos 6 meses?', answer: false },
      { id: 'pg2', text: 'Seu médico recomendou restrições de atividade física durante a gravidez?', answer: false },
    ],
  },
  {
    category: 'other',
    label: 'Outras Condições',
    questions: [
      { id: 'ot1', text: 'Você tem alguma condição médica não mencionada acima que afeta sua capacidade de exercício?', answer: false },
      { id: 'ot2', text: 'Você foi hospitalizado nos últimos 12 meses por qualquer razão?', answer: false },
      { id: 'ot3', text: 'Você está tomando algum medicamento que causa sonolência ou tontura?', answer: false },
    ],
  },
];

// Risk level mapping: which categories elevate risk
export const HIGH_RISK_CATEGORIES: FollowUpCategory[] = [
  'cardiovascular',
  'neurological',
  'cancer',
];

export const INTERMEDIATE_RISK_CATEGORIES: FollowUpCategory[] = [
  'respiratory',
  'musculoskeletal',
  'metabolic',
  'spinal',
  'pregnancy',
];

export const LOW_RISK_CATEGORIES: FollowUpCategory[] = [
  'mental_health',
  'other',
];

// Given a set of follow-up categories that had "yes" answers, determine the highest risk
export function calculateRiskFromFollowUps(
  activeCategories: FollowUpCategory[],
  followUpAnswers: Record<string, Record<string, boolean>>
): { risk: ParQRiskLevel; restrictions: string[] } {
  const restrictions: string[] = [];
  let maxRisk: ParQRiskLevel = 'low';

  for (const category of activeCategories) {
    const answers = followUpAnswers[category];
    if (!answers) continue;

    const hasYes = Object.values(answers).some(Boolean);
    if (!hasYes) continue;

    // Map category to label for restrictions
    const block = PARQ_FOLLOWUP_CATEGORIES.find(b => b.category === category);
    if (block) {
      const yesQuestions = block.questions.filter(q => answers[q.id]);
      yesQuestions.forEach(q => restrictions.push(q.text));
    }

    if (HIGH_RISK_CATEGORIES.includes(category)) {
      maxRisk = 'high';
    } else if (INTERMEDIATE_RISK_CATEGORIES.includes(category) && maxRisk !== 'high') {
      maxRisk = 'intermediate';
    }
  }

  return { risk: maxRisk, restrictions };
}

// Map risk level to clearance status
export function riskToClearance(risk: ParQRiskLevel): 'cleared' | 'cleared_with_restrictions' | 'blocked' {
  switch (risk) {
    case 'low': return 'cleared';
    case 'intermediate': return 'cleared_with_restrictions';
    case 'high': return 'blocked';
  }
}

// Document type labels in PT-BR
export const DOCUMENT_TYPE_LABELS: Record<MedicalDocumentType, string> = {
  atestado_medico: 'Atestado Médico',
  exame_cardiologico: 'Exame Cardiológico',
  laudo_medico: 'Laudo Médico',
  exame_laboratorial: 'Exame Laboratorial',
  receita_medica: 'Receita Médica',
  liberacao_atividade: 'Liberação para Atividade Física',
  outros: 'Outros',
};

// Accepted MIME types for document upload
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
