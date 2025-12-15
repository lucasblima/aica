# Navigation Flow Diagrams
**Aica Life OS - Critical Path Navigation Maps**

---

## Path 1: Minha Vida → Association Details

### Navigation Hierarchy
```
┌─────────────────────────────────────────────────────────┐
│                    HOME VIEW (/)                        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Minha Vida Dashboard                            │ │
│  │  - Life Areas                                    │ │
│  │  - Recent Associations                           │ │
│  │  - Global Bottom Navigation                      │ │
│  │    [Vida] [Agenda] [Connections] [Studio]       │ │
│  └───────────────────────────────────────────────────┘ │
│                      ↓ Click Association               │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ASSOCIATION DETAIL VIEW                         │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ [← Voltar]         Association Name        │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │  Description: ...                                │ │
│  │  Modules Grid:                                   │ │
│  │  - Module 1 Card                                 │ │
│  │  - Module 2 Card                                 │ │
│  │  - Module 3 Card                                 │ │
│  └───────────────────────────────────────────────────┘ │
│    ↑ Back Button (onClick={() => setCurrentView('vida')})
│    │                                                   │
│    └─────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘

STATUS: ✅ PASS - Clear exit path via back button
```

### Implementation Details
```
App State Management:
├─ currentView: 'vida' | 'association_detail'
├─ selectedAssociation: Association object
├─ associationModules: Module[] array
└─ handleOpenAssociation(): Sets all above and changes view

Navigation Handler:
├─ Back Button onClick → setCurrentView('vida')
├─ Bottom Nav Click → setCurrentView(newView)
└─ Global Navigation Available: Always visible in this view
```

---

## Path 2: Podcast Workflow → Guest Wizard → Completion

### Complete Workflow
```
┌──────────────────────────────────────────────────────────────┐
│                   PODCAST STUDIO (view='studio')             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  LIBRARY (view='library')                             │ │
│  │  - Select Podcast Show → Triggers handleSelectShow() │ │
│  └────────────────────────────────────────────────────────┘ │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  DASHBOARD (view='dashboard')                        │ │
│  │  - Episodes list                                      │ │
│  │  - [Create Episode] button                            │ │
│  │    → onClick: handleCreateEpisode()                   │ │
│  │    → setView('wizard')                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🎯 GUEST IDENTIFICATION WIZARD (Modal)               │ │
│  │     Modal Props:                                       │ │
│  │     - showId, userId                                  │ │
│  │     - onComplete, onCancel                            │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Progress: [●──────────────────] 25%             │ │ │
│  │  │ Close (X) button [Top Right]                    │ │ │
│  │  ├──────────────────────────────────────────────────┤ │ │
│  │  │ STEP 0: Guest Type Selection                    │ │ │
│  │  │ - [Public Figure]                               │ │ │
│  │  │ - [Common Person]                               │ │ │
│  │  │ [Cancelar]                                      │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                    ↓ (Select Type)                    │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Progress: [●●────────────────] 50%              │ │ │
│  │  ├──────────────────────────────────────────────────┤ │ │
│  │  │ STEP 1: Name + Reference (Public) or Manual (Common) │ │
│  │  │ Guest Name: ________________                     │ │ │
│  │  │ Reference: ________________                      │ │ │
│  │  │ [Voltar] [Buscar Perfil]                        │ │ │
│  │  │                                                  │ │ │
│  │  │ ⚠️ If user has entered data:                    │ │ │
│  │  │    - ESC key → Confirmation Dialog              │ │ │
│  │  │    - Click backdrop → Confirmation Dialog       │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                    ↓ (Search/Next)                     │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Progress: [●●●─────────────] 75%                │ │ │
│  │  ├──────────────────────────────────────────────────┤ │ │
│  │  │ STEP 2: Confirm Profile                         │ │ │
│  │  │ - Profile card with name, title, summary        │ │ │
│  │  │ - Click to select                               │ │ │
│  │  │ [Não é esse, buscar novamente]                  │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                    ↓ (Select Profile)                 │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Progress: [●●●●────────────] 100%               │ │ │
│  │  ├──────────────────────────────────────────────────┤ │ │
│  │  │ STEP 3: Theme + Scheduling                      │ │ │
│  │  │ - Theme: [Auto] [Manual] Mode                   │ │ │
│  │  │ - Season: [1]                                   │ │ │
│  │  │ - Location: [Dropdown]                          │ │ │
│  │  │ - Scheduled Date: [YYYY-MM-DD]                  │ │ │
│  │  │ - Scheduled Time: [HH:MM]                       │ │ │
│  │  │ [Voltar] [Iniciar Pesquisa]                     │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                    ↓ (Complete)                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PRE-PRODUCTION HUB (view='preproduction')            │ │
│  │  - Guest Data Display                                 │ │
│  │  - Research/Dossier                                   │ │
│  │  - Topics Selection                                   │ │
│  │  - [Back] → handleBackToDashboard()                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘

EXIT PATHS ANALYSIS:
═══════════════════════════════════════════════════════════════

From WIZARD at ANY STEP:
  Path A: Click [Voltar] Button
    Step 1 → Step 0
    Step 2 → Step 1
    Step 3 → Step 2
    Then from Step 0 → Click [Cancelar] → Dashboard
    Total: Back chain → Dashboard ✅

  Path B: Click [Cancelar] Button (Step 0 only)
    → Checks hasEnteredData()
    → If NO data: Immediately calls onCancel()
    → If YES data: Shows Confirmation Modal
           - "Continuar editando" → Stays in wizard
           - "Sim, cancelar" → Calls onCancel()
    → onCancel() → handleBackToDashboard()
    Result: Dashboard ✅

  Path C: Press ESC Key
    → Calls handleCancel()
    → Same logic as Path B
    Result: Dashboard or Confirmation Modal ✅

  Path D: Click Modal Backdrop
    → Click outside modal
    → Triggers same event handler
    Result: Confirmation Modal appears ✅

STATUS: ✅ PASS - Multiple escape routes with data protection
```

### Confirmation Dialog (When Data Entered)
```
┌─────────────────────────────────────────────┐
│                                             │
│  ⚠️ Cancelar cadastro?                      │
│                                             │
│  Você perderá todas as informações          │
│  preenchidas até agora.                     │
│                                             │
│  ┌──────────────┬──────────────┐            │
│  │ Continuar    │ Sim,         │            │
│  │ editando     │ cancelar     │            │
│  └──────────────┴──────────────┘            │
│                                             │
│  Action: Dismiss → Stay in wizard          │
│  Action: Confirm → Back to Dashboard       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Path 3: Connections → Archetype → Space → Section

### Multi-Level Navigation Hierarchy

```
ROOT NAVIGATION
═══════════════════════════════════════════════════════════════

┌─ /connections ──────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ CONNECTIONS HOME (ConnectionsPage)                  │  │
│  │                                                     │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │ Bottom Navigation (Always Visible)           │   │  │
│  │ │ [Vida] [Agenda] [Connections*] [Studio]      │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  │ 📌 4 Archetype Cards:                              │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │ 🏠 Habitat      │ 💼 Ventures              │   │  │
│  │ │ (Click → /habitat)  │ (Click → /ventures)  │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │ 📚 Academia     │ 👥 Tribo                 │   │  │
│  │ │ (Click → /academia) │ (Click → /tribo)     │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  │ 📌 Recent Spaces Section                            │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │ Space Card 1  │ Space Card 2  │ Space Card 3│   │  │
│  │ │ Click → Navigate to space detail (Level 3) │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                      ↓ Click Archetype or Recent         │
└─────────────────────────────────────────────────────────────┘


LEVEL 2: /connections/:archetype
═══════════════════════════════════════════════════════════════

┌─ Archetype List Page ──────────────────────────────────────┐
│                                                           │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [← Voltar]    Habitat              [+ Create Space] │ │
│ │ Breadcrumbs: [🔗 Conexões] [🏠 Habitat]            │ │
│ │ Description: Manage properties and inventory...      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ 📌 Spaces Grid:                                           │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [Space 1]  [Space 2]  [Space 3]                     │ │
│ │ Click → /connections/habitat/space-123 (Level 3)   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ Bottom Navigation: [Vida] [Agenda] [Connections*] [Studio]│
│                                                           │
│ Exit Paths:                                               │
│ 1️⃣  [← Voltar] → navigate(-1) → /connections            │
│ 2️⃣  [🔗 Conexões] breadcrumb → /connections            │
│ 3️⃣  Bottom Nav [Connections] → /connections            │
│                                                           │
└─────────────────────────────────────────────────────────────┘


LEVEL 3: /connections/:archetype/:spaceId
═══════════════════════════════════════════════════════════════

┌─ Space Detail Page ────────────────────────────────────────┐
│                                                           │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [← Voltar]    My Apartment             [⋮ Options]  │ │
│ │ Breadcrumbs: [🔗] [🏠 Habitat] [Space]             │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ 📌 Dynamic Archetype Content:                             │
│ ├─ Habitat: Dashboard, inventory, maintenance            │
│ ├─ Ventures: Metrics, team, stakeholders                 │
│ ├─ Academia: Journeys, notes, mentorships               │
│ └─ Tribo: Rituals, discussions, resources               │
│                                                           │
│ Section Links:                                            │
│ [Inventário] [Manutenção] [Propriedade]                 │
│  ↓            ↓               ↓                           │
│  /inventory   /maintenance   /property                   │
│  (Level 4)                                               │
│                                                           │
│ ⚠️  Bottom Navigation: HIDDEN (Focused Mode)             │
│                                                           │
│ Exit Paths:                                               │
│ 1️⃣  [← Voltar] → navigate(-1) → /habitat              │
│ 2️⃣  [🏠 Habitat] breadcrumb → /connections/habitat     │
│ 3️⃣  [🔗 Conexões] breadcrumb → /connections           │
│                                                           │
└─────────────────────────────────────────────────────────────┘


LEVEL 4: /connections/:archetype/:spaceId/:section
═══════════════════════════════════════════════════════════════

┌─ Section Detail Page ──────────────────────────────────────┐
│                                                           │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [← Voltar]    Inventory               [⋮ Options]   │ │
│ │ Breadcrumbs: [🔗] [🏠] [Space] [Inventory]          │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ 📌 Section-Specific Content:                              │
│ - Inventory items, filters, search                       │
│ - Maintenance schedule, tasks                            │
│ - Property details, documents                            │
│                                                           │
│ ⚠️  Bottom Navigation: HIDDEN (Focused Mode)             │
│                                                           │
│ Exit Paths:                                               │
│ 1️⃣  [← Voltar] → navigate(-1) → /space-id             │
│ 2️⃣  [Space] breadcrumb → /space-id                     │
│ 3️⃣  [🏠] breadcrumb → /habitat                         │
│ 4️⃣  [🔗 Conexões] breadcrumb → /connections          │
│                                                           │
└─────────────────────────────────────────────────────────────┘


BACK BUTTON BEHAVIOR: navigate(-1) Via useConnectionNavigation()
═══════════════════════════════════════════════════════════════

useConnectionNavigation Hook:
├─ goBack() function
│  └─ navigate(-1)  [React Router v6 compatible]
│     └─ Returns to previous route in browser history
│
├─ Breadcrumb paths:
│  ├─ navigateToConnections() → /connections
│  ├─ navigateToArchetype(type) → /connections/{archetype}
│  ├─ navigateToSpace(id, type) → /connections/{archetype}/{spaceId}
│  └─ navigateToSection(id, type, section)
│     → /connections/{archetype}/{spaceId}/{section}

Breadcrumb Component Structure:
├─ Renders path hierarchy
├─ Each breadcrumb is clickable
├─ Links update URL and component state
└─ Provides alternative to back button

STATUS: ✅ PASS - Multi-level navigation with multiple escape routes
```

### Route Nesting Structure
```
App.tsx Routes (Connections Module Only):
═════════════════════════════════════════════════════════

<Routes>
  {isAuthenticated && (
    <>
      {/* Level 1: Home with Bottom Nav */}
      <Route
        path="/connections"
        element={
          <ConnectionsLayout>
            <ConnectionsPage />
          </ConnectionsLayout>
        }
      />

      {/* Level 2: Archetype List with Bottom Nav */}
      <Route
        path="/connections/:archetype"
        element={
          <ConnectionsLayout>
            <ArchetypeListPage />
          </ConnectionsLayout>
        }
      />

      {/* Level 3 & 4: Detail Pages WITHOUT Bottom Nav (Focused Modes) */}
      <Route
        path="/connections/:archetype/:spaceId"
        element={<SpaceDetailPage />}  {/* Has back button, no nav */}
      />

      <Route
        path="/connections/:archetype/:spaceId/:section"
        element={<SpaceSectionPage />}  {/* Has back button, no nav */}
      />
    </>
  )}
</Routes>

Navigation Pattern Distinction:
├─ Levels 1-2: Connected to main Bottom Nav system
│  └─ User can switch contexts
├─ Levels 3-4: Focused Descent mode
│  └─ Bottom nav hidden, back button only
└─ Result: Prevents accidental context switching during deep work
```

---

## Summary Navigation Capabilities

### Path Completion Methods
```
✅ Back Button + Browser History
   Used in: All Connections routes, Podcast Wizard
   Function: navigate(-1)
   Behavior: Follows browser history

✅ Explicit Navigation Links
   Used in: Breadcrumbs
   Function: navigateToArchetype(), navigateToSpace(), etc.
   Behavior: Direct URL navigation

✅ Modal Close/Cancel
   Used in: Wizard, CreateSpaceWizard
   Function: onCancel() callbacks
   Behavior: Dismiss modal, return to parent

✅ Global Navigation (Bottom Nav)
   Used in: Main views (Home, Agenda, Connections, Studio)
   Function: handleViewChange()
   Behavior: Context switching

✅ Keyboard Navigation
   Used in: Wizard (ESC key)
   Function: handleCancel() → Confirmation
   Behavior: Smart detection of data loss
```

---

## Accessibility Features by Route

| Route | Back Button | Breadcrumbs | Aria Labels | Focus Trap | ESC Key |
|-------|-------------|-------------|-------------|-----------|---------|
| /connections | N/A | N/A | ✅ | N/A | N/A |
| /connections/:arch | ✅ | ✅ | ✅ | N/A | ✅ |
| /connections/:arch/:space | ✅ | ✅ | ✅ | N/A | ✅ |
| /connections/:arch/:space/:section | ✅ | ✅ | ✅ | N/A | ✅ |
| Wizard | ✅ | N/A | ✅ | ✅ | ✅ |

---

## File Reference Guide

### Navigation Configuration
- `App.tsx` (lines 573-582): Route definitions
- `useConnectionNavigation.ts`: Navigation utilities

### Component Implementation
- `ConnectionsLayout.tsx`: Back button + breadcrumb wrapper
- `SpaceDetailPage.tsx`: Route-based rendering
- `SpaceSectionPage.tsx`: Deep section handling
- `GuestIdentificationWizard.tsx`: Modal with escape paths

### Styling Consistency
- All back buttons: `ceramic-concave` + `ArrowLeft` icon
- All breadcrumbs: Clickable breadcrumb items
- All modals: Backdrop overlay + focus trap

---

**Diagram Version**: 1.0
**Last Updated**: December 14, 2025
**Status**: All Paths Verified - No Dead Ends
