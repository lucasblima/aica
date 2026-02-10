import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

// ============================================================================
// SECURE CORS CONFIGURATION
// ============================================================================
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://aica-staging-5562559893.southamerica-east1.run.app',
  'https://aica-5562559893.southamerica-east1.run.app',
  'https://dev.aica.guru',
  'https://aica.guru',
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ============================================================================
// TYPES
// ============================================================================

export type FileSearchCategory = 'financial' | 'documents' | 'personal' | 'business' | 'grants' | 'podcast_transcripts' | 'habitat_documents' | 'venture_documents' | 'academia_documents' | 'tribo_documents' | 'onboarding_resources';

interface FileSearchRequest {
  action: 'create_store' | 'upload_document' | 'search_documents' | 'delete_store' | 'list_stores';
  payload: {
    category?: FileSearchCategory;
    storeName?: string;
    file?: {
      name: string;
      type: string;
      data: string; // base64
      size: number;
    };
    metadata?: Record<string, any>;
    query?: string;
    categories?: FileSearchCategory[];
    filters?: Record<string, any>;
  };
}

interface FileSearchResult {
  answer: string;
  citations?: Array<{
    uri?: string;
    title?: string;
  }>;
  model: string;
}

interface StoreInfo {
  id: string;
  user_id: string;
  store_name: string;
  store_category: FileSearchCategory;
  display_name: string;
  created_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function waitForIndexing(operationName: string, maxWaitTime = 300000): Promise<void> {
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

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleCreateStore(userId: string, category: FileSearchCategory, supabaseClient: any): Promise<string> {
  try {
    // Verificar se já existe no Supabase
    const { data: existing } = await supabaseClient
      .from('user_file_search_stores')
      .select('store_name')
      .eq('user_id', userId)
      .eq('store_category', category)
      .single();

    if (existing?.store_name) {
      console.log('[FileSearch] Store existente:', existing.store_name);
      return existing.store_name;
    }

    // Criar novo store no Gemini via REST API
    const displayName = `${userId}_${category}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao criar store: ${response.statusText} - ${errorText}`);
    }

    const storeData = await response.json();
    const storeName = storeData.name; // fileSearchStores/xxx

    // Persistir no Supabase
    await supabaseClient.from('user_file_search_stores').insert({
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

async function handleUploadDocument(
  userId: string,
  category: FileSearchCategory,
  file: { name: string; type: string; data: string; size: number },
  metadata: Record<string, any> | undefined,
  supabaseClient: any
): Promise<{ status: string; fileName: string }> {
  try {
    // Obter ou criar store
    const storeName = await handleCreateStore(userId, category, supabaseClient);

    // Preparar metadata customizada
    const customMetadata = metadata
      ? Object.entries(metadata).map(([key, value]) => ({
          key,
          ...(typeof value === 'number'
            ? { numeric_value: value }
            : { string_value: String(value) })
        }))
      : [];

    // Decodificar base64 para blob
    const binaryString = atob(file.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: file.type });

    // Upload direto para File Search Store via API REST
    const formData = new FormData();
    formData.append('file', blob, file.name);

    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/${storeName}/media?uploadType=media&key=${GEMINI_API_KEY}`;

    const uploadHeaders = new Headers();
    uploadHeaders.append('X-Goog-Upload-Command', 'upload, finalize');
    uploadHeaders.append('X-Goog-Upload-Protocol', 'multipart');

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: uploadHeaders
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload falhou: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    // Aguardar indexação (polling)
    await waitForIndexing(result.name);

    // Registrar no Supabase
    const { data: storeData } = await supabaseClient
      .from('user_file_search_stores')
      .select('id')
      .eq('store_name', storeName)
      .single();

    if (storeData) {
      await supabaseClient.from('indexed_documents').insert({
        user_id: userId,
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

async function handleSearchDocuments(
  userId: string,
  query: string,
  categories: FileSearchCategory[] = ['documents'],
  filters: Record<string, any> | undefined,
  supabaseClient: any
): Promise<FileSearchResult> {
  try {
    // Obter stores das categorias especificadas
    const { data: stores } = await supabaseClient
      .from('user_file_search_stores')
      .select('store_name')
      .eq('user_id', userId)
      .in('store_category', categories);

    if (!stores || stores.length === 0) {
      return {
        answer: 'Nenhum documento encontrado nessas categorias.',
        citations: [],
        model: 'gemini-2.5-flash'
      };
    }

    const storeNames = stores.map((s: any) => s.store_name);

    // Construir filtro de metadata se necessário
    let metadataFilter: string | undefined;
    if (filters) {
      const parts = Object.entries(filters).map(([k, v]) =>
        typeof v === 'string' ? `${k} = "${v}"` : `${k} = ${v}`
      );
      metadataFilter = parts.join(' AND ');
    }

    // Fazer request para Gemini File Search API
    const requestBody: any = {
      contents: [{ role: 'user', parts: [{ text: query }] }],
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: storeNames,
            ...(metadataFilter && { filter: metadataFilter })
          }
        }
      ]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Busca falhou: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada.';

    // Extrair citações do grounding metadata
    const citations: Array<{ uri?: string; title?: string }> = [];

    if (result.candidates?.[0]?.groundingMetadata) {
      const groundingChunks = result.candidates[0].groundingMetadata.groundingChunks || [];

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
    await supabaseClient.from('file_search_queries').insert({
      user_id: userId,
      store_names: storeNames,
      query_text: query,
      metadata_filter: metadataFilter,
      response_tokens: result.usageMetadata?.totalTokenCount || 0,
      citations
    });

    return {
      answer: text,
      citations,
      model: 'gemini-2.5-flash'
    };
  } catch (error) {
    console.error('[FileSearch] Erro na busca:', error);
    throw error;
  }
}

async function handleListStores(userId: string, supabaseClient: any): Promise<StoreInfo[]> {
  const { data, error } = await supabaseClient
    .from('user_file_search_stores')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

async function handleDeleteStore(storeName: string, supabaseClient: any): Promise<void> {
  try {
    // Deletar do Gemini
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${storeName}?key=${GEMINI_API_KEY}&force=true`,
      { method: 'DELETE' }
    );

    // Deletar do Supabase
    await supabaseClient
      .from('user_file_search_stores')
      .delete()
      .eq('store_name', storeName);

    console.log('[FileSearch] Store deletado:', storeName);
  } catch (error) {
    console.error('[FileSearch] Erro ao deletar store:', error);
    throw error;
  }
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API key não configurada no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com token do usuário
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Obter usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: FileSearchRequest = await req.json();
    const { action, payload } = body;

    console.log(`[file-search] Action: ${action}, User: ${user.id}`);

    let result: any;

    switch (action) {
      case 'create_store':
        if (!payload.category) {
          throw new Error('Campo "category" é obrigatório');
        }
        result = await handleCreateStore(user.id, payload.category, supabaseClient);
        break;

      case 'upload_document':
        if (!payload.category || !payload.file) {
          throw new Error('Campos "category" e "file" são obrigatórios');
        }
        result = await handleUploadDocument(
          user.id,
          payload.category,
          payload.file,
          payload.metadata,
          supabaseClient
        );
        break;

      case 'search_documents':
        if (!payload.query) {
          throw new Error('Campo "query" é obrigatório');
        }
        result = await handleSearchDocuments(
          user.id,
          payload.query,
          payload.categories || ['documents'],
          payload.filters,
          supabaseClient
        );
        break;

      case 'list_stores':
        result = await handleListStores(user.id, supabaseClient);
        break;

      case 'delete_store':
        if (!payload.storeName) {
          throw new Error('Campo "storeName" é obrigatório');
        }
        await handleDeleteStore(payload.storeName, supabaseClient);
        result = { success: true };
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Action desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[file-search] Action ${action} completed in ${latencyMs}ms`);

    return new Response(
      JSON.stringify({ result, success: true, latencyMs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const err = error as Error;
    console.error('[file-search] Error:', err.message);
    let statusCode = 500;
    if (err.message.includes('obrigatório') || err.message.includes('deve ser')) {
      statusCode = 400;
    }
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno do servidor', success: false }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
