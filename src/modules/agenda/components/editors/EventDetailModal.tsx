import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, FileText } from 'lucide-react';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    title: string;
    startTime: string;
    endTime?: string;
    description?: string;
    location?: string;
    color?: string;
    source?: string;
  } | null;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Hoje, ${time}`;

    const date = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    return `${date}, ${time}`;
  };

  const formatTimeRange = (start: string, end?: string) => {
    const startFormatted = formatDateTime(start);
    if (!end) return startFormatted;

    const endDate = new Date(end);
    if (isNaN(endDate.getTime())) return startFormatted;

    const endTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${startFormatted} - ${endTime}`;
  };

  return (
    <AnimatePresence>
      {isOpen && event && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[4px]"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-ceramic-base w-full max-w-md rounded-3xl shadow-2xl relative border border-ceramic-text-secondary/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
              <div className="flex items-center gap-3">
                <div className="ceramic-concave w-12 h-12 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-ceramic-text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ceramic-text-primary">
                    Detalhes do Evento
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Title */}
              <div className="flex items-start gap-3">
                {event.color && (
                  <div
                    className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: event.color }}
                  />
                )}
                <h3 className="text-xl font-bold text-ceramic-text-primary">
                  {event.title}
                </h3>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3 text-ceramic-text-secondary">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">
                  {formatTimeRange(event.startTime, event.endTime)}
                </span>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-3 text-ceramic-text-secondary">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{event.location}</span>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-ceramic-text-secondary">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium uppercase tracking-wide">Descrição</span>
                  </div>
                  <div className="bg-ceramic-cool/50 rounded-xl p-4">
                    <p className="text-sm text-ceramic-text-primary whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Source badge */}
              {event.source === 'google_calendar' && (
                <div className="flex items-center gap-2 pt-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ceramic-cool/60 text-xs text-ceramic-text-secondary">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    Google Calendar
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
