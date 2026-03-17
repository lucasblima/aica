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
        text: 'Como estão meus gastos esse mês?',
        delay: 0,
      },
      {
        role: 'assistant',
        text:
          'Até agora em março, você gastou R$ 4.230 de um orçamento de R$ 7.100. ' +
          'Alimentação está 18% acima do planejado — foram R$ 1.340 vs. R$ 1.100 previstos. ' +
          'No ritmo atual, você fecha o mês com saldo positivo de R$ 1.670. ' +
          'Quer que eu sugira ajustes no orçamento de alimentação?',
        context: {
          icon: '💰',
          label: 'Finance',
          modules: ['Finance'],
          details: [
            { label: 'Gasto atual', value: 'R$ 4.230' },
            { label: 'Orçamento mensal', value: 'R$ 7.100' },
            { label: 'Categoria acima', value: 'Alimentação (+18%)' },
            { label: 'Projeção de saldo', value: 'R$ 1.670' },
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
        text: 'Como está minha produtividade essa semana?',
        delay: 0,
      },
      {
        role: 'assistant',
        text:
          'Essa semana você completou 12 de 15 tarefas — taxa de conclusão de 80%. ' +
          'Seu pico de foco foi terça-feira entre 9h e 12h, quando finalizou 4 tarefas seguidas. ' +
          'No Journey, registrou 5 momentos com emoção predominante de "Motivação". ' +
          'Padrões mostram que você rende 2.3x mais pela manhã — considere bloquear tardes para reuniões.',
        context: {
          icon: '📊',
          label: 'Atlas + Journey',
          modules: ['Atlas', 'Journey'],
          details: [
            { label: 'Tarefas concluídas', value: '12/15 (80%)' },
            { label: 'Melhor dia', value: 'Terça-feira' },
            { label: 'Pico de foco', value: '09:00 - 12:00' },
            { label: 'Emoção predominante', value: 'Motivação' },
            { label: 'Momentos registrados', value: '5 esta semana' },
          ],
        },
        delay: 1500,
      },
    ],
  },
  {
    id: 'eventos',
    label: 'Próximos eventos',
    messages: [
      {
        role: 'user',
        text: 'O que tenho agendado para amanhã?',
        delay: 0,
      },
      {
        role: 'assistant',
        text:
          'Amanhã você tem 3 compromissos:\n\n' +
          '09:00 — Daily standup (30min)\n' +
          '11:00 — Mentoria com Carlos Mendes (1h)\n' +
          '15:00 — Workshop de IA (2h)\n\n' +
          'Você tem uma janela livre de 12:00 às 14:30 — ideal para tarefas de foco profundo. ' +
          'Quer que eu bloqueie esse horário no calendário?',
        context: {
          icon: '📅',
          label: 'Agenda',
          modules: ['Agenda'],
          details: [
            { label: 'Compromissos', value: '3 eventos' },
            { label: 'Primeiro horário', value: '09:00 — Daily' },
            { label: 'Janela livre', value: '12:00 - 14:30' },
            { label: 'Duração total', value: '3h30 em reuniões' },
          ],
        },
        delay: 1500,
      },
    ],
  },
  {
    id: 'padrões',
    label: 'Meus padrões',
    messages: [
      {
        role: 'user',
        text: 'Quais padrões emocionais você percebe nos meus registros?',
        delay: 0,
      },
      {
        role: 'assistant',
        text:
          'Analisando seus últimos 28 dias no Journey, identifiquei 3 padrões:\n\n' +
          '1. Segundas-feiras têm pico de ansiedade (aparece em 75% das segundas)\n' +
          '2. Quintas e sextas concentram seus melhores dias — motivação e foco altos\n' +
          '3. Quando você registra gratidão pela manhã, a produtividade do dia sobe 40%\n\n' +
          'Sugestão: começar segundas com 5 minutos de reflexão pode reduzir a ansiedade inicial.',
        context: {
          icon: '🧠',
          label: 'Journey',
          modules: ['Journey'],
          details: [
            { label: 'Período analisado', value: '28 dias' },
            { label: 'Momentos registrados', value: '156' },
            { label: 'Emoção mais frequente', value: 'Motivação (42x)' },
            { label: 'Padrão mais forte', value: 'Gratidão → +40% produtividade' },
            { label: 'Ponto de atenção', value: 'Ansiedade nas segundas' },
          ],
        },
        delay: 1500,
      },
    ],
  },
];
