"""
ADK Agent Services

Custom service implementations for AICA Life OS agents.
"""

from .supabase_session_service import SupabaseSessionService
from .context_cache_service import (
    ContextCacheService,
    get_context_cache_service,
    get_cache_for_user,
    get_user_cache_stats,
    CacheStats,
)
from .file_search_service import (
    FileSearchService,
    get_file_search_service,
    FileSearchResult,
    UploadResult,
    StoreInfo,
)
from .personalization_service import (
    PersonalizationService,
    PersonalizationPhase,
    QuestionStrategy,
    InteractionStats,
    UserPersonalizationContext,
    get_personalization_service,
    get_personalized_instruction,
    get_user_phase,
    get_question_strategy_dict,
)
from .fact_extraction_service import (
    FactExtractionService,
    get_fact_extraction_service,
    extract_facts_callback,
    ExtractionResult,
    ExtractedFact,
)
from .cross_module_service import (
    CrossModuleService,
    CrossModuleInsight,
    CrossModuleAlert,
    get_cross_module_service,
    get_cross_module_context,
    analyze_user_patterns,
)

__all__ = [
    "SupabaseSessionService",
    "ContextCacheService",
    "get_context_cache_service",
    "get_cache_for_user",
    "get_user_cache_stats",
    "CacheStats",
    # File Search RAG Service (Task #41)
    "FileSearchService",
    "get_file_search_service",
    "FileSearchResult",
    "UploadResult",
    "StoreInfo",
    # Personalization Service (Task #39)
    "PersonalizationService",
    "PersonalizationPhase",
    "QuestionStrategy",
    "InteractionStats",
    "UserPersonalizationContext",
    "get_personalization_service",
    "get_personalized_instruction",
    "get_user_phase",
    "get_question_strategy_dict",
    # Fact Extraction Service (Task #38)
    "FactExtractionService",
    "get_fact_extraction_service",
    "extract_facts_callback",
    "ExtractionResult",
    "ExtractedFact",
    # Cross-Module Intelligence Service (Task #40)
    "CrossModuleService",
    "CrossModuleInsight",
    "CrossModuleAlert",
    "get_cross_module_service",
    "get_cross_module_context",
    "analyze_user_patterns",
]
