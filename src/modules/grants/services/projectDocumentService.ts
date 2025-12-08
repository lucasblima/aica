/**
 * Project Document Service - Gerenciamento de múltiplos documentos por projeto
 */

import { supabase } from '@/services/supabaseClient';
import type { ProjectDocument } from '../types';
import { processSourceDocument } from './documentService';

/**
 * Lista todos os documentos de um projeto
 */
export async function listProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const { data, error } = await supabase
    .from('grant_project_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: true });

  if (error) {
    console.error('Error listing project documents:', error);
    throw new Error('Falha ao carregar documentos do projeto');
  }

  return data || [];
}

/**
 * Faz upload de um novo documento para o projeto
 */
export async function uploadProjectDocument(
  projectId: string,
  file: File
): Promise<ProjectDocument> {
  try {
    // 1. Process document (upload to storage + extract content)
    const processed = await processSourceDocument(file, projectId);

    // 2. Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // 3. Create database record
    const { data, error } = await supabase
      .from('grant_project_documents')
      .insert({
        project_id: projectId,
        user_id: user.id,
        file_name: file.name,
        document_path: processed.path,
        document_type: processed.type,
        document_content: processed.content,
        file_size_bytes: file.size
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document record:', error);
      throw new Error('Falha ao salvar documento no banco de dados');
    }

    console.log('[ProjectDocumentService] Document uploaded:', {
      id: data.id,
      file_name: file.name,
      type: processed.type,
      contentLength: processed.content?.length || 0
    });

    return data;
  } catch (error) {
    console.error('[ProjectDocumentService] Upload error:', error);
    throw error;
  }
}

/**
 * Remove um documento do projeto
 */
export async function deleteProjectDocument(documentId: string): Promise<void> {
  // 1. Get document info to delete from storage
  const { data: doc, error: fetchError } = await supabase
    .from('grant_project_documents')
    .select('document_path')
    .eq('id', documentId)
    .single();

  if (fetchError) {
    console.error('Error fetching document:', fetchError);
    throw new Error('Falha ao buscar documento');
  }

  // 2. Delete from storage
  if (doc?.document_path) {
    const { error: storageError } = await supabase.storage
      .from('project_sources')
      .remove([doc.document_path]);

    if (storageError) {
      console.warn('Error deleting from storage:', storageError);
      // Continue anyway - database deletion is more important
    }
  }

  // 3. Delete from database
  const { error: deleteError } = await supabase
    .from('grant_project_documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    console.error('Error deleting document:', deleteError);
    throw new Error('Falha ao remover documento');
  }

  console.log('[ProjectDocumentService] Document deleted:', documentId);
}

/**
 * Obtém todo o conteúdo combinado dos documentos de um projeto
 * Usado para passar como contexto para a IA
 */
export async function getCombinedDocumentsContent(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('get_project_documents_content', { project_uuid: projectId });

  if (error) {
    console.error('Error getting combined content:', error);
    return null;
  }

  return data || null;
}

/**
 * Conta quantos documentos um projeto possui
 */
export async function countProjectDocuments(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('count_project_documents', { project_uuid: projectId });

  if (error) {
    console.error('Error counting documents:', error);
    return 0;
  }

  return data || 0;
}
