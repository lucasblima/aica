# Weather Strip Design — Header + Agenda Integration

**Date:** 2026-03-03
**Issue:** #701 (weather fix) → enhancement
**Session:** `fix-weather-geolocation-502`

## Summary

Replace the standalone `WeatherInsightCard` on the Vida page with a micro weather bar in the header, and add weather forecast strips to each day section in the Agenda's NextTwoDaysView.

## Approach: Reusable `WeatherStrip` Component (Option A)

Single component with 2 variants, shared helper for day forecast extraction.

## Component: `WeatherStrip`

**File:** `src/components/features/WeatherStrip.tsx`

### Props

```typescript
interface WeatherStripProps {
  variant: 'header' | 'day'
  dayOffset?: number        // 0=today, 1=tomorrow, 2=day after (default: 0)
  forecast?: WeatherData['forecast']
  insight?: string | null   // Gemini insight (header variant only)
  className?: string
}
```

### Variant: `header`

- Icon (WMO current hour) + current temp + Gemini insight text
- Style: `text-xs ceramic-text-secondary`, icon in `text-amber-500`
- No background — inherits from HeaderGlobal
- Renders nothing if forecast is null

### Variant: `day`

- Icon (WMO dominant for day) + min°–max° + WMO condition text in PT-BR
- Same visual style as header variant
- Uses `getDayForecast(forecast, dayOffset)` helper
- Renders nothing if insufficient data for the day

## Integration: Vida Page Header

**File:** `src/pages/VidaPage.tsx`

1. Add `<WeatherStrip variant="header" />` below "Minha Vida" title, above identity bar
2. Remove `<WeatherInsightCard compact />` standalone section
3. Pass forecast + insight from `useWeatherInsight()` hook

```
Minha Vida
☀️ 24° · Dia quente, hidrate-se    ← WeatherStrip header
━━━━━━━━━━━━━━ Lv.3 CP ━━━━━━━━━━  ← Identity bar
```

## Integration: Agenda (NextTwoDaysView)

**File:** `src/components/features/NextTwoDaysView.tsx`

1. Receive `forecast` as optional prop from `AgendaView`
2. In `renderDaySection()`, insert `<WeatherStrip variant="day" dayOffset={n} />` between day header and events
3. Cover 3 days: today (offset 0), tomorrow (offset 1), 3rd day (offset 2)

```
HOJE
☀️ 22°–28° · Céu limpo              ← WeatherStrip day offset=0
─────────────────────
09:00  Reunião produto

AMANHÃ
⛅ 18°–24° · Parcialmente nublado    ← WeatherStrip day offset=1
─────────────────────
10:00  Call investidores

QUINTA-FEIRA
🌧️ 16°–20° · Chuva moderada         ← WeatherStrip day offset=2
─────────────────────
08:00  Entrega proposta FAPERJ
```

## Helper: `getDayForecast`

**File:** `src/utils/weatherUtils.ts`

```typescript
getDayForecast(forecast, dayOffset) → {
  minTemp: number
  maxTemp: number
  dominantCode: number
  conditionText: string    // PT-BR WMO description
  currentTemp?: number     // only for dayOffset=0
  currentCode?: number     // only for dayOffset=0
} | null
```

- Slices `hourly.time[]` by day using dayOffset
- Calculates min/max from `temperature_2m`
- Finds most frequent WMO code
- Maps WMO code → Lucide icon + PT-BR text
- Returns null if insufficient data

## Error Handling

- No forecast data → component returns null (zero space)
- No location → no weather anywhere (consistent behavior)
- Partial data for day 2 → shows what's available or hides
- API failure → graceful degradation, no error UI in header/agenda

## Files Changed

| File | Action |
|------|--------|
| `src/components/features/WeatherStrip.tsx` | CREATE — new component |
| `src/utils/weatherUtils.ts` | CREATE — getDayForecast + WMO maps |
| `src/pages/VidaPage.tsx` | MODIFY — add strip to header, remove card |
| `src/components/features/NextTwoDaysView.tsx` | MODIFY — add strip to day sections |
| `src/views/AgendaView.tsx` | MODIFY — pass forecast prop |
| `src/modules/atlas/components/WeatherInsightCard.tsx` | KEEP — not deleted, may be used elsewhere |
