# Workflow Hooks Optimization — Design Spec

**Date:** 2026-03-13
**Session:** workflow-hooks-optimization
**Status:** Draft
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
│   ├── evaluate-session.js         # Wave 2.4 — Continuous learning signal
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
- `post-edit-typecheck.js` — matcher: `Edit`, sync, timeout 30s
- `post-edit-console-warn.js` — matcher: `Edit`, sync
- `quality-gate.js` — matcher: `Edit|Write`, async, timeout 15s

**New PreCompact hook:**
- `pre-compact.js` — matcher: `*`, sync

**New SessionStart hook:**
- `session-start.js` — matcher: `*`, sync

**New Stop hooks:**
- `session-end.js` — matcher: `*`, async, timeout 10s
- `evaluate-session.js` — matcher: `*`, async, timeout 10s
- `cost-tracker.js` — matcher: `*`, async, timeout 10s
- `suggest-compact.js` — matcher: `*`, async, timeout 5s (actually on PreToolUse Edit|Write)

**Correction:** `suggest-compact.js` goes in PreToolUse (Edit|Write) not Stop, as it counts tool calls.

---

## Wave 1: Post-Action Automation

### 1.1 Auto-format (post-edit-format.js)

**Trigger:** PostToolUse → Edit
**Condition:** file_path ends in `.ts`, `.tsx`, `.js`, `.jsx`
**Action:** Run `npx prettier --write <file>` (or local `node_modules/.bin/prettier`)
**Timeout:** 15s
**Mode:** Sync (blocks until formatted)
**Fallback:** Silent pass-through if Prettier not found

**Implementation notes:**
- Detect Prettier via `node_modules/.bin/prettier` existence (faster than npx)
- Find project root by walking up from file to find `package.json`
- On Windows, use `prettier.cmd` with `spawnSync({ shell: true })` but reject paths with shell metacharacters (`&|<>^%!`)
- Pass stdin through to stdout unchanged (hook contract)

### 1.2 TypeScript check (post-edit-typecheck.js)

**Trigger:** PostToolUse → Edit
**Condition:** file_path ends in `.ts`, `.tsx`
**Action:** Run `npx tsc --noEmit --pretty false`, filter errors to edited file only
**Timeout:** 30s
**Mode:** Sync
**Output:** Relevant errors on stderr (Claude sees and can self-correct)

**Implementation notes:**
- Walk up from file directory to find nearest `tsconfig.json` (max 20 levels)
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

**Trigger:** PostToolUse → Edit|Write
**Condition:** file_path ends in `.ts`, `.tsx`, `.js`, `.jsx`, `.json`
**Action:** Run `prettier --check <file>` (validate, don't fix)
**Timeout:** 15s
**Mode:** Async (non-blocking)
**Output:** Warning on stderr if check fails

**Implementation notes:**
- Skips `.ts/.tsx/.js/.jsx` if post-edit-format already ran (avoid double work)
- Primarily useful for `.json` files and Write tool (which doesn't trigger format hook)
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

### 2.2 Session end (session-end.js)

**Trigger:** Stop → *
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

**Trigger:** SessionStart → *
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

### 2.4 Continuous learning evaluator (evaluate-session.js)

**Trigger:** Stop → *
**Action:**
1. Parse stdin JSON for `transcript_path`
2. Count user messages in transcript
3. If >= 10 messages, log signal for pattern extraction
4. Point to `~/.claude/skills/learned/` for saving
**Mode:** Async, timeout 10s

**Note:** This is a signal-only hook. The actual pattern extraction happens when Claude decides to save a skill based on the signal. ECC's full continuous-learning-v2 system is more complex (observe hooks on every tool use) — we skip that complexity.

---

## Wave 3: Token Optimization & Cost

### 3.1 Cost tracker (cost-tracker.js)

**Trigger:** Stop → *
**Action:**
1. Parse stdin for usage/token data
2. Estimate cost using model-specific rates:
   - Haiku: $0.80/$4.00 per 1M tokens (in/out)
   - Sonnet: $3.00/$15.00
   - Opus: $15.00/$75.00
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
**Files:**
- `~/.claude/contexts/dev.md` — Default dev context (module structure, Ceramic tokens, common patterns)
- `~/.claude/contexts/review.md` — PR review context (checklist, security focus, quality criteria)

**Aliases:**
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
- **PreToolUse (Edit):** existing safety hooks → `suggest-compact.js` (new)
- **PostToolUse (Edit):** existing branch-switch reminder → `post-edit-format.js` → `post-edit-typecheck.js` → `post-edit-console-warn.js` (new)
- **PostToolUse (Edit|Write):** `quality-gate.js` (new, async)
- **PreCompact:** `pre-compact.js` (new)
- **SessionStart:** `session-start.js` (new)
- **Stop:** `session-end.js` → `evaluate-session.js` → `cost-tracker.js` (all new, async)

**No conflicts:** Existing hooks use inline bash commands; new hooks use Node.js scripts. They operate on different events or different matchers.

---

## Error Handling

All hooks follow the same contract:
1. Read JSON from stdin
2. Process (may fail silently)
3. Write original stdin to stdout (pass-through)
4. Exit 0 (never block Claude)

**Exceptions:** Only existing safety hooks (deploy, force-push, backup files) exit 1 to block. None of the new hooks block.

---

## Testing Strategy

Each hook script can be tested standalone:
```bash
echo '{"tool_input":{"file_path":"src/test.ts"}}' | node .claude/hooks/post-edit-typecheck.js
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

## Success Criteria

1. **Wave 1:** Every `.ts/.tsx` edit auto-formats, shows type errors, warns on console.log — without manual intervention
2. **Wave 2:** Starting a new session automatically loads context from the previous session; session files are created/updated on every Stop
3. **Wave 3:** Cost per session is tracked; compaction is suggested at logical intervals; context aliases work
4. **Zero regressions:** All 10 existing hooks continue to work unchanged
5. **Cross-platform:** All scripts work on Windows/MSYS (AICA's dev environment)
