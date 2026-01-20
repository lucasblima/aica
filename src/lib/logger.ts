/**
 * Centralized Logger for Aica Life OS
 * ====================================
 *
 * Provides environment-aware logging with namespace support.
 * In production, only 'warn' and 'error' levels are displayed.
 * In development, all levels including 'debug' are shown.
 *
 * USAGE:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * // Simple usage
 * logger.debug('Verbose debugging info');
 * logger.info('General operation info');
 * logger.warn('Warning condition');
 * logger.error('Error occurred', { details });
 *
 * // Namespaced usage (recommended for services)
 * const log = logger.child('CalendarSync');
 * log.debug('Starting sync', { eventId });
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamps: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

const LOG_COLORS: Record<Exclude<LogLevel, 'none'>, string> = {
  debug: 'color: #6B7280', // gray
  info: 'color: #3B82F6', // blue
  warn: 'color: #F59E0B; font-weight: bold', // orange
  error: 'color: #EF4444; font-weight: bold', // red
};

const LOG_PREFIXES: Record<Exclude<LogLevel, 'none'>, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
};

// Environment-based configuration
const config: LoggerConfig = {
  level: import.meta.env.PROD ? 'warn' : 'debug',
  enableColors: typeof window !== 'undefined', // Colors only in browser
  enableTimestamps: !import.meta.env.PROD, // Timestamps only in dev
};

/**
 * Check if a log level should be displayed based on current config
 */
function shouldLog(level: Exclude<LogLevel, 'none'>): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}

/**
 * Format the log message with optional namespace and timestamp
 */
function formatMessage(
  level: Exclude<LogLevel, 'none'>,
  namespace: string | null,
  message: string
): { formatted: string; style: string } {
  const parts: string[] = [];

  if (config.enableTimestamps) {
    const time = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    parts.push(`[${time}]`);
  }

  parts.push(LOG_PREFIXES[level]);

  if (namespace) {
    parts.push(`[${namespace}]`);
  }

  parts.push(message);

  return {
    formatted: `%c${parts.join(' ')}`,
    style: config.enableColors ? LOG_COLORS[level] : '',
  };
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

  const { formatted, style } = formatMessage(level, namespace, message);
  const consoleFn = level === 'debug' ? console.debug : console[level];

  if (config.enableColors && style) {
    if (args.length > 0) {
      consoleFn(formatted, style, ...args);
    } else {
      consoleFn(formatted, style);
    }
  } else {
    // No colors (SSR or production)
    const plainMessage = formatted.replace('%c', '');
    if (args.length > 0) {
      consoleFn(plainMessage, ...args);
    } else {
      consoleFn(plainMessage);
    }
  }
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
 * Main logger instance
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('App initialized');
 * logger.info('User logged in', { userId: '123' });
 * logger.warn('Rate limit approaching');
 * logger.error('Failed to save', { error });
 * ```
 */
export const logger = createLogger();

/**
 * Create a namespaced logger for a specific module/service
 *
 * @example
 * ```typescript
 * import { createNamespacedLogger } from '@/lib/logger';
 *
 * const log = createNamespacedLogger('CalendarSync');
 * log.debug('Starting sync');
 * log.info('Sync complete', { events: 5 });
 * ```
 */
export const createNamespacedLogger = (namespace: string): Logger =>
  createLogger(namespace);

/**
 * Utility to set log level at runtime (useful for debugging in production)
 * Can be called from browser console: window.__setLogLevel('debug')
 */
export function setLogLevel(level: LogLevel): void {
  config.level = level;
  // eslint-disable-next-line no-console
  console.info(`[Logger] Log level set to: ${level}`);
}

// Expose setLogLevel to window for debugging in production
if (typeof window !== 'undefined') {
  (window as unknown as { __setLogLevel: typeof setLogLevel }).__setLogLevel =
    setLogLevel;
}
