/**
 * Centralized Logger for Supabase Edge Functions
 * ===============================================
 *
 * Simplified logger for Deno runtime (no browser dependencies).
 * Provides namespace support for better log organization.
 *
 * USAGE:
 * ```typescript
 * import { createNamespacedLogger } from './logger.ts';
 *
 * const log = createNamespacedLogger('whatsapp-handler');
 * log.debug('Processing message', { messageId: '123' });
 * log.info('Upload complete', { path: 'user/file.pdf' });
 * log.warn('Retry attempt', { attempt: 2 });
 * log.error('Failed to process', { error: err.message });
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface LoggerConfig {
  level: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

const LOG_PREFIXES: Record<Exclude<LogLevel, 'none'>, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
};

// Environment-based configuration
// In Edge Functions, we log everything (Supabase dashboard filters by level)
const config: LoggerConfig = {
  level: (Deno.env.get('LOG_LEVEL') as LogLevel) || 'debug',
};

/**
 * Check if a log level should be displayed based on current config
 */
function shouldLog(level: Exclude<LogLevel, 'none'>): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}

/**
 * Format the log message with timestamp and namespace
 */
function formatMessage(
  level: Exclude<LogLevel, 'none'>,
  namespace: string | null,
  message: string
): string {
  const parts: string[] = [];

  // ISO timestamp for consistent logging
  const timestamp = new Date().toISOString();
  parts.push(`[${timestamp}]`);

  parts.push(LOG_PREFIXES[level]);
  parts.push(`[${level.toUpperCase()}]`);

  if (namespace) {
    parts.push(`[${namespace}]`);
  }

  parts.push(message);

  return parts.join(' ');
}

/**
 * Serialize arguments for logging
 * Handles objects, errors, and other types
 */
function serializeArgs(args: unknown[]): string {
  if (args.length === 0) return '';

  const serialized = args.map((arg) => {
    if (arg instanceof Error) {
      return `Error: ${arg.message}\nStack: ${arg.stack}`;
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  });

  return '\n' + serialized.join('\n');
}

/**
 * Core logging function
 */
function log(
  level: Exclude<LogLevel, 'none'>,
  namespace: string | null,
  message: string,
  ...args: unknown[]
): void {
  if (!shouldLog(level)) return;

  const formatted = formatMessage(level, namespace, message);
  const serializedArgs = serializeArgs(args);
  const fullMessage = formatted + serializedArgs;

  // Use appropriate console method
  const consoleFn = level === 'debug' ? console.debug : console[level];
  consoleFn(fullMessage);
}

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  child: (namespace: string) => Logger;
}

/**
 * Create a logger instance with optional namespace
 */
function createLogger(namespace: string | null = null): Logger {
  return {
    debug: (message: string, ...args: unknown[]) =>
      log('debug', namespace, message, ...args),
    info: (message: string, ...args: unknown[]) =>
      log('info', namespace, message, ...args),
    warn: (message: string, ...args: unknown[]) =>
      log('warn', namespace, message, ...args),
    error: (message: string, ...args: unknown[]) =>
      log('error', namespace, message, ...args),
    child: (childNamespace: string) =>
      createLogger(namespace ? `${namespace}:${childNamespace}` : childNamespace),
  };
}

/**
 * Create a namespaced logger for a specific module/service
 *
 * @example
 * ```typescript
 * import { createNamespacedLogger } from './logger.ts';
 *
 * const log = createNamespacedLogger('evolution-client');
 * log.debug('Sending message', { phone, text });
 * log.info('Message sent', { messageId });
 * log.error('Failed to send', { error: err.message });
 * ```
 */
export const createNamespacedLogger = (namespace: string): Logger =>
  createLogger(namespace);

/**
 * Main logger instance (for general use)
 */
export const logger = createLogger();

/**
 * Set log level at runtime
 * Useful for debugging in specific environments
 */
export function setLogLevel(level: LogLevel): void {
  config.level = level;
  console.info(`[Logger] Log level set to: ${level}`);
}
