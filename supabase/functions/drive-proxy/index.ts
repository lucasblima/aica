import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getGoogleTokenForUser } from "../_shared/google-token-manager.ts";

const TAG = '[drive-proxy]';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const MAX_CONTENT_SIZE = 100 * 1024; // 100KB limit for text content

// Standard fields to return for file metadata
const FILE_FIELDS = 'id,name,mimeType,iconLink,webViewLink,thumbnailLink,modifiedTime,size,owners(displayName,emailAddress),shared,createdTime,starred,parents';

interface DriveProxyRequest {
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
    const { action, payload = {} }: DriveProxyRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'action is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 3. Get Google token
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const tokenResult = await getGoogleTokenForUser(user.id, 'drive.readonly', supabaseAdmin);

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
      case 'list_files': {
        const q = (payload.query as string) || '';
        const maxResults = (payload.maxResults as number) || 20;
        const pageToken = (payload.pageToken as string) || '';
        const orderBy = (payload.orderBy as string) || 'modifiedTime desc';

        const params = new URLSearchParams({
          pageSize: String(Math.min(maxResults, 100)),
          fields: `nextPageToken,files(${FILE_FIELDS})`,
          orderBy,
        });
        if (q) params.set('q', q);
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(`${DRIVE_API}/files?${params}`, { headers: googleHeaders });
        if (!res.ok) throw await buildDriveError(res);

        const data = await res.json();
        result = {
          files: (data.files || []).map(formatFileMetadata),
          nextPageToken: data.nextPageToken || null,
        };
        break;
      }

      case 'get_file': {
        const fileId = payload.fileId as string;
        if (!fileId) throw new Error('fileId is required');

        const params = new URLSearchParams({ fields: FILE_FIELDS });
        const res = await fetch(`${DRIVE_API}/files/${fileId}?${params}`, { headers: googleHeaders });
        if (!res.ok) throw await buildDriveError(res);

        result = formatFileMetadata(await res.json());
        break;
      }

      case 'search': {
        const query = payload.query as string;
        if (!query) throw new Error('query is required');

        const maxResults = (payload.maxResults as number) || 20;
        const pageToken = (payload.pageToken as string) || '';

        // Build Drive query: search in name and fullText
        const driveQuery = `(name contains '${escapeDriveQuery(query)}' or fullText contains '${escapeDriveQuery(query)}') and trashed = false`;

        const params = new URLSearchParams({
          q: driveQuery,
          pageSize: String(Math.min(maxResults, 100)),
          fields: `nextPageToken,files(${FILE_FIELDS})`,
          orderBy: 'modifiedTime desc',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(`${DRIVE_API}/files?${params}`, { headers: googleHeaders });
        if (!res.ok) throw await buildDriveError(res);

        const data = await res.json();
        result = {
          files: (data.files || []).map(formatFileMetadata),
          nextPageToken: data.nextPageToken || null,
        };
        break;
      }

      case 'list_recent': {
        const maxResults = (payload.maxResults as number) || 20;
        const pageToken = (payload.pageToken as string) || '';

        const params = new URLSearchParams({
          q: 'trashed = false',
          pageSize: String(Math.min(maxResults, 100)),
          fields: `nextPageToken,files(${FILE_FIELDS})`,
          orderBy: 'viewedByMeTime desc,modifiedTime desc',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(`${DRIVE_API}/files?${params}`, { headers: googleHeaders });
        if (!res.ok) throw await buildDriveError(res);

        const data = await res.json();
        result = {
          files: (data.files || []).map(formatFileMetadata),
          nextPageToken: data.nextPageToken || null,
        };
        break;
      }

      case 'get_content': {
        const fileId = payload.fileId as string;
        if (!fileId) throw new Error('fileId is required');

        // First get file metadata to determine type
        const metaRes = await fetch(
          `${DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size`,
          { headers: googleHeaders }
        );
        if (!metaRes.ok) throw await buildDriveError(metaRes);

        const meta = await metaRes.json();
        const mimeType = meta.mimeType as string;
        const fileSize = parseInt(meta.size || '0', 10);

        // Check size limit for non-Google Workspace files
        if (fileSize > MAX_CONTENT_SIZE && !mimeType.startsWith('application/vnd.google-apps.')) {
          throw new Error(`File too large (${Math.round(fileSize / 1024)}KB). Max ${MAX_CONTENT_SIZE / 1024}KB.`);
        }

        let textContent: string;

        if (mimeType === 'application/vnd.google-apps.document') {
          // Google Docs → export as plain text
          const res = await fetch(
            `${DRIVE_API}/files/${fileId}/export?mimeType=text/plain`,
            { headers: googleHeaders }
          );
          if (!res.ok) throw await buildDriveError(res);
          textContent = await res.text();
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
          // Google Sheets → export as CSV
          const res = await fetch(
            `${DRIVE_API}/files/${fileId}/export?mimeType=text/csv`,
            { headers: googleHeaders }
          );
          if (!res.ok) throw await buildDriveError(res);
          textContent = await res.text();
        } else if (mimeType === 'application/vnd.google-apps.presentation') {
          // Google Slides → export as plain text
          const res = await fetch(
            `${DRIVE_API}/files/${fileId}/export?mimeType=text/plain`,
            { headers: googleHeaders }
          );
          if (!res.ok) throw await buildDriveError(res);
          textContent = await res.text();
        } else if (mimeType.startsWith('text/') || mimeType === 'application/json') {
          // Plain text files → download directly
          const res = await fetch(
            `${DRIVE_API}/files/${fileId}?alt=media`,
            { headers: googleHeaders }
          );
          if (!res.ok) throw await buildDriveError(res);
          textContent = await res.text();
        } else {
          throw new Error(`Cannot extract text from file type: ${mimeType}. Supported: Google Docs, Sheets, Slides, text files, JSON.`);
        }

        // Truncate if too large
        if (textContent.length > MAX_CONTENT_SIZE) {
          textContent = textContent.substring(0, MAX_CONTENT_SIZE) + '\n\n[...truncated at 100KB]';
        }

        result = {
          fileId: meta.id,
          name: meta.name,
          mimeType,
          content: textContent,
          truncated: textContent.length >= MAX_CONTENT_SIZE,
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

function formatFileMetadata(file: Record<string, unknown>) {
  if (!file) return file;
  const parents = (file.parents as string[]) || [];
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    iconLink: file.iconLink,
    webViewLink: file.webViewLink,
    thumbnailLink: file.thumbnailLink || null,
    modifiedTime: file.modifiedTime,
    createdTime: file.createdTime,
    sizeBytes: file.size ? parseInt(file.size as string, 10) : null,
    owners: (file.owners as Array<Record<string, string>> || []).map(o => ({
      name: o.displayName,
      email: o.emailAddress,
    })),
    shared: file.shared || false,
    starred: file.starred || false,
    parentFolderId: parents[0] || null,
  };
}

function escapeDriveQuery(input: string): string {
  // Escape single quotes for Drive API query syntax
  return input.replace(/'/g, "\\'");
}

async function buildDriveError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message = body?.error?.message || res.statusText;
  return new Error(`Drive API error (${res.status}): ${message}`);
}
