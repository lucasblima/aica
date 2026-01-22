/**
 * WhatsApp Media Handler Module
 *
 * Handles downloading media from Evolution API and uploading to Supabase Storage.
 * Part of Issue #118 - WhatsApp Document Input implementation.
 *
 * @module whatsapp-media-handler
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createNamespacedLogger } from './logger.ts';

const log = createNamespacedLogger('whatsapp-media-handler');

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Options for downloading media from Evolution API
 */
export interface DownloadMediaOptions {
  /** Evolution API instance name */
  instanceName: string;
  /** Media URL from webhook payload */
  mediaUrl: string;
  /** WhatsApp message ID */
  messageId: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Result from media download operation
 */
export interface DownloadResult {
  /** Whether the download was successful */
  success: boolean;
  /** Downloaded file as binary buffer */
  buffer?: Uint8Array;
  /** MIME type of the downloaded file */
  mimeType?: string;
  /** Original filename from Evolution API */
  filename?: string;
  /** Error message if download failed */
  error?: string;
}

/**
 * Options for uploading media to Supabase Storage
 */
export interface UploadOptions {
  /** File binary data */
  buffer: Uint8Array;
  /** User ID for path organization */
  userId: string;
  /** Original filename from Evolution API */
  originalFilename: string;
  /** MIME type for Content-Type header */
  mimeType: string;
}

/**
 * Result from storage upload operation
 */
export interface UploadResult {
  /** Whether the upload was successful */
  success: boolean;
  /** Storage path where file was saved */
  storagePath?: string;
  /** Error message if upload failed */
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Whitelist of allowed MIME types for security
 * Only these file types can be processed
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/**
 * Default timeout for Evolution API requests (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Retry configuration for download requests
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Maximum filename length to prevent filesystem issues
 */
const MAX_FILENAME_LENGTH = 100;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitizes a filename for safe storage
 *
 * Removes invalid characters, limits length, preserves extension
 *
 * @param filename - Original filename
 * @returns Sanitized filename safe for storage
 *
 * @example
 * ```ts
 * sanitizeFilename('My Document (2024).pdf')
 * // Returns: 'my-document-2024.pdf'
 * ```
 */
function sanitizeFilename(filename: string): string {
  // Extract extension
  const lastDotIndex = filename.lastIndexOf('.');
  const extension = lastDotIndex > -1 ? filename.slice(lastDotIndex) : '';
  const nameWithoutExt = lastDotIndex > -1 ? filename.slice(0, lastDotIndex) : filename;

  // Remove accents and normalize
  const normalized = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics

  // Replace invalid characters with hyphens
  const cleaned = normalized
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-') // Keep only alphanumeric, underscore, hyphen
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Limit length (accounting for extension)
  const maxNameLength = MAX_FILENAME_LENGTH - extension.length;
  const truncated = cleaned.slice(0, Math.max(0, maxNameLength));

  return truncated + extension;
}

/**
 * Validates if a MIME type is allowed
 *
 * @param mimeType - MIME type to validate
 * @returns True if MIME type is in whitelist
 *
 * @example
 * ```ts
 * validateMimeType('application/pdf') // Returns: true
 * validateMimeType('application/exe') // Returns: false
 * ```
 */
export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

/**
 * Sleeps for a specified duration
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay
 *
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function getBackoffDelay(attempt: number): number {
  return RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Downloads media from Evolution API with retry logic
 *
 * Fetches media content from Evolution API endpoint with exponential backoff retry.
 * Handles timeouts, network errors, and HTTP errors gracefully.
 *
 * @param options - Download configuration
 * @returns Download result with buffer and metadata or error
 *
 * @example
 * ```ts
 * const result = await downloadMediaFromEvolution({
 *   instanceName: 'my-instance',
 *   mediaUrl: 'https://...',
 *   messageId: 'msg-123',
 *   timeout: 30000
 * });
 *
 * if (result.success) {
 *   console.log('Downloaded', result.buffer.length, 'bytes');
 * }
 * ```
 */
export async function downloadMediaFromEvolution(
  options: DownloadMediaOptions
): Promise<DownloadResult> {
  const { instanceName, mediaUrl, messageId, timeout = DEFAULT_TIMEOUT_MS } = options;

  log.debug('Starting media download', {
    instanceName,
    messageId,
    timeout,
  });

  // Get Evolution API credentials from environment
  const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

  if (!evolutionApiUrl || !evolutionApiKey) {
    const error = 'Evolution API credentials not configured';
    log.error(error, { instanceName, messageId });
    return { success: false, error };
  }

  // Construct API endpoint
  const endpoint = `${evolutionApiUrl}/message/media/${messageId}`;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      log.debug(`Download attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}`, {
        messageId,
        endpoint,
      });

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Make request to Evolution API
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
          'Accept': '*/*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check HTTP status
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        log.warn('Evolution API returned error status', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          messageId,
        });

        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            error: `Evolution API error: ${response.status} ${response.statusText}`,
          };
        }

        // Retry on 5xx errors (server errors)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Extract content type and filename from headers
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'document';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Read response body as binary
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      log.info('Media downloaded successfully', {
        messageId,
        size: buffer.length,
        mimeType: contentType,
        filename,
        attempt: attempt + 1,
      });

      return {
        success: true,
        buffer,
        mimeType: contentType,
        filename,
      };

    } catch (error) {
      const isLastAttempt = attempt === RETRY_CONFIG.maxAttempts - 1;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      log.warn('Download attempt failed', {
        messageId,
        attempt: attempt + 1,
        error: errorMessage,
        isLastAttempt,
      });

      if (isLastAttempt) {
        log.error('All download attempts failed', {
          messageId,
          totalAttempts: RETRY_CONFIG.maxAttempts,
          lastError: errorMessage,
        });

        return {
          success: false,
          error: `Failed to download media after ${RETRY_CONFIG.maxAttempts} attempts: ${errorMessage}`,
        };
      }

      // Wait before retry with exponential backoff
      const delayMs = getBackoffDelay(attempt);
      log.debug(`Waiting ${delayMs}ms before retry`, { messageId, attempt: attempt + 1 });
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs this
  return { success: false, error: 'Unexpected error in retry loop' };
}

/**
 * Uploads media to Supabase Storage
 *
 * Saves media file to the `whatsapp-documents` bucket with proper organization.
 * Path pattern: `{userId}/{timestamp}_{sanitized_filename}`
 *
 * @param supabase - Supabase client instance
 * @param options - Upload configuration
 * @returns Upload result with storage path or error
 *
 * @example
 * ```ts
 * const result = await uploadToStorage(supabase, {
 *   buffer: uint8Array,
 *   userId: 'user-123',
 *   originalFilename: 'document.pdf',
 *   mimeType: 'application/pdf'
 * });
 *
 * if (result.success) {
 *   console.log('Uploaded to', result.storagePath);
 * }
 * ```
 */
export async function uploadToStorage(
  supabase: SupabaseClient,
  options: UploadOptions
): Promise<UploadResult> {
  const { buffer, userId, originalFilename, mimeType } = options;

  log.debug('Starting storage upload', {
    userId,
    originalFilename,
    mimeType,
    size: buffer.length,
  });

  // Validate MIME type
  if (!validateMimeType(mimeType)) {
    const error = `MIME type not allowed: ${mimeType}`;
    log.error(error, { userId, originalFilename });
    return { success: false, error };
  }

  try {
    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(originalFilename);

    // Generate storage path: {userId}/{timestamp}_{filename}
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}_${sanitizedFilename}`;

    log.debug('Uploading to storage', {
      storagePath,
      originalFilename,
      sanitizedFilename,
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('whatsapp-documents')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false, // Prevent overwriting existing files
      });

    if (error) {
      log.error('Storage upload failed', {
        error: error.message,
        storagePath,
        userId,
      });
      return { success: false, error: `Storage upload failed: ${error.message}` };
    }

    log.info('Storage upload successful', {
      storagePath: data.path,
      userId,
      size: buffer.length,
    });

    return {
      success: true,
      storagePath: data.path,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Unexpected error during upload', {
      error: errorMessage,
      userId,
      originalFilename,
    });

    return {
      success: false,
      error: `Upload error: ${errorMessage}`,
    };
  }
}
