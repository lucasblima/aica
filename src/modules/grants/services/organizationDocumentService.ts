/**
 * Organization Document Service
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Handles upload and processing of organization documents (Cartao CNPJ, etc.)
 * for automatic field extraction and wizard auto-fill.
 */

import { supabase } from '@/services/supabaseClient';
import type { Organization } from '../types/organizations';

// =============================================================================
// TYPES
// =============================================================================

export type DocumentType = 'cartao_cnpj' | 'estatuto' | 'comprovante_endereco' | 'auto';

export interface OrganizationFields {
  // Identification
  document_number?: string;
  legal_name?: string;
  name?: string;
  organization_type?: 'ong' | 'empresa' | 'instituto' | 'associacao' | 'cooperativa' | 'governo' | 'outro';

  // Contact
  email?: string;
  phone?: string;

  // Address
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;

  // Context
  foundation_year?: number;
  areas_of_activity?: string[];
  description?: string;
  mission?: string;
}

export interface ProcessedDocumentResult {
  success: boolean;
  documentType: string;
  fields: OrganizationFields;
  fieldConfidence: Record<string, number>;
  processingTimeMs: number;
  error?: string;
}

export interface UploadProgress {
  stage: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BUCKET_NAME = 'organization-documents';

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// =============================================================================
// FILE VALIDATION
// =============================================================================

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo nao suportado. Use PDF, PNG, JPG ou WebP.`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / 1024 / 1024);
    return {
      valid: false,
      error: `Arquivo muito grande (${sizeMB}MB). Maximo permitido: 20MB.`,
    };
  }

  return { valid: true };
}

// =============================================================================
// FILE NAME SANITIZATION
// =============================================================================

/**
 * Sanitize file name for storage
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s.-]/g, '_') // Replace special chars
    .replace(/\s+/g, '_') // Replace spaces
    .replace(/_+/g, '_') // Remove consecutive underscores
    .substring(0, 200); // Limit length
}

// =============================================================================
// UPLOAD TO STORAGE
// =============================================================================

/**
 * Upload file to Supabase Storage
 */
export async function uploadOrganizationDocument(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ storagePath: string; publicUrl: string }> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  onProgress?.({
    stage: 'uploading',
    progress: 10,
    message: 'Enviando arquivo...',
  });

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuario nao autenticado');
  }

  // Create storage path
  const timestamp = Date.now();
  const sanitizedName = sanitizeFileName(file.name);
  const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;

  onProgress?.({
    stage: 'uploading',
    progress: 30,
    message: 'Salvando no servidor...',
  });

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    // Provide more specific error messages based on error type
    console.error('[organizationDocumentService] Upload error:', uploadError);

    if (uploadError.message?.includes('Bucket not found') ||
        uploadError.message?.includes('bucket') ||
        (uploadError as unknown as { statusCode?: number }).statusCode === 400) {
      throw new Error(
        'O bucket de armazenamento não está configurado. ' +
        'Por favor, entre em contato com o suporte técnico. ' +
        `(Detalhes: ${uploadError.message})`
      );
    }

    if (uploadError.message?.includes('duplicate') || uploadError.message?.includes('already exists')) {
      throw new Error('Um arquivo com este nome já existe. Tente renomear o arquivo.');
    }

    if (uploadError.message?.includes('size') || uploadError.message?.includes('limit')) {
      throw new Error('O arquivo excede o tamanho máximo permitido de 20MB.');
    }

    if (uploadError.message?.includes('type') || uploadError.message?.includes('mime')) {
      throw new Error('Tipo de arquivo não permitido. Use PDF, PNG, JPG ou WebP.');
    }

    throw new Error(`Erro ao enviar arquivo: ${uploadError.message}`);
  }

  onProgress?.({
    stage: 'uploading',
    progress: 50,
    message: 'Arquivo enviado com sucesso',
  });

  // Get public URL (signed for private bucket)
  const { data: urlData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  return {
    storagePath: `${BUCKET_NAME}/${storagePath}`,
    publicUrl: urlData?.signedUrl || '',
  };
}

// =============================================================================
// PROCESS DOCUMENT
// =============================================================================

/**
 * Process document with Edge Function to extract organization fields
 */
export async function processOrganizationDocument(
  storagePath: string,
  documentType: DocumentType = 'auto',
  onProgress?: (progress: UploadProgress) => void
): Promise<ProcessedDocumentResult> {
  onProgress?.({
    stage: 'processing',
    progress: 60,
    message: 'Analisando documento...',
  });

  // Get auth token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  onProgress?.({
    stage: 'processing',
    progress: 70,
    message: 'Extraindo informacoes...',
  });

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke('process-organization-document', {
    body: {
      storage_path: storagePath,
      document_type: documentType,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(`Erro ao processar documento: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Erro desconhecido ao processar documento');
  }

  onProgress?.({
    stage: 'completed',
    progress: 100,
    message: 'Documento processado com sucesso!',
  });

  return {
    success: true,
    documentType: data.document_type,
    fields: data.fields,
    fieldConfidence: data.field_confidence,
    processingTimeMs: data.processing_time_ms,
  };
}

// =============================================================================
// COMBINED UPLOAD + PROCESS
// =============================================================================

/**
 * Upload and process document in one operation
 */
export async function uploadAndProcessOrganizationDocument(
  file: File,
  documentType: DocumentType = 'auto',
  onProgress?: (progress: UploadProgress) => void
): Promise<ProcessedDocumentResult> {
  try {
    // Upload file
    const { storagePath } = await uploadOrganizationDocument(file, onProgress);

    // Process document
    const result = await processOrganizationDocument(storagePath, documentType, onProgress);

    return result;
  } catch (error) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });

    return {
      success: false,
      documentType: 'unknown',
      fields: {},
      fieldConfidence: {},
      processingTimeMs: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// =============================================================================
// FIELD MAPPING TO ORGANIZATION
// =============================================================================

/**
 * Map extracted fields to Organization partial
 * Only includes fields with confidence above threshold
 */
export function mapFieldsToOrganization(
  fields: OrganizationFields,
  fieldConfidence: Record<string, number>,
  confidenceThreshold: number = 0.6
): Partial<Organization> {
  const result: Partial<Organization> = {};

  // Helper to conditionally add field
  const addField = <K extends keyof OrganizationFields>(
    fieldKey: K,
    orgKey: keyof Organization = fieldKey as keyof Organization
  ) => {
    const value = fields[fieldKey];
    const confidence = fieldConfidence[fieldKey] || 0;

    if (value !== undefined && value !== null && confidence >= confidenceThreshold) {
      (result as Record<string, unknown>)[orgKey] = value;
    }
  };

  // Map all fields
  addField('document_number');
  addField('legal_name');
  addField('name');
  addField('organization_type');
  addField('email');
  addField('phone');
  addField('address_street');
  addField('address_number');
  addField('address_complement');
  addField('address_neighborhood');
  addField('address_city');
  addField('address_state');
  addField('address_zip');
  addField('foundation_year');
  addField('areas_of_activity');
  addField('description');
  addField('mission');

  return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  validateFile,
  uploadOrganizationDocument,
  processOrganizationDocument,
  uploadAndProcessOrganizationDocument,
  mapFieldsToOrganization,
};
