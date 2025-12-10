import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchQuery,
  FileSearchResult,
  IndexDocumentRequest
} from '../types/fileSearch';
import { trackAIUsage } from './aiUsageTrackingService';
import { fileSearchCache } from './fileSearchCacheService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Service layer for File Search API interactions
 * All requests communicate with the Python backend
 */

/**
 * Lists all corpora for the current user
 * @returns Array of FileSearchCorpus objects
 */
export async function listCorpora(): Promise<FileSearchCorpus[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/file-search/corpora`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to list corpora: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing corpora:', error);
    throw error;
  }
}

/**
 * Creates a new corpus
 * @param name - Unique identifier for the corpus
 * @param displayName - Human-readable name for the corpus
 * @returns The created FileSearchCorpus
 */
export async function createCorpus(
  name: string,
  displayName: string
): Promise<FileSearchCorpus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/file-search/corpora`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        display_name: displayName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to create corpus: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating corpus:', error);
    throw error;
  }
}

/**
 * Indexes a document in a corpus
 * @param request - Index document request with file and metadata
 * @returns The indexed FileSearchDocument
 */
export async function indexDocument(
  request: IndexDocumentRequest
): Promise<FileSearchDocument> {
  const startTime = Date.now();

  try {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('corpus_id', request.corpusId);
    formData.append('module_type', request.moduleType);
    formData.append('module_id', request.moduleId);

    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    const response = await fetch(`${API_BASE_URL}/api/file-search/documents`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to index document: ${response.statusText}`
      );
    }

    const document = await response.json();

    // ✅ CACHE: Invalidate module cache (new document changes search results)
    fileSearchCache.invalidateModule(request.moduleType, request.moduleId);
    console.log('[fileSearchApiClient] Cache invalidated for module:', request.moduleType, request.moduleId);

    // Track AI usage for document indexing (fire-and-forget, non-blocking)
    const duration = (Date.now() - startTime) / 1000;
    trackAIUsage({
      operation_type: 'embedding',
      ai_model: 'text-embedding-004', // Gemini embeddings for semantic indexing
      module_type: request.moduleType,
      module_id: request.moduleId,
      duration_seconds: duration,
      request_metadata: {
        corpus_id: request.corpusId,
        file_name: request.file.name,
        file_size: request.file.size,
        mime_type: request.file.type,
      },
    }).catch(err => {
      // Silently catch tracking errors - never block main flow
      console.debug('[fileSearchApiClient] Tracking error:', err);
    });

    return document;
  } catch (error) {
    console.error('Error indexing document:', error);
    throw error;
  }
}

/**
 * Performs semantic search across indexed documents
 * @param query - File search query with filters
 * @returns Array of FileSearchResult objects
 */
export async function queryFileSearch(
  query: FileSearchQuery
): Promise<FileSearchResult[]> {
  const startTime = Date.now();

  // ✅ CACHE: Check if results are already cached
  const cachedResults = fileSearchCache.get(query);
  if (cachedResults) {
    console.log('[fileSearchApiClient] Cache HIT - returning cached results');
    return cachedResults;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/file-search/query`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to query file search: ${response.statusText}`
      );
    }

    const results = await response.json();

    // ✅ CACHE: Store results for future queries
    fileSearchCache.set(query, results);

    // Track AI usage (fire-and-forget, non-blocking)
    const duration = (Date.now() - startTime) / 1000;
    trackAIUsage({
      operation_type: 'file_search_query', // Matches ai_usage_analytics CHECK constraint
      ai_model: 'aqa', // Gemini AQA (Attributed Question Answering)
      module_type: query.moduleType,
      module_id: query.moduleId,
      duration_seconds: duration,
      request_metadata: {
        query_text: query.query,
        corpus_names: query.corpusNames,
        result_count: results.length,
      },
    }).catch(err => {
      // Silently catch tracking errors - never block main flow
      console.debug('[fileSearchApiClient] Tracking error:', err);
    });

    return results;
  } catch (error) {
    console.error('Error querying file search:', error);
    throw error;
  }
}

/**
 * Lists documents in a corpus with optional filters
 * @param corpusId - ID of the corpus to list documents from
 * @param filters - Optional filters for module_type and module_id
 * @returns Array of FileSearchDocument objects
 */
export async function listDocuments(
  corpusId: string,
  filters?: {
    moduleType?: string;
    moduleId?: string;
  }
): Promise<FileSearchDocument[]> {
  try {
    const params = new URLSearchParams({
      corpus_id: corpusId,
    });

    if (filters?.moduleType) {
      params.append('module_type', filters.moduleType);
    }

    if (filters?.moduleId) {
      params.append('module_id', filters.moduleId);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/file-search/documents?${params.toString()}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to list documents: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing documents:', error);
    throw error;
  }
}

/**
 * Deletes a document from the corpus
 * @param documentId - ID of the document to delete
 * @param moduleType - Optional module type for targeted cache invalidation
 * @param moduleId - Optional module ID for targeted cache invalidation
 */
export async function deleteDocument(
  documentId: string,
  moduleType?: string,
  moduleId?: string
): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/file-search/documents/${documentId}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to delete document: ${response.statusText}`
      );
    }

    // ✅ CACHE: Invalidate cache (document deletion changes search results)
    if (moduleType) {
      fileSearchCache.invalidateModule(moduleType, moduleId);
      console.log('[fileSearchApiClient] Cache invalidated for module:', moduleType, moduleId);
    } else {
      // If module info not provided, clear all cache to be safe
      fileSearchCache.clearAll();
      console.log('[fileSearchApiClient] All cache cleared after document deletion');
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}
