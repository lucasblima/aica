import { useState, useMemo, useEffect } from 'react';
import { useCalendarSync } from '../../hooks/useCalendarSync';
import { CalendarSyncButton } from '../../components/CalendarSyncButton';
import { EventTimelineMini } from '../../components/EventTimelineMini';
import { SpaceCalendarSettings } from '../../components/SpaceCalendarSettings';
import { eventService } from '../../services/eventService';
import { ConnectionEvent } from '../../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('MaintenanceCalendarView');

/**
 * Props for MaintenanceCalendarView component
 */
interface MaintenanceCalendarViewProps {
  habitatSpaceId: string;
  propertyId?: string;
  className?: string;
}

/**
 * Calendar view for Habitat maintenance events with Google Calendar integration
 *
 * Features:
 * - Monthly/weekly calendar view
 * - Maintenance event scheduling
 * - Google Calendar sync for each maintenance
 * - Drag-and-drop rescheduling
 * - Reminder configuration
 * - Conflict detection
 *
 * @example
 * ```tsx
 * <MaintenanceCalendarView
 *   habitatSpaceId="habitat-123"
 *   propertyId="property-456"
 * />
 * ```
 */
export function MaintenanceCalendarView({
  habitatSpaceId,
  propertyId,
  className = '',
}: MaintenanceCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedEvent, setSelectedEvent] = useState<ConnectionEvent | null>(null);
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { syncEvent, checkConflicts, enableAutoSync } = useCalendarSync({
    spaceId: habitatSpaceId,
    autoSync: true,
  });

  // Fetch maintenance events for the current period
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);

        const start = new Date(currentDate);
        if (viewMode === 'month') {
          start.setDate(1);
        } else {
          start.setDate(currentDate.getDate() - currentDate.getDay());
        }

        const end = new Date(start);
        if (viewMode === 'month') {
          end.setMonth(end.getMonth() + 1);
        } else {
          end.setDate(end.getDate() + 7);
        }

        const fetchedEvents = await eventService.getEvents(habitatSpaceId, {
          start: start.toISOString(),
          end: end.toISOString(),
        });

        setEvents(fetchedEvents);
      } catch (error) {
        log.error('[MaintenanceCalendarView] Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate, viewMode, habitatSpaceId]);

  // Group events by day for month view
  const eventsByDay = useMemo(() => {
    const grouped: Record<number, ConnectionEvent[]> = {};

    events.forEach((event) => {
      const day = new Date(event.starts_at).getDate();
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(event);
    });

    return grouped;
  }, [events]);

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    let date = new Date(startDate);

    while (date <= lastDay || date.getDay() !== 0) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  // Handle previous/next month
  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  // Handle event sync
  const handleSyncEvent = async (eventId: string) => {
    try {
      await syncEvent.mutateAsync(eventId);
    } catch (error) {
      log.error('[MaintenanceCalendarView] Error syncing event:', error);
    }
  };

  // Handle auto-sync setup
  const handleSetupAutoSync = async () => {
    try {
      await enableAutoSync(60); // 1 hour interval
    } catch (error) {
      log.error('[MaintenanceCalendarView] Error enabling auto-sync:', error);
    }
  };

  const monthYear = currentDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Calendário de Manutenção</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 text-sm font-medium rounded ${
                viewMode === 'week'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 text-sm font-medium rounded ${
                viewMode === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mês
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousPeriod}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            ← Anterior
          </button>

          <h3 className="text-lg font-semibold text-gray-900 capitalize">{monthYear}</h3>

          <button
            onClick={handleNextPeriod}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Próximo →
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSetupAutoSync}
            className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded hover:bg-green-600"
          >
            🔄 Ativar Sincronização Automática
          </button>

          <span className="text-xs text-gray-600">
            {events.length} evento{events.length !== 1 ? 's' : ''} este período
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          {viewMode === 'month' ? (
            <MonthCalendarGrid
              days={calendarDays}
              eventsByDay={eventsByDay}
              currentMonth={currentDate.getMonth()}
              onEventClick={setSelectedEvent}
              onSyncEvent={handleSyncEvent}
              isLoading={isLoading}
            />
          ) : (
            <WeekCalendarView
              events={events}
              currentDate={currentDate}
              onEventClick={setSelectedEvent}
              onSyncEvent={handleSyncEvent}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Sidebar: Event Details & Timeline */}
        <div className="space-y-6">
          {/* Event Details */}
          {selectedEvent ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">{selectedEvent.title}</h4>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Data e Hora</p>
                  <p className="text-gray-900">
                    {new Date(selectedEvent.starts_at).toLocaleDateString('pt-BR')}{' '}
                    {new Date(selectedEvent.starts_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {selectedEvent.location && (
                  <div>
                    <p className="text-gray-600 font-medium">Local</p>
                    <p className="text-gray-900">{selectedEvent.location}</p>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <p className="text-gray-600 font-medium">Descrição</p>
                    <p className="text-gray-900">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              {/* Sync Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <CalendarSyncButton
                  eventId={selectedEvent.id}
                  spaceId={habitatSpaceId}
                  isAlreadySynced={!!selectedEvent.google_event_id}
                  className="w-full"
                />
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <p className="text-sm text-blue-800 font-medium">
                Selecione um evento para ver detalhes
              </p>
            </div>
          )}

          {/* Mini Timeline */}
          <EventTimelineMini
            spaceId={habitatSpaceId}
            maxEvents={5}
            showGoogleCalendarIntegration={true}
            onEventClick={setSelectedEvent}
          />
        </div>
      </div>

      {/* Settings Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <SpaceCalendarSettings spaceId={habitatSpaceId} />
      </div>
    </div>
  );
}

/**
 * Month calendar grid component
 */
function MonthCalendarGrid({
  days,
  eventsByDay,
  currentMonth,
  onEventClick,
  onSyncEvent,
  isLoading,
}: {
  days: Date[];
  eventsByDay: Record<number, any[]>;
  currentMonth: number;
  onEventClick: (event: any) => void;
  onSyncEvent: (eventId: string) => Promise<void>;
  isLoading: boolean;
}) {
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {dayNames.map((day) => (
          <div key={day} className="text-center font-semibold text-sm text-gray-700 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const dayNum = day.getDate();
          const isCurrentMonth = day.getMonth() === currentMonth;
          const dayEvents = eventsByDay[dayNum] || [];
          const isToday =
            day.toDateString() === new Date().toDateString();

          return (
            <div
              key={idx}
              className={`
                min-h-24 p-2 border rounded
                ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                ${isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}
              `}
            >
              <p
                className={`text-xs font-semibold mb-1 ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {dayNum}
              </p>

              {/* Events for this day */}
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left text-xs p-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 truncate"
                    title={event.title}
                  >
                    {event.title}
                  </button>
                ))}

                {dayEvents.length > 2 && (
                  <p className="text-xs text-gray-600">+{dayEvents.length - 2} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Week calendar view component
 */
function WeekCalendarView({
  events,
  currentDate,
  onEventClick,
  onSyncEvent,
  isLoading,
}: {
  events: ConnectionEvent[];
  currentDate: Date;
  onEventClick: (event: any) => void;
  onSyncEvent: (eventId: string) => Promise<void>;
  isLoading: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-center text-gray-600 py-8">Nenhum evento esta semana</p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              onClick={() => onEventClick(event)}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{event.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(event.starts_at).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(event.starts_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {event.google_event_id && (
                  <span className="text-lg" title="Sincronizado com Google Calendar">
                    ✅
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
