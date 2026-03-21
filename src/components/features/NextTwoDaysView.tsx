import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, X, Check, AlertCircle, ListChecks } from 'lucide-react';
import { getQuadrantFromFlags, QUADRANT_COLORS } from '@/constants/quadrantColors';
import type { WeatherData } from '@/lib/external-api';
import { WeatherStrip } from './WeatherStrip';

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
  is_urgent?: boolean;
  is_important?: boolean;
}

interface NextTwoDaysViewProps {
  events: EventWithCategory[];
  onSkipEvent: (eventId: string) => void;
  onUnskipEvent: (eventId: string) => void;
  onTaskComplete?: (taskId: string) => void;
  onEventClick?: (event: EventWithCategory) => void;
  completingTaskIds?: Set<string>;
  forecast?: WeatherData['forecast'] | null;
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

// Calcular tempo ate o evento
// Accepts optional endTime to detect events that already ended
export function calculateTimeUntil(startTime: string, endTime?: string): string {
  const now = new Date();

  // If endTime is provided and the event has already ended, mark it
  if (endTime) {
    const end = new Date(endTime);
    if (!isNaN(end.getTime()) && now >= end) {
      return 'Encerrado';
    }
  }

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

// Variants para animacao stagger entre secoes
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

// Spring config for celebration animation
const celebrationSpring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

// Checklist progress bar — top-level to avoid re-mount on parent re-render
const ChecklistProgressBar: React.FC<{ checklist: Array<{ text: string; done: boolean }> }> = ({ checklist }) => {
  const done = checklist.filter(i => i.done).length;
  const total = checklist.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1 rounded-full bg-ceramic-border/40 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-ceramic-accent/70"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-ceramic-text-secondary/60 flex-shrink-0">
        {done}/{total}
      </span>
    </div>
  );
};

export const NextTwoDaysView: React.FC<NextTwoDaysViewProps> = ({
  events,
  onSkipEvent,
  onUnskipEvent,
  onTaskComplete,
  onEventClick,
  completingTaskIds,
  forecast
}) => {
  const [timeUntilMap, setTimeUntilMap] = useState<Record<string, string>>({});

  // Tick counter forces re-render every 60s so time-dependent UI stays fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const tickInterval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(tickInterval);
  }, []);

  // Update countdown every minute
  useEffect(() => {
    const updateCountdowns = () => {
      const newMap: Record<string, string> = {};
      events.forEach(event => {
        if (event.isToday) {
          newMap[event.id] = calculateTimeUntil(event.startTime, event.endTime);
        }
      });
      setTimeUntilMap(newMap);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 60_000);
    return () => clearInterval(interval);
  }, [events]);

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      const timeMatch = isoString.match(/(\d{2}):(\d{2})/);
      if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
      return '--:--';
    }
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper para calcular opacidade baseada no dia
  const getDayOpacity = (dayIndex: number): string => {
    if (dayIndex === 0) return 'opacity-100';
    if (dayIndex === 1) return 'opacity-95';
    return 'opacity-90';
  };

  // Check if a task (by its raw ID without "task-" prefix) is in the completing set
  const isTaskCompleting = (eventId: string): boolean => {
    if (!completingTaskIds || completingTaskIds.size === 0) return false;
    // Event IDs in NextTwoDaysView have "task-" prefix, completingTaskIds uses raw UUID
    const rawId = eventId.replace('task-', '');
    return completingTaskIds.has(rawId);
  };

  // Agrupar eventos por dia
  const todayEvents = events.filter(e => e.isToday);
  const tomorrowEvents = events.filter(e => e.isTomorrow);
  const dayAfterEvents = events.filter(e => !e.isToday && !e.isTomorrow);


  const renderEventCard = (event: EventWithCategory, index: number) => {
    const timeUntil = timeUntilMap[event.id] || event.timeUntil;
    const now = new Date();
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    const isStartValid = !isNaN(startDate.getTime());
    const isEndValid = !isNaN(endDate.getTime());
    // An event is "happening now" only if it has started AND not yet ended
    const isHappening = isStartValid && isEndValid && startDate <= now && now < endDate;
    // An event is "past" if its end time is in the past (and it's not happening now)
    const isPast = isEndValid && endDate <= now;
    const completing = isTaskCompleting(event.id);

    // Quadrant color border for task items
    const quadrantBorder = event.isTask && (event.is_urgent !== undefined || event.is_important !== undefined)
      ? QUADRANT_COLORS[getQuadrantFromFlags(!!event.is_urgent, !!event.is_important)].border
      : '';

    // Visual state classes
    const stateClasses = completing
      ? '' // Completing state has its own style
      : event.skipped || event.isCompleted
        ? 'opacity-50'
        : isPast && !event.isTask
          ? 'opacity-60 grayscale-[30%] border-l-4 border-ceramic-text-tertiary/30'
          : isHappening
            ? 'ring-2 ring-amber-400/60 bg-amber-50/30'
            : '';

    return (
      <AnimatePresence mode="popLayout" key={event.id}>
        <motion.div
          layout
          onClick={() => {
            if (!event.isTask && !completing && onEventClick) onEventClick(event);
          }}
          className={`ceramic-tile p-4 ${!event.isTask && onEventClick ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''} ${quadrantBorder && !completing ? `border-l-4 ${quadrantBorder}` : ''} ${stateClasses} ${
            completing ? 'border-l-4 border-ceramic-success bg-ceramic-success/5' : ''
          }`}
          initial={{ opacity: 0, x: -10 }}
          animate={completing ? {
            opacity: [1, 1, 0],
            scale: [1, 1.02, 0.95],
            transition: { duration: 1.4, times: [0, 0.6, 1] }
          } : {
            opacity: 1,
            x: 0
          }}
          transition={completing ? undefined : { delay: index * 0.05 }}
        >
          {/* Completion celebration overlay */}
          {completing && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-ceramic-success/30">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={celebrationSpring}
              >
                <div className="w-5 h-5 rounded-full bg-ceramic-success flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </motion.div>
              <span className="text-xs font-bold text-ceramic-success uppercase tracking-wide">
                Concluida
              </span>
            </div>
          )}

          {/* "Agora" highlight badge */}
          {!completing && event.isToday && isHappening && !event.skipped && !event.isCompleted && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-amber-300/40">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-xs font-black text-amber-600 uppercase tracking-wide">
                Acontecendo agora
              </span>
            </div>
          )}

          {/* Countdown Badge - Above main content */}
          {!completing && event.isToday && timeUntil && !event.skipped && !event.isCompleted && !isPast && !isHappening && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-ceramic-text-secondary/10">
              <Clock className="w-3.5 h-3.5 text-ceramic-accent animate-pulse" />
              <span className="text-xs font-black text-ceramic-accent uppercase tracking-wide">
                Falta {timeUntil}
              </span>
            </div>
          )}

          {/* Layout horizontal: Checkbox | Title (primary) | Time (secondary) | Action */}
          <div className="flex items-center gap-3">
            {/* Task completion checkbox - larger, more visible */}
            {event.isTask && onTaskComplete && !completing && (
              <motion.button
                onClick={() => onTaskComplete(event.id.replace('task-', ''))}
                className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                  event.isCompleted
                    ? 'bg-ceramic-accent border-ceramic-accent'
                    : 'border-ceramic-text-secondary/50 hover:border-ceramic-accent hover:bg-ceramic-accent/5'
                }`}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                title={event.isCompleted ? 'Concluida' : 'Marcar como concluida'}
              >
                {event.isCompleted && <Check className="w-4 h-4 text-white" />}
              </motion.button>
            )}

            {/* Title (primary) + checklist progress */}
            <div className="flex-1 min-w-0">
              <h4 className={`text-base font-semibold truncate ${
                completing
                  ? 'line-through text-ceramic-success/70'
                  : event.skipped || event.isCompleted
                    ? 'line-through text-ceramic-text-secondary'
                    : isPast && !event.isTask
                      ? 'text-ceramic-text-secondary'
                      : 'text-ceramic-text-primary'
              }`}>
                {event.title}
              </h4>
              {event.checklist && event.checklist.length > 0 && !completing && (
                <ChecklistProgressBar checklist={event.checklist} />
              )}
            </div>

            {/* Time (secondary anchor) */}
            <span className={`text-sm font-medium flex-shrink-0 tabular-nums ${
              completing
                ? 'text-ceramic-success/50'
                : isPast && !event.isTask ? 'text-ceramic-text-secondary/60' : 'text-ceramic-text-secondary'
            }`}>
              {formatTime(event.startTime)}
            </span>

            {/* "Encerrado" badge for past calendar events */}
            {!completing && isPast && !event.isTask && !event.skipped && (
              <span className="flex-shrink-0 text-[10px] font-bold text-ceramic-text-tertiary bg-ceramic-cool px-1.5 py-0.5 rounded">
                Encerrado
              </span>
            )}

            {/* Action Button - Compact (only for calendar events, not tasks) */}
            {!completing && !event.isTask && event.isToday && !isPast && !isHappening && (
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
                    title="Não vou"
                  >
                    <X className="w-4 h-4 text-ceramic-error" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Metadados secundarios - Location */}
          {event.location && !completing && (
            <div className="flex items-center gap-1.5 mt-2 ml-10">
              <MapPin className="w-3 h-3 text-ceramic-text-secondary/60 flex-shrink-0" />
              <span className="text-xs text-ceramic-text-secondary truncate">
                {event.location}
              </span>
            </div>
          )}

          {/* Skipped indicator */}
          {event.skipped && !completing && (
            <div className="flex items-center gap-1.5 mt-2 ml-10">
              <AlertCircle className="w-3 h-3 text-ceramic-error/60 flex-shrink-0" />
              <span className="text-xs text-ceramic-error font-medium">Não foi</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderDaySection = (
    dayLabel: string,
    dayEvents: EventWithCategory[],
    isToday: boolean = false,
    dayOffset: number = 0
  ) => {
    return (
      <div className="ceramic-tray p-5 mb-4">
        {/* Título "gravado" na borda superior da bandeja */}
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          forecast ? 'mb-1' : 'mb-4'
        } ${isToday ? 'text-ceramic-accent' : 'text-ceramic-text-secondary/70'}`}>
          {dayLabel}
        </h3>

        {/* Weather strip for this day */}
        <WeatherStrip variant="day" dayOffset={dayOffset} forecast={forecast} />

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

  // Sempre mostrar as secoes de dias (framework da página)
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
        {renderDaySection('Hoje', todayEvents, true, 0)}
      </motion.div>

      {/* Seção Amanha - index 1 */}
      <motion.div
        custom={1}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className={getDayOpacity(1)}
      >
        {renderDaySection('Amanha', tomorrowEvents, false, 1)}
      </motion.div>

      {/* Seção Depois de Amanha - index 2 */}
      <motion.div
        custom={2}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className={getDayOpacity(2)}
      >
        {renderDaySection(
          dayAfter.toLocaleDateString('pt-BR', { weekday: 'long' }),
          dayAfterEvents,
          false,
          2
        )}
      </motion.div>
    </div>
  );
};
