# Coach Invite Links ("Link Coringa") Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow coaches to generate reusable invite links with usage limits, so they can share one link with 10+ athletes instead of creating individual links.

**Architecture:** New `coach_invite_links` table stores link metadata (token, max_uses, health config). A public RPC `use_coach_invite_link` atomically validates the token, creates an athlete, and increments usage. Frontend adds a "Link Coringa" option after athlete creation and a new public `/join/:token` page.

**Tech Stack:** Supabase (PostgreSQL + RLS + RPC), React 18 + TypeScript, Tailwind CSS (Ceramic Design System)

---

## File Map

| Task | Files | Action |
|------|-------|--------|
| 1 | `supabase/migrations/20260317100004_add_coach_invite_links.sql` | Create |
| 2 | `src/modules/flux/services/coachInviteLinkService.ts` | Create |
| 3 | `src/modules/flux/components/forms/AthleteFormDrawer.tsx` | Modify |
| 4 | `src/modules/flux/views/CoachInviteView.tsx` | Create |
| 5 | `src/router/AppRouter.tsx` | Modify |

---

## Task 1: Database — coach_invite_links table + RPC

**Files:**
- Create: `supabase/migrations/20260317100004_add_coach_invite_links.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Coach invite links ("Link Coringa")
-- Reusable links with usage limits for bulk athlete onboarding

CREATE TABLE IF NOT EXISTS public.coach_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  max_uses INT NOT NULL DEFAULT 10,
  current_uses INT NOT NULL DEFAULT 0,
  health_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT positive_max_uses CHECK (max_uses > 0),
  CONSTRAINT valid_current_uses CHECK (current_uses >= 0 AND current_uses <= max_uses)
);

-- RLS
ALTER TABLE public.coach_invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_read_own_links" ON public.coach_invite_links
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coach_insert_own_links" ON public.coach_invite_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach_update_own_links" ON public.coach_invite_links
  FOR UPDATE USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_coach_invite_links_token ON public.coach_invite_links(token);
CREATE INDEX idx_coach_invite_links_user_id ON public.coach_invite_links(user_id);

-- Public RPC: validate token + create athlete + increment uses (atomic)
CREATE OR REPLACE FUNCTION public.use_coach_invite_link(
  p_token TEXT,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_auth_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link coach_invite_links;
  v_athlete_id UUID;
BEGIN
  -- Lock the link row to prevent race conditions
  SELECT * INTO v_link
  FROM coach_invite_links
  WHERE token = p_token
  FOR UPDATE;

  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
  END IF;

  IF NOT v_link.is_active THEN
    RAISE EXCEPTION 'Link desativado';
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Link expirado';
  END IF;

  IF v_link.current_uses >= v_link.max_uses THEN
    RAISE EXCEPTION 'Limite de usos atingido';
  END IF;

  -- Extract health config
  -- Create athlete record
  INSERT INTO athletes (
    user_id,
    name,
    email,
    phone,
    status,
    invitation_status,
    requires_cardio_exam,
    requires_clearance_cert,
    allow_parq_onboarding,
    auth_user_id,
    linked_at,
    level
  ) VALUES (
    v_link.user_id,
    p_name,
    p_email,
    p_phone,
    CASE WHEN p_auth_user_id IS NOT NULL THEN 'active' ELSE 'trial' END,
    CASE WHEN p_auth_user_id IS NOT NULL THEN 'connected' ELSE 'pending' END,
    COALESCE((v_link.health_config->>'requires_cardio_exam')::boolean, false),
    COALESCE((v_link.health_config->>'requires_clearance_cert')::boolean, false),
    COALESCE((v_link.health_config->>'allow_parq_onboarding')::boolean, false),
    p_auth_user_id,
    CASE WHEN p_auth_user_id IS NOT NULL THEN now() ELSE NULL END,
    'iniciante'
  )
  RETURNING id INTO v_athlete_id;

  -- Increment usage counter
  UPDATE coach_invite_links
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = v_link.id;

  RETURN v_athlete_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_coach_invite_link(TEXT, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.use_coach_invite_link(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Public RPC: get link info (for /join/:token page, no auth needed)
CREATE OR REPLACE FUNCTION public.get_coach_invite_link(p_token TEXT)
RETURNS TABLE (
  coach_name TEXT,
  is_valid BOOLEAN,
  error_message TEXT,
  requires_cardio_exam BOOLEAN,
  requires_clearance_cert BOOLEAN,
  allow_parq_onboarding BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link coach_invite_links;
  v_coach_name TEXT;
BEGIN
  SELECT * INTO v_link
  FROM coach_invite_links
  WHERE token = p_token;

  IF v_link IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, false, 'Link não encontrado'::TEXT, false, false, false;
    RETURN;
  END IF;

  -- Get coach name
  SELECT raw_user_meta_data->>'full_name'
  INTO v_coach_name
  FROM auth.users
  WHERE id = v_link.user_id;

  IF NOT v_link.is_active THEN
    RETURN QUERY SELECT v_coach_name, false, 'Link desativado pelo treinador'::TEXT, false, false, false;
    RETURN;
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN QUERY SELECT v_coach_name, false, 'Link expirado'::TEXT, false, false, false;
    RETURN;
  END IF;

  IF v_link.current_uses >= v_link.max_uses THEN
    RETURN QUERY SELECT v_coach_name, false, 'Limite de vagas atingido'::TEXT, false, false, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_coach_name,
    true,
    NULL::TEXT,
    COALESCE((v_link.health_config->>'requires_cardio_exam')::boolean, false),
    COALESCE((v_link.health_config->>'requires_clearance_cert')::boolean, false),
    COALESCE((v_link.health_config->>'allow_parq_onboarding')::boolean, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_invite_link(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_coach_invite_link(TEXT) TO authenticated;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

- [ ] **Step 3: Verify tables and RPCs exist**

```sql
SELECT * FROM coach_invite_links LIMIT 0;
SELECT public.get_coach_invite_link('test-token');
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260317100004_add_coach_invite_links.sql
git commit -m "feat(flux): add coach_invite_links table + RPCs for Link Coringa"
```

---

## Task 2: Service Layer — CoachInviteLinkService

**Files:**
- Create: `src/modules/flux/services/coachInviteLinkService.ts`

- [ ] **Step 1: Create service**

```typescript
/**
 * Coach Invite Link Service
 *
 * Manages reusable invite links ("Link Coringa") for bulk athlete onboarding.
 */

import { supabase } from '@/services/supabaseClient';

export interface CoachInviteLink {
  id: string;
  user_id: string;
  token: string;
  max_uses: number;
  current_uses: number;
  health_config: {
    requires_cardio_exam: boolean;
    requires_clearance_cert: boolean;
    allow_parq_onboarding: boolean;
  };
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 8-char nanoid-style token (URL-safe)
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (const byte of array) {
    token += chars[byte % chars.length];
  }
  return token;
}

export class CoachInviteLinkService {
  /**
   * Get active invite link matching health config (reuse if exists)
   */
  static async findActiveLink(healthConfig: CoachInviteLink['health_config']): Promise<CoachInviteLink | null> {
    const { data } = await supabase
      .from('coach_invite_links')
      .select('*')
      .eq('is_active', true)
      .eq('health_config', JSON.stringify(healthConfig))
      .gt('max_uses', 0) // sanity check
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) return null;

    const link = data[0] as CoachInviteLink;
    // Check not expired and not full
    if (link.expires_at && new Date(link.expires_at) < new Date()) return null;
    if (link.current_uses >= link.max_uses) return null;

    return link;
  }

  /**
   * Create a new invite link
   */
  static async createLink(healthConfig: CoachInviteLink['health_config'], maxUses = 10): Promise<{
    data: CoachInviteLink | null;
    error: any;
  }> {
    const token = generateToken();

    const { data, error } = await supabase
      .from('coach_invite_links')
      .insert({
        token,
        max_uses: maxUses,
        health_config: healthConfig,
      })
      .select()
      .single();

    return { data: data as CoachInviteLink | null, error };
  }

  /**
   * Get or create an invite link with matching health config
   */
  static async getOrCreateLink(healthConfig: CoachInviteLink['health_config'], maxUses = 10): Promise<{
    data: CoachInviteLink | null;
    error: any;
  }> {
    // Try to reuse existing active link with same config
    const existing = await this.findActiveLink(healthConfig);
    if (existing) return { data: existing, error: null };

    // Create new
    return this.createLink(healthConfig, maxUses);
  }

  /**
   * Get all links for current coach
   */
  static async getMyLinks(): Promise<{ data: CoachInviteLink[]; error: any }> {
    const { data, error } = await supabase
      .from('coach_invite_links')
      .select('*')
      .order('created_at', { ascending: false });

    return { data: (data || []) as CoachInviteLink[], error };
  }

  /**
   * Deactivate a link
   */
  static async deactivateLink(linkId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('coach_invite_links')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', linkId);

    return { error };
  }
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | grep coachInviteLinkService`

- [ ] **Step 3: Commit**

```bash
git add src/modules/flux/services/coachInviteLinkService.ts
git commit -m "feat(flux): add CoachInviteLinkService for Link Coringa CRUD"
```

---

## Task 3: AthleteFormDrawer — Show Link Coringa after creation

**Files:**
- Modify: `src/modules/flux/components/forms/AthleteFormDrawer.tsx`

- [ ] **Step 1: Import service and add state**

Add import:
```typescript
import { CoachInviteLinkService, type CoachInviteLink } from '../../services/coachInviteLinkService';
```

Add state:
```typescript
const [coringaLink, setCoringaLink] = useState<CoachInviteLink | null>(null);
const [coringaCopyToast, setCoringaCopyToast] = useState(false);
```

Add helper:
```typescript
const getCoringaUrl = (token: string) => `https://aica.guru/join/${token}`;

const handleCopyCoringaLink = async (token: string) => {
  try {
    await navigator.clipboard.writeText(getCoringaUrl(token));
    setCoringaCopyToast(true);
    setTimeout(() => setCoringaCopyToast(false), 3000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};
```

- [ ] **Step 2: Generate coringa link after successful creation**

In the `useEffect` or after `submitSuccess` is set, trigger the coringa link generation. The best place is right after `onSave` succeeds. Since the form hook handles submit, add an effect:

```typescript
// Generate coringa link when athlete is created successfully
useEffect(() => {
  if (mode === 'create' && submitSuccess && !coringaLink) {
    const healthConfig = {
      requires_cardio_exam: formData.requires_cardio_exam,
      requires_clearance_cert: formData.requires_clearance_cert,
      allow_parq_onboarding: formData.allow_parq_onboarding,
    };
    CoachInviteLinkService.getOrCreateLink(healthConfig).then(({ data }) => {
      if (data) setCoringaLink(data);
    });
  }
}, [submitSuccess, mode, coringaLink, formData.requires_cardio_exam, formData.requires_clearance_cert, formData.allow_parq_onboarding]);
```

- [ ] **Step 3: Update the success UI to show both links**

Replace the current single-link success block with two sections:

```tsx
{/* Create mode: Show invite links after success */}
{mode === 'create' && submitSuccess && createdAthleteId && (
  <div className="space-y-3">
    {/* Individual Link */}
    <div className="ceramic-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-ceramic-text-secondary" />
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
          Link Individual
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={getInviteLink(createdAthleteId)}
          className="flex-1 ceramic-inset px-3 py-2 rounded-lg text-[10px] text-ceramic-text-secondary font-mono select-all"
        />
        <button
          type="button"
          onClick={() => handleCopyInviteLink(createdAthleteId)}
          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <Copy className="w-3.5 h-3.5" />
          {copyToast ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-[10px] text-ceramic-text-secondary">Para este atleta especifico</p>
    </div>

    {/* Link Coringa */}
    <div className="ceramic-card p-4 space-y-3 border-2 border-amber-300/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-600" />
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Link Coringa
          </p>
        </div>
        {coringaLink && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
            {coringaLink.current_uses}/{coringaLink.max_uses} usos
          </span>
        )}
      </div>
      {coringaLink ? (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={getCoringaUrl(coringaLink.token)}
              className="flex-1 ceramic-inset px-3 py-2 rounded-lg text-[10px] text-ceramic-text-secondary font-mono select-all"
            />
            <button
              type="button"
              onClick={() => handleCopyCoringaLink(coringaLink.token)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {coringaCopyToast ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-[10px] text-ceramic-text-secondary">
            Reutilizavel — compartilhe em grupo (WhatsApp, email). Mesmas configs de saude.
          </p>
        </>
      ) : (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
          <span className="text-xs text-ceramic-text-secondary">Gerando link...</span>
        </div>
      )}
    </div>
  </div>
)}
```

Also add `Users` to lucide-react imports.

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | grep AthleteFormDrawer`

- [ ] **Step 5: Commit**

```bash
git add src/modules/flux/components/forms/AthleteFormDrawer.tsx
git commit -m "feat(flux): show Link Coringa after athlete creation in form drawer"
```

---

## Task 4: CoachInviteView — Public /join/:token page

**Files:**
- Create: `src/modules/flux/views/CoachInviteView.tsx`

- [ ] **Step 1: Create the page component**

Follows the same 3-step pattern as AthleteOnboardingView but uses the `use_coach_invite_link` RPC instead of `complete_athlete_onboarding`:

```typescript
/**
 * CoachInviteView — Public page for coach invite links ("Link Coringa")
 *
 * Route: /join/:token (public, no auth required)
 *
 * Flow:
 * 1. Load link info via get_coach_invite_link RPC
 * 2. Athlete fills name, email, phone
 * 3. Calls use_coach_invite_link RPC → creates athlete
 * 4. Shows health doc requirements
 * 5. Redirects to /onboarding/:athleteId for account creation
 */
```

Key differences from AthleteOnboardingView:
- Uses `token` param instead of `athleteId`
- Step 1: Load link info via `get_coach_invite_link(token)` — shows coach name
- Step 2: Submit calls `use_coach_invite_link(token, name, email, phone)` → returns `athlete_id`
- Step 3: Redirect to `/onboarding/${athleteId}` (reuses existing onboarding flow for account creation)
- Error states: "Link expirado", "Limite atingido", "Link não encontrado"

The component structure is simpler — just 2 steps:
1. **Dados pessoais** (name, email, phone) — submit creates athlete
2. **Redirect** to onboarding (for health docs + account)

- [ ] **Step 2: Implement the component** (full code in implementation, follow AthleteOnboardingView pattern)

Core logic:
```typescript
// Load link info
const { data } = await supabase.rpc('get_coach_invite_link', { p_token: token });
const linkInfo = data?.[0];
if (!linkInfo?.is_valid) { setError(linkInfo?.error_message); return; }

// Submit: create athlete via RPC
const { data: athleteId, error } = await supabase.rpc('use_coach_invite_link', {
  p_token: token,
  p_name: name,
  p_email: email,
  p_phone: phone,
  p_auth_user_id: user?.id || null,
});
if (error) throw error;
// Redirect to onboarding for health docs + account
navigate(`/onboarding/${athleteId}`);
```

- [ ] **Step 3: Verify TypeScript**

- [ ] **Step 4: Commit**

```bash
git add src/modules/flux/views/CoachInviteView.tsx
git commit -m "feat(flux): add CoachInviteView for /join/:token public page"
```

---

## Task 5: Router — Add /join/:token route

**Files:**
- Modify: `src/router/AppRouter.tsx`

- [ ] **Step 1: Add lazy import**

Near the other Flux lazy imports:
```typescript
const CoachInviteView = lazy(() => import('../modules/flux/views/CoachInviteView').then(m => ({ default: m.default })));
```

- [ ] **Step 2: Add public route**

Near the `/onboarding/:athleteId` route:
```tsx
{/* Coach Invite Link — Public route for reusable invite links */}
<Route
  path="/join/:token"
  element={
    <Suspense fallback={<LoadingScreen message="Carregando..." />}>
      <CoachInviteView />
    </Suspense>
  }
/>
```

- [ ] **Step 3: Verify TypeScript**

- [ ] **Step 4: Commit**

```bash
git add src/router/AppRouter.tsx
git commit -m "feat(flux): add /join/:token route for Link Coringa"
```

---

## Execution Order

```
Task 1 (migration) → Task 2 (service) → Task 3 (form drawer) → Task 4 (join page) → Task 5 (router)
```

All tasks are sequential — each depends on the previous.

---

## Verification Checklist

After all tasks:
- [ ] `npx tsc --noEmit` — 0 new errors
- [ ] Coach can create athlete → sees both Individual and Coringa links
- [ ] Coringa link URL works at `/join/:token`
- [ ] Athlete fills form → athlete created via RPC → redirected to onboarding
- [ ] Second athlete uses same link → works, counter increments
- [ ] Link at max uses → shows "Limite atingido" error
- [ ] Coach reusing form with same health config → gets same coringa link (not new)
