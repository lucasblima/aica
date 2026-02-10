import { useEffect, useState } from 'react';
import { eventService } from '../services/eventService';
import { ConnectionEvent } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('EventTimelineMini');

/**
 * Props for EventTimelineMini component
 */
interface EventTimelineMiniProps {
  spaceId: string;
  maxEvents?: number;
  showGoogleCalendarIntegration?: boolean;
  onEventClick?: (eventId: string) => void;
  className?: string;
}

/**
 * Compact timeline component showing upcoming Connection Events
 *
 * Features:
 * - Displays next N events chronologically
 * - Visual indicators for Google Calendar sync status
 * - Conflict detection highlighting
 * - Real-time updates
 * - Responsive compact design
 *
 * @example
 * ```tsx
 * <EventTimelineMini
 *   spaceId="habitat-123"
 *   maxEvents={5}
 *   showGoogleCalendarIntegration={true}
 *   onEventClick={(eventId) => navigate(`/events/${eventId}`)}
 * />
 * ```
 */
export function EventTimelineMini({
  spaceId,
  maxEvents = 5,
  showGoogleCalendarIntegration = true,
  onEventClick,
  className = '',
}: EventTimelineMiniProps) {
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch upcoming events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get today's date and 30 days from now
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const dateRange = {
          start: today.toISOString(),
          end: thirtyDaysLater.toISOString(),
        };

        const fetchedEvents = await eventService.getEvents(spaceId, dateRange);
        setEvents(fetchedEvents.slice(0, maxEvents));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        log.error('[EventTimelineMini] Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();

    // Set up refresh interval (every 60 seconds)
    const interval = setInterval(fetchEvents, 60000);

    return () => clearInterval(interval);
  }, [spaceId, maxEvents]);

  // Format time for display
  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date for display
  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Check if event is today
  const isToday = (isoString: string): boolean => {
    const eventDate = new Date(isoString);
    const today = new Date();
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  };

  // Check if event is happening now
  const isHappening = (event: ConnectionEvent): boolean => {
    const now = new Date();
    const start = new Date(event.starts_at);
    const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 3600000);
    return now >= start && now <= end;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <p className="text-xs text-ceramic-text-secondary">Carregando eventos...</p>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-ceramic-cool rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-ceramic-error-bg border border-ceramic-error/20 rounded p-3 text-sm ${className}`}>
        <p className="text-ceramic-error font-medium">Erro ao carregar eventos</p>
        <p className="text-ceramic-error/80 text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className={`bg-ceramic-info-bg border border-ceramic-info/20 rounded p-3 text-sm ${className}`}>
        <p className="text-ceramic-info font-medium">Nenhum evento agendado</p>
        <p className="text-ceramic-info/80 text-xs mt-1">Crie um novo evento para começar</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-xs font-bold text-ceramic-text-primary uppercase tracking-wide mb-3">
        Próximos Eventos
      </h3>

      <div className="space-y-3">
        {events.map((event) => {
          const happening = isHappening(event);
          const today = isToday(event.starts_at);

          return (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event.id)}
              className={`
                p-3 rounded-lg border-l-4 transition-all cursor-pointer
                ${happening ? 'bg-ceramic-success-bg border-ceramic-success' : 'bg-ceramic-base border-ceramic-border'}
                ${onEventClick ? 'hover:shadow-md hover:scale-105' : ''}
              `}
              style={{ transform: onEventClick ? undefined : 'scale(1)' }}
            >
              {/* Event Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ceramic-text-primary truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-ceramic-text-secondary mt-1">
                    {today ? 'Hoje' : formatDate(event.starts_at)} • {formatTime(event.starts_at)}
                    {event.ends_at && ` - ${formatTime(event.ends_at)}`}
                  </p>
                </div>

                {/* Status Indicators */}
                <div className="flex items-center gap-1 ml-2">
                  {happening && (
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-ceramic-success/10 text-ceramic-success animate-pulse"
                      title="Acontecendo agora"
                    >
                      🔴 AO VIVO
                    </span>
                  )}

                  {event.google_event_id && showGoogleCalendarIntegration && (
                    <span
                      className="text-lg"
                      title="Sincronizado com Google Calendar"
                    >
                      ✅
                    </span>
                  )}

                  {event.rsvp_enabled && (
                    <span
                      className="text-lg"
                      title="RSVP habilitado"
                    >
                      📋
                    </span>
                  )}
                </div>
              </div>

              {/* Event Details */}
              {event.location && (
                <p className="text-xs text-ceramic-text-secondary flex items-center gap-1">
                  <span>📍</span>
                  {event.location}
                </p>
              )}

              {event.description && (
                <p className="text-xs text-ceramic-text-secondary mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}

              {event.is_all_day && (
                <p className="text-xs text-ceramic-accent font-medium mt-2">
                  📅 Evento o dia todo
                </p>
              )}

              {event.recurrence_rule && (
                <p className="text-xs text-ceramic-info mt-2">
                  🔄 Evento recorrente
                </p>
              )}
            </div>
          );
        })}
      </div>

      {events.length >= maxEvents && (
        <button
          className="w-full text-center text-xs text-ceramic-info hover:text-ceramic-info/80 font-medium py-2 border-t border-ceramic-border mt-4"
        >
          Ver mais eventos
        </button>
      )}
    </div>
  );
}
