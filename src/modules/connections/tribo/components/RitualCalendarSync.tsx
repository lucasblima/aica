import { useState, useEffect } from 'react';
import { useCalendarSync } from '../../hooks/useCalendarSync';
import { CalendarSyncButton } from '../../components/CalendarSyncButton';
import { EventTimelineMini } from '../../components/EventTimelineMini';

/**
 * Props for RitualCalendarSync component
 */
interface RitualCalendarSyncProps {
  triboSpaceId: string;
  ritualId: string;
  ritualTitle: string;
  ritualDescription?: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  isRecurring: boolean;
  recurrenceRule?: string; // RRULE format
  hasGoogleEventId: boolean;
  googleEventId?: string;
  onSyncSuccess?: (googleEventId: string) => void;
  onSyncError?: (error: Error) => void;
  className?: string;
}

/**
 * Component for managing Tribo ritual synchronization with Google Calendar
 *
 * Features:
 * - One-click sync of recurring rituals
 * - Download .ics file for calendar import
 * - "Add to My Calendar" option
 * - Automatic series creation for recurring rituals
 * - RSVP tracking integration
 * - Calendar availability display
 *
 * @example
 * ```tsx
 * <RitualCalendarSync
 *   triboSpaceId="tribo-123"
 *   ritualId="ritual-456"
 *   ritualTitle="Roda de Conversa Semanal"
 *   startTime="2024-01-15T19:00:00"
 *   isRecurring={true}
 *   recurrenceRule="RRULE:FREQ=WEEKLY;BYDAY=MO"
 *   hasGoogleEventId={false}
 *   onSyncSuccess={(googleEventId) => refetchRitual()}
 * />
 * ```
 */
export function RitualCalendarSync({
  triboSpaceId,
  ritualId,
  ritualTitle,
  ritualDescription,
  startTime,
  endTime,
  isRecurring,
  recurrenceRule,
  hasGoogleEventId,
  googleEventId,
  onSyncSuccess,
  onSyncError,
  className = '',
}: RitualCalendarSyncProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { syncEvent, removeFromGoogle } = useCalendarSync({
    spaceId: triboSpaceId,
    enabled: true,
  });

  const startDate = new Date(startTime);
  const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 3600000);

  // Handle adding to calendar
  const handleAddToCalendar = async () => {
    try {
      if (!hasGoogleEventId) {
        await syncEvent.mutateAsync(ritualId);
        onSyncSuccess?.(googleEventId || ritualId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onSyncError?.(err);
    }
  };

  // Generate .ics file and download
  const handleDownloadIcs = () => {
    const icsContent = generateIcsContent();
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ritualTitle.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Handle copy ICS link
  const handleCopyIcsLink = () => {
    const icsUrl = `${window.location.origin}/rituals/${ritualId}/download.ics`;
    navigator.clipboard.writeText(icsUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Generate ICS file content
  const generateIcsContent = (): string => {
    const uid = `${ritualId}@aica.local`;
    const dtstamp = formatIcsDate(new Date());
    const dtstart = formatIcsDate(startDate);
    const dtend = formatIcsDate(endDate);
    const summary = ritualTitle;
    const description = (ritualDescription || '').replace(/"/g, '\\"');

    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Aica Life OS//Ritual Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${ritualTitle} - Aica Tribo
X-WR-TIMEZONE:America/Sao_Paulo
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${summary}
DESCRIPTION:${description}
STATUS:CONFIRMED
SEQUENCE:0
`;

    if (isRecurring && recurrenceRule) {
      icsContent += `RRULE:${recurrenceRule}\n`;
    }

    icsContent += `END:VEVENT
END:VCALENDAR`;

    return icsContent;
  };

  // Format date for ICS (YYYYMMDDTHHMMSSZ)
  const formatIcsDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  };

  // Generate calendar URL for common providers
  const googleCalendarUrl = (() => {
    const dates = `${formatIcsDate(startDate)}/${formatIcsDate(endDate)}`;
    const details = `${ritualDescription || 'Ritual da Tribo'}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ritualTitle)}&dates=${dates}&details=${encodeURIComponent(details)}`;
  })();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{ritualTitle}</h3>

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>📅</span>
              <span>
                {startDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>🕐</span>
              <span>
                {startDate.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {endDate.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {isRecurring && (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <span>🔄</span>
                <span>Ritual recorrente</span>
              </div>
            )}
          </div>

          {hasGoogleEventId && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
              ✅ Sincronizado
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Google Calendar Sync Button */}
        <CalendarSyncButton
          eventId={ritualId}
          spaceId={triboSpaceId}
          isAlreadySynced={hasGoogleEventId}
          onSuccess={(googleEventId) => onSyncSuccess?.(googleEventId)}
          onError={onSyncError}
          variant="primary"
          className="w-full justify-center"
        />

        {/* Download ICS Button */}
        <button
          onClick={handleDownloadIcs}
          className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
        >
          <span>📥</span>
          <span>Baixar .ics</span>
        </button>
      </div>

      {/* Additional Calendar Options */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Adicionar a outros calendários
        </p>

        {/* Google Calendar Web Link */}
        <a
          href={googleCalendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full block px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-center"
        >
          <span className="mr-2">🔗</span>
          Google Calendar (web)
        </a>

        {/* Copy ICS Link */}
        <button
          onClick={handleCopyIcsLink}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <span>{isCopied ? '✅' : '📋'}</span>
          <span>{isCopied ? 'Link copiado!' : 'Copiar link ICS'}</span>
        </button>

        {/* Outlook/iCloud Note */}
        <p className="text-xs text-gray-600">
          Use o arquivo .ics para adicionar a Outlook, Apple Calendar ou outro aplicativo
        </p>
      </div>

      {/* Event Details */}
      {ritualDescription && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Descrição
          </p>
          <p className="text-sm text-gray-700 line-clamp-3">{ritualDescription}</p>
        </div>
      )}

      {/* Remove from Google Calendar */}
      {hasGoogleEventId && (
        <button
          onClick={async () => {
            try {
              await removeFromGoogle.mutateAsync(ritualId);
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              onSyncError?.(err);
            }
          }}
          className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          disabled={removeFromGoogle.isPending}
        >
          {removeFromGoogle.isPending ? 'Removendo...' : '🗑️ Remover do Google Calendar'}
        </button>
      )}
    </div>
  );
}
