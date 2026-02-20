# Clarification-First Protocol

## Rule: Session Start → Name → Clarify → Ask About Team

Every session follows this exact sequence:

### Step 0 — Session Name (MANDATORY, every session)
Your **very first action** in every new session MUST be to suggest a descriptive session name (e.g., `feat-studio-teleprompter`, `fix-auth-redirect`, `refactor-billing`) and wait for user approval before doing anything else.

### Step 1 — Clarification (for non-trivial tasks)
After session name is confirmed, call `AskUserQuestion` with 2-4 targeted questions about the task.

### Step 2 — Ask About Agent Team (MANDATORY)
After clarification answers are received (or if task is trivially clear), you MUST **always ask the user** if they want an Agent Team activated. Never auto-create teams without asking. Use `AskUserQuestion` with an option like:
- "Ativar Agent Team para esta tarefa?" → Yes (com composicao sugerida) / No (trabalho solo)

Include a brief suggestion of team composition so the user can decide with context.

**Do NOT:**
- Explain why you need to ask questions
- Describe the clarification protocol
- Output text before the AskUserQuestion call
- Say "I need to clarify..." — just ASK
- Auto-create Agent Teams without asking the user first

**DO:**
- Suggest session name first, wait for approval
- Read the user's request, identify ambiguities
- Call `AskUserQuestion` for clarification
- After answers, ask if user wants a team activated
- Only create team after user confirms

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

## Flow Diagram

```
New session starts
    │
    ├─ Step 0: Suggest session name → Wait for approval
    │
    ├─ Step 1: Trivially clear? → Skip clarification
    │          Any ambiguity?   → Ask 2-4 targeted questions → Wait for answers
    │
    ├─ Step 2: Ask user: "Ativar Agent Team?" (ALWAYS ask, never auto-create)
    │          ├─ User says Yes → Create team with suggested composition
    │          └─ User says No  → Execute solo
    │
    └─ Step 3: Execute → PR → Review comments → Resolve → Merge/Close
```

## Anti-Patterns (NEVER Do These)

- **Assume scope**: "I'll also refactor the adjacent code while I'm here" — NO, ask first
- **Assume design**: "I'll use a modal for this" — NO, ask if modal vs. sheet vs. inline
- **Assume priority**: "I'll make it production-ready" — NO, ask if MVP is acceptable
- **Over-ask**: 10 questions about a 3-line change — NO, use judgment
- **Under-ask**: Start a multi-module feature with zero clarification — NO, always ask for medium+ tasks
