"""
Personalization Service for ADK Agents

Implements progressive personalization that evolves with user interaction history.
Based on the 3-phase personalization model:
  1. Cold Start (<10 interactions): Generic questions, interest discovery
  2. Warm-up (10-50 interactions): History references, pattern identification
  3. Mature (50+ interactions): Deep cross-theme connections, need anticipation

Features:
  - Determines user's personalization phase
  - Generates personalized prompt context for agents
  - Provides question strategies based on relationship maturity
  - Tracks interaction metrics in user_memory

References:
  - Task #39: Progressive Personalization
  - CLAUDE.md: User Memory System (Task #35)
"""

import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

# Supabase client for data access
from supabase import create_client, Client

# Google Genai SDK for embeddings and analysis
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Environment configuration
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Personalization thresholds
COLD_START_THRESHOLD = 10  # Less than 10 interactions
WARM_UP_THRESHOLD = 50     # Between 10-50 interactions
MIN_RESPONSE_DEPTH = 0.5   # Minimum depth score to exit warm-up


class PersonalizationPhase(Enum):
    """User's personalization phase based on interaction history."""
    COLD_START = "cold_start"
    WARM_UP = "warm_up"
    MATURE = "mature"


@dataclass
class QuestionStrategy:
    """Strategy for generating personalized questions.

    Attributes:
        depth: Question depth level - "surface", "exploratory", or "challenging"
        reference_history: Whether to reference conversation history
        connect_themes: Whether to connect themes across life areas
        goal: Primary goal - "build_engagement", "discover_patterns", or "promote_growth"
        suggested_topics: List of topics to explore
    """
    depth: str  # "surface", "exploratory", "challenging"
    reference_history: bool
    connect_themes: bool
    goal: str  # "build_engagement", "discover_patterns", "promote_growth"
    suggested_topics: List[str] = field(default_factory=list)


@dataclass
class InteractionStats:
    """Statistics about user interactions.

    Attributes:
        total_interactions: Total number of recorded interactions
        avg_response_length: Average length of user responses
        response_depth_score: Score 0-1 indicating response depth/quality
        days_active: Number of distinct days with activity
        last_interaction: Timestamp of last interaction
    """
    total_interactions: int
    avg_response_length: float
    response_depth_score: float
    days_active: int
    last_interaction: Optional[datetime]


@dataclass
class UserPersonalizationContext:
    """Complete personalization context for a user.

    Attributes:
        user_id: User UUID
        phase: Current personalization phase
        strategy: Question strategy for this phase
        stats: Interaction statistics
        key_memories: Most relevant memories for personalization
        recurring_themes: Themes that appear frequently
        growth_opportunities: Areas identified for growth
    """
    user_id: str
    phase: PersonalizationPhase
    strategy: QuestionStrategy
    stats: InteractionStats
    key_memories: List[Dict[str, Any]] = field(default_factory=list)
    recurring_themes: List[str] = field(default_factory=list)
    growth_opportunities: List[str] = field(default_factory=list)


class PersonalizationService:
    """
    Service for managing progressive personalization.

    Implements a 3-phase personalization model that adapts agent behavior
    based on the maturity of the relationship with the user.

    Phase 1 - Cold Start (<10 interactions):
        - Generic exploratory questions
        - Focus on discovering interests
        - Build initial engagement

    Phase 2 - Warm-up (10-50 interactions):
        - Reference conversation history
        - Identify recurring patterns
        - Start connecting themes

    Phase 3 - Mature (50+ interactions):
        - Deep cross-theme connections
        - Anticipate user needs
        - Promote personal growth

    Usage:
        service = PersonalizationService()

        # Get user's current phase
        phase = await service.get_user_phase(user_id)

        # Get question strategy
        strategy = await service.get_question_strategy(user_id)

        # Generate personalized prompt context
        context = await service.generate_personalized_prompt_context(user_id)
    """

    def __init__(
        self,
        supabase_url: str = SUPABASE_URL,
        supabase_key: str = SUPABASE_SERVICE_KEY,
        gemini_api_key: str = GEMINI_API_KEY,
    ):
        """
        Initialize PersonalizationService.

        Args:
            supabase_url: Supabase project URL
            supabase_key: Service role key for database access
            gemini_api_key: Gemini API key for AI analysis
        """
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")

        self.supabase: Client = create_client(supabase_url, supabase_key)

        # Initialize Gemini client if API key available (optional for basic operations)
        self.genai_client = None
        if gemini_api_key:
            self.genai_client = genai.Client(api_key=gemini_api_key)

        logger.info("Initialized PersonalizationService")

    # =========================================================================
    # Phase Determination
    # =========================================================================

    async def get_user_phase(self, user_id: str) -> PersonalizationPhase:
        """
        Determine the user's current personalization phase.

        Phase is determined by:
        1. Total interaction count
        2. Response depth quality score

        Args:
            user_id: User UUID

        Returns:
            PersonalizationPhase enum value
        """
        stats = await self._get_interaction_stats(user_id)

        # Cold Start: Less than 10 interactions
        if stats.total_interactions < COLD_START_THRESHOLD:
            return PersonalizationPhase.COLD_START

        # Check if user qualifies for mature phase
        # Requires 50+ interactions AND sufficient response depth
        if stats.total_interactions >= WARM_UP_THRESHOLD and stats.response_depth_score >= MIN_RESPONSE_DEPTH:
            return PersonalizationPhase.MATURE

        # Default to Warm-up phase
        return PersonalizationPhase.WARM_UP

    async def _get_interaction_stats(self, user_id: str) -> InteractionStats:
        """
        Calculate interaction statistics for a user.

        Aggregates data from:
        - moments table (Journey reflections)
        - agent_sessions table (agent conversations)
        - user_memory table (stored interaction patterns)

        Args:
            user_id: User UUID

        Returns:
            InteractionStats with aggregated metrics
        """
        try:
            # Count moments (reflections in Journey module)
            moments_result = self.supabase.table("moments") \
                .select("id, content, created_at", count="exact") \
                .eq("user_id", user_id) \
                .execute()

            moments_count = moments_result.count or 0
            moments = moments_result.data or []

            # Count agent sessions with messages
            sessions_result = self.supabase.table("agent_sessions") \
                .select("messages, updated_at") \
                .eq("user_id", user_id) \
                .execute()

            session_messages = 0
            for session in (sessions_result.data or []):
                messages = session.get("messages", [])
                if isinstance(messages, list):
                    # Count user messages only
                    session_messages += sum(
                        1 for m in messages
                        if isinstance(m, dict) and m.get("role") == "user"
                    )

            # Calculate total interactions
            total_interactions = moments_count + session_messages

            # Calculate average response length from moments
            avg_length = 0.0
            if moments:
                total_length = sum(
                    len(m.get("content", ""))
                    for m in moments
                    if m.get("content")
                )
                avg_length = total_length / len(moments) if moments else 0

            # Calculate response depth score
            response_depth = await self._calculate_response_depth(
                user_id, moments, avg_length
            )

            # Count distinct active days
            distinct_days = set()
            for moment in moments:
                if moment.get("created_at"):
                    date_str = moment["created_at"][:10]  # Extract YYYY-MM-DD
                    distinct_days.add(date_str)

            # Get last interaction timestamp
            last_interaction = None
            if moments:
                timestamps = [
                    m.get("created_at") for m in moments
                    if m.get("created_at")
                ]
                if timestamps:
                    last_interaction = datetime.fromisoformat(
                        max(timestamps).replace('Z', '+00:00')
                    )

            return InteractionStats(
                total_interactions=total_interactions,
                avg_response_length=avg_length,
                response_depth_score=response_depth,
                days_active=len(distinct_days),
                last_interaction=last_interaction
            )

        except Exception as e:
            logger.error(f"Error getting interaction stats for user {user_id[:8]}: {e}")
            return InteractionStats(
                total_interactions=0,
                avg_response_length=0.0,
                response_depth_score=0.0,
                days_active=0,
                last_interaction=None
            )

    async def _calculate_response_depth(
        self,
        user_id: str,
        moments: List[Dict[str, Any]],
        avg_length: float
    ) -> float:
        """
        Calculate response depth score (0-1) based on response quality.

        Factors considered:
        - Average response length (longer = deeper reflection)
        - Presence of emotions in moments
        - Use of tags/categorization
        - Consistency over time

        Args:
            user_id: User UUID
            moments: List of moment records
            avg_length: Average response length

        Returns:
            Score from 0.0 to 1.0
        """
        if not moments:
            return 0.0

        scores = []

        # Factor 1: Response length (0-50 chars = 0, 50-200 = linear, 200+ = 1.0)
        length_score = min(1.0, max(0.0, (avg_length - 50) / 150))
        scores.append(length_score)

        # Factor 2: Emotion annotation rate
        moments_with_emotion = sum(
            1 for m in moments if m.get("emotion")
        )
        emotion_score = moments_with_emotion / len(moments) if moments else 0
        scores.append(emotion_score)

        # Factor 3: Tag usage rate
        moments_with_tags = sum(
            1 for m in moments
            if m.get("tags") and len(m.get("tags", [])) > 0
        )
        tag_score = moments_with_tags / len(moments) if moments else 0
        scores.append(tag_score)

        # Factor 4: Check for stored patterns in user_memory
        try:
            patterns_result = self.supabase.table("user_memory") \
                .select("id", count="exact") \
                .eq("user_id", user_id) \
                .eq("category", "pattern") \
                .gte("confidence", 0.7) \
                .execute()

            pattern_count = patterns_result.count or 0
            # Scale: 0 patterns = 0, 5+ patterns = 1.0
            pattern_score = min(1.0, pattern_count / 5)
            scores.append(pattern_score)
        except Exception:
            scores.append(0.0)

        # Weighted average
        weights = [0.3, 0.25, 0.2, 0.25]  # length, emotion, tags, patterns
        weighted_score = sum(s * w for s, w in zip(scores, weights))

        return round(weighted_score, 2)

    # =========================================================================
    # Question Strategy
    # =========================================================================

    async def get_question_strategy(self, user_id: str) -> QuestionStrategy:
        """
        Get the question strategy for a user based on their phase.

        Returns a strategy with:
        - Appropriate question depth
        - Whether to reference history
        - Whether to connect themes
        - Primary goal
        - Suggested topics to explore

        Args:
            user_id: User UUID

        Returns:
            QuestionStrategy for the user's current phase
        """
        phase = await self.get_user_phase(user_id)
        memories = await self._get_relevant_memories(user_id)

        if phase == PersonalizationPhase.COLD_START:
            return QuestionStrategy(
                depth="surface",
                reference_history=False,
                connect_themes=False,
                goal="build_engagement",
                suggested_topics=self._get_cold_start_topics()
            )

        elif phase == PersonalizationPhase.WARM_UP:
            recurring_themes = await self._extract_recurring_themes(user_id, memories)
            return QuestionStrategy(
                depth="exploratory",
                reference_history=True,
                connect_themes=False,
                goal="discover_patterns",
                suggested_topics=recurring_themes or self._get_warm_up_topics()
            )

        else:  # MATURE
            growth_topics = await self._generate_growth_topics(user_id, memories)
            return QuestionStrategy(
                depth="challenging",
                reference_history=True,
                connect_themes=True,
                goal="promote_growth",
                suggested_topics=growth_topics
            )

    def _get_cold_start_topics(self) -> List[str]:
        """Get default topics for cold start phase."""
        return [
            "interesses pessoais",
            "rotina diaria",
            "objetivos gerais",
            "valores importantes",
            "fontes de energia",
            "desafios atuais"
        ]

    def _get_warm_up_topics(self) -> List[str]:
        """Get default topics for warm-up phase."""
        return [
            "padroes de comportamento",
            "momentos de realizacao",
            "relacionamentos importantes",
            "aprendizados recentes",
            "fontes de estresse"
        ]

    async def _extract_recurring_themes(
        self,
        user_id: str,
        memories: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Extract recurring themes from user's history.

        Analyzes:
        - Tags from moments
        - Keys from user_memory patterns
        - Emotion patterns

        Args:
            user_id: User UUID
            memories: User's stored memories

        Returns:
            List of recurring theme strings
        """
        themes = []

        # Extract themes from memories
        for memory in memories:
            key = memory.get("key", "")
            if key and key not in themes:
                # Convert key to readable theme
                readable_key = key.replace("_", " ").replace("-", " ")
                themes.append(readable_key)

        # Get frequent tags from moments
        try:
            moments_result = self.supabase.table("moments") \
                .select("tags, emotion") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .limit(30) \
                .execute()

            tag_counts: Dict[str, int] = {}
            emotion_counts: Dict[str, int] = {}

            for moment in (moments_result.data or []):
                # Count tags
                for tag in (moment.get("tags") or []):
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

                # Count emotions
                emotion = moment.get("emotion")
                if emotion:
                    emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

            # Add top 3 tags as themes
            sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
            for tag, _ in sorted_tags[:3]:
                if tag not in themes:
                    themes.append(tag)

            # Add dominant emotion pattern
            if emotion_counts:
                top_emotion = max(emotion_counts.items(), key=lambda x: x[1])[0]
                emotion_theme = f"emocao: {top_emotion}"
                if emotion_theme not in themes:
                    themes.append(emotion_theme)

        except Exception as e:
            logger.warning(f"Error extracting themes: {e}")

        return themes[:8]  # Limit to 8 themes

    async def _generate_growth_topics(
        self,
        user_id: str,
        memories: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate growth-oriented topics for mature phase.

        Identifies areas where user can grow based on:
        - Patterns of struggle or challenge
        - Cross-module connections
        - Underexplored areas

        Args:
            user_id: User UUID
            memories: User's stored memories

        Returns:
            List of growth topic suggestions
        """
        topics = []

        # Look for insights and patterns that suggest growth areas
        insights = [m for m in memories if m.get("category") == "insight"]
        patterns = [m for m in memories if m.get("category") == "pattern"]

        # Extract growth areas from insights
        for insight in insights:
            value = insight.get("value", {})
            if isinstance(value, dict):
                finding = value.get("finding", "")
                if finding and len(topics) < 3:
                    topics.append(f"explorar: {finding[:50]}")

        # Identify cross-module connections
        modules_used = set()
        for memory in memories:
            module = memory.get("module")
            if module:
                modules_used.add(module)

        # Suggest connecting underused modules
        all_modules = {"atlas", "journey", "studio", "captacao", "finance", "connections"}
        unused_modules = all_modules - modules_used

        module_suggestions = {
            "atlas": "produtividade e organizacao",
            "journey": "autoconhecimento e reflexao",
            "studio": "criacao de conteudo",
            "captacao": "oportunidades de financiamento",
            "finance": "saude financeira",
            "connections": "relacionamentos e networking"
        }

        for module in list(unused_modules)[:2]:
            if module in module_suggestions:
                topics.append(f"descobrir: {module_suggestions[module]}")

        # Add challenge-based topics from patterns
        for pattern in patterns:
            key = pattern.get("key", "")
            if "challenge" in key or "struggle" in key or "difficulty" in key:
                readable = key.replace("_", " ").replace("-", " ")
                topics.append(f"superar: {readable}")

        # Default growth topics if none found
        if not topics:
            topics = [
                "conexoes entre diferentes areas da vida",
                "padroes de sucesso pessoal",
                "valores e proposito",
                "equilibrio vida-trabalho",
                "proximos desafios de crescimento"
            ]

        return topics[:6]  # Limit to 6 topics

    # =========================================================================
    # Prompt Context Generation
    # =========================================================================

    async def generate_personalized_prompt_context(self, user_id: str) -> str:
        """
        Generate personalized context to inject into agent prompts.

        Creates a formatted string with:
        - Current personalization phase
        - Question strategy
        - Key user memories
        - Phase-specific guidelines

        Args:
            user_id: User UUID

        Returns:
            Formatted context string for prompt injection
        """
        phase = await self.get_user_phase(user_id)
        strategy = await self.get_question_strategy(user_id)
        memories = await self._get_key_memories(user_id)

        # Build context sections
        sections = [
            f"## Nivel de Personalizacao: {phase.value}",
            f"## Estrategia: {strategy.goal}",
            f"## Profundidade de Perguntas: {strategy.depth}",
            ""
        ]

        # Add user context if available
        if memories:
            sections.append("### Contexto do Usuario:")
            sections.append(self._format_memories_for_prompt(memories))
            sections.append("")

        # Add phase-specific guidelines
        sections.append("### Orientacoes para esta Fase:")
        sections.extend(self._get_phase_guidelines(phase, strategy))

        return "\n".join(sections)

    async def _get_relevant_memories(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Fetch relevant memories for personalization.

        Prioritizes:
        - High confidence memories
        - Recently accessed memories
        - Patterns and insights

        Args:
            user_id: User UUID
            limit: Maximum memories to fetch

        Returns:
            List of memory records
        """
        try:
            result = self.supabase.table("user_memory") \
                .select("category, module, key, value, confidence, source, last_accessed_at") \
                .eq("user_id", user_id) \
                .gte("confidence", 0.5) \
                .order("confidence", desc=True) \
                .order("last_accessed_at", desc=True) \
                .limit(limit) \
                .execute()

            return result.data or []

        except Exception as e:
            logger.error(f"Error fetching memories: {e}")
            return []

    async def _get_key_memories(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetch key memories for prompt context.

        Focuses on high-value memories:
        - Profile information
        - Strong preferences
        - High-confidence patterns

        Args:
            user_id: User UUID
            limit: Maximum memories to fetch

        Returns:
            List of key memory records
        """
        try:
            result = self.supabase.table("user_memory") \
                .select("category, module, key, value, confidence") \
                .eq("user_id", user_id) \
                .gte("confidence", 0.7) \
                .in_("category", ["profile", "preference", "pattern"]) \
                .order("confidence", desc=True) \
                .limit(limit) \
                .execute()

            return result.data or []

        except Exception as e:
            logger.error(f"Error fetching key memories: {e}")
            return []

    def _format_memories_for_prompt(self, memories: List[Dict[str, Any]]) -> str:
        """
        Format memories into readable prompt context.

        Args:
            memories: List of memory records

        Returns:
            Formatted string for prompt injection
        """
        if not memories:
            return "Nenhum contexto disponivel ainda."

        lines = []

        for memory in memories:
            key = memory.get("key", "").replace("_", " ")
            value = memory.get("value", {})
            confidence = memory.get("confidence", 0)
            module = memory.get("module")

            # Format value
            if isinstance(value, dict):
                value_str = ", ".join(f"{k}: {v}" for k, v in value.items())
            else:
                value_str = str(value)

            # Build line with confidence indicator
            confidence_marker = "*" if confidence >= 0.9 else ""
            module_marker = f" [{module}]" if module else ""

            lines.append(f"- {key}{confidence_marker}: {value_str}{module_marker}")

        return "\n".join(lines)

    def _get_phase_guidelines(
        self,
        phase: PersonalizationPhase,
        strategy: QuestionStrategy
    ) -> List[str]:
        """
        Get phase-specific guidelines for agent behavior.

        Args:
            phase: Current personalization phase
            strategy: Current question strategy

        Returns:
            List of guideline strings
        """
        guidelines = []

        if phase == PersonalizationPhase.COLD_START:
            guidelines = [
                "- Faca perguntas exploratorias para conhecer o usuario",
                "- Evite assumir informacoes nao confirmadas",
                "- Seja acolhedor e construa confianca",
                "- Valide respostas e mostre interesse genuino",
                f"- Topicos sugeridos: {', '.join(strategy.suggested_topics[:3])}"
            ]

        elif phase == PersonalizationPhase.WARM_UP:
            guidelines = [
                "- Referencie conversas anteriores quando relevante",
                "- Identifique e mencione padroes que voce observou",
                "- Aprofunde em temas que o usuario demonstrou interesse",
                "- Comece a fazer conexoes entre diferentes momentos",
                f"- Temas recorrentes: {', '.join(strategy.suggested_topics[:3])}"
            ]

        else:  # MATURE
            guidelines = [
                "- Faca perguntas desafiadoras que promovam crescimento",
                "- Conecte temas de diferentes areas da vida",
                "- Antecipe necessidades baseado em padroes conhecidos",
                "- Use insights para personalizar profundamente",
                "- Sugira proximos passos concretos de desenvolvimento",
                f"- Areas de crescimento: {', '.join(strategy.suggested_topics[:3])}"
            ]

        return guidelines

    # =========================================================================
    # Stats Tracking
    # =========================================================================

    async def record_interaction(
        self,
        user_id: str,
        interaction_type: str = "message",
        response_length: int = 0
    ) -> None:
        """
        Record an interaction for stats tracking.

        Updates the interaction_stats memory in user_memory table.

        Args:
            user_id: User UUID
            interaction_type: Type of interaction ("message", "reflection", etc.)
            response_length: Length of user's response in characters
        """
        try:
            import json

            # Get existing stats from user_memory
            result = self.supabase.table("user_memory") \
                .select("id, value") \
                .eq("user_id", user_id) \
                .eq("category", "pattern") \
                .eq("key", "interaction_stats") \
                .maybe_single() \
                .execute()

            existing = result.data

            if existing:
                # Update existing stats
                stats = existing.get("value", {})
                if isinstance(stats, str):
                    stats = json.loads(stats)

                stats["total_interactions"] = stats.get("total_interactions", 0) + 1

                # Update rolling average response length
                prev_avg = stats.get("avg_response_length", 0)
                prev_count = stats.get("total_interactions", 1) - 1
                if prev_count > 0 and response_length > 0:
                    new_avg = ((prev_avg * prev_count) + response_length) / stats["total_interactions"]
                    stats["avg_response_length"] = round(new_avg, 1)

                stats["last_updated"] = datetime.now().isoformat()

                self.supabase.table("user_memory") \
                    .update({"value": json.dumps(stats)}) \
                    .eq("id", existing["id"]) \
                    .execute()

            else:
                # Create new stats record
                stats = {
                    "total_interactions": 1,
                    "avg_response_length": response_length,
                    "response_depth_score": 0.0,
                    "last_updated": datetime.now().isoformat()
                }

                self.supabase.table("user_memory") \
                    .insert({
                        "user_id": user_id,
                        "category": "pattern",
                        "key": "interaction_stats",
                        "value": json.dumps(stats),
                        "source": "observed",
                        "confidence": 1.0
                    }) \
                    .execute()

        except Exception as e:
            logger.error(f"Error recording interaction: {e}")

    async def get_personalization_context(self, user_id: str) -> UserPersonalizationContext:
        """
        Get complete personalization context for a user.

        Provides all data needed for fully personalized interactions.

        Args:
            user_id: User UUID

        Returns:
            UserPersonalizationContext with all personalization data
        """
        phase = await self.get_user_phase(user_id)
        strategy = await self.get_question_strategy(user_id)
        stats = await self._get_interaction_stats(user_id)
        memories = await self._get_relevant_memories(user_id)
        recurring_themes = await self._extract_recurring_themes(user_id, memories)
        growth_opportunities = await self._generate_growth_topics(user_id, memories)

        return UserPersonalizationContext(
            user_id=user_id,
            phase=phase,
            strategy=strategy,
            stats=stats,
            key_memories=memories[:10],
            recurring_themes=recurring_themes,
            growth_opportunities=growth_opportunities
        )


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_personalization_service: Optional[PersonalizationService] = None


def get_personalization_service() -> PersonalizationService:
    """
    Get singleton instance of PersonalizationService.

    Returns:
        PersonalizationService instance

    Raises:
        ValueError: If required environment variables are not set
    """
    global _personalization_service

    if _personalization_service is None:
        _personalization_service = PersonalizationService()

    return _personalization_service


# =============================================================================
# HELPER FUNCTIONS FOR ADK INTEGRATION
# =============================================================================


async def get_personalized_instruction(
    user_id: str,
    base_instruction: str
) -> str:
    """
    Add personalization context to a base instruction.

    Use this to inject personalization into any agent's system instruction.

    Args:
        user_id: User UUID
        base_instruction: Original system instruction

    Returns:
        Enhanced instruction with personalization context

    Example:
        personalized = await get_personalized_instruction(
            user_id="uuid",
            base_instruction=JOURNEY_INSTRUCTION
        )
    """
    service = get_personalization_service()
    context = await service.generate_personalized_prompt_context(user_id)

    return f"{base_instruction}\n\n{context}"


async def get_user_phase(user_id: str) -> str:
    """
    Get user's personalization phase as a string.

    Args:
        user_id: User UUID

    Returns:
        Phase name: "cold_start", "warm_up", or "mature"
    """
    service = get_personalization_service()
    phase = await service.get_user_phase(user_id)
    return phase.value


async def get_question_strategy_dict(user_id: str) -> Dict[str, Any]:
    """
    Get question strategy as a dictionary.

    Args:
        user_id: User UUID

    Returns:
        Dictionary with strategy details
    """
    service = get_personalization_service()
    strategy = await service.get_question_strategy(user_id)

    return {
        "depth": strategy.depth,
        "reference_history": strategy.reference_history,
        "connect_themes": strategy.connect_themes,
        "goal": strategy.goal,
        "suggested_topics": strategy.suggested_topics
    }
