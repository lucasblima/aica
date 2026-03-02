import React, { useMemo } from 'react';

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  color: string;
  time?: string;
}

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  selectedDay?: number | null;
  onDayClick?: (day: number, events: CalendarEvent[]) => void;
  maxDots?: number;
  className?: string;
}

const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year, month, events, selectedDay = null, onDayClick, maxDots = 3, className = '',
}) => {
  const { daysInMonth, startDow, eventsByDay } = useMemo(() => {
    const dim = new Date(year, month, 0).getDate();
    const sdow = new Date(year, month - 1, 1).getDay();
    const ebd: Record<number, CalendarEvent[]> = {};
    events.forEach(e => {
      const parts = e.date.split('-');
      const eYear = parseInt(parts[0], 10);
      const eMonth = parseInt(parts[1], 10);
      const eDay = parseInt(parts[2], 10);
      if (eYear === year && eMonth === month) {
        if (!ebd[eDay]) ebd[eDay] = [];
        ebd[eDay].push(e);
      }
    });
    return { daysInMonth: dim, startDow: sdow, eventsByDay: ebd };
  }, [year, month, events]);

  return (
    <div className={className} role="grid" aria-label={`Calendar ${year}-${month}`}>
      <div className="grid grid-cols-7 mb-2">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-ceramic-text-secondary">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDow }, (_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayEvents = eventsByDay[day] || [];
          const hasEvents = dayEvents.length > 0;
          const isSelected = day === selectedDay;
          return (
            <div key={day} data-day={day} className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${isSelected ? 'bg-amber-100 ring-2 ring-amber-400' : ''} ${hasEvents && !isSelected ? 'hover:bg-ceramic-cool/50' : ''}`} onClick={() => hasEvents && onDayClick?.(day, dayEvents)} role="gridcell" aria-label={`${day}${hasEvents ? `, ${dayEvents.length} events` : ''}`}>
              <span className={`text-xs ${isSelected ? 'font-bold text-amber-700' : 'text-ceramic-text-primary'}`}>{day}</span>
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, maxDots).map(e => (
                    <div key={e.id} data-testid="event-dot" className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
