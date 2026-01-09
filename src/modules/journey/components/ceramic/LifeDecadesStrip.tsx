/**
 * LifeDecadesStrip Component
 * Timeline visualization showing life in 10-year stages/decades
 * Provides a better visual overview than weekly breakdown for long-term perspective
 */

import React, { useMemo, useState } from 'react';

interface LifeDecadesStripProps {
  birthDate: Date;
  expectedLifespan?: number; // in years, default 80
}

interface DecadeInfo {
  decadeNumber: number; // 1-8 for 80 years
  startYear: number; // e.g., 0, 10, 20...
  endYear: number; // e.g., 9, 19, 29...
  label: string; // e.g., "Years 1-10", "Years 11-20"
  isPast: boolean;
  isCurrent: boolean;
}

export const LifeDecadesStrip: React.FC<LifeDecadesStripProps> = ({
  birthDate,
  expectedLifespan = 80,
}) => {
  const [hoveredDecade, setHoveredDecade] = useState<DecadeInfo | null>(null);

  const { decades, currentAge } = useMemo(() => {
    const now = new Date();
    const ageMs = now.getTime() - birthDate.getTime();
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
    const currentAge = Math.floor(ageYears);

    // Generate decade blocks
    const numDecades = Math.ceil(expectedLifespan / 10);
    const decades: DecadeInfo[] = Array.from({ length: numDecades }, (_, index) => {
      const decadeNumber = index + 1;
      const startYear = index * 10;
      const endYear = startYear + 9;
      const currentDecade = Math.floor(currentAge / 10);

      return {
        decadeNumber,
        startYear,
        endYear,
        label: `Years ${startYear + 1}-${endYear + 1}`,
        isPast: decadeNumber - 1 < currentDecade,
        isCurrent: decadeNumber - 1 === currentDecade,
      };
    });

    return { decades, currentAge };
  }, [birthDate, expectedLifespan]);

  const getDecadeClasses = (decade: DecadeInfo): string => {
    const baseClasses = 'flex-1 aspect-square rounded-lg transition-all duration-300 flex items-center justify-center relative overflow-hidden';

    if (decade.isCurrent) {
      return `${baseClasses} ring-2 ring-amber-500 ring-offset-1 scale-105`;
    }

    if (decade.isPast) {
      return `${baseClasses} opacity-75`;
    }

    return baseClasses;
  };

  const getDecadeStyle = (decade: DecadeInfo): React.CSSProperties => {
    if (decade.isCurrent) {
      return {
        backgroundColor: '#FCD34D', // Amber
        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
      };
    }

    if (decade.isPast) {
      return {
        backgroundColor: '#5C554B', // Lead
        boxShadow: 'inset 1px 1px 3px rgba(92, 85, 75, 0.4)',
      };
    }

    // Future decades - empty/perforated
    return {
      backgroundColor: '#F0EFE9', // Light background
      border: '2px dashed #A39E91', // Taupe dashed
      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
    };
  };

  const getCurrentDecadeProgress = (): number => {
    const currentDecade = Math.floor(currentAge / 10);
    const yearInDecade = currentAge % 10;
    return (yearInDecade / 10) * 100;
  };

  return (
    <div className="w-full space-y-4">
      {/* Title and info */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#5C554B]">Meu Timeline de Vida</h3>
        <div className="text-sm text-[#948D82]">
          Age {currentAge} ({(currentAge / (Math.ceil(expectedLifespan / 10) * 10) * 100).toFixed(0)}% of expected lifespan)
        </div>
      </div>

      {/* Decades grid */}
      <div className="grid grid-cols-4 gap-3 md:grid-cols-5 lg:grid-cols-8 auto-rows-max">
        {decades.map((decade) => (
          <div
            key={decade.decadeNumber}
            className={getDecadeClasses(decade)}
            style={getDecadeStyle(decade)}
            onMouseEnter={() => setHoveredDecade(decade)}
            onMouseLeave={() => setHoveredDecade(null)}
            role="button"
            tabIndex={0}
            aria-label={decade.label}
          >
            {/* Current decade progress indicator */}
            {decade.isCurrent && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-amber-900 opacity-80">
                  {currentAge % 10 + 1}
                </div>
                <div className="text-xs text-amber-900/60 font-medium">
                  of 10
                </div>
              </div>
            )}

            {/* Decade number */}
            {!decade.isCurrent && (
              <div className={`text-sm font-semibold ${decade.isPast ? 'text-white/80' : 'text-[#8B8178]'}`}>
                {decade.decadeNumber}0s
              </div>
            )}

            {/* Tooltip on hover */}
            {hoveredDecade === decade && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="text-white font-bold text-sm">{decade.label}</div>
                  {decade.isCurrent && <div className="text-amber-200 text-xs mt-1">Current</div>}
                  {decade.isPast && <div className="text-green-200 text-xs mt-1">Completed</div>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#5C554B] font-medium">Life Progress</span>
          <span className="text-[#948D82]">{(currentAge / expectedLifespan * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-[#E8E5DF] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
            style={{ width: `${(currentAge / expectedLifespan) * 100}%` }}
          />
        </div>
      </div>

      {/* Memento Mori message */}
      <div className="mt-4 p-4 ceramic-card text-center">
        <p className="text-sm text-[#8B8178] italic">
          "Remembering that I'll be dead soon is the most important tool I've ever encountered to help me make the big choices in life."
        </p>
        <p className="text-xs text-[#948D82] mt-2">— Steve Jobs</p>
      </div>
    </div>
  );
};

export default LifeDecadesStrip;
