/**
 * Edital Indexing Service
 *
 * Handles indexing of edital documents in Google File Search.
 * This service bridges the gap between Supabase Storage and Google File Search.
 *
 * Issue #159: Integrate upload with Google File Search
 */

import { supabase } from '../../../services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('EditalIndexingService');

export interface IndexEditalParams {
  /** ID of the opportunity (used as corpus module_id) */
  opportunityId: string;
  /** Display name for the document */
  displayName: string;
  /** Extracted text content from the PDF */
  textContent: string;
  /** Storage path of the uploaded PDF */
  storagePath: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface IndexedDocument {
  id: string;
  corpus_id: string;
  gemini_file_id: string | null;
  display_name: string;
  status: string;
  created_at: string;
}

/**
 * Index an edital document in Google File Search
 *
 * This function:
 * 1. Creates or retrieves the corpus for the opportunity
 * 2. Sends the text content to the file-search-corpus Edge Function
 * 3. Tracks the indexed document in file_search_documents table
 *
 * @example
 * ```ts
 * const result = await indexEditalDocument({
 *   opportunityId: 'opp-123',
 *   displayName: 'Edital FAPESP 2024',
 *   textContent: '... extracted text ...',
 *   storagePath: 'user-id/timestamp_filename.pdf'
 * });
 * ```
 */
export async function indexEditalDocument(params: IndexEditalParams): Promise<IndexedDocument> {
  const { opportunityId, displayName, textContent, storagePath, metadata = {} } = params;

  try {
    log.debug('Indexing edital document:', { opportunityId, displayName, storagePath });

    // 1. Call the file-search-corpus Edge Function to index the document
    const { data, error } = await supabase.functions.invoke('file-search-corpus', {
      body: {
        action: 'index_text',
        module_type: 'grants',
        module_id: opportunityId,
        display_name: displayName,
        content: textContent,
        metadata: {
          document_type: 'edital_pdf',
          storage_path: storagePath,
          opportunity_id: opportunityId,
          indexed_at: new Date().toISOString(),
          ...metadata
        }
      }
    });

    if (error) {
      log.error('Edge Function error:', error);
      throw new Error(`Failed to index document: ${error.message}`);
    }

    log.debug('Document indexed successfully:', data);

    return {
      id: data.document_id || data.id,
      corpus_id: data.corpus_id,
      gemini_file_id: data.gemini_file_id || null,
      display_name: displayName,
      status: 'indexed',
      created_at: new Date().toISOString()
    };
  } catch (error) {
    log.error('Failed to index edital document:', error);
    throw error;
  }
}

/**
 * Index a document file directly (for documents already in Supabase Storage)
 *
 * @param file - The file to index
 * @param opportunityId - The opportunity ID
 * @param displayName - Display name for the document
 */
export async function indexEditalFile(
  file: File,
  opportunityId: string,
  displayName: string
): Promise<IndexedDocument> {
  try {
    log.debug('Indexing edital file:', { opportunityId, displayName, fileName: file.name });

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module_type', 'grants');
    formData.append('module_id', opportunityId);
    formData.append('display_name', displayName);
    formData.append('metadata', JSON.stringify({
      document_type: 'edital_pdf',
      opportunity_id: opportunityId,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type
    }));

    // Call the file-search-corpus Edge Function with file
    const { data, error } = await supabase.functions.invoke('file-search-corpus', {
      body: formData
    });

    if (error) {
      log.error('Edge Function error:', error);
      throw new Error(`Failed to index file: ${error.message}`);
    }

    log.debug('File indexed successfully:', data);

    return {
      id: data.document_id || data.id,
      corpus_id: data.corpus_id,
      gemini_file_id: data.gemini_file_id || null,
      display_name: displayName,
      status: 'indexed',
      created_at: new Date().toISOString()
    };
  } catch (error) {
    log.error('Failed to index edital file:', error);
    throw error;
  }
}

/**
 * Search in edital documents using semantic search
 *
 * @param opportunityId - The opportunity ID to search in
 * @param query - The search query
 * @param resultCount - Number of results to return
 */
export async function searchInEdital(
  opportunityId: string,
  query: string,
  resultCount: number = 5
): Promise<any[]> {
  try {
    log.debug('Searching in edital:', { opportunityId, query, resultCount });

    const { data, error } = await supabase.functions.invoke('file-search', {
      body: {
        action: 'search',
        module_type: 'grants',
        module_id: opportunityId,
        query,
        result_count: resultCount
      }
    });

    if (error) {
      log.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }

    return data.results || [];
  } catch (error) {
    log.error('Failed to search in edital:', error);
    throw error;
  }
}

/**
 * Check if an opportunity has indexed documents
 */
export async function hasIndexedDocuments(opportunityId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('file_search_documents')
      .select('id')
      .eq('module_type', 'grants')
      .eq('module_id', opportunityId)
      .eq('status', 'indexed')
      .limit(1);

    if (error) {
      log.error('Error checking indexed documents:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    log.error('Failed to check indexed documents:', error);
    return false;
  }
}

/**
 * Get all indexed documents for an opportunity
 */
export async function getIndexedDocuments(opportunityId: string): Promise<IndexedDocument[]> {
  try {
    const { data, error } = await supabase
      .from('file_search_documents')
      .select('*')
      .eq('module_type', 'grants')
      .eq('module_id', opportunityId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching indexed documents:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    log.error('Failed to get indexed documents:', error);
    throw error;
  }
}
