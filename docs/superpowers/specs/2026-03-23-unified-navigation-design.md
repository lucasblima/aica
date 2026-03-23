# Unified Navigation System — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Scope:** 7 pages (Wave 1+2)

## Problem

AICA has 3 inconsistent header patterns:
- **VidaPage**: HeaderGlobal with identity bar (logo, CP, streak, avatar)
- **Focused modules** (Flux, Finance, Grants): Inline "← VOLTAR" + module title, no global identity
- **Detail views** (SpaceDetail): Minimal back arrow + inline title, yet another pattern

Users lose context ("am I still in Aica?"), back navigation is unpredictable, and there's no clear hierarchy indicator. The BottomNav disappears in focused modules without a clear wayfinding alternative.

## Architectural Context: Dual Navigation System

AICA has two navigation mechanisms running in parallel:
- **ViewState system**: `currentView` state in `AppRouter.tsx` — used by Finance (`'finance'`), Grants (`'grants'`), Journey (`'journey'`), and some life area modules. These render at the root URL `/`.
- **React Router**: URL-based routes — used by Flux (`/flux`), Connections (`/connections`), Contacts (`/contacts`), Studio (`/studio`).

**Decision**: UnifiedHeader receives breadcrumbs as **explicit props** from each page, NOT derived from URL. This avoids the dual-system problem entirely. Each page knows its own depth and passes it:

```tsx
// VidaPage (Level 0 — no breadcrumbs)
<UnifiedHeader title="Minha Vida" />

// FluxDashboard (Level 1 — route-based)
<UnifiedHeader title="Flux" breadcrumbs={[]} />

// GrantsModuleView (Level 1 — ViewState-based, same API)
<UnifiedHeader title="Captação" breadcrumbs={[]} />

// SpaceDetailView (Level 2)
<UnifiedHeader title={space.name} breadcrumbs={[{ label: 'Conexões', onClick: () => navigate('/connections') }]} />
```

**Logo click**: Always calls `navigate('/')`. For ViewState-based pages, `AppRouter` already syncs URL `/` → `setCurrentView('vida')` via its existing `useEffect`. No coupling needed.

**`onBack` props**: Remove from all in-scope pages. The UnifiedHeader logo replaces all back navigation. Out-of-scope pages keep their `onBack` unchanged.

## Solution: UnifiedHeader

A single header component used across all pages, adapting to navigation depth.

### Navigation Depth Levels

**Level 0 — Home (VidaPage)**
```
┌─────────────────────────────────────────┐
│ [A] LIFE OS                 🔔 [⚙️][👤]│
│     Minha Vida                          │
├─────────────────────────────────────────┤
│ [4] ████░░░░░░░░░  1,751 CP     🔥 9d  │  ← IdentityBar addon
└─────────────────────────────────────────┘
```

After scroll (>80px), identity bar slides up (translateY + opacity), header compacts:
```
┌─────────────────────────────────────────┐
│ [A] Minha Vida           🔥9 [⚙️][👤] │
└─────────────────────────────────────────┘
```

**Level 1 — Module (Flux, Finance, Grants, Connections)**
```
┌─────────────────────────────────────────┐
│ [A] › Flux               🔥9 [⚙️][👤] │
└─────────────────────────────────────────┘
```

After scroll, right actions fade, breadcrumb centers:
```
┌─────────────────────────────────────────┐
│           [A] › Flux                    │
└─────────────────────────────────────────┘
```

**Level 2 — Detail (SpaceDetail, AthleteDetail)**
```
┌─────────────────────────────────────────┐
│ [A] › Conexões › Lucas Fit        [⋮]  │
└─────────────────────────────────────────┘
```

### Key Behaviors

1. **Logo "A" = Home**: Clicking the Aica logo always calls `navigate('/')`. Replaces all "← VOLTAR" buttons. Universal and predictable.

2. **Breadcrumb is clickable**: Each segment navigates to that level. `[A] › Flux › Atleta` — clicking "Flux" goes to FluxDashboard.

3. **Scroll collapse**:
   - **Trigger**: `scrollY > 80px` → collapsed; any scroll up > 20px → expanded
   - **CSS**: `position: sticky; top: 0; z-index: 40`
   - **Home expanded height**: ~96px (header + identity bar). Collapsed: ~48px
   - **Module/Detail height**: ~48px always (no identity bar). Collapsed: ~36px centered
   - **Animation**: `transition: all 200ms ease-out`. Identity bar uses `transform: translateY(-100%) + opacity: 0`
   - **Scroll up restore**: When user scrolls up more than 20px, header expands back

4. **BottomNav smart hide**: Visible on 5 hub pages (Vida, Meu Dia, Jornada, Conexoes, Pessoas). Hidden on focused modules (level 1+). **This IS a behavior change for ConnectionsPage** which currently shows BottomNav — it will now hide it since Connections becomes a Level 1 module view. BottomNav logic in `AppRouter` needs `'connections'` added to `focusedModes`.

### UnifiedHeader Props

```typescript
interface UnifiedHeaderProps {
  // Current page title (displayed bold)
  title: string;

  // Optional subtitle (shown in expanded state only, e.g. "LIFE OS")
  subtitle?: string;

  // Breadcrumb segments (empty array = Level 1, undefined = Level 0 Home)
  breadcrumbs?: Array<{
    label: string;
    onClick: () => void;
  }>;

  // Right-side actions slot (SettingsMenu, kebab, etc.)
  actions?: React.ReactNode;

  // Identity bar addon (Home only)
  identityBar?: {
    level: number;
    levelName: string;
    levelColor: string;
    progressPercentage: number;
    totalPoints: number;
    currentStreak: number;
  };

  // User info (avatar + streak shown in header)
  avatarUrl?: string;
  currentStreak?: number;

  // Notification bell
  showNotifications?: boolean;

  // Scroll collapse behavior
  collapsible?: boolean; // default: true

  // Override logo click (for future use by Studio etc.)
  onLogoClick?: () => void; // default: navigate('/')
}
```

### Component Architecture

```
UnifiedHeader (new)
├── AicaLogo (clickable → home, or onLogoClick override)
├── Breadcrumbs (clickable segments with "›" separator)
├── Title (current page, bold)
├── RightActions (slot)
│   ├── StreakIndicator (compact "🔥 9")
│   ├── NotificationBell (via AgentNotificationBell)
│   ├── InviteBadge (moved from HeaderGlobal)
│   └── SettingsMenu (moved from HeaderGlobal — avatar, logout, file search)
└── IdentityBar (addon, Home only, collapsible)
    ├── LevelBadge
    ├── XPProgressBar
    └── StreakCounter (full, not compact)
```

**SettingsMenu and InviteBadge**: These existing components move from HeaderGlobal into UnifiedHeader's `actions` slot. On Home, all are shown. On modules, pages pass only what's relevant (typically just SettingsMenu). On detail views, pages can pass a kebab menu instead.

### Responsive / Mobile

Breadcrumbs truncate on narrow screens:
- **< 360px**: `[A] › ... › {current}` (intermediate segments collapse to ellipsis)
- **360-480px**: Show up to 2 segments + current
- **> 480px**: Full breadcrumb

Implemented via CSS `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on the breadcrumb container, with flex-shrink on intermediate segments.

### Accessibility

- Breadcrumb wrapped in `<nav aria-label="Navegação">` with `aria-current="page"` on last segment
- Logo has `aria-label="Ir para página inicial"`
- Keyboard: all breadcrumb segments focusable, Tab order: Logo → breadcrumbs → actions
- Focus ring: `focus-visible:ring-2 focus-visible:ring-amber-400/60`

## Scope — 7 Pages

### Wave 1: High Priority (most used pages)

| Page | Current State | Change |
|------|--------------|--------|
| **VidaPage** | HeaderGlobal + IdentityBar | Replace with UnifiedHeader + identityBar addon + SettingsMenu/InviteBadge in actions |
| **FluxDashboard** | Inline "← VOLTAR" + title | Remove back button, add `<UnifiedHeader title="Flux" breadcrumbs={[]} />` |
| **FinanceDashboard** | Inline "← VOLTAR" + title (ViewState-based at `/`) | Remove back button + `onBack` prop, add UnifiedHeader. Entry via ViewState unchanged. |
| **GrantsModuleView** | Inline "← VOLTAR" + title (ViewState-based at `/`) | Remove back button + `onBack` prop, add UnifiedHeader. Entry via ViewState unchanged. |

### Wave 2: Medium Priority

| Page | Current State | Change |
|------|--------------|--------|
| **ContactsView** | HeaderGlobal without identity | Replace with `<UnifiedHeader title="Pessoas" breadcrumbs={[]} />` |
| **ConnectionsPage** | No header, BottomNav visible | Add UnifiedHeader. **BottomNav will now hide** (Connections becomes Level 1). |
| **SpaceDetailView** | Minimal arrow + inline title | Replace with `<UnifiedHeader title={name} breadcrumbs={[{label:'Conexões', onClick}]} />` |

### Flux Sub-Routes (deferred to Wave 3)

Flux has 10+ sub-routes (`/flux/athlete/:id`, `/flux/canvas`, `/flux/alerts`, etc.). These currently have no header at all. Adding Level 2 breadcrumbs (`[A] › Flux › Atletas`) to these is desirable but deferred to avoid scope explosion. The FluxDashboard Level 1 header is the priority.

### Out of Scope (future waves)

- **StudioMainView** — Complex FSM, own header system. HeaderGlobal stays for Studio.
- **AgendaPageShell** — Integrated date picker header
- **JourneyFullScreen** — Immersive header
- **AthletePortalView** — Public portal, independent header
- **EraForgeMainView** — Game UI

## HeaderGlobal Migration Strategy

**HeaderGlobal.tsx is NOT deleted.** It continues to be used by out-of-scope pages (Studio, and any page not yet migrated). The migration is:

1. Create `UnifiedHeader.tsx` as a new, independent component
2. Migrate in-scope pages from HeaderGlobal → UnifiedHeader one by one
3. HeaderGlobal stays untouched for Studio and other consumers
4. Future wave: once all pages use UnifiedHeader, deprecate HeaderGlobal

This avoids breaking out-of-scope modules.

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/UnifiedHeader.tsx` | Main header component |
| `src/hooks/useScrollCollapse.ts` | Scroll position tracking for collapse/expand |

**No `useBreadcrumbs` hook needed** — breadcrumbs are explicit props, not derived.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/VidaPage.tsx` | Replace HeaderGlobal with UnifiedHeader + identityBar + actions |
| `src/modules/flux/views/FluxDashboard.tsx` | Remove back button, add UnifiedHeader |
| `src/modules/finance/views/FinanceDashboard.tsx` | Remove back button + onBack prop, add UnifiedHeader |
| `src/modules/grants/views/GrantsModuleView.tsx` | Remove back button + onBack prop, add UnifiedHeader |
| `src/pages/ContactsView.tsx` | Replace HeaderGlobal with UnifiedHeader |
| `src/pages/ConnectionsPage.tsx` | Add UnifiedHeader |
| `src/modules/connections/views/SpaceDetailView.tsx` | Replace custom header with UnifiedHeader |
| `src/router/AppRouter.tsx` | Add `'connections'` to focusedModes for BottomNav smart-hide |

**HeaderGlobal.tsx and BottomNav.tsx are NOT modified.**

## Testing Strategy

- Visual/CSS changes — verify with build + visual inspection (TDD exception per code-patterns.md)
- `useScrollCollapse` hook — unit test: returns `isCollapsed: false` at scroll 0, `true` at scroll 100, `false` again after scroll-up > 20px
- E2E: navigate Home → Flux → (verify breadcrumb `[A] › Flux`) → click [A] → (verify returns to Home)
- Regression: verify Studio still works with HeaderGlobal unchanged
- Mobile: verify breadcrumb truncation at 360px viewport

## Design Principles (Jony Ive)

1. **Remove until only the essential remains** — one header, one back mechanism (logo), one hierarchy indicator (breadcrumb)
2. **Predictability over flexibility** — logo always = home, breadcrumb always = navigation, everywhere
3. **Progressive disclosure** — full header on arrival, compact on engagement (scroll collapse)
4. **Continuity** — Aica identity (logo, avatar, streak) visible on every page, never "another app"
