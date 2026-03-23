/**
 * Channel Adapter — Unified Messaging Interface
 *
 * Core abstraction layer for multi-channel messaging (Telegram, WhatsApp, etc.).
 * All channel-specific adapters implement ChannelAdapter to normalize inbound
 * messages and send outbound messages through a consistent interface.
 *
 * @see telegram-adapter.ts for Telegram implementation
 * @see channel-registry.ts for adapter factory
 */

// ============================================================================
// CHANNEL TYPES
// ============================================================================

export type ChannelType = 'telegram' | 'whatsapp' | 'email' | 'push';

// ============================================================================
// INBOUND MESSAGE TYPES
// ============================================================================

export interface UnifiedMessage {
  /** Unique message ID from the source channel */
  messageId: string;

  /** Channel this message came from */
  channel: ChannelType;

  /** Sender information */
  sender: {
    channelUserId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
  };

  /** Chat/conversation context */
  chat: {
    chatId: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    /** Forum topic thread ID (Telegram Topics / threaded groups) */
    messageThreadId?: string;
  };

  /** Message content */
  content: {
    type: 'text' | 'command' | 'callback_query' | 'voice' | 'photo' | 'document' | 'unknown';
    text?: string;
    command?: string;
    commandArgs?: string;
    callbackData?: string;
    callbackQueryId?: string;
    voiceDuration?: number;
    voiceFileId?: string;
    caption?: string;
  };

  /** Raw update object from the channel (for debugging) */
  rawUpdateId?: string;

  /** Timestamp of the message */
  timestamp: Date;
}

// ============================================================================
// OUTBOUND MESSAGE TYPES
// ============================================================================

export interface InlineKeyboardButton {
  text: string;
  callbackData?: string;
  url?: string;
}

export interface InlineKeyboard {
  rows: InlineKeyboardButton[][];
}

export interface ReplyKeyboardButton {
  text: string;
  requestContact?: boolean;
}

export interface ReplyKeyboard {
  rows: ReplyKeyboardButton[][];
  oneTime?: boolean;
  resize?: boolean;
  persistent?: boolean;
}

export interface OutboundMessage {
  /** Target chat ID */
  chatId: string;

  /** Message text (supports HTML for Telegram) */
  text: string;

  /** Parse mode for formatting */
  parseMode?: 'HTML' | 'Markdown';

  /** Optional inline keyboard */
  inlineKeyboard?: InlineKeyboard;

  /** Optional reply keyboard */
  replyKeyboard?: ReplyKeyboard;

  /** Remove current reply keyboard */
  removeKeyboard?: boolean;

  /** Reply to a specific message */
  replyToMessageId?: string;

  /** Forum topic thread ID (replies go to this topic instead of General) */
  messageThreadId?: string;

  /** Disable link previews */
  disableLinkPreview?: boolean;
}

// ============================================================================
// SEND RESULT
// ============================================================================

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// CHANNEL CAPABILITIES
// ============================================================================

export interface ChannelCapabilities {
  supportsInlineKeyboard: boolean;
  supportsReplyKeyboard: boolean;
  supportsHTML: boolean;
  supportsMarkdown: boolean;
  supportsVoice: boolean;
  supportsTypingAction: boolean;
  supportsCallbackQuery: boolean;
  supportsEditMessage: boolean;
  maxMessageLength: number;
}

// ============================================================================
// CHANNEL ADAPTER INTERFACE
// ============================================================================

export interface ChannelAdapter {
  /** Channel type this adapter handles */
  readonly channel: ChannelType;

  /**
   * Normalize a raw inbound update into a UnifiedMessage.
   * Returns null if the update cannot be parsed (unsupported type, etc.).
   */
  normalizeInbound(rawUpdate: unknown): UnifiedMessage | null;

  /** Send a message through this channel */
  sendMessage(message: OutboundMessage): Promise<SendResult>;

  /** Send a typing/action indicator */
  sendTypingAction(chatId: string, messageThreadId?: string): Promise<void>;

  /** Get capabilities of this channel */
  getCapabilities(): ChannelCapabilities;

  /** Validate an incoming webhook request (signature/secret check) */
  validateWebhook(request: Request): boolean;

  /** Answer a callback query (for inline keyboard responses) */
  answerCallbackQuery?(callbackQueryId: string, text?: string): Promise<void>;
}
