"""
Cross-Module Intelligence Service for AICA Life OS (Task #40)

Analyzes data across multiple AICA modules to generate holistic insights.
Identifies correlations, patterns, and actionable suggestions that emerge
from combining data from different areas of the user's life.

Key Features:
- Analyzes data pairs between modules (Atlas+Journey, Finance+Atlas, etc.)
- Uses Gemini to identify correlations and patterns
- Generates actionable insights with confidence scores
- Provides context injection for the coordinator agent
- Stores discovered insights in user_memory for personalization

Module Pairs Analyzed:
- Atlas + Journey: Productivity vs Emotional State
- Atlas + Finance: Task patterns vs Spending patterns
- Journey + Connections: Emotional state vs Social interactions
- Captacao + Connections: Grant applications vs Academic networking
- Studio + Connections: Podcast production vs Guest network

Requirements:
- GOOGLE_API_KEY or GEMINI_API_KEY environment variable
- SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
- user_memory table for storing discovered insights

References:
- Task #40 Cross-Module Intelligence
- Task #35 User Memory Table
"""

import os
import json
import logging
import hashlib
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import asyncio

# Google Genai SDK
from google import genai
from google.genai import types

# Supabase client
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Environment configuration
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Analysis configuration
ANALYSIS_MODEL = "gemini-2.5-flash"  # Cost-effective for analysis
CORRELATION_THRESHOLD = 0.6  # Minimum correlation strength to report
CACHE_TTL_HOURS = 24  # Hours to cache insights before reanalysis
MAX_DATA_POINTS = 100  # Maximum data points to fetch per module


@dataclass
class CrossModuleInsight:
    """Represents a discovered cross-module insight."""
    modules: List[str]  # ["atlas", "journey"]
    finding: str  # Natural language description of the finding
    correlation_strength: float  # 0.0 - 1.0
    actionable_suggestion: str  # Practical recommendation
    data_points: int  # Number of data points analyzed
    insight_type: str  # "correlation", "pattern", "anomaly", "opportunity"
    created_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        if self.created_at:
            result["created_at"] = self.created_at.isoformat()
        return result


@dataclass
class CrossModuleAlert:
    """Alert from one module relevant to another."""
    source_module: str
    target_module: str
    alert_type: str  # "deadline", "overload", "opportunity", "risk"
    message: str
    urgency: str  # "low", "medium", "high"
    related_id: Optional[str] = None


class CrossModuleService:
    """
    Service for generating cross-module intelligence.

    Analyzes data from multiple AICA modules to identify correlations,
    patterns, and insights that wouldn't be visible from a single module.

    Usage:
        service = CrossModuleService()

        # Generate insights for a user
        insights = await service.analyze_cross_module_patterns(user_id)

        # Get context for a specific module
        context = await service.get_context_for_module(user_id, "atlas")
    """

    # Define module pairs for correlation analysis
    MODULE_PAIRS: List[Tuple[str, str]] = [
        ("atlas", "journey"),       # Productivity vs Emotions
        ("atlas", "finance"),       # Tasks vs Spending patterns
        ("journey", "connections"), # Emotions vs Social interactions
        ("captacao", "connections"),# Grant applications vs Networking
        ("studio", "connections"),  # Podcast vs Guest network
        ("finance", "journey"),     # Spending vs Emotional state
    ]

    # Module data fetchers - maps module name to table and key fields
    MODULE_CONFIGS: Dict[str, Dict[str, Any]] = {
        "atlas": {
            "table": "work_items",
            "time_field": "created_at",
            "key_fields": ["title", "priority", "status", "priority_quadrant", "due_date", "completed_at"],
            "analysis_focus": "produtividade e gestao de tarefas"
        },
        "journey": {
            "table": "moments",
            "time_field": "created_at",
            "key_fields": ["content", "emotion", "tags", "sentiment_data"],
            "analysis_focus": "emocoes e reflexoes"
        },
        "finance": {
            "table": "finance_transactions",
            "time_field": "transaction_date",
            "key_fields": ["type", "amount", "category", "description"],
            "analysis_focus": "padroes de gastos e receitas"
        },
        "captacao": {
            "table": "grant_projects",
            "time_field": "created_at",
            "key_fields": ["project_name", "status", "deadline", "completion_percentage"],
            "analysis_focus": "projetos de captacao e editais"
        },
        "studio": {
            "table": "podcast_episodes",
            "time_field": "created_at",
            "key_fields": ["title", "status", "guest_name", "scheduled_date"],
            "analysis_focus": "producao de podcasts"
        },
        "connections": {
            "table": "connection_members",
            "time_field": "created_at",
            "key_fields": ["external_name", "role", "context_label", "last_interaction_at"],
            "analysis_focus": "rede de contatos e relacionamentos"
        }
    }

    def __init__(
        self,
        gemini_api_key: str = GEMINI_API_KEY,
        supabase_url: str = SUPABASE_URL,
        supabase_key: str = SUPABASE_SERVICE_KEY,
    ):
        """
        Initialize CrossModuleService.

        Args:
            gemini_api_key: Gemini API key for LLM analysis
            supabase_url: Supabase project URL
            supabase_key: Service role key for data access
        """
        if not gemini_api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable required")

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")

        self.genai_client = genai.Client(api_key=gemini_api_key)
        self.supabase: Client = create_client(supabase_url, supabase_key)

        # In-memory cache for insights (user_id -> {insights, timestamp})
        self._insights_cache: Dict[str, Dict[str, Any]] = {}

        logger.info("Initialized CrossModuleService")

    async def analyze_cross_module_patterns(
        self,
        user_id: str,
        days: int = 30,
        force_refresh: bool = False
    ) -> List[CrossModuleInsight]:
        """
        Analyze patterns across module pairs and generate insights.

        Args:
            user_id: User UUID
            days: Number of days to analyze (default: 30)
            force_refresh: Force reanalysis even if cache is valid

        Returns:
            List of CrossModuleInsight objects
        """
        # Check cache first
        if not force_refresh and user_id in self._insights_cache:
            cache_entry = self._insights_cache[user_id]
            cache_age = datetime.now() - cache_entry["timestamp"]
            if cache_age < timedelta(hours=CACHE_TTL_HOURS):
                logger.debug(f"Returning cached insights for user {user_id[:8]}...")
                return cache_entry["insights"]

        insights: List[CrossModuleInsight] = []

        # Analyze each module pair
        for module_a, module_b in self.MODULE_PAIRS:
            try:
                data_a = await self._fetch_module_data(user_id, module_a, days)
                data_b = await self._fetch_module_data(user_id, module_b, days)

                # Skip if either module has no data
                if not data_a or not data_b:
                    logger.debug(f"Skipping {module_a}/{module_b}: insufficient data")
                    continue

                # Analyze correlation using Gemini
                insight = await self._analyze_correlation(
                    module_a=module_a,
                    data_a=data_a,
                    module_b=module_b,
                    data_b=data_b,
                    days=days
                )

                if insight and insight.correlation_strength >= CORRELATION_THRESHOLD:
                    insight.created_at = datetime.now()
                    insights.append(insight)

                    # Store insight in user_memory
                    await self._store_insight_in_memory(user_id, insight)

            except Exception as e:
                logger.error(f"Error analyzing {module_a}/{module_b}: {e}")
                continue

        # Update cache
        self._insights_cache[user_id] = {
            "insights": insights,
            "timestamp": datetime.now()
        }

        logger.info(f"Generated {len(insights)} cross-module insights for user {user_id[:8]}...")
        return insights

    async def _fetch_module_data(
        self,
        user_id: str,
        module: str,
        days: int
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch data from a specific module.

        Args:
            user_id: User UUID
            module: Module name
            days: Number of days to look back

        Returns:
            List of data records or None if failed
        """
        if module not in self.MODULE_CONFIGS:
            logger.warning(f"Unknown module: {module}")
            return None

        config = self.MODULE_CONFIGS[module]
        table = config["table"]
        time_field = config["time_field"]
        key_fields = config["key_fields"]

        threshold_date = (datetime.now() - timedelta(days=days)).isoformat()

        try:
            # Build select string
            select_fields = ["id", time_field] + key_fields
            select_str = ", ".join(select_fields)

            # Query the table
            result = self.supabase.table(table) \
                .select(select_str) \
                .eq("user_id", user_id) \
                .gte(time_field, threshold_date) \
                .order(time_field, desc=True) \
                .limit(MAX_DATA_POINTS) \
                .execute()

            return result.data if result.data else None

        except Exception as e:
            logger.error(f"Error fetching {module} data: {e}")
            return None

    async def _analyze_correlation(
        self,
        module_a: str,
        data_a: List[Dict[str, Any]],
        module_b: str,
        data_b: List[Dict[str, Any]],
        days: int
    ) -> Optional[CrossModuleInsight]:
        """
        Use Gemini to analyze correlations between two modules.

        Args:
            module_a: First module name
            data_a: Data from first module
            module_b: Second module name
            data_b: Data from second module
            days: Analysis period in days

        Returns:
            CrossModuleInsight or None if no significant correlation found
        """
        config_a = self.MODULE_CONFIGS[module_a]
        config_b = self.MODULE_CONFIGS[module_b]

        # Prepare data summary (truncate for token efficiency)
        data_a_summary = self._summarize_data(data_a[:50])  # Max 50 records
        data_b_summary = self._summarize_data(data_b[:50])

        prompt = f'''Voce e um analista de dados pessoais do Aica Life OS.
Analise os dados de dois modulos e identifique correlacoes significativas.

## MODULO {module_a.upper()} ({config_a["analysis_focus"]})
Dados dos ultimos {days} dias ({len(data_a)} registros):
{json.dumps(data_a_summary, indent=2, ensure_ascii=False)}

## MODULO {module_b.upper()} ({config_b["analysis_focus"]})
Dados dos ultimos {days} dias ({len(data_b)} registros):
{json.dumps(data_b_summary, indent=2, ensure_ascii=False)}

## TAREFA
Analise os dados e identifique:
1. Correlacoes temporais (eventos que acontecem juntos)
2. Padroes de comportamento relacionados entre os modulos
3. Insights acionaveis que ajudem o usuario

Retorne APENAS um JSON valido (sem markdown) no formato:
{{
  "has_correlation": true/false,
  "finding": "descricao clara da correlacao encontrada em portugues",
  "correlation_strength": 0.0-1.0,
  "actionable_suggestion": "sugestao pratica baseada no insight em portugues",
  "insight_type": "correlation|pattern|anomaly|opportunity",
  "data_points": numero_de_pontos_analisados
}}

Se nao encontrar correlacao significativa, retorne has_correlation: false.
Seja objetivo e pratico nas sugestoes.
'''

        try:
            response = self.genai_client.models.generate_content(
                model=ANALYSIS_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3  # Lower temperature for more consistent analysis
                )
            )

            result = json.loads(response.text)

            if not result.get("has_correlation"):
                return None

            return CrossModuleInsight(
                modules=[module_a, module_b],
                finding=result.get("finding", ""),
                correlation_strength=float(result.get("correlation_strength", 0.0)),
                actionable_suggestion=result.get("actionable_suggestion", ""),
                data_points=int(result.get("data_points", len(data_a) + len(data_b))),
                insight_type=result.get("insight_type", "correlation")
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Error in correlation analysis: {e}")
            return None

    def _summarize_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Summarize data for token efficiency.

        Removes large text fields and keeps only essential information.
        """
        summarized = []
        for record in data:
            summary = {}
            for key, value in record.items():
                # Skip large text fields
                if isinstance(value, str) and len(value) > 200:
                    summary[key] = value[:200] + "..."
                # Convert dates to simple format
                elif isinstance(value, str) and "T" in value and ":" in value:
                    summary[key] = value[:10]  # Keep only date part
                else:
                    summary[key] = value
            summarized.append(summary)
        return summarized

    async def _store_insight_in_memory(
        self,
        user_id: str,
        insight: CrossModuleInsight
    ) -> None:
        """
        Store discovered insight in user_memory table.

        Args:
            user_id: User UUID
            insight: The insight to store
        """
        try:
            # Generate unique key for this insight
            key = f"cross_module_{insight.modules[0]}_{insight.modules[1]}"

            memory_data = {
                "user_id": user_id,
                "category": "insight",
                "module": None,  # Cross-module (global)
                "key": key,
                "value": json.dumps({
                    "finding": insight.finding,
                    "modules": insight.modules,
                    "correlation": insight.correlation_strength,
                    "suggestion": insight.actionable_suggestion,
                    "type": insight.insight_type,
                    "data_points": insight.data_points
                }),
                "source": "inferred",
                "confidence": insight.correlation_strength
            }

            # Upsert to update existing or create new
            self.supabase.table("user_memory") \
                .upsert(memory_data, on_conflict="user_id,category,key,module") \
                .execute()

            logger.debug(f"Stored insight {key} for user {user_id[:8]}...")

        except Exception as e:
            logger.error(f"Error storing insight in memory: {e}")

    async def get_context_for_module(
        self,
        user_id: str,
        current_module: str
    ) -> str:
        """
        Get cross-module context relevant to the current module.

        This context can be injected into agent prompts to provide
        holistic awareness of the user's life.

        Args:
            user_id: User UUID
            current_module: The module the user is currently interacting with

        Returns:
            Formatted context string for agent injection
        """
        context_parts = []

        # Get cached insights that involve this module
        insights = await self._get_cached_insights(user_id)
        relevant_insights = [
            i for i in insights
            if current_module in i.modules
        ]

        if relevant_insights:
            context_parts.append("## Insights Cross-Module Relevantes")
            for insight in relevant_insights[:3]:  # Top 3 insights
                other_module = [m for m in insight.modules if m != current_module][0]
                context_parts.append(
                    f"- [{other_module.upper()}] {insight.finding} "
                    f"(confianca: {insight.correlation_strength:.0%})"
                )

        # Get cross-module alerts
        alerts = await self._get_cross_module_alerts(user_id, current_module)
        if alerts:
            context_parts.append("\n## Alertas de Outros Modulos")
            for alert in alerts[:3]:  # Top 3 alerts
                urgency_emoji = {"high": "!", "medium": "-", "low": "o"}[alert.urgency]
                context_parts.append(
                    f"- [{urgency_emoji}] [{alert.source_module.upper()}] {alert.message}"
                )

        return "\n".join(context_parts) if context_parts else ""

    async def _get_cached_insights(
        self,
        user_id: str
    ) -> List[CrossModuleInsight]:
        """
        Get cached insights or trigger fresh analysis.

        Args:
            user_id: User UUID

        Returns:
            List of insights
        """
        if user_id in self._insights_cache:
            return self._insights_cache[user_id]["insights"]

        # No cache, analyze fresh
        return await self.analyze_cross_module_patterns(user_id)

    async def _get_cross_module_alerts(
        self,
        user_id: str,
        current_module: str
    ) -> List[CrossModuleAlert]:
        """
        Generate alerts from other modules relevant to current module.

        Args:
            user_id: User UUID
            current_module: Current module context

        Returns:
            List of CrossModuleAlert objects
        """
        alerts: List[CrossModuleAlert] = []

        try:
            # Atlas alerts for other modules
            if current_module != "atlas":
                workload = await self._get_workload_status(user_id)
                if workload.get("overloaded"):
                    alerts.append(CrossModuleAlert(
                        source_module="atlas",
                        target_module=current_module,
                        alert_type="overload",
                        message=f"Carga alta: {workload['pending_urgent']} tarefas urgentes pendentes",
                        urgency="high"
                    ))

            # Captacao deadlines for Atlas
            if current_module == "atlas":
                deadlines = await self._get_upcoming_deadlines(user_id, "captacao", days=7)
                for deadline in deadlines[:2]:
                    alerts.append(CrossModuleAlert(
                        source_module="captacao",
                        target_module="atlas",
                        alert_type="deadline",
                        message=f"Deadline de edital em {deadline['days']} dias: {deadline['title']}",
                        urgency="high" if deadline["days"] <= 3 else "medium",
                        related_id=deadline.get("id")
                    ))

            # Journey emotional state for productivity modules
            if current_module in ["atlas", "studio"]:
                emotional_state = await self._get_recent_emotional_state(user_id)
                if emotional_state.get("needs_attention"):
                    alerts.append(CrossModuleAlert(
                        source_module="journey",
                        target_module=current_module,
                        alert_type="risk",
                        message=f"Estado emocional: {emotional_state['dominant_emotion']} nos ultimos dias",
                        urgency="medium"
                    ))

            # Finance alerts for Atlas (budget pressure)
            if current_module == "atlas":
                finance_status = await self._get_finance_status(user_id)
                if finance_status.get("budget_pressure"):
                    alerts.append(CrossModuleAlert(
                        source_module="finance",
                        target_module="atlas",
                        alert_type="risk",
                        message=f"Orcamento pressionado: gastos {finance_status['overspend_pct']:.0%} acima da media",
                        urgency="medium"
                    ))

        except Exception as e:
            logger.error(f"Error generating cross-module alerts: {e}")

        return alerts

    async def _get_workload_status(self, user_id: str) -> Dict[str, Any]:
        """Get current workload status from Atlas."""
        try:
            result = self.supabase.table("work_items") \
                .select("priority, priority_quadrant, status") \
                .eq("user_id", user_id) \
                .eq("status", "todo") \
                .execute()

            if not result.data:
                return {"overloaded": False, "pending_urgent": 0}

            # Count Q1 tasks (urgent + important)
            urgent_tasks = [
                t for t in result.data
                if t.get("priority_quadrant") == 1 or t.get("priority") == "urgent"
            ]

            return {
                "overloaded": len(urgent_tasks) >= 5,
                "pending_urgent": len(urgent_tasks),
                "total_pending": len(result.data)
            }

        except Exception as e:
            logger.error(f"Error getting workload status: {e}")
            return {"overloaded": False, "pending_urgent": 0}

    async def _get_upcoming_deadlines(
        self,
        user_id: str,
        module: str,
        days: int
    ) -> List[Dict[str, Any]]:
        """Get upcoming deadlines from a module."""
        try:
            if module == "captacao":
                threshold = (datetime.now() + timedelta(days=days)).isoformat()
                result = self.supabase.table("grant_projects") \
                    .select("id, project_name, deadline") \
                    .eq("user_id", user_id) \
                    .in_("status", ["draft", "briefing", "generating", "review"]) \
                    .lte("deadline", threshold) \
                    .order("deadline", desc=False) \
                    .limit(5) \
                    .execute()

                deadlines = []
                for project in (result.data or []):
                    if project.get("deadline"):
                        deadline_date = datetime.fromisoformat(project["deadline"].replace("Z", "+00:00"))
                        days_until = (deadline_date - datetime.now(deadline_date.tzinfo)).days
                        if days_until >= 0:
                            deadlines.append({
                                "id": project["id"],
                                "title": project["project_name"],
                                "days": days_until
                            })

                return deadlines

            return []

        except Exception as e:
            logger.error(f"Error getting deadlines: {e}")
            return []

    async def _get_recent_emotional_state(self, user_id: str) -> Dict[str, Any]:
        """Analyze recent emotional state from Journey."""
        try:
            threshold = (datetime.now() - timedelta(days=7)).isoformat()
            result = self.supabase.table("moments") \
                .select("emotion") \
                .eq("user_id", user_id) \
                .gte("created_at", threshold) \
                .execute()

            if not result.data:
                return {"needs_attention": False}

            # Count emotions
            emotion_counts: Dict[str, int] = {}
            for moment in result.data:
                emotion = moment.get("emotion")
                if emotion:
                    emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

            if not emotion_counts:
                return {"needs_attention": False}

            # Find dominant emotion
            dominant = max(emotion_counts.items(), key=lambda x: x[1])

            # Emotions that might need attention
            attention_emotions = ["anxious", "sad", "overwhelmed", "frustrated", "tired"]

            return {
                "needs_attention": dominant[0] in attention_emotions and dominant[1] >= 3,
                "dominant_emotion": dominant[0],
                "count": dominant[1]
            }

        except Exception as e:
            logger.error(f"Error getting emotional state: {e}")
            return {"needs_attention": False}

    async def _get_finance_status(self, user_id: str) -> Dict[str, Any]:
        """Get current month's finance status."""
        try:
            month_start = datetime.now().replace(day=1).isoformat()
            result = self.supabase.table("finance_transactions") \
                .select("type, amount") \
                .eq("user_id", user_id) \
                .gte("transaction_date", month_start) \
                .execute()

            if not result.data:
                return {"budget_pressure": False}

            expenses = sum(
                abs(float(t["amount"]))
                for t in result.data
                if t.get("type") == "expense"
            )
            income = sum(
                abs(float(t["amount"]))
                for t in result.data
                if t.get("type") == "income"
            )

            # Check if expenses are significantly higher than income
            if income > 0:
                expense_ratio = expenses / income
                return {
                    "budget_pressure": expense_ratio > 0.9,
                    "overspend_pct": (expense_ratio - 1) * 100 if expense_ratio > 1 else 0
                }

            return {"budget_pressure": False, "overspend_pct": 0}

        except Exception as e:
            logger.error(f"Error getting finance status: {e}")
            return {"budget_pressure": False}

    def clear_cache(self, user_id: Optional[str] = None) -> None:
        """
        Clear insights cache.

        Args:
            user_id: Specific user to clear, or None to clear all
        """
        if user_id:
            self._insights_cache.pop(user_id, None)
        else:
            self._insights_cache.clear()


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_cross_module_service: Optional[CrossModuleService] = None


def get_cross_module_service() -> CrossModuleService:
    """
    Get singleton instance of CrossModuleService.

    Returns:
        CrossModuleService instance

    Raises:
        ValueError: If required environment variables are not set
    """
    global _cross_module_service

    if _cross_module_service is None:
        _cross_module_service = CrossModuleService()

    return _cross_module_service


# =============================================================================
# HELPER FUNCTIONS FOR ADK INTEGRATION
# =============================================================================

async def get_cross_module_context(user_id: str, current_module: str) -> str:
    """
    Convenience function to get cross-module context for agent injection.

    Args:
        user_id: User UUID
        current_module: Current module context

    Returns:
        Formatted context string
    """
    service = get_cross_module_service()
    return await service.get_context_for_module(user_id, current_module)


async def analyze_user_patterns(user_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """
    Convenience function to analyze cross-module patterns.

    Args:
        user_id: User UUID
        days: Analysis period

    Returns:
        List of insight dictionaries
    """
    service = get_cross_module_service()
    insights = await service.analyze_cross_module_patterns(user_id, days)
    return [insight.to_dict() for insight in insights]
