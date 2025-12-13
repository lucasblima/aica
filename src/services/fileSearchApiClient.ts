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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Flag to use Supabase directly instead of Python backend
const USE_SUPABASE_DIRECT = true;

/**
 * Get the JWT token from Supabase session for backend API calls
 * @returns JWT token or null if no session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('[fileSearchApiClient] Error getting auth token:', error);
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
 * @param moduleType - Optional filter by module type
 * @param moduleId - Optional filter by module ID
 * @returns Array of FileSearchCorpus objects
 */
export async function listCorpora(
  moduleType?: string,
  moduleId?: string
): Promise<FileSearchCorpus[]> {
  // Use Supabase directly if configured
  if (USE_SUPABASE_DIRECT) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[fileSearchApiClient] No authenticated user');
        return [];
      }

      let query = supabase
        .from('file_search_corpora')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (moduleType) {
        query = query.eq('module_type', moduleType);
      }
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[fileSearchApiClient] Supabase error:', error);
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
      console.error('[fileSearchApiClient] Error listing corpora from Supabase:', error);
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
    console.error('Error listing corpora:', error);
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
        console.log('[fileSearchApiClient] Corpus already exists, returning existing:', name);
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
          console.log('[fileSearchApiClient] Duplicate detected, fetching existing corpus');
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
      console.error('[fileSearchApiClient] Error creating corpus in Supabase:', error);
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

    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/file-search/documents`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/file-search/query`, {
      method: 'POST',
      headers,
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
 * @param corpusId - ID of the corpus to list documents from (optional when using Supabase)
 * @param moduleType - Optional filter by module type
 * @param moduleId - Optional filter by module ID
 * @returns Array of FileSearchDocument objects
 */
export async function listDocuments(
  corpusId?: string,
  moduleType?: string,
  moduleId?: string
): Promise<FileSearchDocument[]> {
  // Use Supabase directly if configured
  if (USE_SUPABASE_DIRECT) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[fileSearchApiClient] No authenticated user');
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
        query = query.eq('module_type', moduleType);
      }
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[fileSearchApiClient] Supabase error:', error);
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
      console.error('[fileSearchApiClient] Error listing documents from Supabase:', error);
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
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/file-search/documents/${documentId}`,
      {
        method: 'DELETE',
        headers,
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
