/**
 * Opportunity Document Service - Gerenciamento de documentos de contexto do edital
 *
 * Diferente dos documentos de projeto (grant_project_documents), estes documentos
 * são vinculados ao EDITAL (opportunity) e compartilhados entre todos os projetos
 * que utilizam esse edital.
 */

import { supabase } from '@/services/supabaseClient';
import type { OpportunityDocument } from '../types';
import { processSourceDocument } from './documentService';

/**
 * Lista todos os documentos de um edital (opportunity)
 */
export async function listOpportunityDocuments(opportunityId: string): Promise<OpportunityDocument[]> {
  const { data, error } = await supabase
    .from('grant_opportunity_documents')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('uploaded_at', { ascending: true });

  if (error) {
    console.error('[OpportunityDocumentService] Error listing documents:', error);
    throw new Error('Falha ao carregar documentos do edital');
  }

  return data || [];
}

/**
 * Faz upload de um novo documento para o edital
 */
export async function uploadOpportunityDocument(
  opportunityId: string,
  file: File
): Promise<OpportunityDocument> {
  try {
    // 1. Process document (upload to storage + extract content)
    // Using 'editais' bucket for edital-level documents
    const processed = await processSourceDocument(file, opportunityId, 'editais');

    // 2. Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // 3. Create database record
    const { data, error } = await supabase
      .from('grant_opportunity_documents')
      .insert({
        opportunity_id: opportunityId,
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
      console.error('[OpportunityDocumentService] Error creating document record:', error);
      throw new Error('Falha ao salvar documento no banco de dados');
    }

    console.log('[OpportunityDocumentService] Document uploaded:', {
      id: data.id,
      file_name: file.name,
      type: processed.type,
      contentLength: processed.content?.length || 0
    });

    return data;
  } catch (error) {
    console.error('[OpportunityDocumentService] Upload error:', error);
    throw error;
  }
}

/**
 * Remove um documento do edital
 */
export async function deleteOpportunityDocument(documentId: string): Promise<void> {
  // 1. Get document info to delete from storage
  const { data: doc, error: fetchError } = await supabase
    .from('grant_opportunity_documents')
    .select('document_path')
    .eq('id', documentId)
    .single();

  if (fetchError) {
    console.error('[OpportunityDocumentService] Error fetching document:', fetchError);
    throw new Error('Falha ao buscar documento');
  }

  // 2. Delete from storage (editais bucket)
  if (doc?.document_path) {
    const { error: storageError } = await supabase.storage
      .from('editais')
      .remove([doc.document_path]);

    if (storageError) {
      console.warn('[OpportunityDocumentService] Error deleting from storage:', storageError);
      // Continue anyway - database deletion is more important
    }
  }

  // 3. Delete from database
  const { error: deleteError } = await supabase
    .from('grant_opportunity_documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    console.error('[OpportunityDocumentService] Error deleting document:', deleteError);
    throw new Error('Falha ao remover documento');
  }

  console.log('[OpportunityDocumentService] Document deleted:', documentId);
}

/**
 * Obtém todo o conteúdo combinado dos documentos de um edital
 * Usado para passar como contexto para a IA
 */
export async function getCombinedOpportunityDocumentsContent(opportunityId: string): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('get_opportunity_documents_content', { opportunity_uuid: opportunityId });

  if (error) {
    console.error('[OpportunityDocumentService] Error getting combined content:', error);
    return null;
  }

  return data || null;
}

/**
 * Conta quantos documentos um edital possui
 */
export async function countOpportunityDocuments(opportunityId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('count_opportunity_documents', { opportunity_uuid: opportunityId });

  if (error) {
    console.error('[OpportunityDocumentService] Error counting documents:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Obtém o contexto completo para geração de IA
 * Combina: texto do edital + documentos do edital + documentos do projeto
 */
export async function getFullGrantContext(
  opportunityId: string,
  projectId: string
): Promise<{
  editalContent: string | null;
  opportunityDocumentsContent: string | null;
  projectDocumentsContent: string | null;
}> {
  const { data, error } = await supabase
    .rpc('get_full_grant_context', {
      opportunity_uuid: opportunityId,
      project_uuid: projectId
    });

  if (error) {
    console.error('[OpportunityDocumentService] Error getting full context:', error);
    return {
      editalContent: null,
      opportunityDocumentsContent: null,
      projectDocumentsContent: null
    };
  }

  // The RPC returns an array with one row
  const result = data?.[0] || {};

  return {
    editalContent: result.edital_content || null,
    opportunityDocumentsContent: result.opportunity_documents_content || null,
    projectDocumentsContent: result.project_documents_content || null
  };
}
