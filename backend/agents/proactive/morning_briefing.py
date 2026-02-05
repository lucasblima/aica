"""
Morning Briefing Proactive Agent for AICA Life OS (Task #43)

Generates personalized daily briefings for users at their preferred time.

Schedule: Daily at user's preferred time (default 7:00 AM)
Actions:
- Gather tasks, calendar, emotional state from all modules
- Generate personalized daily briefing using Gemini
- Store briefing in user_memory for retrieval

The briefing includes:
- Tasks overview (pending, urgent, completed yesterday)
- Emotional state summary (from recent Journey moments)
- Calendar highlights (today's events)
- Cross-module insights and recommendations

Usage:
    from backend.agents.proactive.morning_briefing import MorningBriefingAgent

    agent = MorningBriefingAgent()
    result = await agent.run(user_id)

    # Briefing is stored in user_memory:
    # key: "daily_briefing_{date}"
    # category: "proactive"

References:
- Task #43: Proactive Agents (Scheduled Tasks and Triggers)
- Task #42: Daily Briefing Workflow (reused here)
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, date, timedelta

from google import genai
from google.genai import types
from supabase import create_client, Client

from .base import (
    ProactiveAgent,
    ProactiveResult,
    Schedule,
    ScheduleType,
    ExecutionState,
)

logger = logging.getLogger(__name__)

# Environment configuration
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Gemini configuration
BRIEFING_MODEL = "gemini-2.5-flash"


class MorningBriefingAgent(ProactiveAgent):
    """
    Proactive agent that generates personalized daily briefings.

    Runs daily at user's preferred time (default 7:00 AM) to:
    1. Gather data from Atlas (tasks), Journey (emotions), Finance, Studio
    2. Generate a personalized briefing using Gemini
    3. Store the briefing in user_memory for later retrieval

    The briefing adapts to user's current state:
    - Heavy workload: Emphasize priorities
    - Emotional challenges: Empathetic tone
    - Achievements: Celebratory acknowledgment
    """

    def __init__(
        self,
        default_hour: int = 7,
        default_minute: int = 0,
    ):
        """
        Initialize MorningBriefingAgent.

        Args:
            default_hour: Default hour for briefing (0-23)
            default_minute: Default minute for briefing (0-59)
        """
        super().__init__(
            name="morning_briefing",
            schedule=Schedule(
                type=ScheduleType.CRON,
                cron_expression=f"{default_minute} {default_hour} * * *",
                timezone="America/Sao_Paulo",
            ),
            description="Gera briefing diario personalizado com visao integrada de todas as areas da vida.",
            max_retries=2,
            retry_delay_seconds=30,
        )

        self.default_hour = default_hour
        self.default_minute = default_minute

        # Initialize Gemini client
        if GEMINI_API_KEY:
            self.genai_client = genai.Client(api_key=GEMINI_API_KEY)
        else:
            self.genai_client = None
            logger.warning("MorningBriefingAgent: No Gemini API key")

    def should_run(self, user_id: str, state: ExecutionState) -> bool:
        """
        Check if briefing should run for this user.

        Skips if:
        - Already ran today
        - User has disabled briefings (future feature)

        Args:
            user_id: User UUID
            state: Current execution state

        Returns:
            True if should run
        """
        # Check if already ran today
        if state.last_run_at:
            today = date.today()
            last_run_date = state.last_run_at.date()
            if last_run_date == today:
                logger.debug(f"Briefing already ran today for user {user_id[:8]}...")
                return False

        return True

    async def execute(
        self,
        user_id: str,
        context: Dict[str, Any]
    ) -> ProactiveResult:
        """
        Execute morning briefing generation.

        Args:
            user_id: User UUID
            context: Execution context

        Returns:
            ProactiveResult with briefing data
        """
        if not self.genai_client:
            return ProactiveResult(
                success=False,
                message="Gemini API not configured",
                error="NO_GEMINI_API"
            )

        try:
            # Step 1: Gather data from all modules
            module_data = await self._gather_module_data(user_id)

            # Step 2: Get user profile for personalization
            user_profile = await self._get_user_profile(user_id)

            # Step 3: Generate briefing with Gemini
            briefing = await self._generate_briefing(
                user_id=user_id,
                user_profile=user_profile,
                module_data=module_data,
            )

            # Step 4: Store briefing in user_memory
            today_str = date.today().isoformat()
            memory_key = f"daily_briefing_{today_str}"

            stored = await self.store_in_memory(
                user_id=user_id,
                key=memory_key,
                value={
                    "briefing": briefing,
                    "generated_at": datetime.utcnow().isoformat(),
                    "module_data_summary": {
                        k: len(v) if isinstance(v, list) else 1
                        for k, v in module_data.items()
                        if v
                    }
                },
                category="proactive",
                confidence=1.0,
            )

            # Also store as "latest_briefing" for easy retrieval
            await self.store_in_memory(
                user_id=user_id,
                key="latest_briefing",
                value={
                    "briefing": briefing,
                    "date": today_str,
                    "generated_at": datetime.utcnow().isoformat(),
                },
                category="proactive",
                confidence=1.0,
            )

            return ProactiveResult(
                success=True,
                message="Briefing diario gerado com sucesso",
                data={
                    "briefing": briefing,
                    "date": today_str,
                    "modules_included": list(module_data.keys()),
                },
                stored_memory_keys=[memory_key, "latest_briefing"],
            )

        except Exception as e:
            logger.error(f"Error generating briefing for {user_id[:8]}...: {e}")
            return ProactiveResult(
                success=False,
                message="Erro ao gerar briefing",
                error=str(e)
            )

    async def _gather_module_data(self, user_id: str) -> Dict[str, Any]:
        """
        Gather data from all AICA modules.

        Args:
            user_id: User UUID

        Returns:
            Dictionary with data from each module
        """
        if not self.supabase:
            return {}

        module_data = {}

        # Atlas: Tasks
        try:
            # Pending tasks
            pending = self.supabase.table("work_items") \
                .select("id, title, priority, priority_quadrant, due_date") \
                .eq("user_id", user_id) \
                .eq("status", "todo") \
                .order("priority_quadrant", desc=False) \
                .limit(10) \
                .execute()

            # Completed yesterday
            yesterday = (date.today() - timedelta(days=1)).isoformat()
            completed = self.supabase.table("work_items") \
                .select("id, title") \
                .eq("user_id", user_id) \
                .eq("status", "completed") \
                .gte("completed_at", yesterday) \
                .limit(10) \
                .execute()

            # Count urgent tasks
            urgent_count = len([
                t for t in (pending.data or [])
                if t.get("priority_quadrant") == 1 or t.get("priority") == "urgent"
            ])

            module_data["atlas"] = {
                "pending_tasks": pending.data or [],
                "completed_yesterday": completed.data or [],
                "urgent_count": urgent_count,
                "total_pending": len(pending.data or []),
            }
        except Exception as e:
            logger.error(f"Error fetching Atlas data: {e}")

        # Journey: Recent emotional state
        try:
            threshold = (datetime.utcnow() - timedelta(days=7)).isoformat()
            moments = self.supabase.table("moments") \
                .select("emotion, content, created_at") \
                .eq("user_id", user_id) \
                .gte("created_at", threshold) \
                .order("created_at", desc=True) \
                .limit(10) \
                .execute()

            # Analyze emotion distribution
            emotions = [m["emotion"] for m in (moments.data or []) if m.get("emotion")]
            emotion_counts = {}
            for e in emotions:
                emotion_counts[e] = emotion_counts.get(e, 0) + 1

            dominant_emotion = max(emotion_counts.items(), key=lambda x: x[1])[0] if emotion_counts else None

            module_data["journey"] = {
                "recent_moments": moments.data or [],
                "emotion_distribution": emotion_counts,
                "dominant_emotion": dominant_emotion,
            }
        except Exception as e:
            logger.error(f"Error fetching Journey data: {e}")

        # Finance: Monthly summary
        try:
            month_start = date.today().replace(day=1).isoformat()
            transactions = self.supabase.table("finance_transactions") \
                .select("type, amount, category") \
                .eq("user_id", user_id) \
                .gte("transaction_date", month_start) \
                .execute()

            income = sum(
                abs(float(t["amount"]))
                for t in (transactions.data or [])
                if t.get("type") == "income"
            )
            expenses = sum(
                abs(float(t["amount"]))
                for t in (transactions.data or [])
                if t.get("type") == "expense"
            )

            module_data["finance"] = {
                "monthly_income": income,
                "monthly_expenses": expenses,
                "balance": income - expenses,
                "transaction_count": len(transactions.data or []),
            }
        except Exception as e:
            logger.error(f"Error fetching Finance data: {e}")

        # Studio: Upcoming episodes
        try:
            episodes = self.supabase.table("podcast_episodes") \
                .select("id, title, status, guest_name, scheduled_date") \
                .eq("user_id", user_id) \
                .in_("status", ["planned", "scheduled", "recording"]) \
                .order("scheduled_date", desc=False) \
                .limit(5) \
                .execute()

            module_data["studio"] = {
                "upcoming_episodes": episodes.data or [],
            }
        except Exception as e:
            logger.error(f"Error fetching Studio data: {e}")

        # Captacao: Deadlines
        try:
            next_week = (date.today() + timedelta(days=7)).isoformat()
            grants = self.supabase.table("grant_projects") \
                .select("id, project_name, deadline, status") \
                .eq("user_id", user_id) \
                .in_("status", ["draft", "briefing", "generating", "review"]) \
                .lte("deadline", next_week) \
                .order("deadline", desc=False) \
                .limit(5) \
                .execute()

            module_data["captacao"] = {
                "upcoming_deadlines": grants.data or [],
            }
        except Exception as e:
            logger.error(f"Error fetching Captacao data: {e}")

        return module_data

    async def _get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get user profile for personalization.

        Args:
            user_id: User UUID

        Returns:
            User profile data
        """
        if not self.supabase:
            return {}

        try:
            result = self.supabase.table("profiles") \
                .select("full_name, avatar_url") \
                .eq("id", user_id) \
                .maybe_single() \
                .execute()

            return result.data or {}
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return {}

    async def _generate_briefing(
        self,
        user_id: str,
        user_profile: Dict[str, Any],
        module_data: Dict[str, Any],
    ) -> str:
        """
        Generate personalized briefing using Gemini.

        Args:
            user_id: User UUID
            user_profile: User profile data
            module_data: Data gathered from modules

        Returns:
            Generated briefing text
        """
        user_name = user_profile.get("full_name", "").split()[0] or "amigo"
        today = date.today()
        weekday = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"][today.weekday()]

        # Build context sections
        atlas_context = ""
        if "atlas" in module_data:
            atlas = module_data["atlas"]
            tasks = atlas.get("pending_tasks", [])[:5]
            task_list = "\n".join([
                f"- {t['title']} (Q{t.get('priority_quadrant', '?')})"
                for t in tasks
            ])
            atlas_context = f"""
**Tarefas ({atlas.get('total_pending', 0)} pendentes, {atlas.get('urgent_count', 0)} urgentes):**
{task_list or '- Nenhuma tarefa pendente'}

Completadas ontem: {len(atlas.get('completed_yesterday', []))} tarefas
"""

        journey_context = ""
        if "journey" in module_data:
            journey = module_data["journey"]
            dominant = journey.get("dominant_emotion", "desconhecida")
            recent = journey.get("recent_moments", [])[:2]
            moment_hints = ""
            if recent:
                moment_hints = f"Ultima reflexao: \"{recent[0].get('content', '')[:100]}...\""
            journey_context = f"""
**Estado Emocional (ultimos 7 dias):**
Emocao predominante: {dominant}
{moment_hints}
"""

        finance_context = ""
        if "finance" in module_data:
            finance = module_data["finance"]
            balance = finance.get("balance", 0)
            status = "positivo" if balance >= 0 else "negativo"
            finance_context = f"""
**Financeiro (mes atual):**
Receitas: R$ {finance.get('monthly_income', 0):,.2f}
Despesas: R$ {finance.get('monthly_expenses', 0):,.2f}
Saldo: R$ {balance:,.2f} ({status})
"""

        studio_context = ""
        if "studio" in module_data:
            studio = module_data["studio"]
            episodes = studio.get("upcoming_episodes", [])
            if episodes:
                ep_list = "\n".join([
                    f"- {e['title']} ({e.get('status', 'planejado')})"
                    for e in episodes[:3]
                ])
                studio_context = f"""
**Podcast:**
{ep_list}
"""

        captacao_context = ""
        if "captacao" in module_data:
            captacao = module_data["captacao"]
            deadlines = captacao.get("upcoming_deadlines", [])
            if deadlines:
                dl_list = "\n".join([
                    f"- {d['project_name']}: {d.get('deadline', 'sem data')}"
                    for d in deadlines[:3]
                ])
                captacao_context = f"""
**Editais (proximos 7 dias):**
{dl_list}
"""

        prompt = f"""Voce e a Aica, assistente pessoal integrada ao Aica Life OS.
Gere um briefing diario personalizado e acolhedor para {user_name}.

## Data
{weekday}, {today.strftime('%d/%m/%Y')}

## Dados do Usuario
{atlas_context}
{journey_context}
{finance_context}
{studio_context}
{captacao_context}

## Instrucoes
1. Comece com uma saudacao calorosa e personalizada
2. Resuma as prioridades do dia (max 3 itens)
3. Mencione alertas importantes (deadlines, financas, etc)
4. Inclua uma sugestao ou insight conectando diferentes areas
5. Termine com uma mensagem motivacional breve

## Formato
- Max 250 palavras
- Tom acolhedor mas objetivo
- Use bullet points para listas
- Max 2 emojis
- Portugues brasileiro

## Adaptacoes
- Se estado emocional negativo: seja mais empatico
- Se sobrecarga de tarefas: priorize sem pressionar
- Se conquistas recentes: celebre brevemente
"""

        try:
            response = self.genai_client.models.generate_content(
                model=BRIEFING_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=800,
                )
            )

            return response.text

        except Exception as e:
            logger.error(f"Error generating briefing with Gemini: {e}")
            # Return a fallback briefing
            return f"""Bom dia, {user_name}!

Aqui esta seu resumo do dia:

**Prioridades:**
{atlas_context or '- Verifique suas tarefas no Atlas'}

**Alertas:**
{captacao_context or '- Sem alertas urgentes'}

Tenha um otimo dia!

-- Aica"""

    async def on_success(
        self,
        user_id: str,
        result: ProactiveResult,
        state: ExecutionState
    ) -> None:
        """
        Called after successful briefing generation.

        Could be used to:
        - Send notification to user
        - Update user engagement metrics
        """
        logger.info(
            f"Morning briefing generated for {user_id[:8]}... "
            f"(run #{state.run_count})"
        )


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_morning_briefing_agent(
    hour: int = 7,
    minute: int = 0
) -> MorningBriefingAgent:
    """
    Factory function to create MorningBriefingAgent.

    Args:
        hour: Hour for daily briefing (0-23)
        minute: Minute for daily briefing (0-59)

    Returns:
        Configured MorningBriefingAgent instance
    """
    return MorningBriefingAgent(default_hour=hour, default_minute=minute)
