/**
 * Edge Function: receive-email-import
 *
 * Receives inbound emails from Resend webhook (import@import.aica.guru).
 * Pipeline:
 *   1. Validate webhook signature (svix)
 *   2. Extract sender email + attachments
 *   3. Resolve user by email (auth.users lookup + aliases)
 *   4. Rate limit: max 10 imports/day per user
 *   5. Download attachment via Resend Received Email Attachments API
 *   6. Upload to Storage (whatsapp-exports/{user_id}/)
 *   7. Create whatsapp_file_imports record with source='email_import'
 *   8. Invoke ingest-whatsapp-export (reuses entire pipeline)
 *   9. Send confirmation email via Resend
 *
 * Phase 3 of Evolution API removal plan.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createNamespacedLogger } from '../_shared/logger.ts';

const log = createNamespacedLogger('receive-email-import');

// ============================================================================
// CONSTANTS
// ============================================================================

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_IMPORTS_PER_DAY = 10;
const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = ['.txt', '.zip'];
const FROM_EMAIL = 'AICA Import <noreply@aica.app>';

// ============================================================================
// CORS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION (SVIX)
// ============================================================================

async function verifyWebhookSignature(
  body: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
): Promise<boolean> {
  if (!RESEND_WEBHOOK_SECRET) {
    log.warn('RESEND_WEBHOOK_SECRET not configured — skipping signature verification');
    return true; // Allow in dev, but log warning
  }

  if (!svixId || !svixTimestamp || !svixSignature) {
    log.warn('Missing svix headers');
    return false;
  }

  // Verify timestamp is within 5 minutes
  const timestamp = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    log.warn('Webhook timestamp too old/future');
    return false;
  }

  // Compute expected signature
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const secretBytes = base64ToUint8Array(RESEND_WEBHOOK_SECRET.replace('whsec_', ''));

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
  const expectedSignature = `v1,${uint8ArrayToBase64(new Uint8Array(signatureBytes))}`;

  // Svix sends multiple signatures separated by spaces
  const signatures = svixSignature.split(' ');
  return signatures.some((sig) => sig === expectedSignature);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

// ============================================================================
// RESEND API HELPERS
// ============================================================================

/**
 * Extract email address from "Name <email>" format or plain email.
 */
function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase().trim();
  // Plain email
  return from.toLowerCase().trim();
}

/**
 * Fetch received email details from Resend Receiving API.
 * This gets the full email including attachment metadata.
 */
async function fetchReceivedEmail(emailId: string): Promise<any | null> {
  if (!RESEND_API_KEY) return null;

  try {
    const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });

    if (!response.ok) {
      log.error(`Failed to fetch received email ${emailId}: ${response.status} ${response.statusText}`);
      const text = await response.text();
      log.error(`Response body: ${text.substring(0, 500)}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    log.error('Error fetching received email:', error);
    return null;
  }
}

/**
 * Download attachment content via Resend Received Email Attachments API.
 * Uses GET /emails/receiving/{email_id}/attachments/{attachment_id} → download_url.
 */
async function downloadAttachment(
  emailId: string,
  attachmentId: string,
  attachmentFilename: string,
): Promise<{ content: Uint8Array; filename: string; size: number } | null> {
  if (!RESEND_API_KEY) {
    log.error('RESEND_API_KEY not configured');
    return null;
  }

  try {
    // Step 1: Get attachment download URL
    const metaResponse = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } },
    );

    if (!metaResponse.ok) {
      log.error(`Failed to fetch attachment meta ${attachmentId}: ${metaResponse.status}`);
      const text = await metaResponse.text();
      log.error(`Response: ${text.substring(0, 500)}`);
      return null;
    }

    const meta = await metaResponse.json();
    const downloadUrl = meta.download_url;

    if (!downloadUrl) {
      log.error(`No download_url in attachment meta: ${JSON.stringify(meta).substring(0, 300)}`);
      return null;
    }

    // Step 2: Download actual file content
    const contentResponse = await fetch(downloadUrl);

    if (!contentResponse.ok) {
      log.error(`Failed to download from URL: ${contentResponse.status}`);
      return null;
    }

    const arrayBuffer = await contentResponse.arrayBuffer();
    const content = new Uint8Array(arrayBuffer);

    return {
      content,
      filename: attachmentFilename || meta.filename || 'attachment.txt',
      size: content.length,
    };
  } catch (error) {
    log.error('Error downloading attachment:', error);
    return null;
  }
}

/**
 * Send confirmation or rejection email via Resend.
 */
async function sendReplyEmail(
  to: string,
  subject: string,
  htmlBody: string,
): Promise<boolean> {
  if (!RESEND_API_KEY) return false;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      log.error(`Failed to send reply email: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    log.error('Error sending reply email:', error);
    return false;
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function confirmationEmailHTML(filename: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
      <div style="background: linear-gradient(135deg, #F5F0E8 0%, #EDE8DC 100%); border-radius: 16px; padding: 32px; text-align: center;">
        <h2 style="color: #2D2A24; margin: 0 0 12px;">Import recebido!</h2>
        <p style="color: #6B6760; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          Seu arquivo <strong>${filename}</strong> esta sendo processado pelo AICA.
          Os contatos e insights aparecerao em <strong>Conexoes</strong> em alguns minutos.
        </p>
        <p style="color: #9B958C; font-size: 12px; margin: 0;">
          Privacidade: mensagens brutas nunca sao armazenadas, apenas resumos de intencao.
        </p>
      </div>
      <p style="color: #C4BFB5; font-size: 11px; text-align: center; margin-top: 16px;">
        AICA Life OS &mdash; aica.guru
      </p>
    </div>
  `;
}

function rejectionEmailHTML(reason: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
      <div style="background: linear-gradient(135deg, #FEF3E8 0%, #FDE8D8 100%); border-radius: 16px; padding: 32px; text-align: center;">
        <h2 style="color: #2D2A24; margin: 0 0 12px;">Import nao processado</h2>
        <p style="color: #6B6760; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          ${reason}
        </p>
        <p style="color: #9B958C; font-size: 12px; margin: 0;">
          Duvidas? Acesse <a href="https://aica.guru" style="color: #D4AF37;">aica.guru</a>
        </p>
      </div>
    </div>
  `;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const rawBody = await req.text();

  // 1. Verify webhook signature
  const isValid = await verifyWebhookSignature(
    rawBody,
    req.headers.get('svix-id'),
    req.headers.get('svix-timestamp'),
    req.headers.get('svix-signature'),
  );

  if (!isValid) {
    log.error('Invalid webhook signature');
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const eventType = payload.type;

  // Only handle email.received events
  if (eventType !== 'email.received') {
    log.info(`Ignoring event type: ${eventType}`);
    return jsonResponse({ ok: true, skipped: true });
  }

  const emailData = payload.data;

  // Log full webhook payload structure (keys only) for debugging
  log.info(`Webhook payload keys: ${JSON.stringify(Object.keys(payload))}`);
  log.info(`Webhook data keys: ${JSON.stringify(Object.keys(emailData || {}))}`);
  log.info(`Webhook data.from: ${JSON.stringify(emailData?.from)}`);
  log.info(`Webhook data.attachments: ${JSON.stringify(emailData?.attachments)}`);

  // Extract email from "Name <email>" format
  const rawFrom = emailData?.from || '';
  const senderEmail = extractEmailAddress(rawFrom);
  const emailId = emailData?.email_id || emailData?.id;
  const subject = emailData?.subject || '';
  let attachments = emailData?.attachments || [];

  log.info(`Email received from "${rawFrom}" → parsed as "${senderEmail}", emailId: ${emailId}, subject: "${subject}", webhook attachments: ${attachments.length}`);

  // If webhook reported 0 attachments, try fetching via Received Email API as fallback
  if (attachments.length === 0 && emailId) {
    log.info('Webhook had 0 attachments — fetching received email via API for fallback...');
    const fullEmail = await fetchReceivedEmail(emailId);
    if (fullEmail) {
      log.info(`API received email keys: ${JSON.stringify(Object.keys(fullEmail))}`);
      log.info(`API attachments: ${JSON.stringify(fullEmail.attachments)}`);
      if (fullEmail.attachments && fullEmail.attachments.length > 0) {
        attachments = fullEmail.attachments;
        log.info(`Found ${attachments.length} attachments via API fallback!`);
      }
    }
  }

  // 2. Create audit log entry
  const { data: logEntry, error: logError } = await supabase
    .from('email_import_log')
    .insert({
      email_message_id: emailId || 'unknown',
      sender_email: senderEmail || 'unknown',
      subject,
      attachment_count: attachments.length,
      status: 'received',
    })
    .select('id')
    .single();

  if (logError) {
    log.error('Failed to create audit log:', logError.message);
  }

  const logId = logEntry?.id;

  // Helper to update log status
  const updateLog = async (status: string, rejectionReason?: string) => {
    if (!logId) return;
    await supabase
      .from('email_import_log')
      .update({
        status,
        rejection_reason: rejectionReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', logId);
  };

  // 3. Resolve user by sender email (direct match + aliases)
  if (!senderEmail) {
    await updateLog('rejected', 'No sender email');
    return jsonResponse({ ok: true, rejected: true, reason: 'no_sender' });
  }

  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    log.error('Failed to list users:', userError.message);
    await updateLog('failed', 'Internal error resolving user');
    return jsonResponse({ error: 'Internal error' }, 500);
  }

  // Try direct match first
  let matchedUser = users.users.find(
    (u: any) => u.email?.toLowerCase() === senderEmail,
  );

  // If no direct match, check email aliases table
  if (!matchedUser) {
    log.info(`No direct match for ${senderEmail}, checking aliases...`);
    const { data: alias } = await supabase
      .from('user_email_aliases')
      .select('user_id')
      .eq('alias_email', senderEmail)
      .eq('is_verified', true)
      .limit(1)
      .single();

    if (alias?.user_id) {
      matchedUser = users.users.find((u: any) => u.id === alias.user_id);
      if (matchedUser) {
        log.info(`Resolved ${senderEmail} via alias → user ${matchedUser.id}`);
      }
    }
  }

  if (!matchedUser) {
    log.warn(`No AICA account found for email: ${senderEmail}`);
    await updateLog('rejected', `No AICA account for ${senderEmail}`);

    // Send rejection email
    await sendReplyEmail(
      senderEmail,
      'AICA - Import nao processado',
      rejectionEmailHTML(
        `Nenhuma conta AICA encontrada para o email <strong>${senderEmail}</strong>. ` +
        `Crie sua conta em <a href="https://aica.guru">aica.guru</a> e tente novamente ` +
        `usando o mesmo email cadastrado na sua conta.`,
      ),
    );

    return jsonResponse({ ok: true, rejected: true, reason: 'user_not_found' });
  }

  // Update log with resolved user
  if (logId) {
    await supabase
      .from('email_import_log')
      .update({ resolved_user_id: matchedUser.id })
      .eq('id', logId);
  }

  // 4. Rate limit check
  const { data: importCount } = await supabase.rpc('count_user_email_imports_today', {
    p_user_id: matchedUser.id,
  });

  if ((importCount || 0) >= MAX_IMPORTS_PER_DAY) {
    log.warn(`Rate limit exceeded for user ${matchedUser.id}: ${importCount} imports today`);
    await updateLog('rejected', 'Rate limit: max 10 imports/day');

    await sendReplyEmail(
      senderEmail,
      'AICA - Limite diario atingido',
      rejectionEmailHTML(
        'Voce atingiu o limite de 10 importacoes por dia. Tente novamente amanha ou ' +
        'use o upload direto em <a href="https://aica.guru">aica.guru</a>.',
      ),
    );

    return jsonResponse({ ok: true, rejected: true, reason: 'rate_limited' });
  }

  // 5. Validate attachments
  if (attachments.length === 0) {
    log.warn('Email has no attachments');
    await updateLog('rejected', 'No attachments');

    await sendReplyEmail(
      senderEmail,
      'AICA - Nenhum arquivo encontrado',
      rejectionEmailHTML(
        'Seu email nao continha nenhum arquivo anexo. ' +
        'Exporte a conversa do WhatsApp como .txt e envie como anexo.',
      ),
    );

    return jsonResponse({ ok: true, rejected: true, reason: 'no_attachments' });
  }

  // 6. Process each valid attachment
  let processedCount = 0;
  const results: Array<{ filename: string; importId?: string; error?: string }> = [];

  await updateLog('processing');

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const filename = att.filename || `attachment_${i}`;
    const attachmentId = att.id;
    const extension = '.' + filename.split('.').pop()?.toLowerCase();

    log.info(`Processing attachment ${i}: id=${attachmentId}, filename=${filename}, content_type=${att.content_type}`);

    // Validate file type
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      log.info(`Skipping attachment ${filename}: unsupported type ${extension}`);
      results.push({ filename, error: `Tipo nao suportado: ${extension}` });
      continue;
    }

    // Download attachment content via Resend Attachments API
    if (!attachmentId) {
      log.error(`Attachment ${i} has no id — cannot download`);
      results.push({ filename, error: 'Anexo sem identificador' });
      continue;
    }

    const attachmentData = await downloadAttachment(emailId, attachmentId, filename);

    if (!attachmentData) {
      log.error(`Failed to download attachment ${attachmentId}`);
      results.push({ filename, error: 'Falha ao baixar anexo' });
      continue;
    }

    // Validate size
    if (attachmentData.size > MAX_ATTACHMENT_SIZE) {
      log.warn(`Attachment too large: ${attachmentData.size} bytes`);
      results.push({ filename, error: 'Arquivo muito grande (max 100MB)' });
      continue;
    }

    // Compute file hash for dedup
    const hashBuffer = await crypto.subtle.digest('SHA-256', attachmentData.content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Check for duplicate
    const { data: existing } = await supabase
      .from('whatsapp_file_imports')
      .select('id')
      .eq('user_id', matchedUser.id)
      .eq('file_hash', fileHash)
      .eq('processing_status', 'completed')
      .limit(1);

    if (existing && existing.length > 0) {
      log.info(`Duplicate file skipped: ${filename} (hash: ${fileHash.substring(0, 12)})`);
      results.push({ filename, error: 'Arquivo ja importado anteriormente' });
      continue;
    }

    // Upload to Storage
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${matchedUser.id}/${timestamp}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('whatsapp-exports')
      .upload(storagePath, attachmentData.content, {
        contentType: extension === '.zip' ? 'application/zip' : 'text/plain',
        upsert: false,
      });

    if (uploadError) {
      log.error(`Storage upload failed for ${filename}:`, uploadError.message);
      results.push({ filename, error: 'Falha no upload' });
      continue;
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('whatsapp_file_imports')
      .insert({
        user_id: matchedUser.id,
        original_filename: filename,
        file_size_bytes: attachmentData.size,
        storage_path: storagePath,
        file_hash: fileHash,
        processing_status: 'pending',
        source: 'email_import',
        sender_email: senderEmail,
        email_message_id: emailId,
      })
      .select('id')
      .single();

    if (importError || !importRecord) {
      log.error(`Failed to create import record for ${filename}:`, importError?.message);
      results.push({ filename, error: 'Falha ao registrar import' });
      continue;
    }

    // Invoke ingest pipeline (fire-and-forget)
    const { error: invokeError } = await supabase.functions.invoke('ingest-whatsapp-export', {
      body: {
        storagePath,
        filename,
        importId: importRecord.id,
      },
    });

    if (invokeError) {
      log.error(`Failed to invoke ingest for ${filename}:`, invokeError.message);
      // Don't fail — the import record exists and can be retried
    }

    results.push({ filename, importId: importRecord.id });
    processedCount++;
  }

  // 7. Update log and send confirmation
  if (processedCount > 0) {
    await updateLog('completed');

    const fileList = results
      .filter((r) => r.importId)
      .map((r) => r.filename)
      .join(', ');

    await sendReplyEmail(
      senderEmail,
      'AICA - Import em processamento',
      confirmationEmailHTML(fileList),
    );
  } else {
    const errorReasons = results.map((r) => `${r.filename}: ${r.error}`).join('<br>');
    await updateLog('failed', `No valid attachments: ${results.map((r) => r.error).join('; ')}`);

    await sendReplyEmail(
      senderEmail,
      'AICA - Import com problemas',
      rejectionEmailHTML(
        `Nenhum arquivo valido encontrado:<br><br>${errorReasons}<br><br>` +
        `Envie arquivos .txt ou .zip exportados do WhatsApp.`,
      ),
    );
  }

  log.info(`Processed ${processedCount}/${attachments.length} attachments for ${senderEmail}`);

  return jsonResponse({
    ok: true,
    processed: processedCount,
    total: attachments.length,
    results,
  });
});
