# Clarification-First Protocol

## Rule: Immediately Call AskUserQuestion

For ANY non-trivial task, your **very first tool call** MUST be `AskUserQuestion` with 2-4 targeted questions.

**Do NOT:**
- Explain why you need to ask questions
- Describe the clarification protocol
- Output any text before the AskUserQuestion call
- Say "I need to clarify..." — just ASK

**DO:**
- Read the user's request
- Identify what's ambiguous
- Call `AskUserQuestion` immediately as your first action
- Wait for answers, then create an Agent Team

This applies BEFORE creating an Agent Team. The team composition depends on the answers.

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
User request arrives
    │
    ├─ Trivially clear? → Execute solo (no team needed)
    │
    └─ Any ambiguity? → Ask 2-4 targeted questions
                              │
                              └─ Answers received → Design team composition
                                                         │
                                                         └─ Create team → Execute
```

## Anti-Patterns (NEVER Do These)

- **Assume scope**: "I'll also refactor the adjacent code while I'm here" — NO, ask first
- **Assume design**: "I'll use a modal for this" — NO, ask if modal vs. sheet vs. inline
- **Assume priority**: "I'll make it production-ready" — NO, ask if MVP is acceptable
- **Over-ask**: 10 questions about a 3-line change — NO, use judgment
- **Under-ask**: Start a multi-module feature with zero clarification — NO, always ask for medium+ tasks
