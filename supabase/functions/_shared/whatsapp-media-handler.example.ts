/**
 * Usage Examples for WhatsApp Media Handler Modules
 * ==================================================
 *
 * This file demonstrates how to use the media handler and processor modules.
 * NOT meant to be imported - for reference only.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  processWhatsAppMedia,
  type ProcessMediaOptions,
  type ProcessMediaResult,
} from './whatsapp-document-processor.ts';
import {
  downloadMediaFromEvolution,
  uploadToStorage,
  validateMimeType,
  type DownloadMediaOptions,
  type UploadOptions,
} from './whatsapp-media-handler.ts';

// ============================================================================
// Example 1: Complete Document Processing (Recommended)
// ============================================================================

async function exampleProcessWhatsAppDocument() {
  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Options from webhook payload
  const options: ProcessMediaOptions = {
    userId: 'user-uuid-123',
    instanceName: 'my-whatsapp-instance',
    messageId: 'msg-abc-456',
    mediaType: 'document',
    mediaUrl: 'https://evolution-api.com/media/xyz',
    mimeType: 'application/pdf',
    originalFilename: 'invoice-2024.pdf',
    contactPhone: '5511999999999',
    remoteJid: '5511999999999@s.whatsapp.net',
  };

  // Process complete workflow
  const result: ProcessMediaResult = await processWhatsAppMedia(supabase, options);

  if (result.success) {
    console.log('✅ Processing successful!');
    console.log('Tracking ID:', result.trackingId);
    console.log('Document ID:', result.documentId);
    console.log('Detected Type:', result.detectedType);
    console.log('Confidence:', result.confidence);
  } else {
    console.log('❌ Processing failed:', result.error);
    if (result.trackingId) {
      console.log('Check tracking record:', result.trackingId);
    }
  }
}

// ============================================================================
// Example 2: Manual Download Only
// ============================================================================

async function exampleDownloadMedia() {
  const options: DownloadMediaOptions = {
    instanceName: 'my-instance',
    mediaUrl: 'https://evolution-api.com/media/xyz',
    messageId: 'msg-123',
    timeout: 30000, // Optional, defaults to 30s
  };

  const result = await downloadMediaFromEvolution(options);

  if (result.success) {
    console.log('✅ Download successful!');
    console.log('Size:', result.buffer!.length, 'bytes');
    console.log('MIME Type:', result.mimeType);
    console.log('Filename:', result.filename);
  } else {
    console.log('❌ Download failed:', result.error);
  }
}

// ============================================================================
// Example 3: Manual Upload Only
// ============================================================================

async function exampleUploadToStorage() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Assuming you have a buffer from download
  const buffer = new Uint8Array([/* binary data */]);

  const options: UploadOptions = {
    buffer,
    userId: 'user-123',
    originalFilename: 'document.pdf',
    mimeType: 'application/pdf',
  };

  const result = await uploadToStorage(supabase, options);

  if (result.success) {
    console.log('✅ Upload successful!');
    console.log('Storage Path:', result.storagePath);
  } else {
    console.log('❌ Upload failed:', result.error);
  }
}

// ============================================================================
// Example 4: MIME Type Validation
// ============================================================================

function exampleValidateMimeType() {
  console.log('PDF allowed?', validateMimeType('application/pdf')); // true
  console.log('JPEG allowed?', validateMimeType('image/jpeg')); // true
  console.log('EXE allowed?', validateMimeType('application/exe')); // false
  console.log('Unknown allowed?', validateMimeType('application/unknown')); // false
}

// ============================================================================
// Example 5: Error Handling Pattern
// ============================================================================

async function exampleErrorHandling() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const result = await processWhatsAppMedia(supabase, {
      userId: 'user-123',
      instanceName: 'instance',
      messageId: 'msg-456',
      mediaType: 'document',
      mediaUrl: 'https://...',
      mimeType: 'application/pdf',
      contactPhone: '5511999999999',
      remoteJid: '5511999999999@s.whatsapp.net',
    });

    if (!result.success) {
      // Handle processing failure
      console.error('Processing failed:', result.error);

      // Check tracking record for detailed status
      if (result.trackingId) {
        const { data: tracking } = await supabase
          .from('whatsapp_media_tracking')
          .select('*')
          .eq('id', result.trackingId)
          .single();

        console.log('Download status:', tracking?.download_status);
        console.log('Processing status:', tracking?.processing_status);
        console.log('Error message:', tracking?.error_message);
      }

      return;
    }

    // Success - use the result
    console.log('Document processed:', result.documentId);

  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
  }
}

// ============================================================================
// Example 6: Integration in Edge Function
// ============================================================================

/**
 * Example webhook handler for WhatsApp messages
 */
async function exampleWebhookHandler(request: Request) {
  const payload = await request.json();

  // Extract data from webhook payload
  const { data } = payload;
  const message = data?.message;

  // Only process document/image messages
  if (!message?.messageType || !['document', 'image'].includes(message.messageType)) {
    return new Response(JSON.stringify({ success: true, skipped: 'Not a document' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Initialize Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get user from phone number (your logic here)
  const userId = await getUserIdFromPhone(message.key.remoteJid);

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Process the media
  const result = await processWhatsAppMedia(supabase, {
    userId,
    instanceName: data.instance,
    messageId: message.key.id,
    mediaType: message.messageType,
    mediaUrl: message.message.documentMessage?.url || message.message.imageMessage?.url,
    mimeType: message.message.documentMessage?.mimetype || message.message.imageMessage?.mimetype,
    originalFilename: message.message.documentMessage?.fileName,
    contactPhone: message.key.remoteJid.split('@')[0],
    remoteJid: message.key.remoteJid,
  });

  // Return result
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper function placeholder
async function getUserIdFromPhone(remoteJid: string): Promise<string | null> {
  // Your implementation here
  return 'user-123';
}

// ============================================================================
// Export examples (not meant to be used)
// ============================================================================

export {
  exampleProcessWhatsAppDocument,
  exampleDownloadMedia,
  exampleUploadToStorage,
  exampleValidateMimeType,
  exampleErrorHandling,
  exampleWebhookHandler,
};
