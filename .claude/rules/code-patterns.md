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

## Testing Pattern (`superpowers:test-driven-development`)

**Iron law: No production code without a failing test first.**

Follow the RED-GREEN-REFACTOR cycle:
1. **RED** — Write a test that describes the desired behavior. Run it. It must fail.
2. **GREEN** — Write the minimum production code to make the test pass. Nothing more.
3. **REFACTOR** — Clean up both test and production code. Tests must still pass.

```typescript
// Example: testing a Supabase service call
import { describe, it, expect, vi } from 'vitest';
import { fetchWorkItems } from '@/modules/atlas/services/workItemService';

describe('fetchWorkItems', () => {
  it('returns items filtered by user_id', async () => {
    // RED: this test defines the expected behavior
    const items = await fetchWorkItems(mockUserId);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ user_id: mockUserId })
    ]));
    expect(items.every(i => i.user_id === mockUserId)).toBe(true);
  });
});
```

For Edge Functions, test the request/response contract. For React hooks, test state transitions. For services, test data transformations and error paths.

**Exceptions** (verify with build + visual inspection instead of test-first):
- Visual/CSS-only changes (class names, layout, spacing)
- String literals and i18n text changes
- Config file changes (tsconfig, vite.config, tailwind.config)
- Pure refactoring that doesn't change behavior (extract function, rename variable)

These changes still require `npm run build && npm run typecheck` to pass.

## Code Review Pattern (`superpowers:requesting-code-review`, `superpowers:receiving-code-review`)

**Before PR**: Request a code review — either from a teammate (in team mode) or a self-review subagent (in solo mode). The review checks:
- Spec compliance (does it match requirements?)
- Code quality (types, error handling, naming, Ceramic tokens)
- Security (no exposed keys, RLS on new tables, auth patterns)
- Test coverage (are edge cases covered?)

**When receiving review**: No performative agreement. For each finding:
1. Verify technically — is the reviewer correct?
2. If yes: fix the issue, commit with `fix(review): <description>`
3. If no: push back with technical reasoning — disagreement is healthy

## Verification Pattern (`superpowers:verification-before-completion`)

**Iron law: No completion claims without fresh verification evidence.**

Before claiming any task is done, you MUST:
1. Run `npm run build && npm run typecheck` — show actual terminal output
2. Run `npm run test` (if tests exist for modified code) — show actual output
3. Verify the feature works as specified (manual check or test output)

For visual changes (CSS, layout, design system refactoring): visual inspection replaces unit tests. Verify the component renders correctly in the browser.

**Pre-existing build errors:** If the project has known build errors, verify your changes don't add NEW errors. Document known pre-existing errors.

**Never say** "build passes" or "tests pass" from memory. Always run the commands fresh and include the output as evidence. Stale results from earlier in the session do not count.
