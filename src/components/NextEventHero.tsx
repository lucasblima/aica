import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, ArrowRight, ExternalLink, ChevronDown, ChevronUp, User } from 'lucide-react';

interface NextEventData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  attendees?: string[];
  organizer?: string;
  isNow?: boolean;
}

interface NextEventHeroProps {
  event?: NextEventData;
  onEventClick?: (eventId: string) => void;
}

export const NextEventHero: React.FC<NextEventHeroProps> = ({
  event,
  onEventClick
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeUntil, setTimeUntil] = useState<string>('');

  // Countdown timer
  useEffect(() => {
    if (!event || event.isNow) return;

    const updateCountdown = () => {
      const now = new Date();
      const start = new Date(event.startTime);
      const diffMs = start.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeUntil('Começando agora');
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeUntil(`Começa em ${hours}h ${minutes}min`);
      } else {
        setTimeUntil(`Começa em ${minutes}min`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [event]);

  // Se não há evento próximo
  if (!event) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ceramic-tray p-8 rounded-[32px] text-center"
      >
        <div className="ceramic-concave w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-ceramic-text-secondary/50" />
        </div>
        <p className="text-lg font-bold text-ceramic-text-primary mb-1">
          Agenda livre
        </p>
        <p className="text-sm text-ceramic-text-secondary">
          Nenhum compromisso nas próximas horas
        </p>
      </motion.div>
    );
  }

  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = () => {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Extract meeting link from description
  const getMeetingLink = () => {
    if (!event.description) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = event.description.match(urlRegex);
    return urls?.find(url =>
      url.includes('meet.google.com') ||
      url.includes('zoom.us') ||
      url.includes('teams.microsoft.com')
    );
  };

  const meetingLink = getMeetingLink();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={`ceramic-card p-6 rounded-[32px] transition-all ${
        event.isNow ? 'ring-4 ring-ceramic-accent/30 border-l-8 border-ceramic-accent' : ''
      }`}
    >
      {/* Indicador "Agora" ou Countdown - DESTAQUE */}
      {event.isNow ? (
        <div className="ceramic-tray p-4 rounded-2xl mb-4 flex items-center justify-center gap-3">
          <div className="w-3 h-3 bg-ceramic-accent rounded-full animate-ping" />
          <span className="text-lg font-black text-ceramic-accent uppercase tracking-wider text-etched">
            Acontecendo agora
          </span>
        </div>
      ) : timeUntil ? (
        <div className="ceramic-tray p-4 rounded-2xl mb-4 text-center bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-ceramic-accent animate-pulse" />
            <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Próximo
            </span>
          </div>
          <span className="text-2xl font-black text-ceramic-accent text-etched block">
            {timeUntil}
          </span>
        </div>
      ) : null}

      {/* Organizer Badge */}
      {event.organizer && (
        <div className="flex items-center gap-2 mb-4">
          <div className="ceramic-concave w-6 h-6 flex items-center justify-center">
            <User className="w-3 h-3 text-ceramic-text-secondary" />
          </div>
          <span className="text-xs text-ceramic-text-secondary truncate max-w-[200px]">
            {event.organizer.split('@')[0]}
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Horário */}
          <div className="text-3xl font-black text-ceramic-text-primary text-etched mb-1">
            {formatTime(startDate)}
          </div>

          {/* Título */}
          <h3 className="text-xl font-bold text-ceramic-text-primary mb-3">
            {event.title}
          </h3>

          {/* Metadados */}
          <div className="flex flex-wrap gap-4 text-sm text-ceramic-text-secondary mb-3">
            {/* Duração */}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{getDuration()}</span>
            </div>

            {/* Local */}
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{event.location}</span>
              </div>
            )}

            {/* Participantes */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>
                  {event.attendees.length === 1
                    ? event.attendees[0].split('@')[0]
                    : `${event.attendees.length} pessoas`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Description (expandable) */}
          {event.description && (
            <AnimatePresence>
              <motion.div
                className="mb-3"
                initial={false}
              >
                <p className={`text-sm text-ceramic-text-secondary ${
                  isExpanded ? '' : 'line-clamp-2'
                }`}>
                  {event.description.replace(/(<([^>]+)>)/gi, '')} {/* Strip HTML */}
                </p>
                {event.description.length > 100 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="text-xs text-ceramic-accent hover:underline mt-1 flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        Ver menos <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        Ver mais <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {meetingLink && (
              <motion.a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ceramic-card px-4 py-2 rounded-full text-sm font-bold text-ceramic-accent hover:scale-[1.02] transition-transform inline-flex items-center gap-2"
                whileTap={{ scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
              >
                Entrar na reunião
                <ExternalLink className="w-3 h-3" />
              </motion.a>
            )}

            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onEventClick?.(event.id);
              }}
              className="ceramic-inset px-4 py-2 rounded-full text-sm font-medium text-ceramic-text-primary hover:text-ceramic-accent transition-colors inline-flex items-center gap-2"
              whileTap={{ scale: 0.98 }}
            >
              Ver detalhes
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
