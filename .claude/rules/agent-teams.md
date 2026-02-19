# Agent Teams — User-Approved Working Mode

## CRITICAL: Always Ask Before Creating a Team

**NEVER auto-create an Agent Team.** Always ask the user first via `AskUserQuestion`.

When the task appears to benefit from a team (2+ files, decisions, new features, cross-layer work), **suggest** team composition and ask the user to confirm. Include:
- Brief rationale for why a team would help
- Suggested composition (roles + agent types)
- Option to work solo instead

**Recommend a team** when the task involves ANY of these:
- 2+ files to modify
- Decisions between approaches (architecture, library, pattern)
- New features (even small ones — design + implement + review)
- Bug investigation (multiple hypotheses in parallel)
- Refactoring (one teammate per module/layer)
- Database changes + frontend changes (cross-layer)
- Any task the user describes with multiple steps

**Recommend solo** when:
- Single-line or few-line fix (typo, obvious bug, config tweak)
- Pure research question (no code changes)

But in ALL cases, **the user decides**. Never assume.

## Workflow: Name → Clarify → Ask Team → Execute → PR → Review

```
0. NAME    — Suggest session name, wait for approval
1. CLARIFY — Ask about information gaps (see clarification-first.md)
2. ASK     — Ask user if they want Agent Team activated (MANDATORY)
3. EXECUTE — Team or solo, based on user decision
4. PR      — Create Pull Request on feature branch (see session-protocol.md)
5. REVIEW  — Read PR comments, address them, mark resolved
6. MERGE   — Only after PR review is clean
```

**NEVER skip steps 0, 1, or 2.** The user must explicitly approve the team.

## Team Composition Patterns (AICA-Specific)

### Feature Development (most common)
```
Lead: Coordinator — breaks task, assigns, synthesizes
Teammate 1: Architect — explores codebase, proposes approach
Teammate 2: Implementer — writes code following architect's plan
Teammate 3: Reviewer — validates quality, security, Ceramic compliance
```

### Bug Investigation
```
Lead: Coordinator — collects hypotheses, drives to root cause
Teammate 1-3: Each investigates a different hypothesis in parallel
```

### Cross-Layer Feature (frontend + backend + database)
```
Lead: Coordinator
Teammate 1: Frontend (React components, hooks, services)
Teammate 2: Backend (Edge Functions, Gemini integration)
Teammate 3: Database (migrations, RPCs, RLS policies)
```

### Refactoring
```
Lead: Coordinator — ensures consistency across modules
Teammate 1-N: One per module being refactored
```

### Research / Decision
```
Lead: Coordinator — synthesizes findings, recommends
Teammate 1-N: Each researches one alternative/approach
```

## Team Rules

1. **File ownership**: Each teammate owns distinct files. NEVER assign two teammates to the same file.
2. **Task granularity**: 3-6 tasks per teammate. Break large work into focused units.
3. **Dependencies**: Use `addBlockedBy` to enforce ordering (e.g., migration before frontend).
4. **Plan approval**: For features touching 5+ files, require plan approval before implementation.
5. **Lead role**: The lead coordinates, synthesizes, and reports — does NOT implement directly.
6. **Shutdown**: Always shut down teammates and clean up the team when work is complete.

## Teammate Agent Types

Choose `subagent_type` based on the work:

| Work Type | Agent Type | Why |
|-----------|-----------|-----|
| Research, exploration | `Explore` | Read-only, fast, no accidental edits |
| Planning, architecture | `Plan` | Read-only, focused on design |
| Implementation, fixes | `general-purpose` | Full tool access (edit, write, bash) |

## Task Assignment Template

When creating tasks for teammates, always include:
- **What**: Clear deliverable (file to create, bug to fix, decision to make)
- **Where**: Specific file paths or module scope
- **Constraints**: Ceramic tokens, RLS required, Edge Function pattern, etc.
- **Definition of Done**: How to know the task is complete

## Cost Awareness

Agent Teams use ~3-5x more tokens than solo work. This is worthwhile for:
- Quality (multiple perspectives catch more issues)
- Speed (parallel execution)
- Thoroughness (dedicated reviewer catches regressions)

For the AICA project, the quality gains justify the cost for medium+ complexity tasks.
