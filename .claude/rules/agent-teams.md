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

## Workflow: Name → Clarify → Ask Team → Brainstorm → Plan → Execute (TDD) → Verify → Review → PR → Finish

```
0. NAME      — Suggest session name, wait for approval
1. CLARIFY   — Ask about information gaps (see clarification-first.md)
2. ASK TEAM  — Ask user if they want Agent Team activated (MANDATORY)
3. BRAINSTORM — Generate approaches (`superpowers:brainstorming`)
4. PLAN      — Write actionable plan (`superpowers:writing-plans`)
5. EXECUTE   — TDD cycle per task (`superpowers:test-driven-development`)
6. VERIFY    — Fresh evidence that everything works (`superpowers:verification-before-completion`)
7. REVIEW    — Two-stage review per task (`superpowers:requesting-code-review`)
8. PR        — Create Pull Request on feature branch (see session-protocol.md)
9. FINISH    — Read PR comments, address them, merge after approval
```

**NEVER skip steps 0, 1, or 2.** The user must explicitly approve the team.
Steps 3-4 can be lightweight for small tasks — a few sentences is enough. Steps 5-7 are the core execution loop repeated per task.

## Team Composition Patterns (AICA-Specific)

### Feature Development (most common)
```
Lead: Coordinator — breaks task, assigns, synthesizes
Teammate 1: Architect — explores codebase, proposes approach
Teammate 2: Implementer — writes code following architect's plan
Teammate 3: Reviewer — validates quality, security, Ceramic compliance
```

### Bug Investigation
Uses `superpowers:systematic-debugging` (Phase 1: observe, Phase 2: hypothesize, Phase 3: test).
Uses `superpowers:dispatching-parallel-agents` when 3+ hypotheses exist.
```
Lead: Coordinator — collects hypotheses, drives to root cause
Teammate 1-3: Each investigates a different hypothesis in parallel
              (each follows systematic-debugging phases independently)
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

## Execution Strategies

Choose the right strategy based on the task shape:

### Subagent-Driven Development (`superpowers:subagent-driven-development`)
**When**: Plan-based execution in the current session with multiple tasks.
- Spawn a fresh subagent per task (clean context, no accumulated drift)
- Pipeline per task: **implement → spec compliance review → code quality review → next task**
- Spec review checks: does the code match the plan?
- Code quality review checks: is the code well-written, tested, secure?
- Both reviews must pass before moving to the next task

### Parallel Dispatch (`superpowers:dispatching-parallel-agents`)
**When**: 3+ independent failures, investigations, or tasks with no dependencies.
- One agent per problem domain, concurrent execution
- Best for bug investigation (one hypothesis per agent) or independent module work
- Coordinator collects results and synthesizes

### Executing Plans (`superpowers:executing-plans`)
**When**: Plan-based execution in a separate session (plan written earlier).
- Batch execution with checkpoints between groups of tasks
- Verify each checkpoint before proceeding to the next batch
- Reference the plan document explicitly in each task assignment

## Team Rules

1. **Worktree isolation**: All team work happens in a git worktree (`.worktrees/<branch-name>`). Create worktree before spawning teammates.
2. **File ownership**: Each teammate owns distinct files. NEVER assign two teammates to the same file.
3. **Task granularity**: 3-6 tasks per teammate. Break large work into focused units.
4. **Dependencies**: Use `addBlockedBy` to enforce ordering (e.g., migration before frontend).
5. **Plan approval**: For features touching 5+ files, require plan approval before implementation.
6. **Lead role**: The lead coordinates, synthesizes, and reports — does NOT implement directly.
7. **Two-stage review** (`superpowers:requesting-code-review`): After each task completes:
   - **Stage 1 — Spec compliance**: Does the code match the plan/requirements? Missing features, wrong behavior, incomplete acceptance criteria.
   - **Stage 2 — Code quality**: Is the code well-written? Types, error handling, naming, Ceramic compliance, test coverage, security (RLS, no exposed keys).
   - Both stages must pass before moving to the next task. Reviewer must verify technically — no performative agreement.
8. **Shutdown**: Always shut down teammates and clean up the team when work is complete.

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
