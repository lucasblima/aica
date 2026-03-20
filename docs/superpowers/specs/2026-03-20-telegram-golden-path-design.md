# Telegram Golden Path — Design Spec

**Date:** 2026-03-20
**Status:** Draft
**Issues:** #848, #847, new
**Branch:** TBD

---

## 1. Vision

Telegram is AICA's primary conversational interface. The web app handles complex visual tasks (dashboards, Flux training, analytics). This spec defines the **Golden Path** — the adaptive onboarding flow that turns a Telegram `/start` into an activated AICA user through natural conversation, not forms.

### Core Principles

- **Conversation before registration** — The user's first experience is a dialogue, not a signup form
- **Audio-first** — Voice messages are a first-class input, not an afterthought
- **Adaptive tone** — The AI reads the user's response and adapts (empathetic, practical, or exploratory)
- **Email as tradeoff** — The user gives their email after experiencing value, not before
- **Controlled growth** — Dual invite quota (global bot ceiling + individual user invites) ensures quality over quantity

### Out of Scope

- Telegram Mini App expansions
- Cross-device context sync (web ↔ Telegram)
- Proactive bot notifications / scheduled messages
- Complex module interfaces in Telegram (e.g., Flux canvas editor)

---

## 2. User Journey

### 2.1 Golden Path State Machine

```
[NEW_USER] ─── /start ───→ [ONBOARDING_GREETING]
                                    │
                          Bot sends open-ended greeting
                          (accepts text or audio)
                                    │
                                    ↓
                           [ONBOARDING_CONVERSATION]
                                    │
                     Gemini classifies + executes actions
                     Responds in adaptive mode
                                    │
                          ┌─────────┴──────────┐
                          │  Interactions 2-3   │
                          │  (natural dialogue) │
                          └─────────┬──────────┘
                                    │
                              WOW moment
                              (summary of what was captured)
                                    │
                                    ↓
                          [ONBOARDING_ASK_EMAIL]
                                    │
                          ┌─────────┴──────────┐
                          ↓                    ↓
                    [Gave email]          [Declined]
                          │                    │
                    Magic link sent       Gentle reminder
                                          every 5 msgs
                          │                    │
                          ↓                    ↓
                   [ONBOARDING_EMAIL_SENT]  [GUEST_LIMITED]
                          │                 (works but data
                          │                  is temporary)
                          ↓
                   [Email validated via magic link]
                          │
                    Bot auto-applies invite
                    "You have 3 invites to share"
                          │
                          ↓
                    [ACTIVE_USER]
                    (active_flow = null)
```

### 2.2 States in `telegram_conversations.active_flow`

| State | Description | Transitions to |
|---|---|---|
| `onboarding_greeting` | Awaiting first user response after /start | `onboarding_conversation` |
| `onboarding_conversation` | Pre-email interactions (max 5 before asking) | `onboarding_ask_email` |
| `onboarding_ask_email` | Email requested, awaiting user input | `onboarding_email_sent` or stays |
| `onboarding_email_sent` | Magic link sent, awaiting validation | `null` (active) |
| `null` | Active user, normal operation | Any flow |

**Note:** `GUEST_LIMITED` is a derived state, not stored in `active_flow`. It is determined by: `active_flow IS NULL` AND `email ends with @telegram.aica.guru` AND `flow_state.interaction_count > 5`.

### 2.3 Backwards Compatibility

The existing `email_registration` flow (in production) is **replaced** by `onboarding_ask_email` + `onboarding_email_sent`. The existing `handleEmailRegistration` function is refactored into the new onboarding handlers. Users currently in `email_registration` state (if any) will be migrated to `onboarding_ask_email` via migration.

### 2.4 Interaction Limits

- Interaction counter stored in `telegram_conversations.flow_state.interaction_count` (incremented on each user message)
- Last response timestamp stored in `flow_state.last_limited_response_at`
- After 3 interactions without email → WOW moment + gentle email ask
- After 5 interactions without email → limit to 1 response/hour (check `last_limited_response_at`)
- Rate-limited response: "Para continuar conversando sem limites, me diz seu email 📧"
- The existing 20 msgs/min burst rate limit applies independently (spam protection, not onboarding)
- Never block completely — but make clear email is needed for permanence

### 2.5 Error / Edge States

| Scenario | Behavior |
|---|---|
| User sends `/start` again during onboarding | Reset to `onboarding_greeting`, don't create duplicate account |
| User sends a command (`/help`, `/status`) during onboarding | Execute command normally, then resume onboarding flow |
| Magic link expires (not clicked within 1h) | On next Telegram message, detect expired state, offer to resend |
| User blocks bot and returns weeks later | Check existing state, resume from where they left off |
| Stale session (no message >30 days) | Reset `active_flow` to `onboarding_greeting` on next `/start` |

---

## 3. Adaptive Response System

### 3.1 Classification

The Gemini system prompt analyzes each user message and classifies the dominant intent:

| Signal | Mode | Bot Behavior |
|---|---|---|
| Strong emotion detected | **Empathetic** | Acknowledge feeling first, then act |
| Task/problem/action item | **Practical** | Execute immediately, confirm concisely |
| Broad question / curiosity | **Exploratory** | Ask one focusing question, redirect to practical |
| Mixed signals | **Dominant + mention** | Respond to primary, acknowledge secondary |

### 3.2 System Prompt Guidelines (not scripts)

The bot's responses are AI-generated, not hardcoded templates. The system prompt provides tone guidelines:

**Empathetic mode:**
> "User expressed emotion. First, acknowledge genuinely in 1-2 sentences. Then register as moment (log_mood). If there's an implicit actionable item, ask if they want a task created. Never minimize the feeling."

**Practical mode:**
> "User wants to solve something concrete. Execute the action immediately (create_task, log_expense, create_event). Confirm concisely. Ask if there's more."

**Exploratory mode:**
> "User is curious or doesn't know where to start. Don't list features — ask one question that directs toward something concrete. Bring to practice in 1 question."

### 3.3 WOW Moment

**Trigger condition:** `flow_state.interaction_count >= 3` OR `flow_state.actions_captured >= 2` (whichever comes first). The WOW summary and email ask are combined in the same message. If the user has 0 captured actions (all messages were casual chat), the summary shows only moments/emotions detected.

After the trigger, the bot generates a visual summary:

```
"Here's what we've built together:

📊 Your first captures:
  😊 1 moment registered (mood: calm)
  ✅ 2 tasks created
  💰 1 expense logged

This is just the beginning — over time I'll identify
patterns and help you improve each area.

To save everything and track your evolution,
tell me your email (type or send audio):"
```

---

## 4. Audio Pipeline

### 4.1 Current Bug

`processVoiceMessage` transcribes audio via Gemini multimodal, then passes text to `processNaturalLanguage`. Function calling (create_task, create_event, log_expense) fails on transcribed text while working on typed text. Root cause: likely the transcription and NLP are separate Gemini calls, and the second call loses context/tools.

### 4.2 Fix: Unified Audio Processing

Merge transcription + NLP into a single Gemini call:

```
Voice message → Download OGG to memory
  → Base64 encode using Deno std (NOT btoa/spread — fails on large files):
     import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
     const base64Audio = encode(audioBytes);
  → Single Gemini call:
     - Input: Audio OGG (base64) + conversation context + tools
     - System prompt includes function calling tools
     - Output: { transcript, function_calls[], mood, response_text }
  → Execute each function_call (Supabase inserts)
  → Persist ONLY intent_summary (max 200 chars)
  → Discard audio + transcript from memory
  → Send response to Telegram
```

**Note:** The existing `btoa(String.fromCharCode(...audioBytes))` pattern will crash on voice messages >100KB due to call stack limits. Must use Deno's `encode()` from std library.

### 4.3 Function Calling Tools (Available for Audio + Text)

| Tool | Module | Description |
|---|---|---|
| `create_task` | Atlas | Create task with title, optional priority |
| `log_expense` | Finance | Record expense with amount, category |
| `create_event` | Agenda | Schedule event with title, datetime |
| `log_mood` | Journey | Register moment with emotion |
| `get_daily_summary` | Cross-module | Today's overview |
| `get_budget_status` | Finance | Monthly spending check |

---

## 5. LGPD Compliance

### 5.1 Consent Model

**Keep the existing button-based consent** (legally stronger under LGPD Article 8 — requires "free, informed, and unambiguous" consent). However, integrate it into the Golden Path greeting rather than as a separate step:

```
/start greeting:
"Oi! Eu sou a AICA, sua assistente de vida pessoal 🌿

Eu processo suas mensagens com IA para te ajudar.
Nunca guardo o texto original — só um resumo curtinho
da sua intencao. Seus dados sao seus (LGPD).
📜 Politica completa: /privacidade

[✅ Aceitar e comecar]  [❌ Recusar]"
```

On `consent_accept` → set `consent_given = true`, then immediately send the Golden Path opener ("Me manda um audio ou texto..."). This preserves the existing `grant_telegram_consent` RPC and `consent_accept`/`consent_reject` callback handlers while making the flow feel seamless.

The existing consent handlers in the webhook remain functional. No migration needed for users who already consented via the old flow.

### 5.2 Audio Data Lifecycle

| Stage | Data | Storage | Duration |
|---|---|---|---|
| Download | OGG file | Memory only | Request duration (~5s) |
| Transcription | Full text | Gemini API call | Transient |
| Result | intent_summary | `telegram_message_log` | Permanent (deletable) |
| Original audio | OGG | Never persisted | Discarded after request |

### 5.3 LGPD Commands (existing, unchanged)

- `/privacidade` — Full LGPD policy text
- `/meus_dados` — Export user's intent_summaries and actions
- `/apagar_dados` — Delete all user data with confirmation

---

## 6. Invite System

### 6.1 Dual Quota Architecture

**Global quota** — Monthly ceiling on how many new users the bot can activate:

```sql
-- Singleton table — enforced by CHECK constraint on id
CREATE TABLE bot_invite_pool (
  id INTEGER NOT NULL DEFAULT 1 CHECK (id = 1) PRIMARY KEY,
  monthly_limit INTEGER NOT NULL DEFAULT 100,
  used_this_month INTEGER NOT NULL DEFAULT 0,
  current_month TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  waitlist_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bot_invite_pool ENABLE ROW LEVEL SECURITY;
-- Admin-only access via SECURITY DEFINER RPCs (same pattern as monitoring)

INSERT INTO bot_invite_pool (id) VALUES (1);

-- Monthly reset function (called by cron)
CREATE OR REPLACE FUNCTION reset_monthly_invite_pool()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bot_invite_pool
  SET used_this_month = 0,
      current_month = date_trunc('month', now()),
      waitlist_enabled = false,
      updated_at = now()
  WHERE id = 1
    AND current_month < date_trunc('month', now());
END;
$$;
```

**Individual quota** — Each activated user gets N invites:

```sql
-- New columns on user_telegram_links:
-- Note: referral_code is for INVITING new users (distinct from
-- link_code which is for LINKING Telegram to existing web account)
ALTER TABLE user_telegram_links
  ADD COLUMN invites_remaining INTEGER DEFAULT 3,
  ADD COLUMN invites_used INTEGER DEFAULT 0,
  ADD COLUMN invited_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN referral_code TEXT UNIQUE;

CREATE INDEX idx_telegram_referral_code ON user_telegram_links(referral_code)
  WHERE referral_code IS NOT NULL;
```

### 6.2 Invite Flow

1. User A is active, sends `/convidar`
2. Bot returns personalized deep link: `t.me/AicaLifeBot?start=ref_{INVITE_CODE}`
3. User B clicks link, does `/start` with deep link parameter
4. Bot checks: global quota OK? User A's quota OK?
5. If yes → User B enters Golden Path normally
6. Invite is **consumed only when User B validates email** (not at `/start`)
7. If global quota exhausted → waitlist message, collects email for notification

### 6.3 Deep Link Format

```
t.me/AicaLifeBot?start=ref_{INVITE_CODE}
```

The `/start` handler parses the `ref_` prefix to identify the inviter and track the referral chain.

### 6.4 Email Validation → Telegram Callback

The Telegram bot cannot detect email validation in real-time (no Supabase auth webhook). Instead, use a **lazy check** approach:

1. On User B's next Telegram message after email sent, the webhook checks `auth.users.email_confirmed_at`
2. If confirmed → transition from `onboarding_email_sent` to `null` (active)
3. Call `consume_bot_invite` RPC (atomic quota consumption)
4. Send activation celebration message ("Email confirmado! Voce tem 3 convites")
5. Notify inviter via `telegram-send-notification` Edge Function

If the user clicks the magic link but never returns to Telegram, the activation still happens server-side (via `WelcomePage` calling `consume_bot_invite`), and the bot sends the celebration on the next Telegram interaction.

### 6.5 Notifications

| Event | Who is notified | Message |
|---|---|---|
| Invitee activates | Inviter | "🎉 {Name} accepted! +50 XP. {N} invites left." |
| Monthly pool resets | Waitlisted users | "Vagas abertas! Clique para começar: {link}" |
| Inviter earns more invites | Inviter | "🎟️ Ganhou +2 convites por ser ativo!" |

---

## 7. Web Integration Changes

### 7.1 WaitingRoomPage.tsx

**Change:** Replace `"Pedir convite a um amigo"` with `"Entrar na lista de espera"`

The button should open a simple form (email already known from auth) that adds the user to a waitlist table or flags them for the next monthly pool reset.

### 7.2 ActivationGuard.tsx

**Change:** No client-side bypass needed. Instead, when a Telegram user validates their email (magic link clicked), the backend `consume_bot_invite` RPC sets `is_activated = true` in the same table/RPC the existing invite system uses (`check_user_activated` RPC). This way `ActivationGuard` works without modification — Telegram users are activated server-side, not via mutable `user_metadata`.

The activation happens in the Golden Path's email validation step:
1. User clicks magic link → lands on `/welcome?source=telegram`
2. `WelcomePage` calls `supabase.auth.updateUser({ data: { web_onboarded: true } })`
3. The `consume_bot_invite` RPC is called (from webhook or WelcomePage) which:
   - Decrements inviter's `invites_remaining`
   - Increments `bot_invite_pool.used_this_month`
   - Sets `is_activated = true` for the user (same flag existing invite system uses)
4. `ActivationGuard` sees `is_activated = true` → grants access

### 7.3 WelcomePage.tsx (already implemented in PR #982)

- `?source=telegram` contextual messaging
- `web_onboarded` flag on password creation or skip
- Google Calendar connect button

---

## 8. New/Modified Telegram Commands

| Command | Status | Description |
|---|---|---|
| `/start` | **Modified** | Golden Path adaptive onboarding + LGPD inline |
| `/convidar` | **New** | Generate/display personal invite link with quota |
| `/email` | **New** | Register or change email at any time |
| `/status` | **Modified** | Add: invites remaining, email status, activation state |
| `/help` | **Modified** | Update command list with new commands |

---

## 9. Phasing

### Phase 1 — Foundation (~4 files)

| Deliverable | Files |
|---|---|
| Fix audio → function calling | `_shared/telegram-ai-router.ts` |
| LGPD inline in /start | `telegram-webhook/index.ts` |
| WaitingRoom "lista de espera" | `WaitingRoomPage.tsx` |

**Acceptance:** Voice message "criar tarefa comprar leite" → task created in Atlas.

### Phase 2 — Golden Path (~6 files)

| Deliverable | Files |
|---|---|
| Onboarding state machine | `telegram-webhook/index.ts`, `_shared/telegram-onboarding.ts` (new) |
| Adaptive system prompts | `_shared/telegram-ai-router.ts` |
| Email registration in Telegram | `telegram-webhook/index.ts` |
| ActivationGuard bypass | `ActivationGuard.tsx` |
| Migration | `_telegram_golden_path.sql` |

**Acceptance:** New user does /start → converses → gives email → validates → accesses web without invite page.

### Phase 3 — Controlled Growth (~5 files)

| Deliverable | Files |
|---|---|
| Dual invite quota system | Migration `.sql`, `_shared/telegram-invite-service.ts` (new) |
| Deep link referrals | `telegram-webhook/index.ts` |
| `/convidar` and `/email` commands | `telegram-webhook/index.ts` |
| Invite notifications | `telegram-webhook/index.ts` |
| Admin monitoring updates | `AdminMonitoringDashboard.tsx` |

**Acceptance:** User A invites User B via deep link → B activates → A gets XP + notification → quota decremented.

### Phase Dependencies

```
Phase 1 ──→ Phase 2 ──→ Phase 3
```

Sequential. Each phase depends on the previous. Within each phase, deliverables are parallelizable.

---

## 10. Success Metrics

| Metric | Baseline | Target |
|---|---|---|
| /start → email validated | ~0% | >40% |
| Audio → concrete action executed | ~0% (bug) | >80% |
| Telegram users accessing web | Unknown | >25% |
| Invites shared per active user | 0 | >1.5 |
| Time /start → email validated | ∞ | <5 min |

---

## 11. Database Changes Summary

### New Table
- `bot_invite_pool` — Global monthly invite quota

### Modified Tables
- `user_telegram_links` — Add: `invites_remaining`, `invites_used`, `invited_by_user_id`, `invite_code`
- `telegram_conversations` — New `active_flow` states for onboarding

### New RPCs
- `consume_bot_invite(p_inviter_id, p_invitee_id)` — Atomic invite consumption with dual quota check
- `get_bot_invite_pool_status()` — Admin: current pool usage
- `reset_monthly_invite_pool()` — Cron: monthly reset

---

## 12. Security Considerations

- **Email validation is mandatory for activation** — synthetic `tg_{id}@telegram.aica.guru` emails never bypass ActivationGuard
- **Invite consumption is atomic** — RPC uses `SELECT ... FOR UPDATE` to prevent race conditions on quota
- **Audio is never persisted** — OGG files exist only in Edge Function memory during request
- **Deep link codes are unique per user** — prevent enumeration by using UUID-based codes
- **Rate limiting preserved** — 20 msgs/min, 5 msgs/10s burst (existing)
