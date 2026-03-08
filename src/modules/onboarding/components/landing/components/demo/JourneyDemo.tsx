import { useState } from 'react';
import { journeyDemo } from '../../data/demoData';

const INTENSITY_COLORS: Record<number, string> = {
  0: 'bg-ceramic-cool/30',
  1: 'bg-amber-100',
  2: 'bg-amber-300',
  3: 'bg-amber-500',
};

export function JourneyDemo() {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const heatmap = journeyDemo.heatmap;
  const emotions = journeyDemo.emotions;

  // 4 weeks x 7 days
  const weeks: (typeof heatmap[number] | null)[][] = [];
  for (let w = 0; w < 4; w++) {
    const week: (typeof heatmap[number] | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      week.push(idx < heatmap.length ? heatmap[idx] : null);
    }
    weeks.push(week);
  }

  return (
    <div className="space-y-5">
      {/* Heatmap */}
      <div className="space-y-1.5">
        <p className="text-xs text-ceramic-text-secondary font-medium mb-2">
          Últimos 28 dias
        </p>
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex gap-1 justify-center">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="w-8 h-8" />;
                const isHovered = hoveredDay === day.day;
                return (
                  <div
                    key={di}
                    className="relative"
                    onMouseEnter={() => setHoveredDay(day.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <div
                      className={`w-8 h-8 rounded-md transition-transform ${
                        INTENSITY_COLORS[day.intensity]
                      } ${isHovered ? 'scale-125 ring-2 ring-amber-400' : ''}`}
                    />
                    {isHovered && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-ceramic-text-primary text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                        Dia {day.day} {day.emoji}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Emotion Summary */}
      <div>
        <p className="text-xs text-ceramic-text-secondary font-medium mb-2">
          Emoções do mês
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {emotions.map((e) => (
            <div key={e.emotion} className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: e.color }}
              >
                {e.count}
              </div>
              <span className="text-[10px] text-ceramic-text-secondary">
                {e.emotion}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
