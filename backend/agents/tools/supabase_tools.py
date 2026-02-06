"""
Supabase Tools for ADK Agents

Provides database read tools that agents can use to fetch user data.

All tools use ADK's `tool_context` parameter (auto-injected by the framework)
to read the authenticated user_id from session state. The LLM never sees or
controls the user_id — it's forced from the JWT-verified session context.

In dev mode (ADK_DEV_MODE=true), a fallback DEV_USER_ID is used when
session state is not populated. This enables testing with `adk web`.
"""

import os
from typing import Optional
from supabase import create_client, Client
from google.adk.tools.tool_context import ToolContext

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Dev mode configuration (set via .env.local)
ADK_DEV_MODE = os.getenv("ADK_DEV_MODE", "false").lower() == "true"
DEV_USER_ID = os.getenv("DEV_USER_ID", "")

_client: Optional[Client] = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def _get_user_id(tool_context: ToolContext) -> str:
    """
    Extract user_id from ADK session state (set by main_agents.py at auth time).

    In production: user_id comes from JWT verification in main_agents.py
    In dev mode (adk web): Falls back to DEV_USER_ID if session state is empty

    Security: The LLM never controls the user_id - it's always server-side.
    """
    user_id = tool_context.state.get("user_id", "")

    if not user_id:
        # Dev mode fallback - only used when session state is not populated
        if ADK_DEV_MODE and DEV_USER_ID:
            return str(DEV_USER_ID)
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


# ============================================================================
# WRITE TOOLS - Essential Actions
# ============================================================================


def create_task(
    tool_context: ToolContext,
    title: str,
    priority: str = "medium",
    priority_quadrant: int = None,
    due_date: str = None,
    description: str = None
) -> dict:
    """Cria uma nova tarefa no Atlas (Meu Dia).

    Args:
        title: Titulo da tarefa (obrigatorio)
        priority: Prioridade: 'urgent', 'high', 'medium', 'low', 'none' (default: 'medium')
        priority_quadrant: Quadrante Eisenhower: 1-4 (1=Q1 Urgente+Importante, 2=Q2 Importante, 3=Q3 Urgente, 4=Q4 Baixa)
        due_date: Data de vencimento (formato ISO: YYYY-MM-DD)
        description: Descricao detalhada da tarefa

    Returns:
        dict: {"status": "success", "task_id": uuid, "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    # Validate priority
    valid_priorities = ['urgent', 'high', 'medium', 'low', 'none']
    if priority not in valid_priorities:
        priority = 'medium'

    # Validate priority_quadrant
    if priority_quadrant is not None:
        if not (1 <= priority_quadrant <= 4):
            return {"status": "error", "message": "priority_quadrant must be between 1 and 4"}

    try:
        client = _get_client()

        # Build task data
        task_data = {
            "user_id": user_id,
            "title": title,
            "priority": priority,
            "status": "todo"
        }

        if priority_quadrant is not None:
            task_data["priority_quadrant"] = priority_quadrant
        if due_date is not None:
            task_data["due_date"] = due_date
        if description is not None:
            task_data["description"] = description

        # Insert task
        result = client.table("work_items").insert(task_data).execute()

        if result.data and len(result.data) > 0:
            task_id = result.data[0]["id"]
            return {
                "status": "success",
                "task_id": task_id,
                "message": f"Tarefa '{title}' criada com sucesso!"
            }
        else:
            return {"status": "error", "message": "Failed to create task"}

    except Exception as e:
        return {"status": "error", "message": f"Error creating task: {str(e)}"}


def complete_task(tool_context: ToolContext, task_id: str) -> dict:
    """Marca uma tarefa como concluida.

    Args:
        task_id: UUID da tarefa a ser concluida

    Returns:
        dict: {"status": "success", "message": "Tarefa concluida"}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()
        from datetime import datetime

        # Update task status
        result = client.table("work_items") \
            .update({
                "status": "completed",
                "is_completed": True,
                "completed_at": datetime.utcnow().isoformat()
            }) \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()

        if result.data and len(result.data) > 0:
            task_title = result.data[0].get("title", "Tarefa")
            return {
                "status": "success",
                "message": f"Tarefa '{task_title}' marcada como concluida!"
            }
        else:
            return {"status": "error", "message": "Task not found or unauthorized"}

    except Exception as e:
        return {"status": "error", "message": f"Error completing task: {str(e)}"}


def create_moment(
    tool_context: ToolContext,
    content: str,
    emotion: str = None,
    tags: list = None
) -> dict:
    """Cria um novo momento/reflexao no Journey.

    Args:
        content: Conteudo textual da reflexao (obrigatorio)
        emotion: Emocao (ex: 'happy', 'sad', 'anxious', 'calm', 'excited', 'grateful')
        tags: Lista de tags (ex: ['trabalho', 'saude', 'familia'])

    Returns:
        dict: {"status": "success", "moment_id": uuid, "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    if not content or len(content.strip()) == 0:
        return {"status": "error", "message": "Content cannot be empty"}

    try:
        client = _get_client()

        # Build moment data
        moment_data = {
            "user_id": user_id,
            "content": content,
            "type": "text"  # Default type for text-only moments
        }

        if emotion is not None:
            moment_data["emotion"] = emotion
        if tags is not None and isinstance(tags, list):
            moment_data["tags"] = tags

        # Insert moment
        result = client.table("moments").insert(moment_data).execute()

        if result.data and len(result.data) > 0:
            moment_id = result.data[0]["id"]

            # Award consciousness points for moment creation
            try:
                # Call the award_consciousness_points function
                client.rpc("award_consciousness_points", {
                    "p_user_id": user_id,
                    "p_points": 10,
                    "p_reason": "moment_registered",
                    "p_reference_id": moment_id,
                    "p_reference_type": "moment"
                }).execute()

                # Update streak
                client.rpc("update_moment_streak", {"p_user_id": user_id}).execute()
            except Exception as points_error:
                # Non-critical: log but don't fail the moment creation
                print(f"Warning: Failed to award points: {points_error}")

            return {
                "status": "success",
                "moment_id": moment_id,
                "message": "Momento registrado com sucesso! +10 Pontos de Consciencia"
            }
        else:
            return {"status": "error", "message": "Failed to create moment"}

    except Exception as e:
        return {"status": "error", "message": f"Error creating moment: {str(e)}"}


# ============================================================================
# ATLAS MODULE - Additional Write Tools
# ============================================================================


def update_task(
    tool_context: ToolContext,
    task_id: str,
    title: str = None,
    description: str = None,
    priority: str = None,
    priority_quadrant: int = None,
    due_date: str = None,
    status: str = None
) -> dict:
    """Atualiza uma tarefa existente no Atlas.

    Args:
        task_id: UUID da tarefa a ser atualizada
        title: Novo titulo da tarefa
        description: Nova descricao
        priority: Nova prioridade ('urgent', 'high', 'medium', 'low', 'none')
        priority_quadrant: Novo quadrante Eisenhower (1-4)
        due_date: Nova data de vencimento (formato ISO: YYYY-MM-DD)
        status: Novo status ('todo', 'in_progress', 'completed', 'cancelled')

    Returns:
        dict: {"status": "success", "message": "Tarefa atualizada"}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()
        update_data = {}

        if title is not None:
            update_data["title"] = title
        if description is not None:
            update_data["description"] = description
        if priority is not None:
            valid_priorities = ['urgent', 'high', 'medium', 'low', 'none']
            if priority in valid_priorities:
                update_data["priority"] = priority
        if priority_quadrant is not None:
            if 1 <= priority_quadrant <= 4:
                update_data["priority_quadrant"] = priority_quadrant
        if due_date is not None:
            update_data["due_date"] = due_date
        if status is not None:
            valid_statuses = ['todo', 'in_progress', 'completed', 'cancelled']
            if status in valid_statuses:
                update_data["status"] = status

        if not update_data:
            return {"status": "error", "message": "No valid fields to update"}

        result = client.table("work_items") \
            .update(update_data) \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()

        if result.data and len(result.data) > 0:
            return {
                "status": "success",
                "message": "Tarefa atualizada com sucesso!"
            }
        else:
            return {"status": "error", "message": "Task not found or unauthorized"}

    except Exception as e:
        return {"status": "error", "message": f"Error updating task: {str(e)}"}


def delete_task(tool_context: ToolContext, task_id: str) -> dict:
    """Remove uma tarefa do Atlas.

    Args:
        task_id: UUID da tarefa a ser removida

    Returns:
        dict: {"status": "success", "message": "Tarefa removida"}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        result = client.table("work_items") \
            .delete() \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()

        if result.data and len(result.data) > 0:
            return {
                "status": "success",
                "message": "Tarefa removida com sucesso!"
            }
        else:
            return {"status": "error", "message": "Task not found or unauthorized"}

    except Exception as e:
        return {"status": "error", "message": f"Error deleting task: {str(e)}"}


# ============================================================================
# JOURNEY MODULE - Additional Write Tools
# ============================================================================


def analyze_emotional_pattern(
    tool_context: ToolContext,
    days: int = 30
) -> dict:
    """Analisa padroes emocionais dos ultimos N dias usando moments.

    Args:
        days: Numero de dias para analise (default: 30)

    Returns:
        dict: Analise de emocoes frequentes, tendencias e insights
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from datetime import datetime, timedelta
        client = _get_client()

        # Calculate date threshold
        threshold_date = (datetime.now() - timedelta(days=days)).isoformat()

        # Fetch moments from last N days
        result = client.table("moments") \
            .select("emotion, tags, created_at, sentiment_data") \
            .eq("user_id", user_id) \
            .gte("created_at", threshold_date) \
            .execute()

        if not result.data:
            return {
                "status": "success",
                "message": "Nenhum momento encontrado no periodo",
                "emotion_counts": {},
                "total_moments": 0
            }

        # Count emotions
        emotion_counts = {}
        for moment in result.data:
            emotion = moment.get("emotion")
            if emotion:
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

        # Find most frequent emotion
        most_frequent = max(emotion_counts.items(), key=lambda x: x[1]) if emotion_counts else None

        return {
            "status": "success",
            "total_moments": len(result.data),
            "emotion_counts": emotion_counts,
            "most_frequent_emotion": most_frequent[0] if most_frequent else None,
            "days_analyzed": days,
            "message": f"Analisados {len(result.data)} momentos dos ultimos {days} dias"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error analyzing patterns: {str(e)}"}


# ============================================================================
# STUDIO MODULE - Write Tools
# ============================================================================


def create_episode(
    tool_context: ToolContext,
    show_id: str,
    title: str,
    guest_name: str = None,
    scheduled_date: str = None,
    description: str = None
) -> dict:
    """Cria um novo episodio de podcast no Studio.

    Args:
        show_id: UUID do show/podcast
        title: Titulo do episodio
        guest_name: Nome do convidado (opcional)
        scheduled_date: Data agendada (formato ISO: YYYY-MM-DD)
        description: Descricao do episodio

    Returns:
        dict: {"status": "success", "episode_id": uuid, "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        episode_data = {
            "user_id": user_id,
            "show_id": show_id,
            "title": title,
            "status": "planned"
        }

        if guest_name is not None:
            episode_data["guest_name"] = guest_name
        if scheduled_date is not None:
            episode_data["scheduled_date"] = scheduled_date
        if description is not None:
            episode_data["description"] = description

        result = client.table("podcast_episodes").insert(episode_data).execute()

        if result.data and len(result.data) > 0:
            episode_id = result.data[0]["id"]
            return {
                "status": "success",
                "episode_id": episode_id,
                "message": f"Episodio '{title}' criado com sucesso!"
            }
        else:
            return {"status": "error", "message": "Failed to create episode"}

    except Exception as e:
        return {"status": "error", "message": f"Error creating episode: {str(e)}"}


def update_episode(
    tool_context: ToolContext,
    episode_id: str,
    title: str = None,
    status: str = None,
    notes: str = None,
    guest_name: str = None,
    scheduled_date: str = None
) -> dict:
    """Atualiza um episodio de podcast existente.

    Args:
        episode_id: UUID do episodio
        title: Novo titulo
        status: Novo status ('planned', 'scheduled', 'recorded', 'published')
        notes: Notas adicionais
        guest_name: Nome do convidado
        scheduled_date: Data agendada

    Returns:
        dict: {"status": "success", "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()
        update_data = {}

        if title is not None:
            update_data["title"] = title
        if status is not None:
            valid_statuses = ['planned', 'scheduled', 'recorded', 'published']
            if status in valid_statuses:
                update_data["status"] = status
        if notes is not None:
            update_data["notes"] = notes
        if guest_name is not None:
            update_data["guest_name"] = guest_name
        if scheduled_date is not None:
            update_data["scheduled_date"] = scheduled_date

        if not update_data:
            return {"status": "error", "message": "No valid fields to update"}

        result = client.table("podcast_episodes") \
            .update(update_data) \
            .eq("id", episode_id) \
            .eq("user_id", user_id) \
            .execute()

        if result.data and len(result.data) > 0:
            return {
                "status": "success",
                "message": "Episodio atualizado com sucesso!"
            }
        else:
            return {"status": "error", "message": "Episode not found or unauthorized"}

    except Exception as e:
        return {"status": "error", "message": f"Error updating episode: {str(e)}"}


def save_guest_dossier(
    tool_context: ToolContext,
    episode_id: str,
    guest_name: str,
    biography: str = None,
    bio_summary: str = None,
    controversies: list = None
) -> dict:
    """Salva dossie de convidado gerado pelo agente.

    Args:
        episode_id: UUID do episodio
        guest_name: Nome do convidado
        biography: Biografia completa
        bio_summary: Resumo da biografia
        controversies: Lista de controversias [{title, summary, source}]

    Returns:
        dict: {"status": "success", "research_id": uuid, "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        research_data = {
            "episode_id": episode_id,
            "guest_name": guest_name,
            "profile_search_completed": True
        }

        if biography is not None:
            research_data["biography"] = biography
        if bio_summary is not None:
            research_data["bio_summary"] = bio_summary
        if controversies is not None and isinstance(controversies, list):
            import json
            research_data["controversies"] = json.dumps(controversies)

        result = client.table("podcast_guest_research").insert(research_data).execute()

        if result.data and len(result.data) > 0:
            research_id = result.data[0]["id"]
            return {
                "status": "success",
                "research_id": research_id,
                "message": f"Dossie de {guest_name} salvo com sucesso!"
            }
        else:
            return {"status": "error", "message": "Failed to save guest dossier"}

    except Exception as e:
        return {"status": "error", "message": f"Error saving dossier: {str(e)}"}


# ============================================================================
# FINANCE MODULE - Write Tools
# ============================================================================


def categorize_transaction(
    tool_context: ToolContext,
    transaction_id: str,
    category: str,
    subcategory: str = None
) -> dict:
    """Categoriza uma transacao financeira.

    Args:
        transaction_id: UUID da transacao
        category: Categoria principal (ex: 'alimentacao', 'transporte', 'moradia')
        subcategory: Subcategoria (opcional)

    Returns:
        dict: {"status": "success", "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        update_data = {"category": category}
        if subcategory is not None:
            update_data["subcategory"] = subcategory

        result = client.table("finance_transactions") \
            .update(update_data) \
            .eq("id", transaction_id) \
            .eq("user_id", user_id) \
            .execute()

        if result.data and len(result.data) > 0:
            return {
                "status": "success",
                "message": f"Transacao categorizada como '{category}'"
            }
        else:
            return {"status": "error", "message": "Transaction not found or unauthorized"}

    except Exception as e:
        return {"status": "error", "message": f"Error categorizing transaction: {str(e)}"}


def create_budget_alert(
    tool_context: ToolContext,
    category: str,
    threshold: float,
    period: str = "monthly"
) -> dict:
    """Cria alerta de orcamento para uma categoria.

    Args:
        category: Categoria a monitorar
        threshold: Valor limite em reais
        period: Periodo ('monthly', 'weekly', 'yearly')

    Returns:
        dict: {"status": "success", "alert_id": uuid, "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        # Note: Assuming a budget_alerts table exists or will be created
        # For now, return a placeholder success
        return {
            "status": "success",
            "message": f"Alerta criado: {category} com limite de R$ {threshold:.2f}/{period}",
            "note": "Budget alerts table to be created in future migration"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error creating budget alert: {str(e)}"}


# ============================================================================
# CONNECTIONS MODULE - Write Tools
# ============================================================================


def add_contact(
    tool_context: ToolContext,
    space_id: str,
    name: str,
    email: str = None,
    phone: str = None,
    context_label: str = None,
    tags: list = None
) -> dict:
    """Adiciona novo contato ao CRM pessoal (Connections).

    Args:
        space_id: UUID do connection space
        name: Nome do contato
        email: Email (opcional)
        phone: Telefone (opcional)
        context_label: Label de contexto (ex: 'cliente', 'fornecedor')
        tags: Lista de tags

    Returns:
        dict: {"status": "success", "contact_id": uuid, "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        contact_data = {
            "space_id": space_id,
            "external_name": name,
            "role": "member"
        }

        if email is not None:
            contact_data["external_email"] = email
        if phone is not None:
            contact_data["external_phone"] = phone
        if context_label is not None:
            contact_data["context_label"] = context_label
        if tags is not None and isinstance(tags, list):
            contact_data["tags"] = tags

        result = client.table("connection_members").insert(contact_data).execute()

        if result.data and len(result.data) > 0:
            contact_id = result.data[0]["id"]
            return {
                "status": "success",
                "contact_id": contact_id,
                "message": f"Contato '{name}' adicionado com sucesso!"
            }
        else:
            return {"status": "error", "message": "Failed to add contact"}

    except Exception as e:
        return {"status": "error", "message": f"Error adding contact: {str(e)}"}


def log_interaction(
    tool_context: ToolContext,
    contact_id: str,
    interaction_type: str,
    notes: str = None
) -> dict:
    """Registra interacao com contato (reuniao, email, ligacao).

    Args:
        contact_id: UUID do membro do connection space
        interaction_type: Tipo ('meeting', 'email', 'call', 'message')
        notes: Notas sobre a interacao

    Returns:
        dict: {"status": "success", "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from datetime import datetime
        client = _get_client()

        # Update last_interaction_at on the contact
        result = client.table("connection_members") \
            .update({"last_interaction_at": datetime.utcnow().isoformat()}) \
            .eq("id", contact_id) \
            .execute()

        if result.data and len(result.data) > 0:
            return {
                "status": "success",
                "message": f"Interacao '{interaction_type}' registrada com sucesso!",
                "note": "Full interaction logging table to be created in future migration"
            }
        else:
            return {"status": "error", "message": "Contact not found"}

    except Exception as e:
        return {"status": "error", "message": f"Error logging interaction: {str(e)}"}


def schedule_followup(
    tool_context: ToolContext,
    contact_id: str,
    date: str,
    reason: str
) -> dict:
    """Agenda follow-up com contato.

    Args:
        contact_id: UUID do contato
        date: Data do follow-up (formato ISO: YYYY-MM-DD)
        reason: Motivo do follow-up

    Returns:
        dict: {"status": "success", "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        # This could create a work_item linked to the contact
        # For now, return placeholder
        return {
            "status": "success",
            "message": f"Follow-up agendado para {date}: {reason}",
            "note": "Follow-up scheduling to be integrated with Atlas work_items"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error scheduling followup: {str(e)}"}


# ============================================================================
# CAPTACAO (GRANTS) MODULE - Write Tools
# ============================================================================


def save_grant_opportunity(
    tool_context: ToolContext,
    title: str,
    agency: str,
    deadline: str,
    url: str = None,
    match_score: float = None,
    description: str = None
) -> dict:
    """Salva oportunidade de edital encontrada.

    Args:
        title: Titulo do edital
        agency: Agencia (ex: 'FAPERJ', 'FINEP', 'CNPq')
        deadline: Data limite (formato ISO: YYYY-MM-DD)
        url: URL do edital
        match_score: Score de compatibilidade (0-100)
        description: Descricao do edital

    Returns:
        dict: {"status": "success", "opportunity_id": uuid, "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        opportunity_data = {
            "user_id": user_id,
            "title": title,
            "agency": agency,
            "deadline": deadline,
            "status": "open"
        }

        if url is not None:
            opportunity_data["url"] = url
        if match_score is not None:
            opportunity_data["match_score"] = match_score
        if description is not None:
            opportunity_data["description"] = description

        result = client.table("grant_opportunities").insert(opportunity_data).execute()

        if result.data and len(result.data) > 0:
            opportunity_id = result.data[0]["id"]
            return {
                "status": "success",
                "opportunity_id": opportunity_id,
                "message": f"Edital '{title}' salvo com sucesso!"
            }
        else:
            return {"status": "error", "message": "Failed to save opportunity"}

    except Exception as e:
        return {"status": "error", "message": f"Error saving opportunity: {str(e)}"}


def update_grant_status(
    tool_context: ToolContext,
    grant_id: str,
    status: str,
    notes: str = None
) -> dict:
    """Atualiza status de candidatura a edital.

    Args:
        grant_id: UUID do grant_project
        status: Novo status ('draft', 'submitted', 'approved', 'rejected', 'cancelled')
        notes: Notas adicionais

    Returns:
        dict: {"status": "success", "message": "..."}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        update_data = {"status": status}
        if notes is not None:
            update_data["notes"] = notes

        valid_statuses = ['draft', 'submitted', 'approved', 'rejected', 'cancelled']
        if status not in valid_statuses:
            return {"status": "error", "message": f"Invalid status. Valid: {valid_statuses}"}

        result = client.table("grant_projects") \
            .update(update_data) \
            .eq("id", grant_id) \
            .eq("user_id", user_id) \
            .execute()

        if result.data and len(result.data) > 0:
            return {
                "status": "success",
                "message": f"Status atualizado para '{status}'"
            }
        else:
            return {"status": "error", "message": "Grant project not found or unauthorized"}

    except Exception as e:
        return {"status": "error", "message": f"Error updating grant status: {str(e)}"}


# ============================================================================
# USER MEMORY SYSTEM - Mem0-style Agent Learning Tools (Task #35)
# ============================================================================


def store_user_memory(
    tool_context: ToolContext,
    category: str,
    key: str,
    value: dict,
    module: str = None,
    source: str = "inferred",
    confidence: float = 0.8
) -> dict:
    """Armazena uma memoria sobre o usuario para aprendizado persistente.

    Este sistema permite que agentes lembrem fatos, preferencias, insights e
    padroes sobre o usuario ao longo do tempo, criando interacoes personalizadas.

    Args:
        category: Tipo de memoria ('profile', 'preference', 'fact', 'insight', 'pattern')
        key: Identificador semantico (ex: 'communication_style', 'productivity_peak')
        value: Dados estruturados da memoria (dict)
        module: Contexto do modulo (None=global, 'atlas', 'journey', 'studio', 'captacao', 'finance', 'connections')
        source: Origem ('explicit'=usuario disse, 'inferred'=LLM deduziu, 'observed'=sistema rastreou)
        confidence: Nivel de confianca 0-1 (default: 0.8)

    Returns:
        dict: {"status": "success", "memory_id": uuid, "message": "..."}

    Examples:
        # Preferencia global
        store_user_memory(
            tool_context,
            category='preference',
            key='communication_style',
            value={'tone': 'informal', 'language': 'pt-BR'},
            source='explicit',
            confidence=1.0
        )

        # Padrao do Atlas
        store_user_memory(
            tool_context,
            category='pattern',
            key='productivity_peak',
            value={'best_hours': ['09:00', '10:00', '11:00']},
            module='atlas',
            source='observed',
            confidence=0.92
        )
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    # Validate category
    valid_categories = ['profile', 'preference', 'fact', 'insight', 'pattern']
    if category not in valid_categories:
        return {"status": "error", "message": f"Invalid category. Valid: {valid_categories}"}

    # Validate source
    valid_sources = ['explicit', 'inferred', 'observed']
    if source not in valid_sources:
        return {"status": "error", "message": f"Invalid source. Valid: {valid_sources}"}

    # Validate module
    if module is not None:
        valid_modules = ['atlas', 'journey', 'studio', 'captacao', 'finance', 'connections']
        if module not in valid_modules:
            return {"status": "error", "message": f"Invalid module. Valid: {valid_modules} or None"}

    # Validate confidence
    if not (0.0 <= confidence <= 1.0):
        return {"status": "error", "message": "Confidence must be between 0.0 and 1.0"}

    # Validate value is dict
    if not isinstance(value, dict):
        return {"status": "error", "message": "Value must be a dictionary"}

    try:
        client = _get_client()
        import json

        memory_data = {
            "user_id": user_id,
            "category": category,
            "key": key,
            "value": json.dumps(value),  # JSONB field
            "source": source,
            "confidence": confidence
        }

        if module is not None:
            memory_data["module"] = module

        # Upsert: insert or update if unique constraint exists
        result = client.table("user_memory") \
            .upsert(memory_data, on_conflict="user_id,category,key,module") \
            .execute()

        if result.data and len(result.data) > 0:
            memory_id = result.data[0]["id"]
            return {
                "status": "success",
                "memory_id": memory_id,
                "message": f"Memoria '{key}' armazenada com sucesso (confianca: {confidence:.0%})"
            }
        else:
            return {"status": "error", "message": "Failed to store memory"}

    except Exception as e:
        return {"status": "error", "message": f"Error storing memory: {str(e)}"}


def get_user_memories(
    tool_context: ToolContext,
    category: str = None,
    module: str = None,
    key: str = None,
    min_confidence: float = 0.0,
    limit: int = 20
) -> dict:
    """Recupera memorias armazenadas sobre o usuario.

    Use este tool para carregar contexto antes de gerar respostas personalizadas.
    As memorias retornadas incluem fatos, preferencias, insights e padroes
    aprendidos ao longo do tempo.

    Args:
        category: Filtrar por tipo ('profile', 'preference', 'fact', 'insight', 'pattern')
        module: Filtrar por modulo ('atlas', 'journey', 'studio', 'captacao', 'finance', 'connections')
        key: Filtrar por chave especifica (ex: 'communication_style')
        min_confidence: Retornar apenas memorias com confianca >= este valor (0-1)
        limit: Maximo de memorias a retornar (default: 20)

    Returns:
        dict: {"status": "success", "memories": [...], "count": int}

    Examples:
        # Buscar todas as preferencias do usuario
        get_user_memories(tool_context, category='preference')

        # Buscar padroes do Atlas com alta confianca
        get_user_memories(tool_context, category='pattern', module='atlas', min_confidence=0.8)

        # Buscar memoria especifica
        get_user_memories(tool_context, key='productivity_peak')
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        client = _get_client()

        # Build query
        query = client.table("user_memory") \
            .select("id, category, module, key, value, confidence, source, created_at, last_accessed_at") \
            .eq("user_id", user_id) \
            .gte("confidence", min_confidence) \
            .order("confidence", desc=True) \
            .limit(limit)

        # Apply filters
        if category is not None:
            query = query.eq("category", category)
        if module is not None:
            query = query.eq("module", module)
        if key is not None:
            query = query.eq("key", key)

        result = query.execute()

        # Update last_accessed_at for retrieved memories (async, non-blocking)
        if result.data:
            memory_ids = [m["id"] for m in result.data]
            for memory_id in memory_ids:
                try:
                    client.rpc("update_user_memory_last_accessed", {"memory_id": memory_id}).execute()
                except Exception:
                    pass  # Non-critical, don't fail the query

        return {
            "status": "success",
            "memories": result.data,
            "count": len(result.data)
        }

    except Exception as e:
        return {"status": "error", "message": f"Error retrieving memories: {str(e)}"}


def update_user_memory(
    tool_context: ToolContext,
    memory_id: str,
    value: dict = None,
    confidence: float = None
) -> dict:
    """Atualiza uma memoria existente.

    Use este tool quando uma memoria precisa ser refinada ou quando a confianca
    aumenta/diminui com base em novas observacoes.

    Args:
        memory_id: UUID da memoria a ser atualizada
        value: Novo valor estruturado (opcional, mantem existente se None)
        confidence: Nova confianca 0-1 (opcional, mantem existente se None)

    Returns:
        dict: {"status": "success", "message": "..."}

    Examples:
        # Aumentar confianca de uma memoria validada
        update_user_memory(tool_context, memory_id="uuid", confidence=0.95)

        # Atualizar valor e confianca
        update_user_memory(
            tool_context,
            memory_id="uuid",
            value={'updated_field': 'new_value'},
            confidence=0.9
        )
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    if value is None and confidence is None:
        return {"status": "error", "message": "Must provide either value or confidence to update"}

    try:
        client = _get_client()
        update_data = {}

        if value is not None:
            if not isinstance(value, dict):
                return {"status": "error", "message": "Value must be a dictionary"}
            import json
            update_data["value"] = json.dumps(value)

        if confidence is not None:
            if not (0.0 <= confidence <= 1.0):
                return {"status": "error", "message": "Confidence must be between 0.0 and 1.0"}
            update_data["confidence"] = confidence

        result = client.table("user_memory") \
            .update(update_data) \
            .eq("id", memory_id) \
            .eq("user_id", user_id) \
            .execute()

        if result.data and len(result.data) > 0:
            return {
                "status": "success",
                "message": "Memoria atualizada com sucesso"
            }
        else:
            return {"status": "error", "message": "Memory not found or unauthorized"}

    except Exception as e:
        return {"status": "error", "message": f"Error updating memory: {str(e)}"}


def delete_user_memory(
    tool_context: ToolContext,
    memory_id: str = None,
    key: str = None,
    category: str = None,
    module: str = None
) -> dict:
    """Remove memorias do usuario.

    Use este tool para limpar memorias desatualizadas, incorretas ou quando
    solicitado pelo usuario (direito ao esquecimento).

    Args:
        memory_id: UUID especifico da memoria (prioridade)
        key: Remove todas as memorias com esta chave
        category: Remove todas as memorias desta categoria (requer confirmacao)
        module: Filtro adicional para remover por modulo

    Returns:
        dict: {"status": "success", "deleted_count": int, "message": "..."}

    Warning:
        Remover por categoria sem filtros adicionais pode deletar muitas memorias.
        Use com cuidado.

    Examples:
        # Remover memoria especifica
        delete_user_memory(tool_context, memory_id="uuid")

        # Remover todas as memorias de uma chave
        delete_user_memory(tool_context, key="emotional_trigger", module="journey")
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    if not any([memory_id, key, category]):
        return {"status": "error", "message": "Must provide memory_id, key, or category"}

    try:
        client = _get_client()

        # Priority: Delete by memory_id
        if memory_id is not None:
            result = client.table("user_memory") \
                .delete() \
                .eq("id", memory_id) \
                .eq("user_id", user_id) \
                .execute()

            if result.data and len(result.data) > 0:
                return {
                    "status": "success",
                    "deleted_count": 1,
                    "message": "Memoria removida com sucesso"
                }
            else:
                return {"status": "error", "message": "Memory not found or unauthorized"}

        # Delete by key/category/module
        query = client.table("user_memory").delete().eq("user_id", user_id)

        if key is not None:
            query = query.eq("key", key)
        if category is not None:
            query = query.eq("category", category)
        if module is not None:
            query = query.eq("module", module)

        result = query.execute()

        deleted_count = len(result.data) if result.data else 0
        return {
            "status": "success",
            "deleted_count": deleted_count,
            "message": f"{deleted_count} memoria(s) removida(s)"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error deleting memory: {str(e)}"}


def search_user_memories(
    tool_context: ToolContext,
    search_value: dict,
    limit: int = 10
) -> dict:
    """Busca memorias por conteudo JSONB (semantic search).

    Use este tool para encontrar memorias que contem valores especificos
    dentro de seus dados estruturados.

    Args:
        search_value: Dicionario com campos a buscar (ex: {"trigger": "deadlines"})
        limit: Maximo de memorias a retornar (default: 10)

    Returns:
        dict: {"status": "success", "memories": [...], "count": int}

    Examples:
        # Encontrar todas as memorias sobre "deadlines"
        search_user_memories(tool_context, {"trigger": "deadlines"})

        # Encontrar memorias com produtividade alta
        search_user_memories(tool_context, {"productivity_score": 85})

    Note:
        Usa o operador JSONB @> (contains) do PostgreSQL.
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    if not isinstance(search_value, dict):
        return {"status": "error", "message": "search_value must be a dictionary"}

    try:
        client = _get_client()
        import json

        # Use PostgreSQL JSONB contains operator
        result = client.table("user_memory") \
            .select("id, category, module, key, value, confidence, source, created_at") \
            .eq("user_id", user_id) \
            .contains("value", json.dumps(search_value)) \
            .order("confidence", desc=True) \
            .limit(limit) \
            .execute()

        return {
            "status": "success",
            "memories": result.data,
            "count": len(result.data)
        }

    except Exception as e:
        return {"status": "error", "message": f"Error searching memories: {str(e)}"}


# ============================================================================
# CONTEXT CACHING TOOLS - Gemini Token Optimization (Task #36)
# ============================================================================


def get_context_cache_stats(tool_context: ToolContext) -> dict:
    """Retorna estatisticas de economia de tokens do cache de contexto Gemini.

    O sistema de cache de contexto armazena o perfil do usuario (user_memory)
    e system instructions para economizar ate 90% em tokens repetidos.

    Returns:
        dict: {
            "status": "success",
            "cache_name": "cache identifier",
            "cached_tokens": int,
            "total_tokens_saved": int,
            "cache_hits": int,
            "is_active": bool,
            "savings_percentage": float,
            "estimated_cost_savings_usd": float
        }

    Use case:
        Use este tool para verificar o status do cache do usuario e
        monitorar a economia de tokens/custos ao longo do tempo.

    Technical details:
        - Cache TTL: 1 hora por padrao
        - Minimo 1024 tokens para Flash models
        - Cache invalidado automaticamente quando user_memory muda
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        # Import the service
        from ..services.context_cache_service import get_user_cache_stats
        return get_user_cache_stats(user_id)

    except ImportError:
        # Fallback if service not available
        return {
            "status": "error",
            "message": "Context cache service not available"
        }
    except Exception as e:
        return {"status": "error", "message": f"Error getting cache stats: {str(e)}"}


# ============================================================================
# FILE SEARCH RAG TOOLS - Task #41 (Google File Search API)
# ============================================================================

# Async wrapper for synchronous tool context
import asyncio


def _run_async(coro):
    """Run async function from synchronous context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Create a new loop in a thread if current is running
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result(timeout=300)  # 5 min timeout
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def search_user_documents(
    tool_context: ToolContext,
    query: str,
    module: str = None,
    max_results: int = 5
) -> dict:
    """Busca em documentos do usuario usando File Search API (RAG gerenciado).

    Esta ferramenta permite buscar informacoes em documentos que o usuario
    ja enviou para indexacao, como PDFs de editais, transcricoes de podcasts,
    ou reflexoes longas do Journey.

    Args:
        query: Pergunta ou termos de busca em linguagem natural
        module: Modulo especifico para buscar:
            - 'captacao': PDFs de editais e documentos de fomento
            - 'studio': Transcricoes de podcasts
            - 'journey': Reflexoes e momentos longos
            - 'finance': Extratos e documentos financeiros
            - None: Busca em todos os modulos
        max_results: Maximo de trechos fonte a retornar (default: 5)

    Returns:
        dict: {
            "status": "success",
            "answer": "Resposta baseada nos documentos...",
            "citations": [...],  # Citacoes com texto e confianca
            "sources": [...],    # Fontes com titulo e URI
            "token_usage": {"input": int, "output": int}
        }

    Examples:
        # Buscar requisitos em editais
        search_user_documents(
            tool_context,
            query="Quais sao os requisitos de elegibilidade?",
            module="captacao"
        )

        # Buscar mencoes em transcricoes de podcast
        search_user_documents(
            tool_context,
            query="O que o convidado disse sobre IA?",
            module="studio"
        )

        # Buscar em todos os documentos
        search_user_documents(
            tool_context,
            query="Quando foi mencionado o projeto X?",
            module=None  # Busca global
        )
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.file_search_service import get_file_search_service

        service = get_file_search_service()

        if module:
            # Search in specific module
            result = _run_async(
                service.search(
                    module=module,
                    user_id=user_id,
                    query=query,
                    max_results=max_results
                )
            )
        else:
            # Search across all modules
            all_modules = ['captacao', 'studio', 'journey', 'finance']
            result = _run_async(
                service.search_across_modules(
                    modules=all_modules,
                    user_id=user_id,
                    query=query,
                    max_results=max_results
                )
            )

        return {
            "status": "success",
            "answer": result.answer,
            "citations": result.citations,
            "sources": result.sources,
            "token_usage": result.usage,
            "module": module or "all"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error searching documents: {str(e)}"}


def upload_user_document(
    tool_context: ToolContext,
    file_url: str,
    module: str,
    file_name: str,
    title: str = None,
    metadata: dict = None
) -> dict:
    """Faz upload de documento para indexacao RAG via File Search API.

    O documento sera automaticamente:
    1. Baixado da URL fornecida
    2. Dividido em chunks (400 tokens, otimizado para portugues)
    3. Indexado semanticamente para buscas futuras

    O processo de indexacao pode levar de 1 a 5 minutos dependendo
    do tamanho do documento.

    Args:
        file_url: URL do arquivo (geralmente Supabase Storage)
        module: Modulo destino:
            - 'captacao': PDFs de editais e documentos de fomento
            - 'studio': Transcricoes de podcasts
            - 'journey': Reflexoes longas
            - 'finance': Extratos financeiros
        file_name: Nome do arquivo (ex: "edital_faperj_2026.pdf")
        title: Titulo descritivo opcional (ex: "FAPERJ APQ1 2026")
        metadata: Metadados adicionais para filtragem futura
            Ex: {"agency": "FAPERJ", "year": "2026", "type": "edital"}

    Returns:
        dict: {
            "status": "success",
            "document_id": "...",
            "file_name": "...",
            "store_id": "...",
            "message": "Documento indexado com sucesso"
        }

    Cost:
        $0.15 por 1M tokens indexados (muito economico)

    Examples:
        # Upload de edital para Captacao
        upload_user_document(
            tool_context,
            file_url="https://supabase.co/storage/v1/object/public/editais/faperj.pdf",
            module="captacao",
            file_name="faperj_apq1_2026.pdf",
            title="Edital FAPERJ APQ1 2026",
            metadata={"agency": "FAPERJ", "deadline": "2026-03-15"}
        )

        # Upload de transcricao para Studio
        upload_user_document(
            tool_context,
            file_url="https://supabase.co/storage/v1/object/public/transcripts/ep42.txt",
            module="studio",
            file_name="episodio_42_transcricao.txt",
            title="Episodio 42 - Entrevista com Dr. Silva"
        )
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    # Validate module
    valid_modules = ['captacao', 'studio', 'journey', 'finance', 'connections', 'atlas']
    if module not in valid_modules:
        return {"status": "error", "message": f"Invalid module. Valid: {valid_modules}"}

    try:
        from ..services.file_search_service import get_file_search_service

        service = get_file_search_service()

        # Build metadata with title if provided
        doc_metadata = metadata.copy() if metadata else {}
        if title:
            doc_metadata["title"] = title

        result = _run_async(
            service.upload_document_from_url(
                module=module,
                user_id=user_id,
                file_url=file_url,
                file_name=file_name,
                metadata=doc_metadata
            )
        )

        return {
            "status": "success",
            "document_id": result.document_id,
            "file_name": result.file_name,
            "store_id": result.store_id,
            "message": f"Documento '{file_name}' indexado com sucesso!"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error uploading document: {str(e)}"}


def list_indexed_documents(
    tool_context: ToolContext,
    module: str = None
) -> dict:
    """Lista stores e documentos indexados do usuario.

    Retorna informacoes sobre os stores de File Search e quantidade
    de documentos em cada um.

    Args:
        module: Filtrar por modulo especifico (opcional)

    Returns:
        dict: {
            "status": "success",
            "stores": [
                {
                    "id": "...",
                    "category": "grants",
                    "displayName": "...",
                    "documentCount": 5,
                    "createdAt": "..."
                },
                ...
            ],
            "total_documents": int
        }
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.file_search_service import get_file_search_service

        service = get_file_search_service()

        stores = _run_async(service.list_stores(user_id))

        # Filter by module if specified
        if module:
            category_map = {
                "captacao": "grants",
                "studio": "podcast_transcripts",
                "journey": "journey_moments",
                "finance": "financial",
            }
            target_category = category_map.get(module, "documents")
            stores = [s for s in stores if s.get("category") == target_category]

        total_docs = sum(s.get("documentCount", 0) for s in stores)

        return {
            "status": "success",
            "stores": stores,
            "total_documents": total_docs,
            "filtered_by_module": module
        }

    except Exception as e:
        return {"status": "error", "message": f"Error listing documents: {str(e)}"}


def delete_indexed_document(
    tool_context: ToolContext,
    document_id: str
) -> dict:
    """Remove um documento indexado do File Search.

    Use com cuidado - a remocao e permanente e o documento
    precisara ser re-indexado se necessario.

    Args:
        document_id: ID do documento retornado no upload

    Returns:
        dict: {"status": "success", "message": "Documento removido"}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.file_search_service import get_file_search_service

        service = get_file_search_service()

        _run_async(service.delete_document(document_id, user_id))

        return {
            "status": "success",
            "message": "Documento removido com sucesso do indice"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error deleting document: {str(e)}"}


# ============================================================================
# FACT EXTRACTION TOOLS - Task #38 (Mem0-style Learning)
# ============================================================================


def extract_facts_from_conversation(
    tool_context: ToolContext,
    conversation_summary: str = None,
    context_module: str = None
) -> dict:
    """Analisa a conversa atual e extrai fatos sobre o usuario.

    Use esta ferramenta quando perceber que o usuario revelou informacoes
    importantes sobre si mesmo durante a conversa. A ferramenta ira:
    1. Analisar as ultimas mensagens da conversa
    2. Extrair fatos, preferencias e padroes
    3. Comparar com memorias existentes
    4. Adicionar, atualizar ou remover memorias conforme necessario

    Args:
        conversation_summary: Resumo opcional da conversa atual (se None, usa ultimas 10 mensagens)
        context_module: Modulo de contexto para categorizar os fatos:
            - 'atlas': produtividade, tarefas, rotina
            - 'journey': emocoes, reflexoes, autoconhecimento
            - 'studio': podcasts, convidados, preferencias de conteudo
            - 'captacao': editais, pesquisa, academico
            - 'finance': financas, orcamento, gastos
            - 'connections': relacionamentos, networking
            - None: fatos globais

    Returns:
        dict: {
            "status": "success",
            "added": int,      # Novos fatos adicionados
            "updated": int,    # Fatos existentes atualizados
            "deleted": int,    # Fatos contraditados removidos
            "message": "..."   # Resumo da extracao
        }

    Examples:
        # Extrair fatos apos o usuario mencionar sua rotina de trabalho
        extract_facts_from_conversation(
            tool_context,
            context_module="atlas"
        )

        # Extrair apos reflexao emocional
        extract_facts_from_conversation(
            tool_context,
            context_module="journey"
        )

    Note:
        Esta ferramenta tambem e executada automaticamente apos cada conversa
        atraves do after_agent_callback, mas pode ser chamada manualmente
        quando o agente percebe informacoes importantes.
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    # Validate context_module
    if context_module is not None:
        valid_modules = ['atlas', 'journey', 'studio', 'captacao', 'finance', 'connections']
        if context_module not in valid_modules:
            return {"status": "error", "message": f"Invalid module. Valid: {valid_modules}"}

    try:
        from ..services.fact_extraction_service import get_fact_extraction_service

        service = get_fact_extraction_service()

        # Build conversation from session messages or summary
        if conversation_summary:
            # Use provided summary as a single message
            conversation = [
                {"role": "user", "content": conversation_summary}
            ]
        else:
            # Try to get messages from session state
            session_messages = tool_context.state.get("messages", [])

            if not session_messages:
                return {
                    "status": "warning",
                    "message": "Nenhuma mensagem disponivel para extracao. Forenca um conversation_summary.",
                    "added": 0,
                    "updated": 0,
                    "deleted": 0
                }

            # Get last 10 messages
            conversation = session_messages[-10:]

        # Run extraction
        result = _run_async(
            service.extract_facts(
                conversation=conversation,
                user_id=user_id,
                context_module=context_module
            )
        )

        # Format response message
        if result.added == 0 and result.updated == 0 and result.deleted == 0:
            message = "Nenhum fato novo foi identificado nesta conversa."
        else:
            parts = []
            if result.added > 0:
                parts.append(f"{result.added} fato(s) adicionado(s)")
            if result.updated > 0:
                parts.append(f"{result.updated} fato(s) atualizado(s)")
            if result.deleted > 0:
                parts.append(f"{result.deleted} fato(s) removido(s)")
            message = "Memorias atualizadas: " + ", ".join(parts)

        return {
            "status": "success",
            "added": result.added,
            "updated": result.updated,
            "deleted": result.deleted,
            "facts_processed": result.facts_processed,
            "message": message,
            "errors": result.errors if result.errors else None
        }

    except Exception as e:
        return {"status": "error", "message": f"Error extracting facts: {str(e)}"}


def store_explicit_fact(
    tool_context: ToolContext,
    fact_description: str,
    category: str = "fact",
    module: str = None
) -> dict:
    """Armazena um fato explicito que o usuario acabou de revelar.

    Use esta ferramenta quando o usuario declarar diretamente algo sobre si mesmo.
    Diferente de extract_facts_from_conversation, esta ferramenta armazena
    um unico fato com source='explicit' (alta confianca).

    Args:
        fact_description: Descricao do fato em linguagem natural
            Ex: "O usuario trabalha como desenvolvedor de software"
            Ex: "O usuario prefere responder emails pela manha"
        category: Categoria do fato:
            - 'profile': dados pessoais (profissao, localizacao)
            - 'preference': preferencias do usuario
            - 'fact': fatos objetivos
            - 'pattern': padroes de comportamento
            - 'insight': correlacoes descobertas
        module: Modulo de contexto (opcional):
            - 'atlas', 'journey', 'studio', 'captacao', 'finance', 'connections'
            - None para fatos globais

    Returns:
        dict: {
            "status": "success",
            "memory_id": "uuid",
            "message": "Fato armazenado com sucesso"
        }

    Examples:
        # Usuario declara sua profissao
        store_explicit_fact(
            tool_context,
            fact_description="O usuario trabalha como professor universitario",
            category="profile"
        )

        # Usuario menciona preferencia de horario
        store_explicit_fact(
            tool_context,
            fact_description="O usuario prefere fazer reunioes pela manha",
            category="preference",
            module="atlas"
        )

    Note:
        Fatos explicitos recebem confidence=1.0 pois o usuario declarou diretamente.
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    # Validate category
    valid_categories = ['profile', 'preference', 'fact', 'insight', 'pattern']
    if category not in valid_categories:
        return {"status": "error", "message": f"Invalid category. Valid: {valid_categories}"}

    # Validate module
    if module is not None:
        valid_modules = ['atlas', 'journey', 'studio', 'captacao', 'finance', 'connections']
        if module not in valid_modules:
            return {"status": "error", "message": f"Invalid module. Valid: {valid_modules}"}

    if not fact_description or len(fact_description.strip()) < 5:
        return {"status": "error", "message": "fact_description must be at least 5 characters"}

    try:
        from ..services.fact_extraction_service import get_fact_extraction_service

        service = get_fact_extraction_service()

        result = _run_async(
            service.extract_single_fact(
                fact_description=fact_description,
                user_id=user_id,
                category=category,
                module=module
            )
        )

        if result.get("status") == "success":
            return {
                "status": "success",
                "memory_id": result.get("memory_id"),
                "message": f"Fato armazenado com sucesso na categoria '{category}'"
            }
        else:
            return result

    except Exception as e:
        return {"status": "error", "message": f"Error storing fact: {str(e)}"}


def get_fact_extraction_stats(tool_context: ToolContext) -> dict:
    """Retorna estatisticas de extracao de fatos para o usuario atual.

    Use para monitorar quantos fatos foram extraidos, atualizados e removidos
    ao longo das conversas do usuario.

    Returns:
        dict: {
            "status": "success",
            "user_id": "...",
            "total_extractions": int,
            "facts_added": int,
            "facts_updated": int,
            "facts_deleted": int,
            "errors": int
        }
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.fact_extraction_service import get_fact_extraction_service

        service = get_fact_extraction_service()
        return service.get_extraction_stats(user_id)

    except Exception as e:
        return {"status": "error", "message": f"Error getting stats: {str(e)}"}


# ============================================================================
# PERSONALIZATION TOOLS - Progressive Personalization (Task #39)
# ============================================================================


def get_personalization_phase(tool_context: ToolContext) -> dict:
    """Retorna a fase de personalizacao atual do usuario.

    O sistema de personalizacao progressiva tem 3 fases:
    - cold_start: <10 interacoes - Perguntas exploratorias, descoberta de interesses
    - warm_up: 10-50 interacoes - Referencias ao historico, identificacao de padroes
    - mature: 50+ interacoes - Conexoes profundas, antecipacao de necessidades

    Returns:
        dict: {
            "status": "success",
            "phase": "cold_start" | "warm_up" | "mature",
            "total_interactions": int,
            "response_depth_score": float,
            "days_active": int
        }

    Use case:
        Use este tool para adaptar a profundidade e tom das respostas
        ao nivel de relacionamento com o usuario.
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.personalization_service import get_personalization_service

        service = get_personalization_service()
        context = _run_async(service.get_personalization_context(user_id))

        return {
            "status": "success",
            "phase": context.phase.value,
            "total_interactions": context.stats.total_interactions,
            "response_depth_score": context.stats.response_depth_score,
            "days_active": context.stats.days_active,
            "recurring_themes": context.recurring_themes[:5]
        }

    except Exception as e:
        return {"status": "error", "message": f"Error getting personalization phase: {str(e)}"}


def get_question_strategy(tool_context: ToolContext) -> dict:
    """Retorna a estrategia de perguntas personalizada para o usuario.

    A estrategia e baseada na fase de personalizacao e inclui:
    - depth: Profundidade das perguntas ("surface", "exploratory", "challenging")
    - reference_history: Se deve referenciar conversas anteriores
    - connect_themes: Se deve conectar temas de diferentes areas
    - goal: Objetivo principal ("build_engagement", "discover_patterns", "promote_growth")
    - suggested_topics: Lista de topicos sugeridos para explorar

    Returns:
        dict: {
            "status": "success",
            "depth": str,
            "reference_history": bool,
            "connect_themes": bool,
            "goal": str,
            "suggested_topics": list[str]
        }

    Use case:
        Use antes de gerar perguntas para o usuario, para garantir
        que a pergunta esta alinhada com o nivel de relacionamento.

    Example:
        strategy = get_question_strategy(tool_context)
        if strategy["reference_history"]:
            # Incluir referencia ao historico na pergunta
            pass
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.personalization_service import get_personalization_service

        service = get_personalization_service()
        strategy = _run_async(service.get_question_strategy(user_id))

        return {
            "status": "success",
            "depth": strategy.depth,
            "reference_history": strategy.reference_history,
            "connect_themes": strategy.connect_themes,
            "goal": strategy.goal,
            "suggested_topics": strategy.suggested_topics
        }

    except Exception as e:
        return {"status": "error", "message": f"Error getting question strategy: {str(e)}"}


def generate_daily_question(tool_context: ToolContext) -> dict:
    """Gera pergunta do dia personalizada baseada na fase do usuario.

    Esta ferramenta:
    1. Determina a fase de personalizacao do usuario
    2. Carrega contexto de memorias relevantes
    3. Chama Gemini com prompt personalizado para gerar a pergunta
    4. Retorna a pergunta com metadados de personalizacao

    Returns:
        dict: {
            "status": "success",
            "question": str,  # A pergunta gerada
            "phase": str,     # Fase atual (cold_start, warm_up, mature)
            "depth": str,     # Profundidade (surface, exploratory, challenging)
            "goal": str,      # Objetivo da pergunta
            "context_used": list[str]  # Temas usados como contexto
        }

    Error cases:
        - User not authenticated
        - Gemini API error (retorna pergunta fallback)

    Use case:
        Use este tool para gerar a pergunta diaria do modulo Journey.
        A pergunta sera automaticamente adaptada ao nivel de
        relacionamento com o usuario.

    Token cost:
        ~500-1000 tokens por chamada (gemini-2.5-flash)

    Example:
        result = generate_daily_question(tool_context)
        question = result["question"]
        # "O que te trouxe alegria hoje?" (cold_start)
        # ou
        # "Notei que trabalho aparece frequentemente em suas
        #  reflexoes. Como voce esta se sentindo em relacao
        #  a isso hoje?" (warm_up)
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        import os
        from google import genai
        from ..services.personalization_service import get_personalization_service

        # Get personalization context
        service = get_personalization_service()
        context = _run_async(service.get_personalization_context(user_id))

        # Build prompt based on phase and context
        prompt_context = _run_async(
            service.generate_personalized_prompt_context(user_id)
        )

        # Build the generation prompt
        system_instruction = """Voce e a Aica, assistente de autoconhecimento.
Seu papel e gerar UMA pergunta do dia para reflexao pessoal.

Regras:
- A pergunta deve ser em portugues brasileiro
- Ser acolhedora e nao-julgamental
- Promover reflexao genuina
- Ter entre 10 e 150 caracteres
- Terminar com ponto de interrogacao
- NAO incluir saudacoes ou contexto, apenas a pergunta

Retorne APENAS a pergunta, nada mais."""

        generation_prompt = f"""{prompt_context}

Topicos sugeridos para a pergunta: {', '.join(context.strategy.suggested_topics[:3])}
Profundidade desejada: {context.strategy.depth}
Objetivo: {context.strategy.goal}

Gere UMA pergunta do dia apropriada para este usuario:"""

        # Initialize Gemini client
        gemini_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            # Return fallback question
            fallback_questions = {
                "cold_start": "O que trouxe um momento de alegria hoje?",
                "warm_up": "Como voce esta se sentindo em relacao ao seu dia?",
                "mature": "Que conexao entre diferentes areas da sua vida voce percebeu hoje?"
            }
            return {
                "status": "success",
                "question": fallback_questions.get(
                    context.phase.value,
                    "O que esta em sua mente agora?"
                ),
                "phase": context.phase.value,
                "depth": context.strategy.depth,
                "goal": context.strategy.goal,
                "context_used": context.recurring_themes[:3],
                "note": "Fallback question (no API key)"
            }

        # Call Gemini
        client = genai.Client(api_key=gemini_key)

        response = client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=generation_prompt,
            config={
                "system_instruction": system_instruction,
                "temperature": 0.8,  # Slightly creative
                "max_output_tokens": 150
            }
        )

        # Extract question text
        question_text = ""
        if response and response.text:
            question_text = response.text.strip()

            # Clean up - remove quotes if present
            if question_text.startswith('"') and question_text.endswith('"'):
                question_text = question_text[1:-1]
            if question_text.startswith("'") and question_text.endswith("'"):
                question_text = question_text[1:-1]

        # Validate question
        if not question_text or len(question_text) < 10 or "?" not in question_text:
            # Fallback
            question_text = "O que esta em sua mente neste momento?"

        # Record interaction for stats tracking
        _run_async(service.record_interaction(
            user_id=user_id,
            interaction_type="daily_question",
            response_length=0  # No response yet
        ))

        return {
            "status": "success",
            "question": question_text,
            "phase": context.phase.value,
            "depth": context.strategy.depth,
            "goal": context.strategy.goal,
            "context_used": context.recurring_themes[:3]
        }

    except Exception as e:
        # Return fallback on any error
        return {
            "status": "partial",
            "question": "O que esta em sua mente hoje?",
            "phase": "unknown",
            "depth": "surface",
            "goal": "build_engagement",
            "context_used": [],
            "error": str(e)
        }


def get_personalization_context(tool_context: ToolContext) -> dict:
    """Retorna contexto completo de personalizacao para injetar em prompts.

    Este tool gera um bloco de texto formatado que pode ser injetado
    diretamente em qualquer prompt de agente para personalizar a resposta.

    O contexto inclui:
    - Nivel de personalizacao atual
    - Estrategia de perguntas
    - Memorias chave do usuario
    - Orientacoes especificas para a fase

    Returns:
        dict: {
            "status": "success",
            "context": str,  # Texto formatado para injetar no prompt
            "phase": str,
            "strategy_goal": str,
            "memories_count": int
        }

    Use case:
        Use este tool quando precisar personalizar qualquer resposta
        do agente, nao apenas perguntas do Journey.

    Example:
        result = get_personalization_context(tool_context)
        personalized_prompt = base_prompt + "\\n\\n" + result["context"]
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.personalization_service import get_personalization_service

        service = get_personalization_service()
        context_text = _run_async(
            service.generate_personalized_prompt_context(user_id)
        )

        # Get additional metadata
        full_context = _run_async(service.get_personalization_context(user_id))

        return {
            "status": "success",
            "context": context_text,
            "phase": full_context.phase.value,
            "strategy_goal": full_context.strategy.goal,
            "memories_count": len(full_context.key_memories)
        }

    except Exception as e:
        return {"status": "error", "message": f"Error getting personalization context: {str(e)}"}


def record_user_interaction(
    tool_context: ToolContext,
    interaction_type: str = "message",
    response_length: int = 0
) -> dict:
    """Registra uma interacao para tracking de personalizacao.

    Atualiza as estatisticas de interacao do usuario na tabela user_memory,
    permitindo que o sistema de personalizacao evolua com o tempo.

    Args:
        interaction_type: Tipo de interacao ('message', 'reflection', 'question_answer')
        response_length: Comprimento da resposta do usuario em caracteres

    Returns:
        dict: {"status": "success", "message": "Interacao registrada"}

    Use case:
        Chame este tool apos cada interacao significativa do usuario
        para alimentar o sistema de personalizacao progressiva.

    Note:
        Momentos registrados via create_moment ja sao contabilizados
        automaticamente. Use este tool para interacoes fora do Journey.
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.personalization_service import get_personalization_service

        service = get_personalization_service()
        _run_async(service.record_interaction(
            user_id=user_id,
            interaction_type=interaction_type,
            response_length=response_length
        ))

        return {
            "status": "success",
            "message": "Interacao registrada com sucesso"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error recording interaction: {str(e)}"}


# ============================================================================
# CROSS-MODULE INTELLIGENCE TOOLS - Task #40
# ============================================================================


def generate_cross_module_insights(
    tool_context: ToolContext,
    days: int = 30,
    force_refresh: bool = False
) -> dict:
    """Analisa dados de multiplos modulos e gera insights holisticos.

    Esta ferramenta cruza informacoes de diferentes areas da vida do usuario
    (produtividade, emocoes, financas, relacionamentos) para identificar
    correlacoes e padroes que nao seriam visiveis analisando cada modulo isoladamente.

    Exemplos de insights que podem ser gerados:
    - "Produtividade aumenta 40% apos reflexoes matinais" (Atlas + Journey)
    - "Gastos com delivery aumentam em semanas de deadline" (Finance + Atlas)
    - "Interacoes com contatos academicos correlacionam com submissao de editais" (Connections + Captacao)

    Args:
        days: Numero de dias para analisar (default: 30)
        force_refresh: Forcar reanalise mesmo se houver cache valido (default: False)

    Returns:
        dict: {
            "status": "success",
            "insights": [
                {
                    "modules": ["atlas", "journey"],
                    "finding": "Descricao da correlacao encontrada",
                    "correlation_strength": 0.78,
                    "actionable_suggestion": "Sugestao pratica",
                    "insight_type": "correlation|pattern|anomaly|opportunity",
                    "data_points": 45
                },
                ...
            ],
            "count": int,
            "analysis_period_days": int
        }

    Examples:
        # Gerar insights dos ultimos 30 dias
        generate_cross_module_insights(tool_context)

        # Forcar reanalise para insights frescos
        generate_cross_module_insights(tool_context, force_refresh=True)

        # Analisar periodo mais longo
        generate_cross_module_insights(tool_context, days=90)

    Module Pairs Analyzed:
        - Atlas + Journey: Produtividade vs Estado Emocional
        - Atlas + Finance: Tarefas vs Padroes de Gastos
        - Journey + Connections: Emocoes vs Interacoes Sociais
        - Captacao + Connections: Editais vs Networking Academico
        - Studio + Connections: Podcast vs Rede de Convidados
        - Finance + Journey: Gastos vs Estado Emocional

    Cost:
        Usa gemini-2.5-flash para analise - custo otimizado.
        Cache de 24 horas para evitar reanalises frequentes.
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    if days < 7 or days > 365:
        return {"status": "error", "message": "days must be between 7 and 365"}

    try:
        from ..services.cross_module_service import get_cross_module_service

        service = get_cross_module_service()

        insights = _run_async(
            service.analyze_cross_module_patterns(
                user_id=user_id,
                days=days,
                force_refresh=force_refresh
            )
        )

        return {
            "status": "success",
            "insights": [insight.to_dict() for insight in insights],
            "count": len(insights),
            "analysis_period_days": days,
            "message": f"Identificados {len(insights)} insights cross-module dos ultimos {days} dias"
        }

    except Exception as e:
        return {"status": "error", "message": f"Error generating insights: {str(e)}"}


def get_cross_module_context_tool(
    tool_context: ToolContext,
    current_module: str
) -> dict:
    """Obtem contexto de outros modulos relevante para o modulo atual.

    Use esta ferramenta para enriquecer suas respostas com informacoes
    de outros modulos que podem ser relevantes para a conversa atual.

    Por exemplo, se o usuario esta no Atlas (produtividade), esta ferramenta
    pode trazer alertas do Captacao (deadlines de editais) ou do Journey
    (estado emocional recente).

    Args:
        current_module: Modulo no qual o usuario esta interagindo:
            - 'atlas': produtividade e tarefas
            - 'journey': emocoes e reflexoes
            - 'studio': producao de podcasts
            - 'captacao': editais e projetos
            - 'finance': financas pessoais
            - 'connections': rede de contatos

    Returns:
        dict: {
            "status": "success",
            "context": "string formatado com insights e alertas relevantes",
            "has_insights": bool,
            "has_alerts": bool
        }

    Examples:
        # Obter contexto para o Atlas
        get_cross_module_context_tool(tool_context, current_module="atlas")
        # Pode retornar alertas de deadlines do Captacao

        # Obter contexto para o Studio
        get_cross_module_context_tool(tool_context, current_module="studio")
        # Pode retornar insights de conexoes com potenciais convidados

    Context Includes:
        - Insights cross-module que envolvem o modulo atual
        - Alertas de outros modulos (deadlines, sobrecarga, riscos)
        - Oportunidades identificadas pela analise cruzada

    Usage:
        Chame esta ferramenta no inicio de uma interacao para ter
        uma visao holistica do contexto do usuario. Use o contexto
        retornado para personalizar suas respostas.
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    valid_modules = ['atlas', 'journey', 'studio', 'captacao', 'finance', 'connections']
    if current_module not in valid_modules:
        return {"status": "error", "message": f"Invalid module. Valid: {valid_modules}"}

    try:
        from ..services.cross_module_service import get_cross_module_service

        service = get_cross_module_service()

        context = _run_async(
            service.get_context_for_module(
                user_id=user_id,
                current_module=current_module
            )
        )

        has_insights = "## Insights Cross-Module" in context
        has_alerts = "## Alertas de Outros Modulos" in context

        return {
            "status": "success",
            "context": context if context else "Nenhum contexto cross-module disponivel no momento.",
            "has_insights": has_insights,
            "has_alerts": has_alerts,
            "current_module": current_module
        }

    except Exception as e:
        return {"status": "error", "message": f"Error getting cross-module context: {str(e)}"}


def get_holistic_user_view(tool_context: ToolContext) -> dict:
    """Obtem uma visao holistica do estado atual do usuario em todos os modulos.

    Esta ferramenta agrega informacoes de todos os modulos AICA para fornecer
    uma visao completa do usuario. Util para o coordinator entender o
    contexto geral antes de delegar para agentes especializados.

    Returns:
        dict: {
            "status": "success",
            "atlas": {
                "pending_tasks": int,
                "urgent_tasks": int,
                "completed_today": int
            },
            "journey": {
                "recent_emotions": ["emotion1", "emotion2"],
                "dominant_mood": "string",
                "needs_attention": bool
            },
            "finance": {
                "monthly_balance": float,
                "budget_status": "healthy|warning|critical"
            },
            "captacao": {
                "active_projects": int,
                "upcoming_deadlines": int
            },
            "studio": {
                "planned_episodes": int,
                "pending_research": int
            },
            "connections": {
                "active_spaces": int,
                "recent_interactions": int
            },
            "cross_module_insights": [...]
        }

    Examples:
        # Obter visao completa para o coordinator
        view = get_holistic_user_view(tool_context)

        # Usar para personalizar saudacoes e sugestoes
        if view["atlas"]["urgent_tasks"] > 5:
            "Voce tem muitas tarefas urgentes..."
        if view["journey"]["needs_attention"]:
            "Notei que sua semana tem sido desafiadora..."

    Note:
        Esta ferramenta e especialmente util para o coordinator
        gerar respostas personalizadas e proativas.
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..services.cross_module_service import get_cross_module_service
        from datetime import date

        service = get_cross_module_service()
        client = _get_client()

        result = {
            "status": "success",
            "user_id": user_id[:8] + "...",  # Anonymized
        }

        # Atlas: Task status
        try:
            tasks = client.table("work_items") \
                .select("status, priority, priority_quadrant, completed_at") \
                .eq("user_id", user_id) \
                .execute()

            pending = [t for t in (tasks.data or []) if t.get("status") == "todo"]
            urgent = [t for t in pending if t.get("priority_quadrant") == 1 or t.get("priority") == "urgent"]
            today = date.today().isoformat()
            completed_today = [t for t in (tasks.data or []) if t.get("completed_at", "")[:10] == today]

            result["atlas"] = {
                "pending_tasks": len(pending),
                "urgent_tasks": len(urgent),
                "completed_today": len(completed_today)
            }
        except Exception:
            result["atlas"] = {"error": "unavailable"}

        # Journey: Emotional state
        try:
            from datetime import datetime, timedelta
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            moments = client.table("moments") \
                .select("emotion") \
                .eq("user_id", user_id) \
                .gte("created_at", week_ago) \
                .execute()

            emotions = [m.get("emotion") for m in (moments.data or []) if m.get("emotion")]
            emotion_counts = {}
            for e in emotions:
                emotion_counts[e] = emotion_counts.get(e, 0) + 1

            dominant = max(emotion_counts.items(), key=lambda x: x[1]) if emotion_counts else (None, 0)
            attention_emotions = ["anxious", "sad", "overwhelmed", "frustrated"]

            result["journey"] = {
                "recent_emotions": list(emotion_counts.keys())[:5],
                "dominant_mood": dominant[0],
                "needs_attention": dominant[0] in attention_emotions and dominant[1] >= 3
            }
        except Exception:
            result["journey"] = {"error": "unavailable"}

        # Finance: Budget status
        try:
            month_start = date.today().replace(day=1).isoformat()
            transactions = client.table("finance_transactions") \
                .select("type, amount") \
                .eq("user_id", user_id) \
                .gte("transaction_date", month_start) \
                .execute()

            income = sum(abs(float(t["amount"])) for t in (transactions.data or []) if t.get("type") == "income")
            expenses = sum(abs(float(t["amount"])) for t in (transactions.data or []) if t.get("type") == "expense")
            balance = income - expenses

            if income > 0:
                ratio = expenses / income
                budget_status = "healthy" if ratio < 0.8 else ("warning" if ratio < 1.0 else "critical")
            else:
                budget_status = "unknown"

            result["finance"] = {
                "monthly_balance": round(balance, 2),
                "budget_status": budget_status
            }
        except Exception:
            result["finance"] = {"error": "unavailable"}

        # Captacao: Projects and deadlines
        try:
            from datetime import datetime, timedelta
            next_week = (datetime.now() + timedelta(days=7)).isoformat()
            projects = client.table("grant_projects") \
                .select("status, deadline") \
                .eq("user_id", user_id) \
                .in_("status", ["draft", "briefing", "generating", "review"]) \
                .execute()

            active = len(projects.data or [])
            upcoming = len([p for p in (projects.data or []) if p.get("deadline", "") <= next_week])

            result["captacao"] = {
                "active_projects": active,
                "upcoming_deadlines": upcoming
            }
        except Exception:
            result["captacao"] = {"error": "unavailable"}

        # Studio: Episodes
        try:
            episodes = client.table("podcast_episodes") \
                .select("status") \
                .eq("user_id", user_id) \
                .in_("status", ["planned", "scheduled"]) \
                .execute()

            result["studio"] = {
                "planned_episodes": len(episodes.data or []),
                "pending_research": 0  # Would need guest_research table
            }
        except Exception:
            result["studio"] = {"error": "unavailable"}

        # Connections: Spaces and interactions
        try:
            spaces = client.table("connection_spaces") \
                .select("id") \
                .eq("user_id", user_id) \
                .eq("is_active", True) \
                .execute()

            result["connections"] = {
                "active_spaces": len(spaces.data or []),
                "recent_interactions": 0  # Would need interaction tracking
            }
        except Exception:
            result["connections"] = {"error": "unavailable"}

        # Cross-module insights
        try:
            insights = _run_async(service.analyze_cross_module_patterns(user_id, days=30))
            result["cross_module_insights"] = [
                {
                    "modules": i.modules,
                    "finding": i.finding[:100] + "..." if len(i.finding) > 100 else i.finding,
                    "strength": i.correlation_strength
                }
                for i in insights[:3]  # Top 3
            ]
        except Exception:
            result["cross_module_insights"] = []

        return result

    except Exception as e:
        return {"status": "error", "message": f"Error getting holistic view: {str(e)}"}


# ============================================================================
# PRIVACY & LGPD COMPLIANCE TOOLS - Task #44
# ============================================================================


def export_my_data(tool_context: ToolContext) -> dict:
    """Exporta todos os dados do usuario em formato JSON (Direito de Acesso LGPD).

    Este tool implementa o direito de acesso previsto no Artigo 15 da LGPD
    e o direito a portabilidade previsto no Artigo 18.

    O usuario pode solicitar uma copia completa de todos os seus dados
    armazenados no sistema, incluindo:
    - Perfil e preferencias
    - Memorias do agente (user_memory)
    - Sessoes de conversa
    - Tarefas e trabalhos
    - Momentos e reflexoes
    - Transacoes financeiras
    - Projetos de captacao
    - Contatos e espacos de conexao
    - Consentimentos registrados

    Returns:
        dict: {
            "status": "success",
            "data": {...},  # Dados completos em formato estruturado
            "record_counts": {"table": count, ...},
            "exported_at": "ISO timestamp",
            "lgpd_article": "15, 18"
        }

    Security:
        - Apenas o proprio usuario pode exportar seus dados
        - A operacao e registrada no audit log
        - Dados sensiveis sao incluidos apenas se ha consentimento

    Example:
        result = export_my_data(tool_context)
        if result["status"] == "success":
            # Dados disponiveis em result["data"]
            print(f"Exportados {sum(result['record_counts'].values())} registros")
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..privacy import get_data_subject_rights, ExportFormat

        rights = get_data_subject_rights()
        result = _run_async(rights.export_user_data(user_id, ExportFormat.JSON))

        if result.success:
            return {
                "status": "success",
                "data": result.data,
                "record_counts": result.record_counts,
                "exported_at": result.exported_at.isoformat(),
                "lgpd_article": "15, 18"
            }
        else:
            return {"status": "error", "message": result.error}

    except Exception as e:
        return {"status": "error", "message": f"Error exporting data: {str(e)}"}


def delete_my_data(
    tool_context: ToolContext,
    confirmation: str = None
) -> dict:
    """Solicita exclusao permanente de todos os dados (Direito ao Esquecimento LGPD).

    ATENCAO: Esta operacao e IRREVERSIVEL. Todos os dados do usuario serao
    permanentemente removidos do sistema.

    Este tool implementa o direito ao esquecimento previsto no Artigo 17 da LGPD.

    O usuario deve confirmar a exclusao passando confirmation="CONFIRMAR EXCLUSAO".

    Args:
        confirmation: Deve ser exatamente "CONFIRMAR EXCLUSAO" para prosseguir

    Returns:
        dict: {
            "status": "success" | "pending" | "error",
            "message": str,
            "records_deleted": {"table": count, ...},  # Se executado
            "lgpd_article": "17"
        }

    Security:
        - Requer confirmacao explicita do usuario
        - A operacao e registrada no audit log (log e preservado)
        - Dados de consentimento sao removidos
        - Logs de auditoria sao preservados por 2 anos (requisito legal)

    Example:
        # Primeiro, usuario pede para deletar:
        result = delete_my_data(tool_context)
        # {"status": "pending", "message": "Para confirmar, chame novamente com confirmation='CONFIRMAR EXCLUSAO'"}

        # Depois, confirma:
        result = delete_my_data(tool_context, confirmation="CONFIRMAR EXCLUSAO")
        # {"status": "success", "records_deleted": {...}}
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    # Require explicit confirmation
    if confirmation != "CONFIRMAR EXCLUSAO":
        return {
            "status": "pending",
            "message": "Para confirmar a exclusao permanente de todos os seus dados, "
                       "chame novamente com confirmation='CONFIRMAR EXCLUSAO'. "
                       "ATENCAO: Esta acao e irreversivel.",
            "lgpd_article": "17"
        }

    try:
        from ..privacy import get_data_subject_rights

        rights = get_data_subject_rights()
        result = _run_async(rights.delete_user_data(
            user_id=user_id,
            reason="user_request",
            preserve_audit_logs=True
        ))

        if result.success:
            return {
                "status": "success",
                "message": "Todos os seus dados foram permanentemente removidos.",
                "records_deleted": result.records_deleted,
                "deleted_at": result.deleted_at.isoformat(),
                "lgpd_article": "17"
            }
        else:
            return {"status": "error", "message": result.error}

    except Exception as e:
        return {"status": "error", "message": f"Error deleting data: {str(e)}"}


def manage_consent(
    tool_context: ToolContext,
    action: str,
    purposes: list = None
) -> dict:
    """Gerencia consentimentos de processamento de dados (LGPD Art. 8).

    Este tool permite ao usuario:
    - Visualizar status atual de consentimentos
    - Conceder consentimento para propositos especificos
    - Revogar consentimento a qualquer momento

    Args:
        action: Acao a executar:
            - "status": Mostra status de todos os consentimentos
            - "grant": Concede consentimento para os propositos listados
            - "revoke": Revoga consentimento para os propositos listados
        purposes: Lista de propositos (necessario para grant/revoke):
            - "data_collection": Coleta basica de dados
            - "ai_processing": Processamento por agentes IA
            - "analytics": Analytics de uso
            - "personalization": Personalizacao de experiencia
            - "notifications": Notificacoes push/email
            - "sentiment_analysis": Analise de sentimentos

    Returns:
        dict: {
            "status": "success",
            "consents": {...},  # Para action="status"
            "message": str,
            "lgpd_article": "8"
        }

    Examples:
        # Ver status
        manage_consent(tool_context, action="status")

        # Conceder consentimento
        manage_consent(tool_context, action="grant",
                       purposes=["ai_processing", "personalization"])

        # Revogar consentimento
        manage_consent(tool_context, action="revoke",
                       purposes=["analytics"])
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    valid_actions = ["status", "grant", "revoke"]
    if action not in valid_actions:
        return {"status": "error", "message": f"Invalid action. Valid: {valid_actions}"}

    valid_purposes = [
        "data_collection", "ai_processing", "analytics",
        "personalization", "notifications", "sentiment_analysis"
    ]

    try:
        from ..privacy import get_consent_manager

        consent_mgr = get_consent_manager()

        if action == "status":
            summary = _run_async(consent_mgr.get_consent_status_summary(user_id))
            return {
                "status": "success",
                "consents": summary.get("consents", {}),
                "policy_version": summary.get("policy_version"),
                "last_updated": summary.get("last_updated"),
                "lgpd_article": "8"
            }

        elif action == "grant":
            if not purposes:
                return {"status": "error", "message": "purposes required for grant action"}

            # Validate purposes
            invalid = [p for p in purposes if p not in valid_purposes]
            if invalid:
                return {"status": "error", "message": f"Invalid purposes: {invalid}. Valid: {valid_purposes}"}

            success = _run_async(consent_mgr.grant_consent(
                user_id=user_id,
                purposes=purposes,
                consent_method="api"
            ))

            return {
                "status": "success" if success else "error",
                "message": f"Consentimento concedido para: {', '.join(purposes)}" if success else "Falha ao registrar consentimento",
                "purposes_granted": purposes,
                "lgpd_article": "8"
            }

        elif action == "revoke":
            if not purposes:
                return {"status": "error", "message": "purposes required for revoke action"}

            success = _run_async(consent_mgr.revoke_consent(
                user_id=user_id,
                purposes=purposes
            ))

            return {
                "status": "success" if success else "error",
                "message": f"Consentimento revogado para: {', '.join(purposes)}" if success else "Falha ao revogar consentimento",
                "purposes_revoked": purposes,
                "lgpd_article": "8"
            }

    except Exception as e:
        return {"status": "error", "message": f"Error managing consent: {str(e)}"}


def get_my_data_categories(tool_context: ToolContext) -> dict:
    """Lista categorias de dados armazenados sobre o usuario.

    Util para transparencia e para entender que tipos de dados
    estao sendo mantidos antes de solicitar exportacao ou exclusao.

    Returns:
        dict: {
            "status": "success",
            "categories": {
                "agent": {"tables": [...], "total_records": int},
                "memory": {"tables": [...], "total_records": int},
                ...
            },
            "total_records": int
        }

    Example:
        result = get_my_data_categories(tool_context)
        for category, info in result["categories"].items():
            print(f"{category}: {info['total_records']} registros")
    """
    user_id = _get_user_id(tool_context)
    if not user_id:
        return {"status": "error", "message": "User not authenticated"}

    try:
        from ..privacy import get_data_subject_rights

        rights = get_data_subject_rights()
        categories = _run_async(rights.get_data_categories(user_id))

        total = sum(c.get("total_records", 0) for c in categories.values())

        return {
            "status": "success",
            "categories": categories,
            "total_records": total
        }

    except Exception as e:
        return {"status": "error", "message": f"Error getting data categories: {str(e)}"}
