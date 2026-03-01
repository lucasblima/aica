import { useState } from 'react';
import { agendaDemo } from '../../data/demoData';

const DAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

// March 2026 starts on Sunday (day 0)
const MARCH_2026_START_DOW = 0; // Sunday
const MARCH_2026_DAYS = 31;

// Map day-of-week abbreviation to column index (0=Dom, 1=Seg, etc.)
const DAY_TO_COL: Record<string, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

// Map color hex to tailwind class
const COLOR_DOT_MAP: Record<string, string> = {
  '#f59e0b': 'bg-amber-500',
  '#ef4444': 'bg-red-500',
  '#3b82f6': 'bg-blue-500',
  '#10b981': 'bg-green-500',
  '#8b5cf6': 'bg-purple-500',
};

function getDotClass(color: string) {
  return COLOR_DOT_MAP[color] || 'bg-ceramic-text-secondary';
}

// Get recurring events for a given day-of-month
function getEventsForDay(dayOfMonth: number) {
  // Compute day-of-week for this date in March 2026
  const dow = (MARCH_2026_START_DOW + dayOfMonth - 1) % 7;
  const dayAbbrs = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const dayAbbr = dayAbbrs[dow];
  return agendaDemo.filter((e) => e.day === dayAbbr);
}

export function AgendaDemo() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Build calendar grid
  const cells: (number | null)[] = [];
  // Empty cells before month starts
  for (let i = 0; i < MARCH_2026_START_DOW; i++) {
    cells.push(null);
  }
  // Days of month
  for (let d = 1; d <= MARCH_2026_DAYS; d++) {
    cells.push(d);
  }
  // Pad to complete last row
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  // Split into weeks
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ceramic-text-primary text-center">
        Marco 2026
      </p>

      {/* Calendar header */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-ceramic-text-secondary"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="w-10 h-10" />;
          }

          const events = getEventsForDay(day);
          const hasEvents = events.length > 0;
          const isSelected = selectedDay === day;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (hasEvents) {
                  setSelectedDay(isSelected ? null : day);
                }
              }}
              className={`w-10 h-10 rounded-lg text-center flex flex-col items-center justify-center transition-all ${
                isSelected
                  ? 'bg-amber-100 ring-2 ring-amber-400'
                  : hasEvents
                    ? 'hover:bg-ceramic-cool/50 cursor-pointer'
                    : 'cursor-default'
              }`}
            >
              <span
                className={`text-xs ${
                  isSelected
                    ? 'font-bold text-amber-700'
                    : 'text-ceramic-text-primary'
                }`}
              >
                {day}
              </span>
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {events.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className={`w-1.5 h-1.5 rounded-full ${getDotClass(e.color)}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Event list */}
      {selectedDay && selectedEvents.length > 0 && (
        <div className="bg-ceramic-cool/30 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-medium text-ceramic-text-secondary">
            Dia {selectedDay}
          </p>
          {selectedEvents.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-1.5"
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${getDotClass(e.color)}`}
              />
              <span className="text-xs text-ceramic-text-primary flex-1">
                {e.title}
              </span>
              <span className="text-[10px] text-ceramic-text-secondary shrink-0">
                {e.time}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
