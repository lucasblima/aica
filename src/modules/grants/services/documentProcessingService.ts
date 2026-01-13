/**
 * Document Processing Service
 * Issue #114 - Upload e extração de conteúdo de documentos
 *
 * @module modules/grants/services/documentProcessingService
 */

import { supabase } from '@/services/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export type FileType = 'pdf' | 'pptx' | 'docx' | 'image';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessedDocument {
  id: string;
  user_id: string;
  organization_id: string | null;
  project_id: string | null;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  raw_text: string | null;
  structured_data: Record<string, unknown>;
  detected_type: string | null;
  confidence: number | null;
  extracted_fields: Record<string, unknown>;
  page_count: number | null;
  word_count: number | null;
  has_images: boolean;
  processing_time_ms: number | null;
  processing_status: ProcessingStatus;
  error_message: string | null;
  source: string;
  source_phone: string | null;
  whatsapp_message_id: string | null;
  uploaded_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkSuggestion {
  id: string;
  document_id: string;
  entity_type: 'organization' | 'project' | 'opportunity';
  entity_id: string;
  entity_name?: string;
  match_reason: 'cnpj' | 'name_similarity' | 'pronac' | 'context';
  confidence: number;
  is_confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
}

export interface UploadDocumentOptions {
  file: File;
  organizationId?: string;
  projectId?: string;
  source?: 'web' | 'whatsapp' | 'email';
  sourcePhone?: string;
}

export interface ProcessDocumentRequest {
  storage_path: string;
  file_type: FileType;
  organization_id?: string;
  project_id?: string;
  source?: 'web' | 'whatsapp' | 'email';
  source_phone?: string;
}

export interface ProcessDocumentResponse {
  success: boolean;
  document_id: string;
  detected_type: string;
  confidence: number;
  extracted_fields: Record<string, unknown>;
  chunks_created: number;
  embeddings_created: number;
  link_suggestions: LinkSuggestion[];
  processing_time_ms: number;
  error?: string;
}

// =============================================================================
// FILE TYPE UTILITIES
// =============================================================================

const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

export function getFileType(mimeType: string): FileType | null {
  return MIME_TO_FILE_TYPE[mimeType] || null;
}

// =============================================================================
// UPLOAD SERVICE
// =============================================================================

/**
 * Upload file to Supabase Storage
 */
export async function uploadFileToStorage(file: File): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Usuário não autenticado');

  const userId = userData.user.id;
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${userId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from('processed-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  return storagePath;
}

/**
 * Upload and process a document
 */
export async function uploadAndProcessDocument(
  options: UploadDocumentOptions
): Promise<ProcessDocumentResponse> {
  const { file, organizationId, projectId, source = 'web', sourcePhone } = options;

  // 1. Validate file type
  const fileType = getFileType(file.type);
  if (!fileType) {
    throw new Error(`Tipo de arquivo não suportado: ${file.type}`);
  }

  // 2. Upload to storage
  const storagePath = await uploadFileToStorage(file);

  // 3. Call Edge Function to process
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Sessão não encontrada');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify({
        storage_path: storagePath,
        file_type: fileType,
        organization_id: organizationId,
        project_id: projectId,
        source,
        source_phone: sourcePhone,
      } as ProcessDocumentRequest),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ao processar documento: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// DOCUMENT CRUD
// =============================================================================

/**
 * Get all processed documents for current user
 */
export async function getProcessedDocuments(options?: {
  organizationId?: string;
  projectId?: string;
  status?: ProcessingStatus;
  limit?: number;
}): Promise<ProcessedDocument[]> {
  let query = supabase
    .from('processed_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.organizationId) {
    query = query.eq('organization_id', options.organizationId);
  }

  if (options?.projectId) {
    query = query.eq('project_id', options.projectId);
  }

  if (options?.status) {
    query = query.eq('processing_status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get a single processed document by ID
 */
export async function getProcessedDocument(documentId: string): Promise<ProcessedDocument | null> {
  const { data, error } = await supabase
    .from('processed_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Delete a processed document
 */
export async function deleteProcessedDocument(documentId: string): Promise<void> {
  // Get document to find storage path
  const doc = await getProcessedDocument(documentId);
  if (!doc) throw new Error('Documento não encontrado');

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('processed-documents')
    .remove([doc.storage_path]);

  if (storageError) {
    console.error('Error deleting from storage:', storageError);
  }

  // Delete from database (cascades to chunks and embeddings)
  const { error } = await supabase.from('processed_documents').delete().eq('id', documentId);

  if (error) throw error;
}

/**
 * Update document organization/project links
 */
export async function updateDocumentLinks(
  documentId: string,
  updates: { organizationId?: string; projectId?: string }
): Promise<ProcessedDocument> {
  const { data, error } = await supabase
    .from('processed_documents')
    .update({
      organization_id: updates.organizationId,
      project_id: updates.projectId,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// LINK SUGGESTIONS
// =============================================================================

/**
 * Get link suggestions for a document
 */
export async function getDocumentLinkSuggestions(documentId: string): Promise<LinkSuggestion[]> {
  const { data, error } = await supabase
    .from('document_link_suggestions')
    .select('*')
    .eq('document_id', documentId)
    .eq('is_confirmed', false)
    .order('confidence', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Confirm a link suggestion
 */
export async function confirmLinkSuggestion(suggestionId: string): Promise<void> {
  const { data: suggestion, error: fetchError } = await supabase
    .from('document_link_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  if (fetchError) throw fetchError;

  // Update suggestion as confirmed
  const { error: updateError } = await supabase
    .from('document_link_suggestions')
    .update({
      is_confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (updateError) throw updateError;

  // Update document with the link
  const updates: Record<string, string> = {};
  if (suggestion.entity_type === 'organization') {
    updates.organization_id = suggestion.entity_id;
  } else if (suggestion.entity_type === 'project') {
    updates.project_id = suggestion.entity_id;
  }

  if (Object.keys(updates).length > 0) {
    const { error: docError } = await supabase
      .from('processed_documents')
      .update(updates)
      .eq('id', suggestion.document_id);

    if (docError) throw docError;
  }
}

/**
 * Reject a link suggestion
 */
export async function rejectLinkSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from('document_link_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (error) throw error;
}

// =============================================================================
// SEMANTIC SEARCH
// =============================================================================

export interface SemanticSearchResult {
  document_id: string;
  chunk_id: string;
  chunk_text: string;
  similarity: number;
  document_name: string;
  detected_type: string | null;
  organization_id?: string;
  project_id?: string;
}

export interface SemanticSearchOptions {
  organizationId?: string;
  projectId?: string;
  limit?: number;
  threshold?: number;
  documentTypes?: string[];
}

export interface SemanticSearchResponse {
  success: boolean;
  results: SemanticSearchResult[];
  query: string;
  total_results: number;
  search_time_ms: number;
  embedding_model: string;
  error?: string;
}

/**
 * Search documents by semantic similarity using RAG
 * Issue #116 - Embeddings and Semantic Search
 */
export async function searchDocuments(
  query: string,
  options?: SemanticSearchOptions
): Promise<SemanticSearchResult[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Sessão não encontrada');

  // Call Edge Function for semantic search with embedding generation
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-documents`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify({
        query,
        organization_id: options?.organizationId,
        project_id: options?.projectId,
        limit: options?.limit || 10,
        threshold: options?.threshold || 0.7,
        document_types: options?.documentTypes,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error || 'Erro na busca semântica');
  }

  const data = (await response.json()) as SemanticSearchResponse;

  if (!data.success) {
    throw new Error(data.error || 'Erro na busca semântica');
  }

  return data.results;
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Get document processing statistics
 */
export async function getDocumentStats(): Promise<{
  total: number;
  completed: number;
  processing: number;
  failed: number;
  byType: Record<string, number>;
}> {
  const { data, error } = await supabase.from('processed_documents').select('processing_status, detected_type');

  if (error) throw error;

  const docs = data || [];
  const stats = {
    total: docs.length,
    completed: docs.filter((d) => d.processing_status === 'completed').length,
    processing: docs.filter((d) => d.processing_status === 'processing').length,
    failed: docs.filter((d) => d.processing_status === 'failed').length,
    byType: {} as Record<string, number>,
  };

  for (const doc of docs) {
    if (doc.detected_type) {
      stats.byType[doc.detected_type] = (stats.byType[doc.detected_type] || 0) + 1;
    }
  }

  return stats;
}
