import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getGoogleTokenForUser } from "../_shared/google-token-manager.ts";

const TAG = '[email-intelligence]';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface EmailIntelligenceRequest {
  action: string;
  limit?: number;
  message_ids?: string[];
  contact_email?: string;
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
    const body: EmailIntelligenceRequest = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'action is required' }),
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

    // 4. Validate Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // 5. Route action
    let result: unknown;

    switch (action) {
      case 'categorize_batch': {
        result = await handleCategorizeBatch(
          user.id, body.limit || 50, googleHeaders, geminiApiKey, supabaseAdmin
        );
        break;
      }

      case 'extract_tasks_batch': {
        const messageIds = body.message_ids || [];
        if (messageIds.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'message_ids is required and must not be empty' }),
            { status: 400, headers: jsonHeaders }
          );
        }
        if (messageIds.length > 10) {
          return new Response(
            JSON.stringify({ success: false, error: 'message_ids must have at most 10 items' }),
            { status: 400, headers: jsonHeaders }
          );
        }
        result = await handleExtractTasksBatch(
          user.id, messageIds, googleHeaders, geminiApiKey, supabaseAdmin
        );
        break;
      }

      case 'enrich_contact': {
        const contactEmail = body.contact_email;
        if (!contactEmail) {
          return new Response(
            JSON.stringify({ success: false, error: 'contact_email is required' }),
            { status: 400, headers: jsonHeaders }
          );
        }
        result = await handleEnrichContact(contactEmail, googleHeaders, geminiApiKey);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: jsonHeaders }
        );
    }

    console.log(TAG, `Action ${action} completed for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: jsonHeaders }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error(TAG, 'Error:', message);
    if (error instanceof Error) console.error(TAG, 'Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: jsonHeaders }
    );
  }
});

// ============================================================================
// Action: categorize_batch
// ============================================================================

async function handleCategorizeBatch(
  userId: string,
  limit: number,
  googleHeaders: Record<string, string>,
  geminiApiKey: string,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  console.log(TAG, `categorize_batch: fetching ${safeLimit} messages for user ${userId}`);

  // Fetch recent messages metadata from Gmail
  const params = new URLSearchParams({
    maxResults: String(safeLimit),
  });

  const listRes = await fetch(`${GMAIL_API}/messages?${params}`, { headers: googleHeaders });
  if (!listRes.ok) throw await buildGmailError(listRes);

  const listData = await listRes.json();
  const messageRefs = listData.messages || [];

  if (messageRefs.length === 0) {
    return { categorized: 0, categories: {} };
  }

  // Fetch metadata for each message
  const detailed = await Promise.all(
    messageRefs.map(async (m: { id: string }) => {
      const res = await fetch(
        `${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: googleHeaders }
      );
      if (!res.ok) return { id: m.id, error: true };
      return await res.json();
    })
  );

  const messages = detailed
    .filter((m: Record<string, unknown>) => m && !m.error)
    .map(formatMessageMetadata);

  if (messages.length === 0) {
    return { categorized: 0, categories: {} };
  }

  // Build prompt for Gemini
  const emailList = messages.map((m, i) =>
    `${i + 1}. message_id: "${m.id}"\n   De: ${m.sender}\n   Assunto: ${m.subject}\n   Trecho: ${m.snippet}`
  ).join('\n\n');

  const prompt = `Voce e um assistente que classifica emails. Classifique cada email abaixo em uma das categorias: actionable, informational, newsletter, receipt, personal, notification.

Para cada email, tambem identifique:
- Tarefas possiveis (array de strings, pode ser vazio)
- Contatos mencionados (array de strings com emails, pode ser vazio)

=== EMAILS ===
${emailList}
=== FIM ===

Retorne APENAS JSON valido no formato array:
[
  {
    "message_id": "string",
    "category": "actionable" | "informational" | "newsletter" | "receipt" | "personal" | "notification",
    "confidence": 0.0-1.0,
    "tasks": ["string"],
    "contacts": ["email@example.com"]
  }
]

Responda APENAS com JSON valido, sem texto adicional.`;

  const geminiResult = await callGemini(geminiApiKey, prompt);
  let categorized: Array<{
    message_id: string;
    category: string;
    confidence: number;
    tasks: string[];
    contacts: string[];
  }>;

  try {
    categorized = extractJSON(geminiResult) as typeof categorized;
    if (!Array.isArray(categorized)) {
      categorized = [];
    }
  } catch (parseErr) {
    console.error(TAG, 'Failed to parse categorization JSON:', parseErr);
    return { categorized: 0, categories: {}, error: 'Failed to parse AI response' };
  }

  // Upsert results into gmail_email_categories
  for (const item of categorized) {
    const { error: upsertError } = await supabaseAdmin
      .from('gmail_email_categories')
      .upsert({
        user_id: userId,
        message_id: item.message_id,
        category: item.category,
        confidence: item.confidence,
        ai_tasks: item.tasks || [],
        ai_contacts: item.contacts || [],
        categorized_at: new Date().toISOString(),
      }, { onConflict: 'user_id,message_id' });

    if (upsertError) {
      console.error(TAG, `Upsert failed for message ${item.message_id}:`, upsertError.message);
    }
  }

  // Build category summary
  const categories: Record<string, number> = {};
  for (const item of categorized) {
    categories[item.category] = (categories[item.category] || 0) + 1;
  }

  return { categorized: categorized.length, categories };
}

// ============================================================================
// Action: extract_tasks_batch
// ============================================================================

async function handleExtractTasksBatch(
  userId: string,
  messageIds: string[],
  googleHeaders: Record<string, string>,
  geminiApiKey: string,
  supabaseAdmin: ReturnType<typeof createClient>
) {
  console.log(TAG, `extract_tasks_batch: processing ${messageIds.length} messages for user ${userId}`);

  const allTasks: Array<{
    message_id: string;
    task_description: string;
    due_date: string | null;
    priority: string;
  }> = [];

  for (const messageId of messageIds) {
    // Fetch full message body from Gmail API
    const res = await fetch(
      `${GMAIL_API}/messages/${messageId}?format=full`,
      { headers: googleHeaders }
    );

    if (!res.ok) {
      console.error(TAG, `Failed to fetch message ${messageId}: ${res.status}`);
      continue;
    }

    const msgData = await res.json();
    const bodyText = extractBodyFromPayload(msgData.payload);

    if (!bodyText || bodyText.trim().length === 0) {
      console.warn(TAG, `No body text found for message ${messageId}`);
      continue;
    }

    // Get subject for context
    const headers = msgData.payload?.headers || [];
    const subject = headers.find((h: { name: string }) => h.name.toLowerCase() === 'subject')?.value || '';

    const prompt = `Voce e um assistente que extrai tarefas acionaveis de emails. Analise o email abaixo e extraia todas as tarefas.

Assunto: ${subject}

=== CORPO DO EMAIL ===
${bodyText.substring(0, 3000)}
=== FIM ===

Retorne APENAS JSON valido no formato array:
[
  {
    "task_description": "Descricao clara da tarefa",
    "due_date": "YYYY-MM-DD ou null se nao especificado",
    "priority": "high" | "medium" | "low"
  }
]

Se nao houver tarefas, retorne um array vazio: []
Responda APENAS com JSON valido, sem texto adicional.`;

    const geminiResult = await callGemini(geminiApiKey, prompt);

    try {
      const tasks = extractJSON(geminiResult) as Array<{
        task_description: string;
        due_date: string | null;
        priority: string;
      }>;

      if (Array.isArray(tasks)) {
        for (const task of tasks) {
          allTasks.push({ message_id: messageId, ...task });

          // Insert into email_extracted_tasks
          const { error: insertError } = await supabaseAdmin
            .from('email_extracted_tasks')
            .insert({
              user_id: userId,
              message_id: messageId,
              task_description: task.task_description,
              due_date: task.due_date || null,
              priority: task.priority || 'medium',
              status: 'pending',
            });

          if (insertError) {
            console.error(TAG, `Insert task failed for message ${messageId}:`, insertError.message);
          }
        }
      }
    } catch (parseErr) {
      console.error(TAG, `Failed to parse tasks for message ${messageId}:`, parseErr);
    }
  }

  return { tasks_extracted: allTasks.length, tasks: allTasks };
}

// ============================================================================
// Action: enrich_contact
// ============================================================================

async function handleEnrichContact(
  contactEmail: string,
  googleHeaders: Record<string, string>,
  geminiApiKey: string
) {
  console.log(TAG, `enrich_contact: analyzing communication with ${contactEmail}`);

  // Search Gmail for messages from/to this contact
  const query = `from:${contactEmail} OR to:${contactEmail}`;
  const params = new URLSearchParams({
    q: query,
    maxResults: '20',
  });

  const listRes = await fetch(`${GMAIL_API}/messages?${params}`, { headers: googleHeaders });
  if (!listRes.ok) throw await buildGmailError(listRes);

  const listData = await listRes.json();
  const messageRefs = listData.messages || [];

  if (messageRefs.length === 0) {
    return {
      enrichment: {
        frequency: 'none',
        topics: [],
        sentiment: 'neutral',
        last_interaction: null,
        relationship_type: 'unknown',
        message_count: 0,
      },
    };
  }

  // Fetch metadata (subjects and snippets only — privacy-first)
  const detailed = await Promise.all(
    messageRefs.map(async (m: { id: string }) => {
      const res = await fetch(
        `${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: googleHeaders }
      );
      if (!res.ok) return { id: m.id, error: true };
      return await res.json();
    })
  );

  const messages = detailed
    .filter((m: Record<string, unknown>) => m && !m.error)
    .map(formatMessageMetadata);

  if (messages.length === 0) {
    return {
      enrichment: {
        frequency: 'none',
        topics: [],
        sentiment: 'neutral',
        last_interaction: null,
        relationship_type: 'unknown',
        message_count: 0,
      },
    };
  }

  // Build prompt — only subjects and snippets go to Gemini (never bodies)
  const emailSummary = messages.map((m, i) =>
    `${i + 1}. De: ${m.sender} | Data: ${m.date}\n   Assunto: ${m.subject}\n   Trecho: ${m.snippet}`
  ).join('\n\n');

  const prompt = `Voce e um assistente que analisa padroes de comunicacao por email. Analise as interacoes abaixo com o contato "${contactEmail}".

Total de emails encontrados: ${messages.length}

=== EMAILS ===
${emailSummary}
=== FIM ===

Analise o padrao de comunicacao e retorne APENAS JSON valido:
{
  "frequency": "daily" | "weekly" | "monthly" | "sporadic" | "rare",
  "topics": ["topico1", "topico2"],
  "sentiment": "positive" | "neutral" | "negative",
  "last_interaction": "YYYY-MM-DD",
  "relationship_type": "professional" | "personal" | "commercial" | "institutional" | "mixed"
}

Responda APENAS com JSON valido, sem texto adicional.`;

  const geminiResult = await callGemini(geminiApiKey, prompt);

  let enrichment: Record<string, unknown>;
  try {
    enrichment = extractJSON(geminiResult) as Record<string, unknown>;
  } catch (parseErr) {
    console.error(TAG, 'Failed to parse enrichment JSON:', parseErr);
    enrichment = {
      frequency: 'unknown',
      topics: [],
      sentiment: 'neutral',
      last_interaction: messages[0]?.receivedAt || null,
      relationship_type: 'unknown',
    };
  }

  return {
    enrichment: {
      ...enrichment,
      message_count: messages.length,
    },
  };
}

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
    date: getHeader('Date'),
    receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
  };
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

function extractBodyFromPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) return '';

  // Single-part message
  const body = payload.body as Record<string, unknown> | undefined;
  if (body?.data) {
    return decodeBase64Url(body.data as string);
  }

  // Multi-part message — prefer text/plain, fallback to text/html
  const parts = (payload.parts as Array<Record<string, unknown>>) || [];
  let plainText = '';
  let htmlText = '';

  for (const part of parts) {
    const mimeType = part.mimeType as string;
    const partBody = part.body as Record<string, unknown> | undefined;

    if (mimeType === 'text/plain' && partBody?.data) {
      plainText = decodeBase64Url(partBody.data as string);
    } else if (mimeType === 'text/html' && partBody?.data) {
      htmlText = decodeBase64Url(partBody.data as string);
    }

    // Recurse into nested parts (e.g. multipart/alternative inside multipart/mixed)
    if (part.parts) {
      const nested = extractBodyFromPayload(part as Record<string, unknown>);
      if (nested) {
        if (!plainText) plainText = nested;
      }
    }
  }

  if (plainText) return plainText;
  if (htmlText) return stripHtml(htmlText);
  return '';
}

function decodeBase64Url(data: string): string {
  // Gmail uses base64url encoding (replace - with + and _ with /)
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return atob(base64);
  } catch {
    return '';
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJSON(text: string): unknown {
  // 1. Strip thinking tags (Gemini 2.5 may include them)
  let cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
  // 2. Strip code fences FIRST
  cleaned = cleaned.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');
  cleaned = cleaned.trim();

  // 3. Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue to fallback
  }

  // 4. Find first { or [ and match to last } or ]
  const objStart = cleaned.indexOf('{');
  const arrStart = cleaned.indexOf('[');
  let start = -1;
  let end = -1;

  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    start = objStart;
    end = cleaned.lastIndexOf('}');
  } else if (arrStart >= 0) {
    start = arrStart;
    end = cleaned.lastIndexOf(']');
  }

  if (start === -1 || end <= start) {
    throw new Error(`No JSON found in response (length=${text.length})`);
  }

  return JSON.parse(cleaned.substring(start, end + 1));
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(TAG, `Gemini API error (${response.status}):`, errBody.substring(0, 500));
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const parts = result.candidates?.[0]?.content?.parts || [];
  let text = '';
  for (const part of parts) {
    if (part.text && !part.thought) {
      text += part.text;
    }
  }
  return text.trim();
}

async function buildGmailError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message = body?.error?.message || res.statusText;
  return new Error(`Gmail API error (${res.status}): ${message}`);
}
