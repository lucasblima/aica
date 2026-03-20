export interface TelegramStats {
  messages_24h: number;
  error_rate: number;
  active_users: number;
  linked_accounts: number;
  ai_tokens_used: number;
  avg_processing_ms: number;
  timestamp: string;
}

export interface TelegramMessageLogEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  telegram_username: string | null;
  direction: 'inbound' | 'outbound';
  message_type: string;
  intent_summary: string | null;
  processing_status: string;
  ai_action: string | null;
  ai_tokens_used: number | null;
  processing_duration_ms: number | null;
  error_message: string | null;
}

export interface TelegramUserStatus {
  total_linked: number;
  total_pending: number;
  consent_rate: number;
  recent_links: Array<{
    user_id: string;
    telegram_username: string | null;
    status: string;
    linked_at: string | null;
    consent_given: boolean;
  }>;
}

export interface TelegramConversation {
  id: string;
  user_id: string;
  telegram_username: string | null;
  telegram_chat_id: number;
  active_flow: string | null;
  flow_state: Record<string, unknown>;
  last_message_at: string;
  context_token_count: number;
}

export interface TelegramErrorLog {
  error_rate: number;
  errors: Array<{
    id: string;
    created_at: string;
    user_id: string | null;
    message_type: string;
    error_message: string | null;
    retry_count: number;
    processing_duration_ms: number | null;
  }>;
}
