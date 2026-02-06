# Fact Extraction Service (Task #38)

Mem0-style automatic fact extraction system for AICA Life OS agents.

## Overview

The Fact Extraction Service automatically learns about users from their conversations, storing facts, preferences, patterns, and insights in the `user_memory` table. This enables personalized interactions across all modules.

## Architecture

```
                    +-------------------+
                    |  ADK Conversation |
                    +--------+----------+
                             |
                             v
                    +--------+----------+
                    | after_agent_callback
                    +--------+----------+
                             |
                             v
              +--------------+--------------+
              | FactExtractionService       |
              |                             |
              | 1. Format conversation      |
              | 2. Fetch existing facts     |
              | 3. Call Gemini extraction   |
              | 4. Execute ADD/UPDATE/DELETE|
              +--------------+--------------+
                             |
                             v
                    +--------+----------+
                    |   user_memory     |
                    |   (Supabase)      |
                    +-------------------+
```

## Components

### 1. FactExtractionService (`fact_extraction_service.py`)

Main service class with methods:

- `extract_facts(conversation, user_id)` - Analyze conversation and manage memories
- `extract_single_fact(description, user_id)` - Store explicit user statement
- `generate_embedding(text)` - Create semantic embedding (1536-dim)
- `compute_similarity(text1, text2)` - Compare facts semantically

### 2. ADK Tools (`supabase_tools.py`)

Tools available to agents:

- `extract_facts_from_conversation()` - Manual extraction trigger
- `store_explicit_fact()` - Store single explicit fact
- `get_fact_extraction_stats()` - View extraction statistics

### 3. Callback Integration (`agent.py`)

The `_after_conversation_callback` function runs automatically after each conversation, extracting facts from the last 10 messages.

## Extraction Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `profile` | Personal data | name, job_title, location, family_status |
| `preference` | User preferences | communication_style, work_hours, notification_time |
| `fact` | Objective facts | company, education, skills |
| `pattern` | Behavioral patterns | productivity_peak, stress_triggers |
| `insight` | Discovered correlations | productivity_emotion_link |

## Module Context

Facts can be module-specific or global:

- `atlas` - Productivity, tasks, routines
- `journey` - Emotions, reflections, self-knowledge
- `studio` - Podcasts, guests, content preferences
- `captacao` - Grants, research, academic
- `finance` - Money, budget, spending
- `connections` - Relationships, networking
- `null` - Global facts (applies everywhere)

## Extraction Prompt

The service uses a carefully crafted prompt that instructs Gemini to:

1. Extract only facts the user revealed or can be inferred with high confidence
2. Prioritize information useful for personalization
3. Avoid duplicating existing memories (semantic comparison)
4. Mark source as 'explicit' (user said) or 'inferred' (deduced)
5. Only delete facts with clear contradictions

## Usage Examples

### Automatic Extraction (Default)

```python
# Happens automatically after each conversation
# No code needed - the callback handles it
```

### Manual Extraction in Agent

```python
# Agent can call when it notices important info
result = extract_facts_from_conversation(
    tool_context,
    context_module="journey"  # Emotional context
)
```

### Store Explicit Fact

```python
# When user explicitly states something
result = store_explicit_fact(
    tool_context,
    fact_description="O usuario trabalha como professor universitario",
    category="profile"
)
```

### Retrieve Memories for Personalization

```python
# Use existing get_user_memories tool
memories = get_user_memories(
    tool_context,
    category="preference",
    min_confidence=0.8
)
```

## Configuration

Environment variables:
- `GOOGLE_API_KEY` or `GEMINI_API_KEY` - For Gemini API calls
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key

Internal constants:
- `MIN_CONFIDENCE = 0.7` - Minimum confidence to store facts
- `MIN_CONVERSATION_TURNS = 4` - Minimum messages to trigger extraction
- `EXTRACTION_MODEL = "gemini-2.5-flash"` - Fast, cost-effective model
- `EMBEDDING_MODEL = "text-embedding-004"` - For semantic similarity

## Cost Optimization

The service is designed for minimal token usage:

1. Uses `gemini-2.5-flash` (cheapest model)
2. Limits conversation context to last 10 messages
3. Truncates very long messages (>1000 chars)
4. Only extracts when conversation has 4+ messages
5. Caches service instance (singleton pattern)

Estimated costs per extraction:
- ~500-1000 input tokens (conversation + prompt)
- ~200-400 output tokens (JSON response)
- Total: ~$0.0001-0.0002 per extraction

## Error Handling

The service implements robust error handling:

1. **Rate Limits (429)**: Exponential backoff (1s, 2s, 4s)
2. **Server Errors (500)**: Fixed 1s delay retry
3. **Other Errors**: Fail fast, log error
4. **Max Retries**: 3 attempts before giving up

Errors are logged but never crash the conversation:
```python
except Exception as e:
    logger.warning(f"Fact extraction callback error: {e}")
    # Conversation continues normally
```

## Database Schema

The `user_memory` table (from Task #35):

```sql
CREATE TABLE user_memory (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  category TEXT CHECK (category IN ('profile', 'preference', 'fact', 'insight', 'pattern')),
  module TEXT CHECK (module IN ('atlas', 'journey', 'studio', 'captacao', 'finance', 'connections')),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT CHECK (source IN ('explicit', 'inferred', 'observed')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  CONSTRAINT unique_user_memory_key UNIQUE(user_id, category, key, module)
);
```

## Testing

To test the service locally:

```bash
# Set environment variables
export GEMINI_API_KEY="your-key"
export SUPABASE_URL="your-url"
export SUPABASE_SERVICE_KEY="your-key"
export ADK_DEV_MODE="true"
export DEV_USER_ID="your-test-user-uuid"

# Run ADK web interface
cd backend/agents
adk web

# Interact with Aica and check user_memory table
```

## Monitoring

Track extraction statistics via tool:

```python
stats = get_fact_extraction_stats(tool_context)
# Returns:
# {
#   "total_extractions": 42,
#   "facts_added": 28,
#   "facts_updated": 10,
#   "facts_deleted": 2,
#   "errors": 0
# }
```

Or query the database directly:

```sql
SELECT category, count(*)
FROM user_memory
WHERE user_id = 'uuid'
GROUP BY category;
```

## Security Considerations

1. **User Isolation**: All queries filter by `user_id` with RLS
2. **Service Role**: Uses service role key for privileged operations
3. **No PII in Logs**: Only logs truncated user IDs (`user_id[:8]`)
4. **Confidence Tracking**: Low-confidence facts can be filtered/reviewed

## Related Files

- `backend/agents/services/fact_extraction_service.py` - Main service
- `backend/agents/tools/supabase_tools.py` - ADK tools
- `backend/agents/agent.py` - Callback integration
- `supabase/migrations/20260205000001_create_user_memory_table.sql` - Schema
- `docs/architecture/USER_MEMORY_SYSTEM.md` - System architecture

## Future Improvements

1. **Semantic Deduplication**: Use embeddings to prevent similar facts
2. **Batch Extraction**: Process multiple conversations at once
3. **Confidence Decay**: Reduce confidence of old, unaccessed facts
4. **User Review UI**: Let users view/edit extracted facts
5. **Cross-Module Insights**: Generate insights from multi-module patterns
