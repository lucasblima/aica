import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, X, Check, AlertCircle, ListChecks } from 'lucide-react';

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
  isTask?: boolean;
  isCompleted?: boolean;
  checklist?: Array<{ text: string; done: boolean }> | null;
}

interface NextTwoDaysViewProps {
  events: EventWithCategory[];
  onSkipEvent: (eventId: string) => void;
  onUnskipEvent: (eventId: string) => void;
  onTaskComplete?: (taskId: string) => void;
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

// Variants para animação stagger entre seções
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  })
};

export const NextTwoDaysView: React.FC<NextTwoDaysViewProps> = ({
  events,
  onSkipEvent,
  onUnskipEvent,
  onTaskComplete
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

  // Helper para calcular opacidade baseada no dia
  const getDayOpacity = (dayIndex: number): string => {
    if (dayIndex === 0) return 'opacity-100';
    if (dayIndex === 1) return 'opacity-95';
    return 'opacity-90';
  };

  // Agrupar eventos por dia
  const todayEvents = events.filter(e => e.isToday);
  const tomorrowEvents = events.filter(e => e.isTomorrow);
  const dayAfterEvents = events.filter(e => !e.isToday && !e.isTomorrow);


  const renderEventCard = (event: EventWithCategory, index: number) => {
    const timeUntil = timeUntilMap[event.id] || event.timeUntil;
    const isPast = timeUntil === 'Agora' || new Date(event.endTime) < new Date();

    return (
      <motion.div
        key={event.id}
        className={`ceramic-tile p-4 ${event.skipped || event.isCompleted ? 'opacity-50' : ''}`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        {/* Countdown Badge - Above main content */}
        {event.isToday && timeUntil && !event.skipped && !event.isCompleted && !isPast && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-ceramic-text-secondary/10">
            <Clock className="w-3.5 h-3.5 text-ceramic-accent animate-pulse" />
            <span className="text-xs font-black text-ceramic-accent uppercase tracking-wide">
              Falta {timeUntil}
            </span>
          </div>
        )}

        {/* Layout horizontal: Horário | Título | Ação */}
        <div className="flex items-center gap-4">
          {/* Task completion checkbox */}
          {event.isTask && onTaskComplete && (
            <button
              onClick={() => onTaskComplete(event.id.replace('task-', ''))}
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                event.isCompleted
                  ? 'bg-ceramic-accent border-ceramic-accent'
                  : 'border-ceramic-text-secondary/30 hover:border-ceramic-accent hover:scale-110'
              }`}
              title={event.isCompleted ? 'Concluida' : 'Marcar como concluida'}
            >
              {event.isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          )}

          {/* Horário - Destaque principal, âncora visual */}
          <span className="text-lg font-black text-ceramic-text-primary flex-shrink-0 tabular-nums">
            {formatTime(event.startTime)}
          </span>

          {/* Título + checklist progress */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-base font-medium text-ceramic-text-primary truncate ${
              event.skipped || event.isCompleted ? 'line-through text-ceramic-text-secondary' : ''
            }`}>
              {event.title}
            </h4>
            {event.checklist && event.checklist.length > 0 && (
              <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-ceramic-text-secondary">
                <ListChecks className="w-3 h-3" />
                {event.checklist.filter(i => i.done).length}/{event.checklist.length}
              </span>
            )}
          </div>

          {/* Action Button - Compact (only for calendar events, not tasks) */}
          {!event.isTask && event.isToday && !isPast && (
            <div className="flex-shrink-0">
              {event.skipped ? (
                <button
                  onClick={() => onUnskipEvent(event.id)}
                  className="ceramic-card px-3 py-1.5 rounded-xl hover:scale-105 transition-transform"
                  title="Desfazer"
                >
                  <Check className="w-4 h-4 text-ceramic-success" />
                </button>
              ) : (
                <button
                  onClick={() => onSkipEvent(event.id)}
                  className="ceramic-concave px-3 py-1.5 rounded-xl hover:scale-105 transition-transform"
                  title="Nao vou"
                >
                  <X className="w-4 h-4 text-ceramic-error" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Metadados secundários - Location */}
        {event.location && (
          <div className="flex items-center gap-1.5 mt-2 pl-[calc(theme(spacing.4)+4ch)]">
            <MapPin className="w-3 h-3 text-ceramic-text-secondary/60 flex-shrink-0" />
            <span className="text-xs text-ceramic-text-secondary truncate">
              {event.location}
            </span>
          </div>
        )}

        {/* Skipped indicator */}
        {event.skipped && (
          <div className="flex items-center gap-1.5 mt-2 pl-[calc(theme(spacing.4)+4ch)]">
            <AlertCircle className="w-3 h-3 text-ceramic-error/60 flex-shrink-0" />
            <span className="text-xs text-ceramic-error font-medium">Nao foi</span>
          </div>
        )}
      </motion.div>
    );
  };

  const renderDaySection = (
    dayLabel: string,
    dayEvents: EventWithCategory[],
    isToday: boolean = false
  ) => {
    return (
      <div className="ceramic-tray p-5 mb-4">
        {/* Título "gravado" na borda superior da bandeja */}
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${
          isToday ? 'text-ceramic-accent' : 'text-ceramic-text-secondary/70'
        }`}>
          {dayLabel}
        </h3>

        {/* Conteúdo */}
        {dayEvents.length > 0 ? (
          <div className="space-y-3">
            {dayEvents.map((event, index) => renderEventCard(event, index))}
          </div>
        ) : (
          <p className="text-sm text-ceramic-text-secondary/50 italic py-2">
            Livre
          </p>
        )}
      </div>
    );
  };

  // Sempre mostrar as seções de dias (framework da página)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  return (
    <div className="space-y-6">
      {/* Seção Hoje - index 0 */}
      <motion.div
        custom={0}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className={getDayOpacity(0)}
      >
        {renderDaySection('Hoje', todayEvents, true)}
      </motion.div>

      {/* Seção Amanhã - index 1 */}
      <motion.div
        custom={1}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className={getDayOpacity(1)}
      >
        {renderDaySection('Amanhã', tomorrowEvents)}
      </motion.div>

      {/* Seção Depois de Amanhã - index 2 */}
      <motion.div
        custom={2}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className={getDayOpacity(2)}
      >
        {renderDaySection(
          dayAfter.toLocaleDateString('pt-BR', { weekday: 'long' }),
          dayAfterEvents
        )}
      </motion.div>
    </div>
  );
};
