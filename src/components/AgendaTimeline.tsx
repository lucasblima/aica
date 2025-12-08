import React from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, Clock, MapPin } from 'lucide-react';

interface TimelineEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  type: 'event' | 'task';
  isCompleted?: boolean;
  color?: string;
  location?: string;
}

interface AgendaTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (eventId: string) => void;
  onTaskToggle?: (taskId: string) => void;
}

export const AgendaTimeline: React.FC<AgendaTimelineProps> = ({
  events,
  onEventClick,
  onTaskToggle
}) => {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (start: string, end?: string) => {
    if (!end) return null;
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
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
        type: "spring",
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
      {events.map((item) => {
        const isTask = item.type === 'task';
        const duration = getDuration(item.startTime, item.endTime);

        return (
          <motion.div
            key={item.id}
            variants={itemVariants}
            onClick={() => {
              if (isTask) {
                onTaskToggle?.(item.id);
              } else {
                onEventClick?.(item.id);
              }
            }}
            className={`ceramic-card p-4 rounded-2xl cursor-pointer hover:scale-[1.01] transition-transform ${
              isTask && item.isCompleted ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Timeline Indicator */}
              <div className="flex-shrink-0">
                {isTask ? (
                  <motion.button
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      item.isCompleted
                        ? 'bg-ceramic-accent border-ceramic-accent'
                        : 'border-ceramic-text-secondary/30 hover:border-ceramic-accent'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item.isCompleted && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </motion.button>
                ) : (
                  <div className="ceramic-concave w-6 h-6 flex items-center justify-center">
                    <Circle
                      className="w-3 h-3"
                      style={{ color: item.color || '#D97706' }}
                      fill={item.color || '#D97706'}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Horário */}
                <div className="text-sm font-bold text-ceramic-text-secondary mb-1">
                  {formatTime(item.startTime)}
                  {duration && ` • ${duration}`}
                </div>

                {/* Título */}
                <h4 className={`text-base font-bold text-ceramic-text-primary truncate ${
                  isTask && item.isCompleted ? 'line-through' : ''
                }`}>
                  {item.title}
                </h4>

                {/* Local (se houver) */}
                {item.location && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-ceramic-text-secondary">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{item.location}</span>
                  </div>
                )}
              </div>

              {/* Barra lateral de cor (apenas para eventos) */}
              {!isTask && (
                <div
                  className="w-1 h-12 rounded-full"
                  style={{ backgroundColor: item.color || '#D97706' }}
                />
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
