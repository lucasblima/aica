import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';

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

  const [focusedDay, setFocusedDay] = useState<number>(() => selectedDay ?? 1);
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);

  // Reset focusedDay when month/year changes or selectedDay changes externally
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (selectedDay != null && selectedDay >= 1 && selectedDay <= daysInMonth) {
      setFocusedDay(selectedDay);
    } else {
      setFocusedDay(prev => Math.min(prev, daysInMonth));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedDay, daysInMonth]);

  const setCellRef = useCallback((day: number, el: HTMLDivElement | null) => {
    if (el) {
      cellRefs.current.set(day, el);
    } else {
      cellRefs.current.delete(day);
    }
  }, []);

  const focusDay = useCallback((day: number) => {
    const clamped = Math.max(1, Math.min(day, daysInMonth));
    setFocusedDay(clamped);
    cellRefs.current.get(clamped)?.focus();
  }, [daysInMonth]);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    let nextDay = focusedDay;

    switch (e.key) {
      case 'ArrowRight':
        nextDay = focusedDay < daysInMonth ? focusedDay + 1 : focusedDay;
        break;
      case 'ArrowLeft':
        nextDay = focusedDay > 1 ? focusedDay - 1 : focusedDay;
        break;
      case 'ArrowDown':
        nextDay = focusedDay + 7 <= daysInMonth ? focusedDay + 7 : focusedDay;
        break;
      case 'ArrowUp':
        nextDay = focusedDay - 7 >= 1 ? focusedDay - 7 : focusedDay;
        break;
      case 'Home':
        nextDay = 1;
        break;
      case 'End':
        nextDay = daysInMonth;
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const dayEvents = eventsByDay[focusedDay] || [];
        if (dayEvents.length > 0) {
          onDayClick?.(focusedDay, dayEvents);
        }
        return;
      }
      default:
        return;
    }

    e.preventDefault();
    if (nextDay !== focusedDay) {
      focusDay(nextDay);
    }
  }, [focusedDay, daysInMonth, eventsByDay, onDayClick, focusDay]);

  const handleGridFocus = useCallback(() => {
    // When the grid container receives focus, move focus to the focused day cell
    const target = selectedDay ?? focusedDay;
    const clamped = Math.max(1, Math.min(target, daysInMonth));
    setFocusedDay(clamped);
    cellRefs.current.get(clamped)?.focus();
  }, [selectedDay, focusedDay, daysInMonth]);

  const gridId = `calendar-grid-${year}-${month}`;
  const activeCellId = `${gridId}-day-${focusedDay}`;

  return (
    <div className={className} role="grid" aria-label={`Calendar ${year}-${month}`}>
      <div role="row" className="grid grid-cols-7 mb-2">
        {DOW_LABELS.map(d => (
          <div key={d} role="columnheader" className="text-center text-[10px] font-medium text-ceramic-text-secondary">{d}</div>
        ))}
      </div>
      <div
        ref={gridRef}
        className="grid grid-cols-7 gap-1"
        tabIndex={0}
        aria-activedescendant={activeCellId}
        onKeyDown={handleGridKeyDown}
        onFocus={(e) => {
          // Only handle focus on the container itself, not bubbled from children
          if (e.target === gridRef.current) {
            handleGridFocus();
          }
        }}
      >
        {Array.from({ length: startDow }, (_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayEvents = eventsByDay[day] || [];
          const hasEvents = dayEvents.length > 0;
          const isSelected = day === selectedDay;
          const isFocused = day === focusedDay;
          return (
            <div
              key={day}
              id={`${gridId}-day-${day}`}
              ref={(el) => setCellRef(day, el)}
              data-day={day}
              tabIndex={-1}
              role="gridcell"
              aria-selected={isSelected || undefined}
              aria-label={`${day}${hasEvents ? `, ${dayEvents.length} events` : ''}`}
              className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${isSelected ? 'bg-amber-100 ring-2 ring-amber-400' : ''} ${isFocused && !isSelected ? 'ring-2 ring-ceramic-info/50' : ''} ${hasEvents && !isSelected ? 'hover:bg-ceramic-cool/50' : ''} focus:outline-none focus:ring-2 focus:ring-ceramic-info`}
              onClick={() => hasEvents && onDayClick?.(day, dayEvents)}
            >
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
