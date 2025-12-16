import React, { useMemo, useState } from 'react';

interface LifeWeeksStripProps {
  birthDate: Date;
  expectedLifespan?: number; // in years, default 80
  currentWeek?: number; // override for current week highlight
}

interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  isPast: boolean;
  isCurrent: boolean;
}

export const LifeWeeksStrip: React.FC<LifeWeeksStripProps> = ({
  birthDate,
  expectedLifespan = 80,
  currentWeek,
}) => {
  const [hoveredWeek, setHoveredWeek] = useState<WeekInfo | null>(null);

  const { weeks, totalWeeks, weeksLived } = useMemo(() => {
    const now = new Date();
    const totalWeeks = expectedLifespan * 52;

    // Calculate weeks lived
    const timeDiff = now.getTime() - birthDate.getTime();
    const weeksLived = Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000));

    // Calculate current week (this year only - 52 weeks)
    const currentWeekNumber = currentWeek ?? (weeksLived % 52);

    // Generate week data for one year (52 weeks)
    const weeks: WeekInfo[] = Array.from({ length: 52 }, (_, index) => {
      const weekNumber = index + 1;

      // Calculate start date for this week (based on current year position)
      const currentYearStart = new Date(now.getFullYear(), 0, 1);
      const weekStartDate = new Date(currentYearStart);
      weekStartDate.setDate(currentYearStart.getDate() + (index * 7));

      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);

      return {
        weekNumber,
        startDate: weekStartDate,
        endDate: weekEndDate,
        isPast: weekNumber < currentWeekNumber,
        isCurrent: weekNumber === currentWeekNumber,
      };
    });

    return { weeks, totalWeeks, weeksLived };
  }, [birthDate, expectedLifespan, currentWeek]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getWeekDotClasses = (week: WeekInfo): string => {
    const baseClasses = 'rounded-full transition-all duration-200';

    if (week.isCurrent) {
      return `${baseClasses} w-2 h-2 notification-pulse`;
    }

    return `${baseClasses} w-1.5 h-1.5`;
  };

  const getWeekDotStyle = (week: WeekInfo): React.CSSProperties => {
    if (week.isCurrent) {
      return {
        backgroundColor: '#D97706', // Amber
      };
    }

    if (week.isPast) {
      return {
        backgroundColor: '#5C554B', // Lead
        opacity: 0.6,
        boxShadow: 'inset 1px 1px 2px rgba(92, 85, 75, 0.4)',
      };
    }

    // Future weeks - empty perforations
    return {
      backgroundColor: 'transparent',
      border: '1px solid #A39E91', // Taupe
    };
  };

  return (
    <div className="relative w-full">
      {/* Container with ceramic tray styling */}
      <div className="ceramic-tray p-3 overflow-x-auto no-scrollbar">
        {/* Weeks strip */}
        <div className="flex items-center gap-[2px] min-w-max">
          {weeks.map((week) => (
            <div
              key={week.weekNumber}
              className={getWeekDotClasses(week)}
              style={getWeekDotStyle(week)}
              onMouseEnter={() => setHoveredWeek(week)}
              onMouseLeave={() => setHoveredWeek(null)}
              role="button"
              tabIndex={0}
              aria-label={`Week ${week.weekNumber}: ${formatDate(week.startDate)} - ${formatDate(week.endDate)}`}
            />
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredWeek && (
        <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 z-10">
          <div className="ceramic-card px-4 py-2 whitespace-nowrap">
            <div className="text-xs font-semibold text-etched">
              Week {hoveredWeek.weekNumber}
            </div>
            <div className="text-xs text-[#8B8178] mt-1">
              {formatDate(hoveredWeek.startDate)} - {formatDate(hoveredWeek.endDate)}
            </div>
            {hoveredWeek.isCurrent && (
              <div className="text-xs font-bold text-[#D97706] mt-1">
                Current Week
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LifeWeeksStrip;
