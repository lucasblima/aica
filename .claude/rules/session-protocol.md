# Session Protocol

## Session Flow Overview

```
Name → Clarify → Brainstorm → Plan → Worktree → TDD/Execute → Verify → Review → Finish → PR
```

## Session Start Protocol — ALWAYS Execute

At the start of every session:

1. **Suggest session name** (e.g., `feat-studio-teleprompter`) — wait for user approval
2. **Sync** with remote: `git pull origin main`
3. **Create worktree** with feature branch (see Git Worktree Workflow below)
4. **Design phase** (non-trivial features only):
   - Invoke `superpowers:brainstorming` — explore approaches, trade-offs, architecture options → produce a design doc
   - Invoke `superpowers:writing-plans` — convert design into an implementation plan saved to `docs/plans/<session-name>.md`
   - Wait for user approval of the plan before writing code
5. **Simple fixes** (typo, config, obvious bug): skip step 4, go directly to implementation

## Implementation Phase — TDD Required

All implementation follows test-driven development:

- **Solo work**: Follow `superpowers:test-driven-development` cycle (RED: write failing test → GREEN: minimal code to pass → REFACTOR: clean up)
- **Agent Teams**: Use `superpowers:subagent-driven-development` pipeline — coordinator dispatches test-writing and implementation to separate teammates
- **Bug fixes**: ALWAYS use `superpowers:systematic-debugging` (Phase 1: reproduce → Phase 2: isolate → Phase 3: root cause → Phase 4: fix + regression test) before attempting fixes

## Session End Protocol — ALWAYS Execute

At the end of every session (when all tasks are complete):

1. **Verify** — Invoke `superpowers:verification-before-completion`. Run `npm run build`, `npm run typecheck`, and `npm run test` with FRESH output. Paste the actual terminal output as evidence. NEVER claim "tests pass" without showing the output.
2. **Code review** — Invoke `superpowers:requesting-code-review`. Dispatch a code review subagent to review all changes before creating the PR. Address any findings.
3. **Commit** all changes with descriptive message + co-authorship
4. **Push** feature branch to origin
5. **Finish branch** — Invoke `superpowers:finishing-a-development-branch`. Present the user with 4 structured options:
   - **Merge**: squash-merge into main (if PR approved)
   - **PR**: create Pull Request for async review (default)
   - **Keep**: leave branch open for continued work
   - **Discard**: abandon branch and clean up
6. **Create Pull Request** (if user chose PR or Merge) — see PR Workflow below — MANDATORY for code changes
7. **Wait** for PR feedback (automated checks + user review)
8. **Read PR comments** using `gh pr view` and `gh api repos/.../pulls/.../comments`
9. **Address comments** — fix issues, push new commits to the branch
10. **Report status** to user: which comments were resolved, which need discussion
11. **Push migrations** if any new `.sql` files were created
12. **Deploy Edge Functions** if any were created/modified
13. **Merge PR** only after all comments are addressed and user approves

Production deploy only happens when user validates staging and explicitly says "deploy producao".

## PR Workflow — MANDATORY (Never Skip)

**CRITICAL: Every session with code changes MUST go through a Pull Request.**
Pushing directly to `main` is prohibited. Always use feature branches + PRs.

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

## Branch Naming

Uses session name from Step 0:
```
feature/{session-name}
fix/{session-name}
refactor/{session-name}
```

Examples: `feature/feat-studio-teleprompter`, `fix/auth-redirect-loop`

## PR Checklist

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
