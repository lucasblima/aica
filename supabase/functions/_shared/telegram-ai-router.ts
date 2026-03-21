/**
 * Telegram AI Router — Natural Language → AICA Module Actions
 *
 * Uses Gemini 2.5 Flash function calling to route user messages from Telegram
 * into AICA module actions (Atlas tasks, Finance expenses, Journey moods, etc.).
 *
 * For casual conversation, Gemini replies directly without calling a function.
 * LGPD: never stores raw user text — only intent_summary (max 200 chars).
 *
 * @see model-router.ts for callAI pattern
 * @see health-tracker.ts for withHealthTracking wrapper
 * @issue #574 Phase 2
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { withHealthTracking } from "./health-tracker.ts";

// ============================================================================
// TYPES
// ============================================================================

type QueryResult<T = Record<string, unknown>> = Promise<{ data: T | null; error: { message: string } | null }>;
type QueryArrayResult<T = Record<string, unknown>> = Promise<{ data: T[] | null; error: { message: string } | null }>;

interface QueryBuilder {
  eq: (col: string, val: unknown) => QueryBuilder;
  neq: (col: string, val: unknown) => QueryBuilder;
  gt: (col: string, val: unknown) => QueryBuilder;
  gte: (col: string, val: unknown) => QueryBuilder;
  lt: (col: string, val: unknown) => QueryBuilder;
  lte: (col: string, val: unknown) => QueryBuilder;
  ilike: (col: string, val: string) => QueryBuilder;
  is: (col: string, val: unknown) => QueryBuilder;
  not: (col: string, op: string, val: unknown) => QueryBuilder;
  or: (filter: string) => QueryBuilder;
  order: (col: string, opts: Record<string, unknown>) => QueryBuilder;
  limit: (n: number) => QueryArrayResult;
  single: () => QueryResult;
}

type SupabaseClient = {
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => { select: (cols?: string) => { single: () => QueryResult } };
    select: (cols?: string) => QueryBuilder;
    update: (data: Record<string, unknown>) => QueryBuilder;
  };
  rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export interface AIRouterResult {
  reply: string;
  action?: string;
  actionData?: Record<string, unknown>;
  model: string;
  intentSummary: string;
}

interface ConversationMessage {
  role: 'user' | 'model';
  text: string;
}

// ============================================================================
// GEMINI FUNCTION DECLARATIONS
// ============================================================================

const FUNCTION_DECLARATIONS = [
  {
    name: 'create_task',
    description: 'Cria uma nova tarefa no modulo Atlas (gestao de tarefas). Use quando o usuario pedir para adicionar, criar, anotar ou lembrar de uma tarefa, to-do ou atividade.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Titulo da tarefa (max 200 caracteres)',
        },
        description: {
          type: 'STRING',
          description: 'Descricao opcional da tarefa',
        },
        priority: {
          type: 'STRING',
          description: 'Prioridade: urgent_important, important, urgent, neither',
          enum: ['urgent_important', 'important', 'urgent', 'neither'],
        },
        due_date: {
          type: 'STRING',
          description: 'Data de vencimento no formato YYYY-MM-DD (se mencionada)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'log_expense',
    description: 'Registra uma despesa ou gasto no modulo Finance. Use quando o usuario mencionar que gastou, pagou, comprou algo, ou registrar um valor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: {
          type: 'NUMBER',
          description: 'Valor em reais (BRL). Sempre positivo.',
        },
        description: {
          type: 'STRING',
          description: 'Descricao breve da despesa',
        },
        category: {
          type: 'STRING',
          description: 'Categoria da despesa',
          enum: ['alimentacao', 'transporte', 'moradia', 'saude', 'educacao', 'lazer', 'compras', 'servicos', 'outros'],
        },
        date: {
          type: 'STRING',
          description: 'Data da despesa no formato YYYY-MM-DD (default: hoje)',
        },
      },
      required: ['amount', 'description'],
    },
  },
  {
    name: 'log_mood',
    description: 'Registra o humor/sentimento do usuario no modulo Journey. Use quando o usuario falar como esta se sentindo, seu estado emocional, ou dar uma nota de humor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        score: {
          type: 'NUMBER',
          description: 'Nota de humor de 1 a 5 (1=pessimo, 5=otimo)',
        },
        note: {
          type: 'STRING',
          description: 'Nota breve sobre o humor (max 200 caracteres)',
        },
        emotions: {
          type: 'ARRAY',
          description: 'Lista de emocoes identificadas',
          items: { type: 'STRING' },
        },
      },
      required: ['score'],
    },
  },
  {
    name: 'create_event',
    description: 'Cria um evento ou compromisso no modulo Agenda. Use quando o usuario quiser agendar, marcar ou criar uma reuniao, evento ou compromisso.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Titulo do evento',
        },
        date: {
          type: 'STRING',
          description: 'Data do evento no formato YYYY-MM-DD',
        },
        time: {
          type: 'STRING',
          description: 'Horario do evento no formato HH:MM (24h)',
        },
        duration_minutes: {
          type: 'NUMBER',
          description: 'Duracao em minutos (default: 60)',
        },
        description: {
          type: 'STRING',
          description: 'Descricao opcional do evento',
        },
      },
      required: ['title', 'date'],
    },
  },
  {
    name: 'get_daily_summary',
    description: 'Retorna um resumo do dia do usuario (tarefas pendentes, eventos, humor). Use quando o usuario perguntar "como ta meu dia?", "o que tenho pra hoje?", "resumo do dia".',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: {
          type: 'STRING',
          description: 'Data para o resumo no formato YYYY-MM-DD (default: hoje)',
        },
      },
    },
  },
  {
    name: 'get_budget_status',
    description: 'Retorna o status financeiro do usuario (gastos do mes, orcamento). Use quando o usuario perguntar "quanto gastei?", "como ta meu financeiro?", "orcamento do mes".',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: {
          type: 'STRING',
          description: 'Mes para consulta no formato YYYY-MM (default: mes atual)',
        },
      },
    },
  },
  {
    name: 'get_moments_summary',
    description: 'Analisa os momentos registrados no modulo Journey (humor, emocoes, reflexoes). Use quando o usuario perguntar sobre seus momentos, emocoes recentes, padrao emocional, como tem se sentido, ou pedir analise do diario.',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: {
          type: 'NUMBER',
          description: 'Numero de dias para analisar (default: 7)',
        },
      },
    },
  },
  // --- Atlas: Task Management (expanded) ---
  {
    name: 'complete_task',
    description: 'Marca uma tarefa como concluida no modulo Atlas. Use quando o usuario disser que terminou, concluiu, completou ou fez uma tarefa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        task_title: { type: 'STRING', description: 'Titulo ou parte do titulo da tarefa a ser concluida' },
      },
      required: ['task_title'],
    },
  },
  {
    name: 'list_tasks_by_priority',
    description: 'Lista tarefas filtradas por prioridade (Eisenhower Matrix). Use quando o usuario perguntar "tarefas urgentes", "o que e prioritario", "lista de tarefas", ou pedir tarefas por importancia.',
    parameters: {
      type: 'OBJECT',
      properties: {
        priority: {
          type: 'STRING',
          description: 'Filtro de prioridade (opcional, sem filtro retorna todas pendentes)',
          enum: ['urgent_important', 'important', 'urgent', 'neither'],
        },
        limit: { type: 'NUMBER', description: 'Numero maximo de tarefas (default: 10)' },
      },
    },
  },
  {
    name: 'get_overdue_tasks',
    description: 'Lista tarefas atrasadas (vencidas). Use quando o usuario perguntar "o que esta atrasado?", "tarefas vencidas", "deadlines perdidos".',
    parameters: { type: 'OBJECT', properties: {} },
  },
  // --- Connections: Relationship Intelligence ---
  {
    name: 'search_contact',
    description: 'Busca informacoes sobre um contato na rede de conexoes. Use quando o usuario perguntar "quem e Joao?", "como esta Maria?", informacoes sobre uma pessoa, ou pedir dossie de um contato.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Nome ou parte do nome do contato' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_at_risk_contacts',
    description: 'Lista contatos que precisam de atencao (relacionamento em risco). Use quando o usuario perguntar "quem precisa de atencao?", "relacionamentos em risco", "com quem nao falo ha tempo".',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER', description: 'Numero de contatos (default: 5)' },
      },
    },
  },
  // --- Gamification & Journey ---
  {
    name: 'check_streak_status',
    description: 'Verifica o streak de consistencia do usuario (sistema compassivo 47/50 dias). Use quando o usuario perguntar "como esta meu streak?", "minha consistencia", "quantos dias seguidos?".',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'check_gamification_stats',
    description: 'Verifica pontos de consciencia (CP), posicao no ranking e nivel. Use quando o usuario perguntar "quantos pontos tenho?", "meu CP", "ranking", "meu nivel".',
    parameters: { type: 'OBJECT', properties: {} },
  },
  // --- Flux: Coach & Athletes ---
  {
    name: 'get_athlete_overview',
    description: 'Visao geral dos atletas: aderencia, status, modalidade. Para coaches. Use quando o usuario perguntar sobre atletas, aderencia, performance.',
    parameters: {
      type: 'OBJECT',
      properties: {
        athlete_name: { type: 'STRING', description: 'Nome do atleta (opcional, sem nome retorna todos)' },
      },
    },
  },
  {
    name: 'list_athlete_alerts',
    description: 'Lista alertas ativos dos atletas (fadiga, aderencia baixa, risco de lesao). Para coaches. Use quando perguntar "alertas?", "atleta em risco", "problemas nos treinos".',
    parameters: { type: 'OBJECT', properties: {} },
  },
  // --- Studio: Podcast ---
  {
    name: 'get_latest_episodes',
    description: 'Lista episodios recentes do podcast (Studio). Use quando o usuario perguntar sobre episodios, gravacoes, podcast, convidados.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'NUMBER', description: 'Numero de episodios (default: 5)' },
      },
    },
  },
  // --- Grants: Opportunities ---
  {
    name: 'get_open_opportunities',
    description: 'Lista editais e oportunidades de captacao com prazos abertos (Grants). Use quando o usuario perguntar sobre editais, oportunidades, prazos de submissao, captacao.',
    parameters: { type: 'OBJECT', properties: {} },
  },
];

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(userName: string): string {
  const today = new Date().toISOString().split('T')[0];
  return [
    'Voce e a AICA, assistente pessoal de vida integrada para brasileiros.',
    'Responda sempre em portugues (BR), de forma natural e amigavel.',
    'Roteie pedidos do usuario para a funcao do modulo correto.',
    'Para conversa casual, responda diretamente sem chamar funcoes.',
    'Seja conciso nas respostas (max 3-4 frases para conversa casual).',
    '',
    'Modulos disponiveis:',
    '- Atlas: tarefas, concluir tarefas, prioridades, tarefas atrasadas',
    '- Finance: gastos, despesas, orcamento, status financeiro',
    '- Journey: humor, sentimentos, momentos, analise emocional, diario',
    '- Connections: contatos, relacionamentos, dossie, quem precisa de atencao',
    '- Gamificacao: streak, pontos CP, XP, nivel, ranking',
    '- Flux: atletas, aderencia, alertas (para coaches)',
    '- Studio: episodios de podcast, gravacoes, convidados',
    '- Grants: editais abertos, oportunidades, prazos',
    '- Agenda: eventos, reunioes (via Google Calendar no app)',
    '',
    `Data de hoje: ${today}.`,
    `Nome do usuario: ${userName}.`,
  ].join('\n');
}

// ============================================================================
// CONVERSATION CONTEXT
// ============================================================================

async function fetchConversationContext(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
): Promise<ConversationMessage[]> {
  try {
    const { data } = await supabase
      .from('telegram_conversations')
      .select('context')
      .eq('user_id', userId)
      .single();

    if (data?.context && Array.isArray(data.context)) {
      // Return last 20 messages for context window
      return (data.context as ConversationMessage[]).slice(-20);
    }
  } catch {
    // No conversation history yet — that's fine
  }
  return [];
}

async function updateConversationContext(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  userMessage: string,
  aiReply: string,
): Promise<void> {
  try {
    // LGPD: store only intent summary, not raw text
    const userSummary = userMessage.substring(0, 200);
    const aiSummary = aiReply.substring(0, 200);

    const context = await fetchConversationContext(supabase, userId, chatId);
    context.push(
      { role: 'user', text: userSummary },
      { role: 'model', text: aiSummary },
    );

    // Keep only last 20 messages
    const trimmed = context.slice(-20);

    // Upsert conversation
    const { error: selectError, data: existing } = await supabase
      .from('telegram_conversations')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase
        .from('telegram_conversations')
        .update({
          context: trimmed,
          last_message_at: new Date().toISOString(),
          telegram_chat_id: Number(chatId),
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('telegram_conversations')
        .insert({
          user_id: userId,
          telegram_chat_id: Number(chatId),
          context: trimmed,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
    }
  } catch (err) {
    console.warn(`[telegram-ai-router] Failed to update context: ${(err as Error).message}`);
  }
}

// ============================================================================
// FUNCTION CALL EXECUTORS
// ============================================================================

async function executeCreateTask(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const { data, error } = await supabase
    .from('work_items')
    .insert({
      user_id: userId,
      title: params.title,
      description: params.description || null,
      priority: params.priority || 'neither',
      due_date: params.due_date || null,
      status: 'todo',
      source: 'telegram',
    })
    .select('id, title, priority')
    .single();

  if (error) throw new Error(`Erro ao criar tarefa: ${error.message}`);

  const priorityLabels: Record<string, string> = {
    urgent_important: 'Urgente + Importante',
    important: 'Importante',
    urgent: 'Urgente',
    neither: 'Normal',
  };
  const priorityLabel = priorityLabels[String(params.priority)] || 'Normal';

  return {
    reply: `Tarefa criada: "<b>${params.title}</b>" (${priorityLabel})${params.due_date ? ` — vence em ${params.due_date}` : ''}.`,
    data: data || {},
  };
}

async function executeLogExpense(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const today = new Date().toISOString().split('T')[0];
  const amount = Number(params.amount);

  const { data, error } = await supabase
    .from('finance_transactions')
    .insert({
      user_id: userId,
      amount: -Math.abs(amount), // expenses are negative
      description: String(params.description).substring(0, 200),
      category: params.category || 'outros',
      transaction_date: params.date || today,
      type: 'expense',
    })
    .select('id, amount, category')
    .single();

  if (error) throw new Error(`Erro ao registrar despesa: ${error.message}`);

  const formattedAmount = Math.abs(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return {
    reply: `Despesa registrada: ${formattedAmount} — "${params.description}"${params.category ? ` (${params.category})` : ''}.`,
    data: data || {},
  };
}

async function executeLogMood(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const score = Math.min(5, Math.max(1, Number(params.score)));

  const emotionText = Array.isArray(params.emotions)
    ? (params.emotions as string[]).join(', ')
    : '';

  // moments table CHECK constraint only allows type IN ('audio','text','both')
  // Store mood data using emotion + sentiment_data columns (see migration 20260302050000)
  const emotionLabel = score >= 4 ? 'feliz' : score === 3 ? 'neutro' : 'triste';

  const { data, error } = await supabase
    .from('moments')
    .insert({
      user_id: userId,
      type: 'text',
      content: String(params.note || `Check-in de humor via Telegram: ${score}/5`).substring(0, 200),
      emotion: emotionText || emotionLabel,
      sentiment_data: {
        mood_score: score,
        source: 'telegram',
        type: 'mood_checkin',
        emotions: Array.isArray(params.emotions) ? params.emotions : [],
      },
      quality_score: score / 5, // DECIMAL(3,2): normalize 1-5 to 0.20-1.00
      tags: ['telegram', 'mood_checkin'],
    })
    .select('id, quality_score')
    .single();

  if (error) throw new Error(`Erro ao registrar humor: ${error.message}`);

  const moodEmojis: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

  return {
    reply: `Humor registrado: ${moodEmojis[score] || '📝'} ${score}/5${params.note ? ` — "${String(params.note).substring(0, 100)}"` : ''}.`,
    data: data || {},
  };
}

async function executeCreateEvent(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const title = params.title as string;
  const date = params.date as string;
  const time = (params.time as string) || '09:00';
  const durationMinutes = (params.duration_minutes as number) || 60;
  const description = (params.description as string) || null;

  const startDateTime = `${date}T${time}:00`;
  const endDate = new Date(startDateTime);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);
  const endDateTime = endDate.toISOString();

  const { error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title,
      description,
      start_time: startDateTime,
      end_time: endDateTime,
      source: 'manual',
    });

  if (error) {
    console.error('[executeCreateEvent] Insert error:', error);
    return {
      reply: `Erro ao criar evento: ${error.message}`,
      data: { error: error.message },
    };
  }

  return {
    reply: `📅 Evento "<b>${title}</b>" agendado para ${date} as ${time} (${durationMinutes}min).`,
    data: { title, date, time, duration_minutes: durationMinutes },
  };
}

async function executeGetDailySummary(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const today = params.date || new Date().toISOString().split('T')[0];

  // Fetch pending tasks
  const { data: tasks } = await supabase
    .from('work_items')
    .select('title, priority, due_date')
    .eq('user_id', userId)
    .eq('status', 'todo')
    .order('created_at', { ascending: false })
    .limit(5);

  const taskCount = tasks?.length || 0;

  const lines = [`<b>Resumo do dia (${today}):</b>`, ''];

  if (taskCount > 0) {
    lines.push(`📋 <b>${taskCount} tarefa(s) pendente(s):</b>`);
    for (const task of tasks || []) {
      lines.push(`  • ${task.title}`);
    }
  } else {
    lines.push('📋 Nenhuma tarefa pendente.');
  }

  lines.push('');
  lines.push('📅 Para ver seus eventos, acesse aica.guru → Agenda.');

  return {
    reply: lines.join('\n'),
    data: { tasks: taskCount },
  };
}

async function executeGetBudgetStatus(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const now = new Date();
  const monthStr = String(params.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const startDate = `${monthStr}-01`;

  // Calculate actual last day of the month (avoids day-31 errors for short months)
  const [year, m] = monthStr.split('-').map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  // Fetch transactions for the month (filtered by date range)
  const { data: transactions } = await supabase
    .from('finance_transactions')
    .select('amount, category, type')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: false })
    .limit(100);

  let totalExpenses = 0;
  let totalIncome = 0;
  const categoryTotals: Record<string, number> = {};

  for (const tx of transactions || []) {
    const amount = Number(tx.amount);
    if (amount < 0) {
      totalExpenses += Math.abs(amount);
      const cat = String(tx.category || 'outros');
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(amount);
    } else {
      totalIncome += amount;
    }
  }

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const lines = [`<b>Status financeiro (${monthStr}):</b>`, ''];
  lines.push(`💰 Receitas: ${formatBRL(totalIncome)}`);
  lines.push(`💸 Despesas: ${formatBRL(totalExpenses)}`);
  lines.push(`📊 Saldo: ${formatBRL(totalIncome - totalExpenses)}`);

  // Top categories
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (sortedCategories.length > 0) {
    lines.push('');
    lines.push('<b>Top categorias:</b>');
    for (const [cat, total] of sortedCategories) {
      lines.push(`  • ${cat}: ${formatBRL(total)}`);
    }
  }

  return {
    reply: lines.join('\n'),
    data: { totalExpenses, totalIncome, balance: totalIncome - totalExpenses },
  };
}

async function executeGetMomentsSummary(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const days = Math.min(30, Math.max(1, Number(params.days) || 7));
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const { data: moments } = await supabase
    .from('moments')
    .select('type, content, emotion, quality_score, tags, created_at')
    .eq('user_id', userId)
    .gte('created_at', sinceStr)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!moments || moments.length === 0) {
    return {
      reply: `Nenhum momento registrado nos ultimos ${days} dias. Use o Journey no app ou envie como esta se sentindo aqui!`,
      data: {},
    };
  }

  // Aggregate stats
  const totalMoments = moments.length;
  let sumQuality = 0;
  let qualityCount = 0;
  const emotionCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  for (const m of moments) {
    // Quality score
    if (m.quality_score != null) {
      sumQuality += Number(m.quality_score);
      qualityCount++;
    }

    // Emotion tracking
    if (m.emotion) {
      const emotions = String(m.emotion).split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      for (const emo of emotions) {
        emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
      }
    }

    // Type counts
    const type = String(m.type || 'text');
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Tag counts
    if (Array.isArray(m.tags)) {
      for (const tag of m.tags) {
        if (tag && tag !== 'telegram') {
          tagCounts[String(tag)] = (tagCounts[String(tag)] || 0) + 1;
        }
      }
    }
  }

  const avgQuality = qualityCount > 0 ? (sumQuality / qualityCount).toFixed(1) : null;

  // Build reply
  const lines = [`<b>Analise dos ultimos ${days} dias:</b>`, ''];
  lines.push(`📊 <b>${totalMoments} momento(s)</b> registrado(s)`);

  if (avgQuality !== null) {
    // quality_score is stored as 0-1 in DB (DECIMAL(3,2)); convert to 1-5 for display
    const qualNum = parseFloat(avgQuality);
    const displayScore = qualNum <= 1 ? (qualNum * 5).toFixed(1) : parseFloat(avgQuality).toFixed(1);
    const displayNum = parseFloat(displayScore);
    const qualEmoji = displayNum >= 4 ? '😄' : displayNum >= 3 ? '🙂' : displayNum >= 2 ? '😕' : '😔';
    lines.push(`${qualEmoji} Qualidade media: <b>${displayScore}/5</b>`);
  }

  // Top emotions
  const sortedEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (sortedEmotions.length > 0) {
    lines.push('');
    lines.push('<b>Emocoes mais frequentes:</b>');
    for (const [emo, count] of sortedEmotions) {
      lines.push(`  • ${emo} (${count}x)`);
    }
  }

  // Types breakdown
  const typeLabels: Record<string, string> = {
    mood: '🎭 Humor',
    text: '📝 Texto',
    audio: '🎙️ Audio',
    photo: '📸 Foto',
  };

  if (Object.keys(typeCounts).length > 1) {
    lines.push('');
    lines.push('<b>Tipos de momento:</b>');
    for (const [type, count] of Object.entries(typeCounts)) {
      lines.push(`  • ${typeLabels[type] || type}: ${count}`);
    }
  }

  // Top tags
  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (sortedTags.length > 0) {
    lines.push('');
    lines.push('<b>Tags frequentes:</b>');
    lines.push(`  ${sortedTags.map(([t, c]) => `#${t} (${c}x)`).join(', ')}`);
  }

  // Recent moments preview
  const recentMoments = moments.slice(0, 3);
  if (recentMoments.length > 0) {
    lines.push('');
    lines.push('<b>Momentos recentes:</b>');
    for (const m of recentMoments) {
      const date = new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const preview = m.content ? String(m.content).substring(0, 60) : (m.emotion || m.type);
      lines.push(`  • ${date}: ${preview}`);
    }
  }

  return {
    reply: lines.join('\n'),
    data: {
      totalMoments,
      avgQuality: avgQuality ? parseFloat(avgQuality) : null,
      topEmotions: sortedEmotions.map(([e]) => e),
    },
  };
}

// ---- Atlas expanded ----

async function executeCompleteTask(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const searchTitle = String(params.task_title).toLowerCase();

  // Fetch pending tasks to find best match
  const { data: tasks } = await supabase
    .from('work_items')
    .select('id, title, priority')
    .eq('user_id', userId)
    .eq('status', 'todo')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!tasks || tasks.length === 0) {
    return { reply: 'Nenhuma tarefa pendente encontrada.', data: {} };
  }

  // Find best match by title (case-insensitive contains)
  const match = tasks.find((t: Record<string, unknown>) =>
    String(t.title).toLowerCase().includes(searchTitle),
  ) || tasks.find((t: Record<string, unknown>) =>
    searchTitle.includes(String(t.title).toLowerCase().substring(0, 10)),
  );

  if (!match) {
    const suggestions = tasks.slice(0, 3).map((t: Record<string, unknown>) => `  • ${t.title}`).join('\n');
    return {
      reply: `Nao encontrei tarefa com "${params.task_title}". Tarefas pendentes:\n${suggestions}`,
      data: {},
    };
  }

  const { error } = await supabase
    .from('work_items')
    .update({ is_completed: true, status: 'done', completed_at: new Date().toISOString() })
    .eq('id', match.id)
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(`Erro ao concluir tarefa: ${error.message}`);

  return {
    reply: `Tarefa concluida: "<b>${match.title}</b>" ✅`,
    data: { taskId: match.id },
  };
}

async function executeListTasksByPriority(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const limit = Math.min(20, Number(params.limit) || 10);

  let query = supabase
    .from('work_items')
    .select('title, priority, due_date, category')
    .eq('user_id', userId)
    .eq('status', 'todo');

  if (params.priority) {
    query = query.eq('priority', params.priority);
  }

  const { data: tasks } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!tasks || tasks.length === 0) {
    return { reply: params.priority
      ? `Nenhuma tarefa "${params.priority}" pendente.`
      : 'Nenhuma tarefa pendente.', data: {} };
  }

  const priorityEmojis: Record<string, string> = {
    urgent_important: '🔴', important: '🟡', urgent: '🟠', neither: '⚪',
  };

  const lines = [`<b>Tarefas pendentes (${tasks.length}):</b>`, ''];
  for (const t of tasks) {
    const emoji = priorityEmojis[String(t.priority)] || '📋';
    const due = t.due_date ? ` (vence ${t.due_date})` : '';
    lines.push(`${emoji} ${t.title}${due}`);
  }

  return { reply: lines.join('\n'), data: { count: tasks.length } };
}

async function executeGetOverdueTasks(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const today = new Date().toISOString().split('T')[0];

  const { data: tasks } = await supabase
    .from('work_items')
    .select('title, priority, due_date')
    .eq('user_id', userId)
    .eq('status', 'todo')
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .limit(15);

  if (!tasks || tasks.length === 0) {
    return { reply: 'Nenhuma tarefa atrasada! 🎉', data: {} };
  }

  const lines = [`<b>⚠️ ${tasks.length} tarefa(s) atrasada(s):</b>`, ''];
  for (const t of tasks) {
    const daysLate = Math.ceil((Date.now() - new Date(t.due_date).getTime()) / 86400000);
    lines.push(`  • ${t.title} — <i>${daysLate} dia(s) de atraso</i>`);
  }

  return { reply: lines.join('\n'), data: { count: tasks.length } };
}

// ---- Connections: Relationship Intelligence ----

async function executeSearchContact(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const searchName = String(params.name);

  const { data: contacts } = await supabase
    .from('contact_network')
    .select('id, name, whatsapp_name, relationship_type, health_score, sentiment_trend, dossier_summary, dossier_topics, dossier_pending_items, last_interaction_at, interaction_count')
    .eq('user_id', userId)
    .ilike('name', `%${searchName}%`)
    .limit(5);

  if (!contacts || contacts.length === 0) {
    // Try whatsapp_name
    const { data: wContacts } = await supabase
      .from('contact_network')
      .select('id, name, whatsapp_name, relationship_type, health_score, sentiment_trend, dossier_summary, dossier_topics, dossier_pending_items, last_interaction_at, interaction_count')
      .eq('user_id', userId)
      .ilike('whatsapp_name', `%${searchName}%`)
      .limit(5);

    if (!wContacts || wContacts.length === 0) {
      return { reply: `Nenhum contato encontrado com "${searchName}".`, data: {} };
    }
    return formatContactResult(wContacts);
  }

  return formatContactResult(contacts);
}

function formatContactResult(
  contacts: Array<Record<string, unknown>>,
): { reply: string; data: Record<string, unknown> } {
  if (contacts.length === 1) {
    const c = contacts[0];
    const name = c.name || c.whatsapp_name || 'Desconhecido';
    const healthEmoji = Number(c.health_score || 0) >= 70 ? '💚' :
      Number(c.health_score || 0) >= 40 ? '💛' : '❤️‍🩹';

    const lines = [`<b>${name}</b>`, ''];
    if (c.relationship_type) lines.push(`👤 ${c.relationship_type}`);
    if (c.health_score != null) lines.push(`${healthEmoji} Saude do relacionamento: <b>${c.health_score}/100</b>`);
    if (c.sentiment_trend) lines.push(`📈 Tendencia: ${c.sentiment_trend}`);
    if (c.interaction_count) lines.push(`💬 ${c.interaction_count} interacoes`);
    if (c.last_interaction_at) {
      const days = Math.ceil((Date.now() - new Date(String(c.last_interaction_at)).getTime()) / 86400000);
      lines.push(`🕐 Ultimo contato: ${days} dia(s) atras`);
    }
    if (c.dossier_summary) {
      lines.push('');
      lines.push(`<b>Resumo:</b> ${String(c.dossier_summary).substring(0, 300)}`);
    }
    if (Array.isArray(c.dossier_pending_items) && c.dossier_pending_items.length > 0) {
      lines.push('');
      lines.push('<b>Pendencias:</b>');
      for (const item of c.dossier_pending_items.slice(0, 3)) {
        lines.push(`  • ${item}`);
      }
    }

    return { reply: lines.join('\n'), data: { contactId: c.id } };
  }

  // Multiple results
  const lines = [`<b>${contacts.length} contato(s) encontrado(s):</b>`, ''];
  for (const c of contacts) {
    const name = c.name || c.whatsapp_name || 'Desconhecido';
    const healthEmoji = Number(c.health_score || 0) >= 70 ? '💚' :
      Number(c.health_score || 0) >= 40 ? '💛' : '❤️‍🩹';
    lines.push(`${healthEmoji} <b>${name}</b> — ${c.relationship_type || 'contato'}${c.health_score != null ? ` (${c.health_score}/100)` : ''}`);
  }

  return { reply: lines.join('\n'), data: { count: contacts.length } };
}

async function executeListAtRiskContacts(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const limit = Math.min(10, Number(params.limit) || 5);

  const { data: contacts } = await supabase
    .from('contact_network')
    .select('name, whatsapp_name, health_score, sentiment_trend, last_interaction_at, interaction_count')
    .eq('user_id', userId)
    .not('health_score', 'is', null)
    .lte('health_score', 50)
    .order('health_score', { ascending: true })
    .limit(limit);

  if (!contacts || contacts.length === 0) {
    return { reply: 'Nenhum contato em risco! Seus relacionamentos estao saudaveis. 💚', data: {} };
  }

  const lines = [`<b>❤️‍🩹 Contatos que precisam de atencao:</b>`, ''];
  for (const c of contacts) {
    const name = c.name || c.whatsapp_name || 'Desconhecido';
    const days = c.last_interaction_at
      ? Math.ceil((Date.now() - new Date(String(c.last_interaction_at)).getTime()) / 86400000)
      : null;
    lines.push(`  • <b>${name}</b> — saude ${c.health_score}/100${days ? ` (${days}d sem contato)` : ''}`);
  }
  lines.push('');
  lines.push('💡 Que tal enviar uma mensagem para alguem da lista?');

  return { reply: lines.join('\n'), data: { count: contacts.length } };
}

// ---- Gamification & Streak ----

async function executeCheckStreakStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const { data, error } = await supabase.rpc('get_streak_trend_stats', { p_user_id: userId });

  if (error || !data) {
    return { reply: 'Ainda nao ha dados de streak. Continue usando a AICA diariamente!', data: {} };
  }

  // RPC returns array with single row
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { reply: 'Ainda nao ha dados de streak. Continue usando a AICA diariamente!', data: {} };
  }

  const trend = row.current_trend || 0;
  const pct = row.trend_percentage || 0;
  const quality = row.trend_quality || 'needs_attention';
  const graceRemaining = row.grace_periods_remaining ?? 4;
  const isRecovering = row.is_recovering || false;
  const recoveryProgress = row.recovery_progress || 0;

  const qualityLabels: Record<string, string> = {
    excellent: '🌟 Excelente!',
    good: '💪 Bom!',
    moderate: '👍 Moderado',
    needs_attention: '⚠️ Precisa de atencao',
  };

  const lines = ['<b>🔥 Streak de Consistencia:</b>', ''];
  lines.push(`📊 <b>${trend}/50 dias</b> (${pct}%)`);
  lines.push(`${qualityLabels[quality] || quality}`);
  lines.push(`🛡️ Grace periods restantes: ${graceRemaining}/4`);

  if (isRecovering) {
    lines.push(`🔄 Em recuperacao: ${recoveryProgress}% concluido`);
  }

  if (pct >= 90) lines.push('\n🏆 Voce esta arrasando! Continue assim!');
  else if (pct >= 70) lines.push('\n💪 Otimo ritmo! Mantenha a consistencia.');
  else lines.push('\n💡 Cada dia conta. Use a AICA hoje para manter seu streak!');

  return { reply: lines.join('\n'), data: { trend, percentage: pct, quality } };
}

async function executeCheckGamificationStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  // Query user_stats for CP data
  const { data: stats } = await supabase
    .from('user_stats')
    .select('consciousness_points, experience_points, level')
    .eq('user_id', userId)
    .single();

  if (!stats) {
    return { reply: 'Seus dados de gamificacao ainda estao sendo calculados. Continue usando a AICA!', data: {} };
  }

  const cp = stats.consciousness_points as Record<string, unknown> | null;
  const totalCp = Number(cp?.total_cp || 0);
  const lifetimeCp = Number(cp?.lifetime_cp || 0);
  const xp = Number(stats.experience_points || 0);
  const level = Number(stats.level || 1);

  const lines = ['<b>🎮 Suas Estatisticas:</b>', ''];
  lines.push(`🧠 Pontos de Consciencia: <b>${totalCp} CP</b>`);
  if (lifetimeCp > totalCp) lines.push(`   (${lifetimeCp} CP acumulados ao longo do tempo)`);
  lines.push(`⭐ Experiencia: <b>${xp} XP</b>`);
  lines.push(`📈 Nivel: <b>${level}</b>`);

  // XP for next level (exponential: 1000 * 1.15^level)
  const xpForNext = Math.round(1000 * Math.pow(1.15, level));
  const xpProgress = Math.min(100, Math.round((xp / xpForNext) * 100));
  lines.push(`\n🎯 Proximo nivel: ${xpProgress}% (${xp}/${xpForNext} XP)`);

  // Try to get leaderboard position
  try {
    const { data: leaderboard } = await supabase.rpc('get_cp_leaderboard', { p_limit: 20 });
    if (Array.isArray(leaderboard)) {
      const myRank = leaderboard.find((r: Record<string, unknown>) => r.user_id === userId);
      if (myRank) {
        lines.push(`\n🏆 Ranking: #${myRank.rank} no leaderboard`);
      }
    }
  } catch {
    // Leaderboard lookup failed — not critical
  }

  return { reply: lines.join('\n'), data: { totalCp, xp, level } };
}

// ---- Flux: Coach & Athletes ----

async function executeGetAthleteOverview(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const { data, error } = await supabase.rpc('get_athletes_with_adherence', { p_user_id: userId });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return { reply: 'Nenhum atleta cadastrado no Flux.', data: {} };
  }

  let athletes = data as Array<Record<string, unknown>>;

  // Filter by name if provided
  if (params.athlete_name) {
    const search = String(params.athlete_name).toLowerCase();
    athletes = athletes.filter((a) => String(a.name).toLowerCase().includes(search));
    if (athletes.length === 0) {
      return { reply: `Nenhum atleta encontrado com "${params.athlete_name}".`, data: {} };
    }
  }

  if (athletes.length === 1) {
    const a = athletes[0];
    const adherenceEmoji = Number(a.adherence_rate) >= 80 ? '🟢' :
      Number(a.adherence_rate) >= 50 ? '🟡' : '🔴';

    const lines = [`<b>🏃 ${a.name}</b>`, ''];
    lines.push(`${adherenceEmoji} Aderencia: <b>${a.adherence_rate}%</b>`);
    lines.push(`🎯 Modalidade: ${a.modality || 'N/A'}`);
    lines.push(`📊 Nivel: ${a.level || 'N/A'}`);
    lines.push(`📋 Status: ${a.status}`);
    return { reply: lines.join('\n'), data: { athleteId: a.id } };
  }

  const lines = [`<b>🏃 ${athletes.length} Atleta(s):</b>`, ''];
  for (const a of athletes) {
    const adherenceEmoji = Number(a.adherence_rate) >= 80 ? '🟢' :
      Number(a.adherence_rate) >= 50 ? '🟡' : '🔴';
    lines.push(`${adherenceEmoji} <b>${a.name}</b> — ${a.adherence_rate}% aderencia (${a.modality || 'N/A'})`);
  }

  return { reply: lines.join('\n'), data: { count: athletes.length } };
}

async function executeListAthleteAlerts(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  // Get athletes for this coach first
  const { data: athleteData } = await supabase
    .from('athletes')
    .select('id, name')
    .eq('user_id', userId)
    .limit(50);

  if (!athleteData || athleteData.length === 0) {
    return { reply: 'Nenhum atleta cadastrado.', data: {} };
  }

  // Get unresolved alerts for these athletes
  const athleteIds = athleteData.map((a: Record<string, unknown>) => a.id);
  const athleteMap = new Map(athleteData.map((a: Record<string, unknown>) => [a.id, a.name]));

  // Query alerts - filter unresolved in JS since we can't do complex IN queries with the simplified type
  const { data: alerts } = await supabase
    .from('alerts')
    .select('id, athlete_id, alert_type, severity, message_preview, created_at, resolved_at')
    .eq('user_id', userId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(15);

  if (!alerts || alerts.length === 0) {
    return { reply: 'Nenhum alerta ativo! Todos os atletas estao bem. ✅', data: {} };
  }

  const severityEmojis: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '🟢',
  };
  const typeLabels: Record<string, string> = {
    adherence_low: 'Aderencia baixa',
    fatigue_critical: 'Fadiga critica',
    injury_risk: 'Risco de lesao',
    missed_workout: 'Treino perdido',
  };

  const lines = [`<b>⚠️ ${alerts.length} Alerta(s) Ativo(s):</b>`, ''];
  for (const a of alerts) {
    const athleteName = athleteMap.get(a.athlete_id) || 'Atleta';
    const emoji = severityEmojis[String(a.severity)] || '⚠️';
    const label = typeLabels[String(a.alert_type)] || a.alert_type;
    lines.push(`${emoji} <b>${athleteName}</b>: ${label}`);
    if (a.message_preview) lines.push(`   ${String(a.message_preview).substring(0, 80)}`);
  }

  return { reply: lines.join('\n'), data: { count: alerts.length } };
}

// ---- Studio: Podcast ----

async function executeGetLatestEpisodes(
  supabase: SupabaseClient,
  userId: string,
  params: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const limit = Math.min(10, Number(params.limit) || 5);

  const { data: episodes } = await supabase
    .from('podcast_episodes')
    .select('title, guest_name, status, scheduled_date, duration_minutes, episode_theme')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!episodes || episodes.length === 0) {
    return { reply: 'Nenhum episodio cadastrado no Studio.', data: {} };
  }

  const statusLabels: Record<string, string> = {
    draft: '📝 Rascunho', scheduled: '📅 Agendado', recording: '🎙️ Gravando',
    editing: '✂️ Editando', published: '✅ Publicado', recorded: '🎬 Gravado',
  };

  const lines = [`<b>🎙️ Ultimos Episodios (${episodes.length}):</b>`, ''];
  for (const ep of episodes) {
    const status = statusLabels[String(ep.status)] || ep.status;
    lines.push(`${status} <b>${ep.title}</b>`);
    if (ep.guest_name) lines.push(`   👤 Convidado: ${ep.guest_name}`);
    if (ep.scheduled_date) {
      const d = new Date(ep.scheduled_date).toLocaleDateString('pt-BR');
      lines.push(`   📅 ${d}`);
    }
  }

  return { reply: lines.join('\n'), data: { count: episodes.length } };
}

// ---- Grants: Opportunities ----

async function executeGetOpenOpportunities(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  const today = new Date().toISOString();

  const { data: opportunities } = await supabase
    .from('grant_opportunities')
    .select('title, funding_agency, submission_deadline, min_funding, max_funding, status')
    .eq('user_id', userId)
    .gt('submission_deadline', today)
    .neq('status', 'archived')
    .order('submission_deadline', { ascending: true })
    .limit(10);

  if (!opportunities || opportunities.length === 0) {
    return { reply: 'Nenhum edital aberto no momento.', data: {} };
  }

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const lines = [`<b>📋 Editais Abertos (${opportunities.length}):</b>`, ''];
  for (const op of opportunities) {
    const deadline = new Date(op.submission_deadline).toLocaleDateString('pt-BR');
    const daysLeft = Math.ceil((new Date(op.submission_deadline).getTime() - Date.now()) / 86400000);
    const urgency = daysLeft <= 7 ? '🔴' : daysLeft <= 30 ? '🟡' : '🟢';

    lines.push(`${urgency} <b>${op.title}</b>`);
    lines.push(`   🏛️ ${op.funding_agency || 'N/A'}`);
    if (op.max_funding) lines.push(`   💰 Ate ${formatBRL(Number(op.max_funding))}`);
    lines.push(`   📅 Prazo: ${deadline} (${daysLeft}d restantes)`);
    lines.push('');
  }

  return { reply: lines.join('\n'), data: { count: opportunities.length } };
}

// Function executor dispatch
async function executeFunctionCall(
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
  args: Record<string, unknown>,
): Promise<{ reply: string; data: Record<string, unknown> }> {
  switch (functionName) {
    case 'create_task':
      return executeCreateTask(supabase, userId, args);
    case 'log_expense':
      return executeLogExpense(supabase, userId, args);
    case 'log_mood':
      return executeLogMood(supabase, userId, args);
    case 'create_event':
      return executeCreateEvent(supabase, userId, args);
    case 'get_daily_summary':
      return executeGetDailySummary(supabase, userId, args);
    case 'get_budget_status':
      return executeGetBudgetStatus(supabase, userId, args);
    case 'get_moments_summary':
      return executeGetMomentsSummary(supabase, userId, args);
    case 'complete_task':
      return executeCompleteTask(supabase, userId, args);
    case 'list_tasks_by_priority':
      return executeListTasksByPriority(supabase, userId, args);
    case 'get_overdue_tasks':
      return executeGetOverdueTasks(supabase, userId);
    case 'search_contact':
      return executeSearchContact(supabase, userId, args);
    case 'list_at_risk_contacts':
      return executeListAtRiskContacts(supabase, userId, args);
    case 'check_streak_status':
      return executeCheckStreakStatus(supabase, userId);
    case 'check_gamification_stats':
      return executeCheckGamificationStats(supabase, userId);
    case 'get_athlete_overview':
      return executeGetAthleteOverview(supabase, userId, args);
    case 'list_athlete_alerts':
      return executeListAthleteAlerts(supabase, userId);
    case 'get_latest_episodes':
      return executeGetLatestEpisodes(supabase, userId, args);
    case 'get_open_opportunities':
      return executeGetOpenOpportunities(supabase, userId);
    default:
      return {
        reply: `Funcao "${functionName}" nao implementada ainda.`,
        data: {},
      };
  }
}

// ============================================================================
// INLINE KEYBOARD BUILDERS
// ============================================================================

export interface InlineKeyboardData {
  rows: Array<Array<{ text: string; callbackData: string }>>;
}

export function buildTaskPriorityKeyboard(taskId: string): InlineKeyboardData {
  return {
    rows: [
      [
        { text: '🔴 Urgente+Importante', callbackData: `task_priority:${taskId}:urgent_important` },
        { text: '🟡 Importante', callbackData: `task_priority:${taskId}:important` },
      ],
      [
        { text: '🟠 Urgente', callbackData: `task_priority:${taskId}:urgent` },
        { text: '⚪ Normal', callbackData: `task_priority:${taskId}:neither` },
      ],
    ],
  };
}

export function buildExpenseCategoryKeyboard(txId: string): InlineKeyboardData {
  return {
    rows: [
      [
        { text: '🍔 Alimentacao', callbackData: `expense_category:${txId}:alimentacao` },
        { text: '🚗 Transporte', callbackData: `expense_category:${txId}:transporte` },
      ],
      [
        { text: '🏠 Moradia', callbackData: `expense_category:${txId}:moradia` },
        { text: '🏥 Saude', callbackData: `expense_category:${txId}:saude` },
      ],
      [
        { text: '📚 Educacao', callbackData: `expense_category:${txId}:educacao` },
        { text: '🎮 Lazer', callbackData: `expense_category:${txId}:lazer` },
      ],
    ],
  };
}

export function buildMoodRatingKeyboard(): InlineKeyboardData {
  return {
    rows: [
      [
        { text: '😔 1', callbackData: 'mood_rating:1' },
        { text: '😕 2', callbackData: 'mood_rating:2' },
        { text: '😐 3', callbackData: 'mood_rating:3' },
        { text: '🙂 4', callbackData: 'mood_rating:4' },
        { text: '😄 5', callbackData: 'mood_rating:5' },
      ],
    ],
  };
}

// ============================================================================
// MAIN FUNCTION: Process Natural Language
// ============================================================================

/**
 * Process a natural language message from Telegram and route to AICA modules.
 *
 * 1. Builds conversation context from previous messages
 * 2. Calls Gemini with function declarations for each module action
 * 3. If Gemini returns a function call → execute against Supabase
 * 4. If Gemini returns text → return as direct reply
 *
 * @returns AIRouterResult with reply text and optional action metadata
 */
export async function processNaturalLanguage(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  text: string,
  userName: string,
): Promise<AIRouterResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Fetch conversation context
  const history = await fetchConversationContext(supabase, userId, chatId);

  // Build Gemini chat contents from history
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    });
  }
  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text }],
  });

  const systemPrompt = buildSystemPrompt(userName);

  // Call Gemini with function declarations via health tracking
  const result = await withHealthTracking(
    { functionName: 'telegram-webhook', actionName: 'telegram_ai_route' },
    supabase as unknown as Parameters<typeof withHealthTracking>[1],
    async () => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });

      return await model.generateContent({ contents });
    },
  );

  const response = result.response;
  const candidate = response.candidates?.[0];
  const intentSummary = text.substring(0, 200);

  // Check if Gemini returned a function call
  const functionCall = candidate?.content?.parts?.find(
    (part: { functionCall?: unknown }) => part.functionCall,
  )?.functionCall;

  if (functionCall) {
    const fnName = functionCall.name;
    const fnArgs = functionCall.args || {};

    console.log(`[telegram-ai-router] Function call: ${fnName}(${JSON.stringify(fnArgs)})`);

    try {
      const execResult = await executeFunctionCall(supabase, userId, fnName, fnArgs as Record<string, unknown>);

      // Update conversation context
      await updateConversationContext(supabase, userId, chatId, intentSummary, execResult.reply);

      return {
        reply: execResult.reply,
        action: fnName,
        actionData: execResult.data,
        model: 'gemini-2.5-flash',
        intentSummary,
      };
    } catch (execError) {
      const errMsg = (execError as Error).message;
      console.error(`[telegram-ai-router] Function execution error: ${errMsg}`);

      const errorReply = `Desculpe, tive um problema ao processar seu pedido. Tente novamente em alguns instantes.`;
      await updateConversationContext(supabase, userId, chatId, intentSummary, errorReply);

      return {
        reply: errorReply,
        action: fnName,
        model: 'gemini-2.5-flash',
        intentSummary,
      };
    }
  }

  // No function call — Gemini replied with text (casual conversation)
  const replyText = candidate?.content?.parts
    ?.filter((part: { text?: string }) => part.text)
    ?.map((part: { text?: string }) => part.text)
    ?.join('') || 'Desculpe, nao consegui processar sua mensagem. Tente novamente.';

  // Update conversation context
  await updateConversationContext(supabase, userId, chatId, intentSummary, replyText.substring(0, 200));

  return {
    reply: replyText,
    model: 'gemini-2.5-flash',
    intentSummary,
  };
}

// ============================================================================
// VOICE MESSAGE PROCESSING
// ============================================================================

/**
 * Process a voice message from Telegram.
 * Downloads the OGG audio, sends to Gemini for transcription + intent,
 * then routes through the same NLP pipeline.
 */
export async function processVoiceMessage(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  fileId: string,
  userName: string,
): Promise<AIRouterResult> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not configured');
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  // 1. Get file path from Telegram
  const fileInfoResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
  );
  const fileInfo = await fileInfoResponse.json();

  if (!fileInfo.ok || !fileInfo.result?.file_path) {
    throw new Error('Failed to get voice file info from Telegram');
  }

  // 2. Download the OGG file
  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
  const audioResponse = await fetch(fileUrl);
  const audioBytes = new Uint8Array(await audioResponse.arrayBuffer());

  // 3. Convert to base64 for Gemini
  const base64Audio = base64Encode(audioBytes);

  // 4. Send to Gemini for transcription + intent extraction
  const genAI = new GoogleGenerativeAI(apiKey);

  const transcriptionResult = await withHealthTracking(
    { functionName: 'telegram-webhook', actionName: 'telegram_voice_transcribe' },
    supabase as unknown as Parameters<typeof withHealthTracking>[1],
    async () => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      });

      return await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'audio/ogg',
                data: base64Audio,
              },
            },
            {
              text: 'Transcreva este audio em portugues (BR). Retorne APENAS o texto transcrito, sem formatacao adicional.',
            },
          ],
        }],
      });
    },
  );

  const transcribedText = transcriptionResult.response.text()?.trim();

  if (!transcribedText) {
    return {
      reply: 'Desculpe, nao consegui entender o audio. Tente enviar uma mensagem de texto.',
      model: 'gemini-2.5-flash',
      intentSummary: '[voice:transcription_failed]',
    };
  }

  console.log(`[telegram-ai-router] Voice transcribed: "${transcribedText.substring(0, 100)}"`);

  // 5. Route the transcribed text through the NLP pipeline
  const nlpResult = await processNaturalLanguage(supabase, userId, chatId, transcribedText, userName);

  // Prepend transcription note to reply
  nlpResult.reply = `🎙️ <i>"${transcribedText.substring(0, 150)}"</i>\n\n${nlpResult.reply}`;
  nlpResult.intentSummary = `[voice] ${transcribedText.substring(0, 180)}`;

  return nlpResult;
}
