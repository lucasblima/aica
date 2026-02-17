/**
 * Gmail Summarize Service
 *
 * Calls the gmail-summarize Edge Function to generate AI-powered
 * conversation summaries for a given contact.
 */

import { supabase } from './supabaseClient';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationTopic {
    topic: string;
    count: number;
    lastMentioned: string;
    sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ActionItem {
    item: string;
    date: string;
    status: 'pending' | 'done';
}

export interface SentimentAnalysis {
    overall: 'positive' | 'neutral' | 'negative';
    trend: 'improving' | 'stable' | 'declining';
    description: string;
}

export interface TimelineEntry {
    period: string; // "2026-02"
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ConversationSummary {
    contactName: string;
    contactEmail: string;
    totalEmails: number;
    dateRange: { first: string; last: string };
    summary: string;
    topics: ConversationTopic[];
    actionItems: ActionItem[];
    sentiment: SentimentAnalysis;
    timeline: TimelineEntry[];
}

// ============================================================================
// API
// ============================================================================

/**
 * Generate a conversation summary for a specific contact.
 * Calls the gmail-summarize Edge Function which fetches emails and runs Gemini analysis.
 */
export async function summarizeContact(
    contactEmail: string,
    contactName?: string
): Promise<ConversationSummary> {
    const { data, error } = await supabase.functions.invoke('gmail-summarize', {
        body: {
            action: 'summarize_contact',
            payload: { contactEmail, contactName },
        },
    });

    if (error) throw new Error(error.message || 'Erro ao gerar resumo');
    if (!data?.success) throw new Error(data?.error || 'Erro ao gerar resumo');
    return data.data as ConversationSummary;
}
