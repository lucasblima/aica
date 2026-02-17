/**
 * Google Drive Service
 *
 * Calls the drive-proxy Edge Function to interact with Google Drive API.
 * Requires Drive scope to be granted via Google OAuth.
 */

import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('DriveService');

// ============================================================================
// TYPES
// ============================================================================

export interface DriveFile {
    file_id: string;
    name: string;
    mime_type: string;
    icon_link: string;
    web_view_link: string;
    modified_time: string;
    size_bytes: number;
    shared: boolean;
    starred: boolean;
}

interface DriveListResponse {
    success: boolean;
    files: DriveFile[];
    nextPageToken?: string;
    error?: string;
}

interface DriveDetailResponse {
    success: boolean;
    file?: DriveFile;
    error?: string;
}

// ============================================================================
// API
// ============================================================================

/**
 * List files from Google Drive.
 * Returns empty array if not connected (does not throw).
 */
export async function listFiles(options?: {
    query?: string;
    maxResults?: number;
    pageToken?: string;
}): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('drive-proxy', {
            body: {
                action: 'list',
                query: options?.query,
                maxResults: options?.maxResults ?? 20,
                pageToken: options?.pageToken,
            },
        });

        if (error) {
            log.error('[listFiles] Edge Function error:', { error });
            return { files: [] };
        }

        const response = data as DriveListResponse;
        if (!response.success) {
            log.warn('[listFiles] API returned error:', response.error);
            return { files: [] };
        }

        return {
            files: response.files || [],
            nextPageToken: response.nextPageToken,
        };
    } catch (err) {
        log.error('[listFiles] Exception:', { error: err });
        return { files: [] };
    }
}

/**
 * Get a single file by ID.
 */
export async function getFile(fileId: string): Promise<DriveFile | null> {
    try {
        const { data, error } = await supabase.functions.invoke('drive-proxy', {
            body: {
                action: 'get',
                fileId,
            },
        });

        if (error) {
            log.error('[getFile] Edge Function error:', { error });
            return null;
        }

        const response = data as DriveDetailResponse;
        return response.success ? (response.file ?? null) : null;
    } catch (err) {
        log.error('[getFile] Exception:', { error: err });
        return null;
    }
}

/**
 * Search files with a Drive query string.
 * Returns empty array if not connected.
 */
export async function searchFiles(query: string): Promise<DriveFile[]> {
    const result = await listFiles({ query, maxResults: 20 });
    return result.files;
}

/**
 * Get recently modified files.
 */
export async function getRecentFiles(maxResults: number = 10): Promise<DriveFile[]> {
    const result = await listFiles({ maxResults });
    return result.files;
}
