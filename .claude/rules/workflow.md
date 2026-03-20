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

## PR Review Pipeline — MANDATORY for all PRs

Two external AI reviewers run automatically on every PR:
1. **CodeRabbit** — Code quality, patterns, design system compliance
2. **Panto** — Security vulnerabilities, performance, critical bugs

**NEVER merge a PR without reading and addressing findings from BOTH.**

### After creating a PR:

1. **Trigger Panto** (if not auto-triggered) — comment `/review` on the PR
2. **Wait for both reviews** — CodeRabbit (2-5 min), Panto (1-2 min). Poll:
   ```bash
   gh pr view <pr-number> --comments | grep -cE "coderabbitai|pantoaibot"
   # Expected: 2 (one from each)
   ```

3. **Read the reviews**:
   ```bash
   # Full review comments (both bots)
   gh pr view <pr-number> --comments

   # Inline code comments
   gh api repos/{owner}/{repo}/pulls/<pr-number>/comments
   ```

4. **Triage findings** — Invoke `superpowers:receiving-code-review` for EVERY review round.
   This is NOT optional. The skill enforces:
   - READ all feedback without reacting
   - VERIFY each suggestion against the codebase (is it technically correct?)
   - PUSH BACK with reasoning if the bot is wrong
   - IMPLEMENT one fix at a time, test each
   - NO performative agreement ("Great point!", "You're right!")
   Classification per finding:
   - **Valid issue**: Fix it, commit, push. Bots will re-review.
   - **False positive**: Reply in the PR comment thread explaining why (bots learn).
   - **Nitpick**: Fix if quick, otherwise acknowledge and move on.

5. **Check Sentry** — Before merge, verify no new production errors:
   ```bash
   # Use the sentry-debugger skill or directly:
   # mcp__sentry__search_issues(organizationSlug="comtxae", projectSlug="javascript-react", query="is:unresolved age:-24h")
   ```

6. **Confirm clean** — All reviews addressed + no new Sentry issues:
   ```bash
   gh pr checks <pr-number>
   gh pr view <pr-number> --comments | tail -30
   ```

7. **Only then**: Ask user for merge approval.

### Key rules:
- **NEVER** merge while CodeRabbit or Panto review is pending
- **NEVER** dismiss findings without technical justification
- CodeRabbit + Panto **replace** `superpowers:requesting-code-review` for PRs (step 2 still runs for pre-push local review, but the bots are the final gate)
- If a bot is down after 10 minutes, fall back to `superpowers:requesting-code-review`

## Sentry Integration — Error Monitoring

Sentry monitors production errors at https://comtxae.sentry.io (project: `javascript-react`).

### When to check Sentry:
- **Before merging PRs** — verify no new unresolved issues
- **After deploying** — check for regressions (hook reminds automatically)
- **When investigating bugs** — use `sentry-debugger` skill or MCP tools directly
- **Session start** — quick check for critical unresolved issues

### How to check:
```bash
# Use the sentry-debugger skill for guided investigation
# Or use MCP tools directly:
# mcp__sentry__search_issues(organizationSlug="comtxae", projectSlug="javascript-react", query="is:unresolved", regionUrl="https://de.sentry.io")
# mcp__sentry__get_issue_details(organizationSlug="comtxae", issueId="JAVASCRIPT-REACT-123", regionUrl="https://de.sentry.io")
```

### After fixing a Sentry issue:
```bash
# Mark as resolved via MCP:
# mcp__sentry__update_issue(organizationSlug="comtxae", issueId="JAVASCRIPT-REACT-123", status="resolved", regionUrl="https://de.sentry.io")
```

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
