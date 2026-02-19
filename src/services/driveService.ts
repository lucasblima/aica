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
    id: string;
    name: string;
    mimeType: string;
    iconLink: string;
    webViewLink: string;
    thumbnailLink: string | null;
    modifiedTime: string;
    createdTime: string;
    sizeBytes: number | null;
    owners: Array<{ name: string; email: string }>;
    shared: boolean;
    starred: boolean;
    parentFolderId: string | null;
}

interface DriveListResponse {
    success: boolean;
    data: {
        files: DriveFile[];
        nextPageToken: string | null;
    };
    error?: string;
}

interface DriveDetailResponse {
    success: boolean;
    data: DriveFile;
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
                action: 'list_files',
                payload: {
                    query: options?.query,
                    maxResults: options?.maxResults ?? 20,
                    pageToken: options?.pageToken,
                },
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
            files: response.data?.files || [],
            nextPageToken: response.data?.nextPageToken ?? undefined,
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
                action: 'get_file',
                payload: { fileId },
            },
        });

        if (error) {
            log.error('[getFile] Edge Function error:', { error });
            return null;
        }

        const response = data as DriveDetailResponse;
        return response.success ? (response.data ?? null) : null;
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
    try {
        const { data, error } = await supabase.functions.invoke('drive-proxy', {
            body: {
                action: 'search',
                payload: { query, maxResults: 20 },
            },
        });

        if (error) {
            log.error('[searchFiles] Edge Function error:', { error });
            return [];
        }

        const response = data as DriveListResponse;
        if (!response.success) {
            log.warn('[searchFiles] API returned error:', response.error);
            return [];
        }

        return response.data?.files || [];
    } catch (err) {
        log.error('[searchFiles] Exception:', { error: err });
        return [];
    }
}

/**
 * Get recently modified files.
 */
export async function getRecentFiles(maxResults: number = 10): Promise<DriveFile[]> {
    try {
        const { data, error } = await supabase.functions.invoke('drive-proxy', {
            body: {
                action: 'list_recent',
                payload: { maxResults },
            },
        });

        if (error) {
            log.error('[getRecentFiles] Edge Function error:', { error });
            return [];
        }

        const response = data as DriveListResponse;
        if (!response.success) {
            log.warn('[getRecentFiles] API returned error:', response.error);
            return [];
        }

        return response.data?.files || [];
    } catch (err) {
        log.error('[getRecentFiles] Exception:', { error: err });
        return [];
    }
}

/**
 * Get text content of a file (Google Docs → text, Sheets → CSV, text files → raw).
 * Returns null if the file type is not supported for text extraction.
 */
export async function getFileContent(fileId: string): Promise<{
    content: string;
    name: string;
    mimeType: string;
    truncated: boolean;
} | null> {
    try {
        const { data, error } = await supabase.functions.invoke('drive-proxy', {
            body: {
                action: 'get_content',
                payload: { fileId },
            },
        });

        if (error) {
            log.error('[getFileContent] Edge Function error:', { error });
            return null;
        }

        const response = data as { success: boolean; data?: { content: string; name: string; mimeType: string; truncated: boolean }; error?: string };
        if (!response.success || !response.data) {
            log.warn('[getFileContent] API returned error:', response.error);
            return null;
        }

        return response.data;
    } catch (err) {
        log.error('[getFileContent] Exception:', { error: err });
        return null;
    }
}

// ============================================================================
// WRITE ACTIONS (require full drive scope)
// ============================================================================

interface DriveActionResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}

async function driveAction(action: string, payload: Record<string, unknown>): Promise<{ success: boolean; error?: string; data?: unknown }> {
    try {
        const { data, error } = await supabase.functions.invoke('drive-proxy', {
            body: { action, payload },
        });

        if (error) {
            log.error(`[${action}] Edge Function error:`, { error });
            return { success: false, error: String(error) };
        }

        const response = data as DriveActionResponse;
        if (!response.success) {
            log.warn(`[${action}] API returned error:`, response.error);
            return { success: false, error: response.error };
        }

        return { success: true, data: response.data };
    } catch (err) {
        log.error(`[${action}] Exception:`, { error: err });
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/**
 * Move a file to trash.
 */
export async function trashFile(fileId: string) {
    return driveAction('trash_file', { fileId });
}

/**
 * Move a file to a different folder.
 */
export async function moveFile(fileId: string, targetFolderId: string) {
    return driveAction('move_file', { fileId, targetFolderId });
}

/**
 * Rename a file.
 */
export async function renameFile(fileId: string, newName: string) {
    return driveAction('rename_file', { fileId, newName });
}

/**
 * Create a new folder.
 */
export async function createFolder(name: string, parentId?: string) {
    return driveAction('create_folder', { name, parentId });
}
