# API Frontend Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the 5 already-built external APIs (Weather, Holidays, Geolocation, Turnstile, BrasilAPI) into the AICA frontend UI so users actually see and benefit from them.

**Architecture:** All backend infrastructure exists (Edge Functions, services, hooks, components). This plan ONLY modifies existing frontend files to import and render the ready-made components. No new services or hooks needed.

**Tech Stack:** React 18, TypeScript, Framer Motion, Ceramic Design System, `@marsidev/react-turnstile`, existing notification service.

**Design doc:** `docs/plans/2026-03-02-api-frontend-wiring-design.md`

---

## Dependency Graph

```
Task 1 (WeatherInsightCard compact mode) ── no deps
Task 2 (Wire WeatherInsightCard into VidaPage) ── depends on Task 1
Task 3 (Wire HolidayBadge into SwipeableTaskCard) ── no deps
Task 4 (Holiday toast in TaskBottomSheet) ── no deps
Task 5 (Install Turnstile package) ── no deps
Task 6 (Wire Turnstile into Login) ── depends on Task 5
Task 7 (Wire Location settings into ProfilePage) ── no deps
Task 8 (Typecheck + build verification) ── depends on all
```

Tasks 1, 3, 4, 5, 7 can run in parallel. Task 2 depends on 1. Task 6 depends on 5. Task 8 is final.

---

### Task 1: Add compact/collapsible mode to WeatherInsightCard

**Files:**
- Modify: `src/modules/atlas/components/WeatherInsightCard.tsx`

**Context:** The WeatherInsightCard currently has 4 states (loading, connect, complete, error) but no compact mode. The design requires a collapsible card for mobile: single-line "26°C — insight..." that expands on tap. The card should use `useState` for expand/collapse with a chevron indicator.

**Step 1: Add compact prop and expand state**

In `src/modules/atlas/components/WeatherInsightCard.tsx`, add these changes:

1. Add imports at the top, alongside existing lucide imports:
```typescript
import { Sun, Cloud, CloudRain, MapPin, ChevronDown } from 'lucide-react'
```

2. Change the component signature to accept a `compact` prop:
```typescript
interface WeatherInsightCardProps {
  compact?: boolean
}

export const WeatherInsightCard: React.FC<WeatherInsightCardProps> = ({ compact = false }) => {
```

3. Add expand state after the existing `showModal` state:
```typescript
const [expanded, setExpanded] = useState(!compact)
```

**Step 2: Replace the "Complete" state render (State 3) with responsive layout**

Replace the entire "State 3: Complete" section (the return block starting at approximately line 127 through line 147) with:

```typescript
  // State 3: Complete — show weather + insight
  const temp = getCurrentTemp(weather.forecast)
  const code = getCurrentWeatherCode(weather.forecast)
  const WeatherIcon = getWeatherIcon(code)

  // Compact mode: single-line collapsible
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-ceramic-base rounded-xl px-4 py-3 shadow-ceramic-emboss flex items-center gap-2 text-left"
      >
        <WeatherIcon className="w-4 h-4 text-amber-600 shrink-0" />
        {temp !== null && (
          <span className="text-sm font-medium text-ceramic-text-primary">
            {Math.round(temp)}°C
          </span>
        )}
        {insight && (
          <span className="text-sm text-ceramic-text-secondary truncate flex-1">
            — {insight}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-ceramic-text-secondary shrink-0" />
      </button>
    )
  }

  return (
    <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <WeatherIcon className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          {temp !== null && (
            <p className="text-sm font-medium text-ceramic-text-primary">
              {Math.round(temp)}°C
            </p>
          )}
          {insight && (
            <p className="text-sm text-ceramic-text-secondary">
              {insight}
            </p>
          )}
        </div>
        {compact && (
          <button onClick={() => setExpanded(false)} className="p-1">
            <ChevronDown className="w-4 h-4 text-ceramic-text-secondary rotate-180" />
          </button>
        )}
      </div>
    </div>
  )
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors in WeatherInsightCard.tsx

**Step 4: Commit**

```bash
git add src/modules/atlas/components/WeatherInsightCard.tsx
git commit -m "feat(atlas): add compact collapsible mode to WeatherInsightCard"
```

---

### Task 2: Wire WeatherInsightCard into VidaPage

**Files:**
- Modify: `src/pages/VidaPage.tsx`

**Context:** VidaPage is the home page of AICA. The WeatherInsightCard should appear after VidaUniversalInput (line ~219) and before Quick Stats (line ~222). Use the same `motion.div` animation pattern as other elements on this page.

**Step 1: Add import**

At the top of `src/pages/VidaPage.tsx`, after the existing module imports (around line 17), add:
```typescript
import { WeatherInsightCard } from '@/modules/atlas/components';
```

**Step 2: Add WeatherInsightCard between VidaUniversalInput and Quick Stats**

In the JSX, after the VidaUniversalInput `motion.div` block (which ends around line 219) and before the Quick Stats `{cpStats && (` block (around line 222), insert:

```typescript
            {/* Weather Insight — contextual climate card */}
            <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.08 }}
            >
               <WeatherInsightCard compact />
            </motion.div>
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 4: Run dev server and verify visually**

Run: `npm run dev`
Navigate to `/vida` — WeatherInsightCard should appear between universal input and stats. Since there's no location configured, it should show the "Connect" state with a MapPin icon and "Conectar" button.

**Step 5: Commit**

```bash
git add src/pages/VidaPage.tsx
git commit -m "feat(vida): wire WeatherInsightCard into home page"
```

---

### Task 3: Wire HolidayBadge into SwipeableTaskCard

**Files:**
- Modify: `src/components/domain/SwipeableTaskCard.tsx`

**Context:** SwipeableTaskCard renders each task in the Eisenhower matrix. The HolidayBadge should appear inline in the metadata row (line ~258), right after the due date display. Only renders if `task.due_date` exists; HolidayBadge itself returns null for non-holidays.

**Step 1: Add import**

At the top of `src/components/domain/SwipeableTaskCard.tsx`, add after existing imports:
```typescript
import { HolidayBadge } from '@/modules/atlas/components';
```

**Step 2: Add HolidayBadge next to due date**

In the metadata row section (around line 258-268), find the block:
```typescript
                    {formattedDueDate && (
                      <span
                        className={`text-xs flex items-center gap-1 ${
                          isOverdue ? 'text-ceramic-error font-semibold' : 'text-ceramic-text-secondary'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {formattedDueDate}
                      </span>
                    )}
```

Immediately after this closing `)}`, add:
```typescript
                    {task.due_date && <HolidayBadge date={task.due_date} />}
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/components/domain/SwipeableTaskCard.tsx
git commit -m "feat(atlas): wire HolidayBadge into task cards"
```

---

### Task 4: Add holiday toast warning in TaskBottomSheet

**Files:**
- Modify: `src/components/domain/TaskBottomSheet.tsx`

**Context:** When a user saves a task with a due_date that falls on a Brazilian holiday, show a warning notification. The notification service is at `src/services/notificationService.ts` with a `NotificationManager` class. Use `useHolidays` hook to check the date.

**Step 1: Add imports**

At the top of `src/components/domain/TaskBottomSheet.tsx`, add:
```typescript
import { useHolidays } from '@/hooks/useHolidays';
```

And find the existing import for `notificationService`. If it doesn't exist, add:
```typescript
import { notificationManager } from '@/services/notificationService';
```

**Step 2: Add useHolidays hook inside the component**

Inside the `TaskBottomSheet` component, after the existing hooks (around line 56-57), add:
```typescript
  const { isHoliday } = useHolidays();
```

**Step 3: Add holiday check in handleSave**

In the `handleSave` function (around line 171-197), after `await onSave(task.id, updates);` and before `onClose();`, add the holiday check:

```typescript
      // Check if saved due date is a holiday
      if (dueDate) {
        const holiday = isHoliday(dueDate);
        if (holiday) {
          const dateFormatted = new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR');
          notificationManager.show({
            type: 'warning',
            title: 'Feriado',
            message: `Atenção: ${dateFormatted} é ${holiday.local_name || holiday.name}`,
            duration: 5000,
          });
        }
      }
```

**Note:** Check the exact API of `notificationManager.show()` — it may be `notificationManager.addNotification()` or similar. Read the file at line 50+ for the method name.

**Step 4: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/components/domain/TaskBottomSheet.tsx
git commit -m "feat(atlas): add holiday warning toast on task save"
```

---

### Task 5: Install Turnstile package

**Files:**
- Modify: `package.json` (via npm install)

**Context:** Cloudflare Turnstile needs a React wrapper. `@marsidev/react-turnstile` is the standard choice (50k+ weekly downloads, maintained).

**Step 1: Install the package**

Run: `npm install @marsidev/react-turnstile`
Expected: Package added to `package.json` dependencies

**Step 2: Verify installation**

Run: `npm ls @marsidev/react-turnstile`
Expected: Shows the installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @marsidev/react-turnstile for CAPTCHA"
```

---

### Task 6: Wire Turnstile into Login page

**Files:**
- Modify: `src/components/layout/Login.tsx`

**Context:** Add Cloudflare Turnstile widget to the full-page login variant only (not the sheet variant). The widget is invisible by default (`managed` mode). The siteKey should come from an environment variable `VITE_TURNSTILE_SITE_KEY`. For now, use a test key for development: `1x00000000000000000000AA` (always passes). The token is captured but NOT yet sent to the backend (that requires auth flow changes which are a separate task).

**Step 1: Add Turnstile import and state**

At the top of `src/components/layout/Login.tsx`, add:
```typescript
import { Turnstile } from '@marsidev/react-turnstile';
```

Inside the `Login` component, after the `useGoogleAuth` hook call (line 17), add:
```typescript
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
```

**Step 2: Add Turnstile widget to full-page variant**

In the full-page variant (around line 176, after the error AnimatePresence closing tag and before the Google Login Button), add:

```typescript
        {/* Cloudflare Turnstile — invisible CAPTCHA */}
        <div className="mb-4 flex justify-center">
          <Turnstile
            siteKey={turnstileSiteKey}
            options={{ theme: 'light', size: 'invisible' }}
          />
        </div>
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/components/layout/Login.tsx
git commit -m "feat(auth): wire Cloudflare Turnstile into login page"
```

---

### Task 7: Wire Location settings into ProfilePage

**Files:**
- Modify: `src/views/ProfilePage.tsx`

**Context:** ProfilePage has a Settings tab that currently shows placeholder text "Configurações de conta em desenvolvimento...". Replace it with a Location section showing the user's current location (from `useUserLocation` hook) and a button to open `LocationConnectModal`.

**Step 1: Add imports**

At the top of `src/views/ProfilePage.tsx`, add:
```typescript
import { MapPin } from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { LocationConnectModal } from '@/modules/atlas/components';
```

**Step 2: Add hooks and state inside the component**

Inside the `ProfilePage` component, after the existing state declarations (around line 28), add:
```typescript
  const { location, isLoading: locationLoading } = useUserLocation();
  const [showLocationModal, setShowLocationModal] = useState(false);
```

**Step 3: Replace the settings tab content**

Find the settings tab content block (around line 152-160):
```typescript
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="ceramic-card p-8">
              <p className="text-sm text-[#948D82]">
                Configurações de conta em desenvolvimento...
              </p>
            </div>
          </div>
        )}
```

Replace it with:
```typescript
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            {/* Location Settings */}
            <div className="ceramic-card p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-[#5C554B]">Localização</h3>
              </div>

              {locationLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-[#A39E91]/20 rounded w-32" />
                  <div className="h-3 bg-[#A39E91]/20 rounded w-48" />
                </div>
              ) : location ? (
                <div className="space-y-2">
                  <p className="text-sm text-[#5C554B]">
                    <span className="font-medium">Cidade:</span> {location.city || 'Não detectada'}
                  </p>
                  <p className="text-sm text-[#948D82]">
                    <span className="font-medium">Fonte:</span>{' '}
                    {location.source === 'browser_geolocation'
                      ? 'Geolocalização do navegador'
                      : location.source === 'ip_lookup'
                        ? 'Detectado por IP'
                        : location.source === 'manual'
                          ? 'Configuração manual'
                          : 'Não configurada'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#948D82]">
                  Localização não configurada. Configure para receber insights de clima.
                </p>
              )}

              <button
                onClick={() => setShowLocationModal(true)}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                {location ? 'Alterar localização' : 'Configurar localização'}
              </button>
            </div>

            {/* Placeholder for future settings */}
            <div className="ceramic-card p-8">
              <p className="text-sm text-[#948D82]">
                Mais configurações em desenvolvimento...
              </p>
            </div>

            {showLocationModal && (
              <LocationConnectModal onClose={() => setShowLocationModal(false)} />
            )}
          </div>
        )}
```

**Step 4: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/views/ProfilePage.tsx
git commit -m "feat(profile): wire location settings into profile page"
```

---

### Task 8: Final verification — typecheck + build

**Files:** None (verification only)

**Step 1: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors (or only pre-existing errors unrelated to this work)

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Run existing tests**

Run: `npm run test -- --run`
Expected: All existing tests pass (including the 33 tests from PR #620)

**Step 4: Final commit if any fixes needed**

If typecheck or build revealed issues, fix them and commit:
```bash
git commit -m "fix: resolve typecheck issues from API frontend wiring"
```

---

## Summary

| Task | Files Modified | Commit Message |
|------|---------------|----------------|
| 1 | WeatherInsightCard.tsx | `feat(atlas): add compact collapsible mode to WeatherInsightCard` |
| 2 | VidaPage.tsx | `feat(vida): wire WeatherInsightCard into home page` |
| 3 | SwipeableTaskCard.tsx | `feat(atlas): wire HolidayBadge into task cards` |
| 4 | TaskBottomSheet.tsx | `feat(atlas): add holiday warning toast on task save` |
| 5 | package.json | `chore: add @marsidev/react-turnstile for CAPTCHA` |
| 6 | Login.tsx | `feat(auth): wire Cloudflare Turnstile into login page` |
| 7 | ProfilePage.tsx | `feat(profile): wire location settings into profile page` |
| 8 | (verification) | Fix commit if needed |
