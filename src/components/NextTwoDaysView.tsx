import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, X, Check, AlertCircle } from 'lucide-react';

interface EventWithCategory {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  category: string; // treino, reunião, compromisso, etc
  isToday: boolean;
  isTomorrow: boolean;
  timeUntil?: string; // "1h 33min" ou "Agora"
  skipped?: boolean;
}

interface NextTwoDaysViewProps {
  events: EventWithCategory[];
  onSkipEvent: (eventId: string) => void;
  onUnskipEvent: (eventId: string) => void;
}

// Detectar categoria do evento baseado no título e descrição
export function detectEventCategory(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase();

  if (text.match(/\b(treino|academia|musculação|krav maga|jiu jitsu|yoga|pilates|crossfit|corrida|natação)\b/)) {
    return 'Treino';
  }
  if (text.match(/\b(reunião|meeting|call|standup|1:1|sync)\b/)) {
    return 'Reunião';
  }
  if (text.match(/\b(consulta|médico|dentista|terapeuta|exame)\b/)) {
    return 'Saúde';
  }
  if (text.match(/\b(almoço|jantar|café|breakfast|lunch|dinner)\b/)) {
    return 'Refeição';
  }
  if (text.match(/\b(workshop|curso|aula|palestra|treinamento)\b/)) {
    return 'Educação';
  }

  return 'Compromisso';
}

// Calcular tempo até o evento
export function calculateTimeUntil(startTime: string): string {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Agora';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

export const NextTwoDaysView: React.FC<NextTwoDaysViewProps> = ({
  events,
  onSkipEvent,
  onUnskipEvent
}) => {
  const [timeUntilMap, setTimeUntilMap] = useState<Record<string, string>>({});

  // Update countdown every minute
  useEffect(() => {
    const updateCountdowns = () => {
      const newMap: Record<string, string> = {};
      events.forEach(event => {
        if (event.isToday) {
          newMap[event.id] = calculateTimeUntil(event.startTime);
        }
      });
      setTimeUntilMap(newMap);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 60000);
    return () => clearInterval(interval);
  }, [events]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDayLabel = (isToday: boolean, isTomorrow: boolean, date: string) => {
    if (isToday) return 'Hoje';
    if (isTomorrow) return 'Amanhã';

    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('pt-BR', { weekday: 'long' });
  };

  // Agrupar eventos por dia
  const todayEvents = events.filter(e => e.isToday);
  const tomorrowEvents = events.filter(e => e.isTomorrow);
  const dayAfterEvents = events.filter(e => !e.isToday && !e.isTomorrow);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Treino':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Reunião':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Saúde':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'Refeição':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Educação':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const renderEventCard = (event: EventWithCategory) => {
    const timeUntil = timeUntilMap[event.id] || event.timeUntil;
    const isPast = timeUntil === 'Agora' || new Date(event.endTime) < new Date();

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`ceramic-card p-6 rounded-3xl relative overflow-hidden ${event.skipped ? 'opacity-50' : ''}`}
      >
        {/* Countdown Badge - Destaque Principal */}
        {event.isToday && timeUntil && !event.skipped && !isPast && (
          <div className="ceramic-tray px-4 py-2 rounded-2xl mb-4 inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50">
            <Clock className="w-4 h-4 text-ceramic-accent animate-pulse" />
            <span className="text-sm font-black text-ceramic-accent">
              Falta {timeUntil}
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title - Grande e Bold */}
            <h4 className={`text-xl font-black text-ceramic-text-primary mb-2 text-etched ${event.skipped ? 'line-through' : ''}`}>
              {event.title}
            </h4>

            {/* Category + Time - Uma linha só */}
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getCategoryColor(event.category)}`}>
                {event.category}
              </span>
              <div className="flex items-center gap-1.5 text-sm text-ceramic-text-secondary font-medium">
                <Clock className="w-4 h-4" />
                <span>{formatTime(event.startTime)}</span>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-1.5 text-sm text-ceramic-text-secondary">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* Skipped indicator */}
            {event.skipped && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600 font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>Não foi</span>
              </div>
            )}
          </div>

          {/* Action Button - Mais evidente */}
          {event.isToday && !isPast && (
            <div className="flex-shrink-0">
              {event.skipped ? (
                <button
                  onClick={() => onUnskipEvent(event.id)}
                  className="ceramic-card px-4 py-2 rounded-2xl hover:scale-105 transition-transform flex items-center gap-2"
                  title="Desfazer"
                >
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-bold text-green-600">Desfazer</span>
                </button>
              ) : (
                <button
                  onClick={() => onSkipEvent(event.id)}
                  className="ceramic-concave px-4 py-2 rounded-2xl hover:scale-105 transition-transform flex items-center gap-2"
                  title="Não vou"
                >
                  <X className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-bold text-red-600">Não vou</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderDaySection = (
    dayLabel: string,
    dayEvents: EventWithCategory[],
    isToday: boolean = false
  ) => {
    if (dayEvents.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h3 className={`text-2xl font-black ${
            isToday ? 'text-ceramic-accent text-etched' : 'text-ceramic-text-primary text-etched'
          }`}>
            {dayLabel}
          </h3>
          <div className="flex-1" />
          <span className="text-xs text-ceramic-text-tertiary font-medium">
            {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>
        <div className="space-y-3">
          {dayEvents.map(renderEventCard)}
        </div>
      </div>
    );
  };

  if (events.length === 0) {
    return (
      <div className="ceramic-tray p-8 rounded-2xl text-center">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-ceramic-text-secondary/50" />
        <p className="text-ceramic-text-secondary">
          Nenhum evento nos próximos 2 dias
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderDaySection('Hoje', todayEvents, true)}
      {renderDaySection('Amanhã', tomorrowEvents)}
      {renderDaySection(
        formatDayLabel(false, false, dayAfterEvents[0]?.startTime || ''),
        dayAfterEvents
      )}
    </div>
  );
};
