/**
 * Telegram Webhook Edge Function
 * Issue #574: Telegram Bot Integration — Phase 1 + Phase 2
 *
 * Receives Telegram Bot API updates, validates the webhook secret,
 * normalizes the message via the channel adapter, routes to command
 * handlers, and logs all interactions.
 *
 * Phase 1 — Commands:
 * /start        — Welcome + linking instructions
 * /help         — Command list (Portuguese)
 * /status       — Account link status
 * /vincular     — Link Telegram to AICA via one-time code
 * /desvincular  — Unlink account (with confirmation)
 * /privacidade  — LGPD info + data rights
 * /meus_dados   — Export user data (LGPD access)
 * /apagar_dados — Request data deletion (LGPD erasure)
 *
 * Phase 2 — AI Integration:
 * Text messages  → Gemini function calling → AICA module actions
 * Voice messages → Gemini multimodal transcription → NLP pipeline
 * Callbacks      → task_priority, expense_category, mood_rating
 *
 * Pattern: stripe-webhook (validate → route → handle → return 200)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import { TelegramAdapter } from "../_shared/telegram-adapter.ts"
import type { UnifiedMessage, OutboundMessage } from "../_shared/channel-adapter.ts"
import {
  processNaturalLanguage,
  processVoiceMessage,
  buildTaskPriorityKeyboard,
  buildExpenseCategoryKeyboard,
  buildMoodRatingKeyboard,
} from "../_shared/telegram-ai-router.ts"

// ============================================================================
// TYPES
// ============================================================================

type SupabaseClient = ReturnType<typeof createClient>

interface WebhookResult {
  received: boolean
  processed: boolean
  command?: string
  action?: string
  error?: string
}

// ============================================================================
// TELEGRAM ADAPTER (singleton)
// ============================================================================

let adapter: TelegramAdapter | null = null

function getAdapter(): TelegramAdapter {
  if (!adapter) {
    adapter = new TelegramAdapter()
  }
  return adapter
}

// ============================================================================
// MESSAGE LOGGING
// ============================================================================

async function logMessage(
  supabase: SupabaseClient,
  message: UnifiedMessage,
  userId: string | null,
  status: string,
  durationMs?: number,
  errorMsg?: string,
  aiMeta?: { intentSummary?: string; action?: string; model?: string },
): Promise<void> {
  try {
    await supabase.from('telegram_message_log').insert({
      telegram_update_id: message.rawUpdateId ? Number(message.rawUpdateId) : null,
      telegram_chat_id: Number(message.chat.chatId),
      user_id: userId,
      direction: 'inbound',
      message_type: message.content.type,
      // LGPD: never store raw text — only command name, intent summary, or message type
      intent_summary: aiMeta?.intentSummary
        || message.content.command
        || `[${message.content.type}]`,
      command: message.content.command || null,
      ai_action: aiMeta?.action || null,
      ai_model: aiMeta?.model || null,
      processing_status: status,
      processing_duration_ms: durationMs || null,
      error_message: errorMsg || null,
    })
  } catch (err) {
    // Logging should never break the main flow
    console.warn(`[telegram-webhook] Failed to log message: ${(err as Error).message}`)
  }
}

// ============================================================================
// HELPER: Send text response
// ============================================================================

async function reply(
  tg: TelegramAdapter,
  chatId: string,
  text: string,
  options?: Partial<OutboundMessage>,
): Promise<void> {
  await tg.sendMessage({
    chatId,
    text,
    parseMode: 'HTML',
    ...options,
  })
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

async function handleStart(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
): Promise<void> {
  const name = msg.sender.firstName || 'usuario'
  await reply(tg, msg.chat.chatId, [
    `Ola, <b>${name}</b>! 👋`,
    '',
    'Eu sou a <b>AICA</b> — seu Sistema Operacional de Vida Integrada.',
    '',
    'Para comecar, vincule sua conta AICA ao Telegram:',
    '',
    '1. Acesse <b>aica.guru</b> → Conexoes → Telegram',
    '2. Clique em "Vincular Telegram" para gerar um codigo',
    '3. Envie <code>/vincular CODIGO</code> aqui',
    '',
    'Use /help para ver todos os comandos disponiveis.',
  ].join('\n'))
}

async function handleHelp(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
): Promise<void> {
  await reply(tg, msg.chat.chatId, [
    '<b>Comandos disponiveis:</b>',
    '',
    '/start — Boas-vindas e instrucoes',
    '/help — Lista de comandos',
    '/status — Status da vinculacao',
    '/vincular <code>CODIGO</code> — Vincular conta AICA',
    '/desvincular — Desvincular conta',
    '',
    '<b>Privacidade (LGPD):</b>',
    '/privacidade — Politica de privacidade',
    '/meus_dados — Exportar seus dados',
    '/apagar_dados — Solicitar exclusao de dados',
    '',
    '<b>Voce tambem pode conversar naturalmente:</b>',
    '• "Adiciona tarefa: revisar proposta"',
    '• "Gastei R$50 no almoco"',
    '• "To me sentindo bem hoje"',
    '• "Agenda reuniao amanha as 14h"',
    '• "Como ta meu dia?"',
    '• "Quanto gastei esse mes?"',
    '• Ou envie um audio! 🎙️',
  ].join('\n'))
}

async function handleStatus(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
): Promise<void> {
  const telegramId = Number(msg.sender.channelUserId)

  const { data } = await supabase
    .rpc('get_telegram_user', { p_telegram_id: telegramId })

  if (data && data.length > 0) {
    const user = data[0]
    await reply(tg, msg.chat.chatId, [
      '✅ <b>Conta vinculada</b>',
      '',
      `Usuario: @${user.telegram_username || 'N/A'}`,
      `Consentimento LGPD: ${user.consent_given ? '✅ Concedido' : '⚠️ Pendente'}`,
      '',
      'Use /desvincular para remover a vinculacao.',
    ].join('\n'))
  } else {
    await reply(tg, msg.chat.chatId, [
      '❌ <b>Conta nao vinculada</b>',
      '',
      'Para vincular, acesse aica.guru → Conexoes → Telegram',
      'e siga as instrucoes, ou use /start para mais detalhes.',
    ].join('\n'))
  }
}

async function handleVincular(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
): Promise<void> {
  // Check if already linked — prevent repeated consent dialogs
  const telegramIdCheck = Number(msg.sender.channelUserId)
  const { data: existingLink } = await supabase
    .rpc('get_telegram_user', { p_telegram_id: telegramIdCheck })
  if (existingLink && existingLink.length > 0) {
    await reply(tg, msg.chat.chatId,
      '✅ Sua conta ja esta vinculada! Use /status para ver detalhes ou /desvincular para remover.'
    )
    return
  }

  const code = msg.content.commandArgs?.trim().toUpperCase()

  if (!code || code.length !== 6) {
    await reply(tg, msg.chat.chatId, [
      '⚠️ Use o formato: <code>/vincular CODIGO</code>',
      '',
      'O codigo tem 6 caracteres e pode ser gerado em:',
      'aica.guru → Conexoes → Telegram → Vincular',
    ].join('\n'))
    return
  }

  // Look up the code
  const { data: linkData } = await supabase
    .rpc('get_telegram_link_by_code', { p_code: code })

  if (!linkData || linkData.length === 0) {
    await reply(tg, msg.chat.chatId,
      '❌ Codigo invalido ou expirado. Gere um novo codigo em aica.guru → Conexoes → Telegram.'
    )
    return
  }

  const link = linkData[0]

  // Link the account
  const telegramId = Number(msg.sender.channelUserId)
  const { data: linkId } = await supabase.rpc('link_telegram_account', {
    p_user_id: link.user_id,
    p_telegram_id: telegramId,
    p_username: msg.sender.username || null,
    p_first_name: msg.sender.firstName || null,
  })

  if (!linkId) {
    await reply(tg, msg.chat.chatId,
      '❌ Erro ao vincular conta. Tente novamente ou entre em contato com o suporte.'
    )
    return
  }

  // Send LGPD consent request
  await reply(tg, msg.chat.chatId, [
    '✅ <b>Conta vinculada com sucesso!</b>',
    '',
    'Para usar a AICA pelo Telegram, preciso da sua autorizacao:',
    '',
    '📋 <b>Dados coletados:</b> ID Telegram, mensagens enviadas ao bot',
    '🤖 <b>Processamento:</b> IA analisa suas mensagens para executar acoes',
    '🌐 <b>Transferencia:</b> Mensagens transitam pelos servidores do Telegram',
    '🗑️ <b>Retencao:</b> Historico de 30 dias, depois apagado',
  ].join('\n'), {
    inlineKeyboard: {
      rows: [
        [
          { text: '✅ Aceitar e Continuar', callbackData: `consent_accept:${link.user_id}` },
          { text: '❌ Recusar', callbackData: `consent_reject:${link.user_id}` },
        ],
        [
          { text: '📜 Ver Politica Completa', url: 'https://aica.guru/privacy' },
        ],
      ],
    },
  })
}

async function handleDesvincular(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
): Promise<void> {
  const telegramId = Number(msg.sender.channelUserId)
  const { data } = await supabase.rpc('get_telegram_user', { p_telegram_id: telegramId })

  if (!data || data.length === 0) {
    await reply(tg, msg.chat.chatId, '❌ Sua conta nao esta vinculada.')
    return
  }

  await reply(tg, msg.chat.chatId, [
    '⚠️ <b>Tem certeza que deseja desvincular sua conta AICA?</b>',
    '',
    'Voce deixara de receber notificacoes e nao podera usar comandos.',
  ].join('\n'), {
    inlineKeyboard: {
      rows: [[
        { text: '✅ Sim, desvincular', callbackData: `unlink_confirm:${data[0].user_id}` },
        { text: '❌ Cancelar', callbackData: 'unlink_cancel' },
      ]],
    },
  })
}

async function handlePrivacidade(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
): Promise<void> {
  await reply(tg, msg.chat.chatId, [
    '🔒 <b>Privacidade e Protecao de Dados (LGPD)</b>',
    '',
    'A AICA segue a Lei Geral de Protecao de Dados (LGPD).',
    '',
    '<b>Seus direitos:</b>',
    '• /meus_dados — Exportar todos os seus dados',
    '• /apagar_dados — Solicitar exclusao de dados',
    '',
    '<b>Dados coletados via Telegram:</b>',
    '• ID e username do Telegram',
    '• Resumo das intencoes das mensagens (texto bruto NAO e armazenado)',
    '• Historico de interacoes (30 dias)',
    '',
    '<b>Base legal:</b> Consentimento (Art. 7°, I, LGPD)',
  ].join('\n'), {
    inlineKeyboard: {
      rows: [[
        { text: '📜 Politica Completa', url: 'https://aica.guru/privacy' },
        { text: '📧 Contato DPO', url: 'mailto:privacidade@aica.guru' },
      ]],
    },
  })
}

async function handleMeusDados(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
): Promise<void> {
  const telegramId = Number(msg.sender.channelUserId)
  const { data: userData } = await supabase
    .rpc('get_telegram_user', { p_telegram_id: telegramId })

  if (!userData || userData.length === 0) {
    await reply(tg, msg.chat.chatId,
      '❌ Conta nao vinculada. Seus dados serao exportados apos vincular sua conta.'
    )
    return
  }

  // Get user's telegram link data
  const { data: linkData } = await supabase
    .from('user_telegram_links')
    .select('*')
    .eq('user_id', userData[0].user_id)
    .single()

  // Get message count
  const { count: msgCount } = await supabase
    .from('telegram_message_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userData[0].user_id)

  await reply(tg, msg.chat.chatId, [
    '📋 <b>Seus dados na AICA (Telegram)</b>',
    '',
    `<b>Telegram ID:</b> ${telegramId}`,
    `<b>Username:</b> @${linkData?.telegram_username || 'N/A'}`,
    `<b>Vinculado em:</b> ${linkData?.linked_at ? new Date(linkData.linked_at).toLocaleDateString('pt-BR') : 'N/A'}`,
    `<b>Consentimento:</b> ${linkData?.consent_given ? 'Sim' : 'Nao'}`,
    `<b>Mensagens registradas:</b> ${msgCount || 0}`,
    '',
    'Para exportar todos os seus dados AICA (incluindo outros modulos),',
    'acesse aica.guru → Configuracoes → Exportar Dados.',
  ].join('\n'))
}

async function handleApagarDados(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
): Promise<void> {
  const telegramId = Number(msg.sender.channelUserId)
  const { data } = await supabase.rpc('get_telegram_user', { p_telegram_id: telegramId })

  if (!data || data.length === 0) {
    await reply(tg, msg.chat.chatId, '❌ Conta nao vinculada. Nao ha dados para excluir.')
    return
  }

  await reply(tg, msg.chat.chatId, [
    '⚠️ <b>Solicitar exclusao de dados</b>',
    '',
    'Isso ira apagar:',
    '• Vinculacao Telegram ↔ AICA',
    '• Historico de mensagens do Telegram',
    '• Contexto de conversas',
    '',
    '<b>Dados em outros modulos AICA nao serao afetados.</b>',
    'Para exclusao completa, acesse aica.guru → Configuracoes.',
  ].join('\n'), {
    inlineKeyboard: {
      rows: [[
        { text: '🗑️ Confirmar exclusao', callbackData: `delete_data_confirm:${data[0].user_id}` },
        { text: '❌ Cancelar', callbackData: 'delete_data_cancel' },
      ]],
    },
  })
}

// ============================================================================
// CALLBACK QUERY HANDLERS
// ============================================================================

async function handleCallbackQuery(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
): Promise<void> {
  const data = msg.content.callbackData
  if (!data) return

  // Acknowledge the callback
  if (msg.content.callbackQueryId) {
    await tg.answerCallbackQuery!(msg.content.callbackQueryId)
  }

  // SECURITY: Resolve user from telegram_id (trusted), never from callback_data (attacker-controlled)
  const telegramId = Number(msg.sender.channelUserId)

  // Route by callback prefix
  if (data.startsWith('consent_accept:')) {
    await supabase.rpc('grant_telegram_consent', {
      p_telegram_id: telegramId,
      p_scope: ['messages', 'notifications', 'ai_processing'],
    })
    await reply(tg, msg.chat.chatId, [
      '✅ <b>Consentimento registrado!</b>',
      '',
      'Agora voce pode interagir com a AICA pelo Telegram.',
      'Use /help para ver os comandos disponiveis.',
    ].join('\n'))

  } else if (data.startsWith('consent_reject:')) {
    await reply(tg, msg.chat.chatId, [
      '❌ Consentimento recusado.',
      '',
      'Sua conta permanece vinculada, mas a AICA nao processara',
      'suas mensagens ate que voce conceda autorizacao.',
      'Use /privacidade para mais informacoes.',
    ].join('\n'))

  } else if (data.startsWith('unlink_confirm:')) {
    await supabase
      .from('user_telegram_links')
      .update({ status: 'unlinked', updated_at: new Date().toISOString() })
      .eq('telegram_id', telegramId)
    await reply(tg, msg.chat.chatId,
      '✅ Conta desvinculada. Use /start se quiser vincular novamente.'
    )

  } else if (data === 'unlink_cancel') {
    await reply(tg, msg.chat.chatId, '👍 Operacao cancelada. Sua conta permanece vinculada.')

  } else if (data.startsWith('delete_data_confirm:')) {
    // Resolve user_id from telegram_id for data deletion
    const { data: userData } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const userId = userData?.[0]?.user_id
    if (userId) {
      await supabase.from('telegram_message_log').delete().eq('user_id', userId)
      await supabase.from('telegram_conversations').delete().eq('user_id', userId)
      await supabase.from('user_telegram_links').delete().eq('telegram_id', telegramId)
    }
    await reply(tg, msg.chat.chatId, [
      '✅ <b>Dados excluidos com sucesso.</b>',
      '',
      'Seus dados do Telegram foram removidos da AICA.',
      'Use /start se quiser vincular novamente no futuro.',
    ].join('\n'))

  } else if (data === 'delete_data_cancel') {
    await reply(tg, msg.chat.chatId, '👍 Operacao cancelada. Seus dados permanecem intactos.')

  // Phase 2: Module interaction callbacks
  } else if (data.startsWith('task_priority:')) {
    const parts = data.split(':')
    const taskId = parts[1]
    const priority = parts[2]
    if (taskId && priority) {
      const { data: userData } = await supabase
        .rpc('get_telegram_user', { p_telegram_id: telegramId })
      const userId = userData?.[0]?.user_id
      if (userId) {
        await supabase
          .from('work_items')
          .update({ priority })
          .eq('id', taskId)
        const priorityLabels: Record<string, string> = {
          urgent_important: 'Urgente + Importante',
          important: 'Importante',
          urgent: 'Urgente',
          neither: 'Normal',
        }
        await reply(tg, msg.chat.chatId,
          `✅ Prioridade atualizada para: <b>${priorityLabels[priority] || priority}</b>`
        )
      }
    }

  } else if (data.startsWith('expense_category:')) {
    const parts = data.split(':')
    const txId = parts[1]
    const category = parts[2]
    if (txId && category) {
      const { data: userData } = await supabase
        .rpc('get_telegram_user', { p_telegram_id: telegramId })
      const userId = userData?.[0]?.user_id
      if (userId) {
        await supabase
          .from('finance_transactions')
          .update({ category })
          .eq('id', txId)
        await reply(tg, msg.chat.chatId,
          `✅ Categoria atualizada para: <b>${category}</b>`
        )
      }
    }

  } else if (data.startsWith('mood_rating:')) {
    const score = Number(data.split(':')[1])
    if (score >= 1 && score <= 5) {
      const { data: userData } = await supabase
        .rpc('get_telegram_user', { p_telegram_id: telegramId })
      const userId = userData?.[0]?.user_id
      if (userId) {
        await supabase
          .from('moments')
          .insert({
            user_id: userId,
            type: 'mood',
            mood_score: score,
            content: '',
            source: 'telegram',
          })
        const moodEmojis: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
        await reply(tg, msg.chat.chatId,
          `✅ Humor registrado: ${moodEmojis[score]} ${score}/5`
        )
      }
    }
  }
}

// ============================================================================
// COMMAND ROUTER
// ============================================================================

async function routeCommand(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
): Promise<string> {
  const command = msg.content.command?.toLowerCase()

  switch (command) {
    case '/start':
      await handleStart(tg, msg)
      return 'start'
    case '/help':
      await handleHelp(tg, msg)
      return 'help'
    case '/status':
      await handleStatus(tg, msg, supabase)
      return 'status'
    case '/vincular':
      await handleVincular(tg, msg, supabase)
      return 'vincular'
    case '/desvincular':
      await handleDesvincular(tg, msg, supabase)
      return 'desvincular'
    case '/privacidade':
      await handlePrivacidade(tg, msg)
      return 'privacidade'
    case '/meus_dados':
      await handleMeusDados(tg, msg, supabase)
      return 'meus_dados'
    case '/apagar_dados':
      await handleApagarDados(tg, msg, supabase)
      return 'apagar_dados'
    default:
      await reply(tg, msg.chat.chatId,
        `Comando desconhecido: <code>${command}</code>\nUse /help para ver os comandos disponiveis.`
      )
      return 'unknown_command'
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const startTime = Date.now()
  const tg = getAdapter()

  try {
    // 1. Validate webhook secret
    if (!tg.validateWebhook(req)) {
      console.error('[telegram-webhook] Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Invalid secret token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request body
    const body = await req.json()

    // 3. Normalize via channel adapter
    const message = tg.normalizeInbound(body)
    if (!message) {
      // Unsupported update type — acknowledge silently
      return new Response(
        JSON.stringify({ received: true, processed: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. Initialize Supabase client (service role for webhook operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 5. Resolve AICA user (if linked)
    const telegramId = Number(message.sender.channelUserId)
    const { data: userData } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const aicaUserId = userData?.[0]?.user_id || null

    const result: WebhookResult = {
      received: true,
      processed: false,
    }

    try {
      // 6. Route by message type
      if (message.content.type === 'command') {
        // Send typing indicator
        await tg.sendTypingAction(message.chat.chatId)

        result.command = await routeCommand(tg, message, supabase)
        result.processed = true

      } else if (message.content.type === 'callback_query') {
        await handleCallbackQuery(tg, message, supabase)
        result.processed = true

      } else if (message.content.type === 'text') {
        // Phase 2: AI-powered natural language processing
        await tg.sendTypingAction(message.chat.chatId)

        if (!aicaUserId) {
          // User not linked — prompt to link first
          await reply(tg, message.chat.chatId, [
            '❌ Para usar a AICA, vincule sua conta primeiro.',
            '',
            'Acesse <b>aica.guru</b> → Conexoes → Telegram',
            'e use /vincular <code>CODIGO</code> para conectar.',
          ].join('\n'))
          result.processed = true
        } else {
          // Check LGPD consent before AI processing
          const consentGiven = userData?.[0]?.consent_given
          if (!consentGiven) {
            await reply(tg, message.chat.chatId, [
              '⚠️ Preciso da sua autorizacao para processar mensagens com IA.',
              '',
              'Use /privacidade para ver a politica de dados.',
            ].join('\n'), {
              inlineKeyboard: {
                rows: [[
                  { text: '✅ Autorizar', callbackData: `consent_accept:${aicaUserId}` },
                  { text: '📜 Politica', url: 'https://aica.guru/privacy' },
                ]],
              },
            })
            result.processed = true
          } else {
            // Process with AI router
            const firstName = message.sender.firstName || 'usuario'
            const aiResult = await processNaturalLanguage(
              supabase, aicaUserId, message.chat.chatId, message.content.text || '', firstName,
            )

            // Build inline keyboard if action produced an entity
            let keyboard: Partial<OutboundMessage> = {}
            if (aiResult.action === 'create_task' && aiResult.actionData?.id) {
              keyboard = { inlineKeyboard: buildTaskPriorityKeyboard(String(aiResult.actionData.id)) }
            } else if (aiResult.action === 'log_expense' && aiResult.actionData?.id) {
              keyboard = { inlineKeyboard: buildExpenseCategoryKeyboard(String(aiResult.actionData.id)) }
            }

            await reply(tg, message.chat.chatId, aiResult.reply, keyboard)
            result.action = aiResult.action
            result.processed = true

            // Enhanced logging with AI metadata
            const durationMs = Date.now() - startTime
            await logMessage(supabase, message, aicaUserId, 'completed', durationMs, undefined, {
              intentSummary: aiResult.intentSummary,
              action: aiResult.action,
              model: aiResult.model,
            })
            // Skip the default log at the end since we already logged
            return new Response(
              JSON.stringify(result),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
        }

      } else if (message.content.type === 'voice') {
        // Phase 2: Voice message processing via Gemini multimodal
        await tg.sendTypingAction(message.chat.chatId)

        if (!aicaUserId) {
          await reply(tg, message.chat.chatId, [
            '❌ Para usar a AICA, vincule sua conta primeiro.',
            '',
            'Acesse <b>aica.guru</b> → Conexoes → Telegram',
            'e use /vincular <code>CODIGO</code> para conectar.',
          ].join('\n'))
          result.processed = true
        } else {
          const consentGiven = userData?.[0]?.consent_given
          if (!consentGiven) {
            await reply(tg, message.chat.chatId, [
              '⚠️ Preciso da sua autorizacao para processar mensagens com IA.',
              '',
              'Use /privacidade para ver a politica de dados.',
            ].join('\n'), {
              inlineKeyboard: {
                rows: [[
                  { text: '✅ Autorizar', callbackData: `consent_accept:${aicaUserId}` },
                  { text: '📜 Politica', url: 'https://aica.guru/privacy' },
                ]],
              },
            })
            result.processed = true
          } else if (!message.content.voiceFileId) {
            await reply(tg, message.chat.chatId,
              '❌ Nao consegui processar o audio. Tente enviar novamente.'
            )
            result.processed = false
          } else {
            const firstName = message.sender.firstName || 'usuario'
            try {
              const aiResult = await processVoiceMessage(
                supabase, aicaUserId, message.chat.chatId, message.content.voiceFileId, firstName,
              )

              let keyboard: Partial<OutboundMessage> = {}
              if (aiResult.action === 'create_task' && aiResult.actionData?.id) {
                keyboard = { inlineKeyboard: buildTaskPriorityKeyboard(String(aiResult.actionData.id)) }
              } else if (aiResult.action === 'log_expense' && aiResult.actionData?.id) {
                keyboard = { inlineKeyboard: buildExpenseCategoryKeyboard(String(aiResult.actionData.id)) }
              }

              await reply(tg, message.chat.chatId, aiResult.reply, keyboard)
              result.action = aiResult.action
              result.processed = true

              const durationMs = Date.now() - startTime
              await logMessage(supabase, message, aicaUserId, 'completed', durationMs, undefined, {
                intentSummary: aiResult.intentSummary,
                action: aiResult.action,
                model: aiResult.model,
              })
              return new Response(
                JSON.stringify(result),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            } catch (voiceErr) {
              console.error(`[telegram-webhook] Voice processing error: ${(voiceErr as Error).message}`)
              await reply(tg, message.chat.chatId,
                '❌ Desculpe, tive um problema ao processar o audio. Tente enviar uma mensagem de texto.'
              )
              result.processed = false
            }
          }
        }

      } else {
        // Unsupported message type
        await reply(tg, message.chat.chatId,
          'Este tipo de mensagem ainda nao e suportado. Use /help para ver os comandos.'
        )
        result.processed = false
      }

      // 7. Log the interaction
      const durationMs = Date.now() - startTime
      await logMessage(supabase, message, aicaUserId, 'completed', durationMs)

    } catch (handlerError) {
      const err = handlerError as Error
      console.error(`[telegram-webhook] Handler error: ${err.message}`)
      result.error = err.message

      // Log failure
      const durationMs = Date.now() - startTime
      await logMessage(supabase, message, aicaUserId, 'failed', durationMs, err.message)
    }

    // Always return 200 to Telegram (prevent retries)
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const err = error as Error
    console.error(`[telegram-webhook] Error: ${err.message}`)

    // Return 200 even for unexpected errors (Telegram will retry on non-2xx)
    return new Response(
      JSON.stringify({ received: true, processed: false, error: err.message }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
