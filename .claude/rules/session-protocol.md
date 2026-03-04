# Session Protocol

## Session Start Protocol — ALWAYS Execute

At the start of every session:

1. **Suggest session name** (e.g., `feat-studio-teleprompter`) — wait for user approval
2. **Sync** with remote: `git pull origin main`
3. **Create worktree** with feature branch (see Git Worktree Workflow below)

## Session End Protocol — ALWAYS Execute

At the end of every session (when all tasks are complete):

1. **Commit** all changes with descriptive message + co-authorship
2. **Push** feature branch to origin
3. **Create Pull Request** (see PR Workflow below) — MANDATORY
4. **Wait** for PR feedback (automated checks + user review)
5. **Read PR comments** using `gh pr view` and `gh api repos/.../pulls/.../comments`
6. **Address comments** — fix issues, push new commits to the branch
7. **Report status** to user: which comments were resolved, which need discussion
8. **Push migrations** if any new `.sql` files were created
9. **Deploy Edge Functions** if any were created/modified
10. **Merge PR** only after all comments are addressed and user approves

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
cd /c/Users/lucas/repos/Aica_frontend

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
- [ ] `npm run build` passed
- [ ] `npm run typecheck` passed
- [ ] Commits follow Conventional Commits
- [ ] Co-authorship included
- [ ] PR created with summary + test plan
- [ ] PR comments read and addressed
- [ ] Resolution status reported to user
- [ ] User approved merge
