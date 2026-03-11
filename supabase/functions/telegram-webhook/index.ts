/**
 * Telegram Webhook Edge Function
 * Issue #574: Telegram Bot Integration — Phase 1 + Phase 2
 *
 * Receives Telegram Bot API updates, validates the webhook secret,
 * normalizes the message via the channel adapter, routes to command
 * handlers, and logs all interactions.
 *
 * Phase 1 — Commands:
 * /start        — Guest account creation + LGPD consent
 * /help         — Command list (Portuguese)
 * /status       — Account status (guest vs full)
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
// HELPER: Send text response (auto-threads to Forum topic if present)
// ============================================================================

async function reply(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  text: string,
  options?: Partial<OutboundMessage>,
): Promise<void> {
  await tg.sendMessage({
    chatId: msg.chat.chatId,
    text,
    parseMode: 'HTML',
    messageThreadId: msg.chat.messageThreadId,
    ...options,
  })
}

// ============================================================================
// GUEST ACCOUNT CREATION
// ============================================================================

async function createGuestAccount(
  supabase: SupabaseClient,
  telegramId: number,
  firstName: string,
  username?: string,
): Promise<string> {
  // Check if account already exists (prevent duplicates)
  const { data: existingUser } = await supabase
    .rpc('get_telegram_user', { p_telegram_id: telegramId })

  if (existingUser && existingUser.length > 0) {
    return existingUser[0].user_id
  }

  const syntheticEmail = `tg_${telegramId}@telegram.aica.guru`

  // Create Supabase Auth user with synthetic email
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: syntheticEmail,
    email_confirm: true,
    user_metadata: {
      telegram_id: telegramId,
      first_name: firstName,
      source: 'telegram_bot',
    },
  })

  // C2 fix: Handle race condition — if another /start created the user concurrently,
  // look up the existing auth user by email instead of failing
  if (authError) {
    if (authError.message?.includes('already been registered') || authError.message?.includes('duplicate')) {
      // Race condition: another request created this user. Re-check the link table.
      const { data: raceUser } = await supabase
        .rpc('get_telegram_user', { p_telegram_id: telegramId })
      if (raceUser && raceUser.length > 0) {
        return raceUser[0].user_id
      }
      // Auth user exists but link row not yet created by the concurrent request.
      // A retry will succeed once the other request completes the insert.
      throw new Error(`Guest account created by concurrent request but link not yet visible. Retry /start.`)
    }
    throw new Error(`Failed to create guest account: ${authError.message}`)
  }

  if (!authUser?.user) {
    throw new Error('Failed to create guest account: no user returned')
  }

  // C1 fix: Check insert result and clean up orphaned auth user on failure
  const { error: insertError } = await supabase.from('user_telegram_links').insert({
    user_id: authUser.user.id,
    telegram_id: telegramId,
    telegram_username: username || null,
    telegram_first_name: firstName,
    status: 'linked',
    consent_given: false,
    linked_at: new Date().toISOString(),
  })

  if (insertError) {
    // Clean up orphaned auth user to prevent stuck state
    console.error(`[telegram-webhook] Link insert failed, cleaning up auth user: ${insertError.message}`)
    await supabase.auth.admin.deleteUser(authUser.user.id)
    throw new Error(`Failed to link telegram account: ${insertError.message}`)
  }

  return authUser.user.id
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

async function handleStart(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
): Promise<void> {
  const name = msg.sender.firstName || 'usuario'
  const telegramId = Number(msg.sender.channelUserId)

  // Create guest account or get existing user
  let userId: string
  try {
    userId = await createGuestAccount(
      supabase,
      telegramId,
      msg.sender.firstName || 'usuario',
      msg.sender.username || undefined,
    )
  } catch (err) {
    console.error(`[telegram-webhook] Guest account creation failed: ${(err as Error).message}`)
    await reply(tg, msg, '❌ Erro ao criar conta. Tente novamente em alguns instantes.')
    return
  }

  // Show welcome message with LGPD consent inline buttons
  await reply(tg, msg, [
    `Ola, <b>${name}</b>! 👋`,
    '',
    'Eu sou a <b>AICA</b> — seu Sistema Operacional de Vida Integrada.',
    '',
    'Criei uma conta para voce! Para continuar, preciso da sua autorizacao para processar mensagens com IA.',
    '',
    '📋 <b>Dados coletados:</b> ID Telegram, resumo de mensagens',
    '🤖 <b>Processamento:</b> IA analisa para executar acoes',
    '🗑️ <b>Retencao:</b> Historico de 30 dias',
  ].join('\n'), {
    inlineKeyboard: {
      rows: [
        [
          { text: '✅ Aceitar e Continuar', callbackData: 'consent_accept' },
          { text: '❌ Recusar', callbackData: 'consent_reject' },
        ],
        [
          { text: '📜 Ver Politica Completa', url: 'https://aica.guru/privacy' },
        ],
      ],
    },
  })
}

async function handleHelp(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
): Promise<void> {
  await reply(tg, msg, [
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
    // Check if user has a synthetic email (guest account from Telegram)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.user_id)
    const isSyntheticEmail = !authError && authUser?.user?.email?.endsWith('@telegram.aica.guru') || false
    const accountType = authError
      ? '⚠️ Conta (status indisponivel)'
      : isSyntheticEmail ? '📱 Conta Telegram (convidado)' : '🌐 Conta AICA completa'

    await reply(tg, msg, [
      '✅ <b>Conta ativa</b>',
      '',
      `Tipo: ${accountType}`,
      `Usuario: @${user.telegram_username || 'N/A'}`,
      `Consentimento LGPD: ${user.consent_given ? '✅ Concedido' : '⚠️ Pendente'}`,
      '',
      ...(isSyntheticEmail
        ? ['💡 Acesse <b>aica.guru</b> para configurar email e senha.', '']
        : []),
      'Use /desvincular para remover a vinculacao.',
    ].join('\n'))
  } else {
    await reply(tg, msg, [
      '❌ <b>Conta nao encontrada</b>',
      '',
      'Use /start para criar sua conta e comecar a usar a AICA!',
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
    await reply(tg, msg,
      '✅ Sua conta ja esta vinculada! Use /status para ver detalhes ou /desvincular para remover.'
    )
    return
  }

  const code = msg.content.commandArgs?.trim().toUpperCase()

  if (!code || code.length !== 6) {
    await reply(tg, msg, [
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
    await reply(tg, msg,
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
    await reply(tg, msg,
      '❌ Erro ao vincular conta. Tente novamente ou entre em contato com o suporte.'
    )
    return
  }

  // Send LGPD consent request
  await reply(tg, msg, [
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
          { text: '✅ Aceitar e Continuar', callbackData: 'consent_accept' },
          { text: '❌ Recusar', callbackData: 'consent_reject' },
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
    await reply(tg, msg, '❌ Sua conta nao esta vinculada.')
    return
  }

  await reply(tg, msg, [
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
  await reply(tg, msg, [
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
    await reply(tg, msg,
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

  await reply(tg, msg, [
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
    await reply(tg, msg, '❌ Conta nao vinculada. Nao ha dados para excluir.')
    return
  }

  await reply(tg, msg, [
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

  // Route by callback data (userId resolved from telegramId, never from callback string)
  if (data === 'consent_accept' || data.startsWith('consent_accept:')) {
    await supabase.rpc('grant_telegram_consent', {
      p_telegram_id: telegramId,
      p_scope: ['messages', 'notifications', 'ai_processing'],
    })
    await reply(tg, msg, [
      '✅ <b>Consentimento registrado!</b>',
      '',
      'Pronto! Agora voce pode conversar comigo naturalmente. Experimente:',
      '',
      '• "Adiciona tarefa: revisar proposta"',
      '• "Gastei R$50 no almoco"',
      '• "Como ta meu dia?"',
      '',
      'Use /help para ver todos os comandos.',
    ].join('\n'))

  } else if (data === 'consent_reject' || data.startsWith('consent_reject:')) {
    await reply(tg, msg, [
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
    await reply(tg, msg,
      '✅ Conta desvinculada. Use /start se quiser vincular novamente.'
    )

  } else if (data === 'unlink_cancel') {
    await reply(tg, msg, '👍 Operacao cancelada. Sua conta permanece vinculada.')

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
    await reply(tg, msg, [
      '✅ <b>Dados excluidos com sucesso.</b>',
      '',
      'Seus dados do Telegram foram removidos da AICA.',
      'Use /start se quiser vincular novamente no futuro.',
    ].join('\n'))

  } else if (data === 'delete_data_cancel') {
    await reply(tg, msg, '👍 Operacao cancelada. Seus dados permanecem intactos.')

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
          .eq('user_id', userId)
        const priorityLabels: Record<string, string> = {
          urgent_important: 'Urgente + Importante',
          important: 'Importante',
          urgent: 'Urgente',
          neither: 'Normal',
        }
        await reply(tg, msg,
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
          .eq('user_id', userId)
        await reply(tg, msg,
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
        // moments table CHECK constraint only allows type IN ('audio','text','both')
        // Store mood data using emotion + sentiment_data columns (see migration 20260302050000)
        const emotionLabel = score >= 4 ? 'feliz' : score === 3 ? 'neutro' : 'triste'
        await supabase
          .from('moments')
          .insert({
            user_id: userId,
            type: 'text',
            content: `Check-in de humor via Telegram: ${score}/5`,
            emotion: emotionLabel,
            sentiment_data: {
              mood_score: score,
              source: 'telegram',
              type: 'mood_checkin',
            },
            quality_score: score / 5, // DECIMAL(3,2): normalize 1-5 to 0.20-1.00
            tags: ['telegram', 'mood_checkin'],
          })
        const moodEmojis: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
        await reply(tg, msg,
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
      await handleStart(tg, msg, supabase)
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
      await reply(tg, msg,
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
        await tg.sendTypingAction(message.chat.chatId, message.chat.messageThreadId)

        result.command = await routeCommand(tg, message, supabase)
        result.processed = true

      } else if (message.content.type === 'callback_query') {
        await handleCallbackQuery(tg, message, supabase)
        result.processed = true

      } else if (message.content.type === 'text') {
        // Phase 2: AI-powered natural language processing
        await tg.sendTypingAction(message.chat.chatId, message.chat.messageThreadId)

        if (!aicaUserId) {
          // User not linked — prompt to create account via /start
          await reply(tg, message,
            'Use /start para criar sua conta e comecar a usar a AICA!'
          )
          result.processed = true
        } else {
          // Check LGPD consent before AI processing
          const consentGiven = userData?.[0]?.consent_given
          if (!consentGiven) {
            await reply(tg, message, [
              '⚠️ Preciso da sua autorizacao para processar mensagens com IA.',
              '',
              'Use /privacidade para ver a politica de dados.',
            ].join('\n'), {
              inlineKeyboard: {
                rows: [[
                  { text: '✅ Autorizar', callbackData: 'consent_accept' },
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

            await reply(tg, message, aiResult.reply, keyboard)
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
        await tg.sendTypingAction(message.chat.chatId, message.chat.messageThreadId)

        if (!aicaUserId) {
          await reply(tg, message,
            'Use /start para criar sua conta e comecar a usar a AICA!'
          )
          result.processed = true
        } else {
          const consentGiven = userData?.[0]?.consent_given
          if (!consentGiven) {
            await reply(tg, message, [
              '⚠️ Preciso da sua autorizacao para processar mensagens com IA.',
              '',
              'Use /privacidade para ver a politica de dados.',
            ].join('\n'), {
              inlineKeyboard: {
                rows: [[
                  { text: '✅ Autorizar', callbackData: 'consent_accept' },
                  { text: '📜 Politica', url: 'https://aica.guru/privacy' },
                ]],
              },
            })
            result.processed = true
          } else if (!message.content.voiceFileId) {
            await reply(tg, message,
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

              await reply(tg, message, aiResult.reply, keyboard)
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
              await reply(tg, message,
                '❌ Desculpe, tive um problema ao processar o audio. Tente enviar uma mensagem de texto.'
              )
              result.processed = false
            }
          }
        }

      } else {
        // Unsupported message type
        await reply(tg, message,
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
