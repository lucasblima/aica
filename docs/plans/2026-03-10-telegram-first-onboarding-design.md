# Telegram-First Onboarding — Design Document

**Date:** 2026-03-10
**Status:** Approved
**Issue:** TBD (GitHub Issues to be created)

## Goal

Allow users to start using AICA entirely from Telegram, without ever visiting the website first. The Telegram bot becomes the primary onboarding channel, with the web app as an optional upgrade.

## Architecture

### User Journey

```
Telegram                           Email                         Web (aica.guru)
   │                                 │                              │
   ├─ /start                         │                              │
   ├─ Guest account created          │                              │
   ├─ LGPD consent (inline buttons)  │                              │
   ├─ Bot: "Qual seu email?"         │                              │
   ├─ User: "user@email.com"         │                              │
   │                                 │                              │
   │   ┌─ Magic link sent ──────────►│                              │
   │   │                             ├─ "Acesse a AICA"             │
   │   │                             ├─ User clicks link ──────────►│
   │   │                             │                              ├─ Auto-login (magic link)
   │   │                             │                              ├─ Onboarding
   │   │                             │                              ├─ (Opcional: criar senha)
   │   │                             │                              ├─ (Opcional: conectar Google)
   │   │                             │                              └─ Dashboard
   │   │
   ├─ Bot: "Email confirmado! ✅"
   ├─ Full module access via NLP
   └─ Data synced with web app
```

### Key Design Decisions

1. **Guest account on `/start`** — Bot creates Supabase Auth user with synthetic email `tg_{telegram_id}@telegram.aica.guru`. User can interact with all AICA modules immediately via natural language.

2. **Magic link (no password required)** — When user provides email, system sends a magic link via `supabase.auth.signInWithOtp()`. Clicking the link logs the user in automatically. No password friction.

3. **Password as optional upgrade** — User can create a password later in Profile settings for direct web access without magic links.

4. **Google as optional integration** — Google OAuth is no longer required for signup. It becomes an optional integration for Calendar sync and other Google services.

5. **All modules available** — Guest users have access to all AICA modules via the Telegram AI router. No artificial restrictions.

6. **No linking codes** — The Telegram account is linked from creation. No code exchange needed. Same `user_id` throughout the lifecycle.

7. **Automatic merge on Google OAuth** — If a user later connects Google OAuth, the system detects the existing account and links Google as an additional provider (no data migration needed since it's the same `user_id`).

## Phases

### Phase 1: Guest Account + Telegram Usage
- Modify `telegram-webhook` to create guest accounts on `/start`
- Guest users can use all modules via natural language
- LGPD consent flow before AI processing
- Monitoring queries for backend observation

### Phase 2: Email Registration + Magic Link
- Bot asks for email after LGPD consent
- Send magic link via Supabase Auth OTP
- Web onboarding page for first-time magic link users
- Email confirmation updates guest account with real email

### Phase 3: Optional Password + Google Integration
- Profile page: "Create password" option
- Web signup with email/password (independent of Telegram)
- Google OAuth as optional integration (Calendar sync)
- Agenda module works independently of Google Calendar

## Database Changes

### Phase 1
- No new tables — uses existing `user_telegram_links`, `telegram_conversations`, `telegram_message_log`
- Guest users created in `auth.users` with synthetic email

### Phase 2
- Add `pending_email` column to `telegram_conversations` (or use `flow_state` JSONB)
- Magic link uses Supabase Auth built-in OTP system

### Phase 3
- No schema changes — password and Google provider are Auth-level concerns

## Edge Functions

| Function | Phase | Change |
|----------|-------|--------|
| `telegram-webhook` | 1 | Create guest on `/start` instead of blocking unlinked users |
| `telegram-webhook` | 2 | Detect email in chat, trigger magic link flow |
| New: web onboarding page | 2 | Handle magic link landing, first-time user experience |
| Existing modules | — | No changes — all use `user_id`, provider-agnostic |

## Security

- Guest accounts have no password and no real email — access only via Telegram
- LGPD consent required before AI processing
- Rate limiting: 1 account per Telegram ID (enforced by UNIQUE constraint)
- Magic links expire (configurable, default 1 hour)
- Sessions expire (configurable)
- Synthetic email domain `@telegram.aica.guru` never receives real emails

## Monitoring

```sql
-- Live message log
SELECT created_at, intent_summary, command, processing_status, ai_action
FROM telegram_message_log ORDER BY created_at DESC LIMIT 20;

-- User status
SELECT telegram_username, status, consent_given, created_at
FROM user_telegram_links ORDER BY created_at DESC;

-- Conversation context
SELECT telegram_chat_id, active_flow, flow_state, last_message_at
FROM telegram_conversations ORDER BY last_message_at DESC;
```

## Tech Stack

- **Auth:** Supabase Auth (Email provider + Google OAuth)
- **Magic Links:** `supabase.auth.signInWithOtp({ email })`
- **Guest Creation:** `supabase.auth.admin.createUser()` (service role in Edge Function)
- **AI Router:** Gemini 2.5 Flash with function calling (existing)
- **Templates:** Supabase email templates (customizable)
