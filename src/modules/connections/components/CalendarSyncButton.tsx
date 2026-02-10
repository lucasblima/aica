import { useState } from 'react';
import { useCalendarSync } from '../hooks/useCalendarSync';

/**
 * Props for CalendarSyncButton component
 */
interface CalendarSyncButtonProps {
  eventId: string;
  spaceId: string;
  isAlreadySynced?: boolean;
  onSuccess?: (googleEventId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

/**
 * Button component for synchronizing a single Connection Event to Google Calendar
 *
 * Features:
 * - Shows sync status (not synced, syncing, synced, error)
 * - Displays last sync timestamp in tooltip
 * - Auto-updates after successful sync
 * - Graceful error handling with user feedback
 *
 * @example
 * ```tsx
 * <CalendarSyncButton
 *   eventId="event-123"
 *   spaceId="space-456"
 *   onSuccess={(googleEventId) => console.log('Synced:', googleEventId)}
 * />
 * ```
 */
export function CalendarSyncButton({
  eventId,
  spaceId,
  isAlreadySynced = false,
  onSuccess,
  onError,
  className = '',
  size = 'md',
  variant = 'primary',
}: CalendarSyncButtonProps) {
  const { syncEvent, updateEvent } = useCalendarSync({ spaceId, enabled: true });
  const [showTooltip, setShowTooltip] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(
    isAlreadySynced ? new Date() : null
  );

  const handleSync = async () => {
    try {
      // If already synced, update instead
      if (isAlreadySynced) {
        await updateEvent.mutateAsync(eventId);
        setLastSyncTime(new Date());
        onSuccess?.(eventId);
      } else {
        const googleEventId = await syncEvent.mutateAsync(eventId);
        setLastSyncTime(new Date());
        onSuccess?.(googleEventId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  };

  const isPending = syncEvent.isPending || updateEvent.isPending;
  const isError = syncEvent.isError || updateEvent.isError;
  const errorMessage = syncEvent.error?.message || updateEvent.error?.message;

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-amber-500 hover:bg-amber-600 text-white',
    secondary: 'bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-primary',
    ghost: 'bg-transparent hover:bg-ceramic-base text-ceramic-text-primary border border-ceramic-border',
  };

  // Status-based styling
  let statusColor = variantClasses[variant];
  let statusIcon = '📅';
  let statusText = 'Sincronizar';

  if (isPending) {
    statusIcon = '⏳';
    statusText = 'Sincronizando...';
    statusColor = 'bg-ceramic-warning text-white';
  } else if (isError) {
    statusIcon = '❌';
    statusText = 'Erro ao sincronizar';
    statusColor = 'bg-ceramic-error hover:bg-ceramic-error/90 text-white';
  } else if (isAlreadySynced && lastSyncTime) {
    statusIcon = '✅';
    statusText = 'Sincronizado';
    statusColor = 'bg-ceramic-success hover:bg-ceramic-success/90 text-white';
  }

  const tooltipText = lastSyncTime
    ? `Última sincronização: ${lastSyncTime.toLocaleTimeString('pt-BR')}`
    : isAlreadySynced
      ? 'Sincronizado com Google Calendar'
      : 'Clique para sincronizar com Google Calendar';

  return (
    <div className="relative inline-block">
      <button
        onClick={handleSync}
        disabled={isPending}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          ${sizeClasses[size]}
          ${statusColor}
          rounded-md font-medium transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2
          ${className}
        `}
        title={tooltipText}
      >
        <span>{statusIcon}</span>
        <span>{statusText}</span>
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-ceramic-text-primary text-white text-xs rounded whitespace-nowrap z-50">
          {tooltipText}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-ceramic-text-primary"></div>
        </div>
      )}

      {isError && errorMessage && (
        <div className="mt-1 text-xs text-ceramic-error">{errorMessage}</div>
      )}
    </div>
  );
}
