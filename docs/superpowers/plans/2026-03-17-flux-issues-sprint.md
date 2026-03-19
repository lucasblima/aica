# Flux Module Issues Sprint — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 bugs, address 6 feedback items, and add unit tests across the Flux module (11 GitHub issues: #909, #910, #911, #912, #913, #914, #915, #916, #917, #918, #817).

**Architecture:** The work is organized into 4 sprints by complexity: (1) Quick bug fixes on existing components, (2) UI cleanup removing duplicates and improving consistency, (3) Feature work requiring new DB tables and UX redesign, (4) Unit test coverage. Each task modifies 1-3 files max with clear boundaries.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS (Ceramic Design System), Supabase (PostgreSQL + Edge Functions), Vitest.

---

## File Map

| Task | Issue | Files to Modify | Files to Create |
|------|-------|----------------|----------------|
| 1 | #914, #915 | `src/modules/flux/components/athlete/FeedbackRadarChart.tsx` | — |
| 2 | #916 | `src/modules/flux/views/AthleteDetailView.tsx` | — |
| 3 | #917 | `src/modules/flux/components/canvas/MicrocycleGrid.tsx` | — |
| 4 | #909 | `src/modules/flux/views/CRMCommandCenterView.tsx`, `src/modules/flux/components/AthleteCard.tsx` | — |
| 5 | #912 | `src/modules/flux/views/AthleteDetailView.tsx` | — |
| 6 | #913 | `src/modules/flux/views/AthleteDetailView.tsx` | — |
| 7 | #918 | `src/modules/flux/components/canvas/CanvasLibrarySidebar.tsx` | — |
| 8 | #910 | `src/modules/flux/components/coach/AthleteGroupManager.tsx`, `src/modules/flux/types/flux.ts` | `supabase/migrations/YYYYMMDD_add_athlete_groups.sql` |
| 9 | #911 | `src/modules/flux/services/levelingEngineService.ts`, `src/modules/flux/views/CRMCommandCenterView.tsx`, `src/modules/flux/types/flux.ts` | `supabase/migrations/YYYYMMDD_add_custom_levels.sql`, `src/modules/flux/components/coach/CustomLevelManager.tsx` |
| 10 | #817 | — | `src/modules/flux/services/__tests__/levelingEngineService.test.ts` (other 3 test files already exist) |

---

## Chunk 1: Bug Fixes (Tasks 1-3)

### Task 1: Fix Radar Chart Scale and Vector Names (#914, #915)

**Context:** The radar chart currently uses scale 0-5. Issue #914 requests scale 1-6. Issue #915 reports vector names are wrong — the fix from PR #655 was overwritten. The current names shown are truncated (`itacao`, `iracao` — cut off labels for "Recuperacao" and "Alimentacao"). The correct 6 scientific axes per PR #655 are: Volume, Intensidade, Aderencia, Carga (sRPE), Recuperacao, Alimentacao. Looking at the screenshots, the labels ARE correct in the code but get truncated in the SVG rendering. The real problem from #915 is that the labels display as "itacao", "iracao" etc due to SVG overflow clipping.

**Root cause analysis for #915:** The SVG viewBox is 260x260 but labels positioned at `radius + 30` from center overflow the viewBox. The `text-anchor` logic clips long words. The fix from #655 IS in the current code — the labels are correct, but the SVG clips them.

**Files:**
- Modify: `src/modules/flux/components/athlete/FeedbackRadarChart.tsx`

- [ ] **Step 1: Fix scale from 0-5 to 1-6 (#914)**

Change `MAX_VALUE` from 5 to 6 and update rings array to start at 1:

```typescript
// Line 72: Change MAX_VALUE
const MAX_VALUE = 6;

// Line 190: Change rings to start at 1
const rings = [1, 2, 3, 4, 5, 6];
```

Also update the `extractDimensions` return values to use 1-6 scale instead of 0-5. The raw questionnaire data is 0-5, so we need to shift by +1. **IMPORTANT:** Clamp ALL derived values to [0, 5] BEFORE adding +1 to prevent exceeding MAX_VALUE=6.

The `invertedFatigue` formula uses `MAX_VALUE - q.fatigue`. Since `MAX_VALUE` is now 6 but raw data is still 0-5, we must keep using `5` (the original scale max) for the inversion, NOT the new `MAX_VALUE`:

```typescript
// Keep source scale constant for derived calculations
const SOURCE_MAX = 5; // Raw questionnaire data range

// Derived: Aderencia = average of compliance metrics, clamped to source range
const adherence = Math.min(SOURCE_MAX, Math.max(0,
  q.volume_completed != null && q.intensity_completed != null
    ? (q.volume_completed + q.intensity_completed) / 2
    : q.volume_completed ?? q.intensity_completed ?? 0
));

// Derived: Carga (sRPE proxy) — stress 0-5 mapped directly
const load = Math.min(SOURCE_MAX, Math.max(0, q.stress ?? 0));

// Derived: Recuperacao (Hooper-inspired) — avg(sleep, inverted fatigue)
// Use SOURCE_MAX (5) for inversion, NOT MAX_VALUE (6)
const sleepVal = q.sleep ?? 0;
const invertedFatigue = q.fatigue != null ? SOURCE_MAX - q.fatigue : 0;
const recovery = Math.min(SOURCE_MAX, Math.max(0,
  q.sleep != null || q.fatigue != null
    ? (sleepVal + invertedFatigue) / (q.sleep != null && q.fatigue != null ? 2 : 1)
    : 0
));

// Shift all values by +1 (so 0→1, 5→6) to map to 1-6 scale
return [
  { label: 'Volume', value: Math.min(SOURCE_MAX, q.volume_adequate ?? 0) + 1 },
  { label: 'Intensidade', value: Math.min(SOURCE_MAX, q.intensity_adequate ?? 0) + 1 },
  { label: 'Aderencia', value: adherence + 1 },
  { label: 'Carga (sRPE)', value: load + 1 },
  { label: 'Recuperacao', value: recovery + 1 },
  { label: 'Alimentacao', value: Math.min(SOURCE_MAX, q.nutrition ?? 0) + 1 },
];
```

- [ ] **Step 2: Fix SVG label truncation (#915)**

Increase the SVG viewBox size and label positioning to prevent clipping:

```typescript
// Line 23-24: Increase default size
size = 300, // was 260

// Line 188: Adjust radius for more label room
const radius = size / 2 - 60; // was -48

// Line 207: Push labels further out
const { x, y } = polarToCartesian(cx, cy, radius + 40, angle); // was +30

// Line 235: Update max-w
className="max-w-[300px]" // was 260px
```

Also ensure the center ring (ring=0) dot is removed since scale now starts at 1.

**IMPORTANT:** `AthleteDetailView.tsx` passes `size={220}` explicitly when calling `FeedbackRadarChart` (line ~1433). This overrides the default prop. Update this call to `size={300}` as well, or the labels will still clip in the actual athlete profile view.

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`
Expected: Exit 0, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/flux/components/athlete/FeedbackRadarChart.tsx
git commit -m "fix(flux): fix radar chart scale 1-6 and label truncation (#914, #915)"
```

---

### Task 2: Remove Duplicate Lock/Unlock Component (#916)

**Context:** The athlete profile page has TWO controls for blocking/unlocking athlete training:
1. A header banner at the top that shows "Atleta Bloqueado" when `status === 'paused'` (read-only indicator)
2. A "Gerenciamento" section at the bottom with a "Bloquear Atleta" / "Desbloquear Atleta" button

The issue requests removing the top-level duplicate, keeping only the "Gerenciamento" section which is the proper action area. From the screenshot (#916), when the athlete is blocked, there's a red banner AND the Gerenciamento button — the user wants to keep only the Gerenciamento section.

**Clarification needed:** The issue description references CSS selectors (`document.querySelector`), which suggests the reporter used DevTools to identify the component. The issue says: "Remove component at nth-child(2) because nth-child(5) already handles lock/unlock." This maps to: remove the top banner, keep the bottom Gerenciamento section.

**Files:**
- Modify: `src/modules/flux/views/AthleteDetailView.tsx`

- [ ] **Step 1: Locate and remove the "Atleta Bloqueado" warning banner**

Search for the banner in AthleteDetailView.tsx. It renders when `athlete.status === 'paused'` and shows a Lock icon with "Atleta Bloqueado" text. Remove this entire conditional block (approximately lines 500-510 range based on exploration).

The banner looks like:
```tsx
{athlete.status === 'paused' && (
  <div className="... bg-ceramic-error/10 ...">
    <Lock ... /> Atleta Bloqueado
    <p>Este atleta esta com acesso pausado...</p>
  </div>
)}
```

Remove this block entirely. The "Gerenciamento" section at the bottom already provides the toggle.

- [ ] **Step 2: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/modules/flux/views/AthleteDetailView.tsx
git commit -m "fix(flux): remove duplicate athlete blocked banner (#916)"
```

---

### Task 3: Remove "Resumo do Mes" Header from Canvas (#917)

**Context:** The MicrocycleGrid component shows a header block with "RESUMO DO MES", "Microciclo 16/02/2026", and "Foco: volume". The issue requests removing this header entirely — the information is already in the top nav bar of the Canvas Editor (which shows "RESUMO DO MES" toggle button and the microcycle info in the CanvasEditorDrawer header).

**Files:**
- Modify: `src/modules/flux/components/canvas/MicrocycleGrid.tsx`

- [ ] **Step 1: Remove the Microcycle Header block**

In `MicrocycleGrid.tsx`, lines 387-402, remove the header `<div>` that renders "Resumo do Mes", `microcycle.title`, and `microcycle.focus`:

```tsx
// REMOVE this entire block (lines 387-402):
{/* Microcycle Header */}
<div className="flex items-center justify-between">
  <div>
    <p className="text-[11px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
      Resumo do Mes
    </p>
    <h2 className="text-lg font-bold text-ceramic-text-primary">
      {microcycle.title}
    </h2>
    {microcycle.focus && (
      <p className="text-xs text-ceramic-text-tertiary mt-0.5">
        Foco: {microcycle.focus}
      </p>
    )}
  </div>
</div>
```

The `microcycle` prop can remain in the interface for other uses (passed to WeekStrip, etc.).

- [ ] **Step 2: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/modules/flux/components/canvas/MicrocycleGrid.tsx
git commit -m "fix(flux): remove redundant microcycle header from canvas grid (#917)"
```

---

## Chunk 2: UI Polish (Tasks 4-7)

### Task 4: Highlight "Prescrever" Button in Coach Panel (#909)

**Context:** The "Prescrever" button on each AthleteCard in the Coach Panel (CRMCommandCenterView) is too small and not prominent enough. It's the most important action for the coach. From the screenshot, the button is a small orange text link at the bottom-right of the card. It needs to be a prominent, full-width CTA.

**Files:**
- Modify: `src/modules/flux/components/AthleteCard.tsx` (the "Prescrever" button lives here)
- Modify: `src/modules/flux/views/CRMCommandCenterView.tsx` (if the button is rendered there instead)

- [ ] **Step 1: Find where "Prescrever" button is rendered**

Search for "Prescrever" or "prescrever" in AthleteCard.tsx and CRMCommandCenterView.tsx. The button navigates to `/flux/canvas/:athleteId`.

- [ ] **Step 2: Redesign the button to be more prominent**

Transform from a small text link to a prominent CTA button:

```tsx
// FROM (small text):
<button className="text-xs text-amber-600 ...">
  <ClipboardEdit ... /> Prescrever
</button>

// TO (prominent CTA):
<button
  onClick={() => navigate(`/flux/canvas/${athlete.id}`)}
  className="w-full mt-3 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-md"
>
  <ClipboardEdit className="w-4 h-4" />
  Prescrever Treino
</button>
```

The button should be:
- Full-width within the card
- `bg-amber-500` with white text (primary CTA style per Ceramic)
- Bold font, larger than current
- Icon + label

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/modules/flux/components/AthleteCard.tsx
git commit -m "fix(flux): make prescription button prominent in coach panel (#909)"
```

---

### Task 5: Move PAR-Q Detalhado Inside "Documentos de Saude" (#912)

**Context:** From the screenshots, the athlete profile currently shows:
1. "DOCUMENTOS DE SAUDE" section with PAR-Q, Liberacao, Cardio buttons (quick status icons)
2. "PAR-Q Detalhado" as a SEPARATE collapsible section below

The issue requests that "PAR-Q Detalhado" should be triggered by clicking the "PAR-Q" button INSIDE "Documentos de Saude" — not as a separate standalone section.

**Files:**
- Modify: `src/modules/flux/views/AthleteDetailView.tsx`

- [ ] **Step 1: Locate the "Documentos de Saude" and "PAR-Q Detalhado" sections**

In AthleteDetailView.tsx, find:
1. The "DOCUMENTOS DE SAUDE" card with PAR-Q/Liberacao/Cardio buttons
2. The separate "PAR-Q Detalhado" collapsible section

- [ ] **Step 2: Make PAR-Q button toggle the PAR-Q Detalhado content inline**

Instead of having PAR-Q Detalhado as a separate section, make the PAR-Q button in "Documentos de Saude" expand/collapse the ParQCoachView content directly within the health documents card.

**Note:** `AthleteDetailView.tsx` already has `const [parqExpanded, setParqExpanded] = useState(false)` at line ~115 which controls the existing standalone PAR-Q section. REUSE this state variable — don't create a new one:

```tsx
// REUSE existing state (line ~115):
// const [parqExpanded, setParqExpanded] = useState(false);  // already exists

// In DOCUMENTOS DE SAUDE section, make PAR-Q button toggle parqExpanded:
<button onClick={() => setParqExpanded(!parqExpanded)} ...>
  PAR-Q
  {parqStatus?.clearance_status ?? 'N/A'}
</button>

// Show ParQCoachView inline when expanded:
{parqExpanded && (
  <div className="mt-4 border-t border-ceramic-border pt-4">
    <ParQCoachView ... />
  </div>
)}
```

- [ ] **Step 3: Remove the standalone "PAR-Q Detalhado" section**

Delete the separate collapsible card that wraps ParQCoachView as its own section.

- [ ] **Step 4: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/modules/flux/views/AthleteDetailView.tsx
git commit -m "fix(flux): move PAR-Q detail inside health documents section (#912)"
```

---

### Task 6: Remove Duplicate "Status de Pagamento" + Billing Ruler Notes (#913)

**Context:** From the screenshots, the athlete profile shows:
1. "STATUS DE PAGAMENTO" — a card next to "Documentos de Saude" showing "Pago, R$ 250,00, Venc. dia 28"
2. "Financeiro" — a separate collapsible section below with the SAME payment info PLUS the PaymentRuler (Regua de Cobranca) with -7d, -3d, -1d, 0, +1d, +3d, +7d markers

The issue says: "Status de Pagamento is already contained within Financeiro." → Remove the standalone "STATUS DE PAGAMENTO" card, keep only the "Financeiro" section.

Additionally, the issue describes the billing ruler notification system: reminders at -1d, 0 (today), +1d, +3d, +7d should be sent via web notifications, email, Telegram, and WhatsApp (if active). This is a larger feature that requires backend work (Edge Functions for scheduled notifications). For this sprint, we'll focus on the UI fix. The notification system should be a separate epic.

**Files:**
- Modify: `src/modules/flux/views/AthleteDetailView.tsx`

- [ ] **Step 1: Remove the "STATUS DE PAGAMENTO" standalone card**

Find and remove the card that renders "STATUS DE PAGAMENTO" with Pago/Pendente status alongside "Documentos de Saude". This is the summary card next to the health documents. Keep the "Financeiro" collapsible section which has the full payment management UI.

- [ ] **Step 2: Verify Financeiro section header already shows payment status badge**

The "Financeiro" section header already has a status badge (lines ~1187-1207) showing 'Pago', 'Atrasado', or 'Pendente'. **No code change needed here** — just verify the badge is visible after removing the standalone card. If the coach expands "Financeiro", the full payment management UI with PaymentRuler is already there.

- [ ] **Step 3: Add TODO comment for billing notifications**

Add a comment in the PaymentRuler or Financeiro section noting the planned notification system (issue #913 billing ruler notifications). This is future work — not implemented in this sprint.

```tsx
// TODO (#913): Implement billing notifications via web push, email, Telegram, WhatsApp
// Schedule: -1d (reminder), 0 (due today), +1d, +3d, +7d (overdue escalation)
```

- [ ] **Step 4: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/modules/flux/views/AthleteDetailView.tsx
git commit -m "fix(flux): remove duplicate payment status card, keep Financeiro section (#913)"
```

---

### Task 7: Unify Exercise Cards Between Library and Canvas (#918)

**Context:** From the screenshots, the exercise cards in the Canvas Library sidebar (left panel) show: category label (MAIN), name, duration, intensity badge. But the exercise cards in the Canvas grid (WorkoutPill in MicrocycleGrid) show: modality icon + truncated name + duration. The issue requests visual consistency between library cards and canvas cards.

Since canvas grid cells are compact (MicrocycleGrid), we can't make them identical. The fix should focus on the **Library Sidebar cards** adopting a more structured layout that mirrors the information visible in the grid pills, and adding modality icons to the sidebar cards.

**Files:**
- Modify: `src/modules/flux/components/canvas/CanvasLibrarySidebar.tsx`

- [ ] **Step 1: Add modality icons to Library sidebar cards**

The sidebar cards currently show category, name, duration, intensity — but no modality icon. Add the same modality icons used in WorkoutPill:

```tsx
const MODALITY_ICONS: Record<string, string> = {
  swimming: '🏊',
  running: '🏃',
  cycling: '🚴',
  strength: '💪',
  walking: '🚶',
  triathlon: '🏅',
};

// In the template card render (line 134-174):
// Add modality icon before the name
<div className="flex items-center gap-1.5">
  <span className="text-sm">{MODALITY_ICONS[template.modality] || '🏋️'}</span>
  <h4 className="font-semibold text-ceramic-text-primary text-sm leading-tight line-clamp-2">
    {template.name}
  </h4>
</div>
```

- [ ] **Step 2: Add subtle modality color strip to Library cards**

To match the canvas pills which have modality-colored backgrounds, add a left border color strip:

```tsx
const MODALITY_BORDER_COLORS: Record<string, string> = {
  swimming: '#60A5FA',  // blue
  running: '#FB923C',   // orange
  cycling: '#34D399',   // green
  strength: '#C084FC',  // purple
  walking: '#38BDF8',   // sky
  triathlon: '#FB7185', // rose
};

// Add to the template card:
style={{
  background: '#F0EFE9',
  borderLeft: `3px solid ${MODALITY_BORDER_COLORS[template.modality] || '#C4883A'}`,
  // ... existing boxShadow
}}
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/modules/flux/components/canvas/CanvasLibrarySidebar.tsx
git commit -m "fix(flux): unify exercise card design between library and canvas (#918)"
```

---

## Chunk 3: Features (Tasks 8-9)

### Task 8: Group Management UX Overhaul + Persistence (#910)

**Context:** The current group management has two problems:
1. **UX is confusing:** Creating groups and assigning athletes requires multiple steps in a modal with no clear flow
2. **Persistence bug:** Groups are stored in `localStorage` — another user reported groups disappearing. This is because localStorage is device-specific and can be cleared by the browser.

The fix: Migrate group storage from localStorage to Supabase and simplify the UX.

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_athlete_groups.sql`
- Modify: `src/modules/flux/components/coach/AthleteGroupManager.tsx`
- Modify: `src/modules/flux/types/flux.ts`

- [ ] **Step 1: Create Supabase migration for athlete groups**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_athlete_groups.sql

-- Athlete groups table
CREATE TABLE IF NOT EXISTS public.athlete_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'amber',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Group membership (many-to-many: athletes <-> groups)
CREATE TABLE IF NOT EXISTS public.athlete_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.athlete_groups(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, athlete_id)
);

-- RLS
ALTER TABLE public.athlete_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own groups" ON public.athlete_groups
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own groups" ON public.athlete_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own groups" ON public.athlete_groups
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own groups" ON public.athlete_groups
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own group members" ON public.athlete_group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.athlete_groups ag WHERE ag.id = group_id AND ag.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own group members" ON public.athlete_group_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.athlete_groups ag WHERE ag.id = group_id AND ag.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own group members" ON public.athlete_group_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.athlete_groups ag WHERE ag.id = group_id AND ag.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_athlete_groups_user_id ON public.athlete_groups(user_id);
CREATE INDEX idx_athlete_group_members_group_id ON public.athlete_group_members(group_id);
CREATE INDEX idx_athlete_group_members_athlete_id ON public.athlete_group_members(athlete_id);
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Verify via Supabase Dashboard that tables exist with RLS enabled.

- [ ] **Step 3: Create Supabase service layer for groups**

Add group CRUD methods. These can go in a new section of `athleteService.ts` or a new `groupService.ts`. Prefer extending existing service to keep it simple:

Update `AthleteGroupManager.tsx` to replace localStorage calls with Supabase calls:

```typescript
// Replace loadGroupData/saveGroupData with Supabase queries:

export async function loadGroupData(coachUserId: string): Promise<AthleteGroupData> {
  const { data: groups } = await supabase
    .from('athlete_groups')
    .select('*')
    .eq('user_id', coachUserId)
    .order('created_at');

  const { data: members } = await supabase
    .from('athlete_group_members')
    .select('group_id, athlete_id')
    .in('group_id', (groups || []).map(g => g.id));

  // Build assignments map
  const assignments: Record<string, string[]> = {};
  for (const m of (members || [])) {
    if (!assignments[m.athlete_id]) assignments[m.athlete_id] = [];
    assignments[m.athlete_id].push(m.group_id);
  }

  return {
    groups: (groups || []).map(g => ({
      id: g.id,
      name: g.name,
      color: g.color,
      createdAt: g.created_at,
    })),
    assignments,
  };
}
```

Each mutation (create, rename, delete group; toggle athlete membership) becomes a direct Supabase call instead of localStorage read-modify-write.

- [ ] **Step 4: Add localStorage-to-Supabase migration on first load**

When the component loads, check if localStorage has existing data. If yes, migrate it to Supabase and clear localStorage:

```typescript
async function migrateFromLocalStorage(coachUserId: string): Promise<void> {
  const storageKey = `flux_athlete_groups_${coachUserId}`;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const localData = JSON.parse(raw) as AthleteGroupData;
    if (!localData.groups.length) return;

    // Insert groups
    for (const group of localData.groups) {
      const { data: inserted } = await supabase
        .from('athlete_groups')
        .upsert({ id: group.id, user_id: coachUserId, name: group.name, color: group.color })
        .select()
        .single();

      if (!inserted) continue;

      // Insert members
      const athleteIds = Object.entries(localData.assignments)
        .filter(([_, groupIds]) => groupIds.includes(group.id))
        .map(([athleteId]) => athleteId);

      if (athleteIds.length > 0) {
        await supabase.from('athlete_group_members').upsert(
          athleteIds.map(aid => ({ group_id: inserted.id, athlete_id: aid }))
        );
      }
    }

    // Clear localStorage after successful migration
    localStorage.removeItem(storageKey);
    console.log('[AthleteGroupManager] Migrated groups from localStorage to Supabase');
  } catch (err) {
    console.error('[AthleteGroupManager] Migration failed:', err);
  }
}
```

- [ ] **Step 5: Simplify the UX flow**

Current flow: Open modal → Create group → Click group → Search athlete → Toggle.

Improved flow:
1. Make "Gerenciar" button open the modal (keep current)
2. Inline "+ Criar Grupo" input at top (keep current, but clearer)
3. When a group is created, auto-select it and show athlete list immediately
4. Show athletes as checkboxes (not toggle buttons) for faster assignment
5. Add a "Concluir" button instead of generic "Fechar"

This is a UX polish on the existing modal — the component structure stays the same.

- [ ] **Step 6: Verify build + migration**

Run: `npm run build && npm run typecheck`
Run: `npx supabase db push` (verify in Dashboard)

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/*_add_athlete_groups.sql
git add src/modules/flux/components/coach/AthleteGroupManager.tsx
git add src/modules/flux/types/flux.ts
git commit -m "feat(flux): migrate athlete groups to Supabase + simplify UX (#910)"
```

---

### Task 9: Custom Levels — Create and Edit (Max 10) (#911)

**Context:** The current level system has 3 hardcoded levels: Iniciante, Intermediario, Avancado. The issue requests that coaches can create and edit custom levels (e.g., "Elite", "Recreativo", "Competicao"). Maximum 10 levels allowed.

This requires:
1. A new DB table for custom levels
2. A UI component (CustomLevelManager) for CRUD
3. Updating the level filter in CRMCommandCenterView to use custom levels
4. Updating the leveling engine to use custom thresholds

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_custom_levels.sql`
- Create: `src/modules/flux/components/coach/CustomLevelManager.tsx`
- Modify: `src/modules/flux/views/CRMCommandCenterView.tsx` (level filter tabs)
- Modify: `src/modules/flux/types/flux.ts` (types)
- Modify: `src/modules/flux/services/levelingEngineService.ts` (use custom levels)

- [ ] **Step 1: Create migration for custom levels**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_custom_levels.sql

CREATE TABLE IF NOT EXISTS public.coach_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'amber',
  -- Optional thresholds (coach can set or leave null for manual assignment)
  min_consistency INT,
  min_weekly_volume INT, -- minutes
  max_weekly_volume INT,
  min_weeks_active INT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- RLS
ALTER TABLE public.coach_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own levels" ON public.coach_levels
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own levels" ON public.coach_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own levels" ON public.coach_levels
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own levels" ON public.coach_levels
  FOR DELETE USING (auth.uid() = user_id);

-- Seed default levels for existing users
-- (This runs once; coaches can then customize)
-- Note: We don't seed here — the app will use hardcoded defaults when no custom levels exist

-- Also add a level_id column to athletes for custom level assignment
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS custom_level_id UUID REFERENCES public.coach_levels(id) ON DELETE SET NULL;

-- Index
CREATE INDEX idx_coach_levels_user_id ON public.coach_levels(user_id);
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Verify tables exist.

- [ ] **Step 3: Add types**

In `src/modules/flux/types/flux.ts`:

```typescript
export interface CoachLevel {
  id: string;
  user_id: string;
  name: string;
  display_order: number;
  color: string;
  min_consistency?: number;
  min_weekly_volume?: number;
  max_weekly_volume?: number;
  min_weeks_active?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 4: Create CustomLevelManager component**

New file: `src/modules/flux/components/coach/CustomLevelManager.tsx`

Similar modal pattern to AthleteGroupManager. Features:
- List existing levels (sorted by display_order)
- Create new level (name, color, optional thresholds)
- Edit level (inline name edit, reorder with drag or arrows)
- Delete level (with confirmation if athletes are assigned)
- Max 10 level cap enforced in UI

```tsx
// Component skeleton:
export function CustomLevelManager({
  isOpen,
  onClose,
  coachUserId,
  levels,
  onLevelsChange,
}: CustomLevelManagerProps) {
  // CRUD operations via Supabase
  // Reorder with up/down arrows
  // Color picker (same as groups)
  // Enforce max 10 levels
}
```

- [ ] **Step 5: Update CRMCommandCenterView to use custom levels**

Replace the hardcoded level filter tabs with dynamic ones from `coach_levels` table:

```tsx
// Current (hardcoded):
const LEVEL_TABS = ['Todos', 'Iniciante', 'Intermediario', 'Avancado'];

// New (dynamic):
const [coachLevels, setCoachLevels] = useState<CoachLevel[]>([]);
// Fetch on mount: supabase.from('coach_levels').select('*').eq('user_id', userId)
// If empty, fall back to default 3 levels
// Render tabs from coachLevels array
```

Add a small gear icon button next to "NIVEL" section header to open CustomLevelManager.

- [ ] **Step 6: Update athlete level assignment**

When a coach assigns a level to an athlete, update `athletes.custom_level_id`. The `athletes.level` field can remain as a computed/default value, with `custom_level_id` taking precedence when set.

- [ ] **Step 7: Update LevelingEngineService**

Add a method to use custom thresholds when available:

```typescript
static async analyzeAthleteLevelWithCustom(
  profile: FlowAthleteProfile,
  customLevels: CoachLevel[]
): Promise<LevelingRecommendation> {
  if (customLevels.length === 0) {
    return this.analyzeAthleteLevel(profile);
  }
  // Use custom thresholds for matching
  // ...
}
```

- [ ] **Step 8: Verify build + migration**

Run: `npm run build && npm run typecheck`
Run: `npx supabase db push`

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/*_add_custom_levels.sql
git add src/modules/flux/components/coach/CustomLevelManager.tsx
git add src/modules/flux/views/CRMCommandCenterView.tsx
git add src/modules/flux/types/flux.ts
git add src/modules/flux/services/levelingEngineService.ts
git commit -m "feat(flux): add custom level management for coaches (#911)"
```

---

## Chunk 4: Testing (Task 10)

### Task 10: Add Unit Tests for Core Flux Services (#817)

**Context:** Three test files already exist and must NOT be overwritten:
- `src/modules/flux/services/__tests__/fatigueModeling.test.ts` (653 lines, comprehensive)
- `src/modules/flux/services/__tests__/intensityCalculatorService.test.ts` (exists)
- `src/modules/flux/types/__tests__/series.test.ts` (exists)

The only missing file is `levelingEngineService.test.ts`. This task creates it and verifies all existing tests pass.

**Files to create:**
- `src/modules/flux/services/__tests__/levelingEngineService.test.ts`

- [ ] **Step 1: Verify existing tests pass first**

Run: `npm run test -- src/modules/flux/`
Document which tests pass and which fail. Do NOT modify existing test files.

- [ ] **Step 2: Read the existing test files to understand patterns**

Read all three existing test files to understand the project's testing conventions:
- `src/modules/flux/services/__tests__/fatigueModeling.test.ts`
- `src/modules/flux/services/__tests__/intensityCalculatorService.test.ts`
- `src/modules/flux/types/__tests__/series.test.ts`

Note: `computeEMA` returns `number[]` (not a scalar), `computeTSB` takes two arrays, etc. Follow the existing patterns exactly.

- [ ] **Step 3: Create levelingEngineService tests**

Test the public API: `getLevelInfo`, `analyzeAthleteLevel`, `batchAnalyzeAthletes`, `getAthletesNeedingAdjustment`.

```typescript
// src/modules/flux/services/__tests__/levelingEngineService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { LevelingEngineService } from '../levelingEngineService';

describe('LevelingEngineService', () => {
  describe('getLevelInfo', () => {
    it('returns correct label for iniciante', () => {
      const info = LevelingEngineService.getLevelInfo('iniciante');
      expect(info.label).toBe('Iniciante');
    });

    it('returns correct label for intermediario', () => {
      const info = LevelingEngineService.getLevelInfo('intermediario');
      expect(info.label).toBe('Intermediário');
    });

    it('returns correct label for avancado', () => {
      const info = LevelingEngineService.getLevelInfo('avancado');
      expect(info.label).toBe('Avançado');
    });

    it('returns thresholds for each level', () => {
      const info = LevelingEngineService.getLevelInfo('iniciante');
      expect(info.thresholds).toBeDefined();
      expect(info.thresholds.min_consistency).toBe(0);
    });
  });

  describe('analyzeAthleteLevel', () => {
    // Mock MicrocycleService to avoid Supabase calls
    // Test with profiles at different weeks active, consistency, volume
    // Verify correct level recommendation for new athletes (0 weeks → iniciante)
    // Verify correct level recommendation for veterans (52+ weeks, 90% consistency → avancado)
  });
});
```

Adapt the test based on actual function signatures. Mock `MicrocycleService.getMicrocyclesByAthlete` to avoid real DB calls.

- [ ] **Step 4: Run levelingEngineService tests**

Run: `npm run test -- src/modules/flux/services/__tests__/levelingEngineService.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Run all Flux tests together**

Run: `npm run test -- src/modules/flux/`
Expected: All tests pass. Document any pre-existing failures.

- [ ] **Step 6: Commit**

```bash
git add src/modules/flux/services/__tests__/levelingEngineService.test.ts
git commit -m "test(flux): add unit tests for leveling engine service (#817)"
```

---

## Execution Order & Dependencies

```
Task 1 (radar) ─────────┐
Task 2 (lock/unlock) ───┤ No dependencies between these
Task 3 (canvas header) ─┤ Can run in parallel
Task 4 (prescrever btn) ┘
                         │
Task 5 (PAR-Q) ─────────┤ Modify AthleteDetailView — must run after Task 2 & 6
Task 6 (payment dup) ───┘ to avoid merge conflicts on same file
                         │
Task 7 (exercise cards) ─── Independent
                         │
Task 8 (groups) ─────────── Requires migration before frontend
Task 9 (custom levels) ──── Requires migration before frontend; depends on Task 8 pattern
                         │
Task 10 (tests) ─────────── Can run anytime, but best after Task 9 changes to levelingEngine
```

**Recommended parallel batches:**
1. **Batch A** (parallel): Tasks 1, 3, 4, 7
2. **Batch B** (sequential on AthleteDetailView): Tasks 2 → 5 → 6
3. **Batch C** (sequential, requires migrations): Task 8 → Task 9
4. **Batch D**: Task 10 (after all changes stabilize)

---

## Issue Tracking

After completing each task, close the corresponding GitHub issue:

```bash
# Example:
gh issue close 914 --comment "Fixed in commit abc123"
gh issue close 915 --comment "Fixed in commit abc123"
# etc.
```

For #913 (billing notifications), close with a note that the UI duplicate was fixed but notifications are a separate epic.
