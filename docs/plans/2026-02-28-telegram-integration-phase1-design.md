# Telegram Integration Phase 1 — Design Document

**Issue:** #574
**Session:** `feat-telegram-integration-phase1`
**Status:** Approved
**Date:** 2026-02-28

## Summary

Phase 1 delivers the MVP foundation for Telegram integration: channel adapter abstraction, database schema, webhook Edge Function with grammY, account linking, and LGPD consent flow.

## Architecture Decision

**Chosen: Option A (Edge Function only with `waitUntil()`)** designed for easy migration to Option B (hybrid pgmq).

- Gemini calls are I/O-bound (2-15s wait), not CPU-bound — Edge Function 2s CPU limit is not a constraint
- `waitUntil()` keeps isolate alive for background AI processing after returning 200 OK to Telegram
- Migration to Option B (pgmq queue + worker) requires only 4 code changes, estimated 2-4 hours
- Migration trigger: >5K msgs/day OR observed message loss in `telegram_message_log`
- Option C (Cloud Run direct) rejected: 10-40x more expensive, cold starts, breaks gateway pattern

## Channel Adapter Pattern

Unified messaging abstraction created BEFORE Telegram implementation. All subsequent components import from this layer.

**Core interfaces:**
- `ChannelAdapter` — normalizeInbound, sendMessage, sendTypingAction, getCapabilities, validateWebhook
- `UnifiedMessage` — channel-agnostic message format (aligns with existing `UnifiedEvent`)
- `ChannelCapabilities` — feature matrix per channel (inline keyboards, voice, Mini Apps, etc.)
- `ChannelRegistry` — adapter factory, lookup by channel type

**Files:**
- `supabase/functions/_shared/channel-adapter.ts`
- `supabase/functions/_shared/telegram-adapter.ts`
- `supabase/functions/_shared/channel-registry.ts`

## Database Schema

Three new tables + one ALTER + three RPCs.

### `user_telegram_links`
Account linking with LGPD consent fields. Links `telegram_id` (BIGINT UNIQUE) to `auth.users.id`. Includes `consent_given`, `consent_timestamp`, `consent_scope[]`, status enum.

### `telegram_conversations`
Multi-turn conversation context for Gemini. Sliding window of last 20 messages in JSONB `context` column. Supports active flow state for multi-step interactions (onboarding, task creation, expense logging).

### `telegram_message_log`
Reliability monitoring table (design-for-B). Tracks processing status, duration, errors, retry count, AI metadata. Detects message loss when rows stuck in `processing` status. Privacy-first: stores only `intent_summary` (max 200 chars), never raw message text.

### `scheduled_notifications` ALTER
Add `channel` column (whatsapp/telegram/email/push) and `channel_user_id` for multi-channel notification support.

### RPCs (SECURITY DEFINER)
- `get_telegram_user(telegram_id)` — Lookup linked AICA user
- `link_telegram_account(user_id, telegram_id, username, first_name)` — Upsert link
- `update_telegram_conversation_context(user_id, chat_id, new_messages)` — Sliding window update

All tables have RLS enabled. User policies for self-access, service_role policies for Edge Functions.

## Webhook Edge Function

`supabase/functions/telegram-webhook/index.ts` following `stripe-webhook` pattern.

**Framework:** grammY (Deno-native, first-class Supabase Edge Functions support)

**Flow:**
1. Validate `X-Telegram-Bot-Api-Secret-Token` header
2. Parse Telegram Update object
3. Route: commands (`/start`, `/help`, etc.) inline; AI messages via `waitUntil()` (Phase 2 stub)
4. Log to `telegram_message_log`

**Phase 1 commands:** `/start`, `/help`, `/status`, `/vincular`, `/desvincular`, `/privacidade`, `/meus_dados`, `/apagar_dados`

## Account Linking Flow

1. User clicks "Vincular Telegram" in AICA web app (Connections module)
2. Frontend generates 6-char one-time code (10 min expiry)
3. User sends `/vincular ABC123` to bot
4. Webhook validates code, links accounts
5. Frontend updates via Supabase realtime subscription

**Frontend files:**
- `src/modules/connections/components/telegram/TelegramLinkCard.tsx`
- `src/modules/connections/hooks/useTelegramLink.ts`

## LGPD Consent Flow

After linking, bot sends inline keyboard with consent request disclosing: data collected, AI processing, international data transfer (Telegram servers outside Brazil), 30-day retention. Three options: Accept, Reject, View Full Policy. Consent recorded with timestamp and scope array.

## Secrets Required

- `TELEGRAM_BOT_TOKEN` — From BotFather
- `TELEGRAM_WEBHOOK_SECRET` — Random string for webhook validation

## Verification Criteria

- `npm run build && npm run typecheck` passes
- Migration applies cleanly locally
- Webhook responds to mock Telegram Update
- Account linking E2E works
- LGPD commands respond correctly
- `telegram_message_log` populated after interaction
