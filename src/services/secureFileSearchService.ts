/**
 * Serviço seguro de File Search usando GeminiClient
 *
 * Substitui geminiFileSearchService.ts com padrão seguro via Edge Functions
 */

import { GeminiClient } from '@/lib/gemini/client';
import type { FileSearchCategory, FileSearchResult, FileSearchStoreInfo } from '@/lib/gemini/types';

/**
 * Converte File para base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:mime/type;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Cria ou obtém um File Search Store
 */
export async function getOrCreateStore(category: FileSearchCategory): Promise<string> {
  const client = GeminiClient.getInstance();

  const response = await client.call({
    action: 'create_store',
    payload: { category }
  });

  return response.result;
}

/**
 * Upload e indexação de arquivo
 */
export async function uploadAndIndexFile(
  file: File,
  category: FileSearchCategory,
  metadata?: Record<string, any>
): Promise<{ status: string; fileName: string }> {
  const client = GeminiClient.getInstance();

  // Converter file para base64
  const base64Data = await fileToBase64(file);

  const response = await client.call({
    action: 'upload_document',
    payload: {
      category,
      file: {
        name: file.name,
        type: file.type,
        data: base64Data,
        size: file.size
      },
      metadata
    }
  });

  return response.result;
}

/**
 * Busca semântica em documentos
 */
export async function searchDocuments(
  query: string,
  categories: FileSearchCategory[] = ['documents'],
  filters?: Record<string, any>
): Promise<FileSearchResult> {
  const client = GeminiClient.getInstance();

  const response = await client.call({
    action: 'search_documents',
    payload: {
      query,
      categories,
      filters
    }
  });

  return response.result as FileSearchResult;
}

/**
 * Lista todos os stores do usuário
 */
export async function listStores(): Promise<FileSearchStoreInfo[]> {
  const client = GeminiClient.getInstance();

  const response = await client.call({
    action: 'list_stores',
    payload: {}
  });

  return response.result as FileSearchStoreInfo[];
}

/**
 * Deleta um File Search Store
 */
export async function deleteStore(storeName: string): Promise<void> {
  const client = GeminiClient.getInstance();

  await client.call({
    action: 'delete_store',
    payload: { storeName }
  });
}

/**
 * Classe wrapper para compatibilidade com código legado
 */
class SecureFileSearchService {
  async getOrCreateStore(category: FileSearchCategory): Promise<string> {
    return getOrCreateStore(category);
  }

  async uploadAndIndexFile(
    file: File,
    category: FileSearchCategory,
    metadata?: Record<string, any>
  ): Promise<{ status: string; fileName: string }> {
    return uploadAndIndexFile(file, category, metadata);
  }

  async searchDocuments(
    query: string,
    categories: FileSearchCategory[] = ['documents'],
    filters?: Record<string, any>
  ): Promise<FileSearchResult> {
    return searchDocuments(query, categories, filters);
  }

  async listStores(): Promise<FileSearchStoreInfo[]> {
    return listStores();
  }

  async deleteStore(storeName: string): Promise<void> {
    return deleteStore(storeName);
  }
}

export const secureFileSearchService = new SecureFileSearchService();
