# Security Rules

## API Keys — NEVER in Frontend

```typescript
// WRONG — API key exposed client-side
const genai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const API_KEY = "AIza...";

// CORRECT — Use GeminiClient calling Edge Function
import { GeminiClient } from '@/lib/gemini';
const client = GeminiClient.getInstance();
const result = await client.call({ action: 'generate', payload: {...} });

// CORRECT — API keys only in Supabase Secrets
// supabase secrets set GEMINI_API_KEY=xxx
```

## Authentication

- **MUST use** `@supabase/ssr` (NOT `@supabase/supabase-js`)
- PKCE flow required for Cloud Run stateless containers
- Cookie-based sessions, never localStorage
- Single Supabase client — import from `src/services/supabaseClient.ts`
- OAuth exchange ONLY in `src/hooks/useAuth.ts`
- NEVER call `supabase.auth.refreshSession()` unconditionally — only when token expires in <60s

## Database Security

- RLS enabled on ALL tables — no exceptions
- SECURITY DEFINER functions for privileged operations
- Always filter by `user_id` in queries
- New tables MUST include RLS policies in the same migration

## OWASP / Compliance

- Target: OWASP Top 10, LGPD/GDPR, WCAG 2.1 AA
- No PII in migrations (passwords, tokens, etc.)
- Privacy-first: raw WhatsApp text NEVER stored, only `intent_summary` (100 chars max)

## Verification

- **ALWAYS** verify RLS policies work after creation
- Use `superpowers:verification-before-completion` — no security claims without evidence
- Test via Supabase Dashboard SQL Editor with different user tokens, or via Edge Function:
  - As owner: `SELECT * FROM table` should return only own rows
  - As different user: same query should return empty or different rows
  - Without auth: query should fail with permission denied

## CORS Security

- Edge Functions MUST restrict origins to `dev.aica.guru` and `aica.guru`
- Never use `Access-Control-Allow-Origin: '*'` in production
- See architecture.md Edge Function Checklist for CORS pattern

## Absolute Prohibitions

- **NEVER** create backup files (.backup, .bak, .old, ~) — Git is the backup
- **NEVER** call Gemini API client-side — use Edge Functions
- **NEVER** expose API keys in frontend code
- **NEVER** commit .env files with real secrets
