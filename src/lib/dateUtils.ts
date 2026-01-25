/**
 * Date Utilities
 * Centralized date formatting functions for the application
 */

/**
 * Formats a date as a relative time string in Portuguese
 * Examples: "agora", "5min atrás", "2h atrás", "Ontem", "3 dias atrás", "15 jan"
 *
 * @param date - Date object, ISO string, or timestamp
 * @param options - Optional configuration
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string | number | null | undefined,
  options: {
    /** Use short format: "5m", "2h", "3d" instead of "5min atrás", "2h atrás", "3 dias atrás" */
    short?: boolean;
    /** Include "há" prefix: "há 5 minutos" instead of "5min atrás" */
    useHaPrefix?: boolean;
  } = {}
): string {
  if (!date) return '';

  const { short = false, useHaPrefix = false } = options;

  const dateObj = date instanceof Date ? date : new Date(date);

  // Handle invalid dates
  if (isNaN(dateObj.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();

  // Future dates
  if (diffMs < 0) {
    return formatFutureDate(dateObj, short);
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  // Just now (< 1 minute)
  if (diffMins < 1) {
    return 'agora';
  }

  // Minutes (1-59)
  if (diffMins < 60) {
    if (short) return `${diffMins}m`;
    if (useHaPrefix) return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    return `${diffMins}min atrás`;
  }

  // Hours (1-23)
  if (diffHours < 24) {
    if (short) return `${diffHours}h`;
    if (useHaPrefix) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    return `${diffHours}h atrás`;
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Ontem';
  }

  // Days (2-6)
  if (diffDays < 7) {
    if (short) return `${diffDays}d`;
    if (useHaPrefix) return `há ${diffDays} dias`;
    return `${diffDays} dias atrás`;
  }

  // Weeks (1-3)
  if (diffWeeks < 4) {
    if (short) return `${diffWeeks}sem`;
    if (useHaPrefix) return `há ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
    return `${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'} atrás`;
  }

  // Months (1-11)
  if (diffMonths < 12) {
    if (short) return `${diffMonths}m`;
    if (useHaPrefix) return `há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;
    return `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'} atrás`;
  }

  // Older than a year - show date
  return dateObj.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: now.getFullYear() !== dateObj.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Formats a future date
 */
function formatFutureDate(date: Date, short: boolean): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return short ? `em ${diffMins}m` : `em ${diffMins} minutos`;
  }
  if (diffHours < 24) {
    return short ? `em ${diffHours}h` : `em ${diffHours} horas`;
  }
  if (diffDays === 1) {
    return 'Amanhã';
  }
  if (diffDays < 7) {
    return short ? `em ${diffDays}d` : `em ${diffDays} dias`;
  }

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Formats a date for display in contact cards
 * Shows "Última mensagem há X dias" style
 *
 * @param date - Date of last interaction
 * @returns Formatted string like "há 2 dias" or "há 3 semanas"
 */
export function formatLastInteraction(
  date: Date | string | number | null | undefined
): string {
  if (!date) return 'Sem interação';

  return formatRelativeTime(date, { useHaPrefix: true });
}

/**
 * Gets the number of days since a date
 * Useful for calculating health scores and engagement metrics
 *
 * @param date - Date to calculate from
 * @returns Number of days (0 if today, -1 for invalid/null dates)
 */
export function getDaysSince(
  date: Date | string | number | null | undefined
): number {
  if (!date) return -1;

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return -1;

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a date is within the last N days
 *
 * @param date - Date to check
 * @param days - Number of days threshold
 * @returns true if date is within the last N days
 */
export function isWithinDays(
  date: Date | string | number | null | undefined,
  days: number
): boolean {
  const daysSince = getDaysSince(date);
  return daysSince >= 0 && daysSince <= days;
}

/**
 * Checks if a date is "recent" (within last 7 days)
 */
export function isRecent(date: Date | string | number | null | undefined): boolean {
  return isWithinDays(date, 7);
}

/**
 * Checks if a date is "stale" (more than 30 days ago)
 */
export function isStale(date: Date | string | number | null | undefined): boolean {
  const daysSince = getDaysSince(date);
  return daysSince > 30;
}
