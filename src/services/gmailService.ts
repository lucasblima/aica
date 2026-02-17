/**
 * Gmail Service
 *
 * Calls the gmail-proxy Edge Function to interact with Gmail API.
 * Requires Gmail scope to be granted via Google OAuth.
 */

import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GmailService');

// ============================================================================
// TYPES
// ============================================================================

export interface GmailMessage {
    id: string;
    threadId: string;
    subject: string;
    snippet: string;
    sender: string;
    senderEmail: string;
    to: string;
    cc: string;
    date: string;
    receivedAt: string | null;
    labels: string[];
    isRead: boolean;
    isStarred: boolean;
    hasAttachments: boolean;
}

export interface GmailThread {
    id: string;
    messages: GmailMessage[];
}

interface GmailListResponse {
    success: boolean;
    data: {
        messages: GmailMessage[];
        nextPageToken: string | null;
        resultSizeEstimate: number;
    };
    error?: string;
}

interface GmailDetailResponse {
    success: boolean;
    data: GmailMessage | GmailThread;
    error?: string;
}

// ============================================================================
// API
// ============================================================================

/**
 * List emails from the user's Gmail inbox.
 * Returns empty array if not connected (does not throw).
 */
export async function listEmails(options?: {
    query?: string;
    maxResults?: number;
    pageToken?: string;
}): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('gmail-proxy', {
            body: {
                action: 'list_messages',
                payload: {
                    query: options?.query,
                    maxResults: options?.maxResults ?? 20,
                    pageToken: options?.pageToken,
                },
            },
        });

        if (error) {
            log.error('[listEmails] Edge Function error:', { error });
            return { messages: [] };
        }

        const response = data as GmailListResponse;
        if (!response.success) {
            log.warn('[listEmails] API returned error:', response.error);
            return { messages: [] };
        }

        return {
            messages: response.data?.messages || [],
            nextPageToken: response.data?.nextPageToken ?? undefined,
        };
    } catch (err) {
        log.error('[listEmails] Exception:', { error: err });
        return { messages: [] };
    }
}

/**
 * Get a single email by message ID.
 */
export async function getEmail(messageId: string): Promise<GmailMessage | null> {
    try {
        const { data, error } = await supabase.functions.invoke('gmail-proxy', {
            body: {
                action: 'get_message',
                payload: { messageId },
            },
        });

        if (error) {
            log.error('[getEmail] Edge Function error:', { error });
            return null;
        }

        const response = data as GmailDetailResponse;
        return response.success ? (response.data as GmailMessage ?? null) : null;
    } catch (err) {
        log.error('[getEmail] Exception:', { error: err });
        return null;
    }
}

/**
 * Get a full thread by thread ID.
 */
export async function getThread(threadId: string): Promise<GmailThread | null> {
    try {
        const { data, error } = await supabase.functions.invoke('gmail-proxy', {
            body: {
                action: 'get_thread',
                payload: { threadId },
            },
        });

        if (error) {
            log.error('[getThread] Edge Function error:', { error });
            return null;
        }

        const response = data as GmailDetailResponse;
        return response.success ? (response.data as GmailThread ?? null) : null;
    } catch (err) {
        log.error('[getThread] Exception:', { error: err });
        return null;
    }
}

/**
 * Search emails with a Gmail query string (e.g. "from:john subject:meeting").
 * Returns empty array if not connected.
 */
export async function searchEmails(query: string): Promise<GmailMessage[]> {
    try {
        const { data, error } = await supabase.functions.invoke('gmail-proxy', {
            body: {
                action: 'search',
                payload: { query, maxResults: 20 },
            },
        });

        if (error) {
            log.error('[searchEmails] Edge Function error:', { error });
            return [];
        }

        const response = data as GmailListResponse;
        if (!response.success) {
            log.warn('[searchEmails] API returned error:', response.error);
            return [];
        }

        return response.data?.messages || [];
    } catch (err) {
        log.error('[searchEmails] Exception:', { error: err });
        return [];
    }
}
