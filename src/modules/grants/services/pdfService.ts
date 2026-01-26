/**
 * PDF Service - Upload e extração de texto de PDFs de editais
 */

import { supabase } from '../../../services/supabaseClient';
import * as pdfjsLib from 'pdfjs-dist';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Pdfservice');

// Configure o worker do PDF.js para Vite
// Usando new URL com import.meta.url para garantir que o bundler resolva corretamente
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Sanitiza nome de arquivo removendo caracteres especiais
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s.-]/g, '_') // Substitui caracteres especiais por _
    .replace(/\s+/g, '_') // Substitui espaços por _
    .replace(/_+/g, '_') // Remove múltiplos underscores consecutivos
    .substring(0, 200); // Limita tamanho
}

/**
 * Faz upload de um PDF para o Supabase Storage
 */
export async function uploadEditalPDF(file: File): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Sanitizar nome do arquivo
    const sanitizedName = sanitizeFileName(file.name);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const fileName = `${user.id}/${timestamp}_${sanitizedName}`;

    log.debug('Nome original:', file.name);
    log.debug('Nome sanitizado:', fileName);

    // Upload para o bucket 'editais'
    const { data, error } = await supabase.storage
      .from('editais')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      log.error('Erro no upload:', error);
      throw new Error(`Falha no upload: ${error.message}`);
    }

    // Retornar o path do arquivo
    return data.path;
  } catch (error) {
    log.error('Erro em uploadEditalPDF:', error);
    throw error;
  }
}

/**
 * Obtém a URL pública de um PDF armazenado
 */
export async function getEditalPDFUrl(path: string): Promise<string> {
  try {
    const { data } = supabase.storage
      .from('editais')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    log.error('Erro em getEditalPDFUrl:', error);
    throw error;
  }
}

/**
 * Extrai texto de um arquivo PDF usando PDF.js
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Ler arquivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Carregar documento PDF
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Extrair texto de cada página
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Concatenar todos os itens de texto
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += `\n\n=== PÁGINA ${pageNum} ===\n\n${pageText}`;
    }

    return fullText.trim();
  } catch (error) {
    log.error('Erro ao extrair texto do PDF:', error);
    throw new Error('Falha ao processar o PDF. Verifique se o arquivo está correto.');
  }
}

/**
 * Fluxo completo: Upload + Extração
 */
export async function processEditalPDF(file: File): Promise<{
  path: string;
  text: string;
  url: string;
}> {
  try {
    // 1. Fazer upload
    log.debug('Fazendo upload do arquivo...');
    const path = await uploadEditalPDF(file);

    // 2. Extrair texto
    log.debug('Extraindo texto...');
    const text = await extractTextFromPDF(file);

    // 3. Obter URL pública
    const url = await getEditalPDFUrl(path);

    log.debug('Processamento concluído:', {
      path,
      textLength: text.length,
      url
    });

    return { path, text, url };
  } catch (error) {
    log.error('Erro em processEditalPDF:', error);
    throw error;
  }
}

/**
 * Deleta um PDF do storage
 */
export async function deleteEditalPDF(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('editais')
      .remove([path]);

    if (error) {
      log.error('Erro ao deletar PDF:', error);
      throw error;
    }
  } catch (error) {
    log.error('Erro em deleteEditalPDF:', error);
    throw error;
  }
}
