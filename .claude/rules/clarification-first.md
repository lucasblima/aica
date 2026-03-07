# Clarification-First Protocol

## Rule: Session Start → Name → Clarify → Ask Team → Brainstorm → Plan → Execute

Every session follows this exact sequence:

### Step 1 — Session Name (MANDATORY for Standard/Complex)
Your **very first action** in every new Standard/Complex session MUST be to suggest a descriptive session name (e.g., `feat-studio-teleprompter`, `fix-auth-redirect`, `refactor-billing`) and wait for user approval before doing anything else.

### Step 2 — Clarification (for non-trivial tasks)
After session name is confirmed, call `AskUserQuestion` with 2-4 targeted questions about the task.

### Step 3 — Ask About Agent Team (Standard/Complex tasks)
For Standard and Complex tasks, you MUST ask the user if they want an Agent Team. Skip for Micro tasks (always solo). Use `AskUserQuestion` with an option like:
- "Ativar Agent Team para esta tarefa?" → Yes (com composicao sugerida) / No (trabalho solo)

Include a brief suggestion of team composition so the user can decide with context.

### Step 4 — Brainstorm (non-trivial tasks)
For features, refactors, or multi-file changes, invoke `superpowers:brainstorming` to explore approaches before writing code. Produce a design doc with trade-offs and a recommended approach. Wait for user approval.

### Step 5 — Implementation Plan (non-trivial tasks)
After design is approved, invoke `superpowers:writing-plans` to create a concrete implementation plan. Save to `docs/plans/<session-name>.md`. The plan defines file-level tasks, ordering, and test strategy.

### Step 6 — Execute with TDD
Implement following `superpowers:test-driven-development` (RED-GREEN-REFACTOR cycle). For bug fixes: use `superpowers:systematic-debugging` before TDD. See `session-protocol.md` for full implementation and verification details.

**Do NOT:**
- Explain why you need to ask questions
- Describe the clarification protocol
- Output text before the AskUserQuestion call
- Say "I need to clarify..." — just ASK
- Auto-create Agent Teams without asking the user first
- Start coding before brainstorming design (for non-trivial tasks)

**DO:**
- Suggest session name first, wait for approval
- Read the user's request, identify ambiguities
- Call `AskUserQuestion` for clarification
- After answers, ask if user wants a team activated
- Only create team after user confirms
- Brainstorm before coding (design before implementation)

## 6 Dimensions to Evaluate

Pick 2-4 questions from whichever dimensions are genuinely unclear:

### 1. Scope — What exactly?
- Which module(s) are affected? (Atlas, Journey, Studio, Grants, Finance, Connections, Flux, Agenda)
- Frontend only, backend only, or both?
- New feature, enhancement, bug fix, or refactoring?

### 2. Behavior — How should it work?
- What is the expected user flow?
- What happens on error/edge cases?
- Are there acceptance criteria?

### 3. Data — What changes in the database?
- New tables or columns needed?
- Changes to existing RPCs?
- Migration required?

### 4. Design — How should it look?
- Specific UI requirements or wireframes?
- Which Ceramic components to use?
- Mobile-first or desktop-first?

### 5. Integration — What connects to what?
- Gemini AI calls needed? Which model?
- External APIs involved?
- Real-time subscriptions needed?

### 6. Priority — What matters most?
- Speed vs. polish?
- MVP or production-ready?
- Deploy target: staging only or also production?

## How to Ask

Use `AskUserQuestion` with **2-4 targeted questions** per interaction. Do NOT ask all 6 dimensions at once — only the ones that are genuinely unclear for the specific task.

**Good example** (user says "adiciona autenticacao por email"):
```
1. O login por email deve ser alem do Google OAuth atual, ou substituir?
2. Precisa de fluxo de "esqueci minha senha"?
3. O design deve seguir o AuthSheet existente ou criar uma nova tela?
```

**Bad example** (asking obvious things):
```
1. Qual linguagem usar? ← Obvio: TypeScript + React
2. Qual banco de dados? ← Obvio: Supabase
3. Onde guardar as chaves? ← Obvio: Edge Functions
```

## When to Skip Clarification

Skip ONLY when ALL are true:
- The task is trivially clear ("fix the typo in line 42")
- Only 1 file is affected
- No design or architecture decisions involved
- The user gave explicit, detailed instructions

## When to Skip Brainstorming

Skip brainstorming (Steps 4-5) ONLY when ALL are true:
- The task is trivially clear AND no design decisions involved
- Implementation approach is obvious (single pattern, no trade-offs)
- No architectural or cross-module impact
- Simple bug fix, config change, or typo correction

## Flow Diagram

```
New session starts
    │
    ├─ Micro task? (1-5 lines, 1 file) → Fix → Verify (build) → Commit → Push → Done
    │
    ├─ Investigation? (no code changes) → Name → Clarify → Investigate → Report → Done
    │
    ├─ Standard/Complex:
    │   ├─ Step 1: Suggest session name → Wait for approval
    │   │
    │   ├─ Step 2: Trivially clear? → Skip clarification
    │   │          Any ambiguity?   → Ask 2-4 targeted questions → Wait for answers
    │   │
    │   ├─ Step 3: Ask user: "Ativar Agent Team?" (never auto-create)
    │   │          ├─ User says Yes → Create team with suggested composition
    │   │          └─ User says No  → Execute solo
    │   │
    │   ├─ Step 4: Non-trivial? → `superpowers:brainstorming` → design doc → user approval
    │   │          Trivial?     → Skip to Step 6
    │   │
    │   ├─ Step 5: `superpowers:writing-plans` → implementation plan → docs/plans/
    │   │
    │   └─ Step 6: Execute (TDD) → Verify → Review → Finish (merge/PR/keep/discard)
```

## Anti-Patterns (NEVER Do These)

- **Assume scope**: "I'll also refactor the adjacent code while I'm here" — NO, ask first
- **Assume design**: "I'll use a modal for this" — NO, ask if modal vs. sheet vs. inline
- **Assume priority**: "I'll make it production-ready" — NO, ask if MVP is acceptable
- **Over-ask**: 10 questions about a 3-line change — NO, use judgment
- **Under-ask**: Start a multi-module feature with zero clarification — NO, always ask for medium+ tasks
- **Skip brainstorming**: Start coding a feature without exploring design trade-offs — NO, brainstorm first for non-trivial tasks
- **Code without a plan**: Jump to implementation without `superpowers:writing-plans` — NO, plan defines what TDD tests to write
- **Full ceremony on micro tasks**: 10-step workflow for a 3-line typo fix — NO, assess tier first
