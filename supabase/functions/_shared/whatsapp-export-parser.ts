/**
 * WhatsApp Export Parser
 *
 * Robust parser for WhatsApp chat export files (Android + iOS formats).
 * Handles multiline messages, system messages, media omitted markers,
 * and auto-detects format from the first parseable line.
 *
 * Supported formats:
 * - Android: "dd/mm/yyyy hh:mm - Name: Message"
 * - iOS: "[dd/mm/yyyy, hh:mm:ss] Name: Message"
 *
 * Related: Issue #211 - Universal Input Funnel
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedMessage {
  timestamp: Date;
  senderName: string;
  text: string;
  messageType: 'text' | 'media_omitted' | 'system';
}

export interface ParsedExport {
  messages: ParsedMessage[];
  participants: string[];
  isGroup: boolean;
  exportFormat: 'android' | 'ios' | 'unknown';
  dateRange: { start: Date; end: Date };
  totalMessages: number;
  mediaOmittedCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Android: "dd/mm/yyyy hh:mm - Name: Message"
// Also handles "dd/mm/yyyy, hh:mm - Name: Message" variant
const ANDROID_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})\s+-\s+(.+?):\s(.+)/;

// Android system message (no colon after name part): "dd/mm/yyyy hh:mm - System message"
const ANDROID_SYSTEM_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})\s+-\s+(.+)/;

// iOS: "[dd/mm/yyyy, hh:mm:ss] Name: Message"
const IOS_REGEX = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s+(.+?):\s(.+)/;

// iOS system message: "[dd/mm/yyyy, hh:mm:ss] System message"
const IOS_SYSTEM_REGEX = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s+(.+)/;

// Media omitted markers (multilingual)
const MEDIA_OMITTED_PATTERNS = [
  '<mídia oculta>',
  '<media omitted>',
  'image omitted',
  'video omitted',
  'audio omitted',
  'sticker omitted',
  'document omitted',
  'gif omitted',
  'contact card omitted',
  '<arquivo de mídia oculto>',
  '<imagem oculta>',
  '<vídeo oculto>',
  '<áudio oculto>',
  '<figurinha oculta>',
  '<documento oculto>',
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse date string from WhatsApp export into a Date object.
 * Handles dd/mm/yy and dd/mm/yyyy formats.
 */
function parseDate(dateStr: string, timeStr: string): Date {
  const [day, month, yearRaw] = dateStr.split('/').map(Number);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;

  const timeParts = timeStr.split(':').map(Number);
  const hours = timeParts[0];
  const minutes = timeParts[1];
  const seconds = timeParts[2] || 0;

  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Check if text matches a media omitted pattern.
 */
function isMediaOmitted(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return MEDIA_OMITTED_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Detect export format from a single line.
 */
function detectFormat(line: string): 'android' | 'ios' | null {
  if (IOS_REGEX.test(line) || IOS_SYSTEM_REGEX.test(line)) return 'ios';
  if (ANDROID_REGEX.test(line) || ANDROID_SYSTEM_REGEX.test(line)) return 'android';
  return null;
}

// ============================================================================
// CORE PARSER
// ============================================================================

/**
 * Parse a WhatsApp chat export text into structured data.
 *
 * Works line-by-line for memory efficiency on large exports.
 * Lines without a timestamp prefix are treated as continuation
 * of the previous message (multiline support).
 */
export function parseWhatsAppExport(text: string): ParsedExport {
  const lines = text.split('\n');
  const messages: ParsedMessage[] = [];
  const participantSet = new Set<string>();
  let format: 'android' | 'ios' | 'unknown' = 'unknown';
  let mediaOmittedCount = 0;

  // Detect format from first few lines
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const detected = detectFormat(lines[i].trim());
    if (detected) {
      format = detected;
      break;
    }
  }

  let currentMessage: ParsedMessage | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    let parsed: { date: string; time: string; sender: string; text: string; isSystem: boolean } | null = null;

    // Try format-specific regex
    if (format === 'ios' || format === 'unknown') {
      const iosMatch = line.match(IOS_REGEX);
      if (iosMatch) {
        parsed = { date: iosMatch[1], time: iosMatch[2], sender: iosMatch[3], text: iosMatch[4], isSystem: false };
      } else {
        const iosSystemMatch = line.match(IOS_SYSTEM_REGEX);
        if (iosSystemMatch && !line.match(IOS_REGEX)) {
          parsed = { date: iosSystemMatch[1], time: iosSystemMatch[2], sender: '', text: iosSystemMatch[3], isSystem: true };
        }
      }
    }

    if (!parsed && (format === 'android' || format === 'unknown')) {
      const androidMatch = line.match(ANDROID_REGEX);
      if (androidMatch) {
        parsed = { date: androidMatch[1], time: androidMatch[2], sender: androidMatch[3], text: androidMatch[4], isSystem: false };
      } else {
        const androidSystemMatch = line.match(ANDROID_SYSTEM_REGEX);
        if (androidSystemMatch && !line.match(ANDROID_REGEX)) {
          parsed = { date: androidSystemMatch[1], time: androidSystemMatch[2], sender: '', text: androidSystemMatch[3], isSystem: true };
        }
      }
    }

    if (parsed) {
      // Flush previous message
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const timestamp = parseDate(parsed.date, parsed.time);
      const messageText = parsed.text.trim();

      if (parsed.isSystem) {
        currentMessage = {
          timestamp,
          senderName: '',
          text: messageText,
          messageType: 'system',
        };
      } else {
        const mediaFlag = isMediaOmitted(messageText);
        if (mediaFlag) mediaOmittedCount++;

        participantSet.add(parsed.sender);
        currentMessage = {
          timestamp,
          senderName: parsed.sender,
          text: messageText,
          messageType: mediaFlag ? 'media_omitted' : 'text',
        };
      }
    } else {
      // No timestamp match — this is a continuation of the previous message (multiline)
      if (currentMessage) {
        currentMessage.text += '\n' + line;
      }
      // If no current message, skip orphan lines (e.g., encryption notice at top)
    }
  }

  // Flush last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  // Build result
  const participants = Array.from(participantSet).sort();
  const textMessages = messages.filter((m) => m.messageType !== 'system');
  const dateRange = messages.length > 0
    ? { start: messages[0].timestamp, end: messages[messages.length - 1].timestamp }
    : { start: new Date(), end: new Date() };

  return {
    messages,
    participants,
    isGroup: participants.length > 2,
    exportFormat: format,
    dateRange,
    totalMessages: messages.length,
    mediaOmittedCount,
  };
}

/**
 * Extract text content suitable for RAG indexing.
 * Returns only text messages (no system/media), formatted for search.
 */
export function extractTextForRAG(parsed: ParsedExport): string {
  return parsed.messages
    .filter((m) => m.messageType === 'text' && m.text.trim().length > 0)
    .map((m) => {
      const dateStr = m.timestamp.toISOString().split('T')[0];
      return `[${dateStr}] ${m.senderName}: ${m.text}`;
    })
    .join('\n');
}

/**
 * Generate a SHA-256 deduplication hash for a message.
 * Hash = sha256(contactId + timestamp_iso + senderName + first50chars)
 */
export async function generateDedupHash(
  contactId: string,
  timestamp: Date,
  senderName: string,
  text: string
): Promise<string> {
  const input = `${contactId}|${timestamp.toISOString()}|${senderName}|${text.substring(0, 50)}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
