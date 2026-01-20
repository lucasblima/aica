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
// FILE TYPE DETECTION
// =============================================================================

type EdgeFunctionFileType = 'pdf' | 'pptx' | 'docx' | 'image';

/**
 * Map MIME type to Edge Function file_type parameter
 */
function getFileTypeFromMime(mimeType: string): EdgeFunctionFileType {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('presentation') || mimeType.includes('pptx')) return 'pptx';
  if (mimeType.includes('document') || mimeType.includes('docx')) return 'docx';
  if (mimeType.startsWith('image/')) return 'image';
  // Default to pdf for unknown types
  return 'pdf';
}

// =============================================================================
// FIELD MAPPING FROM process-document RESPONSE
// =============================================================================

/**
 * Map extracted_fields from process-document to OrganizationFields
 * The process-document function extracts different fields based on document type
 */
function mapExtractedFieldsToOrganizationFields(
  extractedFields: Record<string, unknown>,
  detectedType: string
): { fields: OrganizationFields; fieldConfidence: Record<string, number> } {
  const fields: OrganizationFields = {};
  const fieldConfidence: Record<string, number> = {};

  // Default confidence for mapped fields
  const defaultConfidence = 0.75;

  // CNPJ -> document_number
  if (extractedFields.cnpj) {
    fields.document_number = String(extractedFields.cnpj);
    fieldConfidence.document_number = defaultConfidence;
  }

  // razao_social -> legal_name
  if (extractedFields.razao_social) {
    fields.legal_name = String(extractedFields.razao_social);
    fieldConfidence.legal_name = defaultConfidence;
  }

  // nome_fantasia or proponente -> name
  if (extractedFields.nome_fantasia) {
    fields.name = String(extractedFields.nome_fantasia);
    fieldConfidence.name = defaultConfidence;
  } else if (extractedFields.proponente) {
    fields.name = String(extractedFields.proponente);
    fieldConfidence.name = defaultConfidence * 0.9;
  } else if (extractedFields.nome_organizacao) {
    fields.name = String(extractedFields.nome_organizacao);
    fieldConfidence.name = defaultConfidence;
  }

  // objeto_social -> description
  if (extractedFields.objeto_social) {
    fields.description = String(extractedFields.objeto_social);
    fieldConfidence.description = defaultConfidence;
  }

  // missao -> mission
  if (extractedFields.missao) {
    fields.mission = String(extractedFields.missao);
    fieldConfidence.mission = defaultConfidence;
  }

  // areas_atuacao -> areas_of_activity
  if (extractedFields.areas_atuacao && Array.isArray(extractedFields.areas_atuacao)) {
    fields.areas_of_activity = extractedFields.areas_atuacao as string[];
    fieldConfidence.areas_of_activity = defaultConfidence;
  }

  // data_constituicao -> foundation_year (extract year)
  if (extractedFields.data_constituicao) {
    const dateStr = String(extractedFields.data_constituicao);
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
      fields.foundation_year = parseInt(yearMatch[1], 10);
      fieldConfidence.foundation_year = defaultConfidence;
    }
  }

  // Map organization type based on detected document type
  if (detectedType === 'estatuto_social' || detectedType === 'estatuto') {
    // Estatutos are typically for non-profits
    fields.organization_type = 'associacao';
    fieldConfidence.organization_type = 0.6;
  }

  // Email and phone if available
  if (extractedFields.email) {
    fields.email = String(extractedFields.email);
    fieldConfidence.email = defaultConfidence;
  }
  if (extractedFields.telefone || extractedFields.phone) {
    fields.phone = String(extractedFields.telefone || extractedFields.phone);
    fieldConfidence.phone = defaultConfidence;
  }

  return { fields, fieldConfidence };
}

// =============================================================================
// PROCESS DOCUMENT
// =============================================================================

/**
 * Process document with Edge Function to extract organization fields
 * Uses the existing process-document function and maps fields for organization wizard
 */
export async function processOrganizationDocument(
  storagePath: string,
  mimeType: string,
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

  // Determine file_type from MIME type
  const fileType = getFileTypeFromMime(mimeType);

  // Call the existing process-document Edge Function
  const { data, error } = await supabase.functions.invoke('process-document', {
    body: {
      storage_path: storagePath,
      file_type: fileType,
      source: 'web',
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error('[organizationDocumentService] Edge function error:', error);
    throw new Error(`Erro ao processar documento: ${error.message}`);
  }

  if (!data.success) {
    console.error('[organizationDocumentService] Processing failed:', data.error);
    throw new Error(data.error || 'Erro desconhecido ao processar documento');
  }

  onProgress?.({
    stage: 'processing',
    progress: 90,
    message: 'Mapeando campos...',
  });

  // Map the extracted_fields to OrganizationFields
  const { fields, fieldConfidence } = mapExtractedFieldsToOrganizationFields(
    data.extracted_fields || {},
    data.detected_type || 'outro'
  );

  onProgress?.({
    stage: 'completed',
    progress: 100,
    message: 'Documento processado com sucesso!',
  });

  console.log('[organizationDocumentService] Processing completed:', {
    detectedType: data.detected_type,
    fieldsExtracted: Object.keys(fields).length,
    processingTimeMs: data.processing_time_ms,
  });

  return {
    success: true,
    documentType: data.detected_type || 'outro',
    fields,
    fieldConfidence,
    processingTimeMs: data.processing_time_ms || 0,
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
  _documentType: DocumentType = 'auto', // Kept for API compatibility, not used with process-document
  onProgress?: (progress: UploadProgress) => void
): Promise<ProcessedDocumentResult> {
  try {
    // Upload file
    const { storagePath } = await uploadOrganizationDocument(file, onProgress);

    // Process document using the file's MIME type
    const result = await processOrganizationDocument(storagePath, file.type, onProgress);

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
