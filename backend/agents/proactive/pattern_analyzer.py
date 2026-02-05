"""
Pattern Analyzer Proactive Agent for AICA Life OS (Task #43)

Analyzes cross-module patterns to generate weekly insights and recommendations.

Schedule: Weekly (Sunday night at 21:00)
Actions:
- Analyze productivity patterns (Atlas + Journey)
- Analyze spending patterns (Finance + Atlas)
- Analyze social patterns (Connections + Journey)
- Update user profile with new insights
- Generate weekly summary

The analyzer uses the CrossModuleService from Task #40 to generate
holistic insights that wouldn't be visible from a single module.

Usage:
    from backend.agents.proactive.pattern_analyzer import PatternAnalyzerAgent

    agent = PatternAnalyzerAgent()
    result = await agent.run(user_id)

    # Insights are stored in user_memory:
    # key: "weekly_patterns_{week_number}"
    # category: "proactive"

References:
- Task #43: Proactive Agents (Scheduled Tasks and Triggers)
- Task #40: Cross-Module Intelligence (CrossModuleService)
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, date, timedelta
from dataclasses import dataclass, asdict

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
ANALYSIS_MODEL = "gemini-2.5-flash"


@dataclass
class WeeklyPattern:
    """
    Represents a discovered pattern from the week.

    Attributes:
        category: Pattern category (productivity, emotional, financial, social)
        finding: Description of the pattern
        modules_involved: Modules that contributed to this finding
        confidence: Confidence score (0-1)
        recommendation: Actionable recommendation
        data_points: Number of data points analyzed
    """
    category: str
    finding: str
    modules_involved: List[str]
    confidence: float
    recommendation: str
    data_points: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


class PatternAnalyzerAgent(ProactiveAgent):
    """
    Proactive agent that analyzes cross-module patterns weekly.

    Runs weekly on Sunday night to:
    1. Gather week's data from all modules
    2. Analyze correlations and patterns
    3. Generate insights using Gemini
    4. Update user profile with discoveries
    5. Store weekly summary

    Patterns analyzed:
    - Productivity trends (tasks completed vs emotional state)
    - Spending patterns (finance vs lifestyle)
    - Social patterns (connections vs emotional well-being)
    - Content creation (podcast output vs other activities)
    """

    def __init__(
        self,
        day_of_week: int = 6,  # 0=Monday, 6=Sunday
        hour: int = 21,
        minute: int = 0,
    ):
        """
        Initialize PatternAnalyzerAgent.

        Args:
            day_of_week: Day to run (0=Monday, 6=Sunday)
            hour: Hour to run (0-23)
            minute: Minute to run (0-59)
        """
        # Build cron expression
        # minute hour day month day_of_week
        cron = f"{minute} {hour} * * {day_of_week}"

        super().__init__(
            name="pattern_analyzer",
            schedule=Schedule(
                type=ScheduleType.CRON,
                cron_expression=cron,
                timezone="America/Sao_Paulo",
            ),
            description="Analisa padroes cross-module semanalmente para gerar insights personalizados.",
            max_retries=2,
            retry_delay_seconds=60,
        )

        # Initialize Gemini client
        if GEMINI_API_KEY:
            self.genai_client = genai.Client(api_key=GEMINI_API_KEY)
        else:
            self.genai_client = None
            logger.warning("PatternAnalyzerAgent: No Gemini API key")

    def should_run(self, user_id: str, state: ExecutionState) -> bool:
        """
        Check if analysis should run for this user.

        Skips if:
        - Already ran this week
        - User has insufficient data (< 10 interactions)

        Args:
            user_id: User UUID
            state: Current execution state

        Returns:
            True if should run
        """
        # Check if already ran this week
        if state.last_run_at:
            today = date.today()
            last_run_date = state.last_run_at.date()

            # Get week numbers
            current_week = today.isocalendar()[1]
            last_run_week = last_run_date.isocalendar()[1]

            if current_week == last_run_week and today.year == last_run_date.year:
                logger.debug(f"Pattern analysis already ran this week for {user_id[:8]}...")
                return False

        return True

    async def execute(
        self,
        user_id: str,
        context: Dict[str, Any]
    ) -> ProactiveResult:
        """
        Execute weekly pattern analysis.

        Args:
            user_id: User UUID
            context: Execution context

        Returns:
            ProactiveResult with patterns and insights
        """
        if not self.genai_client:
            return ProactiveResult(
                success=False,
                message="Gemini API not configured",
                error="NO_GEMINI_API"
            )

        try:
            # Step 1: Gather week's data
            week_data = await self._gather_week_data(user_id)

            if not week_data or all(not v for v in week_data.values()):
                return ProactiveResult(
                    success=True,
                    message="Dados insuficientes para analise semanal",
                    data={"insufficient_data": True}
                )

            # Step 2: Analyze patterns with Gemini
            patterns = await self._analyze_patterns(user_id, week_data)

            # Step 3: Generate weekly summary
            summary = await self._generate_summary(user_id, week_data, patterns)

            # Step 4: Store patterns and summary
            today = date.today()
            week_number = today.isocalendar()[1]
            year = today.year
            memory_key = f"weekly_patterns_{year}_w{week_number}"

            analysis_data = {
                "week": week_number,
                "year": year,
                "patterns": [p.to_dict() for p in patterns],
                "summary": summary,
                "data_overview": {
                    module: len(data) if isinstance(data, list) else bool(data)
                    for module, data in week_data.items()
                },
                "analyzed_at": datetime.utcnow().isoformat(),
            }

            await self.store_in_memory(
                user_id=user_id,
                key=memory_key,
                value=analysis_data,
                category="proactive",
                confidence=1.0,
            )

            # Store latest analysis reference
            await self.store_in_memory(
                user_id=user_id,
                key="latest_weekly_analysis",
                value={
                    "week": week_number,
                    "year": year,
                    "memory_key": memory_key,
                    "pattern_count": len(patterns),
                    "analyzed_at": datetime.utcnow().isoformat(),
                },
                category="proactive",
                confidence=1.0,
            )

            # Step 5: Update user profile with significant patterns
            await self._update_user_profile(user_id, patterns)

            return ProactiveResult(
                success=True,
                message=f"Analise semanal concluida: {len(patterns)} padroes identificados",
                data=analysis_data,
                stored_memory_keys=[memory_key, "latest_weekly_analysis"],
            )

        except Exception as e:
            logger.error(f"Error in pattern analysis for {user_id[:8]}...: {e}")
            return ProactiveResult(
                success=False,
                message="Erro na analise semanal",
                error=str(e)
            )

    async def _gather_week_data(self, user_id: str) -> Dict[str, Any]:
        """
        Gather data from the past week across all modules.

        Args:
            user_id: User UUID

        Returns:
            Dictionary with weekly data from each module
        """
        if not self.supabase:
            return {}

        week_data = {}
        week_start = (date.today() - timedelta(days=7)).isoformat()

        # Atlas: Tasks activity
        try:
            tasks = self.supabase.table("work_items") \
                .select("id, title, priority, priority_quadrant, status, created_at, completed_at") \
                .eq("user_id", user_id) \
                .gte("created_at", week_start) \
                .execute()

            completed = [t for t in (tasks.data or []) if t.get("status") == "completed"]
            pending = [t for t in (tasks.data or []) if t.get("status") == "todo"]

            # Calculate completion by day
            completion_by_day = {}
            for task in completed:
                if task.get("completed_at"):
                    day = task["completed_at"][:10]
                    completion_by_day[day] = completion_by_day.get(day, 0) + 1

            week_data["atlas"] = {
                "total_created": len(tasks.data or []),
                "completed": len(completed),
                "pending": len(pending),
                "completion_rate": len(completed) / max(len(tasks.data or []), 1),
                "by_quadrant": self._count_by_field(tasks.data or [], "priority_quadrant"),
                "completion_by_day": completion_by_day,
            }
        except Exception as e:
            logger.error(f"Error gathering Atlas data: {e}")

        # Journey: Emotional patterns
        try:
            moments = self.supabase.table("moments") \
                .select("id, emotion, content, tags, created_at") \
                .eq("user_id", user_id) \
                .gte("created_at", week_start) \
                .order("created_at", desc=False) \
                .execute()

            emotions_by_day = {}
            for moment in (moments.data or []):
                day = moment["created_at"][:10]
                emotion = moment.get("emotion")
                if emotion:
                    if day not in emotions_by_day:
                        emotions_by_day[day] = []
                    emotions_by_day[day].append(emotion)

            week_data["journey"] = {
                "total_moments": len(moments.data or []),
                "emotion_counts": self._count_by_field(moments.data or [], "emotion"),
                "emotions_by_day": emotions_by_day,
                "tags_used": self._extract_all_tags(moments.data or []),
            }
        except Exception as e:
            logger.error(f"Error gathering Journey data: {e}")

        # Finance: Spending patterns
        try:
            transactions = self.supabase.table("finance_transactions") \
                .select("type, amount, category, transaction_date") \
                .eq("user_id", user_id) \
                .gte("transaction_date", week_start) \
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

            spending_by_day = {}
            for t in (transactions.data or []):
                if t.get("type") == "expense":
                    day = t["transaction_date"][:10]
                    spending_by_day[day] = spending_by_day.get(day, 0) + abs(float(t["amount"]))

            week_data["finance"] = {
                "total_income": income,
                "total_expenses": expenses,
                "net": income - expenses,
                "by_category": self._sum_by_field(
                    [t for t in (transactions.data or []) if t.get("type") == "expense"],
                    "category",
                    "amount"
                ),
                "spending_by_day": spending_by_day,
            }
        except Exception as e:
            logger.error(f"Error gathering Finance data: {e}")

        # Connections: Social activity
        try:
            # Count new connections or interactions
            connections = self.supabase.table("connection_members") \
                .select("id, created_at, last_interaction_at") \
                .eq("user_id", user_id) \
                .gte("created_at", week_start) \
                .execute()

            interactions = self.supabase.table("connection_members") \
                .select("id") \
                .eq("user_id", user_id) \
                .gte("last_interaction_at", week_start) \
                .execute()

            week_data["connections"] = {
                "new_connections": len(connections.data or []),
                "interactions": len(interactions.data or []),
            }
        except Exception as e:
            logger.debug(f"Error gathering Connections data: {e}")

        # Studio: Content creation
        try:
            episodes = self.supabase.table("podcast_episodes") \
                .select("id, status, created_at") \
                .eq("user_id", user_id) \
                .gte("created_at", week_start) \
                .execute()

            week_data["studio"] = {
                "episodes_created": len(episodes.data or []),
                "by_status": self._count_by_field(episodes.data or [], "status"),
            }
        except Exception as e:
            logger.debug(f"Error gathering Studio data: {e}")

        return week_data

    def _count_by_field(self, items: List[Dict], field: str) -> Dict[str, int]:
        """Count items grouped by field value."""
        counts = {}
        for item in items:
            value = str(item.get(field, "unknown"))
            counts[value] = counts.get(value, 0) + 1
        return counts

    def _sum_by_field(
        self,
        items: List[Dict],
        group_field: str,
        sum_field: str
    ) -> Dict[str, float]:
        """Sum values grouped by field."""
        sums = {}
        for item in items:
            group = str(item.get(group_field, "unknown"))
            value = abs(float(item.get(sum_field, 0)))
            sums[group] = sums.get(group, 0) + value
        return sums

    def _extract_all_tags(self, moments: List[Dict]) -> Dict[str, int]:
        """Extract and count all tags from moments."""
        tags = {}
        for moment in moments:
            moment_tags = moment.get("tags") or []
            for tag in moment_tags:
                tags[tag] = tags.get(tag, 0) + 1
        return tags

    async def _analyze_patterns(
        self,
        user_id: str,
        week_data: Dict[str, Any]
    ) -> List[WeeklyPattern]:
        """
        Analyze patterns using Gemini.

        Args:
            user_id: User UUID
            week_data: Collected weekly data

        Returns:
            List of discovered patterns
        """
        prompt = f"""Voce e um analista de padroes de comportamento do Aica Life OS.
Analise os dados semanais do usuario e identifique padroes significativos.

## DADOS DA SEMANA

### Produtividade (Atlas)
{json.dumps(week_data.get('atlas', {}), indent=2, ensure_ascii=False)}

### Estado Emocional (Journey)
{json.dumps(week_data.get('journey', {}), indent=2, ensure_ascii=False)}

### Financeiro (Finance)
{json.dumps(week_data.get('finance', {}), indent=2, ensure_ascii=False)}

### Social (Connections)
{json.dumps(week_data.get('connections', {}), indent=2, ensure_ascii=False)}

### Conteudo (Studio)
{json.dumps(week_data.get('studio', {}), indent=2, ensure_ascii=False)}

## TAREFA
Identifique ate 5 padroes significativos que conectam diferentes areas da vida do usuario.
Foque em correlacoes acionaveis que ajudem o usuario a melhorar.

Retorne APENAS um JSON valido (sem markdown) no formato:
{{
  "patterns": [
    {{
      "category": "productivity|emotional|financial|social|creative",
      "finding": "descricao clara do padrao em portugues",
      "modules_involved": ["atlas", "journey"],
      "confidence": 0.0-1.0,
      "recommendation": "sugestao pratica em portugues",
      "data_points": numero_de_dados_analisados
    }}
  ]
}}

## REGRAS
- Apenas padroes com confianca >= 0.6
- Cada padrao deve envolver pelo menos 2 modulos
- Recomendacoes devem ser especificas e acionaveis
- Maximo 5 padroes
- Se dados insuficientes, retorne lista vazia
"""

        try:
            response = self.genai_client.models.generate_content(
                model=ANALYSIS_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                )
            )

            result = json.loads(response.text)
            patterns = []

            for p in result.get("patterns", []):
                if p.get("confidence", 0) >= 0.6:
                    patterns.append(WeeklyPattern(
                        category=p.get("category", "unknown"),
                        finding=p.get("finding", ""),
                        modules_involved=p.get("modules_involved", []),
                        confidence=float(p.get("confidence", 0)),
                        recommendation=p.get("recommendation", ""),
                        data_points=int(p.get("data_points", 0)),
                    ))

            return patterns

        except Exception as e:
            logger.error(f"Error analyzing patterns with Gemini: {e}")
            return []

    async def _generate_summary(
        self,
        user_id: str,
        week_data: Dict[str, Any],
        patterns: List[WeeklyPattern]
    ) -> str:
        """
        Generate human-readable weekly summary.

        Args:
            user_id: User UUID
            week_data: Weekly data
            patterns: Discovered patterns

        Returns:
            Summary text
        """
        # Build pattern text
        pattern_text = ""
        if patterns:
            pattern_text = "\n".join([
                f"- **{p.category.title()}**: {p.finding}"
                for p in patterns
            ])
        else:
            pattern_text = "Nenhum padrao significativo identificado esta semana."

        # Build stats
        atlas = week_data.get("atlas", {})
        journey = week_data.get("journey", {})
        finance = week_data.get("finance", {})

        stats = f"""
**Produtividade:**
- Tarefas criadas: {atlas.get('total_created', 0)}
- Completadas: {atlas.get('completed', 0)}
- Taxa de conclusao: {atlas.get('completion_rate', 0):.0%}

**Bem-estar:**
- Momentos registrados: {journey.get('total_moments', 0)}
- Emocao predominante: {max(journey.get('emotion_counts', {'neutro': 1}).items(), key=lambda x: x[1])[0] if journey.get('emotion_counts') else 'desconhecida'}

**Financeiro:**
- Receitas: R$ {finance.get('total_income', 0):,.2f}
- Despesas: R$ {finance.get('total_expenses', 0):,.2f}
- Saldo semanal: R$ {finance.get('net', 0):,.2f}
"""

        # Top recommendation
        top_rec = ""
        if patterns:
            best_pattern = max(patterns, key=lambda p: p.confidence)
            top_rec = f"\n**Recomendacao da Semana:**\n{best_pattern.recommendation}"

        summary = f"""## Resumo Semanal

{stats}

## Padroes Identificados
{pattern_text}
{top_rec}
"""

        return summary

    async def _update_user_profile(
        self,
        user_id: str,
        patterns: List[WeeklyPattern]
    ) -> None:
        """
        Update user_memory with discovered patterns for personalization.

        Args:
            user_id: User UUID
            patterns: Discovered patterns
        """
        if not patterns:
            return

        for pattern in patterns:
            if pattern.confidence >= 0.7:  # Only high-confidence patterns
                key = f"pattern_{pattern.category}_{pattern.modules_involved[0]}"
                await self.store_in_memory(
                    user_id=user_id,
                    key=key,
                    value={
                        "finding": pattern.finding,
                        "recommendation": pattern.recommendation,
                        "confidence": pattern.confidence,
                        "discovered_at": datetime.utcnow().isoformat(),
                    },
                    category="insight",
                    confidence=pattern.confidence,
                )


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_pattern_analyzer_agent(
    day_of_week: int = 6,
    hour: int = 21
) -> PatternAnalyzerAgent:
    """
    Factory function to create PatternAnalyzerAgent.

    Args:
        day_of_week: Day to run (0=Monday, 6=Sunday)
        hour: Hour to run

    Returns:
        Configured PatternAnalyzerAgent instance
    """
    return PatternAnalyzerAgent(day_of_week=day_of_week, hour=hour)
