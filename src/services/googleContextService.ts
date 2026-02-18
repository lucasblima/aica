/**
 * Google Contextual Search Service
 *
 * Calls the google-contextual-search Edge Function to find relevant
 * Gmail emails and Drive files for any AICA module based on context.
 */

import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GoogleContextService');

// ============================================================================
// TYPES
// ============================================================================

export type AicaModule = 'grants' | 'studio' | 'finance' | 'connections' | 'journey' | 'flux' | 'atlas';

export interface GoogleContextRequest {
    module: AicaModule;
    context: {
        entities: string[];
        keywords: string[];
        people: string[];
        dateRange?: { from: string; to: string };
    };
    sources: ('gmail' | 'drive')[];
    maxResults?: number;
}

export interface GmailContextResult {
    id: string;
    threadId: string;
    subject: string;
    snippet: string;
    sender: string;
    senderEmail: string;
    receivedAt: string;
    confidence: number;
    relevanceReason: string;
}

export interface DriveContextResult {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    modifiedTime: string;
    confidence: number;
    relevanceReason: string;
}

export interface LinkSuggestion {
    resourceType: 'email' | 'file';
    resourceId: string;
    resourceTitle: string;
    confidence: number;
    suggestedModule: string;
    suggestedEntityId?: string;
    reason: string;
}

export interface GoogleContextResponse {
    gmail: { results: GmailContextResult[]; queries: string[] };
    drive: { results: DriveContextResult[]; queries: string[] };
    suggestions: LinkSuggestion[];
}

export interface GoogleResourceLink {
    id: string;
    user_id: string;
    resource_type: 'email' | 'file';
    resource_id: string;
    resource_title: string;
    module: string;
    entity_id: string | null;
    confidence: number;
    status: 'suggested' | 'confirmed' | 'rejected';
    reason: string;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// API
// ============================================================================

/**
 * Search Google (Gmail + Drive) for contextually relevant content for a module.
 */
export async function searchGoogleContext(
    request: GoogleContextRequest
): Promise<GoogleContextResponse> {
    try {
        const { data, error } = await supabase.functions.invoke('google-contextual-search', {
            body: {
                action: 'contextual_search',
                payload: request,
            },
        });

        if (error) {
            log.error('[searchGoogleContext] Edge Function error:', { error });
            throw new Error(error.message || 'Erro ao buscar contexto Google');
        }

        if (!data?.success) {
            log.warn('[searchGoogleContext] API returned error:', data?.error);
            throw new Error(data?.error || 'Erro na busca contextual');
        }

        return data.data as GoogleContextResponse;
    } catch (err) {
        if (err instanceof Error) throw err;
        log.error('[searchGoogleContext] Exception:', { error: err });
        throw new Error('Erro inesperado ao buscar contexto Google');
    }
}

/**
 * Confirm a suggested link (user accepts the connection).
 */
export async function confirmLink(linkId: string): Promise<void> {
    const { error } = await supabase.rpc('update_google_link_status', {
        p_link_id: linkId,
        p_status: 'confirmed',
    });

    if (error) {
        log.error('[confirmLink] RPC error:', { error });
        throw new Error('Erro ao confirmar link');
    }
}

/**
 * Reject a suggested link (user dismisses the connection).
 */
export async function rejectLink(linkId: string): Promise<void> {
    const { error } = await supabase.rpc('update_google_link_status', {
        p_link_id: linkId,
        p_status: 'rejected',
    });

    if (error) {
        log.error('[rejectLink] RPC error:', { error });
        throw new Error('Erro ao rejeitar link');
    }
}

/**
 * Get saved links for a module (optionally filtered by entity and status).
 */
export async function getModuleLinks(
    module: string,
    entityId?: string,
    status?: string
): Promise<GoogleResourceLink[]> {
    try {
        let query = supabase
            .from('google_resource_links')
            .select('*')
            .eq('module', module)
            .order('confidence', { ascending: false });

        if (entityId) {
            query = query.eq('entity_id', entityId);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            log.error('[getModuleLinks] Query error:', { error });
            return [];
        }

        return (data as GoogleResourceLink[]) || [];
    } catch (err) {
        log.error('[getModuleLinks] Exception:', { error: err });
        return [];
    }
}
