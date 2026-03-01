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
import { withHealthTracking } from "./health-tracker.ts";

// ============================================================================
// TYPES
// ============================================================================

type QueryResult<T = Record<string, unknown>> = Promise<{ data: T | null; error: { message: string } | null }>;
type QueryArrayResult<T = Record<string, unknown>> = Promise<{ data: T[] | null; error: { message: string } | null }>;

interface QueryBuilder {
  eq: (col: string, val: unknown) => QueryBuilder;
  gte: (col: string, val: unknown) => QueryBuilder;
  lte: (col: string, val: unknown) => QueryBuilder;
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
    '- Atlas: tarefas, to-dos, atividades',
    '- Finance: gastos, despesas, orcamento',
    '- Journey: humor, sentimentos, momentos',
    '- Agenda: eventos, reunioes, compromissos',
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
      source: 'telegram',
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

  const { data, error } = await supabase
    .from('moments')
    .insert({
      user_id: userId,
      type: 'mood',
      content: String(params.note || '').substring(0, 200),
      mood_score: score,
      emotions: params.emotions || [],
      source: 'telegram',
    })
    .select('id, mood_score')
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
  // Assume BRT (-03:00) as default timezone for AICA users
  const startTime = params.time ? `${params.date}T${params.time}:00-03:00` : `${params.date}T09:00:00-03:00`;
  const durationMinutes = Number(params.duration_minutes) || 60;

  // Calculate end time
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title: params.title,
      description: params.description || null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      source: 'telegram',
    })
    .select('id, title, start_time')
    .single();

  if (error) throw new Error(`Erro ao criar evento: ${error.message}`);

  const timeStr = params.time || '09:00';

  return {
    reply: `Evento criado: "<b>${params.title}</b>" em ${params.date} as ${timeStr} (${durationMinutes}min).`,
    data: data || {},
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

  // Fetch today's events (filter by date range)
  const { data: events } = await supabase
    .from('calendar_events')
    .select('title, start_time')
    .eq('user_id', userId)
    .gte('start_time', `${today}T00:00:00`)
    .lte('start_time', `${today}T23:59:59`)
    .order('start_time', { ascending: true })
    .limit(5);

  const taskCount = tasks?.length || 0;
  const eventCount = events?.length || 0;

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

  if (eventCount > 0) {
    lines.push(`📅 <b>${eventCount} evento(s):</b>`);
    for (const event of events || []) {
      const time = event.start_time ? new Date(String(event.start_time)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      lines.push(`  • ${time} — ${event.title}`);
    }
  } else {
    lines.push('📅 Nenhum evento agendado.');
  }

  return {
    reply: lines.join('\n'),
    data: { tasks: taskCount, events: eventCount },
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

  const lines = [`<b>Status financeiro (${month}):</b>`, ''];
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
  const base64Audio = btoa(String.fromCharCode(...audioBytes));

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
