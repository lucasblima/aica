import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getGoogleTokenForUser } from "../_shared/google-token-manager.ts";

const TAG = '[gmail-proxy]';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface GmailProxyRequest {
  action: string;
  payload?: Record<string, unknown>;
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
    const { action, payload = {} }: GmailProxyRequest = await req.json();

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

    // 4. Route action
    let result: unknown;

    switch (action) {
      case 'list_messages': {
        const q = (payload.query as string) || '';
        const maxResults = (payload.maxResults as number) || 20;
        const pageToken = (payload.pageToken as string) || '';
        const labelIds = (payload.labelIds as string[]) || [];

        const params = new URLSearchParams();
        if (q) params.set('q', q);
        params.set('maxResults', String(Math.min(maxResults, 100)));
        if (pageToken) params.set('pageToken', pageToken);
        labelIds.forEach(l => params.append('labelIds', l));

        const listRes = await fetch(`${GMAIL_API}/messages?${params}`, { headers: googleHeaders });
        if (!listRes.ok) throw await buildGmailError(listRes);

        const listData = await listRes.json();
        const messages = listData.messages || [];

        // Fetch metadata for each message (batch of first N)
        const batchSize = Math.min(messages.length, maxResults);
        const detailed = await Promise.all(
          messages.slice(0, batchSize).map(async (m: { id: string }) => {
            const res = await fetch(
              `${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To`,
              { headers: googleHeaders }
            );
            if (!res.ok) return { id: m.id, error: true };
            return await res.json();
          })
        );

        result = {
          messages: detailed.map(formatMessageMetadata),
          nextPageToken: listData.nextPageToken || null,
          resultSizeEstimate: listData.resultSizeEstimate || 0,
        };
        break;
      }

      case 'get_message': {
        const messageId = payload.messageId as string;
        if (!messageId) throw new Error('messageId is required');

        const res = await fetch(
          `${GMAIL_API}/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To&metadataHeaders=Cc`,
          { headers: googleHeaders }
        );
        if (!res.ok) throw await buildGmailError(res);

        result = formatMessageMetadata(await res.json());
        break;
      }

      case 'get_thread': {
        const threadId = payload.threadId as string;
        if (!threadId) throw new Error('threadId is required');

        const res = await fetch(
          `${GMAIL_API}/threads/${threadId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=To`,
          { headers: googleHeaders }
        );
        if (!res.ok) throw await buildGmailError(res);

        const threadData = await res.json();
        result = {
          id: threadData.id,
          messages: (threadData.messages || []).map(formatMessageMetadata),
        };
        break;
      }

      case 'search': {
        const query = payload.query as string;
        if (!query) throw new Error('query is required');

        const maxResults = (payload.maxResults as number) || 20;
        const pageToken = (payload.pageToken as string) || '';

        const params = new URLSearchParams({
          q: query,
          maxResults: String(Math.min(maxResults, 100)),
        });
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(`${GMAIL_API}/messages?${params}`, { headers: googleHeaders });
        if (!res.ok) throw await buildGmailError(res);

        const searchData = await res.json();
        const messages = searchData.messages || [];

        const detailed = await Promise.all(
          messages.slice(0, Math.min(messages.length, maxResults)).map(async (m: { id: string }) => {
            const r = await fetch(
              `${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
              { headers: googleHeaders }
            );
            if (!r.ok) return { id: m.id, error: true };
            return await r.json();
          })
        );

        result = {
          messages: detailed.map(formatMessageMetadata),
          nextPageToken: searchData.nextPageToken || null,
          resultSizeEstimate: searchData.resultSizeEstimate || 0,
        };
        break;
      }

      case 'get_message_body': {
        const messageId = payload.messageId as string;
        if (!messageId) throw new Error('messageId is required');

        const res = await fetch(
          `${GMAIL_API}/messages/${messageId}?format=full`,
          { headers: googleHeaders }
        );
        if (!res.ok) throw await buildGmailError(res);

        const msgData = await res.json();
        const { text: bodyText, contentType } = extractBodyFromPayload(msgData.payload);

        result = {
          body: bodyText,
          content_type: contentType,
        };
        break;
      }

      case 'list_labels': {
        const res = await fetch(`${GMAIL_API}/labels`, { headers: googleHeaders });
        if (!res.ok) throw await buildGmailError(res);

        const labelData = await res.json();
        result = {
          labels: (labelData.labels || []).map((l: Record<string, unknown>) => ({
            id: l.id,
            name: l.name,
            type: l.type,
            messagesTotal: l.messagesTotal,
            messagesUnread: l.messagesUnread,
          })),
        };
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
      JSON.stringify({ success: true, data: result }),
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
  if (!msg || msg.error) return msg;

  const headers = (msg.payload as Record<string, unknown>)?.headers as Array<{ name: string; value: string }> || [];
  const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const fromRaw = getHeader('From');
  const labelIds = (msg.labelIds as string[]) || [];

  return {
    id: msg.id,
    threadId: msg.threadId,
    snippet: msg.snippet,
    subject: getHeader('Subject'),
    sender: fromRaw,
    senderEmail: extractEmail(fromRaw),
    to: getHeader('To'),
    cc: getHeader('Cc'),
    date: getHeader('Date'),
    receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
    labels: labelIds,
    isRead: !labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED'),
    hasAttachments: hasAttachmentParts(msg.payload as Record<string, unknown>),
  };
}

function extractEmail(from: string): string {
  // "John Doe <john@example.com>" → "john@example.com"
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

function hasAttachmentParts(payload: Record<string, unknown> | undefined): boolean {
  if (!payload) return false;
  const parts = (payload.parts as Array<Record<string, unknown>>) || [];
  return parts.some(p => {
    const filename = p.filename as string;
    return filename && filename.length > 0;
  });
}

function extractBodyFromPayload(payload: Record<string, unknown> | undefined): { text: string; contentType: 'text/html' | 'text/plain' } {
  if (!payload) return { text: '', contentType: 'text/plain' };

  // Single-part message
  const body = payload.body as Record<string, unknown> | undefined;
  if (body?.data) {
    const mimeType = (payload.mimeType as string) || 'text/plain';
    return {
      text: decodeBase64Url(body.data as string),
      contentType: mimeType === 'text/html' ? 'text/html' : 'text/plain',
    };
  }

  // Multi-part message — prefer text/html, fallback to text/plain
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
      if (nested.text) {
        if (nested.contentType === 'text/html' && !htmlText) htmlText = nested.text;
        else if (!plainText) plainText = nested.text;
      }
    }
  }

  if (htmlText) return { text: htmlText, contentType: 'text/html' };
  if (plainText) return { text: plainText, contentType: 'text/plain' };
  return { text: '', contentType: 'text/plain' };
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return atob(base64);
  } catch {
    return '';
  }
}

async function buildGmailError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message = body?.error?.message || res.statusText;
  return new Error(`Gmail API error (${res.status}): ${message}`);
}
