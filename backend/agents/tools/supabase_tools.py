"""
Supabase Tools for ADK Agents

Provides database read tools that agents can use to fetch user data.

All tools use ADK's `tool_context` parameter (auto-injected by the framework)
to read the authenticated user_id from session state. The LLM never sees or
controls the user_id — it's forced from the JWT-verified session context.
"""

import os
from typing import Optional
from supabase import create_client, Client
from google.adk.tools.tool_context import ToolContext

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_client: Optional[Client] = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def _get_user_id(tool_context: ToolContext) -> str:
    """Extract user_id from ADK session state (set by main_agents.py at auth time)."""
    user_id = tool_context.state.get("user_id", "")
    if not user_id:
        return ""
    return str(user_id)


def get_pending_tasks(tool_context: ToolContext) -> dict:
    """Get the user's pending tasks from the Atlas module, including priority and due date."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    client = _get_client()
    result = client.table("work_items") \
        .select("id, title, priority, status, due_date, created_at") \
        .eq("user_id", user_id) \
        .eq("status", "pending") \
        .order("priority", desc=False) \
        .limit(20) \
        .execute()
    return {"status": "success", "tasks": result.data, "count": len(result.data)}


def get_completed_tasks_today(tool_context: ToolContext) -> dict:
    """Get the user's tasks completed today."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    from datetime import date
    today = date.today().isoformat()
    client = _get_client()
    result = client.table("work_items") \
        .select("id, title, priority, completed_at") \
        .eq("user_id", user_id) \
        .eq("status", "completed") \
        .gte("completed_at", today) \
        .execute()
    return {"status": "success", "tasks": result.data, "count": len(result.data)}


def get_recent_moments(limit: int = 5, tool_context: ToolContext = None) -> dict:
    """Get the user's recent moments/reflections from the Journey module.
    Optionally specify how many moments to retrieve (default 5)."""
    user_id = _get_user_id(tool_context) if tool_context else ""
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    client = _get_client()
    result = client.table("moments") \
        .select("id, content, emotion, type, tags, sentiment_data, created_at") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()
    return {"status": "success", "moments": result.data, "count": len(result.data)}


def get_active_grants(tool_context: ToolContext) -> dict:
    """Get the user's active grant projects from the Captacao module."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    client = _get_client()
    result = client.table("grant_projects") \
        .select("id, title, agency, status, deadline, created_at") \
        .eq("user_id", user_id) \
        .in_("status", ["active", "draft"]) \
        .order("deadline", desc=False) \
        .limit(10) \
        .execute()
    return {"status": "success", "grants": result.data, "count": len(result.data)}


def get_finance_summary(tool_context: ToolContext) -> dict:
    """Get the user's financial summary for the current month."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    from datetime import date
    month_start = date.today().replace(day=1).isoformat()
    client = _get_client()
    result = client.table("finance_transactions") \
        .select("type, amount, category, description, transaction_date") \
        .eq("user_id", user_id) \
        .gte("transaction_date", month_start) \
        .execute()

    income = sum(abs(float(t["amount"])) for t in result.data if t["type"] == "income")
    expenses = sum(abs(float(t["amount"])) for t in result.data if t["type"] == "expense")

    return {
        "status": "success",
        "monthly_income": income,
        "monthly_expenses": expenses,
        "balance": income - expenses,
        "transaction_count": len(result.data),
    }


def get_upcoming_episodes(tool_context: ToolContext) -> dict:
    """Get the user's upcoming podcast episodes from the Studio module."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    client = _get_client()
    result = client.table("podcast_episodes") \
        .select("id, title, status, guest_name, scheduled_date") \
        .eq("user_id", user_id) \
        .in_("status", ["planned", "scheduled"]) \
        .order("scheduled_date", desc=False) \
        .limit(10) \
        .execute()
    return {"status": "success", "episodes": result.data, "count": len(result.data)}


def get_user_profile(tool_context: ToolContext) -> dict:
    """Get the user's profile information."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    client = _get_client()
    result = client.table("profiles") \
        .select("full_name, avatar_url") \
        .eq("id", user_id) \
        .single() \
        .execute()
    return {"status": "success", "profile": result.data}


def get_connection_spaces(tool_context: ToolContext) -> dict:
    """Get all the user's connection spaces (habitat, ventures, academia, tribo).
    Returns spaces with member count and archetype type."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    client = _get_client()
    result = client.table("connection_spaces") \
        .select("id, name, archetype, subtitle, description, is_active, is_favorite, created_at") \
        .eq("user_id", user_id) \
        .eq("is_active", True) \
        .order("is_favorite", desc=True) \
        .order("created_at", desc=True) \
        .execute()
    return {"status": "success", "spaces": result.data, "count": len(result.data)}


def get_space_members(space_id: str, tool_context: ToolContext) -> dict:
    """Get members of a specific connection space.
    Requires the space_id. Returns member names, roles, and contact info."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    client = _get_client()
    result = client.table("connection_members") \
        .select("id, external_name, external_email, external_phone, role, context_label, is_active, last_interaction_at") \
        .eq("space_id", space_id) \
        .eq("is_active", True) \
        .order("role", desc=False) \
        .execute()
    return {"status": "success", "members": result.data, "count": len(result.data)}


def search_connections(query: str, tool_context: ToolContext) -> dict:
    """Search across all connection members by name, email or phone.
    Useful to find a specific contact across all spaces."""
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}
    client = _get_client()
    # Search by name (ilike for case-insensitive)
    result = client.table("connection_members") \
        .select("id, external_name, external_email, external_phone, role, context_label, space_id") \
        .eq("is_active", True) \
        .ilike("external_name", f"%{query}%") \
        .limit(20) \
        .execute()
    return {"status": "success", "contacts": result.data, "count": len(result.data)}
