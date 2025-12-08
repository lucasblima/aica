/**
 * Document Service - Upload e extração de texto de documentos fonte
 *
 * Suporta: .md, .pdf, .docx, .txt
 */

import { supabase } from '../../../services/supabaseClient';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Tipos de documentos suportados
 */
export type DocumentType = 'md' | 'pdf' | 'docx' | 'txt';

/**
 * Resultado do processamento do documento
 */
export interface ProcessedDocument {
  path: string;
  type: DocumentType;
  content: string;
  url: string;
}

/**
 * Detecta o tipo do documento pelo nome do arquivo
 */
function detectDocumentType(fileName: string): DocumentType | null {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'md':
    case 'markdown':
      return 'md';
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'txt':
      return 'txt';
    default:
      return null;
  }
}

/**
 * Sanitiza nome de arquivo
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);
}

/**
 * Valida tipo de arquivo
 */
export function validateDocumentType(file: File): { valid: boolean; type: DocumentType | null; error?: string } {
  const type = detectDocumentType(file.name);

  if (!type) {
    return {
      valid: false,
      type: null,
      error: 'Tipo de arquivo não suportado. Use: .md, .pdf, .docx ou .txt'
    };
  }

  // Validar tamanho (máx 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      type,
      error: 'Arquivo muito grande. Máximo: 10MB'
    };
  }

  return { valid: true, type };
}

/**
 * Faz upload de documento para Supabase Storage
 */
export async function uploadSourceDocument(file: File, projectId: string): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const sanitizedName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const fileName = `${user.id}/${projectId}/${timestamp}_${sanitizedName}`;

    console.log('[Document] Uploading:', fileName);

    const { data, error } = await supabase.storage
      .from('project_sources')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[Document] Upload error:', error);
      throw new Error(`Falha no upload: ${error.message}`);
    }

    return data.path;
  } catch (error) {
    console.error('[Document] Upload failed:', error);
    throw error;
  }
}

/**
 * Extrai texto de arquivo .txt
 */
async function extractTextFromTxt(file: File): Promise<string> {
  const text = await file.text();
  return text;
}

/**
 * Extrai texto de arquivo .md (Markdown)
 */
async function extractTextFromMarkdown(file: File): Promise<string> {
  const text = await file.text();
  // Markdown é texto puro, retorna direto
  return text;
}

/**
 * Extrai texto de arquivo .pdf
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += `${pageText}\n\n`;
    }

    return fullText.trim();
  } catch (error) {
    console.error('[Document] PDF extraction error:', error);
    throw new Error('Falha ao processar PDF');
  }
}

/**
 * Extrai texto de arquivo .docx
 *
 * NOTA: Para extração completa de DOCX, seria necessário usar uma biblioteca
 * como 'mammoth' ou 'docx-preview'. Por enquanto, retorna mensagem de aviso.
 *
 * TODO: Implementar extração real de DOCX
 */
async function extractTextFromDocx(file: File): Promise<string> {
  // Por enquanto, apenas avisar que DOCX não é totalmente suportado
  return `[AVISO] Extração automática de arquivos .docx ainda não implementada.

Por favor, use um destes formatos alternativos:
- .txt (texto puro)
- .md (Markdown)
- .pdf (PDF)

Ou cole o conteúdo manualmente no briefing.

Nome do arquivo: ${file.name}
Tamanho: ${(file.size / 1024).toFixed(2)} KB`;
}

/**
 * Extrai texto do documento baseado no tipo
 */
export async function extractTextFromDocument(file: File, type: DocumentType): Promise<string> {
  console.log('[Document] Extracting text from:', type);

  switch (type) {
    case 'txt':
      return await extractTextFromTxt(file);
    case 'md':
      return await extractTextFromMarkdown(file);
    case 'pdf':
      return await extractTextFromPDF(file);
    case 'docx':
      return await extractTextFromDocx(file);
    default:
      throw new Error(`Tipo de documento não suportado: ${type}`);
  }
}

/**
 * Obtém URL pública de um documento
 */
export async function getDocumentUrl(path: string): Promise<string> {
  const { data } = supabase.storage
    .from('project_sources')
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Fluxo completo: Validação → Upload → Extração
 */
export async function processSourceDocument(
  file: File,
  projectId: string
): Promise<ProcessedDocument> {
  try {
    // 1. Validar tipo
    const validation = validateDocumentType(file);
    if (!validation.valid || !validation.type) {
      throw new Error(validation.error || 'Tipo de arquivo inválido');
    }

    // 2. Fazer upload
    console.log('[Document] Uploading to storage...');
    const path = await uploadSourceDocument(file, projectId);

    // 3. Extrair texto
    console.log('[Document] Extracting text...');
    const content = await extractTextFromDocument(file, validation.type);

    // 4. Obter URL
    const url = await getDocumentUrl(path);

    console.log('[Document] Processing complete:', {
      path,
      type: validation.type,
      contentLength: content.length
    });

    return {
      path,
      type: validation.type,
      content,
      url
    };
  } catch (error) {
    console.error('[Document] Processing failed:', error);
    throw error;
  }
}

/**
 * Deleta documento do storage
 */
export async function deleteSourceDocument(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('project_sources')
      .remove([path]);

    if (error) {
      console.error('[Document] Delete error:', error);
      throw error;
    }

    console.log('[Document] Deleted:', path);
  } catch (error) {
    console.error('[Document] Delete failed:', error);
    throw error;
  }
}
