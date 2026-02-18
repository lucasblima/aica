import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getGoogleTokenForUser } from "../_shared/google-token-manager.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.7.0";

const TAG = '[gmail-summarize]';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface SummarizeRequest {
  action: string;
  payload?: {
    contactEmail?: string;
    contactName?: string;
    maxMessages?: number;
  };
}

interface ThreadGroup {
  threadId: string;
  subject: string;
  messages: Array<{
    from: string;
    date: string;
    snippet: string;
  }>;
}

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

    // 2. Parse request
    const { action, payload = {} }: SummarizeRequest = await req.json();

    if (action !== 'summarize_contact') {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown action: ${action}. Use "summarize_contact".` }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const contactEmail = payload.contactEmail;
    const contactName = payload.contactName || contactEmail;
    const maxMessages = Math.min(payload.maxMessages || 50, 50);

    if (!contactEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'payload.contactEmail is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 3. Get Google token
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const tokenResult = await getGoogleTokenForUser(user.id, 'gmail.readonly', supabaseAdmin);

    if (tokenResult.error) {
      return new Response(
        JSON.stringify({ success: false, error: tokenResult.error }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const googleHeaders = {
      'Authorization': `Bearer ${tokenResult.accessToken}`,
      'Accept': 'application/json',
    };

    // 4. Search Gmail for messages with this contact
    const query = `from:${contactEmail} OR to:${contactEmail}`;
    const params = new URLSearchParams({
      q: query,
      maxResults: String(maxMessages),
    });

    console.log(TAG, `Searching Gmail for "${query}" (max ${maxMessages})`);

    const listRes = await fetch(`${GMAIL_API}/messages?${params}`, { headers: googleHeaders });
    if (!listRes.ok) throw await buildGmailError(listRes);

    const listData = await listRes.json();
    const messageRefs = listData.messages || [];

    if (messageRefs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            contactName,
            contactEmail,
            totalEmails: 0,
            dateRange: null,
            summary: `Nenhum email encontrado com ${contactName} (${contactEmail}).`,
            topics: [],
            actionItems: [],
            sentiment: { overall: 'neutral', trend: 'stable', description: 'Sem dados suficientes' },
            timeline: [],
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 5. Fetch metadata for each message
    console.log(TAG, `Found ${messageRefs.length} messages, fetching metadata...`);

    const detailed = await Promise.all(
      messageRefs.map(async (m: { id: string }) => {
        const res = await fetch(
          `${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To`,
          { headers: googleHeaders }
        );
        if (!res.ok) return { id: m.id, error: true };
        return await res.json();
      })
    );

    const formattedMessages = detailed.map(formatMessageMetadata).filter(m => m && !m.error);

    if (formattedMessages.length < 3) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            contactName,
            contactEmail,
            totalEmails: formattedMessages.length,
            dateRange: buildDateRange(formattedMessages),
            summary: `Apenas ${formattedMessages.length} email(s) encontrado(s) com ${contactName}. Dados insuficientes para uma analise completa.`,
            topics: [],
            actionItems: [],
            sentiment: { overall: 'neutral', trend: 'stable', description: 'Poucos emails para analise' },
            timeline: [],
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 6. Group messages by threadId
    const threadMap = new Map<string, ThreadGroup>();

    for (const msg of formattedMessages) {
      const tid = msg.threadId || msg.id;
      if (!threadMap.has(tid)) {
        threadMap.set(tid, {
          threadId: tid,
          subject: msg.subject || '(Sem assunto)',
          messages: [],
        });
      }
      threadMap.get(tid)!.messages.push({
        from: msg.sender || '',
        date: msg.date || '',
        snippet: msg.snippet || '',
      });
    }

    const threads = Array.from(threadMap.values());

    // 7. Build Gemini prompt
    const prompt = buildGeminiPrompt(contactName, contactEmail, formattedMessages.length, threads);

    // 8. Call Gemini 2.5 Flash
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    console.log(TAG, `Calling Gemini with ${threads.length} threads, ${formattedMessages.length} messages`);

    const genai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 4096,
        temperature: 0.3,
        // Disable thinking for structured JSON output — avoids thinking tokens
        // contaminating the response text and breaking JSON extraction
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    let text = response.text || '';
    console.log(TAG, `Gemini response length: ${text.length}, first 200 chars: ${text.substring(0, 200)}`);

    // Safety: strip any thinking tags that might leak through
    text = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

    // 9. Parse structured response
    let analysis: Record<string, unknown>;
    try {
      analysis = extractJSON(text) as Record<string, unknown>;
    } catch (parseErr) {
      console.error(TAG, 'Failed to parse Gemini JSON response:', parseErr);
      console.error(TAG, 'Raw response (first 500 chars):', text.substring(0, 500));
      // Generate a meaningful fallback instead of raw model text
      const subjectList = threads
        .slice(0, 5)
        .map(t => t.subject)
        .filter(s => s && s !== '(Sem assunto)')
        .join(', ');
      analysis = {
        summary: `Foram encontrados ${formattedMessages.length} emails com ${contactName} em ${threads.length} conversas${subjectList ? `, incluindo: ${subjectList}` : ''}. A analise detalhada nao pode ser gerada neste momento.`,
        topics: [],
        actionItems: [],
        sentiment: { overall: 'neutral', trend: 'stable', description: 'Analise pendente' },
        timeline: [],
      };
    }

    const dateRange = buildDateRange(formattedMessages);

    console.log(TAG, `Summarize complete for ${contactEmail}, user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          contactName,
          contactEmail,
          totalEmails: formattedMessages.length,
          dateRange,
          summary: analysis.summary || '',
          topics: analysis.topics || [],
          actionItems: analysis.actionItems || [],
          sentiment: analysis.sentiment || { overall: 'neutral', trend: 'stable', description: '' },
          timeline: analysis.timeline || [],
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
// Helpers
// ============================================================================

function formatMessageMetadata(msg: Record<string, unknown>) {
  if (!msg || msg.error) return msg as Record<string, unknown>;

  const headers = (msg.payload as Record<string, unknown>)?.headers as Array<{ name: string; value: string }> || [];
  const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const fromRaw = getHeader('From');

  return {
    id: msg.id as string,
    threadId: msg.threadId as string,
    snippet: msg.snippet as string,
    subject: getHeader('Subject'),
    sender: fromRaw,
    senderEmail: extractEmail(fromRaw),
    to: getHeader('To'),
    date: getHeader('Date'),
    receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
  };
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

function buildDateRange(messages: Array<Record<string, unknown>>): { first: string; last: string } | null {
  const dates = messages
    .map(m => m.receivedAt as string)
    .filter(Boolean)
    .sort();

  if (dates.length === 0) return null;
  return { first: dates[0], last: dates[dates.length - 1] };
}

function extractJSON(text: string): unknown {
  // 1. Strip thinking tags (Gemini 2.5 may include them)
  let cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
  // 2. Strip code fences
  cleaned = cleaned.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');
  // 3. Strip any preamble text before the JSON
  cleaned = cleaned.trim();
  // 4. Find JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error(`No JSON object found in response (length=${text.length})`);
  }
  cleaned = cleaned.substring(start, end + 1);
  return JSON.parse(cleaned);
}

function buildGeminiPrompt(
  contactName: string,
  contactEmail: string,
  totalEmails: number,
  threads: ThreadGroup[]
): string {
  const threadsSummary = threads
    .map((t, i) => {
      const msgs = t.messages
        .map(m => `    - De: ${m.from} | Data: ${m.date}\n      Trecho: ${m.snippet}`)
        .join('\n');
      return `  Thread ${i + 1}: "${t.subject}"\n${msgs}`;
    })
    .join('\n\n');

  return `Voce e um assistente que analisa conversas de email. Analise as conversas abaixo entre o usuario e o contato "${contactName}" (${contactEmail}).

Total de emails: ${totalEmails}
Total de threads: ${threads.length}

=== CONVERSAS ===
${threadsSummary}
=== FIM DAS CONVERSAS ===

Analise estas conversas e retorne um JSON estruturado com:
1. "summary": Resumo geral em 2-3 paragrafos sobre o relacionamento e comunicacao com este contato
2. "topics": Array de topicos discutidos, cada um com { "topic": string, "count": number, "lastMentioned": "YYYY-MM-DD", "sentiment": "positive"|"neutral"|"negative" }
3. "actionItems": Array de itens pendentes ou acoes mencionadas, cada um com { "item": string, "date": "YYYY-MM-DD", "status": "pending"|"done"|"unclear" }
4. "sentiment": Objeto com { "overall": "positive"|"neutral"|"negative", "trend": "improving"|"stable"|"declining", "description": string descrevendo o tom geral }
5. "timeline": Array de periodos com resumo, cada um com { "period": "YYYY-MM", "summary": string curto, "sentiment": "positive"|"neutral"|"negative" }

Exemplo de formato esperado:
{
  "summary": "Comunicacao frequente focada em projetos de tecnologia...",
  "topics": [
    { "topic": "Projeto X", "count": 5, "lastMentioned": "2026-02-10", "sentiment": "positive" }
  ],
  "actionItems": [
    { "item": "Enviar proposta revisada", "date": "2026-02-15", "status": "pending" }
  ],
  "sentiment": {
    "overall": "positive",
    "trend": "stable",
    "description": "Comunicacao cordial e profissional"
  },
  "timeline": [
    { "period": "2026-02", "summary": "Discussoes sobre deadline do projeto", "sentiment": "neutral" }
  ]
}

Responda APENAS com JSON valido, sem texto adicional.`;
}

async function buildGmailError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message = body?.error?.message || res.statusText;
  return new Error(`Gmail API error (${res.status}): ${message}`);
}
