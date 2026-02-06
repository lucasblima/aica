# Write Tools Quick Reference

**Quick lookup for all write operations available in ADK agents.**

---

## Atlas (Task Management)

```python
from backend.agents.tools.supabase_tools import create_task, complete_task, update_task, delete_task

# Create
create_task(tool_context, title="Buy groceries", priority="high", priority_quadrant=1, due_date="2025-02-10")

# Complete
complete_task(tool_context, task_id="uuid")

# Update
update_task(tool_context, task_id="uuid", title="New title", status="in_progress")

# Delete
delete_task(tool_context, task_id="uuid")
```

---

## Journey (Self-Knowledge)

```python
from backend.agents.tools.supabase_tools import create_moment, analyze_emotional_pattern

# Create moment
create_moment(tool_context, content="Grateful for today", emotion="grateful", tags=["work", "health"])

# Analyze patterns
analyze_emotional_pattern(tool_context, days=30)
```

---

## Studio (Podcast Production)

```python
from backend.agents.tools.supabase_tools import create_episode, update_episode, save_guest_dossier

# Create episode
create_episode(tool_context, show_id="uuid", title="Interview with X", guest_name="John Doe", scheduled_date="2025-03-01")

# Update episode
update_episode(tool_context, episode_id="uuid", status="recorded", notes="Great session!")

# Save dossier
save_guest_dossier(
    tool_context,
    episode_id="uuid",
    guest_name="John Doe",
    biography="Full bio...",
    bio_summary="Short summary...",
    controversies=[{"title": "Issue 2020", "summary": "Description", "source": "https://..."}]
)
```

---

## Finance (Financial Tracking)

```python
from backend.agents.tools.supabase_tools import categorize_transaction, create_budget_alert

# Categorize
categorize_transaction(tool_context, transaction_id="uuid", category="alimentacao", subcategory="restaurantes")

# Create alert
create_budget_alert(tool_context, category="alimentacao", threshold=1500.0, period="monthly")
```

---

## Connections (CRM)

```python
from backend.agents.tools.supabase_tools import add_contact, log_interaction, schedule_followup

# Add contact
add_contact(
    tool_context,
    space_id="uuid",
    name="Jane Smith",
    email="jane@example.com",
    phone="+5511987654321",
    context_label="cliente",
    tags=["VIP", "tech"]
)

# Log interaction
log_interaction(tool_context, contact_id="uuid", interaction_type="meeting", notes="Discussed contract")

# Schedule follow-up
schedule_followup(tool_context, contact_id="uuid", date="2025-03-15", reason="Contract renewal")
```

---

## Captacao (Grant Writing)

```python
from backend.agents.tools.supabase_tools import save_grant_opportunity, update_grant_status

# Save opportunity
save_grant_opportunity(
    tool_context,
    title="FAPERJ Universal 2025",
    agency="FAPERJ",
    deadline="2025-06-30",
    url="https://...",
    match_score=85.0,
    description="Research funding for AI projects"
)

# Update status
update_grant_status(tool_context, grant_id="uuid", status="submitted", notes="Submitted via platform")
```

---

## Common Patterns

### Error Handling
```python
result = create_task(tool_context, title="Task")
if result["status"] == "error":
    print(f"Error: {result['message']}")
else:
    print(f"Success: {result['message']}")
    task_id = result.get("task_id")
```

### Authentication Check
All tools automatically check authentication via `tool_context`. If user is not authenticated:
```python
{"status": "error", "message": "User not authenticated"}
```

### Validation Errors
```python
# Invalid priority
{"status": "error", "message": "Invalid priority. Valid: ['urgent', 'high', 'medium', 'low', 'none']"}

# Invalid status
{"status": "error", "message": "Invalid status. Valid: ['draft', 'submitted', 'approved', 'rejected', 'cancelled']"}

# Missing required field
{"status": "error", "message": "Content cannot be empty"}
```

---

## Parameter Enums Reference

### Priority (Atlas)
`'urgent'`, `'high'`, `'medium'`, `'low'`, `'none'`

### Priority Quadrant (Atlas - Eisenhower)
- `1` - Q1 Urgent + Important (DO NOW)
- `2` - Q2 Important, not Urgent (SCHEDULE)
- `3` - Q3 Urgent, not Important (DELEGATE)
- `4` - Q4 Neither (ELIMINATE)

### Task Status (Atlas)
`'todo'`, `'in_progress'`, `'completed'`, `'cancelled'`

### Episode Status (Studio)
`'planned'`, `'scheduled'`, `'recorded'`, `'published'`

### Grant Status (Captacao)
`'draft'`, `'submitted'`, `'approved'`, `'rejected'`, `'cancelled'`

### Interaction Type (Connections)
`'meeting'`, `'email'`, `'call'`, `'message'`

### Transaction Type (Finance)
`'income'`, `'expense'`

### Period (Finance)
`'monthly'`, `'weekly'`, `'yearly'`

---

## Date Formats

All date parameters use **ISO 8601** format:
- **Date only:** `YYYY-MM-DD` (e.g., `"2025-02-15"`)
- **Datetime:** `YYYY-MM-DDTHH:MM:SS` (e.g., `"2025-02-15T14:30:00"`)

---

## Testing Tips

### Use DEV_USER_ID for local testing
```bash
# In .env.local
ADK_DEV_MODE=true
DEV_USER_ID=your-test-user-uuid
```

### Test with adk web
```bash
adk web --port 8080
```

### Test with curl
```bash
curl -X POST http://localhost:8080/adk/v1/process \
  -H "Content-Type: application/json" \
  -d '{"message": "Crie uma tarefa: Estudar Python", "session_id": "test"}'
```

---

## Security Notes

- **User ID is NEVER a parameter** - Always extracted from JWT session
- **RLS is enforced** - Users can only access their own data
- **Input validation** - All enums, ranges, and types are validated
- **No SQL injection** - All queries use Supabase client parameterization

---

## Related Docs

- **Full Implementation:** `docs/TASK_37_WRITE_TOOLS_COMPLETE.md`
- **Architecture:** `docs/architecture/backend_architecture.md`
- **Database Schema:** `docs/architecture/DATABASE_SCHEMA_NEW_TABLES.sql`
- **Testing Guide:** `backend/agents/tools/test_write_tools.py`

---

**Last Updated:** 2025-02-05
**Maintainer:** Backend Architect Agent
