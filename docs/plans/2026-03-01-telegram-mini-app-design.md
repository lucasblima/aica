# Telegram Mini App — Design Document

**Issue:** #574 (Phase 3)
**Session:** `feat-telegram-integration`
**Status:** Approved
**Date:** 2026-03-01

## Summary

Embed a single-page "Daily Summary" dashboard inside Telegram as a Mini App. Users with linked AICA accounts see an AI-generated daily overview (tasks, finance, mood, agenda). Unlinked users see a landing prompt to connect their account.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Dashboard resumo (single screen) | Fastest MVP, covers daily value |
| Architecture | Multi-page Vite build (Option A) | Zero infra extra, shares Ceramic tokens, atomic deploy |
| Hosting | `aica.guru/mini-app` (same Cloud Run) | No DNS changes, no extra services |
| Auth | Public with upgrade | Landing for all, dashboard requires linked account |
| Path | `src/telegram-mini-app/` | Per issue #574 convention |

## File Structure

```
src/telegram-mini-app/
  main.tsx              # Entry point (WebApp.ready(), theme, router)
  App.tsx               # Root component with auth gating
  hooks/
    useTelegramAuth.ts  # initData validation + session
  components/
    MiniAppShell.tsx     # Layout wrapper (Telegram theme)
    DailySummary.tsx     # AI-generated daily summary
    LinkPrompt.tsx       # CTA for unlinked users
    QuickActions.tsx     # Inline action buttons
  services/
    miniAppAuthService.ts  # initData -> session token exchange

mini-app.html           # Separate HTML entry point (project root)

supabase/functions/
  telegram-mini-app-auth/
    index.ts            # Edge Function: validate initData, return JWT
```

## Authentication — initData Flow

```
[User opens Mini App in Telegram]
    |
    +-- Telegram injects initData (signed HMAC-SHA-256)
    |
    +-- Mini App sends initData -> Edge Function telegram-mini-app-auth
    |       |
    |       +-- Verify HMAC: HMAC-SHA-256(SHA-256(bot_token), "WebAppData")
    |       +-- Validate auth_date (max 24h)
    |       +-- Extract telegram_id from initData.user
    |       +-- Lookup user_telegram_links WHERE telegram_id = X AND status = 'active'
    |       |
    |       +-- IF linked: return { linked: true, session_token, user_profile }
    |       +-- IF not linked: return { linked: false, telegram_user }
    |
    +-- IF linked -> render DailySummary (dashboard)
    +-- IF not linked -> render LinkPrompt (CTA to link)
```

The `session_token` is a JWT signed with `SUPABASE_JWT_SECRET` containing `{ sub: user_id, telegram_id, role: 'authenticated' }`. This allows using the token in normal Supabase client calls without a separate auth system.

## Public Screen (Not Linked) — LinkPrompt

- AICA logo + brief description in Portuguese
- "Para acessar seu dashboard, vincule sua conta"
- "Vincular Conta" button -> opens `https://aica.guru/connections` via `WebApp.openLink()`
- Alternative: generate linking code inline (reuse `useTelegramLink` pattern)

## Main Screen (Linked) — DailySummary

Single scrollable screen with sections:

1. **Greeting** — "Bom dia, {name}!" + date (BRT)
2. **AI Summary** — 2-3 sentences from `gemini-chat` Edge Function
3. **Tasks** — Top 5 `work_items` by priority (Eisenhower)
4. **Finance** — Monthly spend vs budget (progress bar)
5. **Mood** — Last check-in + weekly trend arrow
6. **Agenda** — Next 3 `calendar_events`
7. **Quick Actions** — 4 buttons that open bot commands via `WebApp.openTelegramLink()`

Each section loads independently via React Suspense boundaries. Data fetched directly from Supabase using the session JWT.

## Telegram Theme Integration

Map Telegram `themeParams` to CSS custom properties with Ceramic fallbacks:

```typescript
const themeMapping = {
  bg_color:          { var: '--tg-bg',       fallback: '#F0EFE9' },  // ceramic-base
  text_color:        { var: '--tg-text',     fallback: '#5C554B' },  // ceramic-text-primary
  hint_color:        { var: '--tg-hint',     fallback: '#948D82' },  // ceramic-text-secondary
  button_color:      { var: '--tg-button',   fallback: '#D97706' },  // ceramic-accent
  button_text_color: { var: '--tg-btn-text', fallback: '#FFFFFF' },
};
```

Components use these CSS variables, respecting dark/light mode automatically. The Mini App should feel native to Telegram, not a packaged web app.

## Performance Constraints

- **Bundle target**: < 150KB gzipped (tree-shake aggressively)
- **No framer-motion**: CSS transitions only (WebView limitations)
- **Lazy sections**: Each dashboard section in its own Suspense boundary
- **No PWA**: Mini Apps don't support service workers
- **Target**: < 3s load on mid-range Android (Samsung Galaxy A series)

## Vite Configuration Changes

Add multi-page build to existing `vite.config.ts`:

```typescript
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      'mini-app': resolve(__dirname, 'mini-app.html'),
    },
  },
}
```

Shared chunks (React, Supabase client) are automatically split by Vite's chunk strategy.

## Secrets Required

No new secrets. Reuses existing:
- `TELEGRAM_BOT_TOKEN` — For initData HMAC validation
- `SUPABASE_JWT_SECRET` — For signing session JWTs

## Verification Criteria

- `npm run build` produces both `index.html` and `mini-app/index.html`
- `npm run typecheck` passes with zero new errors
- Edge Function validates initData correctly (unit test with known HMAC)
- Mini App loads in Telegram client (BotFather menu button configured)
- Linked user sees DailySummary with real data
- Unlinked user sees LinkPrompt with working CTA
- Dark mode renders correctly
- Load time < 3s on mid-range Android
