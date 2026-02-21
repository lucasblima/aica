import React from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, Clock, ListChecks, MapPin } from 'lucide-react';

interface TimelineEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  type: 'event' | 'task';
  isCompleted?: boolean;
  color?: string;
  location?: string;
  checklist?: Array<{ text: string; done: boolean }> | null;
}

interface AgendaTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (eventId: string) => void;
  onTaskToggle?: (taskId: string) => void;
  onEventEdit?: (eventId: string) => void;
}

// Checklist progress bar component
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

export const AgendaTimeline: React.FC<AgendaTimelineProps> = ({
  events,
  onEventClick,
  onTaskToggle,
  onEventEdit
}) => {
  // Helper to check if event ID is from Google Calendar (not UUID format)
  const isGoogleCalendarEvent = (eventId: string): boolean => {
    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return !uuidPattern.test(eventId);
  };

  const handleEventAction = (item: TimelineEvent) => {
    if (item.type === 'task') {
      onTaskToggle?.(item.id);
    } else {
      // Event type
      if (isGoogleCalendarEvent(item.id)) {
        // Google Calendar event - open in new tab
        const googleCalendarUrl = `https://calendar.google.com/calendar/u/0/r/eventedit/${item.id}`;
        window.open(googleCalendarUrl, '_blank');
      } else {
        // Supabase event - call edit handler
        onEventEdit?.(item.id);
      }
    }
  };
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (start: string, end?: string) => {
    if (!end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return null;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
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

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 250,
        damping: 22
      }
    }
  };

  return (
    <motion.div
      className="relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Vertical timeline connector line */}
      {events.length > 1 && (
        <div
          className="absolute left-[13px] top-6 bottom-6 w-px"
          style={{
            background: 'linear-gradient(to bottom, var(--color-ceramic-border, #d4d0c8), transparent)'
          }}
        />
      )}

      <div className="space-y-3">
        {events.map((item, idx) => {
          const isTask = item.type === 'task';
          const duration = getDuration(item.startTime, item.endTime);
          const isLast = idx === events.length - 1;

          return (
            <motion.div
              key={item.id}
              variants={itemVariants}
              className="relative flex gap-3"
            >
              {/* Timeline dot column */}
              <div className="flex-shrink-0 flex flex-col items-center z-10 pt-4">
                {isTask ? (
                  <motion.button
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                      item.isCompleted
                        ? 'bg-ceramic-accent border-ceramic-accent'
                        : 'border-ceramic-text-secondary/50 hover:border-ceramic-accent bg-ceramic-base'
                    }`}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskToggle?.(item.id);
                    }}
                  >
                    {item.isCompleted && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </motion.button>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-ceramic-base border-2 border-ceramic-border flex items-center justify-center">
                    <Circle
                      className="w-3.5 h-3.5"
                      style={{ color: item.color || '#D97706' }}
                      fill={item.color || '#D97706'}
                    />
                  </div>
                )}
              </div>

              {/* Card content */}
              <motion.div
                onClick={() => handleEventAction(item)}
                className={`flex-1 ceramic-card p-4 rounded-2xl cursor-pointer hover:scale-[1.01] transition-transform ${
                  isTask && item.isCompleted ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title (primary) */}
                    <h4 className={`text-base font-semibold text-ceramic-text-primary truncate ${
                      isTask && item.isCompleted ? 'line-through text-ceramic-text-secondary' : ''
                    }`}>
                      {item.title}
                    </h4>

                    {/* Time + duration (secondary, below title) */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-ceramic-text-secondary/60" />
                      <span className="text-sm font-medium tabular-nums text-ceramic-text-secondary">
                        {formatTime(item.startTime)}
                        {duration && (
                          <span className="text-ceramic-text-secondary/50 font-normal"> &middot; {duration}</span>
                        )}
                      </span>
                    </div>

                    {/* Checklist progress bar */}
                    {item.checklist && item.checklist.length > 0 && (
                      <ChecklistProgressBar checklist={item.checklist} />
                    )}

                    {/* Location */}
                    {item.location && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-ceramic-text-secondary">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Color bar (events only) */}
                  {!isTask && (
                    <div
                      className="w-1 h-12 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color || '#D97706' }}
                    />
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
