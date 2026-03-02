# Landing-to-App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract 8 reusable visualization components from landing page demos, then integrate them into each AICA module to match the landing page's visual promise.

**Architecture:** Shared visualization library in `src/components/features/visualizations/` with data-agnostic, Ceramic-tokenized components. Each module PR wires real Supabase data to these components. No external chart libraries — pure Tailwind CSS + SVG.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (Ceramic tokens), SVG, Vitest + React Testing Library

---

## Critical Context (discovered during exploration)

- **AgendaView.tsx** (`src/views/AgendaView.tsx`, 1064 lines) IS the Atlas+Agenda combined view. It already has `matrixTasks` state with 4 quadrants and DnD, but no 'matrix' mode in the toggle. The gap for Atlas is adding this mode, not creating a new page.
- **AgendaModeToggle** has 3 modes: `'agenda' | 'list' | 'kanban'`. Adding `'matrix'` and `'calendar'` modes is the real work.
- All modules except Atlas/Agenda already have full production views.
- Test pattern: Vitest + React Testing Library (`describe/it/expect`, `vi.fn()`, `render/screen/fireEvent`).
- Barrel exports go in `src/components/features/index.ts` (already has 80+ exports).

---

## Task 1: Create `CircularScore` component

**Files:**
- Create: `src/components/features/visualizations/CircularScore.tsx`
- Test: `src/components/features/visualizations/__tests__/CircularScore.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/features/visualizations/__tests__/CircularScore.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularScore } from '../CircularScore';

describe('CircularScore', () => {
  it('renders the score value', () => {
    render(<CircularScore score={87} maxScore={100} label="Match" />);
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<CircularScore score={87} maxScore={100} label="Match" />);
    expect(screen.getByText('Match')).toBeInTheDocument();
  });

  it('renders SVG circle elements', () => {
    const { container } = render(<CircularScore score={87} maxScore={100} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2); // background + progress
  });

  it('applies correct stroke-dashoffset for score', () => {
    const { container } = render(<CircularScore score={50} maxScore={100} />);
    const progressCircle = container.querySelectorAll('circle')[1];
    // radius=40, circumference = 2 * PI * 40 ≈ 251.33
    // offset = circumference * (1 - 50/100) ≈ 125.66
    const offset = parseFloat(progressCircle.getAttribute('stroke-dashoffset') || '0');
    expect(offset).toBeCloseTo(125.66, 0);
  });

  it('accepts custom size', () => {
    const { container } = render(<CircularScore score={87} maxScore={100} size={120} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '120');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/visualizations/__tests__/CircularScore.test.tsx`
Expected: FAIL — module not found

**Step 3: Write implementation**

```tsx
// src/components/features/visualizations/CircularScore.tsx
import React from 'react';

interface CircularScoreProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  trackColor?: string;
  progressColor?: string;
}

export const CircularScore: React.FC<CircularScoreProps> = ({
  score,
  maxScore = 100,
  size = 96,
  strokeWidth = 8,
  label,
  className = '',
  trackColor = '#e5e7eb',
  progressColor = '#f59e0b',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(score / maxScore, 1);
  const offset = circumference * (1 - percentage);

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-label={`${Math.round(percentage * 100)}% ${label || 'score'}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ width: size, height: size, position: 'relative', marginTop: -size }}>
        <span className="text-lg font-bold text-ceramic-text-primary">
          {Math.round(percentage * 100)}%
        </span>
      </div>
      {label && (
        <span className="text-xs font-medium text-ceramic-text-secondary">{label}</span>
      )}
    </div>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/features/visualizations/__tests__/CircularScore.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/features/visualizations/CircularScore.tsx src/components/features/visualizations/__tests__/CircularScore.test.tsx
git commit -m "feat(visualizations): add CircularScore component

Extracted from GrantsDemo — SVG circular progress indicator.
Supports custom size, colors, label, and animated transitions.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create `HeatmapGrid` component

**Files:**
- Create: `src/components/features/visualizations/HeatmapGrid.tsx`
- Test: `src/components/features/visualizations/__tests__/HeatmapGrid.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/features/visualizations/__tests__/HeatmapGrid.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeatmapGrid } from '../HeatmapGrid';

const mockDays = Array.from({ length: 28 }, (_, i) => ({
  date: `2026-03-${String(i + 1).padStart(2, '0')}`,
  intensity: (i % 4) as 0 | 1 | 2 | 3,
  label: `Day ${i + 1}`,
}));

describe('HeatmapGrid', () => {
  it('renders 28 day cells', () => {
    const { container } = render(<HeatmapGrid days={mockDays} />);
    const cells = container.querySelectorAll('[data-testid^="heatmap-cell-"]');
    expect(cells.length).toBe(28);
  });

  it('calls onDayHover with day data', () => {
    const onHover = vi.fn();
    const { container } = render(<HeatmapGrid days={mockDays} onDayHover={onHover} />);
    const firstCell = container.querySelector('[data-testid="heatmap-cell-0"]')!;
    fireEvent.mouseEnter(firstCell);
    expect(onHover).toHaveBeenCalledWith(mockDays[0]);
  });

  it('applies intensity-based colors', () => {
    const { container } = render(
      <HeatmapGrid
        days={[{ date: '2026-03-01', intensity: 0, label: 'none' }]}
        intensityColors={['#ccc', '#fde68a', '#fbbf24', '#f59e0b']}
      />
    );
    const cell = container.querySelector('[data-testid="heatmap-cell-0"]');
    expect(cell).toHaveStyle({ backgroundColor: '#ccc' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/visualizations/__tests__/HeatmapGrid.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```tsx
// src/components/features/visualizations/HeatmapGrid.tsx
import React, { useState } from 'react';

export interface HeatmapDay {
  date: string;
  intensity: number; // 0-3
  label?: string;
  emoji?: string;
}

interface HeatmapGridProps {
  days: HeatmapDay[];
  intensityColors?: string[];
  columns?: number;
  cellSize?: number;
  gap?: number;
  onDayHover?: (day: HeatmapDay) => void;
  onDayClick?: (day: HeatmapDay) => void;
  className?: string;
}

const DEFAULT_COLORS = ['#E0DDD5', '#fde68a', '#fbbf24', '#f59e0b'];

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  days,
  intensityColors = DEFAULT_COLORS,
  columns = 7,
  cellSize = 8,
  gap = 2,
  onDayHover,
  onDayClick,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={`inline-grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, ${cellSize}px)`,
        gap: `${gap}px`,
      }}
      role="grid"
      aria-label="Activity heatmap"
    >
      {days.map((day, i) => {
        const color = intensityColors[Math.min(day.intensity, intensityColors.length - 1)] || intensityColors[0];
        return (
          <div
            key={day.date}
            data-testid={`heatmap-cell-${i}`}
            className="rounded-sm cursor-pointer transition-transform hover:scale-125"
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: color,
            }}
            role="gridcell"
            aria-label={day.label || day.date}
            onMouseEnter={() => {
              setHoveredIndex(i);
              onDayHover?.(day);
            }}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => onDayClick?.(day)}
          />
        );
      })}
    </div>
  );
};
```

**Step 4: Run test**

Run: `npx vitest run src/components/features/visualizations/__tests__/HeatmapGrid.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/features/visualizations/HeatmapGrid.tsx src/components/features/visualizations/__tests__/HeatmapGrid.test.tsx
git commit -m "feat(visualizations): add HeatmapGrid component

GitHub-style heatmap grid extracted from JourneyDemo.
Configurable columns, cell size, intensity colors, hover/click callbacks.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create `CalendarGrid` component

**Files:**
- Create: `src/components/features/visualizations/CalendarGrid.tsx`
- Test: `src/components/features/visualizations/__tests__/CalendarGrid.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/features/visualizations/__tests__/CalendarGrid.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarGrid } from '../CalendarGrid';

const mockEvents = [
  { id: '1', date: '2026-03-05', title: 'Meeting', color: '#f59e0b' },
  { id: '2', date: '2026-03-05', title: 'Lunch', color: '#3b82f6' },
  { id: '3', date: '2026-03-12', title: 'Deadline', color: '#ef4444' },
];

describe('CalendarGrid', () => {
  it('renders day-of-week headers', () => {
    render(<CalendarGrid year={2026} month={3} events={mockEvents} />);
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Sab')).toBeInTheDocument();
  });

  it('renders correct number of days for March 2026', () => {
    render(<CalendarGrid year={2026} month={3} events={mockEvents} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('shows event dots on days with events', () => {
    const { container } = render(<CalendarGrid year={2026} month={3} events={mockEvents} />);
    // Day 5 should have 2 dots
    const day5Dots = container.querySelectorAll('[data-day="5"] [data-testid="event-dot"]');
    expect(day5Dots.length).toBe(2);
  });

  it('calls onDayClick when a day is clicked', () => {
    const onClick = vi.fn();
    render(<CalendarGrid year={2026} month={3} events={mockEvents} onDayClick={onClick} />);
    fireEvent.click(screen.getByText('5'));
    expect(onClick).toHaveBeenCalledWith(5, expect.arrayContaining([
      expect.objectContaining({ title: 'Meeting' }),
    ]));
  });

  it('highlights selected day', () => {
    const { container } = render(
      <CalendarGrid year={2026} month={3} events={mockEvents} selectedDay={5} />
    );
    const selectedCell = container.querySelector('[data-day="5"]');
    expect(selectedCell?.className).toContain('ring-amber-400');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/visualizations/__tests__/CalendarGrid.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```tsx
// src/components/features/visualizations/CalendarGrid.tsx
import React, { useMemo } from 'react';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  color: string;
  time?: string;
}

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  events: CalendarEvent[];
  selectedDay?: number | null;
  onDayClick?: (day: number, events: CalendarEvent[]) => void;
  maxDots?: number;
  className?: string;
}

const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  events,
  selectedDay = null,
  onDayClick,
  maxDots = 3,
  className = '',
}) => {
  const { daysInMonth, startDow, eventsByDay } = useMemo(() => {
    const dim = new Date(year, month, 0).getDate();
    const sdow = new Date(year, month - 1, 1).getDay();
    const ebd: Record<number, CalendarEvent[]> = {};
    events.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const day = d.getDate();
        if (!ebd[day]) ebd[day] = [];
        ebd[day].push(e);
      }
    });
    return { daysInMonth: dim, startDow: sdow, eventsByDay: ebd };
  }, [year, month, events]);

  const blanks = Array.from({ length: startDow }, (_, i) => i);

  return (
    <div className={className} role="grid" aria-label={`Calendar ${year}-${month}`}>
      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-2">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-ceramic-text-secondary">
            {d}
          </div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {blanks.map(i => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayEvents = eventsByDay[day] || [];
          const hasEvents = dayEvents.length > 0;
          const isSelected = day === selectedDay;

          return (
            <div
              key={day}
              data-day={day}
              className={`
                w-10 h-10 flex flex-col items-center justify-center rounded-lg
                transition-colors cursor-pointer
                ${isSelected ? 'bg-amber-100 ring-2 ring-amber-400' : ''}
                ${hasEvents && !isSelected ? 'hover:bg-ceramic-cool/50' : ''}
              `}
              onClick={() => hasEvents && onDayClick?.(day, dayEvents)}
              role="gridcell"
              aria-label={`${day}${hasEvents ? `, ${dayEvents.length} events` : ''}`}
            >
              <span className={`text-xs ${isSelected ? 'font-bold text-amber-700' : 'text-ceramic-text-primary'}`}>
                {day}
              </span>
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, maxDots).map((e, j) => (
                    <div
                      key={e.id}
                      data-testid="event-dot"
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: e.color }}
                    />
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
```

**Step 4: Run test**

Run: `npx vitest run src/components/features/visualizations/__tests__/CalendarGrid.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/features/visualizations/CalendarGrid.tsx src/components/features/visualizations/__tests__/CalendarGrid.test.tsx
git commit -m "feat(visualizations): add CalendarGrid component

Monthly calendar grid extracted from AgendaDemo.
Dynamic month/year, event dots, day selection, DOW headers.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Create `HorizontalTimeline` component

**Files:**
- Create: `src/components/features/visualizations/HorizontalTimeline.tsx`
- Test: `src/components/features/visualizations/__tests__/HorizontalTimeline.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/features/visualizations/__tests__/HorizontalTimeline.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HorizontalTimeline } from '../HorizontalTimeline';

const mockPhases = [
  { id: 'research', label: 'Pesquisa', status: 'completed' as const, icon: '🔍' },
  { id: 'script', label: 'Pauta', status: 'completed' as const, icon: '📝' },
  { id: 'record', label: 'Gravação', status: 'active' as const, icon: '🎙️' },
  { id: 'edit', label: 'Edição', status: 'pending' as const, icon: '✂️' },
  { id: 'publish', label: 'Publicação', status: 'pending' as const, icon: '📡' },
];

describe('HorizontalTimeline', () => {
  it('renders all phase labels', () => {
    render(<HorizontalTimeline phases={mockPhases} />);
    expect(screen.getByText('Pesquisa')).toBeInTheDocument();
    expect(screen.getByText('Publicação')).toBeInTheDocument();
  });

  it('renders phase icons', () => {
    render(<HorizontalTimeline phases={mockPhases} />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('🎙️')).toBeInTheDocument();
  });

  it('calls onPhaseClick when a phase is clicked', () => {
    const onClick = vi.fn();
    render(<HorizontalTimeline phases={mockPhases} onPhaseClick={onClick} />);
    fireEvent.click(screen.getByText('🎙️'));
    expect(onClick).toHaveBeenCalledWith('record');
  });

  it('shows detail panel when selectedId matches', () => {
    render(<HorizontalTimeline phases={mockPhases} selectedId="record" />);
    expect(screen.getByText(/em andamento/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/visualizations/__tests__/HorizontalTimeline.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```tsx
// src/components/features/visualizations/HorizontalTimeline.tsx
import React from 'react';

export interface TimelinePhase {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'pending';
  icon: string;
}

interface HorizontalTimelineProps {
  phases: TimelinePhase[];
  selectedId?: string | null;
  onPhaseClick?: (id: string) => void;
  className?: string;
}

const STATUS_STYLES = {
  completed: {
    circle: 'bg-ceramic-success text-white',
    line: 'bg-ceramic-success',
    label: 'text-ceramic-text-secondary',
    detail: 'Concluído',
  },
  active: {
    circle: 'bg-amber-500 text-white ring-4 ring-amber-200',
    line: 'bg-ceramic-border',
    label: 'font-bold text-ceramic-text-primary',
    detail: 'Em andamento',
  },
  pending: {
    circle: 'bg-ceramic-cool text-ceramic-text-secondary',
    line: 'bg-ceramic-border',
    label: 'text-ceramic-text-secondary',
    detail: 'Pendente',
  },
};

export const HorizontalTimeline: React.FC<HorizontalTimelineProps> = ({
  phases,
  selectedId = null,
  onPhaseClick,
  className = '',
}) => {
  const selectedPhase = phases.find(p => p.id === selectedId);

  return (
    <div className={className}>
      <div className="flex items-center justify-center">
        {phases.map((phase, i) => {
          const styles = STATUS_STYLES[phase.status];
          return (
            <React.Fragment key={phase.id}>
              <div className="flex flex-col items-center gap-1">
                <button
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                    transition-transform hover:scale-110 ${styles.circle}`}
                  onClick={() => onPhaseClick?.(phase.id)}
                  aria-label={`${phase.label}: ${styles.detail}`}
                >
                  {phase.icon}
                </button>
                <span className={`text-[10px] ${styles.label}`}>{phase.label}</span>
              </div>
              {i < phases.length - 1 && (
                <div className={`w-6 md:w-10 h-0.5 ${
                  phases[i + 1].status === 'completed' || phase.status === 'completed'
                    ? 'bg-ceramic-success'
                    : 'bg-ceramic-border'
                } mx-1`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {selectedPhase && (
        <div className="mt-3 text-center text-sm text-ceramic-text-secondary">
          <span className="font-medium">{selectedPhase.label}</span>
          {' — '}
          {STATUS_STYLES[selectedPhase.status].detail}
        </div>
      )}
    </div>
  );
};
```

**Step 4: Run test**

Run: `npx vitest run src/components/features/visualizations/__tests__/HorizontalTimeline.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/features/visualizations/HorizontalTimeline.tsx src/components/features/visualizations/__tests__/HorizontalTimeline.test.tsx
git commit -m "feat(visualizations): add HorizontalTimeline component

Production pipeline timeline extracted from StudioDemo.
Shows phases as connected circles with status colors and detail panel.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Create `BarChartSimple` component

**Files:**
- Create: `src/components/features/visualizations/BarChartSimple.tsx`
- Test: `src/components/features/visualizations/__tests__/BarChartSimple.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/features/visualizations/__tests__/BarChartSimple.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarChartSimple } from '../BarChartSimple';

const mockData = [
  { label: 'Jan', values: [{ key: 'income', value: 8500, color: 'bg-ceramic-success/80' }, { key: 'expense', value: 6200, color: 'bg-ceramic-error/70' }] },
  { label: 'Fev', values: [{ key: 'income', value: 9200, color: 'bg-ceramic-success/80' }, { key: 'expense', value: 7100, color: 'bg-ceramic-error/70' }] },
];

describe('BarChartSimple', () => {
  it('renders group labels', () => {
    render(<BarChartSimple data={mockData} />);
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Fev')).toBeInTheDocument();
  });

  it('renders correct number of bars', () => {
    const { container } = render(<BarChartSimple data={mockData} />);
    const bars = container.querySelectorAll('[data-testid^="bar-"]');
    expect(bars.length).toBe(4); // 2 groups × 2 bars each
  });

  it('calls onBarHover with bar data', () => {
    const onHover = vi.fn();
    const { container } = render(<BarChartSimple data={mockData} onBarHover={onHover} />);
    const firstBar = container.querySelector('[data-testid="bar-0-0"]')!;
    fireEvent.mouseEnter(firstBar);
    expect(onHover).toHaveBeenCalledWith(expect.objectContaining({
      label: 'Jan',
      key: 'income',
      value: 8500,
    }));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/visualizations/__tests__/BarChartSimple.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```tsx
// src/components/features/visualizations/BarChartSimple.tsx
import React, { useState, useMemo } from 'react';

interface BarValue {
  key: string;
  value: number;
  color: string; // Tailwind class, e.g. 'bg-ceramic-success/80'
}

export interface BarGroup {
  label: string;
  values: BarValue[];
}

interface BarChartSimpleProps {
  data: BarGroup[];
  maxHeight?: number;
  formatValue?: (value: number) => string;
  onBarHover?: (info: { label: string; key: string; value: number }) => void;
  className?: string;
  legend?: { key: string; label: string; color: string }[];
}

export const BarChartSimple: React.FC<BarChartSimpleProps> = ({
  data,
  maxHeight = 128,
  formatValue = (v) => v.toLocaleString('pt-BR'),
  onBarHover,
  className = '',
  legend,
}) => {
  const [hovered, setHovered] = useState<{ label: string; key: string; value: number; x: number; y: number } | null>(null);

  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach(g => g.values.forEach(v => { if (v.value > max) max = v.value; }));
    return max || 1;
  }, [data]);

  return (
    <div className={className}>
      <div className="flex items-end justify-center gap-6 md:gap-10 relative" style={{ height: maxHeight + 32 }}>
        {data.map((group, gi) => (
          <div key={group.label} className="flex flex-col items-center gap-1">
            <div className="flex items-end gap-1">
              {group.values.map((bar, bi) => {
                const height = (bar.value / maxValue) * maxHeight;
                return (
                  <div
                    key={bar.key}
                    data-testid={`bar-${gi}-${bi}`}
                    className={`w-8 md:w-10 rounded-t-md transition-all ${bar.color}`}
                    style={{ height }}
                    onMouseEnter={(e) => {
                      const info = { label: group.label, key: bar.key, value: bar.value };
                      setHovered({ ...info, x: e.clientX, y: e.clientY });
                      onBarHover?.(info);
                    }}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-ceramic-text-secondary font-medium">{group.label}</span>
          </div>
        ))}
      </div>
      {/* Tooltip */}
      {hovered && (
        <div className="text-center mt-2 text-xs font-medium text-ceramic-text-primary">
          {hovered.label}: {formatValue(hovered.value)}
        </div>
      )}
      {/* Legend */}
      {legend && (
        <div className="flex justify-center gap-4 mt-3">
          {legend.map(l => (
            <div key={l.key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              <span className="text-[10px] text-ceramic-text-secondary">{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Step 4: Run test**

Run: `npx vitest run src/components/features/visualizations/__tests__/BarChartSimple.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/features/visualizations/BarChartSimple.tsx src/components/features/visualizations/__tests__/BarChartSimple.test.tsx
git commit -m "feat(visualizations): add BarChartSimple component

Dual-bar chart extracted from FinanceDemo.
Dynamic height, hover tooltips, legend support, R$ formatting.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Create `NetworkGraph` component

**Files:**
- Create: `src/components/features/visualizations/NetworkGraph.tsx`
- Test: `src/components/features/visualizations/__tests__/NetworkGraph.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/features/visualizations/__tests__/NetworkGraph.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { NetworkGraph } from '../NetworkGraph';

const mockNodes = [
  { id: '1', label: 'Ana', role: 'Mentor', x: 50, y: 30 },
  { id: '2', label: 'Pedro', role: 'Colega', x: 30, y: 60 },
  { id: '3', label: 'Maria', role: 'Cliente', x: 70, y: 70 },
];
const mockLinks = [
  { source: '1', target: '2' },
  { source: '1', target: '3' },
];
const mockRoleColors: Record<string, string> = {
  Mentor: '#3b82f6', Colega: '#f59e0b', Cliente: '#10b981',
};

describe('NetworkGraph', () => {
  it('renders SVG with correct viewBox', () => {
    const { container } = render(
      <NetworkGraph nodes={mockNodes} links={mockLinks} roleColors={mockRoleColors} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
  });

  it('renders correct number of node circles', () => {
    const { container } = render(
      <NetworkGraph nodes={mockNodes} links={mockLinks} roleColors={mockRoleColors} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('renders correct number of links', () => {
    const { container } = render(
      <NetworkGraph nodes={mockNodes} links={mockLinks} roleColors={mockRoleColors} />
    );
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(2);
  });

  it('calls onNodeHover with node data', () => {
    const onHover = vi.fn();
    const { container } = render(
      <NetworkGraph nodes={mockNodes} links={mockLinks} roleColors={mockRoleColors} onNodeHover={onHover} />
    );
    const firstGroup = container.querySelectorAll('g[data-testid^="node-"]')[0];
    fireEvent.mouseEnter(firstGroup);
    expect(onHover).toHaveBeenCalledWith(mockNodes[0]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/visualizations/__tests__/NetworkGraph.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```tsx
// src/components/features/visualizations/NetworkGraph.tsx
import React, { useState } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  role: string;
  x: number; // 0-100
  y: number; // 0-100
}

export interface GraphLink {
  source: string;
  target: string;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  roleColors: Record<string, string>;
  onNodeHover?: (node: GraphNode | null) => void;
  onNodeClick?: (node: GraphNode) => void;
  className?: string;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  links,
  roleColors,
  onNodeHover,
  onNodeClick,
  className = '',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {/* Links */}
        {links.map((link, i) => {
          const source = nodeMap[link.source];
          const target = nodeMap[link.target];
          if (!source || !target) return null;
          return (
            <line
              key={`link-${i}`}
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              className="stroke-ceramic-border"
              strokeWidth="0.3"
              opacity={0.5}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map(node => {
          const isHovered = hoveredId === node.id;
          const color = roleColors[node.role] || '#9ca3af';
          return (
            <g
              key={node.id}
              data-testid={`node-${node.id}`}
              onMouseEnter={() => { setHoveredId(node.id); onNodeHover?.(node); }}
              onMouseLeave={() => { setHoveredId(null); onNodeHover?.(null); }}
              onClick={() => onNodeClick?.(node)}
              className="cursor-pointer"
            >
              <circle
                cx={node.x} cy={node.y}
                r={isHovered ? 5 : 4}
                fill={color}
                opacity={isHovered ? 1 : 0.8}
                className="transition-all"
              />
              <text
                x={node.x} y={node.y + 8}
                textAnchor="middle"
                className="fill-ceramic-text-secondary"
                fontSize="3"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {Object.entries(roleColors).map(([role, color]) => (
          <div key={role} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-ceramic-text-secondary">{role}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Step 4: Run test**

Run: `npx vitest run src/components/features/visualizations/__tests__/NetworkGraph.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/features/visualizations/NetworkGraph.tsx src/components/features/visualizations/__tests__/NetworkGraph.test.tsx
git commit -m "feat(visualizations): add NetworkGraph component

SVG network graph extracted from ConnectionsDemo.
Nodes with role-colored circles, links, hover state, legend.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Create `EisenhowerMatrix` component

**Files:**
- Create: `src/components/features/visualizations/EisenhowerMatrix.tsx`
- Test: `src/components/features/visualizations/__tests__/EisenhowerMatrix.test.tsx`

**Context:** `AgendaView.tsx` already has `matrixTasks: Record<Quadrant, Task[]>` state and DnD logic. This component extracts just the VISUAL matrix grid. The `Quadrant` type is `'urgent-important' | 'important' | 'urgent' | 'low'` from `src/types/index.ts`.

**Step 1: Write the failing test**

```tsx
// src/components/features/visualizations/__tests__/EisenhowerMatrix.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EisenhowerMatrix } from '../EisenhowerMatrix';

const mockTasks = {
  'urgent-important': [
    { id: '1', title: 'Revisar proposta', completed: false },
    { id: '2', title: 'Deadline projeto', completed: true },
  ],
  'important': [
    { id: '3', title: 'Planejar sprint', completed: false },
  ],
  'urgent': [
    { id: '4', title: 'Responder emails', completed: false },
  ],
  'low': [],
};

describe('EisenhowerMatrix', () => {
  it('renders all 4 quadrant labels', () => {
    render(<EisenhowerMatrix tasks={mockTasks} />);
    expect(screen.getByText(/urgente.*importante/i)).toBeInTheDocument();
    expect(screen.getByText(/importante/i)).toBeInTheDocument();
  });

  it('renders tasks in correct quadrants', () => {
    render(<EisenhowerMatrix tasks={mockTasks} />);
    expect(screen.getByText('Revisar proposta')).toBeInTheDocument();
    expect(screen.getByText('Planejar sprint')).toBeInTheDocument();
  });

  it('shows completed tasks with line-through', () => {
    render(<EisenhowerMatrix tasks={mockTasks} />);
    const completedTask = screen.getByText('Deadline projeto');
    expect(completedTask.className).toContain('line-through');
  });

  it('calls onTaskComplete when task is clicked', () => {
    const onComplete = vi.fn();
    render(<EisenhowerMatrix tasks={mockTasks} onTaskComplete={onComplete} />);
    fireEvent.click(screen.getByText('Revisar proposta'));
    expect(onComplete).toHaveBeenCalledWith('1');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/visualizations/__tests__/EisenhowerMatrix.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```tsx
// src/components/features/visualizations/EisenhowerMatrix.tsx
import React from 'react';

export interface MatrixTask {
  id: string;
  title: string;
  completed: boolean;
  dueTime?: string;
}

type QuadrantKey = 'urgent-important' | 'important' | 'urgent' | 'low';

interface EisenhowerMatrixProps {
  tasks: Record<QuadrantKey, MatrixTask[]>;
  onTaskComplete?: (taskId: string) => void;
  onTaskMove?: (taskId: string, targetQuadrant: QuadrantKey) => void;
  className?: string;
}

const QUADRANT_CONFIG: Record<QuadrantKey, { label: string; sublabel: string; bg: string; border: string }> = {
  'urgent-important': { label: 'Urgente + Importante', sublabel: 'Fazer agora', bg: 'bg-red-50', border: 'border-red-200' },
  'important': { label: 'Importante', sublabel: 'Agendar', bg: 'bg-blue-50', border: 'border-blue-200' },
  'urgent': { label: 'Urgente', sublabel: 'Delegar', bg: 'bg-amber-50', border: 'border-amber-200' },
  'low': { label: 'Nem Urgente', sublabel: 'Eliminar', bg: 'bg-ceramic-cool', border: 'border-ceramic-border' },
};

const QUADRANT_ORDER: QuadrantKey[] = ['urgent-important', 'important', 'urgent', 'low'];

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({
  tasks,
  onTaskComplete,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`} role="grid" aria-label="Eisenhower Matrix">
      {QUADRANT_ORDER.map(key => {
        const config = QUADRANT_CONFIG[key];
        const quadrantTasks = tasks[key] || [];
        return (
          <div
            key={key}
            className={`${config.bg} ${config.border} border rounded-xl p-3 min-h-[120px]`}
            role="gridcell"
            aria-label={config.label}
          >
            <div className="mb-2">
              <h3 className="text-[10px] font-bold text-ceramic-text-primary uppercase tracking-wide">
                {config.label}
              </h3>
              <span className="text-[9px] text-ceramic-text-secondary">{config.sublabel}</span>
            </div>
            <div className="space-y-1">
              {quadrantTasks.map(task => (
                <button
                  key={task.id}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg
                    bg-white/70 hover:bg-white transition-all hover:scale-[1.02]
                    ${task.completed ? 'line-through text-ceramic-text-secondary opacity-60' : 'text-ceramic-text-primary'}`}
                  onClick={() => onTaskComplete?.(task.id)}
                >
                  {task.title}
                  {task.dueTime && (
                    <span className="ml-1 text-[9px] text-ceramic-text-secondary">{task.dueTime}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

**Step 4: Run test**

Run: `npx vitest run src/components/features/visualizations/__tests__/EisenhowerMatrix.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/features/visualizations/EisenhowerMatrix.tsx src/components/features/visualizations/__tests__/EisenhowerMatrix.test.tsx
git commit -m "feat(visualizations): add EisenhowerMatrix component

2x2 priority matrix extracted from AtlasDemo.
Color-coded quadrants, task completion, hover effects.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Create `WeeklyBlocks` component

**Files:**
- Create: `src/components/features/visualizations/WeeklyBlocks.tsx`
- Test: `src/components/features/visualizations/__tests__/WeeklyBlocks.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/features/visualizations/__tests__/WeeklyBlocks.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeeklyBlocks } from '../WeeklyBlocks';

const mockDays = [
  { day: 'seg', label: 'Segunda', modality: 'Força', color: '#f59e0b',
    exercises: [{ name: 'Supino', sets: 4, reps: '8-10' }] },
  { day: 'ter', label: 'Terça', modality: 'Cardio', color: '#3b82f6',
    exercises: [{ name: 'Corrida', sets: 1, reps: '5km' }] },
];

describe('WeeklyBlocks', () => {
  it('renders day labels', () => {
    render(<WeeklyBlocks days={mockDays} />);
    expect(screen.getByText('seg')).toBeInTheDocument();
    expect(screen.getByText('ter')).toBeInTheDocument();
  });

  it('renders modality names', () => {
    render(<WeeklyBlocks days={mockDays} />);
    expect(screen.getByText('Força')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
  });

  it('shows exercises by default when expandedByDefault is true', () => {
    render(<WeeklyBlocks days={mockDays} expandedByDefault />);
    expect(screen.getByText('Supino')).toBeInTheDocument();
    expect(screen.getByText('4×8-10')).toBeInTheDocument();
  });

  it('hides exercises by default when expandedByDefault is false', () => {
    render(<WeeklyBlocks days={mockDays} expandedByDefault={false} />);
    expect(screen.queryByText('Supino')).not.toBeInTheDocument();
  });

  it('toggles exercises on click', () => {
    render(<WeeklyBlocks days={mockDays} expandedByDefault={false} />);
    fireEvent.click(screen.getByText('Força'));
    expect(screen.getByText('Supino')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/features/visualizations/__tests__/WeeklyBlocks.test.tsx`
Expected: FAIL

**Step 3: Write implementation**

```tsx
// src/components/features/visualizations/WeeklyBlocks.tsx
import React, { useState, useEffect } from 'react';

export interface BlockExercise {
  name: string;
  sets: number;
  reps: string;
}

export interface WeeklyDay {
  day: string;
  label: string;
  modality: string;
  color: string;
  exercises: BlockExercise[];
}

interface WeeklyBlocksProps {
  days: WeeklyDay[];
  expandedByDefault?: boolean;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  '#f59e0b': 'bg-amber-100 text-amber-700',
  '#3b82f6': 'bg-blue-100 text-blue-700',
  '#ef4444': 'bg-red-100 text-red-700',
  '#10b981': 'bg-emerald-100 text-emerald-700',
  '#8b5cf6': 'bg-violet-100 text-violet-700',
  '#ec4899': 'bg-pink-100 text-pink-700',
};

export const WeeklyBlocks: React.FC<WeeklyBlocksProps> = ({
  days,
  expandedByDefault = false,
  className = '',
}) => {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (expandedByDefault) {
      setExpandedDays(new Set(days.map((_, i) => i)));
    }
  }, [expandedByDefault, days.length]);

  const toggleDay = (index: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className={`flex gap-1.5 overflow-x-auto pb-2 ${className}`}>
      {days.map((day, i) => {
        const isExpanded = expandedDays.has(i);
        const colorClass = COLOR_MAP[day.color] || 'bg-ceramic-cool text-ceramic-text-primary';
        return (
          <div
            key={day.day}
            className={`min-w-[80px] rounded-xl p-2 transition-all cursor-pointer
              hover:scale-[1.02] ${isExpanded ? 'ring-2 ring-amber-300 scale-[1.03]' : ''}
              ${colorClass}`}
            onClick={() => toggleDay(i)}
          >
            <div className="text-[10px] font-bold uppercase opacity-60">{day.day}</div>
            <div className="text-xs font-bold mt-0.5">{day.modality}</div>
            {isExpanded && day.exercises.length > 0 && (
              <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
                {day.exercises.map((ex, j) => (
                  <div key={j} className="text-[10px]">
                    <div className="font-medium">{ex.name}</div>
                    <div className="opacity-70">{ex.sets}×{ex.reps}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

**Step 4: Run test**

Run: `npx vitest run src/components/features/visualizations/__tests__/WeeklyBlocks.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/features/visualizations/WeeklyBlocks.tsx src/components/features/visualizations/__tests__/WeeklyBlocks.test.tsx
git commit -m "feat(visualizations): add WeeklyBlocks component

Weekly training blocks extracted from FluxDemo.
Expandable exercise details, color-coded modalities, expandedByDefault prop.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Create barrel export and register in features index

**Files:**
- Create: `src/components/features/visualizations/index.ts`
- Modify: `src/components/features/index.ts` — add visualization exports

**Step 1: Create barrel export**

```tsx
// src/components/features/visualizations/index.ts
export { CircularScore } from './CircularScore';
export { HeatmapGrid } from './HeatmapGrid';
export type { HeatmapDay } from './HeatmapGrid';
export { CalendarGrid } from './CalendarGrid';
export type { CalendarEvent } from './CalendarGrid';
export { HorizontalTimeline } from './HorizontalTimeline';
export type { TimelinePhase } from './HorizontalTimeline';
export { BarChartSimple } from './BarChartSimple';
export type { BarGroup } from './BarChartSimple';
export { NetworkGraph } from './NetworkGraph';
export type { GraphNode, GraphLink } from './NetworkGraph';
export { EisenhowerMatrix } from './EisenhowerMatrix';
export type { MatrixTask } from './EisenhowerMatrix';
export { WeeklyBlocks } from './WeeklyBlocks';
export type { WeeklyDay, BlockExercise } from './WeeklyBlocks';
```

**Step 2: Add to features barrel**

Add at the end of `src/components/features/index.ts`:

```typescript
// Visualizations
export {
  CircularScore,
  HeatmapGrid,
  CalendarGrid,
  HorizontalTimeline,
  BarChartSimple,
  NetworkGraph,
  EisenhowerMatrix,
  WeeklyBlocks,
} from './visualizations';
```

**Step 3: Commit**

```bash
git add src/components/features/visualizations/index.ts src/components/features/index.ts
git commit -m "feat(visualizations): add barrel exports for shared library

All 8 visualization components exported via features barrel.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Atlas — Add 'matrix' mode to AgendaView

**Files:**
- Modify: `src/components/domain/AgendaModeToggle.tsx` — add 'matrix' mode
- Modify: `src/views/AgendaView.tsx` — render `<EisenhowerMatrix>` in matrix mode

**Context:** `AgendaView.tsx` already has `matrixTasks: Record<Quadrant, Task[]>` state (line 113) with all 4 quadrants populated. The `AgendaModeToggle` only shows 3 modes. We add a 4th.

**Step 1: Add matrix mode to toggle**

In `src/components/domain/AgendaModeToggle.tsx`:
- Change type: `export type AgendaMode = 'agenda' | 'list' | 'kanban' | 'matrix';`
- Add segment: `{ key: 'matrix', label: 'Matrix', icon: Grid2x2 }` (import `Grid2x2` from `lucide-react`)

**Step 2: Add matrix view rendering in AgendaView**

In `src/views/AgendaView.tsx`, after the kanban block (around line 1044), add:

```tsx
{mobileMode === 'matrix' && (
  <EisenhowerMatrix
    tasks={Object.fromEntries(
      Object.entries(matrixTasks).map(([q, tasks]) => [
        q,
        tasks.map(t => ({
          id: t.id,
          title: t.title,
          completed: !!t.completed_at,
          dueTime: t.scheduled_time ? extractTimeHHMM(t.scheduled_time) || undefined : undefined,
        })),
      ])
    ) as Record<'urgent-important' | 'important' | 'urgent' | 'low', import('@/components/features/visualizations').MatrixTask[]>}
    onTaskComplete={(taskId) => handleTaskComplete(taskId)}
  />
)}
```

Also add 'matrix' to `MOBILE_VIEWS` array (line 90):
```tsx
const MOBILE_VIEWS: AgendaMode[] = ['agenda', 'list', 'kanban', 'matrix'];
```

**Step 3: Verify build**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/domain/AgendaModeToggle.tsx src/views/AgendaView.tsx
git commit -m "feat(atlas): add Eisenhower Matrix view mode to AgendaView

Adds 'matrix' as 4th view mode toggle. Uses shared EisenhowerMatrix
component with real work_items data from existing matrixTasks state.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Agenda — Add 'calendar' mode to AgendaView

**Files:**
- Modify: `src/components/domain/AgendaModeToggle.tsx` — add 'calendar' mode
- Modify: `src/views/AgendaView.tsx` — render `<CalendarGrid>` in calendar mode

**Context:** `AgendaView` already merges Google Calendar + Flux events into `calendarEvents` (line 184). We map these to `CalendarEvent[]` for the grid.

**Step 1: Add calendar mode to toggle**

In `src/components/domain/AgendaModeToggle.tsx`:
- Change type: `export type AgendaMode = 'agenda' | 'list' | 'kanban' | 'matrix' | 'calendar';`
- Add segment: `{ key: 'calendar', label: 'Mês', icon: CalendarDays }` — reuse existing CalendarDays import

**Step 2: Add calendar view rendering in AgendaView**

```tsx
// Add state for calendar view
const [calendarSelectedDay, setCalendarSelectedDay] = useState<number | null>(null);
const [calendarMonth, setCalendarMonth] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 }));

// Map calendarEvents to CalendarEvent[]
const calendarGridEvents = useMemo(() => {
  return calendarEvents.map(e => ({
    id: e.id,
    date: e.startTime.split('T')[0],
    title: e.title,
    color: e.color || '#f59e0b',
    time: extractTimeHHMM(e.startTime) || undefined,
  }));
}, [calendarEvents]);
```

In render, after matrix block:
```tsx
{mobileMode === 'calendar' && (
  <div>
    <div className="flex items-center justify-between mb-4">
      <button onClick={() => {
        const prev = calendarMonth.month === 1
          ? { year: calendarMonth.year - 1, month: 12 }
          : { ...calendarMonth, month: calendarMonth.month - 1 };
        setCalendarMonth(prev);
      }} className="p-2 hover:bg-ceramic-cool rounded-lg">←</button>
      <h3 className="font-bold text-ceramic-text-primary">
        {new Date(calendarMonth.year, calendarMonth.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </h3>
      <button onClick={() => {
        const next = calendarMonth.month === 12
          ? { year: calendarMonth.year + 1, month: 1 }
          : { ...calendarMonth, month: calendarMonth.month + 1 };
        setCalendarMonth(next);
      }} className="p-2 hover:bg-ceramic-cool rounded-lg">→</button>
    </div>
    <CalendarGrid
      year={calendarMonth.year}
      month={calendarMonth.month}
      events={calendarGridEvents}
      selectedDay={calendarSelectedDay}
      onDayClick={(day, events) => {
        setCalendarSelectedDay(day === calendarSelectedDay ? null : day);
      }}
    />
    {/* Selected day events list */}
    {calendarSelectedDay && (
      <div className="mt-4 space-y-2">
        {calendarGridEvents
          .filter(e => new Date(e.date).getDate() === calendarSelectedDay)
          .map(e => (
            <div key={e.id} className="flex items-center gap-2 p-2 bg-white rounded-lg">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
              <span className="text-sm text-ceramic-text-primary">{e.title}</span>
              {e.time && <span className="text-xs text-ceramic-text-secondary ml-auto">{e.time}</span>}
            </div>
          ))}
      </div>
    )}
  </div>
)}
```

Also add 'calendar' to `MOBILE_VIEWS` array:
```tsx
const MOBILE_VIEWS: AgendaMode[] = ['agenda', 'list', 'kanban', 'matrix', 'calendar'];
```

**Step 3: Verify build**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/domain/AgendaModeToggle.tsx src/views/AgendaView.tsx
git commit -m "feat(agenda): add monthly calendar grid view mode

Adds 'calendar' as 5th view mode toggle. Shows CalendarGrid with
Google Calendar + Flux events, month navigation, and day detail list.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Grants — Add CircularScore to match cards

**Files:**
- Modify: `src/modules/grants/components/GrantMatchList.tsx` — add `<CircularScore>` to each match item

**Context:** `GrantMatchList.tsx` receives `matches: GrantMatchItem[]` where each has `probability: number` (0-1). The component already shows bars for factors — we add the circular score.

**Step 1: Add CircularScore import and render**

In `src/modules/grants/components/GrantMatchList.tsx`, import and add:

```tsx
import { CircularScore } from '@/components/features/visualizations';

// Inside the match item render, before the factors breakdown:
<CircularScore
  score={Math.round(match.probability * 100)}
  maxScore={100}
  size={64}
  label="Match"
  progressColor={match.probability >= 0.7 ? '#10b981' : match.probability >= 0.4 ? '#f59e0b' : '#ef4444'}
/>
```

**Step 2: Verify build**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/modules/grants/components/GrantMatchList.tsx
git commit -m "feat(grants): add CircularScore to match cards

Shows circular SVG match percentage on each grant opportunity card.
Color shifts green/amber/red based on probability threshold.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Connections — Add NetworkGraph view

**Files:**
- Modify: `src/modules/connections/views/ConnectionsView.tsx` — add network graph section

**Context:** `ConnectionsView` has space cards filtered by archetype tabs. We add a "Mapa da Rede" section using `<NetworkGraph>`. Data comes from existing `connection_members` — we map members to nodes and derive links from shared spaces.

**Step 1: Add NetworkGraph section**

```tsx
import { NetworkGraph } from '@/components/features/visualizations';

// After the space cards grid, before closing:
<section className="mt-8">
  <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-4">
    Mapa da Rede
  </h2>
  <div className="bg-ceramic-base rounded-xl p-4 h-64">
    <NetworkGraph
      nodes={networkNodes}
      links={networkLinks}
      roleColors={ROLE_COLORS}
      onNodeClick={(node) => onNavigateToSpace?.(node.id)}
    />
  </div>
</section>
```

This requires a hook or useMemo to transform connection_members into nodes/links. Create in the component:

```tsx
const { networkNodes, networkLinks } = useMemo(() => {
  // Map members from all spaces to graph nodes
  // Derive links from shared space membership
  // Position using simple circular layout
  // ...
}, [spaces, members]);
```

**Step 2: Verify build**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/modules/connections/views/ConnectionsView.tsx
git commit -m "feat(connections): add network graph visualization

Adds SVG network graph showing contact relationships.
Maps connection_members to nodes, derives links from shared spaces.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Journey — Refine heatmap to match demo style

**Files:**
- Modify: `src/modules/journey/components/ActivityHeatmap.tsx` — use `<HeatmapGrid>` or refine existing

**Context:** Existing `ActivityHeatmap.tsx` (125 lines) already has a GitHub-style heatmap with amber intensity scale. The gap vs the demo is:
1. Demo uses smaller cells (8px vs current)
2. Demo has hover tooltip showing emoji
3. Demo shows emotion circles below

**Step 1: Add emotion circle display below heatmap**

After the heatmap grid, add emotion summary circles (matching JourneyDemo pattern):

```tsx
{/* Emotion Summary Circles */}
<div className="flex gap-3 mt-4">
  {emotionSummary.map(emotion => (
    <div key={emotion.label} className="flex items-center gap-1.5">
      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: emotion.color }} />
      <span className="text-[10px] text-ceramic-text-secondary">
        {emotion.label} ({emotion.count})
      </span>
    </div>
  ))}
</div>
```

**Step 2: Verify build**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/modules/journey/components/ActivityHeatmap.tsx
git commit -m "feat(journey): add emotion circles to heatmap view

Matches landing demo style with emotion summary display below
the activity heatmap grid.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 15: Finance — Refine bar chart to match demo

**Files:**
- Modify: `src/modules/finance/components/IncomeVsExpense.tsx` — refine to match demo dual-bar style

**Context:** Existing `IncomeVsExpense.tsx` (231 lines) already has animated bars with gradients. The gap vs demo:
1. Demo shows side-by-side vertical bars per month (not horizontal)
2. Demo has cleaner hover tooltips
3. Demo uses ceramic-success/ceramic-error coloring (existing already does this)

**Step 1: Check if monthlyTrend prop renders bars**

The component already accepts `monthlyTrend?: Array<{ month: string; income: number; expense: number }>`. If provided, it renders a sparkline. We can add a `<BarChartSimple>` as an alternative visualization when `monthlyTrend` is provided.

```tsx
import { BarChartSimple } from '@/components/features/visualizations';

// When monthlyTrend is provided:
{monthlyTrend && (
  <BarChartSimple
    data={monthlyTrend.map(m => ({
      label: m.month,
      values: [
        { key: 'income', value: m.income, color: 'bg-ceramic-success/80' },
        { key: 'expense', value: m.expense, color: 'bg-ceramic-error/70' },
      ],
    }))}
    legend={[
      { key: 'income', label: 'Receita', color: 'bg-ceramic-success/80' },
      { key: 'expense', label: 'Despesa', color: 'bg-ceramic-error/70' },
    ]}
    formatValue={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
  />
)}
```

**Step 2: Verify build**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/modules/finance/components/IncomeVsExpense.tsx
git commit -m "feat(finance): add dual-bar trend chart matching demo

Uses shared BarChartSimple for monthly income vs expense comparison.
Ceramic success/error colors, R$ formatting, legend.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 16: Flux — Add weekly blocks overview

**Files:**
- Modify: `src/modules/flux/views/AthleteDetailView.tsx` — add `<WeeklyBlocks>` overview

**Context:** `AthleteDetailView.tsx` shows a 12-week timeline with workouts. We add a weekly overview at the top using `<WeeklyBlocks expandedByDefault>` (user feedback: show exercises without clicking).

**Step 1: Add WeeklyBlocks to athlete detail**

```tsx
import { WeeklyBlocks } from '@/components/features/visualizations';

// At top of athlete detail, after header:
{currentWeekWorkouts && (
  <section className="mb-6">
    <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest mb-3">
      Semana Atual
    </h3>
    <WeeklyBlocks
      days={currentWeekWorkouts}
      expandedByDefault
    />
  </section>
)}
```

This requires mapping workout_blocks data to `WeeklyDay[]` format. The hook/transform should extract the current week's workouts and map to the `{ day, label, modality, color, exercises }` shape.

**Step 2: Verify build**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/modules/flux/views/AthleteDetailView.tsx
git commit -m "feat(flux): add weekly blocks overview to athlete detail

Shows current week's workouts with exercises expanded by default.
Matches landing demo style for immediate exercise visibility.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 17: Studio — Add horizontal timeline to show page

**Files:**
- Modify: `src/modules/studio/views/PodcastShowPage.tsx` or `src/modules/studio/components/PodcastWorkspace.tsx`

**Context:** Studio uses an FSM with 6 stages (Setup → Research → Pauta → Production → PostProduction → Distribution). The `StageStepper` component handles navigation. We add `<HorizontalTimeline>` as an overview at the top.

**Step 1: Add HorizontalTimeline to workspace header**

```tsx
import { HorizontalTimeline } from '@/components/features/visualizations';

const STUDIO_PHASES: TimelinePhase[] = [
  { id: 'setup', label: 'Setup', status: 'completed', icon: '⚙️' },
  { id: 'research', label: 'Pesquisa', status: 'completed', icon: '🔍' },
  { id: 'pauta', label: 'Pauta', status: 'active', icon: '📝' },
  { id: 'production', label: 'Gravação', status: 'pending', icon: '🎙️' },
  { id: 'postproduction', label: 'Edição', status: 'pending', icon: '✂️' },
  { id: 'distribution', label: 'Publicação', status: 'pending', icon: '📡' },
];

// Map episode's current stage to phase statuses
const timelinePhases = useMemo(() => {
  // Map workspace stage to status for each phase
  // ...
}, [currentStage]);

<HorizontalTimeline
  phases={timelinePhases}
  selectedId={currentStage}
  onPhaseClick={(id) => navigateToStage(id)}
/>
```

**Step 2: Verify build**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/modules/studio/components/PodcastWorkspace.tsx
git commit -m "feat(studio): add horizontal production timeline

Shows episode production pipeline at workspace top.
Maps stage FSM to visual timeline with status colors.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 18: Final build verification and PR

**Step 1: Full build + typecheck**

Run: `npm run build && npm run typecheck`
Expected: PASS with no errors

**Step 2: Run all tests**

Run: `npm run test`
Expected: All visualization tests pass

**Step 3: Commit any remaining changes**

```bash
git add -A
git status  # verify nothing unexpected
```

**Step 4: Push and create PR**

```bash
git push -u origin feature/landing-to-app-visualizations
gh pr create --title "feat: shared visualization library + module visual upgrades" --body "$(cat <<'EOF'
## Summary
- Extracts 8 reusable visualization components from landing page demos into `src/components/features/visualizations/`
- Adds 'matrix' and 'calendar' view modes to AgendaView (Atlas + Agenda gaps)
- Integrates CircularScore into Grants match cards
- Adds NetworkGraph to Connections module
- Refines Journey heatmap with emotion circles
- Adds BarChartSimple trend to Finance module
- Adds WeeklyBlocks overview to Flux athlete detail
- Adds HorizontalTimeline to Studio workspace

## Components Created
| Component | Source Demo | Used By |
|-----------|-----------|---------|
| `CircularScore` | GrantsDemo | Grants |
| `HeatmapGrid` | JourneyDemo | Journey |
| `CalendarGrid` | AgendaDemo | Agenda |
| `HorizontalTimeline` | StudioDemo | Studio |
| `BarChartSimple` | FinanceDemo | Finance |
| `NetworkGraph` | ConnectionsDemo | Connections |
| `EisenhowerMatrix` | AtlasDemo | Atlas/Agenda |
| `WeeklyBlocks` | FluxDemo | Flux |

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] `npx vitest run src/components/features/visualizations/` — all 8 component tests pass
- [ ] Manual: AgendaView shows 5 mode tabs (agenda/list/kanban/matrix/calendar)
- [ ] Manual: Matrix mode shows 4 quadrants with real tasks
- [ ] Manual: Calendar mode shows monthly grid with event dots

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
