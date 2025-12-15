# Fluidity & Anchors - Navigation Audit Task List

**Created:** 2025-12-14
**Priority:** HIGH
**Estimated Effort:** 3-5 sprints

---

## Executive Summary

This document outlines a comprehensive navigation audit across the Aica application, organized into **4 parallel workstreams** that can be executed simultaneously by different specialist agents.

### Critical Issues Identified

1. **BottomNav inconsistency** - Only shows Vida/Agenda, missing Conexoes/Studio
2. **Breadcrumbs violation** - ConnectionsLayout uses breadcrumbs (violates NO BREADCRUMBS rule)
3. **Podcast Orphan Flow** - GuestIdentificationWizard has unclear cancel/completion paths
4. **Empty state dead ends** - "0 Convites" without creation CTAs
5. **ViewState limitation** - Types don't include `connections` as a valid view

---

## WORKSTREAM A: The Anchor Principle (Global vs. Contextual Navigation)

**Owner:** `general-purpose` (Frontend Core)
**Dependencies:** None (can start immediately)
**Priority:** P0 - Critical

### Tasks

- [ ] **A1. Audit BottomNav visibility**
  - File: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\components\BottomNav.tsx`
  - Current: Only 2 destinations (Vida, Agenda) with mic button
  - Issue: Missing Conexoes and Studio/Podcast global nav
  - Document which views show/hide BottomNav in App.tsx

- [ ] **A2. Refactor BottomNav to 4 Global Destinations**
  - Add `Conexoes` button (Users icon) -> navigates to `/connections`
  - Add `Studio` button (Mic or similar) -> navigates to Podcast/Studio
  - Update `ViewState` type in `types.ts` to include `connections`
  - Maintain floating ceramic-card design

- [ ] **A3. Implement Contextual Descent Pattern**
  - When entering focused modes (GuestIdentificationWizard, StudioMode, ProductionMode):
    - Global Nav retreats (hidden)
    - Header shows weighted "Back/Exit" action
  - Files to modify:
    - `src/views/PodcastCopilotView.tsx` (already has `onNavVisibilityChange`)
    - `src/modules/podcast/components/StudioLayout.tsx`
    - `src/modules/podcast/components/GuestIdentificationWizard.tsx`

- [ ] **A4. Enhance StudioLayout Header**
  - Current: Has ChevronLeft back button
  - Enhancement: Make back button more prominent (weighted)
  - Add "Sair do Studio" label on hover
  - Ensure consistent exit behavior across all Studio modes

- [ ] **A5. FIX CRITICAL: Podcast Orphan Flow**
  - File: `src/views/PodcastCopilotView.tsx`
  - Flow: Dashboard -> Wizard -> PreProduction
  - Issues to fix:
    - Wizard `onCancel` goes to `handleBackToDashboard` (OK)
    - Wizard `onComplete` goes to `preproduction` (OK)
    - BUT: Wizard is modal overlay without clear visual layer
  - Solution: Wrap wizard in StudioLayout OR show as full-page with header

### Acceptance Criteria (Workstream A)

- [ ] BottomNav visible on all top-level views (Vida, Agenda, Conexoes)
- [ ] BottomNav hidden during focused modes (Wizard, Studio, Production)
- [ ] All focused modes have visible, weighted Back/Exit in header
- [ ] User can always return without using browser back button

---

## WORKSTREAM B: The Law of Empty States

**Owner:** `gamification-agent` + `general-purpose` (UI)
**Dependencies:** None (can start immediately)
**Priority:** P1 - High

### Tasks

- [ ] **B1. Audit Conexoes Empty States**
  - Files to check:
    - `src/modules/connections/views/ConnectionsView.tsx` (has empty state at line 159-227)
    - `src/modules/connections/habitat/components/HabitatDashboard.tsx`
    - `src/modules/connections/ventures/views/VenturesHome.tsx`
    - `src/modules/connections/academia/views/AcademiaHome.tsx`
    - `src/modules/connections/tribo/views/TriboHome.tsx`
  - Document: Which show "0 items" vs inviting CTAs

- [ ] **B2. Create CeramicInsetCTA Component**
  - New file: `src/components/CeramicInsetCTA.tsx`
  - Props: `icon`, `title`, `description`, `ctaLabel`, `onAction`
  - Style: `.ceramic-inset` with tactile hover state
  - Variants: `default`, `prominent`, `subtle`

- [ ] **B3. Replace ConnectionsView Empty State**
  - Current: Shows archetype grid (good) but generic messaging
  - Enhancement:
    - Each archetype card should have specific value proposition
    - Add pulsing indicator on recommended first archetype
    - Track which archetype user hovers longest (for recommendations)

- [ ] **B4. Add Creation CTAs to Archetype Home Views**
  - VenturesHome: "Adicionar primeiro projeto" when no entities
  - HabitatDashboard: "Cadastrar propriedade" when no properties
  - TriboHome: "Criar primeiro ritual" when no rituals
  - AcademiaHome: "Iniciar jornada de aprendizado" when no journeys

- [ ] **B5. Audit Knowledge Base Empty States**
  - Files: `src/modules/journey/**/*.tsx`
  - Replace generic "Nenhum registro" with contextual creation CTAs
  - Use EmptyState component with appropriate type

### Acceptance Criteria (Workstream B)

- [ ] No empty state shows only "0 items" without action
- [ ] All empty states use `.ceramic-inset` styling
- [ ] CTAs are specific to the context (not generic "Criar novo")
- [ ] EmptyState component used consistently across modules

---

## WORKSTREAM C: Visual Hierarchy of Movement

**Owner:** `general-purpose` (Frontend Core)
**Dependencies:** Workstream A (nav changes)
**Priority:** P1 - High

### Tasks

- [ ] **C1. Remove Breadcrumbs from ConnectionsLayout**
  - File: `src/modules/connections/components/ConnectionsLayout.tsx`
  - Current: Imports and renders `<Breadcrumbs />` (line 11, 84-92)
  - Action: Remove breadcrumb rendering, keep `hideBreadcrumbs` prop for backwards compat
  - Note: Breadcrumbs.tsx can remain for reference but should not be used

- [ ] **C2. Implement Spatial Depth Pattern**
  - Concept: Cards "float" above dashboard, closing "returns to layer below"
  - Implementation:
    - Add `z-index` layering to detail views
    - Use `framer-motion` for elevation transitions
    - Detail pages should have subtle shadow indicating elevation
  - Files:
    - `src/pages/SpaceDetailPage.tsx`
    - `src/pages/SpaceSectionPage.tsx`
    - All archetype detail views

- [ ] **C3. Apply ceramic-concave to Active Tab States**
  - File: `src/components/CeramicTabSelector.tsx`
  - Current active state: Check current styling
  - Enhancement: Use `ceramic-concave` class for pressed/active tabs
  - Ensure contrast meets WCAG AA

- [ ] **C4. Refactor StudioLayout Transitions**
  - File: `src/modules/podcast/components/StudioLayout.tsx`
  - Implement "Reductive" principle:
    - PreparationMode -> StudioMode transition should simplify UI
    - Non-essential elements fade out
    - Focus intensifies on recording controls
  - Add transition animations between modes

### Acceptance Criteria (Workstream C)

- [ ] No breadcrumbs visible anywhere in the app
- [ ] Detail views have clear visual elevation over parent
- [ ] Active tabs have tactile `.ceramic-concave` appearance
- [ ] Mode transitions in Studio are smooth and reductive

---

## WORKSTREAM D: The "Dead End" Audit

**Owner:** `testing-qa` + `general-purpose`
**Dependencies:** Workstreams A, B, C (testing requires implementations)
**Priority:** P2 - Medium (but critical for UX)

### Tasks

- [ ] **D1. Audit Path: Minha Vida -> Project -> Task -> Return**
  - Starting point: `src/pages/Home.tsx` (Minha Vida view)
  - Navigate to: Project details (associations)
  - Navigate to: Task details
  - Verify: Can return without browser back
  - Document: Missing navigation elements

- [ ] **D2. Audit Path: Podcast Dashboard -> Create -> Wizard -> Cancel**
  - Starting point: `src/views/PodcastCopilotView.tsx`
  - Flow: library -> dashboard -> wizard
  - Verify: Cancel button works at all wizard steps
  - Verify: Data loss warning shown when canceling with data
  - Document: Current `handleBackToDashboard` behavior

- [ ] **D3. Audit Path: Connections -> Space -> Section -> Return**
  - Starting point: `/connections`
  - Navigate to: `/connections/habitat/:spaceId`
  - Navigate to: `/connections/habitat/:spaceId/inventory`
  - Verify: Back button in ConnectionsLayout works
  - Verify: `goBack()` from useConnectionNavigation works

- [ ] **D4. Add goBack Handlers to All Detail Pages**
  - Files:
    - `src/pages/SpaceDetailPage.tsx` - has ConnectionsLayout with showBackButton
    - `src/pages/SpaceSectionPage.tsx` - verify back navigation
    - `src/pages/ArchetypeListPage.tsx` - verify back to /connections
  - Ensure all use `useConnectionNavigation().goBack()`

- [ ] **D5. Implement Navigation State Persistence**
  - Create: `src/hooks/useNavigationHistory.ts`
  - Features:
    - Track navigation stack
    - Store "return context" (where user came from)
    - Enable "smart back" that knows the logical parent
  - Integration: Use in ConnectionsLayout and StudioLayout

### Acceptance Criteria (Workstream D)

- [ ] All critical paths traversable without browser back button
- [ ] Cancel actions show confirmation if data would be lost
- [ ] goBack handlers implemented consistently
- [ ] Navigation history tracked for smart return behavior

---

## Agent Delegation Matrix

| Workstream | Primary Agent | Support Agent | Timeline |
|------------|--------------|---------------|----------|
| A: Anchor Principle | `general-purpose` (Frontend) | - | Week 1-2 |
| B: Empty States | `gamification-agent` | `general-purpose` | Week 1-2 |
| C: Visual Hierarchy | `general-purpose` (Frontend) | - | Week 2-3 |
| D: Dead End Audit | `testing-qa` | `general-purpose` | Week 3-4 |

---

## Key Files Reference

### Navigation Components
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\components\BottomNav.tsx`
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\connections\components\ConnectionsLayout.tsx`
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\connections\components\Breadcrumbs.tsx`
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\podcast\components\StudioLayout.tsx`

### Navigation Hooks
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\connections\hooks\useConnectionNavigation.ts`

### Main App Routing
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\App.tsx`

### Empty State Components
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\EmptyState.tsx`
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\connections\views\ConnectionsView.tsx`

### Podcast Flow
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\views\PodcastCopilotView.tsx`
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\podcast\components\GuestIdentificationWizard.tsx`

### Type Definitions
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\types.ts` (ViewState type)

---

## Success Metrics

1. **Zero browser back button usage** in usability testing
2. **100% of empty states** have actionable CTAs
3. **Navigation hierarchy** clear from visual design alone
4. **All focused modes** have visible exit path in header
5. **Return paths** work consistently across all modules

---

## Notes for Implementation

1. **Start with Workstreams A and B in parallel** - no dependencies
2. **Workstream C depends on A** - wait for nav changes before visual updates
3. **Workstream D is testing-focused** - run after A, B, C implementations
4. **Use feature flags** for incremental rollout of navigation changes
5. **Document breaking changes** to navigation patterns for team awareness

