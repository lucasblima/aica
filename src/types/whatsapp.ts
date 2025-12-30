/**
 * WhatsApp Integration Types
 * Issue #12: WhatsApp Integration via Evolution API
 */

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageDirection = 'incoming' | 'outgoing';

export type MessageType =
  | 'text'
  | 'audio'
  | 'image'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'reaction';

export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped';

export type SentimentLabel =
  | 'very_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very_negative';

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  instance_name: string;
  message_id: string;
  remote_jid: string;
  contact_name: string | null;
  contact_phone: string;
  direction: MessageDirection;
  message_type: MessageType;
  content_text: string | null;
  content_transcription: string | null;
  content_ocr: string | null;
  media_url: string | null;
  media_mimetype: string | null;
  media_filename: string | null;
  media_size_bytes: number | null;
  media_duration_seconds: number | null;
  sentiment_score: number | null;
  sentiment_label: SentimentLabel | null;
  detected_intent: string | null;
  detected_topics: string[] | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  processed_at: string | null;
  message_timestamp: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WhatsAppConversation {
  id: string;
  user_id: string;
  contact_phone: string;
  contact_name: string | null;
  total_messages: number;
  messages_incoming: number;
  messages_outgoing: number;
  average_sentiment: number | null;
  last_sentiment_label: SentimentLabel | null;
  first_message_at: string | null;
  last_message_at: string | null;
  last_incoming_at: string | null;
  last_outgoing_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType =
  | 'reminder'
  | 'daily_report'
  | 'weekly_summary'
  | 'custom'
  | 'system'
  | 'follow_up';

export type NotificationStatus =
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type RecurrencePattern =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'weekdays'
  | 'weekends'
  | 'custom';

export interface ScheduledNotification {
  id: string;
  user_id: string;
  target_phone: string;
  target_name: string | null;
  notification_type: NotificationType;
  message_template: string;
  message_variables: Record<string, string>;
  scheduled_for: string;
  timezone: string;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_config: Record<string, unknown> | null;
  recurrence_end_date: string | null;
  status: NotificationStatus;
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  last_error: string | null;
  sent_at: string | null;
  evolution_message_id: string | null;
  priority: number;
  notification_group: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  template_key: string;
  template_name: string;
  template_description: string | null;
  message_template: string;
  required_variables: string[];
  sample_variables: Record<string, string> | null;
  notification_type: NotificationType;
  default_priority: number;
  is_system: boolean;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  notification_id: string | null;
  user_id: string;
  target_phone: string;
  attempt_number: number;
  status: 'success' | 'failed' | 'rate_limited' | 'invalid_phone';
  error_message: string | null;
  error_code: string | null;
  evolution_message_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

// ============================================================================
// CONSENT TYPES (LGPD)
// ============================================================================

export type ConsentType =
  | 'data_collection'
  | 'ai_processing'
  | 'sentiment_analysis'
  | 'notifications'
  | 'data_retention'
  | 'third_party_sharing';

export type ConsentStatus = 'granted' | 'revoked' | 'pending';

export type ConsentMethod =
  | 'whatsapp_keyword'
  | 'web_form'
  | 'api'
  | 'verbal'
  | 'implied';

export type LegalBasis =
  | 'consent'
  | 'legitimate_interest'
  | 'contract_execution'
  | 'legal_obligation';

export interface ConsentRecord {
  id: string;
  user_id: string;
  contact_phone: string;
  contact_name: string | null;
  consent_type: ConsentType;
  status: ConsentStatus;
  consent_method: ConsentMethod;
  consent_message: string | null;
  legal_basis: LegalBasis | null;
  granted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  policy_version: string;
  created_at: string;
  updated_at: string;
}

export interface DataDeletionRequest {
  id: string;
  user_id: string;
  contact_phone: string | null;
  request_type: 'full_deletion' | 'partial_deletion' | 'anonymization' | 'export';
  data_types_requested: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  deletion_summary: Record<string, number> | null;
  requested_via: 'whatsapp' | 'web' | 'api' | 'support';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONNECTION TYPES
// ============================================================================

export type ConnectionState = 'connecting' | 'open' | 'close' | 'disconnected';

export interface WhatsAppConnectionStatus {
  isConnected: boolean;
  state: ConnectionState;
  instanceName: string;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  qrCode: string | null;
  phone: string | null;
}

export interface EvolutionInstance {
  instanceName: string;
  status: 'active' | 'inactive' | 'connecting';
  owner: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
  number: string | null;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface SendMessageRequest {
  phone: string;
  message: string;
  instanceName?: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface CreateNotificationRequest {
  target_phone: string;
  target_name?: string;
  notification_type: NotificationType;
  message_template: string;
  message_variables?: Record<string, string>;
  scheduled_for: string;
  timezone?: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_config?: Record<string, unknown>;
  recurrence_end_date?: string;
  priority?: number;
}

export interface GetMessagesRequest {
  contact_phone?: string;
  direction?: MessageDirection;
  message_type?: MessageType;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface GetConversationsRequest {
  limit?: number;
  offset?: number;
  order_by?: 'last_message_at' | 'total_messages' | 'average_sentiment';
  order?: 'asc' | 'desc';
}

// ============================================================================
// MEDIA TYPES
// ============================================================================

export interface MediaMetadata {
  id: string;
  user_id: string;
  message_id: string | null;
  storage_path: string;
  original_url: string | null;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  media_type: 'image' | 'audio' | 'video' | 'document' | 'sticker';
  duration_seconds: number | null;
  dimensions: { width: number; height: number } | null;
  transcription: string | null;
  ocr_text: string | null;
  thumbnail_path: string | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  retention_days: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaStats {
  user_id: string;
  media_type: string;
  file_count: number;
  total_bytes: number;
  avg_file_size: number;
  processed_count: number;
  failed_count: number;
  first_upload: string;
  last_upload: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown>;
  date_time?: string;
  sender?: string;
}

export interface WebhookMessageData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: WebhookMediaMessage;
    audioMessage?: WebhookMediaMessage;
    videoMessage?: WebhookMediaMessage;
    documentMessage?: WebhookMediaMessage;
  };
  messageTimestamp?: number | string;
}

export interface WebhookMediaMessage {
  url?: string;
  mimetype?: string;
  caption?: string;
  fileName?: string;
  fileLength?: string;
  seconds?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface WhatsAppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export type WhatsAppMessageFilter = Partial<{
  direction: MessageDirection;
  message_type: MessageType;
  processing_status: ProcessingStatus;
  sentiment_label: SentimentLabel;
  contact_phone: string;
  from_date: string;
  to_date: string;
  search: string;
}>;
