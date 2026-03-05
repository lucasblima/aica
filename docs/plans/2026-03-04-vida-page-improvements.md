# Vida Page Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore AI Cost page to settings, redesign JourneyHeroCard (inline streak + question carousel), and fix VidaPage loading performance.

**Architecture:** Three independent changes: (1) git-restore deleted page + wire route/menu, (2) refactor JourneyHeroCard layout with CSS scroll-snap carousel, (3) eliminate duplicate hooks and defer non-critical fetches.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, CSS scroll-snap

---

### Task 1: Restore UsageDashboardPage and UsageStatsCard from git

**Files:**
- Create: `src/modules/billing/pages/UsageDashboardPage.tsx` (restore from `c356315^`)
- Create: `src/modules/billing/components/UsageStatsCard.tsx` (restore from `c356315^`)

**Step 1: Restore files from git history**

```bash
cd /c/Users/lucas/repos/Aica_frontend
git show c356315^:src/modules/billing/pages/UsageDashboardPage.tsx > src/modules/billing/pages/UsageDashboardPage.tsx
git show c356315^:src/modules/billing/components/UsageStatsCard.tsx > src/modules/billing/components/UsageStatsCard.tsx
```

**Step 2: Verify restored files compile**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "UsageDashboard\|UsageStats" | head -20
```

Expected: Either no errors, or import errors to fix in Task 2.

**Step 3: Fix any broken imports in restored files**

Check that all imports in `UsageDashboardPage.tsx` still resolve:
- `@/components/ui` → `PageShell` (exists)
- `@/services/supabaseClient` → `supabase` (exists)
- `@/hooks/useAuth` → `useAuth` (exists)
- `@/hooks/useUserCredits` → `useUserCredits` (exists)
- `../components/UsageStatsCard` → just restored

Fix any that don't resolve.

**Step 4: Commit**

```bash
git add src/modules/billing/pages/UsageDashboardPage.tsx src/modules/billing/components/UsageStatsCard.tsx
git commit -m "feat(billing): restore UsageDashboardPage from git history

Restores the AI cost/usage analytics page that was removed in PR #647.
Includes usage logs, credit transactions, and daily usage chart.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Wire UsageDashboardPage into router, settings menu, and barrel export

**Files:**
- Modify: `src/modules/billing/index.ts` (add export)
- Modify: `src/router/AppRouter.tsx` (add `/usage` route near line 852)
- Modify: `src/components/layout/SettingsMenu.tsx` (add "Custos de IA" button after "Meu Plano" around line 176)

**Step 1: Add barrel export**

In `src/modules/billing/index.ts`, add after the existing page exports:

```typescript
export { default as UsageDashboardPage } from './pages/UsageDashboardPage';
```

Note: Check if UsageDashboardPage uses default export or named export and match accordingly. The original file used `export default function UsageDashboardPage`, so use default import.

**Step 2: Add route in AppRouter.tsx**

After the `/manage-subscription` route (line 852), add:

```tsx
<Route
   path="/usage"
   element={<ProtectedRoute><UsageDashboardPage /></ProtectedRoute>}
/>
```

Add the lazy import at the top of AppRouter.tsx where other billing imports are:

```tsx
const UsageDashboardPage = lazy(() => import('@/modules/billing/pages/UsageDashboardPage'));
```

Check if AppRouter already uses `lazy()` for billing pages — match the pattern.

**Step 3: Add SettingsMenu item**

In `src/components/layout/SettingsMenu.tsx`, after the "Meu Plano" button (line 176), add:

```tsx
{/* AI Cost / Usage Analytics */}
<button
    onClick={() => {
        navigate('/usage');
        setIsOpen(false);
    }}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
>
    <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
        <Activity className="w-4 h-4 text-ceramic-text-secondary group-hover:text-amber-500" />
    </div>
    <span className="font-bold text-sm transition-colors">
        Custos de IA
    </span>
</button>
```

Ensure `Activity` icon is imported from `lucide-react` at the top of the file. If not present, add it to the existing import.

**Step 4: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/modules/billing/index.ts src/router/AppRouter.tsx src/components/layout/SettingsMenu.tsx
git commit -m "feat(billing): wire UsageDashboardPage route and settings menu link

- Add /usage route in AppRouter
- Add 'Custos de IA' button in SettingsMenu after 'Meu Plano'
- Export UsageDashboardPage from billing barrel

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Remove CreditBalanceWidget from VidaPage

**Files:**
- Modify: `src/pages/VidaPage.tsx` (remove lines 197-202)

**Step 1: Remove the CreditBalanceWidget render block**

In `src/pages/VidaPage.tsx`, remove:

```tsx
         {/* Credit Balance - compact inline */}
         {userId && (
            <div className="px-6 pt-3 flex justify-end">
               <CreditBalanceWidget compact showStats={false} />
            </div>
         )}
```

**Step 2: Remove unused import**

In the import line (line 12), remove `CreditBalanceWidget` from the destructured imports:

```tsx
// Before:
import { HeaderGlobal, ProfileDrawer, ModuleCard, ExploreMoreSection, CreditBalanceWidget } from '../components';
// After:
import { HeaderGlobal, ProfileDrawer, ModuleCard, ExploreMoreSection } from '../components';
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/pages/VidaPage.tsx
git commit -m "fix(vida): remove CreditBalanceWidget from VidaPage

Credit balance is now accessible via Settings > Custos de IA page.
Frees up vertical space on the main hub.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: JourneyHeroCard — move streak badge inline with title

**Files:**
- Modify: `src/modules/journey/components/JourneyHeroCard.tsx`

**Step 1: Move streak inline with header**

Replace the current header section (lines 91-104) with a version that includes the streak badge inline:

```tsx
      {/* Header - clickable */}
      <motion.div
        className="flex items-center justify-between mb-4 cursor-pointer group"
        onClick={onOpenJourney}
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 300 }}
        role="button"
        aria-label="Abrir Minha Jornada"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-amber-600" />
          <h3 className="text-xl font-bold text-etched">Minha Jornada</h3>
          {/* Streak badge — inline */}
          {resolvedStats && (resolvedStats.current_streak || 0) > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-ceramic-warning/10 border border-ceramic-warning/20">
              <Flame className="h-3.5 w-3.5 text-ceramic-warning" />
              <span className="text-xs font-bold text-ceramic-warning">
                {resolvedStats.current_streak} dias
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-[#948D82] group-hover:text-[#5C554B] transition-colors" />
      </motion.div>
```

**Step 2: Remove the old standalone streak nudge block**

Remove lines 106-125 (the entire `{showStreakNudge && (...)}` block). The streak info is now in the header.

Also remove the `showStreakNudge` variable (line 53-55) and `hasMomentToday` (line 52) since they're no longer needed. Keep `lastMoment` only if used elsewhere — check if it's used. It's not used elsewhere, so remove `const lastMoment = moments[0]` (line 50) too.

Since `useMoments` was only used for the streak nudge check, remove the `useMoments` import and hook call (lines 18, 39) as well.

**Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/modules/journey/components/JourneyHeroCard.tsx
git commit -m "feat(journey): move streak badge inline with 'Minha Jornada' title

Streak now shows as a compact badge next to the title instead of
a separate warning block below. Removes useMoments dependency
since it was only used for the streak nudge.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: JourneyHeroCard — daily questions carousel

**Files:**
- Modify: `src/modules/journey/components/JourneyHeroCard.tsx`
- Modify: `src/modules/journey/hooks/useDailyQuestion.ts`

**Step 1: Add `useUnansweredQuestions` hook**

In `src/modules/journey/hooks/useDailyQuestion.ts`, add a new hook that returns multiple unanswered questions. Use the existing `getAllQuestionsWithResponses` service function:

```typescript
/**
 * useUnansweredQuestions Hook
 * Returns multiple unanswered questions for carousel display
 */
export function useUnansweredQuestions(limit: number = 5) {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuestionWithResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchQuestions = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const allQuestions = await getAllQuestionsWithResponses(user.id)
      const unanswered = allQuestions
        .filter(q => !q.user_response)
        .slice(0, limit)
      setQuestions(unanswered)
    } catch (err) {
      setError(err as Error)
      log.error('Error fetching unanswered questions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, limit])

  useEffect(() => {
    if (user?.id) {
      fetchQuestions()
    }
  }, [user?.id, fetchQuestions])

  return {
    questions,
    isLoading,
    error,
    refresh: fetchQuestions,
  }
}
```

**Step 2: Refactor JourneyHeroCard to use carousel**

In `JourneyHeroCard.tsx`, replace the single daily question section with a carousel:

1. Replace `useDailyQuestion` with `useUnansweredQuestions` + `answerQuestion` from service
2. Track `activeIndex` state for which question is selected
3. Render question cards in a horizontal scroll container with CSS snap

The carousel section (replacing lines 127-207):

```tsx
      {/* Daily Questions — carousel */}
      {questions.length > 0 && !answered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Scrollable question cards */}
          <div
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setActiveIndex(i)}
                className={`snap-start shrink-0 w-[85%] p-3 rounded-2xl border text-left transition-all ${
                  activeIndex === i
                    ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300'
                    : 'bg-ceramic-cool border-ceramic-border hover:border-amber-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageCircleQuestion className={`h-4 w-4 mt-0.5 shrink-0 ${
                    activeIndex === i ? 'text-amber-600' : 'text-ceramic-text-secondary'
                  }`} />
                  <p className={`text-sm font-medium line-clamp-2 ${
                    activeIndex === i ? 'text-[#5C554B]' : 'text-ceramic-text-secondary'
                  }`}>
                    {q.question_text}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Answer input for active question */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAnswerSubmit()
                }
              }}
              placeholder="Sua resposta..."
              disabled={isSubmitting}
              className="flex-1 bg-ceramic-cool rounded-xl px-3 py-2 text-sm text-[#5C554B] placeholder:text-ceramic-text-secondary/40 outline-none focus:ring-2 focus:ring-amber-400/30 disabled:opacity-60"
            />
            {speech.isSupported && (
              <button
                onClick={speech.toggle}
                disabled={isSubmitting}
                className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  speech.isListening
                    ? 'bg-ceramic-error text-white animate-pulse'
                    : 'bg-ceramic-cool text-amber-600 hover:bg-amber-100'
                } disabled:opacity-40`}
                aria-label={speech.isListening ? 'Parar gravacao' : 'Ditar resposta'}
              >
                {speech.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={handleAnswerSubmit}
              disabled={!answerText.trim() || isSubmitting}
              className="shrink-0 w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-amber-600 transition-colors"
              aria-label="Enviar resposta"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </motion.div>
      )}
```

Update state and handlers:

```tsx
const { questions } = useUnansweredQuestions(5)
const [activeIndex, setActiveIndex] = useState(0)
const [answerText, setAnswerText] = useState('')
const [answered, setAnswered] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)

const handleAnswerSubmit = async () => {
  const activeQuestion = questions[activeIndex]
  if (!answerText.trim() || isSubmitting || !activeQuestion) return
  try {
    setIsSubmitting(true)
    await answerQuestion(user!.id, {
      question_id: activeQuestion.id,
      response_text: answerText.trim(),
    })
    setAnswered(true)
    setAnswerText('')
  } catch {
    // error handled by service
  } finally {
    setIsSubmitting(false)
  }
}
```

Import `answerQuestion` from `../services/questionService` and `useUnansweredQuestions` from `../hooks/useDailyQuestion`. Remove old `useDailyQuestion` import.

**Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/modules/journey/components/JourneyHeroCard.tsx src/modules/journey/hooks/useDailyQuestion.ts
git commit -m "feat(journey): daily questions carousel in JourneyHeroCard

Replace single daily question with horizontal swipeable carousel
showing up to 5 unanswered questions. Uses CSS scroll-snap for
smooth snapping between cards.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: VidaPage loading performance — remove duplicate hook

**Files:**
- Modify: `src/modules/journey/components/JourneyHeroCard.tsx`

**Step 1: Remove internal useConsciousnessPoints fallback**

The component already accepts `stats` as prop. Remove the internal `useConsciousnessPoints` hook call and simplify:

Replace lines 35-37:
```tsx
  const internalCP = useConsciousnessPoints()
  const resolvedStats = statsProp !== undefined ? statsProp : internalCP.stats
  const isLoading = statsProp !== undefined ? false : internalCP.isLoading
```

With:
```tsx
  const resolvedStats = statsProp ?? null
  const isLoading = statsProp === undefined
```

Remove the `useConsciousnessPoints` import (line 17).

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add src/modules/journey/components/JourneyHeroCard.tsx
git commit -m "perf(journey): remove duplicate useConsciousnessPoints from JourneyHeroCard

JourneyHeroCard already receives cpStats as prop from VidaPage.
Remove internal hook call that caused a duplicate data fetch.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: VidaPage loading performance — defer non-critical fetches

**Files:**
- Modify: `src/pages/VidaPage.tsx`

**Step 1: Defer weather and grants data fetches**

Wrap the weather and grants hooks with deferred loading. Use a simple `useState` + `useEffect` with a short delay to let critical UI render first:

Add at the top of the component:
```tsx
const [deferredReady, setDeferredReady] = useState(false)

useEffect(() => {
  const timer = requestIdleCallback
    ? requestIdleCallback(() => setDeferredReady(true))
    : setTimeout(() => setDeferredReady(true), 100)
  return () => {
    if (typeof timer === 'number') {
      if (requestIdleCallback) cancelIdleCallback(timer)
      else clearTimeout(timer)
    }
  }
}, [])
```

Then gate the non-critical hooks:
```tsx
const { weather, insight: weatherInsight } = useWeatherInsight({ enabled: deferredReady })
const { data: grantsData } = useGrantsHomeQuery(deferredReady ? userId : undefined)
```

Check if `useWeatherInsight` accepts an `enabled` option. If not, use conditional call pattern: pass `undefined` or skip the hook result. The simplest approach: just pass `userId` as `undefined` to `useGrantsHomeQuery` when not ready (it already guards on userId).

For weather, if the hook doesn't accept `enabled`, just let it run — it uses React Query with 30min staleTime so it's already cached-friendly. Focus on grants which does a 3-part `Promise.all`.

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add src/pages/VidaPage.tsx
git commit -m "perf(vida): defer non-critical data fetches on VidaPage

Delay grants data fetch until after initial render using
requestIdleCallback. Critical data (CP stats, Life Score)
loads immediately while secondary data loads after first paint.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Final verification

**Step 1: Full build check**

```bash
npm run build && npm run typecheck
```

Expected: Both pass with no errors.

**Step 2: Manual smoke test**

```bash
npm run dev
```

Verify:
- [ ] VidaPage loads without CreditBalanceWidget at top
- [ ] Settings menu shows "Custos de IA" item
- [ ] Clicking "Custos de IA" opens `/usage` page with usage logs
- [ ] JourneyHeroCard shows streak badge inline with title
- [ ] Daily questions show as horizontal carousel
- [ ] Answering a question works
- [ ] Page loads feel snappier (no duplicate CP fetch)

**Step 3: Commit any final fixes and push**

```bash
git push -u origin feat-vida-page
```
