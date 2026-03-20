# Web Email/Password Auth UX — Design Doc

**Issue:** #852
**Session:** feat-web-email-auth
**Date:** 2026-03-11

## Goal

Adapt the AICA web login UX to support email+password login, magic link login, and password reset — enabling Telegram users (who registered email via bot) to access the web app without Google OAuth.

## Architecture

Single-view approach: expand the existing `Login` component to show Google OAuth (primary) + email/password form + magic link option below a divider. No tabs, no separate pages for login. A standalone `/reset-password` page handles password recovery (user arrives via email link).

## Modified Files

- `src/components/layout/Login.tsx` — Add email/password form, magic link, forgot password
- `src/hooks/useAuth.ts` — Add `signInWithEmail`, `sendMagicLink`, `sendPasswordReset` methods

## New Files

- `src/pages/ResetPasswordPage.tsx` — Standalone page for setting new password via recovery token

## Route Changes

- `src/router/AppRouter.tsx` — Add `/reset-password` public route

## Login Component Layout (Sheet Variant)

```
┌─────────────────────────────┐
│       Aica Life OS          │
│  Sistema operacional...     │
│                             │
│  [══ Entrar com Google ══]  │  ← Primary (amber-500)
│                             │
│  ──────── ou ────────       │
│                             │
│  Email _______________      │
│  Senha _______________      │
│                             │
│  [    Entrar com email   ]  │  ← Secondary (ceramic-cool bg)
│                             │
│  Esqueci minha senha        │  ← Text links
│  Entrar com magic link      │
│                             │
│  Termos · Privacidade       │
└─────────────────────────────┘
```

## Login States

| State | View |
|-------|------|
| Default | Google button + email/password form + links |
| Magic link sent | Success message + "Reenviar" link |
| Forgot password sent | Success message + "Voltar" link |
| Error | Inline error below relevant field |

## Reset Password Page (`/reset-password`)

User arrives via Supabase recovery email link. Supabase processes recovery token automatically via `detectSessionInUrl: true`. Page calls `supabase.auth.updateUser({ password })`.

## useAuth Hook

New methods:
- `signInWithEmail(email, password)` — `signInWithPassword()`
- `sendMagicLink(email)` — `signInWithOtp({ email })`
- `sendPasswordReset(email)` — `resetPasswordForEmail()`

## Security

- Cloudflare Turnstile covers email form (already on full-page Login)
- Rate limiting by Supabase Auth (built-in)
- PKCE flow preserved
- No API keys exposed
