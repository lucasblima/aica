import type {
  FileSearchCorpus,
  FileSearchDocument,
  FileSearchQuery,
  FileSearchResult,
  IndexDocumentRequest
} from '../types/fileSearch';
import { trackAIUsage } from './aiUsageTrackingService';
import { fileSearchCache } from './fileSearchCacheService';
import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('FileSearchApiClient');


const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Flag to use Supabase directly instead of Python backend
const USE_SUPABASE_DIRECT = true;

// Supabase Edge Function URL for File Search operations
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-search-corpus`;

/**
 * Get the JWT token from Supabase session for backend API calls
 * @returns JWT token or null if no session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    log.error('[fileSearchApiClient] Error getting auth token:', { error: error });
    return null;
  }
}

/**
 * Helper function to create authenticated fetch headers
 * @returns Headers with Authorization token if available
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Service layer for File Search API interactions
 * Can use either Python backend or Supabase directly
 */

/**
 * Lists all corpora for the current user
 * @param moduleType - Optional filter by module type (single string or array)
 * @param moduleId - Optional filter by module ID
 * @returns Array of FileSearchCorpus objects
 */
export async function listCorpora(
  moduleType?: string | string[],
  moduleId?: string
): Promise<FileSearchCorpus[]> {
  // Use Supabase directly if configured
  if (USE_SUPABASE_DIRECT) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        log.warn('[fileSearchApiClient] No authenticated user');
        return [];
      }

      let query = supabase
        .from('file_search_corpora')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (moduleType) {
        // Support multiple module types
        if (Array.isArray(moduleType)) {
          query = query.in('module_type', moduleType);
        } else {
          query = query.eq('module_type', moduleType);
        }
      }
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;

      if (error) {
        log.error('[fileSearchApiClient] Supabase error:', { error: error });
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.corpus_name,
        displayName: row.display_name || row.corpus_name,
        documentCount: row.document_count || 0,
        createdAt: row.created_at,
        moduleType: row.module_type,
        moduleId: row.module_id,
      }));
    } catch (error) {
      log.error('[fileSearchApiClient] Error listing corpora from Supabase:', { error: error });
      return [];
    }
  }

  // Fallback to Python API
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/file-search/corpora`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Failed to list corpora: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    log.error('Error listing corpora:', { error: error });
    throw error;
  }
}

/**
 * Creates a new corpus or returns existing one if duplicate
 * @param name - Unique identifier for the corpus
 * @param displayName - Human-readable name for the corpus
 * @param moduleType - Optional module type
 * @param moduleId - Optional module ID
 * @returns The created or existing FileSearchCorpus
 */
export async function createCorpus(
  name: string,
  displayName: string,
  moduleType?: string,
  moduleId?: string
): Promise<FileSearchCorpus> {
  // Use Supabase directly if configured
  if (USE_SUPABASE_DIRECT) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      // First, check if corpus already exists (prevent 409 conflict)
      const { data: existingCorpus } = await supabase
        .from('file_search_corpora')
        .select('*')
        .eq('user_id', user.id)
        .eq('corpus_name', name)
        .single();

      if (existingCorpus) {
        log.debug('[fileSearchApiClient] Corpus already exists, returning existing:', name);
        return {
          id: existingCorpus.id,
          name: existingCorpus.corpus_name,
          displayName: existingCorpus.display_name || existingCorpus.corpus_name,
          documentCount: existingCorpus.document_count || 0,
          createdAt: existingCorpus.created_at,
          moduleType: existingCorpus.module_type,
          moduleId: existingCorpus.module_id,
        };
      }

      // Create new corpus
      const { data, error } = await supabase
        .from('file_search_corpora')
        .insert({
          user_id: user.id,
          corpus_name: name,
          display_name: displayName,
          module_type: moduleType || null,
          module_id: moduleId || null,
          document_count: 0,
        })
        .select()
        .single();

      if (error) {
        // Handle race condition - if duplicate key error, fetch existing
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          log.debug('[fileSearchApiClient] Duplicate detected, fetching existing corpus');
          const { data: existing } = await supabase
            .from('file_search_corpora')
            .select('*')
            .eq('user_id', user.id)
            .eq('corpus_name', name)
            .single();

          if (existing) {
            return {
              id: existing.id,
              name: existing.corpus_name,
              displayName: existing.display_name || existing.corpus_name,
              documentCount: existing.document_count || 0,
              createdAt: existing.created_at,
              moduleType: existing.module_type,
              moduleId: existing.module_id,
            };
          }
        }
        throw new Error(`Failed to create corpus: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.corpus_name,
        displayName: data.display_name || data.corpus_name,
        documentCount: 0,
        createdAt: data.created_at,
        moduleType: data.module_type,
        moduleId: data.module_id,
      };
    } catch (error) {
      log.error('[fileSearchApiClient] Error creating corpus in Supabase:', { error: error });
      throw error;
    }
  }

  // Fallback to Python API
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/file-search/corpora`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        display_name: displayName,
        module_type: moduleType,
        module_id: moduleId,
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
    log.error('Error creating corpus:', { error: error });
    throw error;
  }
}

/**
 * Helper: Convert File to base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]; // Remove "data:mime/type;base64," prefix
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Indexes a document in a corpus via Supabase Edge Function
 * @param request - Index document request with file and metadata
 * @returns The indexed FileSearchDocument
 */
export async function indexDocument(
  request: IndexDocumentRequest
): Promise<FileSearchDocument> {
  const startTime = Date.now();

  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Convert file to base64
    const base64Data = await fileToBase64(request.file);

    // Call Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'upload_document',
        payload: {
          corpusId: request.corpusId,
          file: {
            name: request.file.name,
            type: request.file.type,
            data: base64Data,
            size: request.file.size,
          },
          metadata: request.metadata,
          moduleType: request.moduleType,
          moduleId: request.moduleId,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to index document: ${response.statusText}`
      );
    }

    const { result } = await response.json();

    // ✅ CACHE: Invalidate module cache (new document changes search results)
    fileSearchCache.invalidateModule(request.moduleType, request.moduleId);
    log.debug('[fileSearchApiClient] Cache invalidated for module:', request.moduleType, request.moduleId);

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
      log.debug('[fileSearchApiClient] Tracking error:', err);
    });

    // Convert Edge Function response to FileSearchDocument format
    return {
      id: result.id,
      name: result.geminiFileName,
      displayName: request.metadata?.display_name || request.file.name,
      corpusId: request.corpusId,
      mimeType: request.file.type,
      sizeBytes: request.file.size,
      status: result.status,
      createdAt: new Date().toISOString(),
      moduleType: request.moduleType,
      moduleId: request.moduleId,
      metadata: request.metadata,
    };
  } catch (error) {
    log.error('Error indexing document:', { error: error });
    throw error;
  }
}

/**
 * Performs semantic search across indexed documents via Supabase Edge Function
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
    log.debug('[fileSearchApiClient] Cache HIT - returning cached results');
    return cachedResults;
  }

  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Call Edge Function for each corpus
    const corpusIds = Array.isArray(query.corpusNames) ? query.corpusNames : [query.corpusId].filter(Boolean);

    if (corpusIds.length === 0) {
      throw new Error('At least one corpus ID must be provided');
    }

    // For simplicity, query the first corpus
    // TODO: Support multi-corpus queries by merging results
    const corpusId = corpusIds[0];

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'query_corpus',
        payload: {
          corpusId,
          query: query.query,
          resultCount: query.resultCount || 5,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to query file search: ${response.statusText}`
      );
    }

    const { result } = await response.json();

    // Convert Edge Function response to FileSearchResult format
    const results: FileSearchResult[] = [{
      content: result.answer,
      score: 1.0, // Edge Function doesn't return score yet
      documentName: 'Multiple documents',
      metadata: {
        citations: result.citations || [],
      },
    }];

    // ✅ CACHE: Store results for future queries
    fileSearchCache.set(query, results);

    // Track AI usage (fire-and-forget, non-blocking)
    const duration = (Date.now() - startTime) / 1000;
    trackAIUsage({
      operation_type: 'file_search_query', // Matches ai_usage_analytics CHECK constraint
      ai_model: 'gemini-2.0-flash-exp',
      module_type: query.moduleType,
      module_id: query.moduleId,
      duration_seconds: duration,
      request_metadata: {
        query_text: query.query,
        corpus_ids: corpusIds,
        result_count: results.length,
      },
    }).catch(err => {
      // Silently catch tracking errors - never block main flow
      log.debug('[fileSearchApiClient] Tracking error:', err);
    });

    return results;
  } catch (error) {
    log.error('Error querying file search:', { error: error });
    throw error;
  }
}

/**
 * Lists documents in a corpus with optional filters
 * @param corpusId - ID of the corpus to list documents from (optional when using Supabase)
 * @param moduleType - Optional filter by module type (single string or array)
 * @param moduleId - Optional filter by module ID
 * @returns Array of FileSearchDocument objects
 */
export async function listDocuments(
  corpusId?: string,
  moduleType?: string | string[],
  moduleId?: string
): Promise<FileSearchDocument[]> {
  // Use Supabase directly if configured
  if (USE_SUPABASE_DIRECT) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        log.warn('[fileSearchApiClient] No authenticated user');
        return [];
      }

      let query = supabase
        .from('file_search_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (corpusId) {
        query = query.eq('corpus_id', corpusId);
      }
      if (moduleType) {
        // Support multiple module types
        if (Array.isArray(moduleType)) {
          query = query.in('module_type', moduleType);
        } else {
          query = query.eq('module_type', moduleType);
        }
      }
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;

      if (error) {
        log.error('[fileSearchApiClient] Supabase error:', { error: error });
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.gemini_file_name || row.original_filename,
        displayName: row.custom_metadata?.display_name || row.original_filename,
        corpusId: row.corpus_id,
        mimeType: row.mime_type,
        sizeBytes: row.file_size_bytes,
        status: row.indexing_status || 'pending',
        createdAt: row.created_at,
        moduleType: row.module_type,
        moduleId: row.module_id,
        metadata: row.custom_metadata,
      }));
    } catch (error) {
      log.error('[fileSearchApiClient] Error listing documents from Supabase:', { error: error });
      return [];
    }
  }

  // Fallback to Python API
  try {
    const params = new URLSearchParams();
    if (corpusId) params.append('corpus_id', corpusId);
    if (moduleType) params.append('module_type', moduleType);
    if (moduleId) params.append('module_id', moduleId);

    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/file-search/documents?${params.toString()}`,
      {
        method: 'GET',
        headers,
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
    log.error('Error listing documents:', { error: error });
    throw error;
  }
}

/**
 * Deletes a document from the corpus via Supabase Edge Function
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
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'delete_document',
        payload: {
          documentId,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to delete document: ${response.statusText}`
      );
    }

    // ✅ CACHE: Invalidate cache (document deletion changes search results)
    if (moduleType) {
      fileSearchCache.invalidateModule(moduleType, moduleId);
      log.debug('[fileSearchApiClient] Cache invalidated for module:', moduleType, moduleId);
    } else {
      // If module info not provided, clear all cache to be safe
      fileSearchCache.clearAll();
      log.debug('[fileSearchApiClient] All cache cleared after document deletion');
    }
  } catch (error) {
    log.error('Error deleting document:', { error: error });
    throw error;
  }
}
