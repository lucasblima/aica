import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar, Clock, Users, MapPin } from 'lucide-react';

interface WeekEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  attendees?: string[];
  organizer?: string;
}

interface DaySchedule {
  date: Date;
  dayName: string;
  dayNumber: number;
  month: string;
  isToday: boolean;
  events: WeekEvent[];
}

interface WeeklyCalendarViewProps {
  events: WeekEvent[];
  onEventClick?: (eventId: string) => void;
  onDayClick?: (date: Date) => void;
  daysToShow?: number; // Quantos dias mostrar (padrão: 7)
  highlightMode?: boolean; // Modo destaque para primeiros 2 dias
}

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  events,
  onEventClick,
  onDayClick,
  daysToShow = 7,
  highlightMode = false
}) => {
  // Gerar próximos N dias
  const generateWeekSchedule = (): DaySchedule[] => {
    const today = new Date();
    const schedule: DaySchedule[] = [];

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split('T')[0];
      const dayEvents = events.filter(event =>
        event.startTime.startsWith(dateStr)
      ).sort((a, b) => a.startTime.localeCompare(b.startTime));

      schedule.push({
        date,
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'long' }), // long for highlight mode
        dayNumber: date.getDate(),
        month: date.toLocaleDateString('pt-BR', { month: 'long' }), // long for highlight mode
        isToday: i === 0,
        events: dayEvents
      });
    }

    return schedule;
  };

  const weekSchedule = generateWeekSchedule();

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const dayCardVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.div
      className="space-y-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {weekSchedule.map((day) => (
        <motion.div
          key={day.date.toISOString()}
          variants={dayCardVariants}
          onClick={() => onDayClick?.(day.date)}
          className={`ceramic-card p-5 rounded-2xl cursor-pointer hover:scale-[1.01] transition-transform ${
            day.isToday ? 'ring-2 ring-ceramic-accent/30' : ''
          }`}
        >
          {/* Day Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Date Badge */}
              <div className={`ceramic-concave w-14 h-14 flex flex-col items-center justify-center ${
                day.isToday ? 'ring-2 ring-ceramic-accent' : ''
              }`}>
                <span className="text-xs text-ceramic-text-secondary uppercase font-bold">
                  {day.dayName}
                </span>
                <span className={`text-xl font-black ${
                  day.isToday ? 'text-ceramic-accent' : 'text-ceramic-text-primary'
                }`}>
                  {day.dayNumber}
                </span>
              </div>

              {/* Day Info */}
              <div>
                <h3 className="text-base font-bold text-ceramic-text-primary capitalize">
                  {day.date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                </h3>
                <p className="text-xs text-ceramic-text-secondary">
                  {day.dayNumber} de {day.date.toLocaleDateString('pt-BR', { month: 'long' })}
                </p>
              </div>

              {/* Today Badge */}
              {day.isToday && (
                <div className="ceramic-card px-2 py-1 rounded-full">
                  <span className="text-xs font-bold text-ceramic-accent uppercase tracking-wider">
                    Hoje
                  </span>
                </div>
              )}
            </div>

            {/* Event Count */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-lg font-black text-ceramic-text-primary">
                  {day.events.length}
                </span>
                <p className="text-xs text-ceramic-text-secondary">
                  {day.events.length === 1 ? 'evento' : 'eventos'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-ceramic-text-secondary" />
            </div>
          </div>

          {/* Events List */}
          {day.events.length > 0 ? (
            <div className="space-y-2 ml-[68px]">
              {day.events.slice(0, 3).map((event) => (
                <motion.div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event.id);
                  }}
                  className="ceramic-tray p-3 rounded-xl hover:bg-ceramic-text-secondary/5 transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Time */}
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3 h-3 text-ceramic-text-secondary flex-shrink-0" />
                        <span className="text-xs font-bold text-ceramic-text-secondary">
                          {formatTime(event.startTime)}
                        </span>
                        <span className="text-xs text-ceramic-text-secondary/60">
                          {getDuration(event.startTime, event.endTime)}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-bold text-ceramic-text-primary truncate mb-1">
                        {event.title}
                      </h4>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-xs text-ceramic-text-secondary">
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{event.location}</span>
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{event.attendees.length}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Color Indicator */}
                    <div className="w-1 h-12 rounded-full bg-ceramic-accent flex-shrink-0" />
                  </div>
                </motion.div>
              ))}

              {/* More Events Indicator */}
              {day.events.length > 3 && (
                <div className="text-xs text-ceramic-text-secondary/60 text-center py-1">
                  +{day.events.length - 3} {day.events.length - 3 === 1 ? 'evento' : 'eventos'}
                </div>
              )}
            </div>
          ) : (
            <div className="ml-[68px] ceramic-inset p-3 rounded-xl text-center">
              <p className="text-xs text-ceramic-text-secondary/60 italic">
                Sem eventos agendados
              </p>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};
