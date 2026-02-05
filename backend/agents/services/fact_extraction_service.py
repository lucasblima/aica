"""
Fact Extraction Service for ADK Agents (Mem0-style)

Automatically extracts facts about the user from conversations and manages
them in the user_memory table. Uses semantic comparison to detect duplicates
and contradictions, executing ADD, UPDATE, or DELETE operations as needed.

Key Features:
- Analyzes conversations to extract user facts, preferences, patterns
- Compares semantically with existing memories
- Supports explicit extraction (user stated) and inferred extraction
- Generates embeddings for semantic similarity matching
- Rate-limited and cost-optimized (uses gemini-2.5-flash)

Usage:
    service = FactExtractionService()

    # Extract facts from a conversation
    result = await service.extract_facts(
        conversation=messages,
        user_id="uuid"
    )

    # Result contains: {"added": 2, "updated": 1, "deleted": 0}

References:
- Mem0 architecture: https://github.com/mem0ai/mem0
- Task #38: Fact Extraction (Mem0-like)
"""

import os
import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime

# Google Genai SDK
from google import genai
from google.genai import types

# Supabase client for memory operations
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Environment configuration
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Model configuration
EXTRACTION_MODEL = "gemini-2.5-flash"
EMBEDDING_MODEL = "text-embedding-004"

# Extraction configuration
MIN_CONFIDENCE = 0.7  # Minimum confidence to store a fact
MIN_CONVERSATION_TURNS = 4  # Minimum messages to trigger extraction
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # Exponential backoff seconds
SIMILARITY_THRESHOLD = 0.85  # Threshold for semantic deduplication


@dataclass
class ExtractionResult:
    """Result from fact extraction operation."""
    added: int
    updated: int
    deleted: int
    facts_processed: int
    errors: List[str]


@dataclass
class ExtractedFact:
    """A fact extracted from conversation."""
    category: str  # 'fact', 'preference', 'pattern', 'insight', 'profile'
    key: str
    value: Dict[str, Any]
    confidence: float
    module: Optional[str]
    source: str  # 'explicit' or 'inferred'
    reason: Optional[str] = None


@dataclass
class FactAction:
    """Action to perform on a memory."""
    action: str  # 'add', 'update', 'delete'
    fact: Optional[ExtractedFact] = None
    memory_id: Optional[str] = None
    reason: Optional[str] = None


# Extraction prompt - instructs the model to analyze conversations
EXTRACTION_PROMPT = '''Analise esta conversa e extraia fatos sobre o usuario.

CONVERSA:
{conversation}

FATOS EXISTENTES DO USUARIO:
{existing_facts}

INSTRUCOES:
1. Extraia APENAS fatos que o usuario revelou diretamente ou que podem ser inferidos com alta confianca
2. Priorize informacoes que serao uteis para personalizar futuras interacoes
3. Evite repetir fatos ja existentes (compare semanticamente)
4. Marque como 'explicit' se o usuario disse diretamente, 'inferred' se deduzido
5. Confianca >= 0.7 para adicionar, >= 0.5 para atualizar existentes
6. Delete apenas se houver contradicao clara com evidencia na conversa

CATEGORIAS VALIDAS:
- profile: dados pessoais (nome, profissao, localizacao, familia)
- preference: preferencias do usuario (comunicacao, horarios, interesses)
- fact: fatos objetivos sobre o usuario
- pattern: padroes de comportamento observados
- insight: correlacoes e descobertas sobre o usuario

MODULOS VALIDOS (ou null para global):
atlas, journey, studio, captacao, finance, connections

Retorne APENAS um JSON valido (sem markdown):
{{
  "add": [
    {{
      "category": "preference|fact|pattern|insight|profile",
      "key": "nome_semantico_do_fato",
      "value": {{"campo1": "valor1", "campo2": "valor2"}},
      "confidence": 0.7-1.0,
      "module": "atlas|journey|studio|captacao|finance|connections|null",
      "source": "explicit|inferred",
      "reason": "por que este fato e importante"
    }}
  ],
  "update": [
    {{
      "memory_id": "uuid-do-fato-existente",
      "value": {{"campo_atualizado": "novo_valor"}},
      "confidence": 0.5-1.0,
      "reason": "motivo da atualizacao"
    }}
  ],
  "delete": [
    {{
      "memory_id": "uuid-do-fato",
      "reason": "motivo da remocao (contradicao, obsoleto)"
    }}
  ]
}}

REGRAS IMPORTANTES:
- Se nao houver fatos a extrair, retorne {{"add": [], "update": [], "delete": []}}
- Nao invente informacoes - extraia apenas o que esta na conversa
- Prefira atualizar fatos existentes a criar duplicatas
- Keys devem ser snake_case em ingles (ex: work_schedule, communication_style)
- Values devem ser objetos JSON estruturados
'''


class FactExtractionService:
    """
    Service for extracting facts from conversations and managing user memories.

    This service implements a Mem0-style fact extraction system that:
    1. Analyzes conversations for extractable facts
    2. Compares with existing memories using semantic similarity
    3. Executes appropriate ADD, UPDATE, or DELETE operations
    4. Tracks extraction statistics for optimization

    Security Note:
    - Uses service role key for privileged database operations
    - User isolation enforced at the database level (RLS)
    - All operations logged for audit purposes
    """

    def __init__(
        self,
        gemini_api_key: str = GEMINI_API_KEY,
        supabase_url: str = SUPABASE_URL,
        supabase_key: str = SUPABASE_SERVICE_KEY,
    ):
        """
        Initialize FactExtractionService.

        Args:
            gemini_api_key: Gemini API key for extraction and embeddings
            supabase_url: Supabase project URL
            supabase_key: Service role key for user_memory access
        """
        if not gemini_api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable required")

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")

        self.genai_client = genai.Client(api_key=gemini_api_key)
        self.supabase: Client = create_client(supabase_url, supabase_key)

        # Statistics tracking
        self._stats: Dict[str, Dict[str, int]] = {}

        logger.info("Initialized FactExtractionService")

    async def extract_facts(
        self,
        conversation: List[Dict[str, Any]],
        user_id: str,
        context_module: Optional[str] = None,
    ) -> ExtractionResult:
        """
        Extract facts from a conversation and manage user memories.

        This is the main entry point for fact extraction. It:
        1. Validates conversation length
        2. Fetches existing user memories
        3. Calls Gemini to analyze conversation
        4. Executes ADD, UPDATE, DELETE operations

        Args:
            conversation: List of message dicts with 'role' and 'content' keys
            user_id: User UUID
            context_module: Optional module context to prioritize

        Returns:
            ExtractionResult with counts and any errors
        """
        try:
            # Validate minimum conversation length
            if len(conversation) < MIN_CONVERSATION_TURNS:
                logger.debug(
                    f"Conversation too short for extraction ({len(conversation)} < {MIN_CONVERSATION_TURNS})"
                )
                return ExtractionResult(
                    added=0, updated=0, deleted=0, facts_processed=0, errors=[]
                )

            # Fetch existing facts for comparison
            existing_facts = await self._fetch_existing_facts(user_id)

            # Format inputs for the extraction prompt
            conversation_text = self._format_conversation(conversation)
            facts_text = self._format_facts(existing_facts)

            # Call Gemini for fact extraction
            actions = await self._call_extraction_model(
                conversation_text, facts_text
            )

            if not actions:
                return ExtractionResult(
                    added=0, updated=0, deleted=0, facts_processed=0, errors=[]
                )

            # Execute the actions
            result = await self._execute_actions(actions, user_id, context_module)

            # Track statistics
            self._record_extraction(user_id, result)

            return result

        except Exception as e:
            logger.error(f"Error extracting facts for user {user_id[:8]}: {e}")
            return ExtractionResult(
                added=0, updated=0, deleted=0, facts_processed=0, errors=[str(e)]
            )

    async def extract_single_fact(
        self,
        fact_description: str,
        user_id: str,
        category: str = "fact",
        module: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extract and store a single fact from a description.

        Useful for explicit fact storage when the user clearly states something.

        Args:
            fact_description: Natural language description of the fact
            user_id: User UUID
            category: Memory category
            module: Optional module context

        Returns:
            Result dict with status and memory_id if successful
        """
        try:
            # Simple extraction for single facts
            prompt = f'''Extraia um fato estruturado desta descricao:

DESCRICAO: {fact_description}

Retorne APENAS um JSON valido:
{{
  "key": "nome_do_fato_em_snake_case",
  "value": {{"campo1": "valor1"}},
  "confidence": 0.7-1.0
}}'''

            response = await self._call_gemini_with_retry(
                prompt=prompt,
                model=EXTRACTION_MODEL,
                response_format="application/json"
            )

            if not response:
                return {"status": "error", "message": "Failed to extract fact"}

            fact_data = json.loads(response)

            # Store the fact
            result = await self._store_fact(
                user_id=user_id,
                category=category,
                key=fact_data.get("key", "unknown"),
                value=fact_data.get("value", {}),
                confidence=fact_data.get("confidence", 0.8),
                module=module,
                source="explicit"
            )

            return result

        except Exception as e:
            logger.error(f"Error extracting single fact: {e}")
            return {"status": "error", "message": str(e)}

    async def _fetch_existing_facts(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Fetch existing user memories for comparison.

        Args:
            user_id: User UUID
            limit: Maximum memories to fetch

        Returns:
            List of memory dicts with id, category, key, value, confidence
        """
        try:
            result = self.supabase.table("user_memory") \
                .select("id, category, module, key, value, confidence, source") \
                .eq("user_id", user_id) \
                .order("confidence", desc=True) \
                .limit(limit) \
                .execute()

            return result.data or []

        except Exception as e:
            logger.error(f"Error fetching existing facts: {e}")
            return []

    def _format_conversation(self, conversation: List[Dict[str, Any]]) -> str:
        """
        Format conversation messages into readable text.

        Args:
            conversation: List of message dicts

        Returns:
            Formatted conversation string
        """
        lines = []
        for msg in conversation:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")

            # Normalize role names
            if role in ["user", "human"]:
                role_label = "USUARIO"
            elif role in ["assistant", "model", "ai"]:
                role_label = "AICA"
            else:
                role_label = role.upper()

            # Truncate very long messages
            if len(content) > 1000:
                content = content[:1000] + "..."

            lines.append(f"{role_label}: {content}")

        return "\n".join(lines)

    def _format_facts(self, facts: List[Dict[str, Any]]) -> str:
        """
        Format existing facts into readable text for the prompt.

        Args:
            facts: List of memory dicts

        Returns:
            Formatted facts string
        """
        if not facts:
            return "Nenhum fato existente."

        lines = []
        for fact in facts:
            memory_id = fact.get("id", "unknown")
            category = fact.get("category", "unknown")
            key = fact.get("key", "unknown")
            value = fact.get("value", {})
            confidence = fact.get("confidence", 0)
            module = fact.get("module") or "global"

            # Format value
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                except json.JSONDecodeError:
                    pass

            if isinstance(value, dict):
                value_str = json.dumps(value, ensure_ascii=False)
            else:
                value_str = str(value)

            lines.append(
                f"[{memory_id}] {category}/{module}: {key} = {value_str} (confianca: {confidence:.0%})"
            )

        return "\n".join(lines)

    async def _call_extraction_model(
        self,
        conversation_text: str,
        existing_facts_text: str
    ) -> Optional[Dict[str, List]]:
        """
        Call Gemini to extract facts from conversation.

        Args:
            conversation_text: Formatted conversation
            existing_facts_text: Formatted existing facts

        Returns:
            Dict with 'add', 'update', 'delete' lists, or None if failed
        """
        prompt = EXTRACTION_PROMPT.format(
            conversation=conversation_text,
            existing_facts=existing_facts_text
        )

        response = await self._call_gemini_with_retry(
            prompt=prompt,
            model=EXTRACTION_MODEL,
            response_format="application/json"
        )

        if not response:
            return None

        try:
            # Parse JSON response
            actions = json.loads(response)

            # Validate structure
            if not isinstance(actions, dict):
                logger.warning("Invalid extraction response: not a dict")
                return None

            # Ensure all keys exist
            return {
                "add": actions.get("add", []),
                "update": actions.get("update", []),
                "delete": actions.get("delete", [])
            }

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse extraction response: {e}")
            return None

    async def _call_gemini_with_retry(
        self,
        prompt: str,
        model: str,
        response_format: Optional[str] = None,
        retries: int = MAX_RETRIES
    ) -> Optional[str]:
        """
        Call Gemini API with retry logic.

        Args:
            prompt: The prompt to send
            model: Model name
            response_format: Optional MIME type for response format
            retries: Number of retry attempts

        Returns:
            Response text or None if failed
        """
        config = types.GenerateContentConfig()
        if response_format:
            config.response_mime_type = response_format

        last_error = None

        for attempt in range(retries):
            try:
                response = self.genai_client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config
                )

                if response and response.text:
                    return response.text

            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Rate limit - exponential backoff
                if "429" in error_str or "rate" in error_str:
                    delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                    logger.warning(f"Rate limited, retrying in {delay}s (attempt {attempt + 1}/{retries})")
                    await asyncio.sleep(delay)
                    continue

                # Server error - fixed delay
                if "500" in error_str or "server" in error_str:
                    logger.warning(f"Server error, retrying (attempt {attempt + 1}/{retries})")
                    await asyncio.sleep(1)
                    continue

                # Other errors - don't retry
                logger.error(f"Gemini API error: {e}")
                break

        logger.error(f"Max retries exceeded: {last_error}")
        return None

    async def _execute_actions(
        self,
        actions: Dict[str, List],
        user_id: str,
        context_module: Optional[str] = None
    ) -> ExtractionResult:
        """
        Execute ADD, UPDATE, DELETE actions on user memories.

        Args:
            actions: Dict with 'add', 'update', 'delete' lists
            user_id: User UUID
            context_module: Optional default module for new facts

        Returns:
            ExtractionResult with counts
        """
        added = 0
        updated = 0
        deleted = 0
        errors = []
        total_processed = 0

        # Process additions
        for fact in actions.get("add", []):
            total_processed += 1
            try:
                # Validate confidence threshold
                confidence = fact.get("confidence", 0)
                if confidence < MIN_CONFIDENCE:
                    logger.debug(f"Skipping low-confidence fact: {fact.get('key')} ({confidence:.0%})")
                    continue

                # Determine module
                module = fact.get("module")
                if module == "null" or module is None:
                    module = context_module

                result = await self._store_fact(
                    user_id=user_id,
                    category=fact.get("category", "fact"),
                    key=fact.get("key", "unknown"),
                    value=fact.get("value", {}),
                    confidence=confidence,
                    module=module,
                    source=fact.get("source", "inferred")
                )

                if result.get("status") == "success":
                    added += 1
                    logger.info(f"Added fact: {fact.get('key')} for user {user_id[:8]}")
                else:
                    errors.append(f"Add failed: {result.get('message')}")

            except Exception as e:
                errors.append(f"Add error: {str(e)}")

        # Process updates
        for update in actions.get("update", []):
            total_processed += 1
            try:
                memory_id = update.get("memory_id")
                if not memory_id:
                    continue

                result = await self._update_fact(
                    memory_id=memory_id,
                    user_id=user_id,
                    value=update.get("value"),
                    confidence=update.get("confidence")
                )

                if result.get("status") == "success":
                    updated += 1
                    logger.info(f"Updated fact: {memory_id} for user {user_id[:8]}")
                else:
                    errors.append(f"Update failed: {result.get('message')}")

            except Exception as e:
                errors.append(f"Update error: {str(e)}")

        # Process deletions
        for deletion in actions.get("delete", []):
            total_processed += 1
            try:
                memory_id = deletion.get("memory_id")
                if not memory_id:
                    continue

                result = await self._delete_fact(
                    memory_id=memory_id,
                    user_id=user_id
                )

                if result.get("status") == "success":
                    deleted += 1
                    logger.info(
                        f"Deleted fact: {memory_id} for user {user_id[:8]} - "
                        f"Reason: {deletion.get('reason', 'unspecified')}"
                    )
                else:
                    errors.append(f"Delete failed: {result.get('message')}")

            except Exception as e:
                errors.append(f"Delete error: {str(e)}")

        return ExtractionResult(
            added=added,
            updated=updated,
            deleted=deleted,
            facts_processed=total_processed,
            errors=errors
        )

    async def _store_fact(
        self,
        user_id: str,
        category: str,
        key: str,
        value: Dict[str, Any],
        confidence: float,
        module: Optional[str],
        source: str
    ) -> Dict[str, Any]:
        """
        Store a new fact in user_memory table.

        Uses upsert to handle potential duplicates gracefully.

        Args:
            user_id: User UUID
            category: Memory category
            key: Semantic key
            value: Structured value
            confidence: Confidence score
            module: Optional module context
            source: Source type ('explicit' or 'inferred')

        Returns:
            Result dict with status and memory_id
        """
        try:
            # Validate category
            valid_categories = ['profile', 'preference', 'fact', 'insight', 'pattern']
            if category not in valid_categories:
                category = 'fact'

            # Validate module
            if module is not None:
                valid_modules = ['atlas', 'journey', 'studio', 'captacao', 'finance', 'connections']
                if module not in valid_modules:
                    module = None

            memory_data = {
                "user_id": user_id,
                "category": category,
                "key": key,
                "value": json.dumps(value) if isinstance(value, dict) else str(value),
                "confidence": min(max(confidence, 0.0), 1.0),
                "source": source if source in ['explicit', 'inferred', 'observed'] else 'inferred'
            }

            if module is not None:
                memory_data["module"] = module

            # Upsert to handle duplicates
            result = self.supabase.table("user_memory") \
                .upsert(memory_data, on_conflict="user_id,category,key,module") \
                .execute()

            if result.data and len(result.data) > 0:
                return {
                    "status": "success",
                    "memory_id": result.data[0].get("id")
                }

            return {"status": "error", "message": "No data returned from upsert"}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def _update_fact(
        self,
        memory_id: str,
        user_id: str,
        value: Optional[Dict[str, Any]] = None,
        confidence: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Update an existing fact.

        Args:
            memory_id: Memory UUID to update
            user_id: User UUID (for authorization)
            value: New value (optional)
            confidence: New confidence (optional)

        Returns:
            Result dict with status
        """
        try:
            update_data = {}

            if value is not None:
                update_data["value"] = json.dumps(value) if isinstance(value, dict) else str(value)

            if confidence is not None:
                update_data["confidence"] = min(max(confidence, 0.0), 1.0)

            if not update_data:
                return {"status": "error", "message": "Nothing to update"}

            result = self.supabase.table("user_memory") \
                .update(update_data) \
                .eq("id", memory_id) \
                .eq("user_id", user_id) \
                .execute()

            if result.data and len(result.data) > 0:
                return {"status": "success"}

            return {"status": "error", "message": "Memory not found or unauthorized"}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def _delete_fact(
        self,
        memory_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Delete a fact from user_memory.

        Args:
            memory_id: Memory UUID to delete
            user_id: User UUID (for authorization)

        Returns:
            Result dict with status
        """
        try:
            result = self.supabase.table("user_memory") \
                .delete() \
                .eq("id", memory_id) \
                .eq("user_id", user_id) \
                .execute()

            if result.data and len(result.data) > 0:
                return {"status": "success"}

            return {"status": "error", "message": "Memory not found or unauthorized"}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding vector for semantic similarity.

        Uses text-embedding-004 model for 1536-dimensional vectors.

        Args:
            text: Text to embed

        Returns:
            List of floats (1536 dimensions) or None if failed
        """
        try:
            result = self.genai_client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text
            )

            if result and result.embedding:
                return result.embedding.values

            return None

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None

    async def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute semantic similarity between two texts.

        Uses cosine similarity of embeddings.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Similarity score (0.0 to 1.0)
        """
        try:
            emb1 = await self.generate_embedding(text1)
            emb2 = await self.generate_embedding(text2)

            if emb1 is None or emb2 is None:
                return 0.0

            # Cosine similarity
            dot_product = sum(a * b for a, b in zip(emb1, emb2))
            norm1 = sum(a * a for a in emb1) ** 0.5
            norm2 = sum(b * b for b in emb2) ** 0.5

            if norm1 == 0 or norm2 == 0:
                return 0.0

            return dot_product / (norm1 * norm2)

        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            return 0.0

    def _record_extraction(self, user_id: str, result: ExtractionResult) -> None:
        """Record extraction statistics."""
        if user_id not in self._stats:
            self._stats[user_id] = {
                "total_extractions": 0,
                "facts_added": 0,
                "facts_updated": 0,
                "facts_deleted": 0,
                "errors": 0
            }

        self._stats[user_id]["total_extractions"] += 1
        self._stats[user_id]["facts_added"] += result.added
        self._stats[user_id]["facts_updated"] += result.updated
        self._stats[user_id]["facts_deleted"] += result.deleted
        self._stats[user_id]["errors"] += len(result.errors)

    def get_extraction_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get extraction statistics for a user.

        Args:
            user_id: User UUID

        Returns:
            Dict with extraction statistics
        """
        if user_id not in self._stats:
            return {
                "status": "success",
                "user_id": user_id,
                "total_extractions": 0,
                "facts_added": 0,
                "facts_updated": 0,
                "facts_deleted": 0,
                "errors": 0
            }

        return {
            "status": "success",
            "user_id": user_id,
            **self._stats[user_id]
        }


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_fact_extraction_service: Optional[FactExtractionService] = None


def get_fact_extraction_service() -> FactExtractionService:
    """
    Get singleton instance of FactExtractionService.

    Returns:
        FactExtractionService instance

    Raises:
        ValueError: If required environment variables are not set
    """
    global _fact_extraction_service

    if _fact_extraction_service is None:
        _fact_extraction_service = FactExtractionService()

    return _fact_extraction_service


# =============================================================================
# CALLBACK FOR ADK AGENTS
# =============================================================================

async def extract_facts_callback(
    session_state: Dict[str, Any],
    messages: List[Dict[str, Any]],
    context_module: Optional[str] = None
) -> Optional[ExtractionResult]:
    """
    Callback function for automatic fact extraction after agent conversations.

    This function is designed to be called from ADK's after_agent_callback.
    It extracts facts from the last N messages of a conversation.

    Args:
        session_state: ADK session state containing user_id
        messages: List of conversation messages
        context_module: Optional module context (atlas, journey, etc.)

    Returns:
        ExtractionResult if extraction was performed, None otherwise

    Usage in agent.py:
        async def my_after_callback(callback_context):
            session = callback_context._invocation_context.session
            user_id = session.state.get("user_id")

            if user_id:
                result = await extract_facts_callback(
                    session_state=session.state,
                    messages=session.messages[-10:]
                )
    """
    try:
        user_id = session_state.get("user_id")

        if not user_id:
            logger.debug("No user_id in session state, skipping fact extraction")
            return None

        # Only extract if there's enough conversation
        if len(messages) < MIN_CONVERSATION_TURNS:
            logger.debug(f"Conversation too short ({len(messages)} messages)")
            return None

        service = get_fact_extraction_service()
        result = await service.extract_facts(
            conversation=messages,
            user_id=user_id,
            context_module=context_module
        )

        if result.added > 0 or result.updated > 0 or result.deleted > 0:
            logger.info(
                f"Fact extraction for {user_id[:8]}: "
                f"+{result.added} ~{result.updated} -{result.deleted}"
            )

        return result

    except Exception as e:
        logger.error(f"Error in fact extraction callback: {e}")
        return None
