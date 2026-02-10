import React, { useEffect } from 'react';
import { Calendar, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useGoogleCalendarEvents } from '@/hooks/useGoogleCalendarEvents';

interface GoogleCalendarEventsListProps {
    /** Mostrar apenas eventos de hoje */
    todayOnly?: boolean;
    /** Número máximo de eventos a exibir */
    maxEvents?: number;
    /** Callback quando um evento é clicado */
    onEventClick?: (eventId: string) => void;
}

export default function GoogleCalendarEventsList({
    todayOnly = true,
    maxEvents = 5,
    onEventClick,
}: GoogleCalendarEventsListProps) {
    const { events, isConnected, isLoading, error, sync } = useGoogleCalendarEvents({
        autoSync: true,
        syncInterval: 300,
    });

    const filteredEvents = todayOnly
        ? events.filter(event => {
            const eventDate = new Date(event.startTime).toDateString();
            const today = new Date().toDateString();
            return eventDate === today;
        })
        : events;

    const displayedEvents = filteredEvents.slice(0, maxEvents);

    if (!isConnected) {
        return null;
    }

    return (
        <div className="w-full">
            {/* Header com Refresh */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#EA4335]" />
                    <h3 className="text-lg font-semibold text-[#5C554B]">
                        Meu Calendário
                    </h3>
                </div>
                <button
                    onClick={sync}
                    disabled={isLoading}
                    className="p-2 hover:bg-[#E6D5C3] rounded-lg transition-colors disabled:opacity-50"
                    title="Sincronizar calendário"
                >
                    <RefreshCw className={`w-4 h-4 text-[#948D82] ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Mensagem de Erro */}
            {error && (
                <div className="mb-4 p-3 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-ceramic-error">Erro na sincronização</p>
                        <p className="text-xs text-ceramic-error/80">{error}</p>
                    </div>
                </div>
            )}

            {/* Estado de Carregamento */}
            {isLoading && displayedEvents.length === 0 && (
                <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#948D82]" />
                    <span className="text-sm text-[#948D82]">Sincronizando eventos...</span>
                </div>
            )}

            {/* Lista de Eventos */}
            {displayedEvents.length > 0 ? (
                <div className="space-y-2">
                    {displayedEvents.map((event) => {
                        const startTime = new Date(event.startTime);
                        const endTime = new Date(event.endTime);
                        const isCurrentOrUpcoming = startTime.getTime() >= Date.now();

                        // Formatar horários
                        const timeString = event.isAllDay
                            ? 'Dia inteiro'
                            : `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

                        return (
                            <div
                                key={event.id}
                                onClick={() => onEventClick?.(event.id)}
                                className={`p-3 rounded-xl border-l-4 transition-all cursor-pointer ${isCurrentOrUpcoming
                                    ? 'bg-ceramic-info/10 border-ceramic-info hover:bg-ceramic-info/15'
                                    : 'bg-ceramic-cool border-ceramic-border hover:bg-ceramic-base'
                                    }`}
                            >
                                <h4 className="font-semibold text-[#5C554B] text-sm truncate">
                                    {event.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="w-3 h-3 text-[#948D82]" />
                                    <time className="text-xs text-[#948D82]">
                                        {timeString}
                                    </time>
                                </div>
                                {event.attendees && event.attendees.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-ceramic-border">
                                        <p className="text-xs text-[#948D82]">
                                            {event.attendees.length} participante{event.attendees.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : !isLoading && (
                <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-[#d4d3cd] mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-[#948D82]">
                        {todayOnly
                            ? 'Nenhum evento para hoje'
                            : 'Nenhum evento sincronizado'}
                    </p>
                </div>
            )}

            {/* Indicador de quantos eventos há */}
            {displayedEvents.length > 0 && filteredEvents.length > maxEvents && (
                <div className="mt-3 text-center text-xs text-[#948D82]">
                    +{filteredEvents.length - maxEvents} evento{filteredEvents.length - maxEvents > 1 ? 's' : ''} a mais
                </div>
            )}
        </div>
    );
}
