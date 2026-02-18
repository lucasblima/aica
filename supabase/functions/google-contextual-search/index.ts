import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getGoogleTokenForUser } from "../_shared/google-token-manager.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.7.0";

const TAG = '[google-contextual-search]';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_FILE_FIELDS = 'id,name,mimeType,webViewLink,modifiedTime,size,owners(displayName,emailAddress)';

// ============================================================================
// Types
// ============================================================================

type ModuleType = 'grants' | 'studio' | 'finance' | 'connections' | 'journey' | 'flux' | 'atlas';
type SourceType = 'gmail' | 'drive';

interface ContextualSearchRequest {
  action: string;
  payload: {
    module: ModuleType;
    context: {
      entities: string[];
      keywords: string[];
      people: string[];
      dateRange?: { from: string; to: string };
    };
    sources: SourceType[];
    maxResults?: number;
  };
}

interface GmailResult {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  sender: string;
  senderEmail: string;
  receivedAt: string;
  confidence: number;
  relevanceReason: string;
}

interface DriveResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  confidence: number;
  relevanceReason: string;
}

interface LinkSuggestion {
  resourceType: 'email' | 'file';
  resourceId: string;
  resourceTitle: string;
  confidence: number;
  suggestedModule: string;
  suggestedEntityId?: string;
  reason: string;
}

// ============================================================================
// Module Knowledge — what each module cares about
// ============================================================================

const MODULE_KNOWLEDGE: Record<ModuleType, string> = {
  grants: `Editais, propostas, financiamento de pesquisa, FAPERJ, FINEP, CNPq, CAPES, patrocinio,
    orcamento de projeto, carta de anuencia, cronograma fisico-financeiro, relatorio de prestacao de contas,
    bolsa de pesquisa, chamada publica, termo de outorga, contrapartida.`,
  studio: `Podcast, episodios, convidados, pauta, roteiro, gravacao, edicao de audio/video,
    briefing de convidado, pesquisa pre-entrevista, follow-up pos-gravacao, publicacao,
    show notes, divulgacao, redes sociais, analytics de audiencia.`,
  finance: `Transacoes financeiras, pagamentos, recibos, notas fiscais, orcamento, fluxo de caixa,
    conciliacao bancaria, impostos, DAS, MEI, investimentos, despesas, receitas, faturamento,
    contas a pagar, contas a receber.`,
  connections: `Contatos profissionais, networking, organizacoes, parcerias, reunioes,
    propostas de colaboracao, indicacoes, apresentacoes, eventos, conferencias,
    follow-up de reuniao, acordos, contratos de parceria.`,
  journey: `Desenvolvimento pessoal, reflexoes, metas de vida, habitos, autoconhecimento,
    aprendizados, conquistas, desafios, gratidao, insights pessoais, plano de acao,
    acompanhamento de progresso, bem-estar.`,
  flux: `Treinos, atletas, competicoes, nutricao, desempenho esportivo, periodizacao,
    planilha de treino, avaliacao fisica, metas de performance, suplementacao,
    recuperacao, lesoes, calendario de competicao.`,
  atlas: `Tarefas, projetos, deadlines, entregas, Eisenhower matrix, priorizacao,
    kanban, sprint, milestone, dependencias, delegacao, status de projeto,
    revisao semanal, planejamento.`,
};

// ============================================================================
// Main handler
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // 1. Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user token' }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // 2. Parse and validate request
    const { action, payload }: ContextualSearchRequest = await req.json();

    if (action !== 'contextual_search') {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown action: ${action}. Use "contextual_search".` }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (!payload?.module || !payload?.context || !payload?.sources?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'payload.module, payload.context, and payload.sources are required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (!MODULE_KNOWLEDGE[payload.module]) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown module: ${payload.module}` }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const maxResults = Math.min(payload.maxResults || 10, 25);
    const sources = payload.sources;
    const context = payload.context;

    // 3. Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const genai = new GoogleGenAI({ apiKey: geminiApiKey });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Generate search queries via Gemini
    console.log(TAG, `Generating queries for module=${payload.module}, sources=${sources.join(',')}, user=${user.id}`);

    const queries = await generateSearchQueries(genai, payload.module, context, sources);
    console.log(TAG, `Generated queries:`, JSON.stringify(queries));

    // 5. Execute searches in parallel
    const gmailResults: GmailResult[] = [];
    const driveResults: DriveResult[] = [];
    const gmailQueries: string[] = [];
    const driveQueries: string[] = [];

    const searchPromises: Promise<void>[] = [];

    if (sources.includes('gmail') && queries.gmail?.length) {
      const tokenResult = await getGoogleTokenForUser(user.id, 'gmail.readonly', supabaseAdmin);
      if (tokenResult.error) {
        console.warn(TAG, `Gmail token error: ${tokenResult.error}`);
      } else {
        gmailQueries.push(...queries.gmail);
        for (const q of queries.gmail) {
          searchPromises.push(
            searchGmail(tokenResult.accessToken!, q, maxResults)
              .then(results => gmailResults.push(...results))
              .catch(err => console.error(TAG, `Gmail search error for "${q}":`, err))
          );
        }
      }
    }

    if (sources.includes('drive') && queries.drive?.length) {
      const tokenResult = await getGoogleTokenForUser(user.id, 'drive.readonly', supabaseAdmin);
      if (tokenResult.error) {
        console.warn(TAG, `Drive token error: ${tokenResult.error}`);
      } else {
        driveQueries.push(...queries.drive);
        for (const q of queries.drive) {
          searchPromises.push(
            searchDrive(tokenResult.accessToken!, q, maxResults)
              .then(results => driveResults.push(...results))
              .catch(err => console.error(TAG, `Drive search error for "${q}":`, err))
          );
        }
      }
    }

    await Promise.all(searchPromises);

    // 6. Deduplicate results
    const uniqueGmail = deduplicateById(gmailResults);
    const uniqueDrive = deduplicateById(driveResults);

    console.log(TAG, `Search returned ${uniqueGmail.length} gmail, ${uniqueDrive.length} drive results`);

    // 7. If no results at all, return early
    if (uniqueGmail.length === 0 && uniqueDrive.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            gmail: { results: [], queries: gmailQueries },
            drive: { results: [], queries: driveQueries },
            suggestions: [],
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 8. Score and rank results via Gemini
    const scored = await scoreResults(
      genai,
      payload.module,
      context,
      uniqueGmail,
      uniqueDrive
    );

    console.log(TAG, `Scoring complete. Gmail: ${scored.gmail.length}, Drive: ${scored.drive.length}, Suggestions: ${scored.suggestions.length}`);

    // 9. Sort by confidence descending and limit
    scored.gmail.sort((a, b) => b.confidence - a.confidence);
    scored.drive.sort((a, b) => b.confidence - a.confidence);
    scored.suggestions.sort((a, b) => b.confidence - a.confidence);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          gmail: {
            results: scored.gmail.slice(0, maxResults),
            queries: gmailQueries,
          },
          drive: {
            results: scored.drive.slice(0, maxResults),
            queries: driveQueries,
          },
          suggestions: scored.suggestions.slice(0, 10),
        },
      }),
      { status: 200, headers: jsonHeaders }
    );

  } catch (error) {
    console.error(TAG, 'Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: jsonHeaders }
    );
  }
});

// ============================================================================
// Step 1: Generate search queries using Gemini
// ============================================================================

async function generateSearchQueries(
  genai: InstanceType<typeof GoogleGenAI>,
  module: ModuleType,
  context: ContextualSearchRequest['payload']['context'],
  sources: SourceType[]
): Promise<{ gmail: string[]; drive: string[] }> {
  const moduleDesc = MODULE_KNOWLEDGE[module];

  const dateConstraint = context.dateRange
    ? `\nPeriodo de busca: de ${context.dateRange.from} ate ${context.dateRange.to}`
    : '';

  const prompt = `Voce e um assistente que gera consultas de busca otimizadas para Gmail e Google Drive.

## Contexto do modulo "${module}"
${moduleDesc}

## Dados fornecidos pelo usuario
- Entidades: ${context.entities.join(', ') || 'nenhuma'}
- Palavras-chave: ${context.keywords.join(', ') || 'nenhuma'}
- Pessoas: ${context.people.join(', ') || 'nenhuma'}${dateConstraint}

## Servicos para buscar: ${sources.join(', ')}

## Instrucoes

Gere de 2 a 3 consultas OTIMIZADAS para cada servico solicitado.

Para **Gmail**, use a sintaxe de busca do Gmail:
- Use "from:" e "to:" para pessoas
- Use "subject:" para topicos especificos
- Use "after:" e "before:" para datas (formato YYYY/MM/DD)
- Combine termos com OR para cobrir variantes
- Use aspas para frases exatas
- Exemplo: subject:(edital OR proposta) from:joao@org.com after:2026/01/01

Para **Google Drive**, use a sintaxe de busca do Drive API:
- Use "name contains" para nome do arquivo
- Use "fullText contains" para conteudo
- Use "modifiedTime >" para filtro de data (formato RFC 3339)
- Combine com "and", "or"
- Adicione "trashed = false" sempre
- Exemplo: (name contains 'proposta' or fullText contains 'FAPERJ') and trashed = false

Retorne APENAS JSON valido no formato:
{
  "gmail": ["query1", "query2"],
  "drive": ["query1", "query2"]
}

Se um servico nao foi solicitado, retorne array vazio para ele.
Foque nas consultas MAIS RELEVANTES para o contexto do modulo.`;

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.3,
    },
  });

  const text = response.text || '';
  const parsed = extractJSON(text) as { gmail?: string[]; drive?: string[] };

  return {
    gmail: Array.isArray(parsed.gmail) ? parsed.gmail.slice(0, 3) : [],
    drive: Array.isArray(parsed.drive) ? parsed.drive.slice(0, 3) : [],
  };
}

// ============================================================================
// Step 2: Search Gmail
// ============================================================================

async function searchGmail(
  accessToken: string,
  query: string,
  maxResults: number
): Promise<GmailResult[]> {
  const googleHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  const params = new URLSearchParams({
    q: query,
    maxResults: String(Math.min(maxResults, 25)),
  });

  const listRes = await fetch(`${GMAIL_API}/messages?${params}`, { headers: googleHeaders });
  if (!listRes.ok) {
    const err = await buildApiError('Gmail', listRes);
    throw err;
  }

  const listData = await listRes.json();
  const messageRefs = listData.messages || [];

  if (messageRefs.length === 0) return [];

  // Fetch metadata for each message
  const detailed = await Promise.all(
    messageRefs.slice(0, maxResults).map(async (m: { id: string }) => {
      const res = await fetch(
        `${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To`,
        { headers: googleHeaders }
      );
      if (!res.ok) return null;
      return await res.json();
    })
  );

  return detailed
    .filter(Boolean)
    .map((msg) => {
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const fromRaw = getHeader('From');
      const emailMatch = fromRaw.match(/<([^>]+)>/);

      return {
        id: msg.id as string,
        threadId: msg.threadId as string,
        subject: getHeader('Subject'),
        snippet: msg.snippet as string,
        sender: fromRaw,
        senderEmail: emailMatch ? emailMatch[1] : fromRaw,
        receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : '',
        confidence: 0,
        relevanceReason: '',
      };
    });
}

// ============================================================================
// Step 3: Search Drive
// ============================================================================

async function searchDrive(
  accessToken: string,
  query: string,
  maxResults: number
): Promise<DriveResult[]> {
  const googleHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  const params = new URLSearchParams({
    q: query,
    pageSize: String(Math.min(maxResults, 25)),
    fields: `files(${DRIVE_FILE_FIELDS})`,
    orderBy: 'modifiedTime desc',
  });

  const res = await fetch(`${DRIVE_API}/files?${params}`, { headers: googleHeaders });
  if (!res.ok) {
    const err = await buildApiError('Drive', res);
    throw err;
  }

  const data = await res.json();
  const files = data.files || [];

  return files.map((f: Record<string, unknown>) => ({
    id: f.id as string,
    name: f.name as string,
    mimeType: f.mimeType as string,
    webViewLink: f.webViewLink as string,
    modifiedTime: f.modifiedTime as string,
    confidence: 0,
    relevanceReason: '',
  }));
}

// ============================================================================
// Step 4: Score results with Gemini
// ============================================================================

async function scoreResults(
  genai: InstanceType<typeof GoogleGenAI>,
  module: ModuleType,
  context: ContextualSearchRequest['payload']['context'],
  gmailResults: GmailResult[],
  driveResults: DriveResult[]
): Promise<{
  gmail: GmailResult[];
  drive: DriveResult[];
  suggestions: LinkSuggestion[];
}> {
  // Build compact representations for Gemini
  const gmailSummary = gmailResults.map((r, i) => ({
    idx: i,
    id: r.id,
    subject: r.subject,
    snippet: r.snippet?.substring(0, 150),
    sender: r.sender,
    date: r.receivedAt,
  }));

  const driveSummary = driveResults.map((r, i) => ({
    idx: i,
    id: r.id,
    name: r.name,
    mimeType: r.mimeType,
    date: r.modifiedTime,
  }));

  const prompt = `Voce e um assistente de produtividade que avalia a relevancia de emails e arquivos para um modulo especifico.

## Modulo: ${module}
${MODULE_KNOWLEDGE[module]}

## Contexto da busca
- Entidades: ${context.entities.join(', ') || 'nenhuma'}
- Palavras-chave: ${context.keywords.join(', ') || 'nenhuma'}
- Pessoas: ${context.people.join(', ') || 'nenhuma'}

## Emails encontrados (${gmailSummary.length})
${gmailSummary.length > 0 ? JSON.stringify(gmailSummary, null, 2) : 'Nenhum'}

## Arquivos encontrados (${driveSummary.length})
${driveSummary.length > 0 ? JSON.stringify(driveSummary, null, 2) : 'Nenhum'}

## Instrucoes

Para CADA resultado (email e arquivo), atribua:
1. "confidence": numero de 0 a 1 indicando relevancia para o contexto do modulo
   - 0.9-1.0: Altamente relevante, menciona diretamente entidades/pessoas do contexto
   - 0.7-0.89: Relevante, relacionado ao tema do modulo
   - 0.4-0.69: Possivelmente relevante
   - 0.0-0.39: Pouco relevante
2. "relevanceReason": explicacao curta em portugues (max 80 chars) de por que este resultado e relevante

Alem disso, gere "suggestions" — sugestoes de vinculacao inteligente dos melhores resultados ao modulo.
Cada sugestao deve ter confidence >= 0.7.

Retorne APENAS JSON valido:
{
  "gmail_scores": [
    { "idx": 0, "confidence": 0.85, "relevanceReason": "Email sobre proposta FAPERJ" }
  ],
  "drive_scores": [
    { "idx": 0, "confidence": 0.92, "relevanceReason": "Documento de orcamento do edital" }
  ],
  "suggestions": [
    {
      "resourceType": "email",
      "resourceId": "msg_id",
      "resourceTitle": "Titulo do email",
      "confidence": 0.9,
      "suggestedModule": "${module}",
      "reason": "Este email contem detalhes da proposta"
    }
  ]
}`;

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.2,
    },
  });

  const text = response.text || '';

  let parsed: {
    gmail_scores?: Array<{ idx: number; confidence: number; relevanceReason: string }>;
    drive_scores?: Array<{ idx: number; confidence: number; relevanceReason: string }>;
    suggestions?: Array<{
      resourceType: 'email' | 'file';
      resourceId: string;
      resourceTitle: string;
      confidence: number;
      suggestedModule?: string;
      suggestedEntityId?: string;
      reason: string;
    }>;
  };

  try {
    parsed = extractJSON(text) as typeof parsed;
  } catch (parseErr) {
    console.error(TAG, 'Failed to parse scoring response:', parseErr);
    console.error(TAG, 'Raw (first 500):', text.substring(0, 500));
    // Return results with default confidence
    return {
      gmail: gmailResults.map(r => ({ ...r, confidence: 0.5, relevanceReason: 'Relevancia nao avaliada' })),
      drive: driveResults.map(r => ({ ...r, confidence: 0.5, relevanceReason: 'Relevancia nao avaliada' })),
      suggestions: [],
    };
  }

  // Apply scores to gmail results
  const scoredGmail = gmailResults.map((r, i) => {
    const score = parsed.gmail_scores?.find(s => s.idx === i);
    return {
      ...r,
      confidence: score?.confidence ?? 0.5,
      relevanceReason: score?.relevanceReason ?? '',
    };
  });

  // Apply scores to drive results
  const scoredDrive = driveResults.map((r, i) => {
    const score = parsed.drive_scores?.find(s => s.idx === i);
    return {
      ...r,
      confidence: score?.confidence ?? 0.5,
      relevanceReason: score?.relevanceReason ?? '',
    };
  });

  // Map suggestions
  const suggestions: LinkSuggestion[] = (parsed.suggestions || [])
    .filter(s => s.confidence >= 0.7)
    .map(s => ({
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      resourceTitle: s.resourceTitle,
      confidence: s.confidence,
      suggestedModule: s.suggestedModule || module,
      suggestedEntityId: s.suggestedEntityId,
      reason: s.reason,
    }));

  return { gmail: scoredGmail, drive: scoredDrive, suggestions };
}

// ============================================================================
// Helpers
// ============================================================================

function extractJSON(text: string): unknown {
  // Strip code fences first
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');
  // Find JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return JSON.parse(cleaned);
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function buildApiError(service: string, res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message = body?.error?.message || res.statusText;
  return new Error(`${service} API error (${res.status}): ${message}`);
}
