# Weather Strip Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the standalone WeatherInsightCard with a micro weather bar in the Vida header, and add weather forecast strips to each day section in the Agenda.

**Architecture:** A reusable `WeatherStrip` component with 2 variants (`header` and `day`), backed by a shared `weatherUtils.ts` helper that extracts per-day forecast data from the existing 48h hourly array. Data flows from `useWeatherInsight()` → parent component → `WeatherStrip` via props.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (Ceramic tokens), Lucide icons, `@tanstack/react-query` (existing weather hook)

---

### Task 1: Create weather utilities helper

**Files:**
- Create: `src/utils/weatherUtils.ts`

**Step 1: Create the helper file with WMO maps and getDayForecast**

```typescript
// src/utils/weatherUtils.ts
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, type LucideIcon } from 'lucide-react'
import type { WeatherData } from '@/lib/external-api'

/** WMO weather code descriptions in PT-BR */
export const WMO_CONDITIONS: Record<number, string> = {
  0: 'Céu limpo',
  1: 'Predominantemente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Neblina com geada',
  51: 'Garoa leve',
  53: 'Garoa moderada',
  55: 'Garoa intensa',
  61: 'Chuva leve',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  71: 'Neve leve',
  73: 'Neve moderada',
  75: 'Neve forte',
  80: 'Pancadas leves',
  81: 'Pancadas moderadas',
  82: 'Pancadas fortes',
  95: 'Tempestade',
  96: 'Tempestade com granizo leve',
  99: 'Tempestade com granizo forte',
}

/** Maps WMO code to a Lucide icon component */
export function getWeatherIcon(code: number | null): LucideIcon {
  if (code === null) return Cloud
  if (code <= 1) return Sun
  if (code <= 3) return Cloud
  if (code >= 51 && code <= 67) return CloudRain
  if (code >= 71 && code <= 77) return CloudSnow
  if (code >= 80 && code <= 82) return CloudRain
  if (code >= 95) return CloudLightning
  return Cloud
}

export interface DayForecast {
  minTemp: number
  maxTemp: number
  dominantCode: number
  conditionText: string
  currentTemp?: number
  currentCode?: number
}

/**
 * Extracts forecast summary for a specific day from hourly data.
 * @param forecast - The hourly forecast data (48h)
 * @param dayOffset - 0 = today, 1 = tomorrow, 2 = day after
 * @returns Day summary or null if insufficient data
 */
export function getDayForecast(
  forecast: WeatherData['forecast'] | undefined | null,
  dayOffset: number
): DayForecast | null {
  if (!forecast?.hourly?.time?.length) return null

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + dayOffset)
  const targetStr = targetDate.toISOString().slice(0, 10)

  // Find indices for the target day
  const indices: number[] = []
  for (let i = 0; i < forecast.hourly.time.length; i++) {
    if (forecast.hourly.time[i].startsWith(targetStr)) {
      indices.push(i)
    }
  }

  if (indices.length === 0) return null

  const temps = indices.map(i => forecast.hourly.temperature_2m[i])
  const codes = indices.map(i => forecast.hourly.weathercode[i])

  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const dominantCode = getMostFrequent(codes)
  const conditionText = WMO_CONDITIONS[dominantCode] || 'Indefinido'

  const result: DayForecast = { minTemp, maxTemp, dominantCode, conditionText }

  // For today, also include current hour data
  if (dayOffset === 0) {
    const currentHour = new Date().getHours()
    const currentIdx = indices.find(i => {
      const h = new Date(forecast.hourly.time[i]).getHours()
      return h === currentHour
    })
    if (currentIdx !== undefined) {
      result.currentTemp = forecast.hourly.temperature_2m[currentIdx]
      result.currentCode = forecast.hourly.weathercode[currentIdx]
    }
  }

  return result
}

function getMostFrequent(arr: number[]): number {
  const counts = new Map<number, number>()
  for (const val of arr) {
    counts.set(val, (counts.get(val) || 0) + 1)
  }
  let maxCount = 0
  let maxVal = 0
  for (const [val, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      maxVal = val
    }
  }
  return maxVal
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep weatherUtils || echo "No errors in weatherUtils"`
Expected: No errors mentioning weatherUtils

**Step 3: Commit**

```bash
git add src/utils/weatherUtils.ts
git commit -m "feat(weather): add weatherUtils helper with getDayForecast + WMO maps"
```

---

### Task 2: Create WeatherStrip component

**Files:**
- Create: `src/components/features/WeatherStrip.tsx`
- Modify: `src/components/features/index.ts` (add export)

**Step 1: Create the WeatherStrip component**

```tsx
// src/components/features/WeatherStrip.tsx
import React from 'react'
import type { WeatherData } from '@/lib/external-api'
import { getDayForecast, getWeatherIcon } from '@/utils/weatherUtils'

interface WeatherStripProps {
  variant: 'header' | 'day'
  dayOffset?: number
  forecast?: WeatherData['forecast'] | null
  insight?: string | null
  className?: string
}

export const WeatherStrip: React.FC<WeatherStripProps> = ({
  variant,
  dayOffset = 0,
  forecast,
  insight,
  className = '',
}) => {
  const dayData = getDayForecast(forecast, dayOffset)
  if (!dayData) return null

  const Icon = variant === 'header'
    ? getWeatherIcon(dayData.currentCode ?? dayData.dominantCode)
    : getWeatherIcon(dayData.dominantCode)

  if (variant === 'header') {
    const temp = dayData.currentTemp ?? dayData.maxTemp
    const text = insight || dayData.conditionText

    return (
      <div className={`flex items-center gap-1.5 mt-1 ${className}`}>
        <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="text-xs text-ceramic-text-secondary truncate">
          {Math.round(temp)}° · {text}
        </span>
      </div>
    )
  }

  // variant === 'day'
  return (
    <div className={`flex items-center gap-1.5 mb-3 ${className}`}>
      <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span className="text-xs text-ceramic-text-secondary">
        {Math.round(dayData.minTemp)}°–{Math.round(dayData.maxTemp)}° · {dayData.conditionText}
      </span>
    </div>
  )
}
```

**Step 2: Add export to features barrel**

In `src/components/features/index.ts`, add:
```typescript
export { WeatherStrip } from './WeatherStrip'
```

Search for existing exports pattern first — the file uses named exports. Add the new line alphabetically near other W exports or at the end.

**Step 3: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "weatherstrip\|error" | head -10`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/features/WeatherStrip.tsx src/components/features/index.ts
git commit -m "feat(weather): add WeatherStrip component with header and day variants"
```

---

### Task 3: Integrate WeatherStrip into Vida page header

**Files:**
- Modify: `src/pages/VidaPage.tsx`

**Step 1: Add useWeatherInsight import and hook call**

At `src/pages/VidaPage.tsx`, the file already imports `WeatherInsightCard` (line 18). We need to:

1. Add import for `useWeatherInsight` — find imports section (~line 8-28), add:
   ```typescript
   import { useWeatherInsight } from '@/hooks/useWeatherInsight'
   ```

2. Add import for `WeatherStrip` — in the component imports area, add:
   ```typescript
   import { WeatherStrip } from '@/components/features/WeatherStrip'
   ```

3. Inside the component function body (after existing hooks ~line 80-120 area), add:
   ```typescript
   const { weather } = useWeatherInsight()
   ```

**Step 2: Add WeatherStrip to HeaderGlobal area**

In `VidaPage.tsx`, find the `<HeaderGlobal ... />` block (lines 175-191). **After** the closing `/>` of HeaderGlobal and **before** the Credit Balance section (line 193), add the weather strip:

Replace (lines 191-198):
```tsx
         />

         {/* Credit Balance - compact inline */}
         {userId && (
```

With:
```tsx
         />

         {/* Weather micro bar — below header title */}
         {weather?.forecast && (
            <div className="px-6 -mt-4 mb-1">
               <WeatherStrip
                  variant="header"
                  forecast={weather.forecast}
                  insight={weather.insight}
               />
            </div>
         )}

         {/* Credit Balance - compact inline */}
         {userId && (
```

The `-mt-4` pulls the strip up into the header's bottom padding, and `mb-1` adds a tiny gap before credit balance.

**Step 3: Remove standalone WeatherInsightCard**

In `VidaPage.tsx`, remove the entire weather card section (lines 219-226):

Delete this block:
```tsx
            {/* Weather Insight — contextual climate card */}
            <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.08 }}
            >
               <WeatherInsightCard compact />
            </motion.div>
```

Also remove the now-unused import of `WeatherInsightCard` from line 18:
```typescript
import { WeatherInsightCard } from '@/modules/atlas/components';
```

**Step 4: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/pages/VidaPage.tsx
git commit -m "feat(weather): move weather to Vida header micro bar, remove standalone card"
```

---

### Task 4: Integrate WeatherStrip into Agenda (NextTwoDaysView)

**Files:**
- Modify: `src/components/features/NextTwoDaysView.tsx`
- Modify: `src/views/AgendaView.tsx`

**Step 1: Add forecast prop to NextTwoDaysView**

In `src/components/features/NextTwoDaysView.tsx`:

1. Add import at top (after existing imports ~line 4):
   ```typescript
   import type { WeatherData } from '@/lib/external-api'
   import { WeatherStrip } from './WeatherStrip'
   ```

2. Extend the `NextTwoDaysViewProps` interface (line 25-31) — add `forecast`:
   ```typescript
   interface NextTwoDaysViewProps {
     events: EventWithCategory[];
     onSkipEvent: (eventId: string) => void;
     onUnskipEvent: (eventId: string) => void;
     onTaskComplete?: (taskId: string) => void;
     completingTaskIds?: Set<string>;
     forecast?: WeatherData['forecast'] | null;  // ← ADD THIS
   }
   ```

3. Destructure `forecast` in the component function. Find where props are destructured (search for `const NextTwoDaysView` or `export const`). Add `forecast` to destructuring.

**Step 2: Add WeatherStrip to renderDaySection**

In the `renderDaySection` function (line 383-409), add a `dayOffset` parameter and insert the weather strip between the header and content.

Change the function signature (line 383-387) from:
```typescript
  const renderDaySection = (
    dayLabel: string,
    dayEvents: EventWithCategory[],
    isToday: boolean = false
  ) => {
```
to:
```typescript
  const renderDaySection = (
    dayLabel: string,
    dayEvents: EventWithCategory[],
    isToday: boolean = false,
    dayOffset: number = 0
  ) => {
```

Inside the function, after the `<h3>` header tag (after line 395 `</h3>`), insert:
```tsx
        {/* Weather forecast for this day */}
        {forecast && (
          <WeatherStrip variant="day" dayOffset={dayOffset} forecast={forecast} />
        )}
```

**Step 3: Pass dayOffset in renderDaySection calls**

Update the three render calls (lines 428, 439, 450-453):

Line 428 — change:
```typescript
{renderDaySection('Hoje', todayEvents, true)}
```
to:
```typescript
{renderDaySection('Hoje', todayEvents, true, 0)}
```

Line 439 — change:
```typescript
{renderDaySection('Amanha', tomorrowEvents)}
```
to:
```typescript
{renderDaySection('Amanha', tomorrowEvents, false, 1)}
```

Lines 450-453 — change:
```typescript
{renderDaySection(
  dayAfter.toLocaleDateString('pt-BR', { weekday: 'long' }),
  dayAfterEvents
)}
```
to:
```typescript
{renderDaySection(
  dayAfter.toLocaleDateString('pt-BR', { weekday: 'long' }),
  dayAfterEvents,
  false,
  2
)}
```

**Step 4: Pass forecast from AgendaView to NextTwoDaysView**

In `src/views/AgendaView.tsx`:

1. Add import for `useWeatherInsight` near other hook imports:
   ```typescript
   import { useWeatherInsight } from '@/hooks/useWeatherInsight'
   ```

2. Inside the AgendaView component body, add the hook call (near other hooks):
   ```typescript
   const { weather } = useWeatherInsight()
   ```

3. Find the `<NextTwoDaysView` JSX (line 909-915) and add the forecast prop:
   ```tsx
   <NextTwoDaysView
       events={nextTwoDaysEvents}
       onSkipEvent={handleSkipEvent}
       onUnskipEvent={handleUnskipEvent}
       onTaskComplete={handleTaskComplete}
       completingTaskIds={completingTaskIds}
       forecast={weather?.forecast}
   />
   ```

**Step 5: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/features/NextTwoDaysView.tsx src/views/AgendaView.tsx
git commit -m "feat(weather): add weather strip to Agenda day sections (today, tomorrow, 3rd day)"
```

---

### Task 5: Final build verification and cleanup

**Files:**
- All modified files from Tasks 1-4

**Step 1: Full build check**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds, no new errors

**Step 2: TypeScript check**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: Same count as before (pre-existing errors only, no new ones)

**Step 3: Visual smoke test checklist**

Document these for manual verification on dev server:
- [ ] Vida page header shows weather micro bar below "Minha Vida"
- [ ] Weather bar disappears gracefully when no location/data
- [ ] No standalone weather card in Vida page body
- [ ] Agenda "Hoje" section shows weather strip with current conditions
- [ ] Agenda "Amanhã" section shows weather strip with forecast
- [ ] Agenda 3rd day section shows weather strip
- [ ] Weather strips don't appear if forecast data unavailable

**Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore(weather): final cleanup for weather strip integration"
```
