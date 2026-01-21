/**
 * WhatsApp Service
 * Issue #12: WhatsApp Integration via Evolution API
 *
 * Frontend service for interacting with WhatsApp functionality:
 * - Message history
 * - Conversations
 * - Send messages
 * - Connection status
 * - Consent management
 */

import { supabase } from '@/services/supabaseClient';
import { sendWhatsAppMessage as sendWhatsAppMessageEdge } from './edgeFunctionService';
import {
  WhatsAppMessage,
  WhatsAppConversation,
  WhatsAppMessageFilter,
  SendMessageRequest,
  SendMessageResponse,
  PaginatedResponse,
  WhatsAppConnectionStatus,
  ConsentRecord,
  ConsentType,
  MediaMetadata,
  MediaStats,
} from '@/types/whatsapp';

// ============================================================================
// PRIVACY PURGE TYPES (LGPD/GDPR Compliance)
// ============================================================================

export interface PrivacyPurgeStats {
  purge_date: string;
  executions: number;
  total_messages_purged: number;
  total_bytes_freed: number;
  total_users_affected: number;
  avg_duration_ms: number;
  failed_executions: number;
  first_execution: string;
  last_execution: string;
}

export interface PrivacyPurgeLog {
  id: string;
  execution_id: string;
  executed_at: string;
  messages_purged: number;
  bytes_freed_estimate: number;
  users_affected: number;
  user_counts: Record<string, number>;
  retention_hours: number;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EVOLUTION_INSTANCE_NAME = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'Lucas_4569';
const DEFAULT_PAGE_SIZE = 50;

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Get messages with optional filters
 */
export async function getMessages(
  filters: WhatsAppMessageFilter = {},
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<PaginatedResponse<WhatsAppMessage>> {
  let query = supabase
    .from('whatsapp_messages')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('message_timestamp', { ascending: false });

  // Apply filters
  if (filters.direction) {
    query = query.eq('direction', filters.direction);
  }
  if (filters.message_type) {
    query = query.eq('message_type', filters.message_type);
  }
  if (filters.processing_status) {
    query = query.eq('processing_status', filters.processing_status);
  }
  if (filters.sentiment_label) {
    query = query.eq('sentiment_label', filters.sentiment_label);
  }
  if (filters.contact_phone) {
    query = query.eq('contact_phone', filters.contact_phone);
  }
  if (filters.from_date) {
    query = query.gte('message_timestamp', filters.from_date);
  }
  if (filters.to_date) {
    query = query.lte('message_timestamp', filters.to_date);
  }
  if (filters.search) {
    query = query.or(`content_text.ilike.%${filters.search}%,content_transcription.ilike.%${filters.search}%`);
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[whatsappService] getMessages error:', error);
    throw error;
  }

  return {
    data: data as WhatsAppMessage[],
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit,
  };
}

/**
 * Get a single message by ID
 */
export async function getMessage(messageId: string): Promise<WhatsAppMessage | null> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('id', messageId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[whatsappService] getMessage error:', error);
    throw error;
  }

  return data as WhatsAppMessage;
}

/**
 * Get messages for a specific contact
 */
export async function getContactMessages(
  contactPhone: string,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<PaginatedResponse<WhatsAppMessage>> {
  return getMessages({ contact_phone: contactPhone }, limit, offset);
}

/**
 * Soft delete a message (LGPD compliance)
 */
export async function deleteMessage(
  messageId: string,
  reason = 'user_request'
): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_messages')
    .update({
      deleted_at: new Date().toISOString(),
      deletion_reason: reason,
    })
    .eq('id', messageId);

  if (error) {
    console.error('[whatsappService] deleteMessage error:', error);
    throw error;
  }

  return true;
}

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

/**
 * Get all conversations
 */
export async function getConversations(
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  orderBy: 'last_message_at' | 'total_messages' | 'average_sentiment' = 'last_message_at'
): Promise<PaginatedResponse<WhatsAppConversation>> {
  const { data, error, count } = await supabase
    .from('whatsapp_conversations')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[whatsappService] getConversations error:', error);
    throw error;
  }

  return {
    data: data as WhatsAppConversation[],
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit,
  };
}

/**
 * Get a specific conversation
 */
export async function getConversation(contactPhone: string): Promise<WhatsAppConversation | null> {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('contact_phone', contactPhone)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[whatsappService] getConversation error:', error);
    throw error;
  }

  return data as WhatsAppConversation;
}

// ============================================================================
// SEND MESSAGE OPERATIONS
// ============================================================================

/**
 * Send a WhatsApp message via Evolution API
 * Uses centralized Edge Function helper for unified error handling
 */
export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
  try {
    const instanceName = request.instanceName || EVOLUTION_INSTANCE_NAME;
    const response = await sendWhatsAppMessageEdge(
      request.phone,
      request.message,
      instanceName
    );

    return {
      success: response.success,
      messageId: response.messageId,
      error: response.error,
    };
  } catch (err) {
    const error = err as Error;
    console.error('[whatsappService] sendMessage exception:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CONNECTION STATUS
// ============================================================================

/**
 * Get WhatsApp connection status
 */
export async function getConnectionStatus(): Promise<WhatsAppConnectionStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        isConnected: false,
        state: 'disconnected',
        instanceName: EVOLUTION_INSTANCE_NAME,
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        qrCode: null,
        phone: null,
      };
    }

    // Get user's WhatsApp status from users table
    const { data, error } = await supabase
      .from('users')
      .select('whatsapp_connected, whatsapp_connected_at, whatsapp_disconnected_at, instance_name')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[whatsappService] getConnectionStatus error:', error);
      return {
        isConnected: false,
        state: 'disconnected',
        instanceName: EVOLUTION_INSTANCE_NAME,
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        qrCode: null,
        phone: null,
      };
    }

    return {
      isConnected: data?.whatsapp_connected || false,
      state: data?.whatsapp_connected ? 'open' : 'disconnected',
      instanceName: data?.instance_name || EVOLUTION_INSTANCE_NAME,
      lastConnectedAt: data?.whatsapp_connected_at || null,
      lastDisconnectedAt: data?.whatsapp_disconnected_at || null,
      qrCode: null, // QR code is fetched separately when needed
      phone: null,
    };
  } catch (err) {
    console.error('[whatsappService] getConnectionStatus exception:', err);
    return {
      isConnected: false,
      state: 'disconnected',
      instanceName: EVOLUTION_INSTANCE_NAME,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      qrCode: null,
      phone: null,
    };
  }
}

// ============================================================================
// CONSENT MANAGEMENT (LGPD)
// ============================================================================

/**
 * Get consent records for current user
 */
export async function getConsentRecords(
  contactPhone?: string
): Promise<ConsentRecord[]> {
  let query = supabase
    .from('whatsapp_consent_records')
    .select('*')
    .order('updated_at', { ascending: false });

  if (contactPhone) {
    query = query.eq('contact_phone', contactPhone);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[whatsappService] getConsentRecords error:', error);
    throw error;
  }

  return data as ConsentRecord[];
}

/**
 * Check if specific consent is granted
 */
export async function checkConsent(
  contactPhone: string,
  consentType: ConsentType
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_whatsapp_consent', {
    p_user_id: (await supabase.auth.getUser()).data.user?.id,
    p_contact_phone: contactPhone,
    p_consent_type: consentType,
  });

  if (error) {
    console.error('[whatsappService] checkConsent error:', error);
    return false;
  }

  return data === true;
}

/**
 * Request data deletion (LGPD right to erasure)
 */
export async function requestDataDeletion(
  contactPhone?: string,
  dataTypes: string[] = ['messages', 'media']
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('data_deletion_requests')
    .insert({
      user_id: user.id,
      contact_phone: contactPhone || null,
      request_type: contactPhone ? 'partial_deletion' : 'full_deletion',
      data_types_requested: dataTypes,
      requested_via: 'web',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[whatsappService] requestDataDeletion error:', error);
    throw error;
  }

  return data.id;
}

// ============================================================================
// MEDIA OPERATIONS
// ============================================================================

/**
 * Get media metadata for a message
 */
export async function getMediaMetadata(messageId: string): Promise<MediaMetadata | null> {
  const { data, error } = await supabase
    .from('whatsapp_media_metadata')
    .select('*')
    .eq('message_id', messageId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[whatsappService] getMediaMetadata error:', error);
    throw error;
  }

  return data as MediaMetadata;
}

/**
 * Get media statistics for current user
 */
export async function getMediaStats(): Promise<MediaStats[]> {
  const { data, error } = await supabase
    .from('whatsapp_media_stats')
    .select('*');

  if (error) {
    console.error('[whatsappService] getMediaStats error:', error);
    throw error;
  }

  return data as MediaStats[];
}

/**
 * Get signed URL for media file
 */
export async function getMediaSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('whatsapp-media')
    .createSignedUrl(storagePath, 3600); // 1 hour

  if (error) {
    console.error('[whatsappService] getMediaSignedUrl error:', error);
    return null;
  }

  return data.signedUrl;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get message statistics for dashboard
 */
export async function getMessageStats(): Promise<{
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  audioMessages: number;
  imageMessages: number;
  averageSentiment: number | null;
  lastMessageAt: string | null;
}> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('direction, message_type, sentiment_score, message_timestamp')
    .is('deleted_at', null);

  if (error) {
    console.error('[whatsappService] getMessageStats error:', error);
    throw error;
  }

  const messages = data || [];
  const sentimentScores = messages
    .map(m => m.sentiment_score)
    .filter((s): s is number => s !== null);

  return {
    totalMessages: messages.length,
    incomingMessages: messages.filter(m => m.direction === 'incoming').length,
    outgoingMessages: messages.filter(m => m.direction === 'outgoing').length,
    audioMessages: messages.filter(m => m.message_type === 'audio').length,
    imageMessages: messages.filter(m => m.message_type === 'image').length,
    averageSentiment: sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : null,
    lastMessageAt: messages.length > 0
      ? messages.sort((a, b) =>
          new Date(b.message_timestamp).getTime() - new Date(a.message_timestamp).getTime()
        )[0].message_timestamp
      : null,
  };
}

/**
 * Get conversation statistics
 */
export async function getConversationStats(): Promise<{
  totalConversations: number;
  activeConversations: number;
  averageSentiment: number | null;
}> {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('average_sentiment, last_message_at');

  if (error) {
    console.error('[whatsappService] getConversationStats error:', error);
    throw error;
  }

  const conversations = data || [];
  const sentimentScores = conversations
    .map(c => c.average_sentiment)
    .filter((s): s is number => s !== null);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    totalConversations: conversations.length,
    activeConversations: conversations.filter(c =>
      c.last_message_at && new Date(c.last_message_at) > sevenDaysAgo
    ).length,
    averageSentiment: sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : null,
  };
}

// ============================================================================
// PRIVACY PURGE (LGPD/GDPR COMPLIANCE)
// ============================================================================

/**
 * Get privacy purge statistics (daily aggregated)
 * Used for LGPD/GDPR compliance monitoring dashboard
 */
export async function getPurgeStats(days = 30): Promise<PrivacyPurgeStats[]> {
  const { data, error } = await supabase
    .from('privacy_purge_stats')
    .select('*')
    .limit(days);

  if (error) {
    console.error('[whatsappService] getPurgeStats error:', error);
    throw error;
  }

  return data as PrivacyPurgeStats[];
}

/**
 * Get recent purge execution logs
 * For detailed audit trail and debugging
 */
export async function getPurgeLogs(limit = 50): Promise<PrivacyPurgeLog[]> {
  const { data, error } = await supabase
    .from('privacy_purge_log')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[whatsappService] getPurgeLogs error:', error);
    throw error;
  }

  return data as PrivacyPurgeLog[];
}

/**
 * Get count of messages pending purge
 * Useful for monitoring backlog
 */
export async function getPurgePendingCount(): Promise<{
  count: number;
  oldestPending: string | null;
}> {
  const { data, error, count } = await supabase
    .from('whatsapp_messages')
    .select('created_at', { count: 'exact', head: false })
    .eq('processing_status', 'completed')
    .is('purged_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[whatsappService] getPurgePendingCount error:', error);
    throw error;
  }

  return {
    count: count || 0,
    oldestPending: data && data.length > 0 ? data[0].created_at : null,
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Messages
  getMessages,
  getMessage,
  getContactMessages,
  deleteMessage,
  sendMessage,

  // Conversations
  getConversations,
  getConversation,

  // Connection
  getConnectionStatus,

  // Consent
  getConsentRecords,
  checkConsent,
  requestDataDeletion,

  // Media
  getMediaMetadata,
  getMediaStats,
  getMediaSignedUrl,

  // Statistics
  getMessageStats,
  getConversationStats,

  // Privacy Purge (LGPD/GDPR)
  getPurgeStats,
  getPurgeLogs,
  getPurgePendingCount,
};
