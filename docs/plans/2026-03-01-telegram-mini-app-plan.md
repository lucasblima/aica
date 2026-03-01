# Telegram Mini App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Embed a single-page Daily Summary dashboard inside Telegram as a Mini App, accessible at `aica.guru/mini-app`.

**Architecture:** Multi-page Vite build adds a second entry point (`mini-app.html`) alongside the existing `index.html`. A new Edge Function (`telegram-mini-app-auth`) validates Telegram's `initData` HMAC signature, resolves the linked AICA user, and returns a custom JWT. The Mini App uses this JWT for all Supabase queries via RLS.

**Tech Stack:** `@twa-dev/sdk` (Telegram WebApp), React 18, Supabase JS client, Vite multi-page build, Tailwind CSS (Ceramic tokens), `djwt` (Deno JWT)

**Design doc:** `docs/plans/2026-03-01-telegram-mini-app-design.md`

**Agent Team:**
- **Backend**: Task 1 (Edge Function auth)
- **Frontend**: Tasks 2-10 (SDK, Vite, components)
- **Both**: Task 11 (verification)

---

### Task 1: Create `telegram-mini-app-auth` Edge Function

**Owner:** Backend agent

**Files:**
- Create: `supabase/functions/telegram-mini-app-auth/index.ts`

**Reference docs:**
- HMAC validation: issue #574 section 6 ("Mini App auth differs from Login Widget — uses `HMAC-SHA-256(bot_token, "WebAppData")`")
- Existing webhook pattern: `supabase/functions/telegram-webhook/index.ts:622-629`
- CORS helper: `supabase/functions/_shared/cors.ts`
- Deno JWT: `https://deno.land/x/djwt@v3.0.2/mod.ts`

**Step 1: Create the Edge Function file**

```typescript
// supabase/functions/telegram-mini-app-auth/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// ---------------------------------------------------------------------------
// CORS (inline — mini-app only needs POST + OPTIONS)
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://dev.aica.guru",
  "https://aica.guru",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ---------------------------------------------------------------------------
// Telegram initData HMAC-SHA-256 validation
// ---------------------------------------------------------------------------
async function validateInitData(
  initData: string,
  botToken: string
): Promise<Record<string, string> | null> {
  // Parse the initData query string
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  // Check freshness (max 24 hours)
  const authDate = parseInt(params.get("auth_date") || "0", 10);
  if (Date.now() / 1000 - authDate > 86400) return null;

  // Build the data-check-string (sorted key=value pairs, excluding hash)
  const entries: [string, string][] = [];
  params.forEach((value, key) => {
    if (key !== "hash") entries.push([key, value]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  // Mini App validation uses HMAC-SHA-256(HMAC-SHA-256(bot_token, "WebAppData"), data_check_string)
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const secretHash = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(botToken)
  );

  const validationKey = await crypto.subtle.importKey(
    "raw",
    secretHash,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const computedHash = await crypto.subtle.sign(
    "HMAC",
    validationKey,
    encoder.encode(dataCheckString)
  );

  // Compare hashes (constant-time via hex string comparison)
  const computedHex = Array.from(new Uint8Array(computedHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHex !== hash) return null;

  // Return parsed fields as object
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

// ---------------------------------------------------------------------------
// JWT creation (compatible with Supabase RLS)
// ---------------------------------------------------------------------------
async function createSessionJwt(
  userId: string,
  telegramId: number,
  jwtSecret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      sub: userId,
      role: "authenticated",
      telegram_id: telegramId,
      iss: "supabase",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      iat: Math.floor(Date.now() / 1000),
    },
    key
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const { initData } = await req.json();
    if (!initData || typeof initData !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing initData" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Validate HMAC
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    const parsed = await validateInitData(initData, botToken);
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Invalid initData signature" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Extract Telegram user
    const userJson = parsed.user;
    if (!userJson) {
      return new Response(
        JSON.stringify({ error: "No user in initData" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    const telegramUser = JSON.parse(userJson);
    const telegramId = telegramUser.id as number;

    // Lookup linked AICA user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: linkData } = await supabase
      .from("user_telegram_links")
      .select("user_id, telegram_username, status, consent_given")
      .eq("telegram_id", telegramId)
      .eq("status", "active")
      .maybeSingle();

    if (!linkData) {
      // Not linked — return Telegram user info only
      return new Response(
        JSON.stringify({
          linked: false,
          telegram_user: {
            id: telegramId,
            first_name: telegramUser.first_name,
            username: telegramUser.username,
          },
        }),
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Linked — create session JWT
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      console.error("[mini-app-auth] JWT_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const sessionToken = await createSessionJwt(linkData.user_id, telegramId, jwtSecret);

    // Fetch user profile for greeting
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", linkData.user_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        linked: true,
        session_token: sessionToken,
        user: {
          id: linkData.user_id,
          display_name: profile?.display_name || telegramUser.first_name,
          avatar_url: profile?.avatar_url,
          telegram_username: linkData.telegram_username,
        },
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[mini-app-auth] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
```

**Step 2: Deploy and test with curl**

```bash
npx supabase functions deploy telegram-mini-app-auth
```

Test (will return 401 because initData is fake, which proves validation works):
```bash
curl -X POST https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/telegram-mini-app-auth \
  -H "Content-Type: application/json" \
  -d '{"initData":"hash=abc123&auth_date=1234567890&user={\"id\":12345}"}'
```

Expected: `{"error":"Invalid initData signature"}` with status 401.

**Step 3: Commit**

```bash
git add supabase/functions/telegram-mini-app-auth/index.ts
git commit -m "feat(telegram): add Mini App initData auth Edge Function"
```

---

### Task 2: Install SDK + Configure Vite Multi-Page Build

**Owner:** Frontend agent

**Files:**
- Modify: `vite.config.ts` (add multi-page input)
- Modify: `package.json` (add @twa-dev/sdk)

**Step 1: Install Telegram Web App SDK**

```bash
npm install @twa-dev/sdk
```

**Step 2: Modify vite.config.ts for multi-page build**

Add `resolve` import at top and add `input` to `rollupOptions`:

```typescript
// At the top of vite.config.ts, ensure this import exists:
import { resolve } from 'path'

// Inside defineConfig -> build -> rollupOptions, ADD the input field:
// (keep existing manualChunks, just add input alongside it)
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      'mini-app': resolve(__dirname, 'mini-app.html'),
    },
    output: {
      manualChunks(id) {
        // ... existing chunk logic stays unchanged ...
      }
    }
  },
  // ... rest of build config unchanged ...
}
```

**Step 3: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds. Warning about missing `mini-app.html` is OK for now (we create it next).

**Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "feat(telegram): add @twa-dev/sdk and multi-page Vite config"
```

---

### Task 3: Create `mini-app.html` Entry Point

**Owner:** Frontend agent

**Files:**
- Create: `mini-app.html` (project root, alongside `index.html`)

**Step 1: Create mini-app.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>AICA - Mini App</title>
  <!-- Telegram Web App script MUST be loaded before our code -->
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <!-- Same fonts as main app for consistency -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* Minimal reset — Telegram handles chrome */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Nunito', sans-serif; -webkit-font-smoothing: antialiased; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body>
  <div id="mini-app-root"></div>
  <script type="module" src="/src/telegram-mini-app/main.tsx"></script>
</body>
</html>
```

**Step 2: Verify build recognizes both entry points**

```bash
npm run build 2>&1 | head -20
```

Expected: Build runs (may fail because `src/telegram-mini-app/main.tsx` doesn't exist yet — that's OK).

**Step 3: Commit**

```bash
git add mini-app.html
git commit -m "feat(telegram): add mini-app.html entry point"
```

---

### Task 4: Create Telegram Theme Integration

**Owner:** Frontend agent

**Files:**
- Create: `src/telegram-mini-app/theme.ts`

**Step 1: Create theme mapping file**

```typescript
// src/telegram-mini-app/theme.ts
import WebApp from '@twa-dev/sdk'

/**
 * Ceramic fallback colors for when Telegram theme params are unavailable.
 * Source: tailwind.config.js -> colors.ceramic
 */
const CERAMIC_FALLBACKS = {
  bg_color: '#F0EFE9',
  text_color: '#5C554B',
  hint_color: '#948D82',
  button_color: '#D97706',
  button_text_color: '#FFFFFF',
  secondary_bg_color: '#E8EBE9',
  header_bg_color: '#F0EFE9',
  accent_text_color: '#D97706',
  section_bg_color: '#F0EFE9',
  section_header_text_color: '#948D82',
  subtitle_text_color: '#948D82',
  destructive_text_color: '#9B4D3A',
} as const

type ThemeKey = keyof typeof CERAMIC_FALLBACKS

/**
 * Apply Telegram theme as CSS custom properties on :root.
 * Call once at app startup.
 */
export function applyTelegramTheme(): void {
  const root = document.documentElement
  const tp = WebApp.themeParams || {}

  for (const [key, fallback] of Object.entries(CERAMIC_FALLBACKS)) {
    const value = (tp as Record<string, string | undefined>)[key] || fallback
    root.style.setProperty(`--tg-${key.replace(/_/g, '-')}`, value)
  }

  // Set color scheme for Tailwind dark mode detection
  const colorScheme = WebApp.colorScheme || 'light'
  root.setAttribute('data-theme', colorScheme)
}

/**
 * CSS variable names for use in Tailwind arbitrary values or inline styles.
 * Example: `className="bg-[var(--tg-bg-color)]"`
 */
export const tgVar = (key: ThemeKey) =>
  `var(--tg-${key.replace(/_/g, '-')})`
```

**Step 2: Commit**

```bash
git add src/telegram-mini-app/theme.ts
git commit -m "feat(telegram): add theme mapping with Ceramic fallbacks"
```

---

### Task 5: Create Auth Service + Hook

**Owner:** Frontend agent

**Files:**
- Create: `src/telegram-mini-app/services/miniAppAuthService.ts`
- Create: `src/telegram-mini-app/hooks/useTelegramAuth.ts`

**Step 1: Create the auth service**

```typescript
// src/telegram-mini-app/services/miniAppAuthService.ts
import WebApp from '@twa-dev/sdk'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export interface MiniAppUser {
  id: string
  display_name: string
  avatar_url: string | null
  telegram_username: string | null
}

export interface AuthResult {
  linked: boolean
  session_token?: string
  user?: MiniAppUser
  telegram_user?: {
    id: number
    first_name: string
    username?: string
  }
}

/**
 * Validate initData with our Edge Function and get session token.
 * Returns null if initData is unavailable (not running inside Telegram).
 */
export async function authenticateMiniApp(): Promise<AuthResult | null> {
  const initData = WebApp.initData
  if (!initData) return null

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/telegram-mini-app-auth`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ initData }),
    }
  )

  if (!res.ok) {
    console.error('[mini-app-auth] Failed:', res.status, await res.text())
    return null
  }

  return res.json()
}
```

**Step 2: Create the auth hook**

```typescript
// src/telegram-mini-app/hooks/useTelegramAuth.ts
import { useState, useEffect } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  authenticateMiniApp,
  type AuthResult,
  type MiniAppUser,
} from '../services/miniAppAuthService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface UseTelegramAuthReturn {
  isLoading: boolean
  isLinked: boolean
  user: MiniAppUser | null
  telegramUser: AuthResult['telegram_user'] | null
  supabase: SupabaseClient | null
  error: string | null
}

/**
 * Authenticates via Telegram initData, resolves linked AICA user,
 * and returns a Supabase client configured with the session JWT.
 */
export function useTelegramAuth(): UseTelegramAuthReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [isLinked, setIsLinked] = useState(false)
  const [user, setUser] = useState<MiniAppUser | null>(null)
  const [telegramUser, setTelegramUser] = useState<AuthResult['telegram_user'] | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const result = await authenticateMiniApp()

        if (cancelled) return

        if (!result) {
          setError('Nao foi possivel autenticar com o Telegram')
          setIsLoading(false)
          return
        }

        if (result.linked && result.session_token && result.user) {
          // Create Supabase client with session JWT for RLS
          const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
              headers: {
                Authorization: `Bearer ${result.session_token}`,
              },
            },
          })
          setSupabase(client)
          setUser(result.user)
          setIsLinked(true)
        } else {
          setTelegramUser(result.telegram_user || null)
          setIsLinked(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro de autenticacao')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  return { isLoading, isLinked, user, telegramUser, supabase, error }
}
```

**Step 3: Commit**

```bash
git add src/telegram-mini-app/services/miniAppAuthService.ts src/telegram-mini-app/hooks/useTelegramAuth.ts
git commit -m "feat(telegram): add Mini App auth service and hook"
```

---

### Task 6: Create MiniAppShell Layout Component

**Owner:** Frontend agent

**Files:**
- Create: `src/telegram-mini-app/components/MiniAppShell.tsx`

**Step 1: Create the shell component**

```tsx
// src/telegram-mini-app/components/MiniAppShell.tsx
import type { ReactNode } from 'react'

interface MiniAppShellProps {
  children: ReactNode
}

/**
 * Root layout wrapper for the Mini App.
 * Uses Telegram theme CSS variables with Ceramic fallbacks.
 */
export function MiniAppShell({ children }: MiniAppShellProps) {
  return (
    <div
      className="min-h-screen w-full overflow-y-auto no-scrollbar"
      style={{
        backgroundColor: 'var(--tg-bg-color)',
        color: 'var(--tg-text-color)',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
        {children}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/telegram-mini-app/components/MiniAppShell.tsx
git commit -m "feat(telegram): add MiniAppShell layout component"
```

---

### Task 7: Create LinkPrompt Component (Unlinked Users)

**Owner:** Frontend agent

**Files:**
- Create: `src/telegram-mini-app/components/LinkPrompt.tsx`

**Step 1: Create the component**

```tsx
// src/telegram-mini-app/components/LinkPrompt.tsx
import WebApp from '@twa-dev/sdk'

interface LinkPromptProps {
  telegramFirstName?: string
}

/**
 * Shown to Telegram users who haven't linked their AICA account.
 * Provides CTA to open the web app and link.
 */
export function LinkPrompt({ telegramFirstName }: LinkPromptProps) {
  const handleLink = () => {
    WebApp.openLink('https://aica.guru/connections')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      {/* Logo */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 text-3xl"
        style={{ backgroundColor: 'var(--tg-secondary-bg-color)' }}
      >
        🌱
      </div>

      {/* Greeting */}
      <h1
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: "'Fredoka', sans-serif" }}
      >
        {telegramFirstName ? `Ola, ${telegramFirstName}!` : 'Bem-vindo a AICA!'}
      </h1>

      {/* Description */}
      <p
        className="text-sm mb-8 max-w-xs leading-relaxed"
        style={{ color: 'var(--tg-hint-color)' }}
      >
        Para acessar seu dashboard e ver o resumo do seu dia, vincule sua conta AICA.
      </p>

      {/* CTA Button */}
      <button
        onClick={handleLink}
        className="px-8 py-3 rounded-xl text-base font-bold transition-transform active:scale-95"
        style={{
          backgroundColor: 'var(--tg-button-color)',
          color: 'var(--tg-button-text-color)',
        }}
      >
        Vincular Conta AICA
      </button>

      {/* Secondary info */}
      <p
        className="text-xs mt-6 max-w-xs"
        style={{ color: 'var(--tg-hint-color)' }}
      >
        Voce tambem pode enviar <strong>/vincular</strong> no chat do bot para gerar um codigo de vinculacao.
      </p>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/telegram-mini-app/components/LinkPrompt.tsx
git commit -m "feat(telegram): add LinkPrompt component for unlinked users"
```

---

### Task 8: Create DailySummary Component

**Owner:** Frontend agent

**Files:**
- Create: `src/telegram-mini-app/components/DailySummary.tsx`
- Create: `src/telegram-mini-app/components/SummarySection.tsx`

**Step 1: Create reusable SummarySection**

```tsx
// src/telegram-mini-app/components/SummarySection.tsx
import type { ReactNode } from 'react'

interface SummarySectionProps {
  icon: string
  title: string
  children: ReactNode
  isLoading?: boolean
}

/**
 * Card wrapper for each dashboard section.
 * Uses Telegram theme colors.
 */
export function SummarySection({ icon, title, children, isLoading }: SummarySectionProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--tg-secondary-bg-color)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--tg-hint-color)' }}
        >
          {title}
        </h3>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--tg-hint-color)', opacity: 0.2 }} />
          <div className="h-4 rounded animate-pulse w-3/4" style={{ backgroundColor: 'var(--tg-hint-color)', opacity: 0.2 }} />
        </div>
      ) : (
        children
      )}
    </div>
  )
}
```

**Step 2: Create DailySummary component**

```tsx
// src/telegram-mini-app/components/DailySummary.tsx
import { useState, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SummarySection } from './SummarySection'
import type { MiniAppUser } from '../services/miniAppAuthService'

interface DailySummaryProps {
  user: MiniAppUser
  supabase: SupabaseClient
}

// Date helpers (BRT)
function getTodayBRT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getGreeting(): string {
  const hour = new Date().toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  })
  const h = parseInt(hour, 10)
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatDateBR(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

interface TaskItem {
  id: string
  title: string
  priority: string
  status: string
}

interface FinanceData {
  spent: number
  budget: number
}

interface MoodData {
  lastScore: number | null
  trend: 'up' | 'down' | 'stable' | null
}

interface EventItem {
  id: string
  title: string
  start_time: string
}

export function DailySummary({ user, supabase }: DailySummaryProps) {
  const today = getTodayBRT()

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [finance, setFinance] = useState<FinanceData | null>(null)
  const [mood, setMood] = useState<MoodData | null>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingFinance, setLoadingFinance] = useState(true)
  const [loadingMood, setLoadingMood] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)

  // Fetch tasks
  useEffect(() => {
    supabase
      .from('work_items')
      .select('id, title, priority, status')
      .neq('status', 'done')
      .order('priority', { ascending: true })
      .limit(5)
      .then(({ data }) => {
        setTasks(data || [])
        setLoadingTasks(false)
      })
  }, [supabase])

  // Fetch finance (current month)
  useEffect(() => {
    const [year, month] = today.split('-')
    const startDate = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    supabase
      .from('finance_transactions')
      .select('amount')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .eq('type', 'expense')
      .then(({ data }) => {
        const spent = (data || []).reduce((sum, t) => sum + Math.abs(t.amount), 0)
        setFinance({ spent, budget: 5000 }) // TODO: fetch actual budget
        setLoadingFinance(false)
      })
  }, [supabase, today])

  // Fetch mood (last entry)
  useEffect(() => {
    supabase
      .from('moments')
      .select('emotion, sentiment_data, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const score = data[0].sentiment_data?.mood_score ?? null
          setMood({ lastScore: score, trend: null })
        }
        setLoadingMood(false)
      })
  }, [supabase])

  // Fetch events (today)
  useEffect(() => {
    supabase
      .from('calendar_events')
      .select('id, title, start_time')
      .gte('start_time', `${today}T00:00:00-03:00`)
      .lte('start_time', `${today}T23:59:59-03:00`)
      .order('start_time', { ascending: true })
      .limit(3)
      .then(({ data }) => {
        setEvents(data || [])
        setLoadingEvents(false)
      })
  }, [supabase, today])

  const priorityEmoji: Record<string, string> = {
    urgent_important: '🔴',
    important: '🟡',
    urgent: '🟠',
    delegate: '🟢',
  }

  const moodEmoji: Record<number, string> = {
    1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄',
  }

  return (
    <>
      {/* Greeting */}
      <div className="mb-2">
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          {getGreeting()}, {user.display_name.split(' ')[0]}!
        </h1>
        <p className="text-sm capitalize" style={{ color: 'var(--tg-hint-color)' }}>
          {formatDateBR()}
        </p>
      </div>

      {/* Tasks */}
      <SummarySection icon="✅" title="Tarefas" isLoading={loadingTasks}>
        {tasks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--tg-hint-color)' }}>
            Nenhuma tarefa pendente!
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <span>{priorityEmoji[t.priority] || '⚪'}</span>
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </SummarySection>

      {/* Finance */}
      <SummarySection icon="💰" title="Financas do mes" isLoading={loadingFinance}>
        {finance && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>R$ {finance.spent.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
              <span style={{ color: 'var(--tg-hint-color)' }}>
                / R$ {finance.budget.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--tg-bg-color)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min((finance.spent / finance.budget) * 100, 100)}%`,
                  backgroundColor: finance.spent > finance.budget * 0.8
                    ? 'var(--tg-destructive-text-color)'
                    : 'var(--tg-button-color)',
                }}
              />
            </div>
          </div>
        )}
      </SummarySection>

      {/* Mood */}
      <SummarySection icon="😊" title="Humor" isLoading={loadingMood}>
        {mood?.lastScore ? (
          <p className="text-sm">
            Ultimo check-in: {moodEmoji[mood.lastScore] || '😐'} {mood.lastScore}/5
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--tg-hint-color)' }}>
            Nenhum check-in registrado hoje
          </p>
        )}
      </SummarySection>

      {/* Agenda */}
      <SummarySection icon="📅" title="Agenda" isLoading={loadingEvents}>
        {events.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--tg-hint-color)' }}>
            Sem eventos hoje
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="text-sm flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: 'var(--tg-accent-text-color)' }}>
                  {new Date(e.start_time).toLocaleTimeString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </SummarySection>
    </>
  )
}
```

**Step 3: Commit**

```bash
git add src/telegram-mini-app/components/SummarySection.tsx src/telegram-mini-app/components/DailySummary.tsx
git commit -m "feat(telegram): add DailySummary and SummarySection components"
```

---

### Task 9: Create QuickActions Component

**Owner:** Frontend agent

**Files:**
- Create: `src/telegram-mini-app/components/QuickActions.tsx`

**Step 1: Create the component**

```tsx
// src/telegram-mini-app/components/QuickActions.tsx
import WebApp from '@twa-dev/sdk'

const BOT_USERNAME = 'AicaLifeBot' // TODO: move to env var if needed

const ACTIONS = [
  { icon: '📝', label: 'Tarefa', command: '/tarefa' },
  { icon: '💰', label: 'Gasto', command: '/gasto' },
  { icon: '😊', label: 'Humor', command: '/humor' },
  { icon: '📅', label: 'Evento', command: '/evento' },
] as const

/**
 * Quick action buttons that open the bot chat with pre-filled commands.
 */
export function QuickActions() {
  const handleAction = (command: string) => {
    // Opens Telegram chat with the bot, pre-filling the command
    WebApp.openTelegramLink(`https://t.me/${BOT_USERNAME}?text=${encodeURIComponent(command)}`)
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--tg-secondary-bg-color)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">⚡</span>
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--tg-hint-color)' }}
        >
          Acoes rapidas
        </h3>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.command}
            onClick={() => handleAction(action.command)}
            className="flex flex-col items-center gap-1 py-3 rounded-lg transition-transform active:scale-95"
            style={{ backgroundColor: 'var(--tg-bg-color)' }}
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/telegram-mini-app/components/QuickActions.tsx
git commit -m "feat(telegram): add QuickActions component"
```

---

### Task 10: Create App.tsx and main.tsx Entry Point

**Owner:** Frontend agent

**Files:**
- Create: `src/telegram-mini-app/App.tsx`
- Create: `src/telegram-mini-app/main.tsx`

**Step 1: Create App.tsx with auth gating**

```tsx
// src/telegram-mini-app/App.tsx
import { useTelegramAuth } from './hooks/useTelegramAuth'
import { MiniAppShell } from './components/MiniAppShell'
import { LinkPrompt } from './components/LinkPrompt'
import { DailySummary } from './components/DailySummary'
import { QuickActions } from './components/QuickActions'

export function App() {
  const { isLoading, isLinked, user, telegramUser, supabase, error } = useTelegramAuth()

  return (
    <MiniAppShell>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div
            className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--tg-button-color)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
          <p className="text-sm" style={{ color: 'var(--tg-destructive-text-color)' }}>
            {error}
          </p>
        </div>
      ) : isLinked && user && supabase ? (
        <>
          <DailySummary user={user} supabase={supabase} />
          <QuickActions />
        </>
      ) : (
        <LinkPrompt telegramFirstName={telegramUser?.first_name} />
      )}
    </MiniAppShell>
  )
}
```

**Step 2: Create main.tsx entry point**

```tsx
// src/telegram-mini-app/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WebApp from '@twa-dev/sdk'
import { applyTelegramTheme } from './theme'
import { App } from './App'

// Import Tailwind CSS (shared with main app)
import '../index.css'

// Initialize Telegram Web App
WebApp.ready()
WebApp.expand()

// Apply Telegram theme as CSS variables
applyTelegramTheme()

// Mount React app
const container = document.getElementById('mini-app-root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds, producing both `dist/index.html` and `dist/mini-app/index.html` (or `dist/mini-app.html` depending on Vite output).

**Step 4: Verify typecheck**

```bash
npm run typecheck
```

Expected: Zero new type errors from `src/telegram-mini-app/` files.

**Step 5: Commit**

```bash
git add src/telegram-mini-app/App.tsx src/telegram-mini-app/main.tsx
git commit -m "feat(telegram): add Mini App entry point with auth gating"
```

---

### Task 11: Build Verification + Integration Test

**Owner:** Both agents

**Step 1: Full build + typecheck**

```bash
npm run build && npm run typecheck
```

Expected: Both pass with zero new errors.

**Step 2: Verify output structure**

```bash
ls -la dist/mini-app* dist/assets/mini-app* 2>/dev/null || echo "Check dist/ for mini-app output"
```

Expected: Mini App HTML and JS assets exist in the build output.

**Step 3: Deploy Edge Function**

```bash
npx supabase functions deploy telegram-mini-app-auth
```

Expected: Deploy succeeds.

**Step 4: Final commit (if any adjustments)**

```bash
git add -A && git status
# If there are changes:
git commit -m "fix(telegram): build adjustments for Mini App"
```

**Step 5: Push and create PR**

```bash
git push -u origin feature/feat-telegram-mini-app
gh pr create --title "feat(telegram): Phase 3 — Mini App daily summary dashboard" --body "$(cat <<'EOF'
## Summary
- Telegram Mini App embedded at `aica.guru/mini-app`
- Multi-page Vite build (second entry point alongside main app)
- initData HMAC-SHA-256 auth via `telegram-mini-app-auth` Edge Function
- Daily Summary dashboard: tasks, finance, mood, agenda
- LinkPrompt for unlinked Telegram users
- Telegram theme integration with Ceramic fallbacks
- QuickActions open bot chat with pre-filled commands

Closes #574 (Phase 3)

## Test plan
- [ ] `npm run build` produces both entry points
- [ ] `npm run typecheck` passes
- [ ] Edge Function validates initData correctly
- [ ] Mini App loads in Telegram client
- [ ] Linked user sees DailySummary
- [ ] Unlinked user sees LinkPrompt
- [ ] Dark mode renders correctly

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task Dependency Graph

```
Task 1 (Edge Function)  ──────────────────────────┐
Task 2 (SDK + Vite config)                         │
Task 3 (mini-app.html)                             │
Task 4 (Theme)                                     │
Task 5 (Auth service + hook) ← depends on Task 1   │
Task 6 (MiniAppShell)                              │
Task 7 (LinkPrompt)                                │
Task 8 (DailySummary)                              │
Task 9 (QuickActions)                              │
Task 10 (App + main) ← depends on Tasks 4-9       │
Task 11 (Verification) ← depends on ALL            ┘
```

**Parallelizable:** Tasks 1-4 can run in parallel. Tasks 6-9 can run in parallel.
**Sequential:** Task 5 needs Task 1. Task 10 needs Tasks 4-9. Task 11 needs all.
