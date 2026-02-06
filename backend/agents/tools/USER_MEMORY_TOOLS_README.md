# User Memory Tools - Integration Guide

## Overview

The User Memory System provides 5 tools for agent-based learning, enabling persistent memory across sessions. These tools implement a Mem0-style architecture where agents can:

1. **Store** facts, preferences, insights, and patterns about users
2. **Retrieve** context to personalize responses
3. **Update** memories as confidence increases/decreases
4. **Delete** outdated or incorrect memories
5. **Search** by JSONB content for semantic queries

## Available Tools

### 1. `store_user_memory()`

**Purpose:** Store new memories about the user.

**Signature:**
```python
def store_user_memory(
    tool_context: ToolContext,
    category: str,  # 'profile', 'preference', 'fact', 'insight', 'pattern'
    key: str,       # Semantic identifier
    value: dict,    # Structured data
    module: str = None,  # 'atlas', 'journey', 'studio', 'captacao', 'finance', 'connections'
    source: str = "inferred",  # 'explicit', 'inferred', 'observed'
    confidence: float = 0.8     # 0.0-1.0
) -> dict
```

**Examples:**

```python
# Store global communication preference (user explicitly stated)
store_user_memory(
    tool_context,
    category='preference',
    key='communication_style',
    value={
        'tone': 'informal',
        'language': 'pt-BR',
        'emoji_usage': 'moderate',
        'preferred_greeting': 'E aí'
    },
    module=None,  # Global
    source='explicit',
    confidence=1.0
)

# Store Atlas productivity pattern (system observed)
store_user_memory(
    tool_context,
    category='pattern',
    key='productivity_peak',
    value={
        'best_hours': ['09:00', '10:00', '11:00'],
        'worst_hours': ['14:00', '15:00'],
        'sample_size': 60,
        'confidence_interval': 0.92
    },
    module='atlas',
    source='observed',
    confidence=0.95
)

# Store Journey emotional trigger (LLM inferred)
store_user_memory(
    tool_context,
    category='fact',
    key='emotional_trigger',
    value={
        'trigger': 'tight_deadlines',
        'emotion': 'anxious',
        'frequency': 'high',
        'coping_strategy': 'morning_meditation',
        'last_occurrence': '2026-02-04'
    },
    module='journey',
    source='inferred',
    confidence=0.87
)

# Store cross-module insight
store_user_memory(
    tool_context,
    category='insight',
    key='productivity_emotion_correlation',
    value={
        'finding': 'Produtividade aumenta 40% após reflexões matinais',
        'correlation': 0.78,
        'sample_days': 30,
        'statistical_significance': 0.95
    },
    module=None,
    source='inferred',
    confidence=0.88
)
```

**Returns:**
```json
{
  "status": "success",
  "memory_id": "uuid",
  "message": "Memoria 'communication_style' armazenada com sucesso (confianca: 100%)"
}
```

---

### 2. `get_user_memories()`

**Purpose:** Retrieve stored memories for context loading.

**Signature:**
```python
def get_user_memories(
    tool_context: ToolContext,
    category: str = None,
    module: str = None,
    key: str = None,
    min_confidence: float = 0.0,
    limit: int = 20
) -> dict
```

**Examples:**

```python
# Load all high-confidence patterns
get_user_memories(
    tool_context,
    category='pattern',
    min_confidence=0.8,
    limit=10
)

# Load Atlas-specific preferences
get_user_memories(
    tool_context,
    category='preference',
    module='atlas'
)

# Load specific memory
get_user_memories(
    tool_context,
    key='productivity_peak'
)

# Load global preferences for response personalization
get_user_memories(
    tool_context,
    category='preference',
    module=None  # Global only
)
```

**Returns:**
```json
{
  "status": "success",
  "memories": [
    {
      "id": "uuid",
      "category": "pattern",
      "module": "atlas",
      "key": "productivity_peak",
      "value": {"best_hours": ["09:00", "10:00", "11:00"]},
      "confidence": 0.95,
      "source": "observed",
      "created_at": "2026-01-15T10:00:00Z",
      "last_accessed_at": "2026-02-05T14:30:00Z"
    }
  ],
  "count": 1
}
```

**Note:** Automatically updates `last_accessed_at` for retrieved memories.

---

### 3. `update_user_memory()`

**Purpose:** Update existing memories (value or confidence).

**Signature:**
```python
def update_user_memory(
    tool_context: ToolContext,
    memory_id: str,
    value: dict = None,
    confidence: float = None
) -> dict
```

**Examples:**

```python
# Increase confidence after validation
update_user_memory(
    tool_context,
    memory_id="memory-uuid",
    confidence=0.98
)

# Update value and confidence
update_user_memory(
    tool_context,
    memory_id="memory-uuid",
    value={
        'best_hours': ['09:00', '10:00', '11:00', '16:00'],  # Added 16:00
        'worst_hours': ['14:00', '15:00'],
        'sample_size': 75  # Increased sample
    },
    confidence=0.97
)

# Decrease confidence for outdated memory
update_user_memory(
    tool_context,
    memory_id="memory-uuid",
    confidence=0.65
)
```

**Returns:**
```json
{
  "status": "success",
  "message": "Memoria atualizada com sucesso"
}
```

---

### 4. `delete_user_memory()`

**Purpose:** Remove outdated, incorrect, or unwanted memories.

**Signature:**
```python
def delete_user_memory(
    tool_context: ToolContext,
    memory_id: str = None,
    key: str = None,
    category: str = None,
    module: str = None
) -> dict
```

**Examples:**

```python
# Delete specific memory by ID
delete_user_memory(
    tool_context,
    memory_id="memory-uuid"
)

# Delete all memories with specific key
delete_user_memory(
    tool_context,
    key='emotional_trigger',
    module='journey'
)

# Delete all patterns from Atlas
delete_user_memory(
    tool_context,
    category='pattern',
    module='atlas'
)
```

**Returns:**
```json
{
  "status": "success",
  "deleted_count": 3,
  "message": "3 memoria(s) removida(s)"
}
```

**Warning:** Deleting by category without filters can remove many memories. Use with caution.

---

### 5. `search_user_memories()`

**Purpose:** Search memories by JSONB content (semantic search).

**Signature:**
```python
def search_user_memories(
    tool_context: ToolContext,
    search_value: dict,
    limit: int = 10
) -> dict
```

**Examples:**

```python
# Find all memories mentioning "deadlines"
search_user_memories(
    tool_context,
    search_value={'trigger': 'deadlines'}
)

# Find memories with high productivity scores
search_user_memories(
    tool_context,
    search_value={'productivity_score': 85}
)

# Find memories about specific topic
search_user_memories(
    tool_context,
    search_value={'topic': 'AI'},
    limit=5
)
```

**Returns:**
```json
{
  "status": "success",
  "memories": [
    {
      "id": "uuid",
      "category": "fact",
      "module": "journey",
      "key": "emotional_trigger",
      "value": {"trigger": "tight_deadlines", "emotion": "anxious"},
      "confidence": 0.87,
      "source": "inferred"
    }
  ],
  "count": 1
}
```

**Note:** Uses PostgreSQL JSONB `@>` (contains) operator for efficient queries.

---

## Agent Integration Patterns

### Pattern 1: Load Context Before Response

```python
# In your agent prompt or system message:
"""
Before answering, load relevant user memories:
1. Call get_user_memories() for global preferences
2. Call get_user_memories() for module-specific patterns
3. Apply learned context to personalize your response
"""

# Example in coordinator agent:
user_prefs = get_user_memories(
    tool_context,
    category='preference',
    module=None
)

atlas_patterns = get_user_memories(
    tool_context,
    category='pattern',
    module='atlas',
    min_confidence=0.8
)

# Generate personalized response
response = gemini.generate_content(
    prompt=f"""
    User preferences: {user_prefs['memories']}
    Known patterns: {atlas_patterns['memories']}

    Task: Suggest 3 high-priority tasks considering:
    - Communication style
    - Productivity peak hours
    - Known stress triggers
    """
)
```

### Pattern 2: Store Insights After Interaction

```python
# After detecting a pattern:
if user_completed_tasks_at_9am >= 5:
    store_user_memory(
        tool_context,
        category='pattern',
        key='productivity_peak',
        value={
            'best_hours': ['09:00', '10:00'],
            'sample_size': 30,
            'confidence_interval': 0.89
        },
        module='atlas',
        source='observed',
        confidence=0.89
    )
```

### Pattern 3: Reinforce or Decay Confidence

```python
# If user validates a suggestion:
memory = get_user_memories(tool_context, key='productivity_peak')
if memory['memories']:
    memory_id = memory['memories'][0]['id']
    current_conf = memory['memories'][0]['confidence']
    update_user_memory(
        tool_context,
        memory_id=memory_id,
        confidence=min(current_conf + 0.05, 1.0)
    )

# If user rejects a suggestion:
if user_feedback == 'not_helpful':
    update_user_memory(
        tool_context,
        memory_id=memory_id,
        confidence=max(current_conf - 0.1, 0.0)
    )
```

### Pattern 4: GDPR Compliance (Right to be Forgotten)

```python
# When user requests data deletion:
if user_requests_deletion:
    # Delete all memories for a module
    result = delete_user_memory(
        tool_context,
        module='journey'
    )
    print(f"Deleted {result['deleted_count']} memories from Journey module")
```

---

## Memory Categories Explained

### 1. `profile` - Static User Info

**Purpose:** Demographic and stable information.

**Examples:**
- `name`, `location`, `timezone`, `occupation`, `languages`

**When to use:** User explicitly shares biographical data.

**Confidence:** Usually 1.0 (explicit).

### 2. `preference` - User Choices

**Purpose:** Settings, style preferences, notification preferences.

**Examples:**
- `communication_style`, `notification_frequency`, `theme`, `data_privacy_level`

**When to use:** User expresses a preference directly or indirectly.

**Confidence:** 0.8-1.0 (explicit or strongly inferred).

### 3. `fact` - Observed Truths

**Purpose:** Contextual facts about the user's situation.

**Examples:**
- `emotional_triggers`, `work_hours`, `team_members`, `project_deadlines`

**When to use:** Agent learns facts from conversations or data.

**Confidence:** 0.7-0.95 (inferred or observed).

### 4. `insight` - AI-Derived Conclusions

**Purpose:** Cross-module insights from data analysis.

**Examples:**
- `productivity_emotion_correlation`, `stress_indicators`, `success_factors`

**When to use:** Agent detects patterns across modules.

**Confidence:** 0.6-0.9 (statistical analysis).

### 5. `pattern` - Behavioral Trends

**Purpose:** Recurring behaviors over time.

**Examples:**
- `productivity_peak`, `procrastination_triggers`, `task_completion_rate`

**When to use:** System observes consistent behavior.

**Confidence:** 0.8-0.95 (high sample size).

---

## Memory Sources Explained

| Source | Meaning | Confidence Range | Examples |
|--------|---------|------------------|----------|
| **explicit** | User stated directly | 0.9-1.0 | "I prefer informal tone", "My work hours are 9-5" |
| **inferred** | LLM deduced from context | 0.6-0.9 | Detected anxiety from message tone, inferred preferences |
| **observed** | System tracked behavior | 0.7-0.95 | Logged task completion times, measured productivity |

---

## Best Practices

### 1. Always Load Context First

```python
# BAD: Generate without context
response = "Here are your tasks for today..."

# GOOD: Load preferences and patterns first
prefs = get_user_memories(tool_context, category='preference')
patterns = get_user_memories(tool_context, category='pattern', module='atlas')
response = generate_personalized_response(prefs, patterns)
```

### 2. Upsert, Don't Duplicate

The `store_user_memory()` tool automatically upserts (update if exists) based on:
- `(user_id, category, key, module)` unique constraint

So calling it multiple times with the same key updates the existing memory.

### 3. Track Access for Context Continuity

```python
# After loading memories, they auto-update last_accessed_at
# Use this for "recent context" queries:
recent_context = get_user_memories(
    tool_context,
    limit=10
).order_by('last_accessed_at', desc=True)
```

### 4. Decay Low-Confidence Memories

Implement a scheduled job to reduce confidence of old, unused memories:

```python
# Pseudocode for confidence decay
def decay_old_memories():
    old_memories = get_user_memories(
        tool_context,
        min_confidence=0.0,
        limit=1000
    )
    for memory in old_memories:
        if memory['last_accessed_at'] < 90_days_ago:
            new_conf = max(memory['confidence'] - 0.05, 0.0)
            update_user_memory(
                tool_context,
                memory_id=memory['id'],
                confidence=new_conf
            )
```

### 5. Delete Low-Confidence Memories

```python
# Clean up memories with confidence < 0.5
low_conf_memories = get_user_memories(
    tool_context,
    min_confidence=0.0,
    limit=100
)
for memory in low_conf_memories:
    if memory['confidence'] < 0.5:
        delete_user_memory(
            tool_context,
            memory_id=memory['id']
        )
```

---

## Registering Tools with ADK Agents

### In `agent.py` or Coordinator Agent

```python
from backend.agents.tools.supabase_tools import (
    store_user_memory,
    get_user_memories,
    update_user_memory,
    delete_user_memory,
    search_user_memories
)

# Register tools
agent = Agent(
    name="coordinator",
    tools=[
        # ... existing tools
        store_user_memory,
        get_user_memories,
        update_user_memory,
        delete_user_memory,
        search_user_memories
    ]
)
```

### In Module-Specific Agents

```python
# Atlas agent - only needs patterns and preferences
atlas_agent = Agent(
    name="atlas",
    tools=[
        get_user_memories,  # Read-only context loading
        store_user_memory   # Store new patterns
    ]
)

# Journey agent - insights and emotional patterns
journey_agent = Agent(
    name="journey",
    tools=[
        get_user_memories,
        store_user_memory,
        update_user_memory  # Update emotional insights
    ]
)
```

---

## Testing

### Unit Test Example

```python
def test_store_and_retrieve_memory():
    # Store preference
    result = store_user_memory(
        tool_context,
        category='preference',
        key='test_key',
        value={'test': 'value'},
        source='explicit',
        confidence=1.0
    )
    assert result['status'] == 'success'
    memory_id = result['memory_id']

    # Retrieve
    memories = get_user_memories(tool_context, key='test_key')
    assert memories['count'] == 1
    assert memories['memories'][0]['value'] == {'test': 'value'}

    # Update
    update_result = update_user_memory(
        tool_context,
        memory_id=memory_id,
        confidence=0.95
    )
    assert update_result['status'] == 'success'

    # Delete
    delete_result = delete_user_memory(tool_context, memory_id=memory_id)
    assert delete_result['deleted_count'] == 1
```

---

## Security Considerations

### 1. User Isolation via RLS

All tools enforce Row-Level Security:
- Users can only access their own memories
- `user_id` extracted from JWT via `tool_context`
- LLM never controls `user_id`

### 2. Service Role Access

Service role (Edge Functions, n8n) can bypass RLS for automation:
```sql
CREATE POLICY "Service role full access to memory"
  ON user_memory FOR ALL
  USING (auth.role() = 'service_role');
```

### 3. JSONB Validation

The `value` field must be a dictionary:
```python
if not isinstance(value, dict):
    return {"status": "error", "message": "Value must be a dictionary"}
```

### 4. Confidence Bounds

Confidence must be 0.0-1.0:
```python
if not (0.0 <= confidence <= 1.0):
    return {"status": "error", "message": "Confidence must be between 0.0 and 1.0"}
```

---

## Performance Tips

### 1. Use Indexes Efficiently

Queries use these indexes:
- `idx_user_memory_user_id` - User filtering
- `idx_user_memory_category` - Category queries
- `idx_user_memory_value` (GIN) - JSONB search
- `idx_user_memory_confidence` - High-confidence filtering

### 2. Limit Results

Always use `limit` parameter:
```python
get_user_memories(tool_context, limit=20)  # Default
search_user_memories(tool_context, search_value={...}, limit=10)
```

### 3. Filter by Confidence

Reduce noise by filtering low-confidence memories:
```python
get_user_memories(
    tool_context,
    category='pattern',
    min_confidence=0.8  # Only high-quality patterns
)
```

### 4. Batch Updates

When updating multiple memories, use transactions (future enhancement).

---

## Migration Applied

**File:** `supabase/migrations/20260205000001_create_user_memory_table.sql`

**Includes:**
- Table creation with RLS
- Standard columns (id, created_at, updated_at)
- Indexes for performance
- Trigger for updated_at
- Helper function for last_accessed_at
- Documentation comments
- Example usage queries

**Safe to apply:** No data loss risk, creates new table only.

---

## Documentation

**Main Docs:**
- `docs/architecture/USER_MEMORY_SYSTEM.md` - Comprehensive system overview
- `docs/architecture/DATABASE_SCHEMA_NEW_TABLES.sql` - Schema reference
- `backend/agents/tools/supabase_tools.py` - Tool implementations

**Related:**
- Task #35 - User Memory Table specification
- Mem0 Architecture: https://mem0.ai/

---

**Maintainers:** Backend Architect Agent + Lucas Boscacci
**Last Updated:** 2026-02-05
