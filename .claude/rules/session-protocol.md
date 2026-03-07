# Session Protocol

## Session Flow Overview

```
Micro:            Fix → Verify (build) → Commit → Push
Standard/Complex: Name → Clarify → Ask Team → Brainstorm → Plan → Worktree → TDD/Execute → Verify → Review → Finish
```

## Session Start Protocol — ALWAYS Execute

At the start of every Standard/Complex session:

1. **Suggest session name** (e.g., `feat-studio-teleprompter`) — wait for user approval
2. **Sync** with remote: `git pull origin main`
3. **Ask Team** (Standard/Complex tasks) — ask if user wants Agent Team activated (see `clarification-first.md`)
4. **Create worktree** with feature branch (see Git Worktree Workflow below)
5. **Design phase** (non-trivial features only):
   - Invoke `superpowers:brainstorming` — explore approaches, trade-offs, architecture options → produce a design doc
   - Invoke `superpowers:writing-plans` — convert design into an implementation plan saved to `docs/plans/<session-name>.md`
   - Wait for user approval of the plan before writing code
6. **Simple fixes** (typo, config, obvious bug): skip step 5, go directly to implementation

Micro tasks (1-5 lines, 1 file): skip all ceremony — just fix, verify, commit, push.

## Implementation Phase — TDD Required

All implementation follows test-driven development:

- **Solo work**: Follow `superpowers:test-driven-development` cycle (RED: write failing test → GREEN: minimal code to pass → REFACTOR: clean up)
- **Agent Teams**: Use `superpowers:subagent-driven-development` pipeline — coordinator dispatches test-writing and implementation to separate teammates
- **Bug fixes**: ALWAYS use `superpowers:systematic-debugging` (Phase 1: reproduce → Phase 2: isolate → Phase 3: root cause → Phase 4: fix + regression test) before attempting fixes

## Hotfix Protocol — Production Emergencies

When the user reports a production outage or critical bug:

1. **Skip ceremony** — No Name, Clarify, or Team steps. Start immediately.
2. **Reproduce** — Check production logs: Supabase Dashboard → Logs, Cloud Run → Logs
3. **Debug** — `superpowers:systematic-debugging` Phase 1-4
4. **Fix** — Minimal fix, regression test if time permits
5. **Verify** — `npm run build && npm run typecheck` (FRESH output)
6. **Deploy staging** — Verify fix works on dev.aica.guru
7. **Deploy production** — With explicit user confirmation. Staging may be skipped ONLY with user's explicit "deploy direto para prod" confirmation.
8. **PR retroativo** — After production is stable, create PR documenting the fix

Rollback if fix fails:
```bash
# List recent revisions
gcloud run revisions list --service=aica --region=southamerica-east1 --project=gen-lang-client-0948335762
# Route traffic to previous revision
gcloud run services update-traffic aica --to-revisions=PREVIOUS_REVISION=100 --region=southamerica-east1 --project=gen-lang-client-0948335762
```

## Session End Protocol — ALWAYS Execute

At the end of every session (when all tasks are complete):

1. **Verify** — Invoke `superpowers:verification-before-completion`. Run `npm run build`, `npm run typecheck`, and `npm run test` with FRESH output. Paste the actual terminal output as evidence. NEVER claim "tests pass" without showing the output.
2. **Code review** — Invoke `superpowers:requesting-code-review`. Dispatch a code review subagent to review all changes. Address any findings.
3. **Commit** all changes with descriptive message + co-authorship
4. **Push** feature branch to origin
5. **Finish branch** — Invoke `superpowers:finishing-a-development-branch`. Present the user with 4 options:
   - **Merge**: squash-merge into main (if already reviewed/approved)
   - **PR**: create Pull Request for async review (default for Standard/Complex)
   - **Keep**: leave branch open for continued work
   - **Discard**: abandon branch and clean up
6. **If PR chosen**: wait for feedback, read comments (`gh pr view`, `gh api`), address them, report status
7. **Push migrations** if any new `.sql` files were created
8. **Deploy Edge Functions** if any were created/modified
9. **Merge PR** only after all comments are addressed and user approves

Production deploy only happens when user validates staging and explicitly says "deploy producao".

## PR Workflow — Standard/Complex Tasks

**Standard/Complex sessions with code changes MUST go through a Pull Request.**
Pushing directly to `main` is prohibited for Standard/Complex tasks. Micro tasks (1-5 lines, 1 file) may commit directly.

### Step 1: Create PR
```bash
git push -u origin <branch-name>
gh pr create --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] Manual testing on dev server

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Step 2: Wait & Read Comments
After creating the PR, wait ~2 minutes for automated checks, then:
```bash
gh pr checks <pr-number>
gh pr view <pr-number> --comments
gh api repos/{owner}/{repo}/pulls/<pr-number>/comments
```

### Step 3: Address Comments
For each comment:
- Fix the issue in code
- Commit with `fix(pr-review): <description>`
- Push to the same branch
- Report to user what was fixed

### Step 4: Track Resolution Status
Before merging, report to user:
```
PR Review Status:
✅ Comment 1: "fix X" — resolved (commit abc123)
✅ Comment 2: "add Y" — resolved (commit def456)
⚠️ Comment 3: "consider Z" — needs user decision
```

Only merge when all comments are ✅ or explicitly dismissed by user.

### Step 5: Merge
```bash
gh pr merge <pr-number> --squash --delete-branch
git checkout main && git pull origin main
```

## Git Worktree Workflow — ALWAYS Use

**Every session uses a git worktree for isolation.** Never use `git checkout -b` directly on the main working tree.

Worktree directory: `.worktrees/` (already exists, already in .gitignore).

### Creating a Worktree

```bash
# Sync main first
git pull origin main

# Create worktree with feature branch
git worktree add .worktrees/<branch-name> -b <branch-name>
cd .worktrees/<branch-name>

# Install dependencies (worktrees share git objects but NOT node_modules)
npm install
```

### Working in a Worktree

- All edits happen inside `.worktrees/<branch-name>/`
- The main working tree stays clean on `main`
- Multiple worktrees can coexist for parallel work

### Finishing a Worktree

After PR is merged:
```bash
# Return to main working tree
cd /c/Users/lucas/repos/aica

# Clean up
git worktree remove .worktrees/<branch-name>
git branch -d <branch-name>  # if not already deleted by squash merge

# Sync main
git pull origin main
```

### Why Worktrees

- **Isolation**: No risk of uncommitted changes on main polluting feature work
- **Parallel work**: Multiple features can be in progress simultaneously
- **Clean baseline**: Each worktree starts from a known good state
- **Agent teams**: Each teammate can work in its own worktree without conflicts

## Commit Conventions

```
<type>(<scope>): <description>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Types:** feat, fix, docs, test, refactor, chore
**Scopes:** podcast, auth, gamification, whatsapp, security, studio, ui, components, architecture, database, flux, journey, grants, finance, connections

## Multi-Terminal Sync

Before starting any session:
```bash
git pull origin main
git branch -a --sort=-committerdate | head -10
git log --all --oneline --since="1 day ago" | head -20
```

## Session Resume Protocol — Continuing Previous Work

When the user wants to continue work from a previous session:

1. **Find existing work**:
```bash
git worktree list                           # Active worktrees
ls docs/plans/                              # Existing plans
git log --all --oneline --since="3 days ago" | head -20  # Recent activity
```
2. **Enter worktree** — `cd .worktrees/<branch-name>` (do NOT create a new one)
3. **Read plan** — If `docs/plans/<feature>.md` exists, read it to understand state
4. **Check progress** — `git log --oneline main..HEAD` to see completed commits
5. **Resume** — Continue from the last completed task. Skip Name, Clarify, Team.

## Investigation Mode — Research Without Code Changes

When the user asks to investigate, research, or profile (no expected code changes):

1. **Name** — Suggest session name (e.g., `investigate-edge-function-perf`)
2. **Clarify** — What to investigate, which systems, what metrics
3. **Investigate** — Use `superpowers:systematic-debugging` for diagnosis, check logs, profile
4. **Report** — Summarize findings with evidence

Skip: Worktree, TDD, PR, Finish. No code changes = no PR needed.
If investigation reveals a fix: transition to Standard workflow.

## Branch Naming

Uses session name from Step 1:
```
feature/{session-name}
fix/{session-name}
refactor/{session-name}
```

Examples: `feature/feat-studio-teleprompter`, `fix/auth-redirect-loop`

## PR Checklist

- [ ] Task Tier: Standard/Complex (micro tasks don't need PR)
- [ ] Feature branch created (not committing to main directly)
- [ ] Design/brainstorm completed for non-trivial features (`superpowers:brainstorming`)
- [ ] Implementation plan saved to `docs/plans/` (`superpowers:writing-plans`)
- [ ] TDD cycle followed — tests written before implementation
- [ ] `npm run build` passed (FRESH output as evidence)
- [ ] `npm run typecheck` passed (FRESH output as evidence)
- [ ] `npm run test` passed (FRESH output as evidence)
- [ ] `superpowers:verification-before-completion` executed with evidence
- [ ] `superpowers:requesting-code-review` dispatched and findings addressed
- [ ] Commits follow Conventional Commits
- [ ] Co-authorship included
- [ ] PR created with summary + test plan
- [ ] PR comments read and addressed
- [ ] Resolution status reported to user
- [ ] User approved merge
