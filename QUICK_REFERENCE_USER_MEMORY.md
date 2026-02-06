# User Memory System - Quick Reference Card

## 🚀 Quick Start

### Migration
```bash
# Apply migration
npx supabase db push

# Verify
npx supabase db execute -f supabase/migrations/VERIFY_USER_MEMORY_TABLE.sql
```

### Register Tools
```python
from backend.agents.tools.supabase_tools import (
    store_user_memory,
    get_user_memories,
    update_user_memory,
    delete_user_memory,
    search_user_memories
)

agent.tools = [store_user_memory, get_user_memories, ...]
```

---

## 📝 5 Tools Cheat Sheet

### 1. Store Memory
```python
store_user_memory(
    tool_context,
    category='preference',  # profile, preference, fact, insight, pattern
    key='communication_style',
    value={'tone': 'informal'},
    module='atlas',  # or None for global
    source='explicit',  # explicit, inferred, observed
    confidence=1.0  # 0.0-1.0
)
```

### 2. Get Memories
```python
get_user_memories(
    tool_context,
    category='pattern',
    module='atlas',
    min_confidence=0.8,
    limit=20
)
```

### 3. Update Memory
```python
update_user_memory(
    tool_context,
    memory_id="uuid",
    confidence=0.95
)
```

### 4. Delete Memory
```python
delete_user_memory(
    tool_context,
    memory_id="uuid"  # or key='test_key'
)
```

### 5. Search Memories
```python
search_user_memories(
    tool_context,
    search_value={'trigger': 'deadlines'},
    limit=10
)
```

---

## 📊 Memory Categories

| Category | Use Case | Example Keys |
|----------|----------|--------------|
| **profile** | Static info | name, location, timezone |
| **preference** | User choices | communication_style, theme |
| **fact** | Observed truths | work_hours, emotional_triggers |
| **insight** | AI conclusions | productivity_emotion_correlation |
| **pattern** | Behavioral trends | productivity_peak, procrastination_triggers |

---

## 🔐 Security

- ✅ RLS enforces user isolation
- ✅ JWT extracts user_id (LLM never controls it)
- ✅ Service role bypass for automation
- ✅ GDPR-compliant deletion

---

## 🎯 Common Patterns

### Load Context Before Response
```python
prefs = get_user_memories(tool_context, category='preference')
patterns = get_user_memories(tool_context, category='pattern', module='atlas')

# Use in prompt
response = gemini.generate_content(
    prompt=f"User preferences: {prefs}. Patterns: {patterns}. Suggest tasks."
)
```

### Store After Interaction
```python
# After detecting pattern
if user_completed_tasks_at_9am >= 5:
    store_user_memory(
        tool_context,
        category='pattern',
        key='productivity_peak',
        value={'best_hours': ['09:00', '10:00']},
        module='atlas',
        source='observed',
        confidence=0.89
    )
```

### Reinforce Validated Memory
```python
# After user confirms suggestion
if user_feedback == 'helpful':
    update_user_memory(
        tool_context,
        memory_id=memory_id,
        confidence=min(current_conf + 0.05, 1.0)
    )
```

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `supabase/migrations/20260205000001_create_user_memory_table.sql` | Migration |
| `backend/agents/tools/supabase_tools.py` | Tools (lines 1065-1400+) |
| `docs/architecture/USER_MEMORY_SYSTEM.md` | Full architecture guide |
| `backend/agents/tools/USER_MEMORY_TOOLS_README.md` | Integration guide |
| `supabase/migrations/VERIFY_USER_MEMORY_TABLE.sql` | Verification script |

---

## ⚡ Performance Tips

1. **Always filter by user_id** (enforced by RLS)
2. **Use limits:** Default 20, adjust as needed
3. **Filter by confidence:** `min_confidence=0.8` reduces noise
4. **JSONB search uses GIN index:** Fast for `@>` operator

---

## 🐛 Troubleshooting

### RLS blocks service role?
Check policy: `SELECT * FROM pg_policies WHERE tablename = 'user_memory'`

### Upsert not working?
Verify unique constraint exists

### JSONB search slow?
Check GIN index: `SELECT * FROM pg_indexes WHERE tablename = 'user_memory'`

---

## 📚 Full Documentation

- Architecture: `docs/architecture/USER_MEMORY_SYSTEM.md`
- Integration: `backend/agents/tools/USER_MEMORY_TOOLS_README.md`
- Summary: `docs/TASK_35_USER_MEMORY_IMPLEMENTATION.md`

---

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Date:** 2026-02-05
