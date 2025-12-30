import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================================================
// SECURE CORS CONFIGURATION
// ============================================================================
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://yourdomain.com', // TODO: Replace with production domain
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

interface FileSearchRequest {
  action: 'upload_document' | 'query_corpus' | 'delete_document';
  payload: {
    corpusId?: string;
    file?: {
      name: string;
      type: string;
      data: string; // base64
      size: number;
    };
    metadata?: Record<string, any>;
    query?: string;
    resultCount?: number;
    documentId?: string;
    moduleType?: string;
    moduleId?: string;
  };
}

interface QueryResult {
  answer: string;
  passages?: Array<{
    content: string;
    document_name?: string;
  }>;
  citations?: Array<{
    uri?: string;
    title?: string;
  }>;
}

// ============================================================================
// GEMINI API HELPERS
// ============================================================================

async function waitForFileProcessing(fileName: string, maxWaitTime = 300000): Promise<void> {
  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error('Timeout: processamento do arquivo excedeu 5 minutos');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`
    );

    const file = await response.json();

    if (file.state === 'ACTIVE') {
      break;
    } else if (file.state === 'FAILED') {
      throw new Error(`Processamento falhou: ${file.error?.message || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleUploadDocument(
  userId: string,
  corpusId: string,
  file: { name: string; type: string; data: string; size: number },
  metadata: Record<string, any> | undefined,
  moduleType: string,
  moduleId: string,
  supabaseClient: any
): Promise<{ id: string; geminiFileName: string; status: string }> {
  try {
    console.log(`[file-search-corpus] Uploading document to corpus ${corpusId}`);

    // Decodificar base64
    const binaryString = atob(file.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: file.type });

    // Upload para Gemini Files API
    const formData = new FormData();
    formData.append('file', blob, file.name);

    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload falhou: ${uploadResponse.statusText} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const geminiFileName = uploadResult.file.name; // "files/xxx"

    console.log(`[file-search-corpus] File uploaded: ${geminiFileName}, waiting for processing...`);

    // Aguardar processamento
    await waitForFileProcessing(geminiFileName);

    console.log(`[file-search-corpus] File processed successfully`);

    // Registrar no Supabase
    const { data: document, error: insertError } = await supabaseClient
      .from('file_search_documents')
      .insert({
        user_id: userId,
        corpus_id: corpusId,
        gemini_file_name: geminiFileName,
        original_filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        indexing_status: 'completed',
        module_type: moduleType,
        module_id: moduleId,
        custom_metadata: metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('[file-search-corpus] Error saving to database:', insertError);
      throw new Error(`Falha ao salvar documento: ${insertError.message}`);
    }

    // Atualizar contagem de documentos no corpus (optional, non-critical)
    try {
      await supabaseClient.rpc('increment_corpus_document_count', { corpus_uuid: corpusId });
    } catch (err) {
      console.warn('[file-search-corpus] Failed to increment document count (non-critical):', err);
    }

    return {
      id: document.id,
      geminiFileName,
      status: 'completed',
    };
  } catch (error) {
    console.error('[file-search-corpus] Upload error:', error);
    throw error;
  }
}

async function handleQueryCorpus(
  userId: string,
  corpusId: string,
  query: string,
  resultCount: number = 5,
  supabaseClient: any
): Promise<QueryResult> {
  try {
    console.log(`[file-search-corpus] Querying corpus ${corpusId}: "${query}"`);

    // Obter documentos do corpus
    const { data: documents, error: docsError } = await supabaseClient
      .from('file_search_documents')
      .select('gemini_file_name')
      .eq('corpus_id', corpusId)
      .eq('user_id', userId)
      .eq('indexing_status', 'completed');

    if (docsError) {
      throw new Error(`Erro ao buscar documentos: ${docsError.message}`);
    }

    if (!documents || documents.length === 0) {
      return {
        answer: 'Nenhum documento encontrado neste corpus.',
        passages: [],
        citations: [],
      };
    }

    const fileNames = documents.map((doc: any) => doc.gemini_file_name);

    console.log(`[file-search-corpus] Querying ${fileNames.length} documents`);

    // Fazer query usando generateContent com file references
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: query },
            ...fileNames.map((fileName: string) => ({
              file_data: {
                file_uri: `https://generativelanguage.googleapis.com/v1beta/${fileName}`,
                mime_type: 'application/pdf', // Ajustar conforme necessário
              },
            })),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 10,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Query falhou: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const answer = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada.';

    // Extrair citações se disponíveis
    const citations: Array<{ uri?: string; title?: string }> = [];
    if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of result.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.web) {
          citations.push({
            uri: chunk.web.uri,
            title: chunk.web.title,
          });
        }
      }
    }

    // Log da query no Supabase
    await supabaseClient.from('ai_usage_analytics').insert({
      user_id: userId,
      operation_type: 'file_search_query',
      ai_model: 'gemini-2.0-flash-exp',
      total_tokens: result.usageMetadata?.totalTokenCount || 0,
      prompt_tokens: result.usageMetadata?.promptTokenCount || 0,
      completion_tokens: result.usageMetadata?.candidatesTokenCount || 0,
      request_metadata: {
        corpus_id: corpusId,
        query_text: query,
        document_count: fileNames.length,
      },
    });

    return {
      answer,
      citations,
    };
  } catch (error) {
    console.error('[file-search-corpus] Query error:', error);
    throw error;
  }
}

async function handleDeleteDocument(
  userId: string,
  documentId: string,
  supabaseClient: any
): Promise<void> {
  try {
    console.log(`[file-search-corpus] Deleting document ${documentId}`);

    // Obter info do documento
    const { data: document, error: fetchError } = await supabaseClient
      .from('file_search_documents')
      .select('gemini_file_name, corpus_id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      throw new Error('Documento não encontrado ou sem permissão');
    }

    // Deletar do Gemini
    const geminiFileName = document.gemini_file_name;
    if (geminiFileName) {
      const deleteResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${geminiFileName}?key=${GEMINI_API_KEY}`,
        { method: 'DELETE' }
      );

      if (!deleteResponse.ok) {
        console.warn(`[file-search-corpus] Warning: Failed to delete from Gemini: ${deleteResponse.statusText}`);
        // Continue anyway - prioritize deleting from database
      }
    }

    // Deletar do Supabase
    const { error: deleteError } = await supabaseClient
      .from('file_search_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Erro ao deletar documento: ${deleteError.message}`);
    }

    // Atualizar contagem no corpus (optional, non-critical)
    if (document.corpus_id) {
      try {
        await supabaseClient.rpc('decrement_corpus_document_count', { corpus_uuid: document.corpus_id });
      } catch (err) {
        console.warn('[file-search-corpus] Failed to decrement document count (non-critical):', err);
      }
    }

    console.log(`[file-search-corpus] Document deleted successfully`);
  } catch (error) {
    console.error('[file-search-corpus] Delete error:', error);
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
      console.error('[file-search-corpus] GEMINI_API_KEY not configured');
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

    // Criar cliente Supabase
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

    console.log(`[file-search-corpus] Action: ${action}, User: ${user.id}`);

    let result: any;

    switch (action) {
      case 'upload_document':
        if (!payload.corpusId || !payload.file || !payload.moduleType || !payload.moduleId) {
          throw new Error('Campos "corpusId", "file", "moduleType" e "moduleId" são obrigatórios');
        }
        result = await handleUploadDocument(
          user.id,
          payload.corpusId,
          payload.file,
          payload.metadata,
          payload.moduleType,
          payload.moduleId,
          supabaseClient
        );
        break;

      case 'query_corpus':
        if (!payload.corpusId || !payload.query) {
          throw new Error('Campos "corpusId" e "query" são obrigatórios');
        }
        result = await handleQueryCorpus(
          user.id,
          payload.corpusId,
          payload.query,
          payload.resultCount || 5,
          supabaseClient
        );
        break;

      case 'delete_document':
        if (!payload.documentId) {
          throw new Error('Campo "documentId" é obrigatório');
        }
        await handleDeleteDocument(user.id, payload.documentId, supabaseClient);
        result = { success: true };
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Action desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[file-search-corpus] Action ${action} completed in ${latencyMs}ms`);

    return new Response(
      JSON.stringify({ result, success: true, latencyMs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const err = error as Error;
    console.error('[file-search-corpus] Error:', err.message);

    let statusCode = 500;
    if (err.message.includes('obrigatório') || err.message.includes('não encontrado')) {
      statusCode = 400;
    }

    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno do servidor', success: false }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
