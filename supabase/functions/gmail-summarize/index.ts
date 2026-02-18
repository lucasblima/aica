import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getGoogleTokenForUser } from "../_shared/google-token-manager.ts";

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
    to: string;
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
    const maxMessages = Math.min(payload.maxMessages || 150, 200);

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
    // Use {from:X to:X} grouping syntax for precise header matching (not body text)
    const query = `{from:${contactEmail} to:${contactEmail} cc:${contactEmail} bcc:${contactEmail}}`;
    console.log(TAG, `Step 4: Searching Gmail for "${query}" (max ${maxMessages})`);

    // Paginate through all results up to maxMessages
    let messageRefs: Array<{ id: string }> = [];
    let pageToken: string | undefined;
    while (messageRefs.length < maxMessages) {
      const params = new URLSearchParams({
        q: query,
        maxResults: String(Math.min(100, maxMessages - messageRefs.length)),
      });
      if (pageToken) params.set('pageToken', pageToken);

      const listRes = await fetch(`${GMAIL_API}/messages?${params}`, { headers: googleHeaders });
      if (!listRes.ok) {
        const gmailErr = await buildGmailError(listRes);
        console.error(TAG, 'Gmail list failed:', gmailErr.message);
        throw gmailErr;
      }

      const listData = await listRes.json();
      const batch = listData.messages || [];
      messageRefs = messageRefs.concat(batch);
      pageToken = listData.nextPageToken;
      if (!pageToken || batch.length === 0) break;
    }
    console.log(TAG, `Step 4b: Total message refs collected: ${messageRefs.length}`);

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
    console.log(TAG, `Step 5: Found ${messageRefs.length} messages, fetching metadata...`);

    // Batch in groups of 20 to avoid rate limiting
    const BATCH_SIZE = 20;
    const detailed: Array<Record<string, unknown>> = [];
    for (let i = 0; i < messageRefs.length; i += BATCH_SIZE) {
      const batch = messageRefs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (m: { id: string }) => {
          const res = await fetch(
            `${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To&metadataHeaders=Cc`,
            { headers: googleHeaders }
          );
          if (!res.ok) return { id: m.id, error: true };
          return await res.json();
        })
      );
      detailed.push(...results);
    }

    const allFormatted = detailed.map(formatMessageMetadata).filter(m => m && !m.error);

    // Post-filter: only keep messages where contactEmail appears in From, To, or Cc
    const contactLower = contactEmail.toLowerCase();
    const formattedMessages = allFormatted.filter(m => {
      const from = String(m.senderEmail || m.sender || '').toLowerCase();
      const to = String(m.to || '').toLowerCase();
      const cc = String(m.cc || '').toLowerCase();
      return from.includes(contactLower) || to.includes(contactLower) || cc.includes(contactLower);
    });
    console.log(TAG, `Step 5b: ${allFormatted.length} messages fetched, ${formattedMessages.length} match contact "${contactEmail}" (${allFormatted.length - formattedMessages.length} filtered out)`);

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
        to: msg.to || '',
        date: msg.date || '',
        snippet: msg.snippet || '',
      });
    }

    const threads = Array.from(threadMap.values());

    // 7. Build Gemini prompt
    const prompt = buildGeminiPrompt(contactName, contactEmail, formattedMessages.length, threads);

    // 8. Call Gemini 2.5 Flash via REST API (not SDK — avoids thinking token issues)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    console.log(TAG, `Step 8: Calling Gemini with ${threads.length} threads, ${formattedMessages.length} messages, prompt length: ${prompt.length}`);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    };
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text();
      console.error(TAG, `Gemini API error (${geminiResponse.status}):`, errBody.substring(0, 500));
      throw new Error(`Gemini API error: ${geminiResponse.status} — ${errBody.substring(0, 200)}`);
    }

    const geminiResult = await geminiResponse.json();
    // Extract text from the non-thought parts only
    const candidateParts = geminiResult.candidates?.[0]?.content?.parts || [];
    let text = '';
    for (const part of candidateParts) {
      if (part.text && !part.thought) {
        text += part.text;
      }
    }
    text = text.trim();

    const finishReason = geminiResult.candidates?.[0]?.finishReason;
    console.log(TAG, `Gemini response length: ${text.length}, finishReason: ${finishReason}, first 200 chars: ${text.substring(0, 200)}`);

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
    const message = error instanceof Error ? error.message : 'Internal server error';
    const stack = error instanceof Error ? error.stack : '';
    console.error(TAG, 'Error:', message);
    console.error(TAG, 'Stack:', stack);
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
    cc: getHeader('Cc'),
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
        .map(m => `    - De: ${m.from} | Para: ${m.to} | Data: ${m.date}\n      Trecho: ${m.snippet}`)
        .join('\n');
      return `  Thread ${i + 1}: "${t.subject}"\n${msgs}`;
    })
    .join('\n\n');

  return `Voce e um assistente que analisa conversas de email.

TAREFA: Analise TODAS as conversas abaixo entre o usuario e o contato "${contactName}" (${contactEmail}).
Todos os emails listados envolvem este contato como remetente, destinatario ou CC.

Total de emails: ${totalEmails}
Total de threads: ${threads.length}

=== CONVERSAS ===
${threadsSummary}
=== FIM DAS CONVERSAS ===

Analise estas conversas e retorne um JSON estruturado com:
1. "summary": Resumo geral em 2-3 paragrafos sobre o relacionamento e comunicacao com este contato. Mencione os principais temas, frequencia e tom da comunicacao.
2. "topics": Array de topicos discutidos, cada um com { "topic": string, "count": number, "lastMentioned": "YYYY-MM-DD", "sentiment": "positive"|"neutral"|"negative" }
3. "actionItems": Array de itens pendentes ou acoes mencionadas, cada um com { "item": string, "date": "YYYY-MM-DD", "status": "pending"|"done"|"unclear" }
4. "sentiment": Objeto com { "overall": "positive"|"neutral"|"negative", "trend": "improving"|"stable"|"declining", "description": string descrevendo o tom geral }
5. "timeline": Array de periodos com resumo, cada um com { "period": "YYYY-MM", "summary": string curto, "sentiment": "positive"|"neutral"|"negative" }

IMPORTANTE: Foque na analise do conteudo disponivel nos trechos. Mesmo que os trechos sejam curtos, extraia o maximo de informacao possivel sobre os assuntos discutidos.

Responda APENAS com JSON valido, sem texto adicional. Exemplo de formato:
{
  "summary": "Comunicacao frequente focada em projetos...",
  "topics": [{ "topic": "Projeto X", "count": 5, "lastMentioned": "2026-02-10", "sentiment": "positive" }],
  "actionItems": [{ "item": "Enviar proposta", "date": "2026-02-15", "status": "pending" }],
  "sentiment": { "overall": "positive", "trend": "stable", "description": "Comunicacao cordial" },
  "timeline": [{ "period": "2026-02", "summary": "Discussoes sobre deadline", "sentiment": "neutral" }]
}`;
}

async function buildGmailError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message = body?.error?.message || res.statusText;
  return new Error(`Gmail API error (${res.status}): ${message}`);
}
