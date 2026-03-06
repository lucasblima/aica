# Project Structure

## Root Layout

```
src/
├── modules/           # Feature modules
│   └── {module}/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/ or types.ts
│       └── index.ts   # Barrel export
├── components/        # Shared UI (semantic organization)
│   ├── ui/            # 16 primitives (no business logic)
│   ├── layout/        # Headers, navigation, containers
│   ├── features/      # Cross-module reusable
│   ├── domain/        # Business logic components
│   └── index.ts       # Root barrel (backward compat)
├── contexts/          # React Context providers
├── hooks/             # Global custom hooks
├── services/          # API clients, Supabase queries
├── integrations/      # Third-party (Gemini, Whisper)
├── lib/gemini/        # Gemini client singleton
└── types/             # Global type definitions
supabase/
├── migrations/        # SQL migrations (versioned)
└── functions/         # Deno Edge Functions
```

## Module Paths

| Module | Path | Purpose |
|--------|------|---------|
| Atlas | `src/modules/atlas/` | Task management + Eisenhower Matrix |
| Journey | `src/modules/journey/` | Consciousness points, moments |
| Studio | `src/modules/studio/` | Podcast production workflow |
| Grants | `src/modules/grants/` | PDF-first edital parsing |
| Finance | `src/modules/finance/` | Bank statement processing |
| Connections | `src/modules/connections/` | WhatsApp integration |
| Flux | `src/modules/flux/` | Training management for coaches |

## Plans

Implementation plans are saved in `docs/plans/YYYY-MM-DD-<topic>.md` (created by `superpowers:writing-plans`).

## Import Patterns

```typescript
// Recommended: barrel exports
import { LoadingScreen } from '@/components/ui'
import { HeaderGlobal } from '@/components/layout'
import { GamificationWidget } from '@/components/features'
import { PriorityMatrix } from '@/components/domain'

// Also works: root barrel
import { LoadingScreen, HeaderGlobal } from '@/components'

// Avoid: direct file imports
import { LoadingScreen } from '@/components/ui/LoadingScreen'
```

## Component Placement

- **Move to components/** if: Used by 2+ modules, no module-specific deps
- **Keep in modules/** if: Only used in 1 module, tight business logic coupling
- **ui/**: Pure presentation, reusable across any context
- **features/**: Cross-module, some business logic
- **domain/**: Business logic, domain-specific

## Types Organization

```typescript
// Recommended
import type { GuestDossier } from '@/modules/podcast/types'

// Avoid
import type { GuestDossier } from '@/modules/podcast'
```
