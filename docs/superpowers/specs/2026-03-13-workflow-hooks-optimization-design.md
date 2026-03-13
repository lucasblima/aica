# Workflow Hooks Optimization — Design Spec

**Date:** 2026-03-13
**Session:** workflow-hooks-optimization
**Status:** Approved (post-review v2)
**Inspired by:** [everything-claude-code](https://github.com/affaan-m/everything-claude-code) (74k+ stars)

## Problem Statement

AICA's Claude Code setup has 10 hooks focused on **safety warnings** (deploy blocker, force-push blocker, migration checklist, etc.) but lacks **automation** and **persistence**:

1. **No post-action automation** — edits aren't auto-formatted, type errors aren't caught immediately, console.logs slip through
2. **No session persistence** — context is lost between sessions and compactions; work resumption requires manual re-reading
3. **No cost/token tracking** — no visibility into session cost or strategic compaction timing

## Approach

**Cherry-pick and adapt** (Approach B) — study ECC's best hooks, rewrite as simplified Node.js scripts tailored to AICA's 100% TypeScript stack. No plugin installation, no external dependencies beyond what AICA already has.

## Architecture

### File Structure

```
.claude/
├── hooks/                          # NEW — Node.js hook scripts
│   ├── lib/
│   │   └── utils.js                # Shared helpers (cross-platform)
│   ├── post-edit-format.js         # Wave 1.1 — Auto-format after edit
│   ├── post-edit-typecheck.js      # Wave 1.2 — TypeScript check after edit
│   ├── post-edit-console-warn.js   # Wave 1.3 — Console.log warning
│   ├── quality-gate.js             # Wave 1.4 — Async quality checks
│   ├── pre-compact.js              # Wave 2.1 — Save state before compaction
│   ├── session-end.js              # Wave 2.2 — Session summary on Stop
│   ├── session-start.js            # Wave 2.3 — Restore context on start
│   ├── cost-tracker.js             # Wave 3.1 — Token/cost metrics
│   └── suggest-compact.js          # Wave 3.2 — Strategic compaction
├── contexts/                       # NEW — Dynamic system prompts
│   ├── dev.md                      # Development context
│   └── review.md                   # PR review context
├── settings.json                   # UPDATED — new hook entries
└── settings.local.json             # No changes
```

### Hook Registration in settings.json

All new hooks are added to `.claude/settings.json`. Existing PreToolUse hooks (9 safety hooks) remain unchanged.

**New PostToolUse hooks:**
- `post-edit-format.js` — matcher: `Edit`, sync
- `post-edit-typecheck.js` — matcher: `Edit`, async (non-blocking), timeout 30s
- `post-edit-console-warn.js` — matcher: `Edit`, sync
- `quality-gate.js` — matcher: `Write`, async, timeout 15s (only Write — Edit is covered by format hook)

**New PreToolUse hook:**
- `suggest-compact.js` — matcher: `Edit|Write`, sync (instant counter increment)

**New PreCompact hook:**
- `pre-compact.js` — no matcher (PreCompact doesn't support matchers), sync

**New SessionStart hook:**
- `session-start.js` — no matcher needed (fires on all start modes), sync

**New Stop hooks:**
- `session-end.js` — no matcher (Stop doesn't support matchers), async, timeout 10s
- `cost-tracker.js` — no matcher, async, timeout 10s

**Environment requirement:**
- `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=15000` must be set if SessionEnd hooks are used in the future (Stop hooks have default 120s timeout, so no issue there)

**Dropped:** `evaluate-session.js` — removed because Stop hooks cannot trigger Claude to act on signals; the hook would produce files that are never read. Continuous learning will be addressed via manual `/learn` commands instead.

**Note on hook paths:** All hook commands MUST use the project root path prefix to work in worktrees. Format: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<script>.js"`

---

## Wave 1: Post-Action Automation

### 1.1 Auto-format (post-edit-format.js)

**Trigger:** PostToolUse → Edit
**Condition:** file_path ends in `.ts`, `.tsx`, `.js`, `.jsx`
**Action:** Run `npx eslint --fix <file>` (using project's existing ESLint config)
**Timeout:** 15s
**Mode:** Sync (blocks until formatted)
**Fallback:** Silent pass-through if ESLint not found or fix fails

**Prerequisite decision (M1 fix):** AICA does not have Prettier installed. Instead of adding a new dependency pre-launch, we use ESLint which is already configured (`npm run lint`). ESLint with the existing config handles formatting via its rules. If Prettier is added post-launch, this hook can be updated.

**Implementation notes:**
- Detect ESLint via `node_modules/.bin/eslint` existence (faster than npx)
- Find project root by walking up from file to find `package.json`
- On Windows, use `eslint.cmd` with `spawnSync({ shell: true })` but reject paths with shell metacharacters (`&|<>^%!`)
- Pass stdin through to stdout unchanged (hook contract)

### 1.2 TypeScript check (post-edit-typecheck.js)

**Trigger:** PostToolUse → Edit
**Condition:** file_path ends in `.ts`, `.tsx`
**Action:** Run `npx tsc --noEmit --incremental --pretty false`, filter errors to edited file only
**Timeout:** 30s
**Mode:** Async (non-blocking — M2 fix)
**Output:** Relevant errors on stderr (Claude sees on next turn and can self-correct)

**Performance note (M2 fix):** Full `tsc --noEmit` takes 5-30s on AICA's codebase. Running synchronously on every edit would create 10+ minutes of accumulated wait in multi-edit sessions. Solution: run async + use `--incremental` flag to write `.tsbuildinfo` and amortize cost. First run is slow; subsequent runs are fast (~1-3s). Trade-off: errors appear after the next edit rather than immediately, but Claude still sees and corrects them.

**Implementation notes:**
- Walk up from file directory to find nearest `tsconfig.json` (max 20 levels)
- Use `--incremental` to generate `.tsbuildinfo` cache (add to `.gitignore`)
- Filter tsc output lines that contain the edited file path (relative, absolute, or original)
- Show max 10 error lines to avoid noise
- On Windows, use `npx.cmd` via `execFileSync` (no shell needed)

### 1.3 Console.log warning (post-edit-console-warn.js)

**Trigger:** PostToolUse → Edit
**Condition:** file_path ends in `.ts`, `.tsx`, `.js`, `.jsx`
**Action:** Read file, find `console.log` lines, warn with line numbers
**Timeout:** None (instant, read-only)
**Mode:** Sync
**Output:** Warning on stderr with up to 5 matches

**Implementation notes:**
- Simple regex `/console\.log/` per line
- Report format: `[Hook] WARNING: console.log found in <file>\n<lineNum>: <trimmed line>`
- Does NOT block (exit 0 always) — informational only

### 1.4 Quality gate (quality-gate.js)

**Trigger:** PostToolUse → Write (only Write — Edit is covered by format hook, Mi1 fix)
**Condition:** file_path ends in `.ts`, `.tsx`, `.js`, `.jsx`, `.json`
**Action:** Run `eslint --fix <file>` for JS/TS files written via Write tool
**Timeout:** 15s
**Mode:** Async (non-blocking)
**Output:** Warning on stderr if check fails

**Implementation notes:**
- Only triggers on Write tool (Edit already triggers post-edit-format, eliminating deduplication issue)
- For `.json` files: validates JSON syntax only (no eslint)
- Non-blocking — runs in background, doesn't slow Claude down

---

## Wave 2: Session Persistence

### 2.1 PreCompact (pre-compact.js)

**Trigger:** PreCompact → *
**Action:**
1. Ensure `~/.claude/sessions/` exists
2. Append timestamp to `compaction-log.txt`
3. If active session file exists, append compaction marker
**Mode:** Sync (instant, append only)

**Session file format:**
```
~/.claude/sessions/YYYY-MM-DD-<shortId>-session.tmp
```

### 2.1b Recovery when no session file exists (Mi3 fix)

When `pre-compact.js` runs and no session file exists (first use or after `/clear`), it creates a minimal session file with just the compaction marker. This ensures compaction events are always recorded.

### 2.2 Session end (session-end.js)

**Trigger:** Stop (no matcher — Stop doesn't support matchers per C2 fix)
**Action:**
1. Parse stdin JSON for `transcript_path`
2. Read JSONL transcript, extract:
   - Last 10 user messages (first 200 chars each)
   - Files modified (via Edit/Write tool_use entries)
   - Tools used
3. Create/update session file with:
   - Header: date, started time, last updated, project, branch, worktree
   - Summary: tasks, files modified, tools, stats
   - Sections: "Notes for Next Session", "Context to Load"
**Mode:** Async, timeout 10s

**Session file structure:**
```markdown
# Session: 2026-03-13
**Date:** 2026-03-13
**Started:** 14:30
**Last Updated:** 16:45
**Project:** aica
**Branch:** feature/workflow-hooks
**Worktree:** /c/Users/lucas/repos/aica/.worktrees/workflow-hooks

---

<!-- ECC:SUMMARY:START -->
## Session Summary

### Tasks
- Implemented post-edit format hook
- Fixed TypeScript errors in session-start

### Files Modified
- .claude/hooks/post-edit-format.js
- .claude/hooks/lib/utils.js

### Tools Used
Edit, Write, Bash, Grep

### Stats
- Total user messages: 23
<!-- ECC:SUMMARY:END -->

### Notes for Next Session
-

### Context to Load
```
[relevant files]
```
```

**Idempotency:** Repeated Stop invocations update the summary block (between markers) without duplicating. Header fields (Date, Started) are preserved; Last Updated changes.

### 2.3 Session start (session-start.js)

**Trigger:** SessionStart (no matcher needed — fires on all start modes)
**Action:**
1. Ensure `~/.claude/sessions/` directory exists
2. Find session files from last 7 days, sorted by modification time
3. Read the most recent session file
4. If it has actual content (not blank template), inject into stdout
5. Log count of recent sessions and any learned skills
**Mode:** Sync (must complete before session begins)

**Output (via stdout → injected into Claude's context):**
```
Previous session summary:
# Session: 2026-03-13
...
```

**Simplifications vs ECC:**
- No package manager detection (AICA is always npm)
- No project type detection (AICA is always TypeScript/React)
- No session aliases (AICA uses worktree naming convention)

### ~~2.4 Continuous learning evaluator~~ — REMOVED

**Reason (Mi5 fix):** Stop hooks cannot trigger Claude to act on signals. The hook would produce log messages that Claude doesn't see or act on. Continuous learning will be addressed via manual `/learn` command invocation when the user wants to extract patterns from a session.

---

## Wave 3: Token Optimization & Cost

### 3.1 Cost tracker (cost-tracker.js)

**Trigger:** Stop (no matcher)
**Action:**
1. Parse stdin for usage/token data
2. Estimate cost using model-specific rates (Mi4 fix — updated for Claude 4-series):
   - Haiku 4.5: $0.80/$4.00 per 1M tokens (in/out)
   - Sonnet 4.6: $3.00/$15.00
   - Opus 4.6: $15.00/$75.00
   - Model matching: regex `/haiku/i`, `/sonnet/i`, `/opus/i` on model string (covers `claude-opus-4-6`, `claude-sonnet-4-6`, etc.); default to Sonnet rates if no match
3. Append JSONL row to `~/.claude/metrics/costs.jsonl`
**Mode:** Async, timeout 10s

**JSONL format:**
```json
{"timestamp":"2026-03-13T14:30:00Z","session_id":"abc123","model":"opus","input_tokens":5000,"output_tokens":2000,"estimated_cost_usd":0.225}
```

### 3.2 Strategic compaction (suggest-compact.js)

**Trigger:** PreToolUse → Edit|Write
**Action:**
1. Increment tool call counter (temp file per session ID)
2. At 50 calls: suggest `/compact`
3. Every 25 calls after threshold: repeat suggestion
**Mode:** Sync (instant, counter increment only)
**Configurable:** `COMPACT_THRESHOLD` env var (default 50)

**Counter file:** `$TEMP/claude-tool-count-<sessionId>`

### 3.3 Context aliases

**Type:** Manual shell aliases (not a hook)
**Files (user-level, NOT project-level — Mi2 fix):**
- `~/.claude/contexts/dev.md` — Default dev context (module structure, Ceramic tokens, common patterns)
- `~/.claude/contexts/review.md` — PR review context (checklist, security focus, quality criteria)

These are user-level files at `~/.claude/contexts/` (not committed to repo). The aliases also reference user-level paths, so there is no path mismatch.

**Aliases (add to `~/.bashrc` or `~/.zshrc`):**
```bash
alias claude-dev='claude --system-prompt "$(cat ~/.claude/contexts/dev.md)"'
alias claude-review='claude --system-prompt "$(cat ~/.claude/contexts/review.md)"'
```

### 3.4 MCP audit

**Type:** One-time manual action
**Action:** Review enabled MCPs, disable unused ones to free context window
**Rule of thumb:** Keep under 10 enabled / under 80 tools active

---

## Shared Library: .claude/hooks/lib/utils.js

Cross-platform helpers used by all hooks:

| Function | Description |
|----------|-------------|
| `getHomeDir()` | `os.homedir()` |
| `getClaudeDir()` | `~/.claude/` |
| `getSessionsDir()` | `~/.claude/sessions/` |
| `getLearnedSkillsDir()` | `~/.claude/skills/learned/` |
| `getTempDir()` | `os.tmpdir()` |
| `ensureDir(path)` | Create directory if not exists |
| `readFile(path)` | Read file, return null on error |
| `writeFile(path, content)` | Write file |
| `appendFile(path, content)` | Append to file |
| `findFiles(dir, pattern, opts)` | Find files by glob, optional maxAge filter |
| `getDateString()` | `YYYY-MM-DD` |
| `getTimeString()` | `HH:MM` |
| `getDateTimeString()` | `YYYY-MM-DD HH:MM` |
| `getSessionIdShort()` | Last 8 chars of `CLAUDE_SESSION_ID` |
| `getProjectName()` | Git repo name or cwd basename |
| `runCommand(cmd)` | `execSync` wrapper, returns `{success, output}` |
| `log(msg)` | Write to stderr |
| `output(msg)` | Write to stdout (injected into Claude context) |

---

## Integration with Existing Hooks

The 10 existing hooks in `settings.json` remain **unchanged**. New hooks are **additive only**.

**Hook execution order per event:**
- **PreToolUse (Edit|Write):** existing safety hooks → `suggest-compact.js` (new)
- **PostToolUse (Edit):** existing branch-switch reminder → `post-edit-format.js` (sync) → `post-edit-typecheck.js` (async) → `post-edit-console-warn.js` (sync)
- **PostToolUse (Write):** `quality-gate.js` (async)
- **PreCompact:** `pre-compact.js` (sync)
- **SessionStart:** `session-start.js` (sync)
- **Stop:** `session-end.js` (async) → `cost-tracker.js` (async)

**No conflicts:** Existing hooks use inline bash commands; new hooks use Node.js scripts. They operate on different events or different matchers.

---

## Error Handling

All hooks follow the same contract:
1. Read JSON from stdin
2. Process (may fail silently)
3. Write original stdin to stdout (pass-through)
4. Exit 0 (never block Claude)

**Exceptions:** Only existing safety hooks (deploy, force-push, backup files) use exit codes to block.

**Prerequisite (C3 fix):** Verify that existing blocking hooks use the correct exit code for the current Claude Code version. The current hooks use `exit 1` — if Claude Code requires `exit 2` for blocking, update them as a prerequisite before adding new hooks. Test by triggering a deploy hook and confirming it actually blocks.

---

## Testing Strategy

Each hook script can be tested standalone (Mi6 fix — use absolute project path):
```bash
echo '{"tool_input":{"file_path":"src/test.ts"}}' | node "$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-typecheck.js"
```

Verification:
- Wave 1: Edit a .ts file, verify format + typecheck + console.log warning fires
- Wave 2: Complete a session, verify session file created in `~/.claude/sessions/`
- Wave 3: Complete a session, verify cost entry in `~/.claude/metrics/costs.jsonl`

---

## Out of Scope

- **ECC plugin installation** — rejected in favor of cherry-pick approach
- **Biome/Go/Python support** — AICA is 100% TypeScript
- **Session aliases** — AICA uses worktree naming convention
- **Package manager detection** — AICA is always npm
- **tmux integration** — not part of AICA's workflow
- **InsAIts security monitor** — external dependency not needed
- **Continuous learning observe hooks** — too heavy; signal-only approach instead
- **Python in product code** — deferred to post-launch (separate decision)

---

## Review Fixes Applied

| Issue | Severity | Fix |
|-------|----------|-----|
| C1 — Stop vs SessionEnd | Critical | Kept Stop (fires every turn — fine for session-end.js idempotent updates and cost-tracker append). Documented that SessionEnd has 1.5s timeout cap. |
| C2 — Matchers on Stop | Critical | Removed all matchers from Stop, PreCompact, SessionStart entries |
| C3 — Exit code 1 vs 2 | Critical | Added prerequisite verification task for existing blocking hooks |
| M1 — No Prettier | Major | Replaced Prettier with ESLint (already installed) |
| M2 — Sync tsc on every edit | Major | Changed to async + `--incremental` flag |
| M3 — SessionStart stdout | Major | Acknowledged; plain stdout approach kept for simplicity (visible but functional) |
| M4 — CLAUDE_SESSION_ID | Major | Noted; suggest-compact.js will fall back to stdin `session_id` field |
| Mi1 — quality-gate redundancy | Minor | Restricted quality-gate to Write matcher only |
| Mi2 — contexts/ path mismatch | Minor | Clarified user-level (`~/.claude/contexts/`) for both files and aliases |
| Mi3 — pre-compact no session | Minor | Added recovery: creates minimal session file if none exists |
| Mi4 — Model pricing | Minor | Updated with Claude 4-series model matching regex |
| Mi5 — evaluate-session useless | Minor | Removed entirely |
| Mi6 — Hook script paths | Minor | All commands use `$CLAUDE_PROJECT_DIR` prefix |

## Success Criteria

1. **Wave 1:** Every `.ts/.tsx` edit runs ESLint --fix, shows type errors (async), warns on console.log — without manual intervention
2. **Wave 2:** Starting a new session automatically loads context from the previous session; session files are created/updated on every Stop
3. **Wave 3:** Cost per session is tracked; compaction is suggested at logical intervals; context aliases work
4. **Zero regressions:** All 10 existing hooks continue to work unchanged (prerequisite: verify exit codes)
5. **Cross-platform:** All scripts work on Windows/MSYS (AICA's dev environment)
