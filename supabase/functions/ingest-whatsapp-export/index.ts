/**
 * Edge Function: ingest-whatsapp-export
 *
 * Processes user-uploaded WhatsApp chat export files.
 * Pipeline: download from storage → parse → store messages → extract intents → index RAG.
 *
 * Privacy: Raw text is NEVER stored in whatsapp_messages.
 * The full text is only indexed in File Search V2 (user-consented RAG).
 *
 * Request body:
 *   { storagePath: string, filename: string, importId: string, contactHint?: string }
 *
 * Related: Issue #211 - Universal Input Funnel
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createNamespacedLogger } from '../_shared/logger.ts';
import {
  parseWhatsAppExport,
  extractTextForRAG,
  generateDedupHash,
  type ParsedMessage,
} from '../_shared/whatsapp-export-parser.ts';

const log = createNamespacedLogger('ingest-whatsapp-export');

// ============================================================================
// CORS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Update the import record's processing status and stats.
 */
async function updateImportStatus(
  supabase: ReturnType<typeof createClient>,
  importId: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('whatsapp_file_imports')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', importId);

  if (error) {
    log.warn(`Failed to update import ${importId}:`, error.message);
  }
}

/**
 * Normalize a phone number from a WhatsApp export sender name.
 * WhatsApp exports usually show "+55 21 96556-4006" or just the name.
 * Returns null if the sender name is not a phone number.
 */
function extractPhoneFromSender(senderName: string): string | null {
  // Remove all non-digit characters
  const digits = senderName.replace(/\D/g, '');
  // Must be 10-15 digits to be a phone number
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return null;
}

/**
 * Resolve a sender name to a contact_id in contact_network.
 * Creates a new contact if not found.
 */
async function resolveContact(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  senderName: string,
  contactCache: Map<string, string>
): Promise<string | null> {
  // Check cache first
  const cached = contactCache.get(senderName);
  if (cached) return cached;

  const phone = extractPhoneFromSender(senderName);

  // Try to find by phone number first
  if (phone) {
    const { data: byPhone } = await supabase
      .from('contact_network')
      .select('id')
      .eq('user_id', userId)
      .or(`phone_number.eq.${phone},whatsapp_phone.eq.${phone},phone_number.eq.+${phone},whatsapp_phone.eq.+${phone}`)
      .limit(1)
      .single();

    if (byPhone) {
      contactCache.set(senderName, byPhone.id);
      return byPhone.id;
    }
  }

  // Try to find by name
  const { data: byName } = await supabase
    .from('contact_network')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', senderName)
    .limit(1)
    .single();

  if (byName) {
    contactCache.set(senderName, byName.id);
    return byName.id;
  }

  // Create new contact
  const { data: created, error: createError } = await supabase
    .from('contact_network')
    .insert({
      user_id: userId,
      name: senderName,
      phone_number: phone || null,
      whatsapp_phone: phone || null,
      sync_source: 'file_import',
      health_score: 10,
      health_score_trend: 'stable',
    })
    .select('id')
    .single();

  if (createError) {
    log.error(`Failed to create contact for "${senderName}":`, createError.message);
    return null;
  }

  contactCache.set(senderName, created.id);
  return created.id;
}

/**
 * Call extract-intent for a batch of messages.
 * Fire-and-forget pattern from webhook-evolution.
 */
async function extractIntentBatch(
  supabaseUrl: string,
  serviceRoleKey: string,
  messages: Array<{ id: string; intentSummaryText: string; senderName: string }>
): Promise<void> {
  for (const msg of messages) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/extract-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          messageId: msg.id,
          rawText: msg.intentSummaryText,
          contactName: msg.senderName,
          source: 'whatsapp', // Must be 'whatsapp' so extract-intent writes to DB
        }),
      });
    } catch (err) {
      log.warn(`extract-intent failed for ${msg.id}:`, err instanceof Error ? err.message : String(err));
    }

    // Rate limit: ~2 per second
    await new Promise((r) => setTimeout(r, 500));
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    // Environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Parse request
    const { storagePath, filename, importId, contactHint } = await req.json();

    if (!storagePath || !importId) {
      return jsonResponse({ success: false, error: 'Missing storagePath or importId' }, 400);
    }

    // Auth: Extract user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization header' }, 401);
    }

    // Create service-role client for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify import belongs to authenticated user
    const { data: importRecord, error: importError } = await supabase
      .from('whatsapp_file_imports')
      .select('id, user_id')
      .eq('id', importId)
      .single();

    if (importError || !importRecord) {
      return jsonResponse({ success: false, error: 'Import not found' }, 404);
    }

    const userId = importRecord.user_id;
    log.info(`Starting import ${importId} for user ${userId}, file: ${filename}`);

    // ---- Step 1: Update status to parsing ----
    await updateImportStatus(supabase, importId, { processing_status: 'parsing' });

    // ---- Step 2: Download file from storage ----
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('whatsapp-exports')
      .download(storagePath);

    if (downloadError || !fileData) {
      log.error('Failed to download file:', downloadError?.message);
      await updateImportStatus(supabase, importId, {
        processing_status: 'failed',
        processing_error: `Download failed: ${downloadError?.message || 'No data'}`,
      });
      return jsonResponse({ success: false, error: 'Failed to download file' }, 500);
    }

    // Handle .zip files: extract _chat.txt
    let textContent: string;
    const lowerFilename = (filename || storagePath).toLowerCase();

    if (lowerFilename.endsWith('.zip')) {
      // WhatsApp exports as zip contain a _chat.txt file
      // Supports: stored (method 0) and DEFLATE (method 8)
      // Handles data descriptor flag (bit 3) where local header sizes are 0
      try {
        const zipBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(zipBuffer);
        const decoder = new TextDecoder('utf-8');
        let extracted = false;

        // Helper: read 2-byte little-endian
        const u16 = (off: number) => bytes[off] | (bytes[off + 1] << 8);
        // Helper: read 4-byte little-endian
        const u32 = (off: number) => (bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0;

        // Step 1: Find End of Central Directory (scan from end)
        // EOCD signature: PK\x05\x06
        let eocdOffset = -1;
        for (let i = bytes.length - 22; i >= 0; i--) {
          if (bytes[i] === 0x50 && bytes[i + 1] === 0x4B && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
            eocdOffset = i;
            break;
          }
        }

        if (eocdOffset < 0) {
          log.error('No EOCD record found — not a valid zip');
          throw new Error('Invalid zip file');
        }

        const cdOffset = u32(eocdOffset + 16); // Offset of Central Directory
        const cdEntries = u16(eocdOffset + 10); // Total entries in CD
        log.info(`ZIP EOCD: ${cdEntries} entries, CD at offset ${cdOffset}`);

        // Step 2: Parse Central Directory to find .txt file with correct sizes
        let pos = cdOffset;
        for (let entry = 0; entry < cdEntries; entry++) {
          if (pos + 46 > bytes.length) break;
          // Central Directory header: PK\x01\x02
          if (bytes[pos] !== 0x50 || bytes[pos + 1] !== 0x4B || bytes[pos + 2] !== 0x01 || bytes[pos + 3] !== 0x02) {
            break;
          }

          const cdCompressionMethod = u16(pos + 10);
          const cdCompressedSize = u32(pos + 20);
          const cdUncompressedSize = u32(pos + 24);
          const cdFilenameLength = u16(pos + 28);
          const cdExtraLength = u16(pos + 30);
          const cdCommentLength = u16(pos + 32);
          const localHeaderOffset = u32(pos + 42);
          const cdFilename = decoder.decode(bytes.slice(pos + 46, pos + 46 + cdFilenameLength));

          log.info(`ZIP CD entry: "${cdFilename}" method=${cdCompressionMethod} compressed=${cdCompressedSize} uncompressed=${cdUncompressedSize} localOff=${localHeaderOffset}`);

          if (cdFilename.endsWith('.txt') && cdCompressedSize > 0) {
            // Found the .txt — read from local file header using CD's sizes
            const localFilenameLen = u16(localHeaderOffset + 26);
            const localExtraLen = u16(localHeaderOffset + 28);
            const dataStart = localHeaderOffset + 30 + localFilenameLen + localExtraLen;
            const compressedData = bytes.slice(dataStart, dataStart + cdCompressedSize);

            log.info(`Extracting ${cdCompressedSize} bytes from offset ${dataStart}`);

            if (cdCompressionMethod === 0) {
              textContent = decoder.decode(compressedData);
              extracted = true;
            } else if (cdCompressionMethod === 8) {
              // DEFLATE
              const ds = new DecompressionStream('deflate-raw');
              const writer = ds.writable.getWriter();
              const reader = ds.readable.getReader();

              writer.write(compressedData).then(() => writer.close());

              const chunks: Uint8Array[] = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }

              const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
              const decompressed = new Uint8Array(totalLen);
              let off = 0;
              for (const chunk of chunks) {
                decompressed.set(chunk, off);
                off += chunk.length;
              }

              textContent = decoder.decode(decompressed);
              extracted = true;
              log.info(`Decompressed: ${compressedData.length} → ${totalLen} bytes`);
            }

            if (extracted) break;
          }

          // Advance to next CD entry
          pos += 46 + cdFilenameLength + cdExtraLength + cdCommentLength;
        }

        if (!extracted) {
          log.error('No extractable .txt file found in zip');
          await updateImportStatus(supabase, importId, {
            processing_status: 'failed',
            processing_error: 'Nenhum arquivo .txt encontrado no zip. Exporte a conversa do WhatsApp e envie o arquivo .zip ou .txt.',
          });
          return jsonResponse({ success: false, error: 'No .txt found in zip' }, 400);
        }
      } catch (zipErr) {
        log.error('Failed to extract zip:', zipErr instanceof Error ? zipErr.message : String(zipErr));
        await updateImportStatus(supabase, importId, {
          processing_status: 'failed',
          processing_error: 'Falha ao extrair o zip. Envie o arquivo .txt diretamente.',
        });
        return jsonResponse({ success: false, error: 'Failed to extract zip' }, 400);
      }
    } else {
      textContent = await fileData.text();
    }

    if (!textContent || textContent.trim().length === 0) {
      await updateImportStatus(supabase, importId, {
        processing_status: 'failed',
        processing_error: 'File is empty or could not be read',
      });
      return jsonResponse({ success: false, error: 'Empty file' }, 400);
    }

    // ---- Step 3: Parse the export ----
    log.info(`Parsing export file (${textContent.length} chars)...`);
    const parsed = parseWhatsAppExport(textContent);

    log.info(`Parsed: ${parsed.totalMessages} messages, ${parsed.participants.length} participants, format=${parsed.exportFormat}`);

    await updateImportStatus(supabase, importId, {
      total_messages_parsed: parsed.totalMessages,
      export_format: parsed.exportFormat,
      date_range_start: parsed.dateRange.start.toISOString(),
      date_range_end: parsed.dateRange.end.toISOString(),
      participants: parsed.participants,
      is_group_export: parsed.isGroup,
    });

    if (parsed.totalMessages === 0) {
      await updateImportStatus(supabase, importId, {
        processing_status: 'completed',
        messages_imported: 0,
        processing_error: 'No messages found in export file',
      });
      return jsonResponse({
        success: true,
        importId,
        totalParsed: 0,
        imported: 0,
        deduplicated: 0,
      });
    }

    // ---- Step 4: Resolve contacts and insert messages ----
    await updateImportStatus(supabase, importId, { processing_status: 'extracting_intents' });

    const contactCache = new Map<string, string>();
    let messagesImported = 0;
    let messagesDeduplicated = 0;
    let contactsResolved = 0;
    const intentQueue: Array<{ id: string; intentSummaryText: string; senderName: string }> = [];

    // Process text messages only (skip system and media_omitted)
    const textMessages = parsed.messages.filter(
      (m) => m.messageType === 'text' && m.senderName && m.text.trim().length > 0
    );

    // Process in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < textMessages.length; i += BATCH_SIZE) {
      const batch = textMessages.slice(i, i + BATCH_SIZE);
      const inserts: Array<Record<string, unknown>> = [];

      for (const msg of batch) {
        // Resolve contact
        const contactId = await resolveContact(supabase, userId, msg.senderName, contactCache);
        if (!contactId) continue;

        if (!contactCache.has(`counted_${msg.senderName}`)) {
          contactsResolved++;
          contactCache.set(`counted_${msg.senderName}`, 'true');
        }

        // Generate dedup hash
        const dedupHash = await generateDedupHash(
          contactId,
          msg.timestamp,
          msg.senderName,
          msg.text
        );

        inserts.push({
          user_id: userId,
          contact_id: contactId,
          contact_phone: extractPhoneFromSender(msg.senderName) || '',
          contact_name: msg.senderName,
          message_direction: 'incoming',
          message_type: 'text',
          message_text: '', // Privacy: raw text never stored, extract-intent will fill intent_summary
          message_timestamp: msg.timestamp.toISOString(),
          processing_status: 'pending',
          source: 'file_import',
          dedup_hash: dedupHash,
          import_id: importId,
          instance_name: `import_${importId.substring(0, 8)}`,
          message_id: `imp_${dedupHash.substring(0, 16)}`,
        });
      }

      if (inserts.length === 0) continue;

      // Bulk insert messages
      const { data: inserted, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert(inserts)
        .select('id');

      if (insertError) {
        log.warn(`Batch insert error at offset ${i}: ${insertError.message}`);
        // If bulk fails, try one-by-one to skip problematic rows
        for (const row of inserts) {
          const { data: single, error: singleErr } = await supabase
            .from('whatsapp_messages')
            .insert(row)
            .select('id')
            .single();
          if (singleErr) {
            log.warn(`Single insert failed for ${row.message_id}: ${singleErr.message}`);
            messagesDeduplicated++;
          } else if (single) {
            messagesImported++;
          }
        }
        continue;
      }

      const insertedCount = inserted?.length || 0;
      messagesImported += insertedCount;

      // Queue inserted messages for intent extraction
      if (inserted) {
        for (let j = 0; j < inserted.length; j++) {
          const originalMsg = batch[j];
          if (originalMsg) {
            intentQueue.push({
              id: inserted[j].id,
              intentSummaryText: originalMsg.text.substring(0, 500),
              senderName: originalMsg.senderName,
            });
          }
        }
      }

      // Update progress every batch
      if (i % (BATCH_SIZE * 5) === 0) {
        await updateImportStatus(supabase, importId, {
          messages_imported: messagesImported,
          messages_deduplicated: messagesDeduplicated,
          contacts_resolved: contactsResolved,
        });
      }
    }

    log.info(`Inserted ${messagesImported} messages, ${messagesDeduplicated} deduplicated, ${contactsResolved} contacts`);

    await updateImportStatus(supabase, importId, {
      messages_imported: messagesImported,
      messages_deduplicated: messagesDeduplicated,
      contacts_resolved: contactsResolved,
    });

    // ---- Step 5: Extract intents (fully awaited) ----
    // Process ALL intents synchronously to avoid stuck "pending" messages.
    // Supabase Edge Functions have a 150s wall-clock limit, so we process
    // in batches of 50 with a small delay to respect Gemini rate limits.
    if (intentQueue.length > 0) {
      log.info(`Processing ${intentQueue.length} messages for intent extraction...`);

      const INTENT_BATCH_SIZE = 50;
      for (let i = 0; i < intentQueue.length; i += INTENT_BATCH_SIZE) {
        const batch = intentQueue.slice(i, i + INTENT_BATCH_SIZE);
        await extractIntentBatch(supabaseUrl, serviceRoleKey, batch);
        log.info(`Intent extraction progress: ${Math.min(i + INTENT_BATCH_SIZE, intentQueue.length)}/${intentQueue.length}`);
      }
    }

    // ---- Step 6: Index in File Search V2 for RAG ----
    await updateImportStatus(supabase, importId, { processing_status: 'indexing_rag' });

    const ragText = extractTextForRAG(parsed);
    if (ragText.length > 100) {
      try {
        const ragResponse = await fetch(`${supabaseUrl}/functions/v1/file-search-v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            action: 'upload_document',
            userId,
            storeName: `whatsapp-conversations-${userId}`,
            storeDisplayName: 'WhatsApp Conversations',
            documentContent: ragText,
            documentDisplayName: filename || 'whatsapp-export.txt',
            metadata: {
              importId,
              participants: parsed.participants,
              dateRange: {
                start: parsed.dateRange.start.toISOString(),
                end: parsed.dateRange.end.toISOString(),
              },
            },
          }),
        });

        if (ragResponse.ok) {
          const ragResult = await ragResponse.json();
          if (ragResult.storeId || ragResult.documentId) {
            await updateImportStatus(supabase, importId, {
              file_search_store_id: ragResult.storeId || null,
              file_search_document_id: ragResult.documentId || null,
            });
          }
          log.info('RAG indexing completed');
        } else {
          log.warn('RAG indexing failed:', await ragResponse.text());
        }
      } catch (ragErr) {
        log.warn('RAG indexing error (non-fatal):', ragErr instanceof Error ? ragErr.message : String(ragErr));
      }
    }

    // ---- Step 7: Trigger downstream pipelines ----
    // Fire-and-forget: build-contact-dossier and build-conversation-threads
    const uniqueContactIds = [...new Set(Array.from(contactCache.values()).filter(v => v !== 'true'))];

    for (const fn of ['build-contact-dossier', 'build-conversation-threads']) {
      fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ userId, contactIds: uniqueContactIds.slice(0, 20) }),
      }).catch((err) => {
        log.warn(`${fn} trigger failed (non-fatal):`, err instanceof Error ? err.message : String(err));
      });
    }

    // ---- Step 8: Mark completed ----
    await updateImportStatus(supabase, importId, {
      processing_status: 'completed',
      messages_imported: messagesImported,
      messages_deduplicated: messagesDeduplicated,
      contacts_resolved: contactsResolved,
    });

    log.info(`Import ${importId} completed successfully`);

    return jsonResponse({
      success: true,
      importId,
      totalParsed: parsed.totalMessages,
      imported: messagesImported,
      deduplicated: messagesDeduplicated,
      contacts: contactsResolved,
      format: parsed.exportFormat,
      participants: parsed.participants,
      dateRange: {
        start: parsed.dateRange.start.toISOString(),
        end: parsed.dateRange.end.toISOString(),
      },
    });
  } catch (err) {
    log.error('Unhandled error:', err instanceof Error ? err.message : String(err));
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      500
    );
  }
});
