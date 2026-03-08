# Architecture Decisions

## AI Integration

- Gemini calls via Edge Functions only (never client-side)
- Prefer `gemini-2.5-flash` for cost optimization
- Rate limit + retry logic with exponential backoff required
- Use `GeminiClient.getInstance()` singleton for all AI calls
- Use `aiUsageTrackingService` for tracking

## Chat System

- `AicaChatFAB` calls `supabase.functions.invoke('gemini-chat')` directly — self-contained
- `gemini-chat` Edge Function is the active chat path
- `agent-proxy` — deprecated, not in active use

## Table Names — Critical

See database.md "Table Name Warning" for the canonical reference.
Key rule: **ALWAYS use `moments`** (not `moment_entries`) until consolidation is confirmed.

## Token Refresh — Critical

See security.md "Authentication" for full rules.
Key rule: NEVER call `supabase.auth.refreshSession()` unconditionally — only when token expires in <60s.

## Edge Functions Pattern

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGINS = ['https://aica.guru', 'https://dev.aica.guru'];

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const apiKey = Deno.env.get('GEMINI_API_KEY')!;
  // ... logic
  // Return JSON with `success` boolean
});
```

## Edge Function Checklist

1. Always include CORS headers (both dev.aica.guru and aica.guru in ALLOWED_ORIGINS)
2. Validate authentication via JWT
3. Use `Deno.env.get()` for secrets
4. Log errors with context
5. Return JSON with `success` boolean
6. Use `extractJSON()` helper for Gemini response parsing

## Troubleshooting

When architectural issues arise (token cascades, CORS failures, Edge Function errors), use `superpowers:systematic-debugging`:
- Phase 1: Read error messages, reproduce, check recent changes
- Phase 2: Compare against working examples in codebase
- Phase 3: Form single hypothesis, test minimally
- Never apply multiple fixes at once
