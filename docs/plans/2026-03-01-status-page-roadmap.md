# Status Page + Roadmap Completo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the existing Status page into a private, authenticated experience with real incident tracking, changelog, and a public-facing development roadmap.

**Architecture:** 3 new Supabase tables (service_incidents, service_changelog, roadmap_items) with RLS policies and 4 RPCs. Frontend StatusPage refactored to require auth, with a new Roadmap section. Navigation link added to SettingsMenu.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + RPC), Tailwind CSS (Ceramic Design System), Lucide icons.

**Issue:** Closes #599

---

## Task 1: Database Migration — Tables + RLS

**Files:**
- Create: `supabase/migrations/20260301070000_status_page_tables.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================
-- Status Page Tables: incidents, changelog, roadmap
-- ============================================

-- 1. Service Incidents
CREATE TABLE IF NOT EXISTS public.service_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL CHECK (severity IN ('outage', 'degraded', 'maintenance')),
  affected_module TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_incidents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read incidents
CREATE POLICY "Authenticated users can read incidents"
  ON public.service_incidents FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can manage incidents (via Supabase Dashboard for now)

-- 2. Service Changelog
CREATE TABLE IF NOT EXISTS public.service_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  change_type TEXT NOT NULL CHECK (change_type IN ('feat', 'fix', 'improvement', 'security', 'infra', 'docs', 'perf')),
  description TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  commit_sha TEXT,
  pr_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read changelog"
  ON public.service_changelog FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Roadmap Items
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  module TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'done')) DEFAULT 'planned',
  quarter TEXT,
  priority INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read roadmap"
  ON public.roadmap_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_service_incidents_started_at ON public.service_incidents(started_at DESC);
CREATE INDEX idx_service_changelog_date ON public.service_changelog(date DESC);
CREATE INDEX idx_roadmap_items_status ON public.roadmap_items(status);
```

**Step 2: Run migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully, 3 tables created.

**Step 3: Verify tables exist**

Run: `npx supabase db diff`
Expected: No diff (migration applied).

**Step 4: Commit**

```bash
git add supabase/migrations/20260301070000_status_page_tables.sql
git commit -m "feat(database): add service_incidents, service_changelog, roadmap_items tables

Closes #599

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Database Migration — RPCs

**Files:**
- Create: `supabase/migrations/20260301070001_status_page_rpcs.sql`

**Step 1: Write the RPCs**

```sql
-- ============================================
-- Status Page RPCs
-- ============================================

-- 1. get_overall_service_status: Returns 'operational', 'degraded', or 'outage'
CREATE OR REPLACE FUNCTION public.get_overall_service_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM public.service_incidents
            WHERE resolved_at IS NULL AND severity = 'outage'
          ) THEN 'outage'
          WHEN EXISTS (
            SELECT 1 FROM public.service_incidents
            WHERE resolved_at IS NULL AND severity IN ('degraded', 'maintenance')
          ) THEN 'degraded'
          ELSE 'operational'
        END
    ),
    'operational'
  );
$$;

-- 2. get_public_incidents: Returns recent incidents (last 30 days)
CREATE OR REPLACE FUNCTION public.get_public_incidents()
RETURNS SETOF public.service_incidents
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.service_incidents
  WHERE started_at >= now() - INTERVAL '30 days'
  ORDER BY started_at DESC
  LIMIT 50;
$$;

-- 3. get_public_changelog: Returns recent changelog entries
CREATE OR REPLACE FUNCTION public.get_public_changelog(p_limit INTEGER DEFAULT 30)
RETURNS SETOF public.service_changelog
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.service_changelog
  ORDER BY date DESC, created_at DESC
  LIMIT p_limit;
$$;

-- 4. get_roadmap_items: Returns all roadmap items ordered by priority
CREATE OR REPLACE FUNCTION public.get_roadmap_items()
RETURNS SETOF public.roadmap_items
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.roadmap_items
  ORDER BY
    CASE status
      WHEN 'in_progress' THEN 0
      WHEN 'planned' THEN 1
      WHEN 'done' THEN 2
    END,
    priority DESC,
    created_at DESC;
$$;
```

**Step 2: Run migration**

Run: `npx supabase db push`
Expected: 4 RPCs created.

**Step 3: Verify RPCs exist**

Run via Supabase SQL Editor or local test:
```sql
SELECT get_overall_service_status();
SELECT * FROM get_public_incidents();
SELECT * FROM get_public_changelog();
SELECT * FROM get_roadmap_items();
```
Expected: All return without errors (empty results initially).

**Step 4: Commit**

```bash
git add supabase/migrations/20260301070001_status_page_rpcs.sql
git commit -m "feat(database): add RPCs for status page (incidents, changelog, roadmap)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Seed Data — Changelog + Roadmap

**Files:**
- Create: `supabase/migrations/20260301070002_status_page_seed.sql`

**Step 1: Write seed data**

Seed the changelog with real recent features/fixes and populate initial roadmap items:

```sql
-- ============================================
-- Seed: Changelog from real recent commits + Roadmap items
-- ============================================

-- Changelog entries (from recent PRs)
INSERT INTO public.service_changelog (date, change_type, description, source, pr_number) VALUES
  ('2026-03-01', 'feat', 'Adicionadas 11 novas funcoes AI para todos os modulos AICA via Telegram', 'github', 598),
  ('2026-02-28', 'fix', 'Correcao na exibicao de cards da biblioteca, unidades de tempo e calculo de duracao no Flux', 'github', 592),
  ('2026-02-28', 'feat', 'Analise de momentos Journey via get_moments_summary no Telegram', 'github', 597),
  ('2026-02-28', 'fix', 'Alinhamento do router AI com schemas reais do banco no Telegram', 'github', 596),
  ('2026-02-28', 'fix', 'Correcao de threading em Forum Topics + card de modulo no Telegram', 'github', 595),
  ('2026-02-27', 'feat', 'Redesign do chat com nova arquitetura de streaming', 'github', NULL),
  ('2026-02-26', 'feat', 'Sistema de cupons de credito para convites', 'github', NULL),
  ('2026-02-25', 'feat', 'Pipeline de processamento de arquivos com testes E2E', 'github', NULL),
  ('2026-02-24', 'feat', 'Redesign da pagina Vida com novo layout', 'github', NULL),
  ('2026-02-24', 'feat', 'Ciclos de treino e releases no modulo Flux', 'github', NULL);

-- Roadmap items
INSERT INTO public.roadmap_items (title, description, module, status, quarter, priority) VALUES
  -- In Progress
  ('Chat AI Redesign', 'Nova experiencia de chat com streaming, contexto persistente e sugestoes inteligentes', 'Chat', 'in_progress', 'Q1 2026', 90),
  ('Telegram Bot Completo', 'Integracao completa com Telegram para todos os 8 modulos', 'Integracoes', 'in_progress', 'Q1 2026', 85),
  ('Pagina de Status e Roadmap', 'Transparencia total sobre status da plataforma e proximos passos', 'Plataforma', 'in_progress', 'Q1 2026', 80),

  -- Planned
  ('Life Score Cross-Domain', 'Metrica composta que avalia saude geral da vida do usuario em todos os dominios', 'Gamificacao', 'planned', 'Q2 2026', 75),
  ('Notificacoes Inteligentes', 'Sistema de notificacoes proativas baseado em padroes do usuario', 'Plataforma', 'planned', 'Q2 2026', 70),
  ('Finance AI Agent', 'Agente de IA para analise financeira automatizada e recomendacoes', 'Finance', 'planned', 'Q2 2026', 65),
  ('Studio Teleprompter', 'Teleprompter inteligente para gravacao de podcasts com pauta sincronizada', 'Studio', 'planned', 'Q2 2026', 60),
  ('Flux WhatsApp Sync', 'Sincronizacao de treinos e feedback via WhatsApp para coaches e atletas', 'Flux', 'planned', 'Q2 2026', 55),
  ('Grants PDF AI Parser', 'Parsing avancado de editais com File Search e extracao estruturada', 'Grants', 'planned', 'Q2 2026', 50),
  ('Journey Weekly Digest', 'Resumo semanal automatico de momentos, emocoes e padroes', 'Journey', 'planned', 'Q2 2026', 45),

  -- Done (recent)
  ('Cupons de Credito', 'Sistema de cupons para convites com creditos de IA', 'Plataforma', 'done', 'Q1 2026', 40),
  ('Flux Canvas Editor', 'Editor visual de blocos de treino para coaches', 'Flux', 'done', 'Q1 2026', 35),
  ('Connections CRM', 'CRM pessoal com 4 arquetipos de espacos e dossie de contatos', 'Connections', 'done', 'Q1 2026', 30);
```

**Step 2: Run migration**

Run: `npx supabase db push`
Expected: Seed data inserted.

**Step 3: Verify data**

```sql
SELECT count(*) FROM service_changelog;  -- Expected: 10
SELECT count(*) FROM roadmap_items;      -- Expected: 13
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260301070002_status_page_seed.sql
git commit -m "feat(database): seed changelog and roadmap with real project data

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Frontend — Move Route to ProtectedRoute + Smart Navigation

**Files:**
- Modify: `src/router/AppRouter.tsx` (lines 684-688)
- Modify: `src/pages/StatusPage.tsx` (lines 456-462, 478-484, 509-517)
- Modify: `src/modules/onboarding/components/landing/components/FooterSection.tsx` (lines 26-31)

**Step 1: Move `/status` route inside ProtectedRoute**

In `AppRouter.tsx`, change the status route from public to protected:

```tsx
// BEFORE (line 684-688):
{/* Service Status - Public route */}
<Route
   path="/status"
   element={<StatusPage />}
/>

// AFTER:
{/* Service Status - Protected route (issue #599) */}
<Route
   path="/status"
   element={<ProtectedRoute><StatusPage /></ProtectedRoute>}
/>
```

**Step 2: Smart "Voltar" button in StatusPage**

In `StatusPage.tsx`, change all 3 `navigate('/landing')` calls to `navigate('/')`:
- Line 457: loading state header
- Line 479: error state header
- Line 511: main content header

Also update aria-label from "Voltar para a pagina inicial" to "Voltar".

**Step 3: Update FooterSection landing page link**

The landing page footer still links to `/status` for SEO/visibility, but since it now requires auth, unauthenticated users will be redirected to login. This is acceptable — the footer link serves as a teaser. No changes needed here (AuthGuard handles redirect).

**Step 4: Run build + typecheck**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/router/AppRouter.tsx src/pages/StatusPage.tsx
git commit -m "feat(status): make status page private (auth required) + smart nav

Closes #599

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Frontend — Add Status Link to SettingsMenu

**Files:**
- Modify: `src/components/layout/SettingsMenu.tsx`

**Step 1: Add Activity (status) icon import**

Add `Activity` to the lucide-react import (line 2):

```tsx
import { Settings, LogOut, DollarSign, FileSearch, Crown, LayoutGrid, Ticket, Gift, Shield, FileText, Activity } from 'lucide-react';
```

**Step 2: Add Status button in the legal section**

Insert a new button BEFORE the Privacy Policy button (after the legal section divider, line 275):

```tsx
{/* Status & Roadmap */}
<button
    onClick={() => {
        navigate('/status');
        setIsOpen(false);
    }}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ceramic-text-primary hover:bg-white/40 transition-all group mb-1"
>
    <div className="w-8 h-8 rounded-full ceramic-inset flex items-center justify-center group-hover:scale-110 transition-transform">
        <Activity className="w-4 h-4 text-ceramic-text-secondary group-hover:text-ceramic-success" />
    </div>
    <span className="font-bold text-sm transition-colors">
        Status & Roadmap
    </span>
</button>
```

**Step 3: Run build + typecheck**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/layout/SettingsMenu.tsx
git commit -m "feat(nav): add Status & Roadmap link to SettingsMenu

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Frontend — Add Roadmap Section to StatusPage

**Files:**
- Modify: `src/pages/StatusPage.tsx`

This is the largest task. It adds:
1. `RoadmapItem` type
2. `get_roadmap_items()` RPC call
3. Roadmap UI section with cards grouped by status (In Progress / Planned / Done)
4. Module badges with color mapping
5. Upvote button (visual only for now, no write RPC)

**Step 1: Add RoadmapItem type**

After the `ChangelogEntry` interface (line 42), add:

```tsx
type RoadmapStatus = 'planned' | 'in_progress' | 'done';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  module: string | null;
  status: RoadmapStatus;
  quarter: string | null;
  priority: number;
  upvotes: number;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Add roadmap config constants**

After `CHANGE_TYPE_CONFIG` (line 105), add:

```tsx
const ROADMAP_STATUS_CONFIG: Record<
  RoadmapStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  in_progress: {
    label: 'Em Desenvolvimento',
    icon: Clock,
    color: 'text-ceramic-info',
    bgColor: 'bg-ceramic-info/10',
  },
  planned: {
    label: 'Planejado',
    icon: Tag,
    color: 'text-ceramic-warning',
    bgColor: 'bg-amber-50',
  },
  done: {
    label: 'Concluido',
    icon: CheckCircle2,
    color: 'text-ceramic-success',
    bgColor: 'bg-ceramic-success/10',
  },
};

const MODULE_COLORS: Record<string, string> = {
  'Atlas': 'bg-blue-100 text-blue-700',
  'Journey': 'bg-purple-100 text-purple-700',
  'Studio': 'bg-rose-100 text-rose-700',
  'Grants': 'bg-emerald-100 text-emerald-700',
  'Connections': 'bg-cyan-100 text-cyan-700',
  'Finance': 'bg-amber-100 text-amber-700',
  'Flux': 'bg-orange-100 text-orange-700',
  'Chat': 'bg-indigo-100 text-indigo-700',
  'Gamificacao': 'bg-yellow-100 text-yellow-700',
  'Plataforma': 'bg-ceramic-cool text-ceramic-text-secondary',
  'Integracoes': 'bg-teal-100 text-teal-700',
};
```

**Step 3: Add roadmap state + fetch**

In the `StatusPage` component, add state for roadmap:

```tsx
const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
```

Update `fetchData` to include the roadmap RPC:

```tsx
const [statusRes, incidentsRes, changelogRes, roadmapRes] = await Promise.all([
  supabase.rpc('get_overall_service_status'),
  supabase.rpc('get_public_incidents'),
  supabase.rpc('get_public_changelog', { p_limit: 30 }),
  supabase.rpc('get_roadmap_items'),
]);

// ... existing error checks ...
if (roadmapRes.error) throw roadmapRes.error;

// ... existing state sets ...
setRoadmap((roadmapRes.data as RoadmapItem[]) || []);
```

**Step 4: Add roadmap grouping helper**

After `groupChangelogByDate` function:

```tsx
function groupRoadmapByStatus(items: RoadmapItem[]): Map<RoadmapStatus, RoadmapItem[]> {
  const groups = new Map<RoadmapStatus, RoadmapItem[]>();
  const order: RoadmapStatus[] = ['in_progress', 'planned', 'done'];
  for (const status of order) {
    groups.set(status, []);
  }
  for (const item of items) {
    const existing = groups.get(item.status) || [];
    existing.push(item);
    groups.set(item.status, existing);
  }
  return groups;
}
```

**Step 5: Add roadmap memo + render section**

Add memo:

```tsx
const roadmapGroups = useMemo(() => groupRoadmapByStatus(roadmap), [roadmap]);
```

Add the Roadmap section in the JSX, between the Incidents section and the Changelog section:

```tsx
{/* Roadmap */}
<section className="mb-16">
  <h2 className="text-2xl font-bold text-ceramic-text-primary mb-2">
    Roadmap de Desenvolvimento
  </h2>
  <p className="text-sm text-ceramic-text-secondary mb-6">
    O que estamos construindo e o que vem por ai.
  </p>

  {roadmap.length === 0 ? (
    <p className="text-sm text-ceramic-text-secondary">
      Nenhum item no roadmap ainda.
    </p>
  ) : (
    <div className="space-y-8">
      {Array.from(roadmapGroups.entries()).map(([status, items]) => {
        if (items.length === 0) return null;
        const cfg = ROADMAP_STATUS_CONFIG[status];
        const StatusIcon = cfg.icon;

        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-4">
              <StatusIcon size={18} className={cfg.color} />
              <h3 className={`text-base font-semibold ${cfg.color}`}>
                {cfg.label}
              </h3>
              <span className="text-xs text-ceramic-text-secondary bg-ceramic-cool rounded-full px-2 py-0.5">
                {items.length}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const moduleColor = item.module
                  ? MODULE_COLORS[item.module] || 'bg-ceramic-cool text-ceramic-text-secondary'
                  : null;

                return (
                  <div
                    key={item.id}
                    className={`${cfg.bgColor} border border-ceramic-border rounded-xl p-5 transition-shadow hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-sm font-semibold text-ceramic-text-primary leading-snug">
                        {item.title}
                      </h4>
                      {item.quarter && (
                        <span className="text-[10px] font-medium text-ceramic-text-secondary bg-ceramic-cool border border-ceramic-border rounded-full px-2 py-0.5 shrink-0">
                          {item.quarter}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ceramic-text-secondary leading-relaxed mb-3">
                      {item.description}
                    </p>
                    {moduleColor && (
                      <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${moduleColor}`}>
                        {item.module}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>
```

**Step 6: Run build + typecheck**

Run: `npm run build && npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/pages/StatusPage.tsx
git commit -m "feat(status): add Roadmap section with grouped cards by status

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Manual Verification + Final Commit

**Step 1: Run full quality check**

```bash
npm run build && npm run typecheck && npm run lint
```
Expected: All pass.

**Step 2: Manual testing checklist**

- [ ] Navigate to `/status` while NOT logged in → should redirect to `/landing`
- [ ] Log in → navigate to Settings Menu → see "Status & Roadmap" link
- [ ] Click "Status & Roadmap" → opens StatusPage
- [ ] StatusPage shows: status banner, 24h timeline, incidents (empty), roadmap (3 sections), changelog
- [ ] "Voltar" button → navigates to `/` (dashboard)
- [ ] Roadmap cards display correctly: In Progress / Planned / Done
- [ ] Module badges show correct colors
- [ ] Mobile responsive: cards stack vertically

**Step 3: Create PR**

```bash
git push -u origin feature/feat-status-page-access
gh pr create --title "feat(status): private status page with roadmap (#599)" --body "$(cat <<'EOF'
## Summary
- Closes #599
- Makes `/status` route private (requires authentication)
- Adds "Status & Roadmap" link to SettingsMenu for logged-in users
- Creates 3 new database tables: `service_incidents`, `service_changelog`, `roadmap_items`
- Adds 4 RPCs for data retrieval
- Seeds changelog with real project history and roadmap with planned features
- Adds new Roadmap section to StatusPage with cards grouped by status

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] `/status` redirects to login when not authenticated
- [ ] Settings menu shows "Status & Roadmap" link
- [ ] StatusPage displays roadmap grouped by In Progress / Planned / Done
- [ ] "Voltar" button navigates to dashboard

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
