/**
 * WhatsApp Document Processor Module
 *
 * Orchestrates the complete flow of processing WhatsApp media documents:
 * 1. Create tracking record
 * 2. Download from Evolution API
 * 3. Upload to Supabase Storage
 * 4. Call process-document Edge Function
 * 5. Update tracking with results
 *
 * Part of Issue #118 - WhatsApp Document Input implementation.
 *
 * @module whatsapp-document-processor
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createNamespacedLogger } from './logger.ts';
import {
  downloadMediaFromEvolution,
  uploadToStorage,
  validateMimeType,
  type DownloadMediaOptions,
} from './whatsapp-media-handler.ts';

const log = createNamespacedLogger('whatsapp-document-processor');

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Options for processing WhatsApp media
 */
export interface ProcessMediaOptions {
  /** User ID who received the message */
  userId: string;
  /** Evolution API instance name */
  instanceName: string;
  /** WhatsApp message ID */
  messageId: string;
  /** Media type from webhook */
  mediaType: 'document' | 'image' | 'audio' | 'video';
  /** Media URL from webhook payload */
  mediaUrl: string;
  /** MIME type of the media */
  mimeType: string;
  /** Original filename (optional) */
  originalFilename?: string;
  /** Contact phone number */
  contactPhone: string;
  /** WhatsApp remote JID */
  remoteJid: string;
}

/**
 * Result from media processing operation
 */
export interface ProcessMediaResult {
  /** Whether processing was successful */
  success: boolean;
  /** Tracking record ID for status monitoring */
  trackingId?: string;
  /** Processed document ID (from process-document function) */
  documentId?: string;
  /** Detected document type */
  detectedType?: string;
  /** Classification confidence score (0-1) */
  confidence?: number;
  /** Error message if processing failed */
  error?: string;
}

/**
 * Tracking record data for database insert
 */
interface MediaTrackingData {
  user_id: string;
  message_id: string;
  instance_name: string;
  media_type: string;
  mime_type: string;
  original_filename?: string;
  download_status: 'pending' | 'downloading' | 'completed' | 'failed';
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Process document request payload
 */
interface ProcessDocumentRequest {
  storage_path: string;
  file_type: 'pdf' | 'image' | 'docx' | 'pptx';
  source: 'whatsapp';
  source_phone: string;
  whatsapp_message_id: string;
}

/**
 * Process document response
 */
interface ProcessDocumentResponse {
  success: boolean;
  documentId?: string;
  detectedType?: string;
  confidence?: number;
  extractedFields?: Record<string, any>;
  linkSuggestions?: Array<{
    module: string;
    entityType: string;
    reasoning: string;
  }>;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detects file type category from MIME type
 *
 * @param mimeType - MIME type string
 * @returns File type category
 *
 * @example
 * ```ts
 * detectFileType('application/pdf') // Returns: 'pdf'
 * detectFileType('image/jpeg') // Returns: 'image'
 * ```
 */
function detectFileType(mimeType: string): 'pdf' | 'image' | 'docx' | 'pptx' {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return 'pptx';
  }

  // Default to image for unknown types (process-document will handle validation)
  log.warn('Unknown MIME type, defaulting to image', { mimeType });
  return 'image';
}

/**
 * Creates a media tracking record in the database
 *
 * @param supabase - Supabase client instance
 * @param data - Tracking data to insert
 * @returns Created tracking record with ID
 */
async function createMediaTracking(
  supabase: SupabaseClient,
  data: MediaTrackingData
): Promise<{ id: string }> {
  log.debug('Creating media tracking record', {
    message_id: data.message_id,
    media_type: data.media_type,
  });

  const { data: tracking, error } = await supabase
    .from('whatsapp_media_tracking')
    .insert(data)
    .select('id')
    .single();

  if (error) {
    log.error('Failed to create tracking record', {
      error: error.message,
      data,
    });
    throw new Error(`Failed to create tracking record: ${error.message}`);
  }

  log.info('Tracking record created', {
    tracking_id: tracking.id,
    message_id: data.message_id,
  });

  return { id: tracking.id };
}

/**
 * Updates tracking record status and metadata
 *
 * @param supabase - Supabase client instance
 * @param trackingId - Tracking record ID
 * @param downloadStatus - Download status to set
 * @param processingStatus - Processing status to set
 * @param updates - Additional fields to update
 */
async function updateTrackingStatus(
  supabase: SupabaseClient,
  trackingId: string,
  downloadStatus: 'pending' | 'downloading' | 'completed' | 'failed',
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed',
  updates?: Record<string, any>
): Promise<void> {
  log.debug('Updating tracking status', {
    tracking_id: trackingId,
    download_status: downloadStatus,
    processing_status: processingStatus,
    updates,
  });

  const updateData = {
    download_status: downloadStatus,
    processing_status: processingStatus,
    ...updates,
  };

  const { error } = await supabase
    .from('whatsapp_media_tracking')
    .update(updateData)
    .eq('id', trackingId);

  if (error) {
    log.error('Failed to update tracking status', {
      tracking_id: trackingId,
      error: error.message,
    });
    throw new Error(`Failed to update tracking status: ${error.message}`);
  }

  log.debug('Tracking status updated', {
    tracking_id: trackingId,
    download_status: downloadStatus,
    processing_status: processingStatus,
  });
}

/**
 * Calls the process-document Edge Function
 *
 * @param supabase - Supabase client instance
 * @param request - Process document request payload
 * @returns Process document response
 */
async function callProcessDocument(
  supabase: SupabaseClient,
  request: ProcessDocumentRequest
): Promise<ProcessDocumentResponse> {
  log.debug('Calling process-document function', {
    storage_path: request.storage_path,
    file_type: request.file_type,
  });

  try {
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: request,
    });

    if (error) {
      log.error('process-document function returned error', {
        error: error.message,
        request,
      });
      return {
        success: false,
        error: `Document processing failed: ${error.message}`,
      };
    }

    log.info('process-document completed successfully', {
      storage_path: request.storage_path,
      document_id: data?.documentId,
      detected_type: data?.detectedType,
    });

    return {
      success: true,
      documentId: data?.documentId,
      detectedType: data?.detectedType,
      confidence: data?.confidence,
      extractedFields: data?.extractedFields,
      linkSuggestions: data?.linkSuggestions,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Unexpected error calling process-document', {
      error: errorMessage,
      request,
    });

    return {
      success: false,
      error: `Unexpected error: ${errorMessage}`,
    };
  }
}

// ============================================================================
// Core Processing Function
// ============================================================================

/**
 * Processes WhatsApp media through complete workflow
 *
 * Orchestrates the full pipeline:
 * 1. Creates tracking record in database
 * 2. Validates MIME type against whitelist
 * 3. Downloads media from Evolution API
 * 4. Uploads to Supabase Storage
 * 5. Invokes process-document Edge Function
 * 6. Updates tracking with final results
 *
 * Each step updates the tracking record status for monitoring.
 *
 * @param supabase - Supabase client instance
 * @param options - Media processing configuration
 * @returns Processing result with tracking ID and document details
 *
 * @example
 * ```ts
 * const result = await processWhatsAppMedia(supabase, {
 *   userId: 'user-123',
 *   instanceName: 'my-instance',
 *   messageId: 'msg-456',
 *   mediaType: 'document',
 *   mediaUrl: 'https://...',
 *   mimeType: 'application/pdf',
 *   originalFilename: 'contract.pdf',
 *   contactPhone: '5511999999999',
 *   remoteJid: '5511999999999@s.whatsapp.net'
 * });
 *
 * if (result.success) {
 *   console.log('Document processed:', result.documentId);
 *   console.log('Detected type:', result.detectedType);
 * }
 * ```
 */
export async function processWhatsAppMedia(
  supabase: SupabaseClient,
  options: ProcessMediaOptions
): Promise<ProcessMediaResult> {
  const {
    userId,
    instanceName,
    messageId,
    mediaType,
    mediaUrl,
    mimeType,
    originalFilename,
    contactPhone,
    remoteJid,
  } = options;

  log.info('Starting WhatsApp media processing', {
    user_id: userId,
    message_id: messageId,
    media_type: mediaType,
    mime_type: mimeType,
  });

  try {
    // ========================================================================
    // Step 1: Create tracking record
    // ========================================================================
    const tracking = await createMediaTracking(supabase, {
      user_id: userId,
      message_id: messageId,
      instance_name: instanceName,
      media_type: mediaType,
      mime_type: mimeType,
      original_filename: originalFilename,
      download_status: 'pending',
      processing_status: 'pending',
    });

    const trackingId = tracking.id;

    try {
      // ======================================================================
      // Step 2: Validate MIME type
      // ======================================================================
      if (!validateMimeType(mimeType)) {
        log.warn('Unsupported MIME type', { mime_type: mimeType, tracking_id: trackingId });

        await updateTrackingStatus(supabase, trackingId, 'failed', 'failed', {
          error_message: `Unsupported MIME type: ${mimeType}`,
        });

        return {
          success: false,
          trackingId,
          error: 'Formato de arquivo não suportado',
        };
      }

      // ======================================================================
      // Step 3: Download media from Evolution API
      // ======================================================================
      await updateTrackingStatus(supabase, trackingId, 'downloading', 'pending');

      const downloadResult = await downloadMediaFromEvolution({
        instanceName,
        mediaUrl,
        messageId,
      });

      if (!downloadResult.success) {
        log.error('Media download failed', {
          tracking_id: trackingId,
          error: downloadResult.error,
        });

        await updateTrackingStatus(supabase, trackingId, 'failed', 'pending', {
          error_message: downloadResult.error,
        });

        return {
          success: false,
          trackingId,
          error: 'Falha ao baixar mídia do WhatsApp',
        };
      }

      // ======================================================================
      // Step 4: Upload to Supabase Storage
      // ======================================================================
      const uploadResult = await uploadToStorage(supabase, {
        buffer: downloadResult.buffer!,
        userId,
        originalFilename: originalFilename || downloadResult.filename || 'document',
        mimeType: downloadResult.mimeType || mimeType,
      });

      if (!uploadResult.success) {
        log.error('Storage upload failed', {
          tracking_id: trackingId,
          error: uploadResult.error,
        });

        await updateTrackingStatus(supabase, trackingId, 'failed', 'pending', {
          error_message: uploadResult.error,
        });

        return {
          success: false,
          trackingId,
          error: 'Falha ao salvar arquivo',
        };
      }

      // ======================================================================
      // Step 5: Update tracking with storage path
      // ======================================================================
      await updateTrackingStatus(supabase, trackingId, 'completed', 'processing', {
        storage_path: uploadResult.storagePath,
        downloaded_at: new Date().toISOString(),
      });

      // ======================================================================
      // Step 6: Call process-document Edge Function
      // ======================================================================
      const fileType = detectFileType(downloadResult.mimeType || mimeType);

      const processResult = await callProcessDocument(supabase, {
        storage_path: uploadResult.storagePath!,
        file_type: fileType,
        source: 'whatsapp',
        source_phone: contactPhone,
        whatsapp_message_id: messageId,
      });

      // ======================================================================
      // Step 7: Update tracking with final results
      // ======================================================================
      if (processResult.success) {
        await updateTrackingStatus(supabase, trackingId, 'completed', 'completed', {
          processed_document_id: processResult.documentId,
          processed_at: new Date().toISOString(),
        });

        log.info('Media processing completed successfully', {
          tracking_id: trackingId,
          document_id: processResult.documentId,
          detected_type: processResult.detectedType,
        });

        return {
          success: true,
          trackingId,
          documentId: processResult.documentId,
          detectedType: processResult.detectedType,
          confidence: processResult.confidence,
        };
      } else {
        await updateTrackingStatus(supabase, trackingId, 'completed', 'failed', {
          error_message: processResult.error,
        });

        log.error('Document processing failed', {
          tracking_id: trackingId,
          error: processResult.error,
        });

        return {
          success: false,
          trackingId,
          error: 'Falha ao processar documento',
        };
      }

    } catch (stepError) {
      // Handle errors in any processing step
      const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error';
      log.error('Error during processing workflow', {
        tracking_id: trackingId,
        error: errorMessage,
      });

      // Attempt to update tracking status
      try {
        await updateTrackingStatus(supabase, trackingId, 'failed', 'failed', {
          error_message: errorMessage,
        });
      } catch (updateError) {
        log.error('Failed to update tracking after error', {
          tracking_id: trackingId,
          update_error: updateError instanceof Error ? updateError.message : 'Unknown',
        });
      }

      return {
        success: false,
        trackingId,
        error: 'Erro durante processamento',
      };
    }

  } catch (error) {
    // Handle errors in tracking creation
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Failed to initialize media processing', {
      message_id: messageId,
      error: errorMessage,
    });

    return {
      success: false,
      error: 'Falha ao inicializar processamento',
    };
  }
}
