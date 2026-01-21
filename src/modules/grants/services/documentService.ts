/**
 * Document Service - Upload e extração de texto de documentos fonte
 *
 * Suporta: .md, .pdf, .docx, .txt
 */

import { supabase } from '../../../services/supabaseClient';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { indexDocument } from '../../../services/fileSearchApiClient';
import type { FileSearchDocument } from '../../../types/fileSearch';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('DocumentService');

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Tipos de documentos suportados
 */
export type DocumentType = 'md' | 'pdf' | 'docx' | 'txt' | 'csv';

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
    case 'csv':
      return 'csv';
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
      error: 'Tipo de arquivo não suportado. Use: .md, .pdf, .docx, .txt ou .csv'
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
export async function uploadSourceDocument(
  file: File,
  projectId: string,
  bucket: string = 'project_sources'
): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const sanitizedName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const fileName = `${user.id}/${projectId}/${timestamp}_${sanitizedName}`;

    log.debug('Uploading:', { fileName, bucket });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      log.error('Upload error:', { error });
      throw new Error(`Falha no upload: ${error.message}`);
    }

    return data.path;
  } catch (error) {
    log.error('Upload failed:', { error });
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
 * Extrai texto de arquivo .csv
 * Converte CSV para formato texto estruturado
 */
async function extractTextFromCSV(file: File): Promise<string> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return '';
    }

    // Parse CSV manualmente (simples, sem biblioteca externa)
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    };

    // Processar header e linhas
    const header = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCsvLine(line));

    // Formatar como texto estruturado para a IA
    let output = `Arquivo CSV: ${file.name}\n\n`;
    output += `Colunas: ${header.join(', ')}\n\n`;
    output += `Total de linhas: ${rows.length}\n\n`;
    output += '--- Dados ---\n\n';

    // Incluir todas as linhas em formato legível
    rows.forEach((row, index) => {
      output += `Linha ${index + 1}:\n`;
      header.forEach((col, colIndex) => {
        if (row[colIndex]) {
          output += `  ${col}: ${row[colIndex]}\n`;
        }
      });
      output += '\n';
    });

    return output;
  } catch (error) {
    log.error('CSV extraction error:', { error });
    throw new Error('Falha ao processar arquivo CSV');
  }
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
    log.error('PDF extraction error:', { error });
    throw new Error('Falha ao processar PDF');
  }
}

/**
 * Extrai texto de arquivo .docx usando mammoth
 */
async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    if (result.messages && result.messages.length > 0) {
      log.warn('DOCX extraction warnings:', { messages: result.messages });
    }

    return result.value.trim();
  } catch (error) {
    log.error('DOCX extraction error:', { error });
    throw new Error('Falha ao processar arquivo DOCX');
  }
}

/**
 * Extrai texto do documento baseado no tipo
 */
export async function extractTextFromDocument(file: File, type: DocumentType): Promise<string> {
  log.debug('Extracting text from:', { type });

  switch (type) {
    case 'txt':
      return await extractTextFromTxt(file);
    case 'md':
      return await extractTextFromMarkdown(file);
    case 'pdf':
      return await extractTextFromPDF(file);
    case 'docx':
      return await extractTextFromDocx(file);
    case 'csv':
      return await extractTextFromCSV(file);
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
  projectId: string,
  bucket: string = 'project_sources'
): Promise<ProcessedDocument> {
  try {
    // 1. Validar tipo
    const validation = validateDocumentType(file);
    if (!validation.valid || !validation.type) {
      throw new Error(validation.error || 'Tipo de arquivo inválido');
    }

    // 2. Fazer upload
    log.debug('Uploading to storage...');
    const path = await uploadSourceDocument(file, projectId, bucket);

    // 3. Extrair texto
    log.debug('Extracting text...');
    const content = await extractTextFromDocument(file, validation.type);

    // 4. Obter URL
    const url = await getDocumentUrl(path);

    log.debug('Processing complete:', {
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
    log.error('Processing failed:', { error });
    throw error;
  }
}

/**
 * Upload e indexação automática de PDF de edital
 *
 * Combina upload para Supabase Storage + indexação no File Search (Gemini)
 * para permitir busca semântica no conteúdo do edital.
 *
 * @param file - Arquivo PDF do edital
 * @param projectId - ID do projeto de grant
 * @param corpusId - ID do corpus no File Search
 * @param displayName - Nome para exibição (ex: "Edital FAPESP 2024")
 * @param metadata - Metadados adicionais (opcional)
 * @returns Documento processado + documento indexado no File Search
 */
export async function uploadAndIndexEditalPDF(
  file: File,
  projectId: string,
  corpusId: string,
  displayName: string,
  metadata?: Record<string, any>
): Promise<{
  processed: ProcessedDocument;
  indexed: FileSearchDocument;
}> {
  try {
    log.debug('Starting upload and indexing for:', { fileName: file.name });

    // Validar que é PDF
    if (file.type !== 'application/pdf') {
      throw new Error('Apenas arquivos PDF são suportados para indexação');
    }

    // 1. Upload e processamento padrão (Supabase Storage + extração de texto)
    log.debug('Step 1: Upload to Supabase Storage...');
    const processed = await processSourceDocument(file, projectId);

    // 2. Indexação no File Search (Gemini)
    log.debug('Step 2: Indexing in File Search...');
    const indexed = await indexDocument({
      file,
      corpus_id: corpusId,
      display_name: displayName,
      module_type: 'grants',
      module_id: projectId,
      custom_metadata: {
        document_type: 'edital_pdf',
        project_id: projectId,
        storage_path: processed.path,
        storage_url: processed.url,
        ...metadata,
      },
    });

    log.debug('Upload and indexing complete!', {
      storagePath: processed.path,
      fileSearchDocId: indexed.id,
    });

    return {
      processed,
      indexed,
    };
  } catch (error) {
    log.error('Upload and indexing failed:', { error });
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
      log.error('Delete error:', { error });
      throw error;
    }

    log.debug('Deleted:', { path });
  } catch (error) {
    log.error('Delete failed:', { error });
    throw error;
  }
}
