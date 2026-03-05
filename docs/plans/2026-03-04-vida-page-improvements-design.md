# Vida Page Improvements — Design Doc

**Session:** feat-vida-page
**Date:** 2026-03-04
**Status:** Approved

## Summary

Three improvements to VidaPage:

1. **Restore AI Cost page** — recover deleted `UsageDashboardPage` from git history, add route + SettingsMenu link, remove `CreditBalanceWidget` from VidaPage
2. **JourneyHeroCard redesign** — streak badge inline with title, daily questions as horizontal carousel
3. **VidaPage loading performance** — remove duplicate hook, lazy-load non-critical data

---

## 1. Restore AI Cost Page

**Context:** `UsageDashboardPage.tsx` (810 lines) and `UsageStatsCard.tsx` were deleted in commit `c356315` (PR #647). The page showed usage logs, credit transactions, daily usage chart, and budget settings.

**Changes:**
- Restore `src/modules/billing/pages/UsageDashboardPage.tsx` from `c356315^`
- Restore `src/modules/billing/components/UsageStatsCard.tsx` from `c356315^`
- Add `/usage` route in `AppRouter.tsx`
- Add "Custos de IA" menu item in `SettingsMenu.tsx`
- Remove `CreditBalanceWidget` compact render from `VidaPage.tsx` (lines 198-202)
- Fix any broken imports after restoration

**Source commit:** `c356315^` (parent of deletion commit)

## 2. JourneyHeroCard Redesign

**Current layout:**
```
[Sparkles] Minha Jornada                    [>]
[🔥 Streak de X dias! Continue ativo...]
[Pergunta do dia: "...?"]
[input] [mic] [enviar]
```

**New layout:**
```
[Sparkles] Minha Jornada  [🔥 47 dias]     [>]
[← pergunta 1 | pergunta 2 | pergunta 3 →]
[input] [mic] [enviar]
```

**Changes:**
- Move streak badge inline with "Minha Jornada" title (flex row, gap)
- Replace single daily question with horizontal carousel (CSS scroll-snap, no library)
- Carousel shows available daily questions user hasn't answered yet

## 3. VidaPage Loading Performance

**Changes:**
- Remove `useConsciousnessPoints()` call inside `JourneyHeroCard` — already receives `cpStats` as prop from VidaPage
- Wrap non-critical data fetches (weather, grants module stats) with lazy loading — only fetch when component is near viewport or after initial render completes
- Keep CP stats and Life Score as priority fetches (above the fold)

---

## Files Affected

| File | Change |
|------|--------|
| `src/modules/billing/pages/UsageDashboardPage.tsx` | Restore from git |
| `src/modules/billing/components/UsageStatsCard.tsx` | Restore from git |
| `src/modules/billing/index.ts` | Re-export restored page |
| `src/router/AppRouter.tsx` | Add `/usage` route |
| `src/components/layout/SettingsMenu.tsx` | Add "Custos de IA" item |
| `src/pages/VidaPage.tsx` | Remove CreditBalanceWidget |
| `src/modules/journey/components/JourneyHeroCard.tsx` | Streak inline + carousel |
| `src/modules/journey/hooks/useDailyQuestion.ts` | May need to return multiple questions |

## Out of Scope

- Redesign of UsageDashboardPage UI (restore as-is, fix only broken imports)
- New features for the AI cost page
- Changes to CreditBalanceWidget component itself
