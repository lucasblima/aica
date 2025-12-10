/**
 * Gemini File Search Service
 *
 * Implementa RAG (Retrieval Augmented Generation) usando o File Search do Gemini.
 * Armazena documentos indexados no Supabase para tracking.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('VITE_GEMINI_API_KEY não configurada');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

/**
 * Tipos de categorias de File Search Store
 */
export type FileSearchCategory = 'financial' | 'documents' | 'personal' | 'business' | 'grants';

/**
 * Interface para resultado de busca
 */
export interface FileSearchResult {
  answer: string;
  citations?: Array<{
    uri?: string;
    title?: string;
  }>;
  model: string;
}

/**
 * Interface para File Search Store
 */
export interface FileSearchStoreInfo {
  id: string;
  user_id: string;
  store_name: string;
  store_category: FileSearchCategory;
  display_name: string;
  created_at: string;
}

/**
 * Gerenciador de File Search Stores
 */
class GeminiFileSearchService {
  /**
   * Obtém ou cria um File Search Store para o usuário
   */
  async getOrCreateStore(userId: string, category: FileSearchCategory): Promise<string> {
    try {
      // Verificar se já existe no Supabase
      const { data: existing } = await supabase
        .from('user_file_search_stores')
        .select('store_name')
        .eq('user_id', userId)
        .eq('store_category', category)
        .single();

      if (existing?.store_name) {
        console.log('[FileSearch] Store existente:', existing.store_name);
        return existing.store_name;
      }

      // Criar novo store no Gemini
      const displayName = `${userId}_${category}`;

      // Nota: A SDK JavaScript atual pode não ter fileSearchStores.create
      // Vamos usar a API REST diretamente
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName })
        }
      );

      if (!response.ok) {
        throw new Error(`Falha ao criar store: ${response.statusText}`);
      }

      const storeData = await response.json();
      const storeName = storeData.name; // fileSearchStores/xxx

      // Persistir no Supabase
      await supabase.from('user_file_search_stores').insert({
        user_id: userId,
        store_name: storeName,
        store_category: category,
        display_name: displayName
      });

      console.log('[FileSearch] Store criado:', storeName);
      return storeName;
    } catch (error) {
      console.error('[FileSearch] Erro ao criar store:', error);
      throw error;
    }
  }

  /**
   * Upload e indexação de arquivo no File Search Store
   */
  async uploadAndIndexFile(
    file: File,
    category: FileSearchCategory,
    metadata?: Record<string, any>
  ): Promise<{ status: string; fileName: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter ou criar store
      const storeName = await this.getOrCreateStore(user.id, category);

      // Preparar metadata customizada
      const customMetadata = metadata
        ? Object.entries(metadata).map(([key, value]) => ({
            key,
            ...(typeof value === 'number'
              ? { numeric_value: value }
              : { string_value: String(value) })
          }))
        : [];

      // Upload direto para File Search Store via API REST
      const formData = new FormData();
      formData.append('file', file);

      const config = {
        displayName: file.name,
        customMetadata
      };

      const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/${storeName}/media?uploadType=media&key=${GEMINI_API_KEY}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Goog-Upload-Command': 'upload, finalize',
          'X-Goog-Upload-Protocol': 'multipart',
        }
      });

      if (!response.ok) {
        throw new Error(`Upload falhou: ${response.statusText}`);
      }

      const result = await response.json();

      // Aguardar indexação (polling)
      await this.waitForIndexing(result.name);

      // Registrar no Supabase
      const { data: storeData } = await supabase
        .from('user_file_search_stores')
        .select('id')
        .eq('store_name', storeName)
        .single();

      if (storeData) {
        await supabase.from('indexed_documents').insert({
          user_id: user.id,
          store_id: storeData.id,
          gemini_file_name: result.name,
          original_filename: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          custom_metadata: metadata || {},
          indexing_status: 'completed'
        });
      }

      return {
        status: 'completed',
        fileName: file.name
      };
    } catch (error) {
      console.error('[FileSearch] Erro no upload:', error);
      throw error;
    }
  }

  /**
   * Aguarda indexação completar
   */
  private async waitForIndexing(operationName: string, maxWaitTime = 300000): Promise<void> {
    const startTime = Date.now();

    while (true) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Timeout: indexação excedeu 5 minutos');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GEMINI_API_KEY}`
      );

      const operation = await response.json();

      if (operation.done) {
        if (operation.error) {
          throw new Error(`Indexação falhou: ${operation.error.message}`);
        }
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Busca semântica em documentos
   */
  async searchDocuments(
    query: string,
    categories: FileSearchCategory[] = ['documents'],
    filters?: Record<string, any>
  ): Promise<FileSearchResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter stores das categorias especificadas
      const { data: stores } = await supabase
        .from('user_file_search_stores')
        .select('store_name')
        .eq('user_id', user.id)
        .in('store_category', categories);

      if (!stores || stores.length === 0) {
        return {
          answer: 'Nenhum documento encontrado nessas categorias.',
          citations: [],
          model: 'gemini-2.0-flash-exp'
        };
      }

      const storeNames = stores.map(s => s.store_name);

      // Construir filtro de metadata se necessário
      let metadataFilter: string | undefined;
      if (filters) {
        const parts = Object.entries(filters).map(([k, v]) =>
          typeof v === 'string' ? `${k} = "${v}"` : `${k} = ${v}`
        );
        metadataFilter = parts.join(' AND ');
      }

      // Gerar conteúdo com File Search
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: query }] }],
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: storeNames,
              ...(metadataFilter && { filter: metadataFilter })
            }
          }
        ]
      });

      const response = result.response;
      const text = response.text();

      // Extrair citações do grounding metadata
      const citations: Array<{ uri?: string; title?: string }> = [];

      if (response.candidates?.[0]?.groundingMetadata) {
        const groundingChunks = response.candidates[0].groundingMetadata.groundingChunks || [];

        for (const chunk of groundingChunks) {
          if (chunk.web) {
            citations.push({
              uri: chunk.web.uri,
              title: chunk.web.title
            });
          }
        }
      }

      // Log da query no Supabase
      await supabase.from('file_search_queries').insert({
        user_id: user.id,
        store_names: storeNames,
        query_text: query,
        metadata_filter: metadataFilter,
        response_tokens: response.usageMetadata?.totalTokenCount || 0,
        citations
      });

      return {
        answer: text,
        citations,
        model: 'gemini-2.0-flash-exp'
      };
    } catch (error) {
      console.error('[FileSearch] Erro na busca:', error);
      throw error;
    }
  }

  /**
   * Lista todos os stores do usuário
   */
  async listStores(userId: string): Promise<FileSearchStoreInfo[]> {
    const { data, error } = await supabase
      .from('user_file_search_stores')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Deleta um File Search Store
   */
  async deleteStore(storeName: string): Promise<void> {
    try {
      // Deletar do Gemini
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${storeName}?key=${GEMINI_API_KEY}&force=true`,
        { method: 'DELETE' }
      );

      // Deletar do Supabase
      await supabase
        .from('user_file_search_stores')
        .delete()
        .eq('store_name', storeName);

      console.log('[FileSearch] Store deletado:', storeName);
    } catch (error) {
      console.error('[FileSearch] Erro ao deletar store:', error);
      throw error;
    }
  }
}

export const geminiFileSearchService = new GeminiFileSearchService();
