/**
 * CalendarView — Month calendar mode
 *
 * Renders CalendarGrid (MonthGrid) with month navigation,
 * date selection, and events for the selected day.
 */

import React, { useState } from 'react';
import { CalendarGrid } from '@/modules/agenda/components/calendar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export interface CalendarGridEvent {
  id: string;
  date: string;
  title: string;
  color: string;
  time?: string;
}

export interface CalendarViewProps {
  calendarGridEvents: CalendarGridEvent[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  calendarGridEvents,
}) => {
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  }));

  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 text-center text-ceramic-text-secondary">
          Erro ao carregar Calendario.{' '}
          <button
            onClick={() => window.location.reload()}
            className="underline text-amber-600"
          >
            Recarregar
          </button>
        </div>
      }
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setCalendarMonth((prev) =>
                prev.month === 1
                  ? { year: prev.year - 1, month: 12 }
                  : { ...prev, month: prev.month - 1 }
              );
              setCalendarSelectedDay(null);
            }}
            className="p-2 hover:bg-ceramic-cool rounded-lg text-ceramic-text-secondary"
          >
            &larr;
          </button>
          <h3 className="font-bold text-ceramic-text-primary capitalize">
            {new Date(calendarMonth.year, calendarMonth.month - 1).toLocaleDateString(
              'pt-BR',
              { month: 'long', year: 'numeric' }
            )}
          </h3>
          <button
            onClick={() => {
              setCalendarMonth((prev) =>
                prev.month === 12
                  ? { year: prev.year + 1, month: 1 }
                  : { ...prev, month: prev.month + 1 }
              );
              setCalendarSelectedDay(null);
            }}
            className="p-2 hover:bg-ceramic-cool rounded-lg text-ceramic-text-secondary"
          >
            &rarr;
          </button>
        </div>
        <CalendarGrid
          year={calendarMonth.year}
          month={calendarMonth.month}
          events={calendarGridEvents}
          selectedDay={calendarSelectedDay}
          onDayClick={(day) =>
            setCalendarSelectedDay(day === calendarSelectedDay ? null : day)
          }
        />
        {calendarSelectedDay && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">
              Eventos do dia {calendarSelectedDay}
            </h4>
            {calendarGridEvents
              .filter((e) => {
                const parts = e.date.split('-');
                return (
                  parseInt(parts[2], 10) === calendarSelectedDay &&
                  parseInt(parts[1], 10) === calendarMonth.month &&
                  parseInt(parts[0], 10) === calendarMonth.year
                );
              })
              .map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 p-3 bg-ceramic-base rounded-lg shadow-sm"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: e.color }}
                  />
                  <span className="text-sm text-ceramic-text-primary flex-1">
                    {e.title}
                  </span>
                  {e.time && (
                    <span className="text-xs text-ceramic-text-secondary">{e.time}</span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
