---
globs: src/services/scoring/**
---
# Domain-Driven Design — AICA Life OS

## Bounded Contexts = 8 Modules

Each module in `src/modules/` is a **Bounded Context** with its own types, services, hooks, and components. Cross-module communication goes through shared services or the Life Score system.

| Bounded Context | Module Path | Aggregate Root |
|----------------|-------------|----------------|
| Atlas | `src/modules/atlas/` | `WorkItem` |
| Journey | `src/modules/journey/` | `Moment` |
| Studio | `src/modules/studio/` | `PodcastEpisode` |
| Grants | `src/modules/grants/` | `GrantProject` |
| Finance | `src/modules/finance/` | `FinanceTransaction` |
| Connections | `src/modules/connections/` | `ConnectionSpace` |
| Flux | `src/modules/flux/` | `WorkoutBlock` |
| Agenda | `src/modules/agenda/` | `CalendarEvent` |

## Aggregate Roots

### `LifeScore` (Cross-Module Aggregate)
- Composite of domain scores from: Atlas (productivity), Journey (consciousness), Finance (financial health), Connections (relationships), Flux (physical), Studio (creativity), Grants (professional growth)
- Agenda provides scheduling data but does not have its own domain score
- Owns spiral alerts + goodhart alerts
- Persistence: `life_score_history`, `life_score_weights`, `life_score_domain_correlations`
- Service: `src/services/scoring/lifeScoreService.ts`

### Module Aggregates
- **`WorkItem`** (Atlas) — owns subtasks, recurrence, priority matrix position
- **`Moment`** (Journey) — owns emotion, CP award, media attachments
- **`PodcastEpisode`** (Studio) — owns segments, guests, scoring
- **`GrantProject`** (Grants) — owns opportunities, deadlines, documents
- **`WorkoutBlock`** (Flux) — owns exercises, athlete assignments, alerts

## Value Objects

Immutable data carriers — no identity, compared by value:

| Value Object | Location | Description |
|-------------|----------|-------------|
| `DomainScore` | `src/services/scoring/types.ts` | score + trend + metadata for a single domain |
| `ScientificScore` | `src/services/scoring/types.ts` | methodology, confidence, effect size |
| `SpiralAlert` | `src/services/scoring/types.ts` | correlated domain decline detection result |
| `GoodhartAlert` | `src/services/scoring/types.ts` | metric gaming detection result |
| `CorrelationResult` | `src/services/scoring/types.ts` | domain pair + Pearson coefficient + significance |
| `SufficiencyLevel` | `src/services/scoring/types.ts` | thriving / adequate / struggling / critical |

## Domain Services

Services that encapsulate domain logic not belonging to a single entity:

| Service | File | Pattern |
|---------|------|---------|
| `scoringEngine` | `src/services/scoring/scoringEngine.ts` | **Provider Registration** — modules register scoring functions via `registerDomainProvider(domain, provider)` |
| `lifeScoreService` | `src/services/scoring/lifeScoreService.ts` | Persistence layer (RPCs, history, weights) |
| `spiralDetectionService` | `src/services/scoring/spiralDetectionService.ts` | Detects correlated domain declines |
| `goodhartDetectionService` | `src/services/scoring/goodhartDetectionService.ts` | Detects metric gaming patterns |
| `correlationAnalysisService` | `src/services/scoring/correlationAnalysisService.ts` | Pearson correlations across domains |
| `sabbaticalService` | `src/services/scoring/sabbaticalService.ts` | Intentional domain pause management |

## Application Services (React Hooks)

Hooks orchestrate domain services for UI consumption:

| Hook | File | Orchestrates |
|------|------|-------------|
| `useLifeScore` | `src/hooks/useLifeScore.ts` | scoringEngine + lifeScoreService + alerts |
| `useHealthScore` | `src/hooks/useHealthScore.ts` | Contact relationship health scoring |
| `useScientificScore` | `src/hooks/useScientificScore.ts` | Generic scientific methodology tracking |

## Anti-Corruption Layer

When modules need data from other modules, they go through:
1. **Life Score system** — normalized 0-100 scores per domain
2. **Shared services** in `src/services/` — not module-internal services
3. **Supabase RPCs** — server-side joins when needed

**NEVER** import directly from another module's internal services or hooks.

## When to Apply DDD

### YES — Use DDD Patterns
- Cross-module features (Life Score, gamification, daily council)
- Complex domain logic with invariants (scoring engine, spiral detection)
- Aggregate boundaries that protect consistency (workout blocks, grant projects)
- New domain services that span multiple entities
- New cross-module features — start with `superpowers:brainstorming` to explore bounded context boundaries
- Complex DDD features — create plan with `superpowers:writing-plans` documenting aggregate boundaries

### NO — Keep It Simple
- Simple CRUD operations within a single module
- Pure UI components with no domain logic
- Utility functions and configuration
- Modules with <3 entities — use lightweight patterns

## Provider Registration Pattern

The scoring engine uses a registry pattern for extensibility:

```typescript
// In module initialization
import { registerDomainProvider } from '@/services/scoring/scoringEngine';

registerDomainProvider('atlas', async (userId) => {
  // Compute Atlas domain score
  return { score: 75, trend: 'improving', metadata: {...} };
});
```

Each module registers its own scoring provider. The scoring engine calls all registered providers to compute the composite Life Score.

## Naming Conventions

- **Aggregate Root types**: PascalCase, singular (`WorkItem`, `Moment`, `PodcastEpisode`)
- **Value Objects**: PascalCase, descriptive (`DomainScore`, `SpiralAlert`)
- **Domain Services**: camelCase + `Service` suffix (`scoringEngine`, `lifeScoreService`)
- **Application Services**: `use` + PascalCase (`useLifeScore`, `useHealthScore`)
- **Events/Commands**: past tense for events (`ScoreComputed`), imperative for commands (`ComputeScore`)
