/**
 * Telegram Adapter — ChannelAdapter implementation for Telegram Bot API
 *
 * Uses the Telegram Bot API directly via fetch (no grammY dependency).
 * Normalizes Telegram Update objects into UnifiedMessage format and
 * sends outbound messages through the Bot API.
 *
 * @see https://core.telegram.org/bots/api
 * @see channel-adapter.ts for interface definition
 */

import type {
  ChannelAdapter,
  ChannelCapabilities,
  InlineKeyboard,
  OutboundMessage,
  ReplyKeyboard,
  SendResult,
  UnifiedMessage,
} from './channel-adapter.ts';

// ============================================================================
// TELEGRAM API TYPES (subset used by AICA)
// ============================================================================

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  message_thread_id?: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
  };
  photo?: Array<{
    file_id: string;
    width: number;
    height: number;
  }>;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
  };
  caption?: string;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
  }>;
  // Forum topic service messages (should be silently ignored)
  forum_topic_created?: unknown;
  forum_topic_edited?: unknown;
  forum_topic_closed?: unknown;
  forum_topic_reopened?: unknown;
  general_forum_topic_hidden?: unknown;
  general_forum_topic_unhidden?: unknown;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// ============================================================================
// TELEGRAM ADAPTER
// ============================================================================

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export class TelegramAdapter implements ChannelAdapter {
  readonly channel = 'telegram' as const;
  private botToken: string;
  private webhookSecret: string;

  constructor(botToken?: string, webhookSecret?: string) {
    this.botToken = botToken || Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
    this.webhookSecret = webhookSecret || Deno.env.get('TELEGRAM_WEBHOOK_SECRET') || '';

    if (!this.botToken) {
      console.warn('[telegram-adapter] TELEGRAM_BOT_TOKEN not configured');
    }
  }

  // --------------------------------------------------------------------------
  // INBOUND: Normalize Telegram Update → UnifiedMessage
  // --------------------------------------------------------------------------

  normalizeInbound(rawUpdate: unknown): UnifiedMessage | null {
    const update = rawUpdate as TelegramUpdate;
    if (!update) return null;

    // Handle callback queries
    if (update.callback_query) {
      return this.normalizeCallbackQuery(update.update_id, update.callback_query);
    }

    // Handle regular messages
    if (update.message) {
      return this.normalizeMessage(update.update_id, update.message);
    }

    // Unsupported update type
    console.log(`[telegram-adapter] Unsupported update type, update_id=${update.update_id}`);
    return null;
  }

  private normalizeMessage(updateId: number, msg: TelegramMessage): UnifiedMessage | null {
    // Skip forum topic service messages (topic created/edited/closed/reopened)
    if (
      msg.forum_topic_created !== undefined ||
      msg.forum_topic_edited !== undefined ||
      msg.forum_topic_closed !== undefined ||
      msg.forum_topic_reopened !== undefined ||
      msg.general_forum_topic_hidden !== undefined ||
      msg.general_forum_topic_unhidden !== undefined
    ) {
      return null;
    }

    const isCommand = msg.entities?.some(e => e.type === 'bot_command' && e.offset === 0) || false;

    let contentType: UnifiedMessage['content']['type'] = 'text';
    let command: string | undefined;
    let commandArgs: string | undefined;
    let text = msg.text;

    if (isCommand && msg.text) {
      contentType = 'command';
      // Parse command: "/start arg1 arg2" → command="/start", args="arg1 arg2"
      const spaceIdx = msg.text.indexOf(' ');
      if (spaceIdx > 0) {
        command = msg.text.substring(0, spaceIdx).replace(/@\w+$/, ''); // strip @botname
        commandArgs = msg.text.substring(spaceIdx + 1).trim();
      } else {
        command = msg.text.replace(/@\w+$/, '');
      }
    } else if (msg.voice) {
      contentType = 'voice';
      text = undefined;
    } else if (msg.photo) {
      contentType = 'photo';
      text = undefined;
    } else if (msg.document) {
      contentType = 'document';
      text = undefined;
    } else if (!msg.text) {
      contentType = 'unknown';
    }

    return {
      messageId: String(msg.message_id),
      channel: 'telegram',
      sender: {
        channelUserId: String(msg.from?.id || msg.chat.id),
        username: msg.from?.username,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
      },
      chat: {
        chatId: String(msg.chat.id),
        type: msg.chat.type,
        title: msg.chat.title,
        messageThreadId: msg.message_thread_id ? String(msg.message_thread_id) : undefined,
      },
      content: {
        type: contentType,
        text,
        command,
        commandArgs,
        voiceDuration: msg.voice?.duration,
        voiceFileId: msg.voice?.file_id,
        caption: msg.caption,
      },
      rawUpdateId: String(updateId),
      timestamp: new Date(msg.date * 1000),
    };
  }

  private normalizeCallbackQuery(updateId: number, cbq: TelegramCallbackQuery): UnifiedMessage {
    return {
      messageId: cbq.message ? String(cbq.message.message_id) : `cbq_${cbq.id}`,
      channel: 'telegram',
      sender: {
        channelUserId: String(cbq.from.id),
        username: cbq.from.username,
        firstName: cbq.from.first_name,
        lastName: cbq.from.last_name,
      },
      chat: {
        chatId: cbq.message ? String(cbq.message.chat.id) : String(cbq.from.id),
        type: cbq.message?.chat.type || 'private',
        title: cbq.message?.chat.title,
      },
      content: {
        type: 'callback_query',
        callbackData: cbq.data,
        callbackQueryId: cbq.id,
      },
      rawUpdateId: String(updateId),
      timestamp: cbq.message ? new Date(cbq.message.date * 1000) : new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // OUTBOUND: Send messages via Telegram Bot API
  // --------------------------------------------------------------------------

  async sendMessage(message: OutboundMessage): Promise<SendResult> {
    const body: Record<string, unknown> = {
      chat_id: message.chatId,
      text: message.text,
    };

    if (message.parseMode) {
      body.parse_mode = message.parseMode;
    }

    if (message.disableLinkPreview) {
      body.disable_web_page_preview = true;
    }

    if (message.replyToMessageId) {
      body.reply_to_message_id = Number(message.replyToMessageId);
    }

    if (message.messageThreadId) {
      body.message_thread_id = Number(message.messageThreadId);
    }

    // Build reply_markup
    if (message.inlineKeyboard) {
      body.reply_markup = this.buildInlineKeyboardMarkup(message.inlineKeyboard);
    } else if (message.replyKeyboard) {
      body.reply_markup = this.buildReplyKeyboardMarkup(message.replyKeyboard);
    } else if (message.removeKeyboard) {
      body.reply_markup = { remove_keyboard: true };
    }

    try {
      const response = await this.callApi('sendMessage', body);

      if (response.ok) {
        return {
          success: true,
          messageId: String(response.result?.message_id),
        };
      }

      console.error(`[telegram-adapter] sendMessage failed: ${response.description}`);
      return {
        success: false,
        error: response.description || 'Unknown Telegram API error',
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[telegram-adapter] sendMessage error: ${err.message}`);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async sendTypingAction(chatId: string, messageThreadId?: string): Promise<void> {
    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        action: 'typing',
      };
      if (messageThreadId) {
        body.message_thread_id = Number(messageThreadId);
      }
      await this.callApi('sendChatAction', body);
    } catch (error) {
      // Typing action failure is non-critical
      console.warn(`[telegram-adapter] sendChatAction failed: ${(error as Error).message}`);
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    try {
      await this.callApi('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text,
      });
    } catch (error) {
      console.warn(`[telegram-adapter] answerCallbackQuery failed: ${(error as Error).message}`);
    }
  }

  // --------------------------------------------------------------------------
  // CAPABILITIES
  // --------------------------------------------------------------------------

  getCapabilities(): ChannelCapabilities {
    return {
      supportsInlineKeyboard: true,
      supportsReplyKeyboard: true,
      supportsHTML: true,
      supportsMarkdown: true,
      supportsVoice: true,
      supportsTypingAction: true,
      supportsCallbackQuery: true,
      supportsEditMessage: true,
      maxMessageLength: 4096,
    };
  }

  // --------------------------------------------------------------------------
  // WEBHOOK VALIDATION
  // --------------------------------------------------------------------------

  validateWebhook(request: Request): boolean {
    if (!this.webhookSecret) {
      console.error('[telegram-adapter] TELEGRAM_WEBHOOK_SECRET not configured');
      return false;
    }

    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    if (!secretToken) {
      console.warn('[telegram-adapter] Missing X-Telegram-Bot-Api-Secret-Token header');
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return this.timingSafeEqual(secretToken, this.webhookSecret);
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   * Uses byte-level XOR so comparison time is independent of content.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    const encoder = new TextEncoder();
    const bufA = encoder.encode(a);
    const bufB = encoder.encode(b);

    let mismatch = 0;
    for (let i = 0; i < bufA.length; i++) {
      mismatch |= bufA[i] ^ bufB[i];
    }
    return mismatch === 0;
  }

  // --------------------------------------------------------------------------
  // INTERNAL: Telegram Bot API call
  // --------------------------------------------------------------------------

  private async callApi(method: string, body: Record<string, unknown>): Promise<TelegramApiResponse> {
    const url = `${TELEGRAM_API_BASE}${this.botToken}/${method}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return await response.json() as TelegramApiResponse;
  }

  private buildInlineKeyboardMarkup(keyboard: InlineKeyboard): Record<string, unknown> {
    return {
      inline_keyboard: keyboard.rows.map(row =>
        row.map(btn => {
          const button: Record<string, string> = { text: btn.text };
          if (btn.callbackData) button.callback_data = btn.callbackData;
          if (btn.url) button.url = btn.url;
          return button;
        })
      ),
    };
  }

  private buildReplyKeyboardMarkup(keyboard: ReplyKeyboard): Record<string, unknown> {
    return {
      keyboard: keyboard.rows.map(row =>
        row.map(btn => {
          const button: Record<string, unknown> = { text: btn.text };
          if (btn.requestContact) button.request_contact = true;
          return button;
        })
      ),
      one_time_keyboard: keyboard.oneTime ?? false,
      resize_keyboard: keyboard.resize ?? true,
    };
  }
}

// ============================================================================
// TELEGRAM API RESPONSE TYPE
// ============================================================================

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
  result?: {
    message_id?: number;
    [key: string]: unknown;
  };
}
