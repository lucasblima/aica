# VidaPage Redesign — Johnny Ive Edition

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild VidaPage with production quality matching Home.tsx, adding inline chat hero.

**Architecture:** VidaPage accepts the same HomeProps interface, composes HeaderGlobal + VidaChatHero + all existing rich module cards. VidaChatHero is the only new component. VidaPage lives at `/vida` for validation, then replaces `/` when approved.

**Tech Stack:** React 18, Framer Motion, Ceramic Design System, useChatSession hook

---

### Task 1: Create VidaChatHero component

**Files:**
- Create: `src/components/features/VidaChatHero/VidaChatHero.tsx`
- Create: `src/components/features/VidaChatHero/index.ts`

**Step 1: Create VidaChatHero.tsx**

Inline chat with neumorphic expand/collapse:
- Uses `useChatSession()` hook for messages/send
- Collapsed: `shadow-ceramic-emboss` input bar, amber send button
- Expanded: `AnimatePresence` chat area (max-h-[50vh]), messages scroll, X to collapse
- Bubbles: user `bg-amber-500 text-white rounded-br-md`, assistant `bg-ceramic-cool rounded-bl-md` with prose markdown via `formatMarkdownToHTML`
- Loading: `Loader2` spinner in assistant bubble
- Animation: `motion.div` with `initial={{height:0,opacity:0}}` → `animate={{height:'auto',opacity:1}}`

**Step 2: Create barrel index.ts**

```typescript
export { VidaChatHero } from './VidaChatHero'
```

**Step 3: Export from features barrel**

Add to `src/components/features/index.ts`:
```typescript
export { VidaChatHero } from './VidaChatHero'
```

---

### Task 2: Rewrite VidaPage.tsx as Home.tsx + VidaChatHero

**Files:**
- Modify: `src/pages/VidaPage.tsx` (full rewrite)

**Step 1: Rewrite VidaPage**

VidaPage accepts same `HomeProps` interface as Home.tsx. Layout:

1. HeaderGlobal (identical props as Home.tsx)
2. CreditBalanceWidget compact
3. **VidaChatHero** (NEW — inserted here)
4. JourneyHeroCard (custom index 0)
5. Module grid 2-col: Finance, Grants, Flux, Studio, Connections, Convites, Interviewer, EraForge, InviteShare
6. Hidden ModuleCards for generic module tracking
7. ExploreMoreSection for inactive modules
8. ProfileDrawer + InviteModal overlays

Copy animation variants (`cardVariants`), MODULE_REGISTRY, ICON_MAP, ACCENT_MAP from Home.tsx.
All hooks identical: `useConsciousnessPoints`, `useGrantsHomeQuery`, `useAuth`.
Navigation uses `onNavigateToView` prop (ViewState system).

---

### Task 3: Wire VidaPage into router

**Files:**
- Modify: `src/router/AppRouter.tsx`

**Step 1: Add renderVidaPage function**

Inside `MainAppWithNavigation`, add `renderVidaPage()` that passes same props as `renderVida()` but renders `<VidaPage>` instead of `<Home>`.

**Step 2: Update /vida route**

Change `/vida` route from standalone to using `renderVidaPage()` within the ViewState system, so navigation callbacks work.

---

### Task 4: Build verify + commit

**Step 1:** Run `npm run build` — must pass
**Step 2:** Commit with `feat(vida): redesign VidaPage with production quality + inline chat hero`
**Step 3:** Create PR, deploy staging
