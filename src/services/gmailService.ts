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
    message_id: string;
    thread_id: string;
    subject: string;
    snippet: string;
    sender: string;
    sender_email: string;
    received_at: string;
    labels: string[];
    is_read: boolean;
}

export interface GmailThread {
    thread_id: string;
    messages: GmailMessage[];
}

interface GmailListResponse {
    success: boolean;
    messages: GmailMessage[];
    nextPageToken?: string;
    error?: string;
}

interface GmailDetailResponse {
    success: boolean;
    message?: GmailMessage;
    thread?: GmailThread;
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
                action: 'list',
                query: options?.query,
                maxResults: options?.maxResults ?? 20,
                pageToken: options?.pageToken,
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
            messages: response.messages || [],
            nextPageToken: response.nextPageToken,
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
                action: 'get',
                messageId,
            },
        });

        if (error) {
            log.error('[getEmail] Edge Function error:', { error });
            return null;
        }

        const response = data as GmailDetailResponse;
        return response.success ? (response.message ?? null) : null;
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
                threadId,
            },
        });

        if (error) {
            log.error('[getThread] Edge Function error:', { error });
            return null;
        }

        const response = data as GmailDetailResponse;
        return response.success ? (response.thread ?? null) : null;
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
    const result = await listEmails({ query, maxResults: 20 });
    return result.messages;
}
