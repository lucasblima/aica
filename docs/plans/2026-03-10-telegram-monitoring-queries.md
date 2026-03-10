# Telegram Bot Monitoring Queries

SQL queries for monitoring the Telegram bot backend in real-time via the Supabase Dashboard SQL Editor.

**How to use:** Open Supabase Dashboard > SQL Editor > paste any query below and click "Run". For live monitoring, keep the "Real-Time Activity" query open and click "Run" periodically.

---

## 1. Live Message Log

Last 20 messages with timing and AI actions. Use this as the primary overview of bot activity.

```sql
SELECT
  created_at,
  telegram_chat_id,
  direction,
  message_type,
  command,
  intent_summary,
  ai_action,
  ai_model,
  processing_status,
  processing_duration_ms,
  error_message
FROM telegram_message_log
ORDER BY created_at DESC
LIMIT 20;
```

## 2. User Status Overview

All Telegram users with link and consent status. Shows who has connected, consented, and enabled notifications.

```sql
SELECT
  telegram_username,
  telegram_first_name,
  status,
  consent_given,
  consent_timestamp,
  notification_enabled,
  created_at,
  linked_at
FROM user_telegram_links
ORDER BY created_at DESC;
```

## 3. Active Conversations

Current conversation contexts and active flows. Shows what each user is doing right now.

```sql
SELECT
  tc.telegram_chat_id,
  utl.telegram_username,
  tc.active_flow,
  tc.flow_state,
  tc.context_token_count,
  tc.last_message_at,
  tc.updated_at
FROM telegram_conversations tc
LEFT JOIN user_telegram_links utl ON utl.user_id = tc.user_id
ORDER BY tc.last_message_at DESC;
```

## 4. Error Tracking

Failed message processing in the last 24 hours. Check this first when something seems broken.

```sql
SELECT
  created_at,
  telegram_chat_id,
  message_type,
  command,
  intent_summary,
  error_message,
  processing_duration_ms
FROM telegram_message_log
WHERE processing_status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## 5. AI Usage Stats

AI action breakdown over the last 7 days. Useful for understanding which AI features are used most and their performance.

```sql
SELECT
  ai_action,
  ai_model,
  COUNT(*) as total_calls,
  AVG(processing_duration_ms) as avg_duration_ms,
  MAX(processing_duration_ms) as max_duration_ms
FROM telegram_message_log
WHERE ai_action IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY ai_action, ai_model
ORDER BY total_calls DESC;
```

## 6. Guest Account Funnel

Track guest account creation through consent to first AI interaction. Shows the full onboarding funnel.

```sql
SELECT
  utl.telegram_username,
  utl.telegram_first_name,
  utl.created_at as account_created,
  utl.consent_given,
  utl.consent_timestamp,
  (SELECT MIN(created_at) FROM telegram_message_log tml
   WHERE tml.user_id = utl.user_id AND tml.ai_action IS NOT NULL) as first_ai_interaction,
  (SELECT COUNT(*) FROM telegram_message_log tml
   WHERE tml.user_id = utl.user_id) as total_messages
FROM user_telegram_links utl
ORDER BY utl.created_at DESC;
```

## 7. Real-Time Activity (Live Dashboard)

Messages in the last 5 minutes. Click "Run" repeatedly to monitor live bot activity.

```sql
SELECT
  created_at,
  telegram_chat_id,
  message_type,
  intent_summary,
  ai_action,
  processing_status,
  processing_duration_ms
FROM telegram_message_log
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```
