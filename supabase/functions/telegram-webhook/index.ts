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
import type { AIRouterResult } from "../_shared/telegram-ai-router.ts"

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
// RATE LIMITING (#894)
// In-memory sliding window per chat_id. Limits: 20 msgs/min, 5 msgs/10s burst.
// Resets on cold start (acceptable — rate limiting targets sustained abuse).
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60_000   // 1 minute window
const RATE_LIMIT_MAX = 20             // max messages per window
const BURST_WINDOW_MS = 10_000        // 10 second burst window
const BURST_MAX = 5                   // max messages per burst window
const CLEANUP_INTERVAL_MS = 300_000   // cleanup stale entries every 5 min

interface RateLimitEntry {
  timestamps: number[]
}

const rateLimitMap = new Map<string, RateLimitEntry>()
let lastCleanup = Date.now()

function isRateLimited(chatId: string): { limited: boolean; retryAfterMs?: number } {
  const now = Date.now()

  // Periodic cleanup to prevent memory growth
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now
    for (const [key, entry] of rateLimitMap) {
      if (entry.timestamps.length === 0 ||
          now - entry.timestamps[entry.timestamps.length - 1] > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key)
      }
    }
  }

  let entry = rateLimitMap.get(chatId)
  if (!entry) {
    entry = { timestamps: [] }
    rateLimitMap.set(chatId, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS)

  // Check burst limit (short window)
  const recentBurst = entry.timestamps.filter(t => now - t < BURST_WINDOW_MS)
  if (recentBurst.length >= BURST_MAX) {
    const oldestBurst = recentBurst[0]
    return { limited: true, retryAfterMs: BURST_WINDOW_MS - (now - oldestBurst) }
  }

  // Check sustained limit (full window)
  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = entry.timestamps[0]
    return { limited: true, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - oldest) }
  }

  // Allow — record this timestamp
  entry.timestamps.push(now)
  return { limited: false }
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
// EMAIL VALIDATION
// ============================================================================

const EMAIL_REGEX = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  if (email.endsWith('@telegram.aica.guru')) return false // reject synthetic emails
  return EMAIL_REGEX.test(email)
}

/**
 * Extract email from text, including spoken Portuguese patterns.
 * Handles: "joao arroba gmail ponto com", "joao @ gmail . com", etc.
 */
function extractEmailFromText(text: string): string | null {
  if (!text) return null
  const normalized = text.trim().toLowerCase()

  // First, try to find a standard email in the text
  const emailMatch = normalized.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/)
  if (emailMatch) {
    const candidate = emailMatch[0]
    if (isValidEmail(candidate)) return candidate
  }

  // Try spoken Portuguese pattern: "joao arroba gmail ponto com"
  const spoken = normalized
    .replace(/\s*arroba\s*/g, '@')
    .replace(/\s*traco\s*/g, '-')
    .replace(/\s*hifen\s*/g, '-')
    .replace(/\s*underline\s*/g, '_')
    .replace(/\s*ponto\s*/g, '.')
    // Remove common filler words
    .replace(/\b(meu email e|meu e-?mail e|o email e|email)\b/g, '')
    .replace(/\s+/g, '')
    .trim()

  if (isValidEmail(spoken)) return spoken

  return null
}

/** Escape HTML special chars to prevent injection in Telegram HTML messages */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ============================================================================
// FLOW STATE MANAGEMENT
// ============================================================================

async function getActiveFlow(
  supabase: SupabaseClient,
  userId: string,
  chatId: number,
): Promise<{ activeFlow: string | null; flowState: Record<string, unknown> }> {
  const { data, error } = await supabase
    .from('telegram_conversations')
    .select('active_flow, flow_state')
    .eq('user_id', userId)
    .eq('telegram_chat_id', chatId)
    .single()

  if (error) {
    console.warn(`[telegram-webhook] getActiveFlow error: ${error.message}`)
  }

  return {
    activeFlow: data?.active_flow || null,
    flowState: (data?.flow_state as Record<string, unknown>) || {},
  }
}

async function setActiveFlow(
  supabase: SupabaseClient,
  userId: string,
  chatId: number,
  activeFlow: string | null,
  flowState: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase
    .from('telegram_conversations')
    .upsert({
      user_id: userId,
      telegram_chat_id: chatId,
      active_flow: activeFlow,
      flow_state: flowState,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,telegram_chat_id' })

  if (error) {
    console.error(`[telegram-webhook] setActiveFlow failed: ${error.message}`)
  }
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
// EMAIL REGISTRATION FLOW (Phase 2)
// ============================================================================

async function handleEmailRegistration(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
  userId: string,
  flowState: Record<string, unknown>,
): Promise<void> {
  const text = (msg.content.text || '').trim()

  if (flowState.step === 'waiting_email') {
    // Try to extract email (supports spoken PT-BR patterns)
    const extractedEmail = extractEmailFromText(text)
    if (!extractedEmail) {
      await reply(tg, msg, [
        'Hmm, nao consegui entender o email.',
        '',
        'Tenta de novo: digita seu email completo (exemplo: maria@gmail.com)',
        '',
        'Ou fala por audio: "meu email e maria arroba gmail ponto com" 🎙️',
      ].join('\n'), {
        inlineKeyboard: {
          rows: [[
            { text: '⏭️ Deixar pra depois', callbackData: 'email_skip' },
          ]],
        },
      })
      return
    }

    const email = extractedEmail
    const chatId = Number(msg.chat.chatId)

    // Update guest account: replace synthetic email with real email
    // C1 fix: Merge existing metadata to preserve telegram_id, first_name, source
    const { data: existingAuth, error: fetchError } = await supabase.auth.admin.getUserById(userId)
    if (fetchError || !existingAuth?.user) {
      console.error(`[telegram-webhook] getUserById failed: ${fetchError?.message || 'no user returned'}`)
      await reply(tg, msg, '❌ Erro ao acessar sua conta. Tente novamente em alguns instantes.')
      return
    }
    const existingMeta = existingAuth.user.user_metadata || {}

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email: email,
      email_confirm: true, // Confirm immediately so magic link works
      user_metadata: {
        ...existingMeta,
        email_registered_via: 'telegram',
        email_registered_at: new Date().toISOString(),
      },
    })

    if (updateError) {
      if (updateError.message?.includes('already been registered') || updateError.message?.includes('duplicate')) {
        await reply(tg, msg, [
          '⚠️ Esse email ja esta vinculado a outra conta AICA.',
          '',
          'Se essa conta e sua, acesse <b>aica.guru</b> e faca login.',
          'Ou envie um email diferente.',
        ].join('\n'), {
          inlineKeyboard: {
            rows: [[
              { text: '⏭️ Pular por agora', callbackData: 'email_skip' },
            ]],
          },
        })
        return
      }
      console.error(`[telegram-webhook] Email update failed: ${updateError.message}`)
      await reply(tg, msg, '❌ Erro ao registrar email. Tente novamente em alguns instantes.')
      return
    }

    // Send magic link via Supabase OTP (uses built-in email delivery)
    // Note: signInWithOtp on service-role client causes session pollution for the
    // remainder of this request, but this is safe since setActiveFlow (the only
    // subsequent DB op) works under the user's own RLS policy.
    const redirectUrl = Deno.env.get('FRONTEND_URL') || 'https://aica.guru'
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${redirectUrl}/welcome?source=telegram`,
        shouldCreateUser: false,
      },
    })

    if (otpError) {
      console.error(`[telegram-webhook] Magic link send failed: ${otpError.message}`)
      // Email was updated successfully, so the user can still use /status to see their email
      await reply(tg, msg, [
        `Pronto! Registrei seu email: <b>${escapeHtml(email)}</b> ✅`,
        '',
        '⚠️ Nao consegui enviar a mensagem pro seu email agora.',
        'Acesse <b>aica.guru</b> e use "Entrar com email" para receber.',
        '',
        'Mas nao precisa fazer isso agora! Pode continuar conversando comigo aqui 😊',
      ].join('\n'))
    } else {
      await reply(tg, msg, [
        `Pronto! Registrei seu email: <b>${escapeHtml(email)}</b> ✅`,
        '',
        'Mandei uma mensagem pro seu email. Abre o email e aperta no botao azul la dentro.',
        '',
        'Mas nao precisa fazer isso agora! Pode continuar conversando comigo aqui 😊',
      ].join('\n'))
    }

    // Clear the flow — back to normal NLP routing
    await setActiveFlow(supabase, userId, chatId, null, {})
  } else {
    // Unknown step — clear flow to prevent user from being stuck
    console.warn(`[telegram-webhook] Unknown email_registration step: ${flowState.step}`)
    const chatId = Number(msg.chat.chatId)
    await setActiveFlow(supabase, userId, chatId, null, {})
    await reply(tg, msg, '⚠️ Fluxo de email reiniciado. Use /status para tentar novamente.')
  }
}

// ============================================================================
// GOLDEN PATH ONBOARDING (Phase 2)
// ============================================================================

function buildWowMessage(interactions: number, actions: number): string {
  const lines = ['Olha o que ja construimos juntos:\n']
  lines.push('📊 Suas primeiras capturas:')
  if (actions > 0) {
    lines.push(`  ✅ ${actions} ${actions === 1 ? 'acao realizada' : 'acoes realizadas'}`)
  }
  lines.push(`  💬 ${interactions} ${interactions === 1 ? 'interacao' : 'interacoes'}`)
  lines.push('')
  lines.push('Para salvar tudo, me diz seu email.')
  lines.push('')
  lines.push('Pode falar por audio (ex: "meu email e joao arroba gmail ponto com") ou digitar.')
  return lines.join('\n')
}

async function handleOnboardingEmailSubmission(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
  userId: string,
  chatId: number,
  email: string,
  firstName: string,
  flowState: Record<string, unknown>,
): Promise<void> {
  // Merge existing metadata to preserve telegram_id, first_name, source
  const { data: existingAuth, error: fetchError } = await supabase.auth.admin.getUserById(userId)
  if (fetchError || !existingAuth?.user) {
    console.error(`[telegram-webhook] onboarding getUserById failed: ${fetchError?.message || 'no user returned'}`)
    await reply(tg, msg, '❌ Erro ao acessar sua conta. Tente novamente.')
    return
  }
  const existingMeta = existingAuth.user.user_metadata || {}

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    email,
    email_confirm: false,
    user_metadata: {
      ...existingMeta,
      email_registered_via: 'telegram_onboarding',
      email_registered_at: new Date().toISOString(),
    },
  })

  if (updateError) {
    if (updateError.message?.includes('already been registered') || updateError.message?.includes('duplicate')) {
      await reply(tg, msg, [
        '⚠️ Esse email ja esta vinculado a outra conta AICA.',
        '',
        'Se essa conta e sua, acesse <b>aica.guru</b> e faca login.',
        'Ou envie um email diferente.',
      ].join('\n'))
      return
    }
    console.error(`[telegram-webhook] Onboarding email update failed: ${updateError.message}`)
    await reply(tg, msg, '❌ Erro ao registrar email. Tente novamente.')
    return
  }

  // Send magic link via Supabase OTP
  const redirectUrl = Deno.env.get('FRONTEND_URL') || 'https://aica.guru'
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${redirectUrl}/welcome?source=telegram`,
      shouldCreateUser: false,
    },
  })

  if (otpError) {
    console.error(`[telegram-webhook] Onboarding magic link failed: ${otpError.message}`)
  }

  // Consume invite if referral exists
  const invitedByUserId = flowState.invited_by_user_id as string | null
  if (invitedByUserId) {
    const { data: inviteResult } = await supabase.rpc('consume_bot_invite', {
      p_inviter_id: invitedByUserId,
      p_invitee_id: userId,
    })
    console.log(`[telegram-webhook] consume_bot_invite result: ${JSON.stringify(inviteResult)}`)
  } else {
    // Self-activation (no inviter) — still consume from global pool
    const { data: inviteResult } = await supabase.rpc('consume_bot_invite', {
      p_inviter_id: userId, // self-referral
      p_invitee_id: userId,
    })
    console.log(`[telegram-webhook] consume_bot_invite (self) result: ${JSON.stringify(inviteResult)}`)
  }

  // Generate referral code for the new user
  const { data: refCode } = await supabase.rpc('generate_telegram_referral_code', {
    p_user_id: userId,
  })

  // Update flow state
  await setActiveFlow(supabase, userId, chatId, 'onboarding_email_sent', {
    email,
    sent_at: new Date().toISOString(),
    invited_by_user_id: invitedByUserId,
    referral_code: refCode || null,
  })

  const emailDisplay = escapeHtml(email)
  if (otpError) {
    await reply(tg, msg, [
      `Pronto! Registrei seu email: <b>${emailDisplay}</b> ✅`,
      '',
      '⚠️ Nao consegui enviar a mensagem pro seu email agora.',
      'Acesse <b>aica.guru</b> e use "Entrar com email" para receber.',
      '',
      'Mas nao precisa fazer isso agora! Pode continuar conversando comigo aqui 😊',
    ].join('\n'))
  } else {
    await reply(tg, msg, [
      `Pronto! Registrei seu email: <b>${emailDisplay}</b> ✅`,
      '',
      'Mandei uma mensagem pro seu email. Abre o email e aperta no botao azul la dentro.',
      '',
      'Mas nao precisa fazer isso agora! Pode continuar conversando comigo aqui 😊',
    ].join('\n'))
  }
}

async function handleOnboardingConversation(
  tg: TelegramAdapter,
  msg: UnifiedMessage,
  supabase: SupabaseClient,
  userId: string,
  chatId: number,
  flowState: Record<string, unknown>,
  firstName: string,
): Promise<void> {
  const interactionCount = ((flowState.interaction_count as number) || 0) + 1
  const actionsCaptured = (flowState.actions_captured as number) || 0

  // Process the message normally (text or voice) to get AI response + possible action
  let aiResult: AIRouterResult
  try {
    if (msg.content.type === 'voice' && msg.content.voiceFileId) {
      aiResult = await processVoiceMessage(supabase, userId, msg.chat.chatId, msg.content.voiceFileId, firstName)
    } else {
      aiResult = await processNaturalLanguage(supabase, userId, msg.chat.chatId, msg.content.text || '', firstName)
    }
  } catch (err) {
    console.error(`[telegram-webhook] Onboarding AI processing error: ${(err as Error).message}`)
    await reply(tg, msg, '❌ Desculpe, tive um problema ao processar. Tente novamente.')
    return
  }

  // Count actions (function calls that created entities)
  const newActionsCaptured = aiResult.action ? actionsCaptured + 1 : actionsCaptured

  // Send the AI response with any inline keyboards
  let keyboard: Partial<OutboundMessage> = {}
  if (aiResult.action === 'create_task' && aiResult.actionData?.id) {
    keyboard = { inlineKeyboard: buildTaskPriorityKeyboard(String(aiResult.actionData.id)) }
  } else if (aiResult.action === 'log_expense' && aiResult.actionData?.id) {
    keyboard = { inlineKeyboard: buildExpenseCategoryKeyboard(String(aiResult.actionData.id)) }
  }
  await reply(tg, msg, aiResult.reply, keyboard)

  // Check if WOW moment should trigger
  const shouldTriggerWow = interactionCount >= 3 || newActionsCaptured >= 2

  if (shouldTriggerWow && flowState.step !== 'ask_email') {
    // Build WOW summary
    const wowMessage = buildWowMessage(interactionCount, newActionsCaptured)
    await reply(tg, msg, wowMessage)

    // Transition to ask_email
    await setActiveFlow(supabase, userId, chatId, 'onboarding_conversation', {
      step: 'ask_email',
      interaction_count: interactionCount,
      actions_captured: newActionsCaptured,
      invited_by_user_id: flowState.invited_by_user_id || null,
    })
  } else if (flowState.step === 'ask_email') {
    // User responded — try to extract email from text (supports spoken PT-BR)
    const text = (msg.content.text || '').trim()
    const extractedEmail = extractEmailFromText(text)
    if (extractedEmail) {
      // Show confirmation button before processing (especially important for voice-extracted emails)
      const emailDisplay = escapeHtml(extractedEmail)
      await setActiveFlow(supabase, userId, chatId, 'onboarding_conversation', {
        ...flowState,
        step: 'confirm_email',
        pending_email: extractedEmail,
        interaction_count: interactionCount,
        actions_captured: newActionsCaptured,
      })
      await reply(tg, msg, `Entendi! Seu email e <b>${emailDisplay}</b>?`, {
        inlineKeyboard: {
          rows: [[
            { text: '👍 Isso mesmo!', callbackData: 'email_confirm_yes' },
            { text: '❌ Nao, vou corrigir', callbackData: 'email_confirm_no' },
          ]],
        },
      })
    } else {
      // Continue conversation but update state + periodic reminder
      if (interactionCount > 5 && interactionCount % 3 === 0) {
        await reply(tg, msg, 'Para salvar tudo e acompanhar sua evolucao, me diz seu email 📧')
      }
      await setActiveFlow(supabase, userId, chatId, 'onboarding_conversation', {
        ...flowState,
        interaction_count: interactionCount,
        actions_captured: newActionsCaptured,
      })
    }
  } else if (flowState.step === 'confirm_email') {
    // User typed something instead of pressing button — try extracting email again
    const text = (msg.content.text || '').trim()
    const extractedEmail = extractEmailFromText(text)
    if (extractedEmail) {
      const emailDisplay = escapeHtml(extractedEmail)
      await setActiveFlow(supabase, userId, chatId, 'onboarding_conversation', {
        ...flowState,
        step: 'confirm_email',
        pending_email: extractedEmail,
        interaction_count: interactionCount,
        actions_captured: newActionsCaptured,
      })
      await reply(tg, msg, `Entendi! Seu email e <b>${emailDisplay}</b>?`, {
        inlineKeyboard: {
          rows: [[
            { text: '👍 Isso mesmo!', callbackData: 'email_confirm_yes' },
            { text: '❌ Nao, vou corrigir', callbackData: 'email_confirm_no' },
          ]],
        },
      })
    } else {
      // Go back to ask_email
      await setActiveFlow(supabase, userId, chatId, 'onboarding_conversation', {
        ...flowState,
        step: 'ask_email',
        interaction_count: interactionCount,
        actions_captured: newActionsCaptured,
      })
      await reply(tg, msg, [
        'Hmm, nao consegui entender o email.',
        '',
        'Tenta de novo: digita seu email completo (exemplo: maria@gmail.com)',
        '',
        'Ou fala por audio: "meu email e maria arroba gmail ponto com" 🎙️',
      ].join('\n'), {
        inlineKeyboard: {
          rows: [[
            { text: '⏭️ Deixar pra depois', callbackData: 'email_skip' },
          ]],
        },
      })
    }
  } else {
    // Continue onboarding conversation
    await setActiveFlow(supabase, userId, chatId, 'onboarding_conversation', {
      step: 'conversation',
      interaction_count: interactionCount,
      actions_captured: newActionsCaptured,
      invited_by_user_id: flowState.invited_by_user_id || null,
    })
  }
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

  // Parse deep link payload (e.g., /start ref_ABCD1234)
  const startPayload = (msg.content.commandArgs || '').trim()
  const isReferral = startPayload.startsWith('ref_')
  const referralCode = isReferral ? startPayload.replace('ref_', '') : null

  // Look up inviter from referral code
  let inviterUserId: string | null = null
  if (referralCode) {
    const { data: inviter } = await supabase
      .from('user_telegram_links')
      .select('user_id')
      .eq('referral_code', referralCode)
      .single()
    inviterUserId = inviter?.user_id || null
    if (!inviterUserId) {
      console.warn(`[telegram-webhook] Referral code not found: ${referralCode}`)
    }
  }

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

  // If referral, store the inviter in the flow state for later use in onboarding
  if (inviterUserId) {
    const chatId = Number(msg.chat.chatId)
    await setActiveFlow(supabase, userId, chatId, 'pending_consent', {
      invited_by_user_id: inviterUserId,
      referral_code: referralCode,
    })
  }

  // Show welcome message with LGPD consent inline buttons
  const referralNote = inviterUserId ? '\n🎟️ Voce foi convidado por um amigo!' : ''
  await reply(tg, msg, [
    `Ola, <b>${name}</b>! 👋`,
    '',
    'Eu sou a <b>AICA</b>, sua assistente pessoal.',
    '',
    `Vou te ajudar a organizar tarefas, gastos e o dia a dia.${referralNote}`,
    '',
    'Para funcionar, eu guardo um resumo das nossas conversas por 30 dias.',
    'Tudo protegido pela lei de dados (LGPD).',
  ].join('\n'), {
    inlineKeyboard: {
      rows: [
        [
          { text: '👍 Concordo, vamos la!', callbackData: 'consent_accept' },
        ],
        [
          { text: 'Nao quero', callbackData: 'consent_reject' },
          { text: '📜 Saber mais', url: 'https://aica.guru/privacy' },
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
    'Oi! Aqui esta o que voce pode fazer comigo:',
    '',
    'Me fala ou digita coisas como:',
    '',
    '"Preciso comprar leite" → eu anoto pra voce 📝',
    '"Gastei 30 reais no mercado" → eu registro o gasto 💰',
    '"To cansado hoje" → eu acompanho como voce esta 😊',
    '"O que tenho pra fazer?" → eu mostro suas tarefas 📋',
    '',
    '🎙️ Pode mandar audio, nao precisa digitar!',
  ].join('\n'), {
    inlineKeyboard: {
      rows: [
        [
          { text: '📋 Minhas tarefas', callbackData: 'help_my_tasks' },
          { text: '💰 Meus gastos', callbackData: 'help_my_expenses' },
        ],
        [
          { text: '😊 Como estou?', callbackData: 'help_my_mood' },
          { text: '🔒 Privacidade', callbackData: 'help_privacy' },
        ],
      ],
    },
  })
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

    const statusOptions: Partial<OutboundMessage> = isSyntheticEmail
      ? {
          inlineKeyboard: {
            rows: [[
              { text: '📧 Registrar email', callbackData: 'email_register_start' },
            ]],
          },
        }
      : {}

    await reply(tg, msg, [
      '✅ <b>Conta ativa</b>',
      '',
      `Tipo: ${accountType}`,
      `Usuario: @${user.telegram_username || 'N/A'}`,
      `Consentimento LGPD: ${user.consent_given ? '✅ Concedido' : '⚠️ Pendente'}`,
      '',
      ...(isSyntheticEmail
        ? ['💡 Envie seu email aqui para acessar a AICA pelo navegador.', '']
        : [`📧 Email: <b>${escapeHtml(authUser?.user?.email || 'N/A')}</b>`, '']),
      'Use /desvincular para remover a vinculacao.',
    ].join('\n'), statusOptions)
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
    'Para funcionar, eu guardo um resumo das nossas conversas por 30 dias.',
    'Tudo protegido pela lei de dados (LGPD).',
  ].join('\n'), {
    inlineKeyboard: {
      rows: [
        [
          { text: '👍 Concordo, vamos la!', callbackData: 'consent_accept' },
        ],
        [
          { text: 'Nao quero', callbackData: 'consent_reject' },
          { text: '📜 Saber mais', url: 'https://aica.guru/privacy' },
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

    // Resolve userId to set up onboarding flow
    const { data: consentUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const consentUserId = consentUser?.[0]?.user_id
    const firstName = msg.sender.firstName || 'usuario'

    if (consentUserId) {
      const chatId = Number(msg.chat.chatId)

      // Check if user still has synthetic email (needs onboarding)
      const { data: authData } = await supabase.auth.admin.getUserById(consentUserId)
      const hasSyntheticEmail = authData?.user?.email?.endsWith('@telegram.aica.guru')

      if (hasSyntheticEmail) {
        // Retrieve any inviter info stored during /start deep link parsing
        const { flowState: existingFlowState } = await getActiveFlow(supabase, consentUserId, chatId)
        const invitedByUserId = existingFlowState.invited_by_user_id || null

        // Start Golden Path onboarding conversation
        await setActiveFlow(supabase, consentUserId, chatId, 'onboarding_conversation', {
          step: 'greeting',
          interaction_count: 0,
          actions_captured: 0,
          invited_by_user_id: invitedByUserId,
        })

        // Tutorial in 3 short messages with typing pauses
        // Msg 1 — What I can do
        await reply(tg, msg, [
          `Oi, ${firstName}! Que bom ter voce aqui 🌿`,
          '',
          'Olha o que eu consigo fazer por voce:',
          '',
          '📝 Anotar tarefas e lembretes',
          '💰 Controlar seus gastos',
          '😊 Acompanhar como voce esta se sentindo',
          '📅 Organizar sua agenda',
        ].join('\n'))

        // Msg 2 — How to use audio (the key message)
        await tg.sendTypingAction(msg.chat.chatId, msg.chat.messageThreadId)
        await reply(tg, msg, [
          'A melhor parte: voce pode falar comigo por audio! 🎙️',
          '',
          'Ve o botao do microfone aqui embaixo, do lado direito?',
          'Segura ele e fala. Quando soltar, eu recebo.',
          '',
          'E igualzinho mandar audio no WhatsApp.',
        ].join('\n'))

        // Msg 3 — Call to action
        await tg.sendTypingAction(msg.chat.chatId, msg.chat.messageThreadId)
        await reply(tg, msg, [
          'Vamos comecar? Me conta uma coisa:',
          '',
          'O que voce precisa fazer hoje? Pode falar por audio ou digitar 😊',
        ].join('\n'))
        return
      }
    }

    // Fallback: user already has real email or couldn't resolve user
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

  } else if (data === 'email_skip') {
    // User chose to skip email registration — clear flow, show normal welcome
    const { data: skipUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const skipUserId = skipUser?.[0]?.user_id
    if (skipUserId) {
      const chatId = Number(msg.chat.chatId)
      await setActiveFlow(supabase, skipUserId, chatId, null, {})
    } else {
      console.warn(`[telegram-webhook] email_skip: could not resolve user for telegramId ${telegramId}`)
    }
    await reply(tg, msg, [
      '👍 Sem problema! Voce pode registrar seu email depois com /status.',
      '',
      'Agora voce pode conversar comigo naturalmente. Experimente:',
      '',
      '• "Adiciona tarefa: revisar proposta"',
      '• "Gastei R$50 no almoco"',
      '• "Como ta meu dia?"',
      '',
      'Use /help para ver todos os comandos.',
    ].join('\n'))

  } else if (data === 'email_register_start') {
    // User wants to register email from /status
    const { data: regUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const regUserId = regUser?.[0]?.user_id
    if (regUserId) {
      // I4 fix: Verify user still has synthetic email before starting flow
      const { data: authCheck } = await supabase.auth.admin.getUserById(regUserId)
      if (!authCheck?.user?.email?.endsWith('@telegram.aica.guru')) {
        await reply(tg, msg, `📧 Seu email ja esta registrado: <b>${escapeHtml(authCheck?.user?.email || 'N/A')}</b>`)
        return
      }
      const chatId = Number(msg.chat.chatId)
      await setActiveFlow(supabase, regUserId, chatId, 'email_registration', { step: 'waiting_email' })
      await reply(tg, msg, [
        '📧 Qual e o seu <b>email</b>?',
        '',
        'Envie no formato: <code>seu@email.com</code>',
      ].join('\n'), {
        inlineKeyboard: {
          rows: [[
            { text: '❌ Cancelar', callbackData: 'email_skip' },
          ]],
        },
      })
    } else {
      console.warn(`[telegram-webhook] email_register_start: could not resolve user for telegramId ${telegramId}`)
      await reply(tg, msg, '❌ Nao consegui acessar sua conta. Tente /start para reiniciar.')
    }

  // Email confirmation callbacks (from extractEmailFromText)
  } else if (data === 'email_confirm_yes') {
    const { data: confirmUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const confirmUserId = confirmUser?.[0]?.user_id
    if (confirmUserId) {
      const chatId = Number(msg.chat.chatId)
      const { flowState } = await getActiveFlow(supabase, confirmUserId, chatId)
      const pendingEmail = flowState.pending_email as string
      if (pendingEmail && isValidEmail(pendingEmail)) {
        const firstName = msg.sender.firstName || 'usuario'
        await handleOnboardingEmailSubmission(tg, msg, supabase, confirmUserId, chatId, pendingEmail, firstName, flowState)
      } else {
        await reply(tg, msg, 'Hmm, algo deu errado. Me diz seu email de novo?')
        await setActiveFlow(supabase, confirmUserId, chatId, 'onboarding_conversation', {
          ...flowState,
          step: 'ask_email',
        })
      }
    }

  } else if (data === 'email_confirm_no') {
    const { data: confirmUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const confirmUserId = confirmUser?.[0]?.user_id
    if (confirmUserId) {
      const chatId = Number(msg.chat.chatId)
      const { flowState } = await getActiveFlow(supabase, confirmUserId, chatId)
      await setActiveFlow(supabase, confirmUserId, chatId, 'onboarding_conversation', {
        ...flowState,
        step: 'ask_email',
        pending_email: null,
      })
      await reply(tg, msg, [
        'Sem problema! Me diz o email correto.',
        '',
        'Pode digitar ou falar por audio: "meu email e maria arroba gmail ponto com" 🎙️',
      ].join('\n'), {
        inlineKeyboard: {
          rows: [[
            { text: '⏭️ Deixar pra depois', callbackData: 'email_skip' },
          ]],
        },
      })
    }

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

  // Help shortcut callbacks — route to AI as natural language
  } else if (data === 'help_my_tasks' || data === 'help_my_expenses' || data === 'help_my_mood' || data === 'help_privacy') {
    const { data: helpUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const helpUserId = helpUser?.[0]?.user_id
    if (helpUserId) {
      const helpQueries: Record<string, string> = {
        help_my_tasks: 'O que tenho pra fazer?',
        help_my_expenses: 'Quanto gastei esse mes?',
        help_my_mood: 'Como estou me sentindo?',
        help_privacy: '',
      }

      if (data === 'help_privacy') {
        await handlePrivacidade(tg, msg)
      } else {
        await tg.sendTypingAction(msg.chat.chatId, msg.chat.messageThreadId)
        const firstName = msg.sender.firstName || 'usuario'
        const aiResult = await processNaturalLanguage(
          supabase, helpUserId, msg.chat.chatId, helpQueries[data], firstName,
        )
        let keyboard: Partial<OutboundMessage> = {}
        if (aiResult.action === 'create_task' && aiResult.actionData?.id) {
          keyboard = { inlineKeyboard: buildTaskPriorityKeyboard(String(aiResult.actionData.id)) }
        } else if (aiResult.action === 'log_expense' && aiResult.actionData?.id) {
          keyboard = { inlineKeyboard: buildExpenseCategoryKeyboard(String(aiResult.actionData.id)) }
        }
        await reply(tg, msg, aiResult.reply, keyboard)
      }
    } else {
      await reply(tg, msg, 'Use /start para criar sua conta primeiro!')
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

    // 4. Rate limit check (per chat_id)
    const rateCheck = isRateLimited(message.chat.chatId)
    if (rateCheck.limited) {
      console.warn(`[telegram-webhook] Rate limited chat ${message.chat.chatId}, retry after ${rateCheck.retryAfterMs}ms`)
      // Return 200 to Telegram (avoid retries) but don't process
      return new Response(
        JSON.stringify({ received: true, processed: false, error: 'rate_limited' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 5. Initialize Supabase client (service role for webhook operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 6. Resolve AICA user (if linked)
    const telegramId = Number(message.sender.channelUserId)
    const { data: userData } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const aicaUserId = userData?.[0]?.user_id || null

    const result: WebhookResult = {
      received: true,
      processed: false,
    }

    try {
      // 7. Route by message type
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
            // Check if user is in a multi-step flow (e.g., email registration)
            const chatId = Number(message.chat.chatId)
            const { activeFlow, flowState } = await getActiveFlow(supabase, aicaUserId, chatId)

            if (activeFlow === 'email_registration') {
              await handleEmailRegistration(tg, message, supabase, aicaUserId, flowState)
              result.processed = true

              // Log without storing raw text (LGPD)
              const durationMs = Date.now() - startTime
              await logMessage(supabase, message, aicaUserId, 'completed', durationMs, undefined, {
                intentSummary: '[email_registration_flow]',
                action: 'email_registration',
              })
              return new Response(
                JSON.stringify(result),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            }

            if (activeFlow === 'onboarding_conversation') {
              const onbFirstName = message.sender.firstName || 'usuario'
              await handleOnboardingConversation(tg, message, supabase, aicaUserId, chatId, flowState, onbFirstName)
              result.processed = true

              const durationMs = Date.now() - startTime
              await logMessage(supabase, message, aicaUserId, 'completed', durationMs, undefined, {
                intentSummary: '[onboarding_conversation]',
                action: 'onboarding',
              })
              return new Response(
                JSON.stringify(result),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            }

            if (activeFlow === 'onboarding_email_sent') {
              // Check if email was validated
              const { data: { user: authUser } } = await supabase.auth.admin.getUserById(aicaUserId)
              if (authUser?.email_confirmed_at && !authUser.email?.endsWith('@telegram.aica.guru')) {
                // Email validated! Activate user
                const inviterId = flowState.invited_by_user_id as string | null

                // Generate referral code if not already generated
                await supabase.rpc('generate_telegram_referral_code', { p_user_id: aicaUserId })

                // Clear flow
                await setActiveFlow(supabase, aicaUserId, chatId, null, {})

                await reply(tg, message, [
                  'Email confirmado! ✅ Sua conta AICA esta ativa.',
                  '',
                  '🎟️ Voce ganhou 3 convites para compartilhar com amigos.',
                  'Para convidar alguem, mande: /convidar',
                  '',
                  'Quando quiser, acesse aica.guru pelo navegador para ver seu painel completo.',
                ].join('\n'))

                const durationMs = Date.now() - startTime
                await logMessage(supabase, message, aicaUserId, 'completed', durationMs, undefined, {
                  intentSummary: '[email_confirmed]',
                  action: 'onboarding_complete',
                })
                return new Response(
                  JSON.stringify(result),
                  { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
              }
              // Email not yet confirmed — process message normally (continued conversation)
              // Falls through to normal AI processing below
            }

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
          } else {
            // Check if user is in onboarding flow (voice messages count too)
            const chatId = Number(message.chat.chatId)
            const { activeFlow, flowState } = await getActiveFlow(supabase, aicaUserId, chatId)

            if (activeFlow === 'onboarding_conversation') {
              const onbFirstName = message.sender.firstName || 'usuario'
              await handleOnboardingConversation(tg, message, supabase, aicaUserId, chatId, flowState, onbFirstName)
              result.processed = true

              const durationMs = Date.now() - startTime
              await logMessage(supabase, message, aicaUserId, 'completed', durationMs, undefined, {
                intentSummary: '[onboarding_conversation_voice]',
                action: 'onboarding',
              })
              return new Response(
                JSON.stringify(result),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            }

            // Handle onboarding_email_sent for voice messages (mirror text branch)
            if (activeFlow === 'onboarding_email_sent') {
              const { data: { user: emailUser } } = await supabase.auth.admin.getUserById(aicaUserId)
              if (emailUser?.email_confirmed_at && !emailUser.email?.endsWith('@telegram.aica.guru')) {
                const inviterId = (flowState as Record<string, unknown>).invited_by_user_id as string | null
                await supabase.rpc('consume_bot_invite', {
                  p_inviter_id: inviterId || aicaUserId,
                  p_invitee_id: aicaUserId,
                })
                await supabase.rpc('generate_telegram_referral_code', { p_user_id: aicaUserId })
                await setActiveFlow(supabase, aicaUserId, chatId, null, {})
                await reply(tg, message,
                  `Email confirmado! ✅ Sua conta AICA esta ativa.\n\n🎟️ Voce ganhou 3 convites para compartilhar com amigos.\nPara convidar alguem, mande: /convidar\n\nQuando quiser, acesse aica.guru pelo navegador para ver seu painel completo.`
                )
                result.processed = true
                return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } })
              }
              // Email not confirmed yet — fall through to normal voice processing
            }

            if (!message.content.voiceFileId) {
              await reply(tg, message,
                'Nao consegui entender esse audio. Pode tentar de novo?\nFala devagar e perto do celular 🎙️\n\nSe preferir, pode digitar tambem.'
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
                  'Nao consegui entender esse audio. Pode tentar de novo?\nFala devagar e perto do celular 🎙️\n\nSe preferir, pode digitar tambem.'
                )
                result.processed = false
              }
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
