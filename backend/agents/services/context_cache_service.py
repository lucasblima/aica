"""
Gemini Context Caching Service for ADK Agents

Implements Google Gemini's context caching feature to reduce token costs by
caching user profile data (from user_memory) and system instructions.

Key Features:
- Creates cached content with 1-hour TTL
- Caches user memories (profile, preferences, facts, insights, patterns)
- Caches system instructions for consistent context
- Reduces token costs by up to 90% for repeated context
- Auto-refreshes cache when expired or user profile changes

Requirements:
- Minimum 1024 tokens for Flash, 4096 for Pro models
- TTL in seconds format (e.g., "3600s" for 1 hour)

References:
- https://ai.google.dev/gemini-api/docs/caching
- https://ai.google.dev/api/caching
"""

import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass

# Google Genai SDK
from google import genai
from google.genai import types

# Supabase client for fetching user memories
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Environment configuration
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Cache configuration
DEFAULT_TTL_SECONDS = 3600  # 1 hour
MIN_TOKENS_FLASH = 1024    # Minimum tokens for gemini-2.5-flash
MIN_TOKENS_PRO = 4096      # Minimum tokens for gemini-2.5-pro
CACHE_MODEL = "models/gemini-2.5-flash"  # Must include version suffix


@dataclass
class CacheStats:
    """Statistics about context cache usage."""
    user_id: str
    cache_name: Optional[str]
    cached_tokens: int
    total_tokens_saved: int
    cache_hits: int
    created_at: Optional[datetime]
    expires_at: Optional[datetime]
    is_active: bool
    savings_percentage: float


@dataclass
class CacheMetadata:
    """Metadata for a cached context."""
    cache_name: str
    token_count: int
    created_at: datetime
    expires_at: datetime
    user_id: str
    profile_hash: str  # Hash of user profile to detect changes


class ContextCacheService:
    """
    Service for managing Gemini context caches.

    Implements a per-user caching strategy that:
    1. Loads user memories from Supabase user_memory table
    2. Creates a cached context with user profile + system instruction
    3. Returns cache name for use in generate_content calls
    4. Auto-refreshes when cache expires or profile changes

    Usage:
        service = ContextCacheService()

        # Get or create cache for user
        cache_name = await service.get_or_create_cache(
            user_id="uuid",
            system_instruction="Your instruction...",
            extra_context="Optional additional context"
        )

        # Use cache in generation
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_message,
            config=types.GenerateContentConfig(cached_content=cache_name)
        )
    """

    def __init__(
        self,
        gemini_api_key: str = GEMINI_API_KEY,
        supabase_url: str = SUPABASE_URL,
        supabase_key: str = SUPABASE_SERVICE_KEY,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
    ):
        """
        Initialize ContextCacheService.

        Args:
            gemini_api_key: Gemini API key for cache creation
            supabase_url: Supabase project URL
            supabase_key: Service role key for user_memory access
            ttl_seconds: Cache TTL in seconds (default: 3600 = 1 hour)
        """
        if not gemini_api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable required")

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")

        self.genai_client = genai.Client(api_key=gemini_api_key)
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.ttl_seconds = ttl_seconds

        # In-memory cache metadata (user_id -> CacheMetadata)
        self._cache_metadata: Dict[str, CacheMetadata] = {}

        # Track statistics
        self._stats: Dict[str, Dict[str, Any]] = {}

        logger.info(f"Initialized ContextCacheService with {ttl_seconds}s TTL")

    async def get_or_create_cache(
        self,
        user_id: str,
        system_instruction: str,
        extra_context: Optional[str] = None,
        force_refresh: bool = False,
    ) -> Optional[str]:
        """
        Get existing cache or create new one for user.

        Args:
            user_id: User UUID
            system_instruction: System instruction to cache
            extra_context: Optional additional context to include
            force_refresh: Force cache recreation even if valid cache exists

        Returns:
            Cache name for use in generate_content, or None if caching failed
        """
        try:
            # Check for existing valid cache
            if not force_refresh and user_id in self._cache_metadata:
                metadata = self._cache_metadata[user_id]

                # Check if cache is still valid
                if datetime.now() < metadata.expires_at:
                    # Verify profile hasn't changed
                    current_hash = await self._get_profile_hash(user_id)
                    if current_hash == metadata.profile_hash:
                        # Cache hit
                        self._record_cache_hit(user_id)
                        logger.debug(f"Cache hit for user {user_id[:8]}...")
                        return metadata.cache_name
                    else:
                        logger.info(f"Profile changed for user {user_id[:8]}, refreshing cache")

            # Load user memories
            user_profile = await self._fetch_user_memories(user_id)

            # Format profile as context text
            profile_text = self._format_profile_text(user_profile)

            # Build cache content
            cache_content = self._build_cache_content(
                system_instruction=system_instruction,
                profile_text=profile_text,
                extra_context=extra_context
            )

            # Check minimum token requirement (estimate)
            estimated_tokens = len(cache_content) // 4  # Rough estimate: ~4 chars per token
            if estimated_tokens < MIN_TOKENS_FLASH:
                logger.warning(
                    f"Content too small for caching ({estimated_tokens} tokens estimated, "
                    f"minimum {MIN_TOKENS_FLASH}). Skipping cache creation."
                )
                return None

            # Create cache
            cache = self._create_cache(
                user_id=user_id,
                system_instruction=system_instruction,
                content=cache_content
            )

            if cache:
                # Store metadata
                profile_hash = await self._get_profile_hash(user_id)
                self._cache_metadata[user_id] = CacheMetadata(
                    cache_name=cache.name,
                    token_count=cache.usage_metadata.total_token_count if cache.usage_metadata else 0,
                    created_at=datetime.now(),
                    expires_at=datetime.fromisoformat(cache.expire_time.rstrip('Z')) if cache.expire_time else datetime.now() + timedelta(seconds=self.ttl_seconds),
                    user_id=user_id,
                    profile_hash=profile_hash
                )

                # Initialize stats
                self._stats[user_id] = {
                    "cache_hits": 0,
                    "cached_tokens": cache.usage_metadata.total_token_count if cache.usage_metadata else 0,
                    "total_tokens_saved": 0,
                    "created_at": datetime.now()
                }

                logger.info(
                    f"Created cache for user {user_id[:8]}... "
                    f"({self._stats[user_id]['cached_tokens']} tokens, TTL: {self.ttl_seconds}s)"
                )

                return cache.name

            return None

        except Exception as e:
            logger.error(f"Error creating/retrieving cache for user {user_id[:8]}: {e}")
            return None

    def _create_cache(
        self,
        user_id: str,
        system_instruction: str,
        content: str
    ):
        """
        Create a cached content in Gemini.

        Args:
            user_id: User UUID for display name
            system_instruction: System instruction to cache
            content: Content text to cache

        Returns:
            CachedContent object or None if failed
        """
        try:
            cache = self.genai_client.caches.create(
                model=CACHE_MODEL,
                config=types.CreateCachedContentConfig(
                    display_name=f"aica_user_{user_id[:8]}",
                    system_instruction=system_instruction,
                    contents=[
                        types.Content(
                            role="user",
                            parts=[types.Part(text=content)]
                        )
                    ],
                    ttl=f"{self.ttl_seconds}s"
                )
            )
            return cache
        except Exception as e:
            logger.error(f"Failed to create Gemini cache: {e}")
            return None

    async def _fetch_user_memories(
        self,
        user_id: str,
        limit: int = 50
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch user memories from Supabase user_memory table.

        Args:
            user_id: User UUID
            limit: Maximum memories to fetch

        Returns:
            Dictionary grouped by category: {category: [memories]}
        """
        try:
            result = self.supabase.table("user_memory") \
                .select("category, module, key, value, confidence, source") \
                .eq("user_id", user_id) \
                .gte("confidence", 0.5)  # Only include memories with decent confidence \
                .order("confidence", desc=True) \
                .limit(limit) \
                .execute()

            # Group by category
            grouped: Dict[str, List[Dict[str, Any]]] = {}
            for memory in (result.data or []):
                category = memory.get("category", "other")
                if category not in grouped:
                    grouped[category] = []
                grouped[category].append(memory)

            logger.debug(f"Fetched {len(result.data or [])} memories for user {user_id[:8]}")
            return grouped

        except Exception as e:
            logger.error(f"Error fetching user memories: {e}")
            return {}

    def _format_profile_text(self, profile: Dict[str, List[Dict[str, Any]]]) -> str:
        """
        Format user memories into readable context text.

        Args:
            profile: Dictionary of memories grouped by category

        Returns:
            Formatted text for caching
        """
        if not profile:
            return "PERFIL DO USUARIO:\nNenhuma informacao de perfil disponivel ainda."

        sections = ["PERFIL DO USUARIO:"]

        # Define category order and labels
        category_labels = {
            "profile": "Informacoes Pessoais",
            "preference": "Preferencias",
            "fact": "Fatos Conhecidos",
            "insight": "Insights",
            "pattern": "Padroes de Comportamento"
        }

        for category, label in category_labels.items():
            if category in profile and profile[category]:
                sections.append(f"\n## {label.upper()}")

                for memory in profile[category]:
                    key = memory.get("key", "unknown")
                    value = memory.get("value", {})
                    module = memory.get("module")
                    confidence = memory.get("confidence", 0)

                    # Format value
                    if isinstance(value, dict):
                        value_str = ", ".join(f"{k}: {v}" for k, v in value.items())
                    else:
                        value_str = str(value)

                    # Include module context if available
                    module_suffix = f" [{module}]" if module else ""
                    confidence_indicator = "*" if confidence >= 0.9 else ""

                    sections.append(f"- {key}{confidence_indicator}: {value_str}{module_suffix}")

        return "\n".join(sections)

    def _build_cache_content(
        self,
        system_instruction: str,
        profile_text: str,
        extra_context: Optional[str] = None
    ) -> str:
        """
        Build the complete content to cache.

        Args:
            system_instruction: System instruction (already handled separately)
            profile_text: Formatted user profile
            extra_context: Optional additional context

        Returns:
            Combined content string
        """
        parts = [
            profile_text,
            "",
            "---",
            "Use as informacoes acima para personalizar suas respostas.",
            "Respeite as preferencias do usuario e aplique os insights conhecidos."
        ]

        if extra_context:
            parts.extend([
                "",
                "CONTEXTO ADICIONAL:",
                extra_context
            ])

        return "\n".join(parts)

    async def _get_profile_hash(self, user_id: str) -> str:
        """
        Generate a hash of user profile for change detection.

        Args:
            user_id: User UUID

        Returns:
            Hash string representing current profile state
        """
        import hashlib

        try:
            result = self.supabase.table("user_memory") \
                .select("key, value, updated_at") \
                .eq("user_id", user_id) \
                .order("updated_at", desc=True) \
                .limit(10) \
                .execute()

            # Create hash from key fields
            content = str(result.data or [])
            return hashlib.md5(content.encode()).hexdigest()[:16]

        except Exception:
            return "unknown"

    def _record_cache_hit(self, user_id: str) -> None:
        """Record a cache hit for statistics."""
        if user_id in self._stats:
            self._stats[user_id]["cache_hits"] += 1
            # Estimate tokens saved (cached_tokens * 0.75 discount)
            cached_tokens = self._stats[user_id]["cached_tokens"]
            self._stats[user_id]["total_tokens_saved"] += int(cached_tokens * 0.75)

    def get_cache_stats(self, user_id: str) -> CacheStats:
        """
        Get cache statistics for a user.

        Args:
            user_id: User UUID

        Returns:
            CacheStats object with usage information
        """
        if user_id not in self._cache_metadata:
            return CacheStats(
                user_id=user_id,
                cache_name=None,
                cached_tokens=0,
                total_tokens_saved=0,
                cache_hits=0,
                created_at=None,
                expires_at=None,
                is_active=False,
                savings_percentage=0.0
            )

        metadata = self._cache_metadata[user_id]
        stats = self._stats.get(user_id, {})

        cached_tokens = stats.get("cached_tokens", 0)
        total_saved = stats.get("total_tokens_saved", 0)
        cache_hits = stats.get("cache_hits", 0)

        # Calculate savings percentage
        total_potential = cached_tokens * (cache_hits + 1)
        savings_pct = (total_saved / total_potential * 100) if total_potential > 0 else 0

        return CacheStats(
            user_id=user_id,
            cache_name=metadata.cache_name,
            cached_tokens=cached_tokens,
            total_tokens_saved=total_saved,
            cache_hits=cache_hits,
            created_at=metadata.created_at,
            expires_at=metadata.expires_at,
            is_active=datetime.now() < metadata.expires_at,
            savings_percentage=savings_pct
        )

    async def invalidate_cache(self, user_id: str) -> bool:
        """
        Invalidate/delete cache for a user.

        Args:
            user_id: User UUID

        Returns:
            True if cache was invalidated, False otherwise
        """
        if user_id in self._cache_metadata:
            metadata = self._cache_metadata[user_id]

            try:
                # Delete from Gemini
                self.genai_client.caches.delete(name=metadata.cache_name)
                logger.info(f"Deleted cache {metadata.cache_name} for user {user_id[:8]}")
            except Exception as e:
                logger.warning(f"Failed to delete Gemini cache: {e}")

            # Clear local metadata
            del self._cache_metadata[user_id]
            if user_id in self._stats:
                del self._stats[user_id]

            return True

        return False

    async def refresh_cache(
        self,
        user_id: str,
        system_instruction: str,
        extra_context: Optional[str] = None
    ) -> Optional[str]:
        """
        Force refresh the cache for a user.

        Args:
            user_id: User UUID
            system_instruction: System instruction
            extra_context: Optional additional context

        Returns:
            New cache name or None
        """
        # Invalidate existing cache
        await self.invalidate_cache(user_id)

        # Create new cache
        return await self.get_or_create_cache(
            user_id=user_id,
            system_instruction=system_instruction,
            extra_context=extra_context,
            force_refresh=True
        )

    def list_active_caches(self) -> List[CacheStats]:
        """
        List all active caches.

        Returns:
            List of CacheStats for all active caches
        """
        now = datetime.now()
        return [
            self.get_cache_stats(user_id)
            for user_id, metadata in self._cache_metadata.items()
            if now < metadata.expires_at
        ]


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_cache_service: Optional[ContextCacheService] = None


def get_context_cache_service() -> ContextCacheService:
    """
    Get singleton instance of ContextCacheService.

    Returns:
        ContextCacheService instance

    Raises:
        ValueError: If required environment variables are not set
    """
    global _cache_service

    if _cache_service is None:
        _cache_service = ContextCacheService()

    return _cache_service


# =============================================================================
# HELPER FUNCTIONS FOR ADK TOOLS
# =============================================================================

async def get_cache_for_user(
    user_id: str,
    system_instruction: str
) -> Optional[str]:
    """
    Convenience function to get or create cache for a user.

    Args:
        user_id: User UUID
        system_instruction: System instruction to cache

    Returns:
        Cache name or None
    """
    service = get_context_cache_service()
    return await service.get_or_create_cache(
        user_id=user_id,
        system_instruction=system_instruction
    )


def get_user_cache_stats(user_id: str) -> Dict[str, Any]:
    """
    Get cache statistics for a user as a dictionary.

    Args:
        user_id: User UUID

    Returns:
        Dictionary with cache statistics
    """
    try:
        service = get_context_cache_service()
        stats = service.get_cache_stats(user_id)

        return {
            "status": "success",
            "user_id": stats.user_id,
            "cache_name": stats.cache_name,
            "cached_tokens": stats.cached_tokens,
            "total_tokens_saved": stats.total_tokens_saved,
            "cache_hits": stats.cache_hits,
            "created_at": stats.created_at.isoformat() if stats.created_at else None,
            "expires_at": stats.expires_at.isoformat() if stats.expires_at else None,
            "is_active": stats.is_active,
            "savings_percentage": round(stats.savings_percentage, 2),
            "estimated_cost_savings_usd": round(stats.total_tokens_saved * 0.000001, 4)  # Rough estimate
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to get cache stats: {str(e)}"
        }
