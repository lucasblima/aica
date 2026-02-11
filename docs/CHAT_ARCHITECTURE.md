# Chat Architecture - AICA Life OS

## Data Flow

```
AicaChatFAB
  -> useChatSession (hook)
    -> chatService (persistence: chat_sessions + chat_messages)
    -> GeminiClient.call({ action: 'chat_aica' })
      -> gemini-chat Edge Function
        -> handleLegacyChat()
          -> Gemini 2.5 Flash API
```

## Database Schema

### chat_sessions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Session ID |
| user_id | uuid (FK) | Owner |
| title | text | Auto-set from first message (60 chars) |
| is_archived | boolean | Soft delete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### chat_messages
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Message ID |
| session_id | uuid (FK) | Parent session |
| user_id | uuid (FK) | Owner |
| content | text | Message content |
| direction | text | `inbound` (user) / `outbound` (assistant) |
| channel | text | `web`, `whatsapp`, etc. |
| content_type | text | `text`, `audio`, etc. |
| model_used | text | e.g. `gemini-2.5-flash` |
| tokens_input | integer | Input tokens used |
| tokens_output | integer | Output tokens used |
| created_at | timestamptz | |

Relationship: `chat_sessions` 1:N `chat_messages` (via `session_id` FK).

RLS: Both tables filter by `user_id = auth.uid()`.

## Key Files

| File | Purpose |
|------|---------|
| `src/services/chatService.ts` | CRUD for sessions + messages |
| `src/hooks/useChatSession.ts` | Session lifecycle hook |
| `src/lib/formatMarkdown.ts` | Shared markdown-to-HTML formatter |
| `src/components/features/AicaChatFAB/AicaChatFAB.tsx` | Chat UI component |
| `supabase/functions/gemini-chat/index.ts` | Edge Function (case `chat_aica`) |

## Known Issues

1. **Trigger token tracking bug**: `update_chat_session_stats` trigger references `NEW.tokens_used` but the column is actually `tokens_input` + `tokens_output`. Token stats on sessions may be inaccurate. Tracked in #203.

2. **Billing schema duplication**: `chat_messages` has token columns, but billing may also track usage separately. Consolidation needed (#203).

## Future: Agent-Proxy Migration

When the ADK backend (`aica-agents` Cloud Run) is validated end-to-end:
1. `useChatSession` switches from `chat_aica` action to `agent_chat` action
2. `agent_chat` routes through `agent-proxy` Edge Function to Cloud Run
3. Coordinator agent handles routing to specialized sub-agents
4. Session/message persistence remains unchanged (same tables)

The migration is transparent to the UI layer.
