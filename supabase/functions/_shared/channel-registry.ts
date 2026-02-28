/**
 * Channel Registry — Adapter Factory
 *
 * Provides a central registry for channel adapters.
 * Use getAdapter() to get the correct adapter instance for a given channel type.
 *
 * @example
 * import { getAdapter } from '../_shared/channel-registry.ts';
 * const adapter = getAdapter('telegram');
 * const message = adapter.normalizeInbound(rawUpdate);
 */

import type { ChannelAdapter, ChannelType } from './channel-adapter.ts';
import { TelegramAdapter } from './telegram-adapter.ts';

// ============================================================================
// ADAPTER INSTANCES (lazy-initialized singletons)
// ============================================================================

let telegramAdapter: TelegramAdapter | null = null;

// ============================================================================
// WHATSAPP STUB
// ============================================================================

/**
 * Stub adapter for WhatsApp.
 * WhatsApp currently uses its own pipeline (ingest-whatsapp-export, extract-intent).
 * This stub exists so the registry can acknowledge the channel type.
 * Will be replaced with a real adapter when WhatsApp moves to the unified pipeline.
 */
const whatsappStub: ChannelAdapter = {
  channel: 'whatsapp',

  normalizeInbound(_rawUpdate: unknown) {
    console.warn('[channel-registry] WhatsApp adapter is a stub — use the existing WhatsApp pipeline');
    return null;
  },

  async sendMessage(_message) {
    return { success: false, error: 'WhatsApp adapter not yet implemented in unified pipeline' };
  },

  async sendTypingAction(_chatId: string) {
    // no-op
  },

  getCapabilities() {
    return {
      supportsInlineKeyboard: false,
      supportsReplyKeyboard: false,
      supportsHTML: false,
      supportsMarkdown: false,
      supportsVoice: true,
      supportsTypingAction: false,
      supportsCallbackQuery: false,
      supportsEditMessage: false,
      maxMessageLength: 4096,
    };
  },

  validateWebhook(_request: Request) {
    return false;
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * Get the adapter for a given channel type.
 * Adapters are lazy-initialized singletons.
 *
 * @throws Error if channel type is not registered
 */
export function getAdapter(channel: ChannelType): ChannelAdapter {
  switch (channel) {
    case 'telegram':
      if (!telegramAdapter) {
        telegramAdapter = new TelegramAdapter();
      }
      return telegramAdapter;

    case 'whatsapp':
      return whatsappStub;

    default:
      throw new Error(`[channel-registry] No adapter registered for channel: ${channel}`);
  }
}

/**
 * Check if a channel type has a registered adapter.
 */
export function hasAdapter(channel: ChannelType): boolean {
  return channel === 'telegram' || channel === 'whatsapp';
}

/**
 * Get all registered channel types.
 */
export function getRegisteredChannels(): ChannelType[] {
  return ['telegram', 'whatsapp'];
}
