/**
 * Chat Scripts for AICA Landing Page Demo
 *
 * Pre-defined conversation scripts for the interactive chat demo.
 * Each script simulates a realistic Vida (AICA's AI) interaction
 * with context cards showing cross-module intelligence.
 *
 * No auth, no Supabase — pure TypeScript data.
 * All text in Brazilian Portuguese.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface ChatContextDetail {
  label: string;
  value: string;
}

export interface ChatContext {
  icon: string;
  label: string;
  modules: string[];
  details: ChatContextDetail[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  context?: ChatContext;
  delay: number;
}

export interface ChatScript {
  id: string;
  label: string;
  messages: ChatMessage[];
}

// ─── Scripts ─────────────────────────────────────────────────────────

export const chatScripts: ChatScript[] = [
  {
    id: 'gastos',
    label: 'Meus gastos',
    messages: [
      {
        role: 'user',
        text: 'Como estao meus gastos esse mes?',
        delay: 0,
      },
      {
        role: 'assistant',
        text:
          'Ate agora em marco, voce gastou R$ 4.230 de um orcamento de R$ 7.100. ' +
          'Alimentacao esta 18% acima do planejado — foram R$ 1.340 vs. R$ 1.100 previstos. ' +
          'No ritmo atual, voce fecha o mes com saldo positivo de R$ 1.670. ' +
          'Quer que eu sugira ajustes no orcamento de alimentacao?',
        context: {
          icon: '💰',
          label: 'Finance',
          modules: ['Finance'],
          details: [
            { label: 'Gasto atual', value: 'R$ 4.230' },
            { label: 'Orcamento mensal', value: 'R$ 7.100' },
            { label: 'Categoria acima', value: 'Alimentacao (+18%)' },
            { label: 'Projecao de saldo', value: 'R$ 1.670' },
          ],
        },
        delay: 1500,
      },
    ],
  },
  {
    id: 'produtividade',
    label: 'Minha produtividade',
    messages: [
      {
        role: 'user',
        text: 'Como esta minha produtividade essa semana?',
        delay: 0,
      },
      {
        role: 'assistant',
        text:
          'Essa semana voce completou 12 de 15 tarefas — taxa de conclusao de 80%. ' +
          'Seu pico de foco foi terca-feira entre 9h e 12h, quando finalizou 4 tarefas seguidas. ' +
          'No Journey, registrou 5 momentos com emocao predominante de "Motivacao". ' +
          'Padroes mostram que voce rende 2.3x mais pela manha — considere bloquear tardes para reunioes.',
        context: {
          icon: '📊',
          label: 'Atlas + Journey',
          modules: ['Atlas', 'Journey'],
          details: [
            { label: 'Tarefas concluidas', value: '12/15 (80%)' },
            { label: 'Melhor dia', value: 'Terca-feira' },
            { label: 'Pico de foco', value: '09:00 - 12:00' },
            { label: 'Emocao predominante', value: 'Motivacao' },
            { label: 'Momentos registrados', value: '5 esta semana' },
          ],
        },
        delay: 1500,
      },
    ],
  },
  {
    id: 'eventos',
    label: 'Proximos eventos',
    messages: [
      {
        role: 'user',
        text: 'O que tenho agendado para amanha?',
        delay: 0,
      },
      {
        role: 'assistant',
        text:
          'Amanha voce tem 3 compromissos:\n\n' +
          '09:00 — Daily standup (30min)\n' +
          '11:00 — Mentoria com Carlos Mendes (1h)\n' +
          '15:00 — Workshop de IA (2h)\n\n' +
          'Voce tem uma janela livre de 12:00 as 14:30 — ideal para tarefas de foco profundo. ' +
          'Quer que eu bloqueie esse horario no calendario?',
        context: {
          icon: '📅',
          label: 'Agenda',
          modules: ['Agenda'],
          details: [
            { label: 'Compromissos', value: '3 eventos' },
            { label: 'Primeiro horario', value: '09:00 — Daily' },
            { label: 'Janela livre', value: '12:00 - 14:30' },
            { label: 'Duracao total', value: '3h30 em reunioes' },
          ],
        },
        delay: 1500,
      },
    ],
  },
  {
    id: 'padroes',
    label: 'Meus padroes',
    messages: [
      {
        role: 'user',
        text: 'Quais padroes emocionais voce percebe nos meus registros?',
        delay: 0,
      },
      {
        role: 'assistant',
        text:
          'Analisando seus ultimos 28 dias no Journey, identifiquei 3 padroes:\n\n' +
          '1. Segundas-feiras tem pico de ansiedade (aparece em 75% das segundas)\n' +
          '2. Quintas e sextas concentram seus melhores dias — motivacao e foco altos\n' +
          '3. Quando voce registra gratidao pela manha, a produtividade do dia sobe 40%\n\n' +
          'Sugestao: comecar segundas com 5 minutos de reflexao pode reduzir a ansiedade inicial.',
        context: {
          icon: '🧠',
          label: 'Journey',
          modules: ['Journey'],
          details: [
            { label: 'Periodo analisado', value: '28 dias' },
            { label: 'Momentos registrados', value: '156' },
            { label: 'Emocao mais frequente', value: 'Motivacao (42x)' },
            { label: 'Padrao mais forte', value: 'Gratidao → +40% produtividade' },
            { label: 'Ponto de atencao', value: 'Ansiedade nas segundas' },
          ],
        },
        delay: 1500,
      },
    ],
  },
];
