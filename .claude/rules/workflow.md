# Solo Dev Workflow

## Flow by Task Tier

```
Micro (1-5 lines, 1 file):  Fix → Verify (build) → Commit → Push
Standard:                    Clarify → Execute (TDD) → Verify → Review → Finish
Complex:                     Clarify → Design → Plan → Execute (TDD) → Verify → Review → Finish
Investigation:               Clarify → Investigate → Report
```

## Clarification — When Needed

Skip when the task is trivially clear, 1 file, no design decisions, and user gave explicit instructions.

For ambiguous tasks, ask 2-4 targeted questions from these dimensions:
1. **Scope** — Which module(s)? Frontend/backend/both?
2. **Behavior** — Expected flow? Error handling? Acceptance criteria?
3. **Data** — New tables/columns? Migration needed?
4. **Design** — UI requirements? Which Ceramic components?
5. **Integration** — Gemini calls? External APIs? Real-time?
6. **Priority** — Speed vs. polish? MVP or production-ready?

**Do NOT**: Over-ask on micro tasks, ask obvious things (language, database), explain why you're asking.
**DO**: Just ask the questions directly via `AskUserQuestion`.

## Design Phase — Complex Tasks Only

For Complex tasks (cross-module, architecture decisions, 5+ files):
1. `superpowers:brainstorming` → explore approaches, trade-offs → design doc → user approval
2. `superpowers:writing-plans` → implementation plan saved to `docs/plans/`

Standard tasks skip this — plan in chat if needed.

## Implementation — TDD Required

- Follow `superpowers:test-driven-development`: RED (failing test) → GREEN (minimal code) → REFACTOR
- For bugs: `superpowers:systematic-debugging` first (reproduce → isolate → root cause → fix)
- TDD exceptions: Visual/CSS, string literals, config files, pure refactoring (verify with build instead)

## Session End Protocol — ALWAYS Execute

1. **Verify** — `superpowers:verification-before-completion`: Run `npm run build`, `npm run typecheck`, `npm run test` with FRESH output as evidence. NEVER claim "tests pass" without showing output.
2. **Code review** — Pre-push: `superpowers:requesting-code-review` (local subagent). For PRs: CodeRabbit is the final gate (see CodeRabbit Workflow below).
3. **Commit** with descriptive message + co-authorship
4. **Push** feature branch
5. **Finish** — `superpowers:finishing-a-development-branch`: Present 4 options (Merge / PR / Keep / Discard)
6. **If PR**: Wait for CodeRabbit + address findings (see CodeRabbit Workflow below)
7. **Push migrations** if any `.sql` files created
8. **Deploy Edge Functions** if any created/modified

## CodeRabbit Workflow — MANDATORY for all PRs

CodeRabbit is the external AI code reviewer. It runs automatically on every PR.
**NEVER merge a PR without reading and addressing CodeRabbit findings.**

### After creating a PR:

1. **Wait for CodeRabbit** — it takes 2-5 minutes to review. Poll with:
   ```bash
   # Check if CodeRabbit posted its review
   gh pr view <pr-number> --comments | grep -c "coderabbitai"
   ```

2. **Read the review** — CodeRabbit posts a summary + inline comments:
   ```bash
   # Full review comments
   gh pr view <pr-number> --comments

   # Inline code comments (where the real findings are)
   gh api repos/{owner}/{repo}/pulls/<pr-number>/comments
   ```

3. **Triage findings** — For each CodeRabbit comment:
   - **Valid issue**: Fix it, commit, push. CodeRabbit will re-review.
   - **False positive**: Reply to the comment explaining why (CodeRabbit learns).
   - **Nitpick**: Fix if quick, otherwise acknowledge and move on.

4. **Confirm clean** — After addressing findings, verify CodeRabbit is satisfied:
   ```bash
   gh pr checks <pr-number>
   gh pr view <pr-number> --comments | tail -30
   ```

5. **Only then**: Ask user for merge approval.

### Key rules:
- **NEVER** merge while CodeRabbit review is pending or has unresolved issues
- **NEVER** dismiss CodeRabbit findings without technical justification
- CodeRabbit review **replaces** the manual `superpowers:requesting-code-review` for PRs (step 2 still runs for pre-push local review, but CodeRabbit is the final gate)
- If CodeRabbit is down or not responding after 10 minutes, fall back to `superpowers:requesting-code-review`

## PR Workflow

Standard/Complex tasks MUST go through a Pull Request. Micro tasks may commit directly to main.

```bash
# Create PR
git push -u origin <branch-name>
gh pr create --title "<type>(<scope>): <description>" --body "..."

# Read comments
gh pr checks <pr-number>
gh pr view <pr-number> --comments
gh api repos/{owner}/{repo}/pulls/<pr-number>/comments

# Merge (after all comments addressed + user approval)
gh pr merge <pr-number> --squash --delete-branch
git checkout main && git pull origin main
```

## Git Worktree Workflow

Every Standard/Complex session uses a git worktree. Never `git checkout -b` on main tree.

```bash
git pull origin main
git worktree add .worktrees/<branch-name> -b <branch-name>
cd .worktrees/<branch-name>
npm install

# After merge:
cd /c/Users/lucas/repos/aica
git worktree remove .worktrees/<branch-name>
git pull origin main
```

## Session Resume

```bash
git worktree list                           # Active worktrees
ls docs/plans/                              # Existing plans
git log --all --oneline --since="3 days ago" | head -20
```

Enter existing worktree, read plan, check `git log --oneline main..HEAD`, continue.

## Commit Conventions

```
<type>(<scope>): <description>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Types: feat, fix, docs, test, refactor, chore
Scopes: podcast, auth, gamification, whatsapp, security, studio, ui, components, architecture, database, flux, journey, grants, finance, connections

## Agent Teams — On Demand

Teams are NOT loaded by default. Suggest only when 5+ files across 3+ layers.
When activated, see `.claude/rules/agent-teams.md` for full team workflow.
