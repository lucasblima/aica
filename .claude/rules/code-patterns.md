---
globs: src/**/*.ts,src/**/*.tsx
---
# Code Patterns

## GeminiClient — Always Use Singleton

```typescript
import { GeminiClient } from '@/lib/gemini';

const client = GeminiClient.getInstance();
const result = await client.call({
  action: 'suggest_guest',
  payload: { topic: 'IA' },
  model: 'smart'  // 'fast' | 'smart' | 'embedding'
});
```

## React Components — Ceramic Design System

```tsx
<div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">
  <h2 className="text-ceramic-800 font-medium">Titulo</h2>
  <button className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2">
    Acao
  </button>
</div>
```

### Ceramic Semantic Tokens (NOT Material Design)

- `bg-white` → `bg-ceramic-base`
- `gray-*` → `ceramic-text-*` / `ceramic-border` / `ceramic-cool`
- Use `ceramic-info`, `ceramic-warning`, `ceramic-success`, `ceramic-error` for status colors
- Foundation components: `PageShell`, `CeramicLoadingState`, `CeramicErrorState`, `AIThinkingState`
- Preserve frosted glass exceptions: `bg-white/10-80 + backdrop-blur`

## Authentication Pattern

- Import Supabase from `src/services/supabaseClient.ts` (single instance)
- Use `@supabase/ssr` (NOT `@supabase/supabase-js`)
- Never call `supabase.auth.refreshSession()` unconditionally

## Module Conventions

When modifying modules:
1. Check migrations needed
2. Maintain RLS compatibility
3. Use TypeScript types from `src/types.ts` or module `types/index.ts`
4. Follow Ceramic Design System
5. Test with authenticated user
