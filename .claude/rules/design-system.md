---
globs: src/components/**,src/modules/*/components/**
---
# Ceramic Design System

## Semantic Token Map

| Material Design (OLD) | Ceramic (NEW) |
|----------------------|---------------|
| `bg-white` | `bg-ceramic-base` |
| `gray-50/100` | `ceramic-cool` |
| `gray-200/300` | `ceramic-border` |
| `gray-500/600` | `ceramic-text-secondary` |
| `gray-700/800/900` | `ceramic-text-primary` |
| `red-*` | `ceramic-error` |
| `green-*` | `ceramic-success` |
| `blue-*` | `ceramic-info` |
| `yellow-*` / `orange-*` | `ceramic-warning` |

## Foundation Components

- `PageShell` — standard page wrapper
- `CeramicLoadingState` — loading skeleton
- `CeramicErrorState` — error display
- `AIThinkingState` — AI processing indicator

## Preserved Exceptions

- Frosted glass: `bg-white/10-80 + backdrop-blur` (keep as-is)
- Avatar colors: keep variety for user distinction
- Chart data series: keep variety for readability

## Neumorphic Patterns

```tsx
// Embossed card
<div className="bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss">

// Primary action
<button className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2">

// Shadows lightened 30% from original
```

## Before Ceramic Refactoring

**ALWAYS** read `docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md` before starting any design system refactoring. The token map above is a quick reference — the full guidance doc has spacing, typography, animation, and complete patterns.

## Reference Docs

- `docs/CERAMIC_DESIGN_SYSTEM_GUIDANCE.md` — full token reference
- `.claude/design/DESIGN_VISION.md` — vision and rationale
- `.claude/design/DESIGN_TOKENS.md` — complete token list
- `.claude/design/MODULE_GUIDES.md` — per-module guidance

## New Components

When creating new Ceramic components, consider using the `frontend-design` skill for production-grade design quality. For complex UI features, start with `superpowers:brainstorming` to explore design alternatives before implementing.
