"""
File Search Service for ADK Agents

Provides RAG (Retrieval Augmented Generation) capabilities using Google's
File Search API. This is a managed RAG solution that handles:
- Document chunking (optimized for Portuguese)
- Semantic indexing
- Query with citations

Key Benefits:
- Zero infrastructure (no vector DB needed)
- Automatic chunking with configurable overlap
- Grounding metadata with source citations
- Cost: $0.15/1M tokens for indexing, storage and queries FREE

Usage:
    service = FileSearchService()

    # Create store for a module
    store = await service.get_or_create_store('captacao', user_id)

    # Upload document
    result = await service.upload_document('captacao', user_id, file_path)

    # Search with RAG
    response = await service.search('captacao', user_id, 'requisitos do edital')
"""

import os
import asyncio
import logging
import httpx
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
FILE_SEARCH_ENDPOINT = f"{SUPABASE_URL}/functions/v1/file-search-v2"

# Module to FileSearch category mapping
MODULE_CATEGORY_MAP = {
    "captacao": "grants",
    "studio": "podcast_transcripts",
    "journey": "journey_moments",
    "finance": "financial",
    "connections": "documents",
    "atlas": "documents",
}

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # Exponential backoff seconds


@dataclass
class FileSearchResult:
    """Result from a File Search query."""
    answer: str
    citations: List[Dict[str, Any]]
    sources: List[Dict[str, str]]
    usage: Dict[str, int]


@dataclass
class UploadResult:
    """Result from document upload."""
    document_id: str
    file_name: str
    status: str
    store_id: str


@dataclass
class StoreInfo:
    """Information about a File Search store."""
    id: str
    display_name: str
    already_existed: bool


class FileSearchService:
    """
    RAG service using Google File Search API via Supabase Edge Function.

    This service wraps the file-search-v2 Edge Function to provide
    document indexing and semantic search capabilities for ADK agents.

    The service maintains a cache of store IDs to minimize API calls
    when checking for existing stores.

    Security Note:
    - All operations require a valid user_id
    - The service uses Supabase service role key for Edge Function calls
    - User data isolation is enforced by the Edge Function
    """

    def __init__(self):
        """
        Initialize FileSearchService.

        Requires SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.
        """
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required"
            )

        self._store_cache: Dict[str, str] = {}  # (module_user_id) -> store_id
        self._http_client: Optional[httpx.AsyncClient] = None

        logger.info("Initialized FileSearchService")

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with connection pooling."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(300.0),  # 5 min timeout for uploads
                limits=httpx.Limits(max_connections=10),
            )
        return self._http_client

    async def _call_edge_function(
        self,
        action: str,
        payload: Dict[str, Any],
        user_id: str,
        retries: int = MAX_RETRIES,
    ) -> Dict[str, Any]:
        """
        Call the file-search-v2 Edge Function with retry logic.

        Args:
            action: The action to perform (create_store, upload_document, query, etc.)
            payload: Action-specific payload
            user_id: User ID for authorization
            retries: Number of retry attempts

        Returns:
            Result from the Edge Function

        Raises:
            Exception: If all retries fail
        """
        client = await self._get_http_client()

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "x-user-id": user_id,  # Pass user context for RLS
        }

        body = {
            "action": action,
            "payload": payload,
        }

        last_error = None

        for attempt in range(retries):
            try:
                response = await client.post(
                    FILE_SEARCH_ENDPOINT,
                    json=body,
                    headers=headers,
                )

                data = response.json()

                if response.status_code == 429:
                    # Rate limit - exponential backoff
                    delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                    logger.warning(
                        f"Rate limited on {action}, retrying in {delay}s "
                        f"(attempt {attempt + 1}/{retries})"
                    )
                    await asyncio.sleep(delay)
                    continue

                if response.status_code >= 500:
                    # Server error - retry with fixed delay
                    logger.warning(
                        f"Server error {response.status_code} on {action}, "
                        f"retrying (attempt {attempt + 1}/{retries})"
                    )
                    await asyncio.sleep(1)
                    continue

                if not response.is_success or not data.get("success"):
                    error_msg = data.get("error", f"HTTP {response.status_code}")
                    raise Exception(f"File Search API error: {error_msg}")

                return data.get("result", {})

            except httpx.RequestError as e:
                last_error = e
                logger.warning(
                    f"Network error on {action}: {e}, "
                    f"retrying (attempt {attempt + 1}/{retries})"
                )
                await asyncio.sleep(RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)])

        raise Exception(f"Max retries exceeded for {action}: {last_error}")

    def _get_cache_key(self, module: str, user_id: str) -> str:
        """Generate cache key for store lookups."""
        return f"{module}_{user_id}"

    def _get_category(self, module: str) -> str:
        """
        Map module name to FileSearch category.

        Args:
            module: Module name (captacao, studio, journey, etc.)

        Returns:
            FileSearch category string
        """
        return MODULE_CATEGORY_MAP.get(module, "documents")

    async def get_or_create_store(
        self,
        module: str,
        user_id: str,
        display_name: Optional[str] = None,
    ) -> StoreInfo:
        """
        Get or create a File Search store for a module.

        This method is idempotent - calling it multiple times with the same
        parameters will return the same store.

        Args:
            module: Module name (captacao, studio, journey, etc.)
            user_id: User UUID
            display_name: Optional custom display name for the store

        Returns:
            StoreInfo with store details

        Example:
            store = await service.get_or_create_store('captacao', user_id)
            print(f"Using store: {store.id}")
        """
        cache_key = self._get_cache_key(module, user_id)

        # Check cache first
        if cache_key in self._store_cache:
            return StoreInfo(
                id=self._store_cache[cache_key],
                display_name=display_name or f"{module}_{user_id[:8]}",
                already_existed=True,
            )

        category = self._get_category(module)

        result = await self._call_edge_function(
            action="create_store",
            payload={
                "category": category,
                "displayName": display_name,
            },
            user_id=user_id,
        )

        store_id = result.get("id")
        if store_id:
            self._store_cache[cache_key] = store_id

        return StoreInfo(
            id=store_id,
            display_name=result.get("displayName", ""),
            already_existed=result.get("alreadyExisted", False),
        )

    async def upload_document(
        self,
        module: str,
        user_id: str,
        file_content: bytes,
        file_name: str,
        mime_type: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> UploadResult:
        """
        Upload a document to the module's store for indexing.

        The document will be automatically chunked (400 tokens per chunk,
        40 token overlap - optimized for Portuguese) and indexed.

        Indexing may take 1-5 minutes depending on document size.

        Args:
            module: Module name (captacao, studio, journey, etc.)
            user_id: User UUID
            file_content: Raw file bytes
            file_name: Original file name (e.g., "edital_faperj.pdf")
            mime_type: MIME type (e.g., "application/pdf")
            metadata: Optional metadata dict for filtering

        Returns:
            UploadResult with document details

        Cost:
            $0.15 per 1M tokens indexed

        Example:
            with open('edital.pdf', 'rb') as f:
                result = await service.upload_document(
                    module='captacao',
                    user_id=user_id,
                    file_content=f.read(),
                    file_name='edital_faperj_2026.pdf',
                    mime_type='application/pdf',
                    metadata={'agency': 'FAPERJ', 'year': '2026'}
                )
        """
        import base64

        category = self._get_category(module)
        file_content_b64 = base64.b64encode(file_content).decode('utf-8')

        result = await self._call_edge_function(
            action="upload_document",
            payload={
                "category": category,
                "fileName": file_name,
                "fileContent": file_content_b64,
                "mimeType": mime_type,
                "metadata": metadata or {},
            },
            user_id=user_id,
        )

        return UploadResult(
            document_id=result.get("id", ""),
            file_name=result.get("fileName", file_name),
            status=result.get("status", "unknown"),
            store_id=result.get("storeId", ""),
        )

    async def upload_document_from_url(
        self,
        module: str,
        user_id: str,
        file_url: str,
        file_name: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> UploadResult:
        """
        Upload a document from a URL (e.g., Supabase Storage).

        Downloads the file and uploads it to File Search.

        Args:
            module: Module name
            user_id: User UUID
            file_url: URL to download file from
            file_name: Name for the file
            metadata: Optional metadata

        Returns:
            UploadResult with document details
        """
        client = await self._get_http_client()

        # Download file
        response = await client.get(file_url)
        if not response.is_success:
            raise Exception(f"Failed to download file from {file_url}")

        # Detect MIME type from headers or filename
        content_type = response.headers.get("content-type", "application/octet-stream")
        if "pdf" in file_name.lower():
            content_type = "application/pdf"
        elif "txt" in file_name.lower():
            content_type = "text/plain"

        return await self.upload_document(
            module=module,
            user_id=user_id,
            file_content=response.content,
            file_name=file_name,
            mime_type=content_type,
            metadata=metadata,
        )

    async def search(
        self,
        module: str,
        user_id: str,
        query: str,
        max_results: int = 5,
        system_prompt: Optional[str] = None,
    ) -> FileSearchResult:
        """
        Search documents in a module's store using RAG.

        Returns an AI-generated answer based on the indexed documents,
        with source citations.

        Args:
            module: Module name (captacao, studio, journey, etc.)
            user_id: User UUID
            query: Natural language question
            max_results: Maximum number of source chunks to retrieve
            system_prompt: Optional custom system instruction

        Returns:
            FileSearchResult with answer, citations, and sources

        Example:
            result = await service.search(
                module='captacao',
                user_id=user_id,
                query='Quais sao os requisitos de elegibilidade do edital?'
            )
            print(f"Answer: {result.answer}")
            for source in result.sources:
                print(f"Source: {source['title']}")
        """
        category = self._get_category(module)

        result = await self._call_edge_function(
            action="query",
            payload={
                "categories": [category],
                "question": query,
                "maxResults": max_results,
                "systemPrompt": system_prompt,
            },
            user_id=user_id,
        )

        return FileSearchResult(
            answer=result.get("answer", ""),
            citations=result.get("citations", []),
            sources=result.get("sources", []),
            usage=result.get("usage", {"inputTokens": 0, "outputTokens": 0}),
        )

    async def search_across_modules(
        self,
        modules: List[str],
        user_id: str,
        query: str,
        max_results: int = 5,
        system_prompt: Optional[str] = None,
    ) -> FileSearchResult:
        """
        Search documents across multiple modules.

        Useful for cross-module queries like finding information
        mentioned in both journey moments and grant documents.

        Args:
            modules: List of module names to search
            user_id: User UUID
            query: Natural language question
            max_results: Maximum number of source chunks
            system_prompt: Optional custom system instruction

        Returns:
            FileSearchResult with combined results
        """
        categories = [self._get_category(m) for m in modules]

        result = await self._call_edge_function(
            action="query",
            payload={
                "categories": categories,
                "question": query,
                "maxResults": max_results,
                "systemPrompt": system_prompt,
            },
            user_id=user_id,
        )

        return FileSearchResult(
            answer=result.get("answer", ""),
            citations=result.get("citations", []),
            sources=result.get("sources", []),
            usage=result.get("usage", {"inputTokens": 0, "outputTokens": 0}),
        )

    async def delete_document(
        self,
        document_id: str,
        user_id: str,
    ) -> bool:
        """
        Delete a document from File Search.

        Args:
            document_id: Document ID returned from upload
            user_id: User UUID

        Returns:
            True if deleted successfully
        """
        await self._call_edge_function(
            action="delete_document",
            payload={"documentId": document_id},
            user_id=user_id,
        )
        return True

    async def list_stores(self, user_id: str) -> List[Dict[str, Any]]:
        """
        List all File Search stores for a user.

        Args:
            user_id: User UUID

        Returns:
            List of store information dicts
        """
        result = await self._call_edge_function(
            action="list_stores",
            payload={},
            user_id=user_id,
        )

        # Result is already a list
        if isinstance(result, list):
            return result
        return []

    async def close(self):
        """Close HTTP client and cleanup resources."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_file_search_service: Optional[FileSearchService] = None


def get_file_search_service() -> FileSearchService:
    """
    Get singleton FileSearchService instance.

    Usage:
        service = get_file_search_service()
        result = await service.search('captacao', user_id, 'minha pergunta')
    """
    global _file_search_service
    if _file_search_service is None:
        _file_search_service = FileSearchService()
    return _file_search_service
