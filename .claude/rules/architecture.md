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
- `agent-proxy` exists but is not used by chat FAB currently

## Table Names — Critical

- `moments` = original table (active, has data, used by most services)
- `moment_entries` = consolidated table (migration may NOT be applied on remote)
- **ALWAYS use `moments`** in new RPCs and queries until consolidation is confirmed

## Token Refresh — Critical

- NEVER call `supabase.auth.refreshSession()` unconditionally
- Only refresh when token expires in <60s
- Unconditional refresh in loops causes TOKEN_REFRESHED cascade → rate limit → logout
- Verbose cookie logging + concurrent queries amplify the cascade

## Edge Functions Pattern

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
