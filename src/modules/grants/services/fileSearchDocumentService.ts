/**
 * File Search Document Service
 * CRUD operations for file_search_documents table
 * Manages uploaded PDFs for Grants module
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('FileSearchDocumentService');

// ============================================
// TYPES
// ============================================

export interface FileSearchDocument {
  id: string;
  user_id: string;
  corpus_id: string | null;
  gemini_file_name: string;
  gemini_document_name: string | null;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_url: string | null;
  custom_metadata: Record<string, unknown>;
  module_type: string | null;
  module_id: string | null;
  indexing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ListDocumentsFilters {
  module_type?: string;
  module_id?: string;
  indexing_status?: string;
}

// ============================================
// LIST DOCUMENTS
// ============================================

/**
 * List all file search documents for the current user
 */
export async function listFileSearchDocuments(
  filters: ListDocumentsFilters = {}
): Promise<FileSearchDocument[]> {
  try {
    let query = supabase
      .from('file_search_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.module_type) {
      query = query.eq('module_type', filters.module_type);
    }

    if (filters.module_id) {
      query = query.eq('module_id', filters.module_id);
    }

    if (filters.indexing_status) {
      query = query.eq('indexing_status', filters.indexing_status);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error listing file search documents:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    log.error('Failed to list file search documents:', error);
    throw error;
  }
}

/**
 * List documents specifically for grants module
 */
export async function listGrantsDocuments(): Promise<FileSearchDocument[]> {
  return listFileSearchDocuments({ module_type: 'grants' });
}

// ============================================
// GET DOCUMENT
// ============================================

/**
 * Get a single document by ID
 */
export async function getFileSearchDocument(
  documentId: string
): Promise<FileSearchDocument | null> {
  try {
    const { data, error } = await supabase
      .from('file_search_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      log.error('Error getting file search document:', error);
      throw error;
    }

    return data;
  } catch (error) {
    log.error('Failed to get file search document:', error);
    throw error;
  }
}

// ============================================
// DELETE DOCUMENT
// ============================================

/**
 * Delete a file search document
 * Note: This only deletes the database record.
 * The file in Google's servers will expire automatically after 48h.
 */
export async function deleteFileSearchDocument(
  documentId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('file_search_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      log.error('Error deleting file search document:', error);
      throw error;
    }

    log.debug(`Document ${documentId} deleted successfully`);
  } catch (error) {
    log.error('Failed to delete file search document:', error);
    throw error;
  }
}

/**
 * Delete multiple documents at once
 */
export async function deleteMultipleDocuments(
  documentIds: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('file_search_documents')
      .delete()
      .in('id', documentIds);

    if (error) {
      log.error('Error deleting multiple documents:', error);
      throw error;
    }

    log.debug(`${documentIds.length} documents deleted successfully`);
  } catch (error) {
    log.error('Failed to delete multiple documents:', error);
    throw error;
  }
}

// ============================================
// UPDATE DOCUMENT
// ============================================

/**
 * Update document metadata (module_id, custom_metadata)
 */
export async function updateFileSearchDocument(
  documentId: string,
  updates: Partial<Pick<FileSearchDocument, 'module_id' | 'custom_metadata' | 'indexing_status'>>
): Promise<FileSearchDocument> {
  try {
    const { data, error } = await supabase
      .from('file_search_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      log.error('Error updating file search document:', error);
      throw error;
    }

    return data;
  } catch (error) {
    log.error('Failed to update file search document:', error);
    throw error;
  }
}

/**
 * Link a document to an opportunity (edital)
 */
export async function linkDocumentToOpportunity(
  documentId: string,
  opportunityId: string
): Promise<FileSearchDocument> {
  return updateFileSearchDocument(documentId, {
    module_id: opportunityId
  });
}

// ============================================
// STATS
// ============================================

/**
 * Get document statistics for grants module
 */
export async function getGrantsDocumentStats(): Promise<{
  total: number;
  pending: number;
  completed: number;
  failed: number;
  totalSizeMB: number;
}> {
  try {
    const documents = await listGrantsDocuments();

    const stats = {
      total: documents.length,
      pending: documents.filter(d => d.indexing_status === 'pending' || d.indexing_status === 'processing').length,
      completed: documents.filter(d => d.indexing_status === 'completed').length,
      failed: documents.filter(d => d.indexing_status === 'failed').length,
      totalSizeMB: documents.reduce((acc, d) => acc + (d.file_size_bytes || 0), 0) / (1024 * 1024)
    };

    return stats;
  } catch (error) {
    log.error('Failed to get grants document stats:', error);
    throw error;
  }
}

// ============================================
// CHECK DUPLICATES
// ============================================

/**
 * Check if a document with the same filename already exists
 */
export async function checkDuplicateDocument(
  filename: string,
  moduleType: string = 'grants'
): Promise<FileSearchDocument | null> {
  try {
    const { data, error } = await supabase
      .from('file_search_documents')
      .select('*')
      .eq('original_filename', filename)
      .eq('module_type', moduleType)
      .limit(1)
      .maybeSingle();

    if (error) {
      log.error('Error checking duplicate document:', error);
      throw error;
    }

    return data;
  } catch (error) {
    log.error('Failed to check duplicate document:', error);
    throw error;
  }
}
