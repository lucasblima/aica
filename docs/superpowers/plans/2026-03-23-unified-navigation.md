# Unified Navigation System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 3 inconsistent header patterns with a single UnifiedHeader component across 7 pages, adding breadcrumb navigation, scroll collapse, and consistent back-to-home via logo.

**Architecture:** New `UnifiedHeader` component receives breadcrumbs as explicit props (not derived from URL). Each page declares its own depth. `HeaderGlobal` is NOT deleted — it stays for out-of-scope pages (Studio). A `useScrollCollapse` hook handles sticky header collapse/expand behavior.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, React Router

**Spec:** `docs/superpowers/specs/2026-03-23-unified-navigation-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/hooks/useScrollCollapse.ts` | Create | Hook: tracks scroll position, returns `isCollapsed` boolean |
| `src/components/layout/UnifiedHeader.tsx` | Create | Header component: logo + breadcrumb + title + actions + identity bar |
| `src/pages/VidaPage.tsx` | Modify | Replace `HeaderGlobal` with `UnifiedHeader` |
| `src/modules/flux/views/FluxDashboard.tsx` | Modify | Remove "← VOLTAR", add `UnifiedHeader` |
| `src/modules/finance/views/FinanceDashboard.tsx` | Modify | Remove back button + `onBack` prop, add `UnifiedHeader` |
| `src/modules/grants/views/GrantsModuleView.tsx` | Modify | Remove top-level back button, add `UnifiedHeader`. Keep internal `onBack` for sub-view navigation. |
| `src/pages/ContactsView.tsx` | Modify | Replace `HeaderGlobal` with `UnifiedHeader` |
| `src/pages/ConnectionsPage.tsx` | Modify | Add `UnifiedHeader` |
| `src/modules/connections/views/SpaceDetailView.tsx` | Modify | Replace custom arrow header with `UnifiedHeader` breadcrumb |
| `src/router/AppRouter.tsx` | Modify | Add `'connections'` to `focusedModes` array (line 603) |

---

## Task 1: Create `useScrollCollapse` Hook

**Files:**
- Create: `src/hooks/useScrollCollapse.ts`
- Test: `src/hooks/__tests__/useScrollCollapse.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useScrollCollapse.test.ts
import { renderHook, act } from '@testing-library/react';
import { useScrollCollapse } from '../useScrollCollapse';

describe('useScrollCollapse', () => {
  let scrollY = 0;

  beforeEach(() => {
    scrollY = 0;
    Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
  });

  it('returns isCollapsed false at scroll 0', () => {
    const { result } = renderHook(() => useScrollCollapse());
    expect(result.current.isCollapsed).toBe(false);
  });

  it('returns isCollapsed true after scrolling past threshold', () => {
    const { result } = renderHook(() => useScrollCollapse({ threshold: 80 }));
    act(() => {
      scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.isCollapsed).toBe(true);
  });

  it('returns isCollapsed false after scrolling back up', () => {
    const { result } = renderHook(() => useScrollCollapse({ threshold: 80, restoreThreshold: 20 }));
    // Scroll down
    act(() => {
      scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.isCollapsed).toBe(true);
    // Scroll up 30px
    act(() => {
      scrollY = 70;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.isCollapsed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useScrollCollapse.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/hooks/useScrollCollapse.ts
import { useState, useEffect, useRef } from 'react';

interface UseScrollCollapseOptions {
  threshold?: number;       // px to scroll before collapsing (default: 80)
  restoreThreshold?: number; // px to scroll up before restoring (default: 20)
  enabled?: boolean;         // disable collapse behavior (default: true)
}

export function useScrollCollapse(options: UseScrollCollapseOptions = {}) {
  const { threshold = 80, restoreThreshold = 20, enabled = true } = options;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const highestScrollY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY > threshold && currentY > lastScrollY.current) {
        // Scrolling down past threshold
        setIsCollapsed(true);
        highestScrollY.current = currentY;
      } else if (isCollapsed && highestScrollY.current - currentY > restoreThreshold) {
        // Scrolled up more than restoreThreshold
        setIsCollapsed(false);
      }

      if (currentY > highestScrollY.current) {
        highestScrollY.current = currentY;
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, restoreThreshold, enabled, isCollapsed]);

  return { isCollapsed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useScrollCollapse.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useScrollCollapse.ts src/hooks/__tests__/useScrollCollapse.test.ts
git commit -m "feat(navigation): add useScrollCollapse hook with TDD"
```

---

## Task 2: Create `UnifiedHeader` Component

**Files:**
- Create: `src/components/layout/UnifiedHeader.tsx`

This is a visual/CSS component — TDD exception per code-patterns.md. Verify with build + visual inspection.

- [ ] **Step 1: Create UnifiedHeader component**

```tsx
// src/components/layout/UnifiedHeader.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../ui';
import { SettingsMenu } from './SettingsMenu';
import { AgentNotificationBell, InviteBadge, InviteModal } from '../features';
import { useScrollCollapse } from '@/hooks/useScrollCollapse';

interface BreadcrumbSegment {
  label: string;
  onClick: () => void;
}

interface IdentityBarProps {
  level: number;
  levelName: string;
  levelColor: string;
  progressPercentage: number;
  totalPoints: number;
  currentStreak: number;
}

interface UnifiedHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbSegment[];
  actions?: React.ReactNode;
  identityBar?: IdentityBarProps;
  avatarUrl?: string;
  currentStreak?: number;
  showNotifications?: boolean;
  collapsible?: boolean;
  onLogoClick?: () => void;
  // Pass-through for SettingsMenu
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  onNavigateToFileSearch?: () => void;
  onOpenProfile?: () => void;
}

export function UnifiedHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  identityBar,
  avatarUrl,
  currentStreak,
  showNotifications = true,
  collapsible = true,
  onLogoClick,
  userEmail,
  userName,
  onLogout,
  onNavigateToFileSearch,
  onOpenProfile,
}: UnifiedHeaderProps) {
  const navigate = useNavigate();
  const { isCollapsed } = useScrollCollapse({ enabled: collapsible });
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleLogoClick = onLogoClick || (() => navigate('/'));
  const isHome = breadcrumbs === undefined;
  const isModule = breadcrumbs !== undefined && breadcrumbs.length === 0;

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-ceramic-base/95 backdrop-blur-sm transition-all duration-200 ease-out"
      >
        {/* Main header row */}
        <div
          className={`flex items-center justify-between px-6 transition-all duration-200 ease-out ${
            isCollapsed
              ? isModule ? 'py-2 justify-center' : 'py-2'
              : 'pt-6 pb-3'
          }`}
        >
          {/* Left: Logo + Breadcrumb + Title */}
          <div className={`flex items-center gap-2 min-w-0 ${
            isCollapsed && isModule ? 'justify-center' : ''
          }`}>
            <button
              onClick={handleLogoClick}
              className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded-lg"
              aria-label="Ir para página inicial"
            >
              <Logo
                variant="default"
                width={isCollapsed ? 28 : 36}
                className="rounded-lg transition-all duration-200"
              />
            </button>

            {/* Breadcrumbs */}
            {breadcrumbs !== undefined && (
              <nav aria-label="Navegação" className="flex items-center gap-1 min-w-0">
                <span className="text-ceramic-text-secondary text-xs flex-shrink-0">›</span>
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    <button
                      onClick={crumb.onClick}
                      className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors truncate max-w-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded"
                    >
                      {crumb.label}
                    </button>
                    <span className="text-ceramic-text-secondary text-xs flex-shrink-0">›</span>
                  </React.Fragment>
                ))}
                <span
                  className={`font-bold text-ceramic-text-primary truncate transition-all duration-200 ${
                    isCollapsed ? 'text-sm' : 'text-base'
                  }`}
                  aria-current="page"
                >
                  {title}
                </span>
              </nav>
            )}

            {/* Home title (no breadcrumbs) */}
            {isHome && (
              <div className={`transition-all duration-200 ${isCollapsed ? 'ml-1' : 'ml-2'}`}>
                {!isCollapsed && subtitle && (
                  <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5 text-etched">
                    {subtitle}
                  </p>
                )}
                <h1
                  className={`font-black text-ceramic-text-primary text-etched tracking-tight transition-all duration-200 ${
                    isCollapsed ? 'text-sm' : 'text-2xl'
                  }`}
                >
                  {title}
                </h1>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <AnimatePresence>
            {!(isCollapsed && isModule) && (
              <motion.div
                className="flex items-center gap-2 flex-shrink-0"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {currentStreak != null && currentStreak > 0 && (
                  <div className="flex items-center gap-0.5 text-xs text-ceramic-warning font-semibold">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{currentStreak}</span>
                  </div>
                )}

                {actions ? (
                  actions
                ) : (
                  <>
                    {showNotifications && <AgentNotificationBell />}
                    <InviteBadge onClick={() => setShowInviteModal(true)} />
                    <SettingsMenu
                      userEmail={userEmail}
                      avatarUrl={avatarUrl}
                      userName={userName}
                      onLogout={onLogout}
                      onNavigateToFileSearch={onNavigateToFileSearch}
                      onOpenProfile={onOpenProfile}
                    />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Identity Bar (Home only, collapsible) */}
        {identityBar && (
          <motion.div
            className="px-6 pb-3 overflow-hidden"
            animate={{
              height: isCollapsed ? 0 : 'auto',
              opacity: isCollapsed ? 0 : 1,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <button
                onClick={onOpenProfile}
                className="flex-shrink-0 ceramic-avatar-recessed rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                aria-label="Abrir perfil"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName || 'Avatar'} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: identityBar.levelColor || '#d97706' }}
                  >
                    {(userName || userEmail || '??').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </button>

              {/* Level Badge */}
              <div className="ceramic-badge-gold flex items-center gap-1 px-2 py-0.5 flex-shrink-0">
                <span className="text-sm font-black">{identityBar.level}</span>
                <span className="text-[10px] font-medium">{identityBar.levelName}</span>
              </div>

              {/* XP Progress Bar */}
              <div className="flex-1 min-w-0">
                <div
                  className="ceramic-progress-groove"
                  role="progressbar"
                  aria-valuenow={identityBar.progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso XP"
                >
                  <motion.div
                    className="ceramic-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${identityBar.progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-ceramic-text-secondary">
                    {identityBar.totalPoints.toLocaleString()} CP
                  </span>
                  <span className="text-[10px] text-ceramic-text-secondary">
                    {identityBar.progressPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Streak Badge */}
              {identityBar.currentStreak > 0 && (
                <div className="ceramic-inset-sm flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0">
                  <Flame className="w-3.5 h-3.5 text-ceramic-warning" />
                  <span className="text-[10px] font-bold text-ceramic-text-primary">
                    {identityBar.currentStreak}d
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Bottom border */}
        <div className="h-px bg-ceramic-border/30" />
      </header>

      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
    </>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build && npm run typecheck`
Expected: exit 0, 0 errors

- [ ] **Step 3: Add barrel export**

Add to `src/components/layout/index.ts`:
```typescript
export { UnifiedHeader } from './UnifiedHeader';
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/UnifiedHeader.tsx src/components/layout/index.ts
git commit -m "feat(navigation): create UnifiedHeader component"
```

---

## Task 3: Migrate VidaPage to UnifiedHeader

**Files:**
- Modify: `src/pages/VidaPage.tsx` — replace HeaderGlobal import and usage

- [ ] **Step 1: Replace HeaderGlobal with UnifiedHeader**

In `src/pages/VidaPage.tsx`:

1. Replace import: `import { HeaderGlobal } from '../components'` → `import { UnifiedHeader } from '@/components/layout/UnifiedHeader'`
2. Find the `<HeaderGlobal ... />` usage and replace with `<UnifiedHeader>` passing equivalent props:

```tsx
<UnifiedHeader
  title="Minha Vida"
  subtitle="LIFE OS"
  identityBar={levelData ? {
    level: levelData.level,
    levelName: levelData.name,
    levelColor: levelData.color,
    progressPercentage: levelData.progressPercentage,
    totalPoints: cpStats?.totalCP ?? 0,
    currentStreak: currentStreak ?? 0,
  } : undefined}
  avatarUrl={avatarUrl}
  currentStreak={currentStreak}
  userEmail={user?.email}
  userName={userName}
  onLogout={handleLogout}
  onNavigateToFileSearch={onNavigateToFileSearch}
  onOpenProfile={() => setProfileDrawerOpen(true)}
/>
```

Note: Map existing HeaderGlobal props to UnifiedHeader props. The identity bar props come from the same gamification data already computed in VidaPage.

- [ ] **Step 2: Remove HeaderGlobal import if no longer used anywhere in this file**

- [ ] **Step 3: Verify build passes**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Visual verification — open dev server, check VidaPage header renders correctly**

Run: `npm run dev` → open http://localhost:5173 → verify:
- Logo + "LIFE OS" + "Minha Vida" visible
- Identity bar (level, CP, streak) renders below
- Notifications, invite badge, settings menu in top-right
- Scroll down: identity bar collapses, header compacts
- Scroll up: identity bar restores

- [ ] **Step 5: Commit**

```bash
git add src/pages/VidaPage.tsx
git commit -m "refactor(vida): migrate VidaPage from HeaderGlobal to UnifiedHeader"
```

---

## Task 4: Migrate FluxDashboard to UnifiedHeader

**Files:**
- Modify: `src/modules/flux/views/FluxDashboard.tsx`

- [ ] **Step 1: Replace inline back button with UnifiedHeader**

1. Add import: `import { UnifiedHeader } from '@/components/layout/UnifiedHeader';`
2. Remove `ArrowLeft` from lucide imports (keep if used elsewhere in file — check `ArrowLeft` occurrences)
3. Find the back button block (~lines 88-97):
```tsx
<button
  onClick={() => navigate('/')}
  className="mb-4 flex items-center gap-2 text-ceramic-text-secondary..."
>
  <div className="w-8 h-8 ceramic-inset..."><ArrowLeft .../></div>
  <span ...>Voltar</span>
</button>
```
Replace with:
```tsx
<UnifiedHeader title="Flux" breadcrumbs={[]} />
```

4. The module title block with emoji + "LUCAS FIT" / "Flux" stays below the UnifiedHeader as module-specific content.

- [ ] **Step 2: Verify build passes**

Run: `npm run build && npm run typecheck`

- [ ] **Step 3: Visual verification**

Open `/flux` → verify:
- `[A] › Flux` breadcrumb in header
- Logo click navigates to home
- No more "← VOLTAR" button
- Module content (cards) unchanged

- [ ] **Step 4: Commit**

```bash
git add src/modules/flux/views/FluxDashboard.tsx
git commit -m "refactor(flux): replace VOLTAR with UnifiedHeader breadcrumb"
```

---

## Task 5: Migrate FinanceDashboard to UnifiedHeader

**Files:**
- Modify: `src/modules/finance/views/FinanceDashboard.tsx`
- Modify: `src/router/AppRouter.tsx` (TWO locations)

**Important:** FinanceDashboard is rendered at TWO places in AppRouter:
1. ViewState: `renderFinance()` (~line 581) with `onBack={() => setCurrentView('vida')}`
2. Route: `FinanceRoutePage` (~line 174) with `onBack={() => navigate('/')}`

Both must be updated.

- [ ] **Step 1: Remove `onBack` prop and back button from FinanceDashboard**

1. Add import: `import { UnifiedHeader } from '@/components/layout/UnifiedHeader';`
2. Remove `onBack` from `FinanceDashboardProps` interface (line 40)
3. Remove `onBack` from component destructuring (lines 64, 72-74)
4. Find the two back button blocks (~lines 459-466 and ~519-525) — both are:
```tsx
{onBack && (
  <button onClick={onBack} className="w-8 h-8 ceramic-inset...">
    <ArrowLeft ... />
  </button>
)}
```
Remove both. Add `<UnifiedHeader title="Financeiro" breadcrumbs={[]} />` at the top of the rendered content.

5. Keep `ArrowLeft` import — it's used for the month navigator arrows (lines 558, 574).

- [ ] **Step 2: Update AppRouter.tsx** — remove `onBack` prop from BOTH locations

1. Find `renderFinance()` (~line 581): remove `onBack={() => setCurrentView('vida')}`
2. Find `FinanceRoutePage` (~line 174): remove `onBack={() => navigate('/')}`

- [ ] **Step 3: Verify build passes**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/modules/finance/views/FinanceDashboard.tsx src/router/AppRouter.tsx
git commit -m "refactor(finance): replace back button with UnifiedHeader breadcrumb"
```

---

## Task 6: Migrate GrantsModuleView to UnifiedHeader

> **Note:** Tasks 5 and 6 both modify `AppRouter.tsx`. Execute sequentially, NOT in parallel.

**Files:**
- Modify: `src/modules/grants/views/GrantsModuleView.tsx`
- Modify: `src/router/AppRouter.tsx`

**Important:** Grants uses `onBack` for TWO purposes:
1. Top-level back to home (the "← VOLTAR" at line 732-741)
2. Internal sub-view navigation (back from edital detail to dashboard — lines 500-504, 665, 687, 708, 720)

We ONLY replace #1. Internal `handleBack` logic stays — it navigates between Grants sub-views.

- [ ] **Step 1: Add UnifiedHeader, change `onBack` to optional**

1. Add import: `import { UnifiedHeader } from '@/components/layout/UnifiedHeader';`
2. Change `GrantsModuleViewProps` from `onBack: () => void` to `onBack?: () => void` (line 64)
3. **Fix handleBack crash:** In `handleBack()` (~line 500-504), the `else` branch calls `onBack()` unconditionally. Change line 503 from `onBack()` to `navigate('/')` (since UnifiedHeader logo handles back-to-home, this fallthrough should just navigate home).
4. Find the top-level dashboard header (~lines 730-750) with the `<ArrowLeft>` back button and replace with:
```tsx
<UnifiedHeader title="Captação" breadcrumbs={[]} />
```
5. Keep all internal `handleBack` / `onBack` usage in sub-views (EditalDetailView, ProjectBriefingView, etc.) unchanged — these handle Grants internal navigation (dashboard ↔ edital detail ↔ briefing), NOT back-to-home.

- [ ] **Step 2: Update AppRouter.tsx** — remove `onBack` prop passed to GrantsModuleView

Find `onBack={() => setCurrentView('vida')}` and remove it.

- [ ] **Step 3: Verify build passes**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/modules/grants/views/GrantsModuleView.tsx src/router/AppRouter.tsx
git commit -m "refactor(grants): replace top-level back with UnifiedHeader breadcrumb"
```

---

## Task 7: Migrate ContactsView to UnifiedHeader

**Files:**
- Modify: `src/pages/ContactsView.tsx`

- [ ] **Step 1: Replace HeaderGlobal with UnifiedHeader**

1. Replace import: `HeaderGlobal` → `import { UnifiedHeader } from '@/components/layout/UnifiedHeader'`
2. Find `<HeaderGlobal title="Pessoas" ... />` and replace with:
```tsx
<UnifiedHeader title="Pessoas" breadcrumbs={[]} />
```
3. Remove any HeaderGlobal-specific props that don't map (ContactsView uses HeaderGlobal without identity bar).

- [ ] **Step 2: Verify build passes**

Run: `npm run build && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/pages/ContactsView.tsx
git commit -m "refactor(contacts): migrate ContactsView to UnifiedHeader"
```

---

## Task 8: Add UnifiedHeader to ConnectionsPage + BottomNav Smart-Hide

**Files:**
- Modify: `src/pages/ConnectionsPage.tsx`
- Modify: `src/router/AppRouter.tsx` (line 603-604)

- [ ] **Step 1: Add UnifiedHeader to ConnectionsPage**

1. Add import: `import { UnifiedHeader } from '@/components/layout/UnifiedHeader';`
2. Add at the top of the rendered content:
```tsx
<UnifiedHeader title="Conexões" breadcrumbs={[]} />
```

- [ ] **Step 2: Hide BottomNav on `/connections` route**

**Important:** `/connections` uses React Router (not ViewState), so adding to `focusedModes` has no effect. The BottomNav for `/connections` is controlled by `ConnectionsLayout` in AppRouter — a wrapper that includes its own BottomNav.

In `src/router/AppRouter.tsx`, find the `/connections` route that uses `ConnectionsLayout`. The fix is to conditionally hide BottomNav inside `ConnectionsLayout` when on the root `/connections` path (Level 1), but keep it for sub-routes IF needed. Since SpaceDetailView (`/connections/:spaceId`) also won't need BottomNav (Level 2), the simplest fix is to remove BottomNav from `ConnectionsLayout` entirely.

Find the `ConnectionsLayout` component and remove the `<BottomNav>` rendering from it. The BottomNav for `/contacts` (Pessoas) is rendered separately in `MainAppWithNavigation` and is NOT affected.

- [ ] **Step 3: Verify build passes**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/pages/ConnectionsPage.tsx src/router/AppRouter.tsx
git commit -m "refactor(connections): add UnifiedHeader + hide BottomNav in focused mode"
```

---

## Task 9: Migrate SpaceDetailView to UnifiedHeader Level 2

**Files:**
- Modify: `src/modules/connections/views/SpaceDetailView.tsx`

- [ ] **Step 1: Replace custom arrow header with UnifiedHeader breadcrumb**

1. Add import: `import { UnifiedHeader } from '@/components/layout/UnifiedHeader';`
2. Find the header block (~lines 97-177):
```tsx
<header className="px-6 pt-6 pb-4">
  <div className="flex items-center justify-between mb-4">
    <button onClick={() => navigate('/connections')} ...>
      <ArrowLeft ... />
    </button>
    ...kebab menu...
  </div>
  ...space info (icon, name, archetype, description)...
  ...tabs...
</header>
```
3. Replace the back arrow button and top bar with:
```tsx
<UnifiedHeader
  title={space?.name || 'Espaço'}
  breadcrumbs={[{ label: 'Conexões', onClick: () => navigate('/connections') }]}
  actions={/* move existing kebab/MoreVertical menu here */}
/>
```
4. Keep the space info (icon, name, archetype, description) and tabs BELOW the UnifiedHeader — these are content, not header.

- [ ] **Step 2: Remove ArrowLeft from imports if no longer used**

- [ ] **Step 3: Verify build passes**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/modules/connections/views/SpaceDetailView.tsx
git commit -m "refactor(connections): migrate SpaceDetailView to UnifiedHeader Level 2"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full build + typecheck**

Run: `npm run build && npm run typecheck`
Expected: exit 0, 0 errors

- [ ] **Step 2: Run test suite**

Run: `npm run test`
Expected: all tests pass including new useScrollCollapse tests

- [ ] **Step 3: Visual regression check**

Open dev server and navigate every migrated page:
1. `/` (VidaPage) — UnifiedHeader + identity bar + scroll collapse
2. `/flux` (FluxDashboard) — `[A] › Flux` breadcrumb, no "VOLTAR"
3. ViewState: Finance — `[A] › Financeiro` breadcrumb, no back arrow
4. ViewState: Grants — `[A] › Captação` breadcrumb, no back arrow
5. `/contacts` (ContactsView) — `[A] › Pessoas` breadcrumb
6. `/connections` (ConnectionsPage) — `[A] › Conexões`, no BottomNav
7. `/connections/:id` (SpaceDetailView) — `[A] › Conexões › {name}` Level 2
8. Click logo [A] from any page → verify navigates to home
9. Verify `/studio` still uses HeaderGlobal (regression check)

- [ ] **Step 4: Commit any final adjustments**

- [ ] **Step 5: Push branch and create PR**
