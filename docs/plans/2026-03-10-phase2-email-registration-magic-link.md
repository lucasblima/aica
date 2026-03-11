# Phase 2: Email Registration + Magic Link — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow Telegram guest users to register their real email, receive a magic link, and access AICA via the web browser with a dedicated onboarding page.

**Architecture:** After LGPD consent, the bot prompts for email. The Edge Function uses `active_flow` / `flow_state` columns (already exist in `telegram_conversations`) to track the multi-step email registration state. Upon receiving a valid email, it updates the guest account's synthetic email → real email via `admin.updateUserById()`, then sends a magic link via `signInWithOtp()`. The magic link redirects to `/welcome` — a new React page with optional password creation and Google integration.

**Tech Stack:** Supabase Auth (admin API + OTP), Deno Edge Functions, React + TypeScript + Tailwind (Ceramic), React Router

**GitHub Issues:** #846 (Task 23 — Email Registration), #847 (Task 24 — Web Onboarding)

---

## Context for the Implementer

### Key Files
- `supabase/functions/telegram-webhook/index.ts` — The webhook Edge Function (all Task 1-3 changes go here)
- `supabase/migrations/20260228240000_telegram_integration_base.sql` — Schema reference: `telegram_conversations` has `active_flow TEXT` and `flow_state JSONB` columns (unused, ready for Phase 2)
- `src/router/AppRouter.tsx` — Route definitions (lazy imports at line ~30, routes at line ~718)
- `src/components/guards/AuthGuard.tsx` — Route protection (`Navigate to /landing` if not authenticated)
- `src/services/supabaseClient.ts` — Supabase client with `detectSessionInUrl: true` and `flowType: 'pkce'` (line 91-92)
- `src/hooks/useAuth.ts` — Auth state hook, handles PKCE code exchange automatically

### Database Schema (already exists, NO migration needed)
```sql
-- telegram_conversations (migration 20260228240000)
CREATE TABLE telegram_conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  telegram_chat_id BIGINT NOT NULL,
  context JSONB DEFAULT '[]',
  context_token_count INTEGER DEFAULT 0,
  active_flow TEXT,           -- 'email_registration' | null
  flow_state JSONB DEFAULT '{}', -- { step: 'waiting_email' } | {}
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, telegram_chat_id)
);
```

### Auth Flow (how magic links work in this app)
1. Edge Function calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
2. Supabase sends email with magic link containing a verification token
3. User clicks link → redirected to `https://aica.guru/welcome?code=xxx`
4. `supabaseClient.ts` has `detectSessionInUrl: true` → auto-exchanges `?code=` for session
5. `useAuth` hook detects session → user is authenticated → `/welcome` page renders

### Security Rules
- Resolve `userId` from `telegramId` (server-trusted), NEVER from callback_data
- NEVER store raw email in `telegram_message_log` — only log `[email_provided]`
- NEVER expose API keys in frontend — all Supabase admin calls are in Edge Functions
- Guest accounts: synthetic email `tg_{telegram_id}@telegram.aica.guru`

---

## Task 1: Flow State Helpers + Email Validation

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts` (add helpers after line ~120, before COMMAND HANDLERS section)

### Step 1: Add email validation helper

Add after the `reply()` helper function (line ~120):

```typescript
// ============================================================================
// EMAIL VALIDATION
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  if (email.endsWith('@telegram.aica.guru')) return false // reject synthetic emails
  return EMAIL_REGEX.test(email)
}
```

### Step 2: Add flow state helpers

Add immediately after the email validation:

```typescript
// ============================================================================
// FLOW STATE MANAGEMENT
// ============================================================================

async function getActiveFlow(
  supabase: SupabaseClient,
  userId: string,
  chatId: number,
): Promise<{ activeFlow: string | null; flowState: Record<string, unknown> }> {
  const { data } = await supabase
    .from('telegram_conversations')
    .select('active_flow, flow_state')
    .eq('user_id', userId)
    .eq('telegram_chat_id', chatId)
    .single()

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
  await supabase
    .from('telegram_conversations')
    .upsert({
      user_id: userId,
      telegram_chat_id: chatId,
      active_flow: activeFlow,
      flow_state: flowState,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,telegram_chat_id' })
}
```

### Step 3: Verify build

Run: `cd supabase/functions && deno check telegram-webhook/index.ts` (or just verify no syntax errors)

### Step 4: Commit

```bash
git add supabase/functions/telegram-webhook/index.ts
git commit -m "feat(telegram): add email validation and flow state helpers for Phase 2"
```

---

## Task 2: Email Registration Handler

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts` (add `handleEmailRegistration()` after flow state helpers, before COMMAND HANDLERS section)

### Step 1: Add the email registration handler

This function is called when `active_flow === 'email_registration'` and the user sends a text message containing their email.

```typescript
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
    // Validate email format
    if (!isValidEmail(text)) {
      await reply(tg, msg, [
        '⚠️ Esse email nao parece valido. Envie no formato:',
        '<code>seu@email.com</code>',
        '',
        'Ou use o botao abaixo para pular esta etapa.',
      ].join('\n'), {
        inlineKeyboard: {
          rows: [[
            { text: '⏭️ Pular por agora', callbackData: 'email_skip' },
          ]],
        },
      })
      return
    }

    const email = text.toLowerCase()
    const chatId = Number(msg.chat.chatId)

    // Check if email is already used by another account
    // Use admin API to look up by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    })
    // Note: listUsers doesn't filter by email. Use a different approach.
    // Try to get user by email via admin API
    // Actually, we'll just attempt the update and handle errors.

    // Update guest account: replace synthetic email with real email
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email: email,
      email_confirm: true, // Confirm immediately so magic link works
      user_metadata: {
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

    // Send magic link via Supabase OTP
    const redirectUrl = Deno.env.get('FRONTEND_URL') || 'https://aica.guru'
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${redirectUrl}/welcome`,
      },
    })

    if (otpError) {
      console.error(`[telegram-webhook] Magic link send failed: ${otpError.message}`)
      // Email was updated successfully, so the user can still use /status to see their email
      await reply(tg, msg, [
        '✅ Email registrado: <b>' + email + '</b>',
        '',
        '⚠️ Nao consegui enviar o link magico agora.',
        'Acesse <b>aica.guru</b> e use "Entrar com email" para receber um novo link.',
      ].join('\n'))
    } else {
      await reply(tg, msg, [
        '✅ <b>Email registrado!</b>',
        '',
        `Enviei um link magico para <b>${email}</b>.`,
        'Clique no link do email para acessar a AICA pelo navegador.',
        '',
        '💡 O link expira em 1 hora.',
        '📱 Enquanto isso, voce pode continuar usando a AICA aqui pelo Telegram!',
      ].join('\n'))
    }

    // Clear the flow — back to normal NLP routing
    await setActiveFlow(supabase, userId, chatId, null, {})
  }
}
```

### Step 2: Verify no syntax errors

Visually inspect the function. Ensure all braces are balanced and types match.

### Step 3: Commit

```bash
git add supabase/functions/telegram-webhook/index.ts
git commit -m "feat(telegram): add handleEmailRegistration for Phase 2 email flow"
```

---

## Task 3: Wire Up — Consent → Email Flow + Text Intercept + Skip

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts`
  - Modify `consent_accept` handler (line ~552-567) to trigger email prompt
  - Modify text message handler (line ~800-860) to check `active_flow`
  - Add `email_skip` callback handler in `handleCallbackQuery`

### Step 1: Modify consent_accept to prompt for email

Replace the current consent_accept response (lines 557-567) to add the email prompt after consent:

**Current code (lines 552-567):**
```typescript
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
```

**Replace with:**
```typescript
  if (data === 'consent_accept' || data.startsWith('consent_accept:')) {
    await supabase.rpc('grant_telegram_consent', {
      p_telegram_id: telegramId,
      p_scope: ['messages', 'notifications', 'ai_processing'],
    })

    // Resolve userId to set up email registration flow
    const { data: consentUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const consentUserId = consentUser?.[0]?.user_id

    if (consentUserId) {
      // Check if user still has synthetic email (hasn't registered real email yet)
      const { data: authData } = await supabase.auth.admin.getUserById(consentUserId)
      const hasSyntheticEmail = authData?.user?.email?.endsWith('@telegram.aica.guru')

      if (hasSyntheticEmail) {
        // Start email registration flow
        const chatId = Number(msg.chat.chatId)
        await setActiveFlow(supabase, consentUserId, chatId, 'email_registration', { step: 'waiting_email' })

        await reply(tg, msg, [
          '✅ <b>Consentimento registrado!</b>',
          '',
          '📧 Agora, qual e o seu <b>email</b>?',
          '',
          'Com o email, voce podera acessar a AICA pelo navegador tambem.',
          'Envie no formato: <code>seu@email.com</code>',
        ].join('\n'), {
          inlineKeyboard: {
            rows: [[
              { text: '⏭️ Pular por agora', callbackData: 'email_skip' },
            ]],
          },
        })
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
```

### Step 2: Add email_skip callback handler

In `handleCallbackQuery()`, add a new branch **before** the Phase 2 module callbacks (before `} else if (data.startsWith('task_priority:'))` around line 611):

```typescript
  } else if (data === 'email_skip') {
    // User chose to skip email registration — clear flow, show normal welcome
    const { data: skipUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const skipUserId = skipUser?.[0]?.user_id
    if (skipUserId) {
      const chatId = Number(msg.chat.chatId)
      await setActiveFlow(supabase, skipUserId, chatId, null, {})
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
```

### Step 3: Modify text message handler to check active_flow

In the main `serve()` handler, the text message section (around line 800-860) currently does:
```
text → check aicaUserId → check consent → route to AI
```

We need to add a flow check BEFORE routing to AI. **After** the consent check passes (line 827, inside `else {`), add the active_flow intercept:

**Current code (lines 827-858):**
```typescript
          } else {
            // Process with AI router
            const firstName = message.sender.firstName || 'usuario'
            const aiResult = await processNaturalLanguage(
```

**Replace the opening of this else block with:**
```typescript
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

            // Process with AI router
            const firstName = message.sender.firstName || 'usuario'
            const aiResult = await processNaturalLanguage(
```

### Step 4: Verify no syntax errors

Check brace matching across the modified sections. The text handler's `else` block now has two paths: flow intercept (returns early) or AI routing (existing code).

### Step 5: Commit

```bash
git add supabase/functions/telegram-webhook/index.ts
git commit -m "feat(telegram): wire consent→email flow, text intercept, and skip button"
```

---

## Task 4: Update /status to Show Email Registration Option

**Files:**
- Modify: `supabase/functions/telegram-webhook/index.ts` — `handleStatus()` function (line ~277-315)

### Step 1: Add email registration prompt for guest users

The current `/status` shows "Acesse aica.guru para configurar email e senha" for guest accounts. Update it to offer inline email registration.

**Replace the `isSyntheticEmail` message lines (lines 303-305):**

**Current:**
```typescript
      ...(isSyntheticEmail
        ? ['💡 Acesse <b>aica.guru</b> para configurar email e senha.', '']
        : []),
```

**Replace with:**
```typescript
      ...(isSyntheticEmail
        ? ['💡 Envie seu email aqui para acessar a AICA pelo navegador.', '']
        : [`📧 Email: <b>${authUser?.user?.email || 'N/A'}</b>`, '']),
```

### Step 2: Add inline button for email registration on guest accounts

After the `reply()` call in the status handler, add an inline keyboard for guest users.

**Current reply call (lines 296-307):**
```typescript
    await reply(tg, msg, [
      '✅ <b>Conta ativa</b>',
      ...
    ].join('\n'))
```

**Replace with:**
```typescript
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
        : [`📧 Email: <b>${authUser?.user?.email || 'N/A'}</b>`, '']),
      'Use /desvincular para remover a vinculacao.',
    ].join('\n'), statusOptions)
```

### Step 3: Add email_register_start callback handler

In `handleCallbackQuery()`, add a handler for `email_register_start` (next to the `email_skip` handler):

```typescript
  } else if (data === 'email_register_start') {
    // User wants to register email from /status
    const { data: regUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: telegramId })
    const regUserId = regUser?.[0]?.user_id
    if (regUserId) {
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
    }
```

### Step 4: Commit

```bash
git add supabase/functions/telegram-webhook/index.ts
git commit -m "feat(telegram): add email registration option to /status for guest users"
```

---

## Task 5: WelcomePage Component (Frontend)

**Files:**
- Create: `src/pages/WelcomePage.tsx`

### Step 1: Create the WelcomePage component

This page is shown when a Telegram user clicks their magic link. It's protected by AuthGuard (user is already authenticated when they arrive).

**Design tokens:** Ceramic Design System — `bg-ceramic-base`, `ceramic-text-primary`, `shadow-ceramic-emboss`, amber accent.

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { CeramicLoadingState } from '@/components'

export default function WelcomePage() {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const [step, setStep] = useState<'welcome' | 'password' | 'done'>('welcome')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [saving, setSaving] = useState(false)

  // Get user info from metadata
  const firstName = user?.user_metadata?.first_name || 'usuario'
  const source = user?.user_metadata?.source
  const isTelegramUser = source === 'telegram_bot'

  // If user is not from Telegram or already has a password, redirect to home
  useEffect(() => {
    if (!isLoading && user && !isTelegramUser) {
      navigate('/', { replace: true })
    }
  }, [isLoading, user, isTelegramUser, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ceramic-base">
        <CeramicLoadingState variant="page" />
      </div>
    )
  }

  const handleSetPassword = async () => {
    setPasswordError('')

    if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('As senhas nao coincidem.')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      setPasswordError('Erro ao criar senha. Tente novamente.')
      return
    }

    setStep('done')
  }

  const handleSkipPassword = () => {
    navigate('/', { replace: true })
  }

  const handleGoToDashboard = () => {
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss text-center">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-bold text-ceramic-text-primary mb-2">
              Bem-vindo, {firstName}!
            </h1>
            <p className="text-ceramic-text-secondary mb-6">
              Sua conta AICA esta pronta. Voce ja pode acessar todos os modulos pelo navegador.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setStep('password')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-4 py-3 transition-colors"
              >
                🔐 Criar senha para acesso direto
              </button>
              <button
                onClick={handleSkipPassword}
                className="w-full bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary font-medium rounded-lg px-4 py-3 transition-colors"
              >
                Pular — usar sempre link magico
              </button>
            </div>

            <p className="text-xs text-ceramic-text-secondary mt-6">
              Voce tambem pode conectar o Google Calendar depois em Configuracoes.
            </p>
          </div>
        )}

        {/* Password Step */}
        {step === 'password' && (
          <div className="bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss">
            <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">
              Criar senha
            </h2>
            <p className="text-ceramic-text-secondary mb-6 text-sm">
              Com uma senha, voce pode acessar a AICA diretamente pelo navegador sem precisar de link magico.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="w-full px-3 py-2 bg-ceramic-base border border-ceramic-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-ceramic-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-3 py-2 bg-ceramic-base border border-ceramic-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-ceramic-text-primary"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-ceramic-error">{passwordError}</p>
              )}

              <button
                onClick={handleSetPassword}
                disabled={saving}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-3 transition-colors"
              >
                {saving ? 'Salvando...' : '✅ Criar senha'}
              </button>
              <button
                onClick={handleSkipPassword}
                className="w-full text-ceramic-text-secondary text-sm hover:underline"
              >
                Pular por agora
              </button>
            </div>
          </div>
        )}

        {/* Done Step */}
        {step === 'done' && (
          <div className="bg-ceramic-50 rounded-xl p-8 shadow-ceramic-emboss text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-ceramic-text-primary mb-2">
              Senha criada!
            </h2>
            <p className="text-ceramic-text-secondary mb-6">
              Agora voce pode acessar a AICA com email e senha, alem do Telegram.
            </p>
            <button
              onClick={handleGoToDashboard}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-4 py-3 transition-colors"
            >
              Ir para o painel →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

### Step 2: Verify build

Run: `npm run build && npm run typecheck`
Expected: Build succeeds (page is not yet routed, but module resolution should work)

### Step 3: Commit

```bash
git add src/pages/WelcomePage.tsx
git commit -m "feat(onboarding): create WelcomePage for Telegram magic link users"
```

---

## Task 6: Route Registration in AppRouter

**Files:**
- Modify: `src/router/AppRouter.tsx`
  - Add lazy import (line ~91, near other page imports)
  - Add route definition (line ~758, after InviteAcceptPage route)

### Step 1: Add lazy import

After the `OnboardingFlow` import (line 92), add:

```typescript
const WelcomePage = lazy(() => import('../pages/WelcomePage'));
```

### Step 2: Add route definition

After the `/invite/:token` route (around line 757), add the `/welcome` route as a **protected** route (user arrives already authenticated via magic link):

```tsx
               {/* Welcome Page - For Telegram magic link users (Phase 2) */}
               <Route
                  path="/welcome"
                  element={<ProtectedRoute><WelcomePage /></ProtectedRoute>}
               />
```

### Step 3: Verify build

Run: `npm run build && npm run typecheck`
Expected: Build succeeds, no new errors.

### Step 4: Commit

```bash
git add src/router/AppRouter.tsx
git commit -m "feat(onboarding): add /welcome route for magic link onboarding"
```

---

## Task 7: Deploy Edge Function + End-to-End Verification

**Files:** No code changes — deployment and verification only.

### Step 1: Deploy the updated telegram-webhook Edge Function

```bash
# Load Supabase access token from .env.local
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d'=' -f2)

npx supabase functions deploy telegram-webhook --no-verify-jwt
```

Expected: `Deployed function telegram-webhook`

### Step 2: Verify the Edge Function is running

Send `/start` to the Telegram bot. Expected flow:
1. Welcome message with LGPD consent buttons appears
2. Click "Aceitar e Continuar"
3. **NEW:** Bot asks "Qual e o seu email?" with skip button
4. Type a valid email → bot says "Email registrado! Enviei um link magico..."
5. Check email inbox for magic link
6. Click link → lands on `aica.guru/welcome` → Welcome page shown

### Step 3: Verify skip flow

Send `/start` again (or create new guest). After consent:
1. Click "Pular por agora"
2. Bot shows normal welcome with NLP examples
3. Normal NLP routing works (type "Como ta meu dia?" → AI responds)

### Step 4: Verify /status email registration

1. Send `/status` → should show "Conta Telegram (convidado)" with "Registrar email" button
2. Click "Registrar email" → bot asks for email
3. Type email → magic link flow triggers

### Step 5: Verify edge cases

- Invalid email: Type "not-an-email" → bot shows validation error
- Duplicate email: Use an email already in the system → bot shows "ja vinculado" message
- Synthetic email: Type "tg_123@telegram.aica.guru" → rejected

### Step 6: Verify frontend build and deploy

```bash
npm run build && npm run typecheck
```

Expected: 0 errors, exit 0.

### Step 7: Commit any final adjustments

```bash
git add -A
git commit -m "chore(telegram): Phase 2 deployment verification"
```

---

## Summary

| Task | Description | Files | Depends On |
|------|-------------|-------|------------|
| 1 | Email validation + flow state helpers | telegram-webhook/index.ts | — |
| 2 | `handleEmailRegistration()` handler | telegram-webhook/index.ts | Task 1 |
| 3 | Wire consent → email flow + text intercept + skip | telegram-webhook/index.ts | Task 2 |
| 4 | Update /status with email registration option | telegram-webhook/index.ts | Task 1 |
| 5 | WelcomePage component | src/pages/WelcomePage.tsx | — |
| 6 | Route registration in AppRouter | src/router/AppRouter.tsx | Task 5 |
| 7 | Deploy + end-to-end verification | — | Tasks 1-6 |

**Parallelizable:** Tasks 1-4 (Edge Function) are sequential. Tasks 5-6 (Frontend) can run in parallel with Tasks 1-4. Task 7 depends on all.

**No migration needed** — `active_flow` and `flow_state` columns already exist in `telegram_conversations`.
