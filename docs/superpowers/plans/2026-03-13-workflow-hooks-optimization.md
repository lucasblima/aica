# Workflow Hooks Optimization — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 Node.js hook scripts to AICA's Claude Code setup for post-action automation, session persistence, and cost tracking.

**Architecture:** All hooks live in `.claude/hooks/` with a shared `lib/utils.cjs`. They are registered in `.claude/settings.json` as additive entries (existing hooks untouched). Each script reads JSON from stdin, does its work, writes stdin back to stdout, and exits 0.

> **IMPORTANT:** All hook files use `.cjs` extension (not `.js`) because `package.json` has `"type": "module"` which causes `.js` files to be treated as ESM. CommonJS requires `.cjs`.

**Tech Stack:** Node.js (CommonJS, no dependencies), Claude Code hooks API

**Spec:** `docs/superpowers/specs/2026-03-13-workflow-hooks-optimization-design.md`

---

## Chunk 1: Foundation — Shared Library + Prerequisite Verification

### Task 1: Verify existing blocking hooks work correctly

**Files:**
- Read: `.claude/settings.json`

This is a manual verification, not code. Confirm that `exit 1` in deploy and force-push hooks actually blocks Claude Code.

- [ ] **Step 1: Test deploy blocker**

Test the deploy blocker's grep logic separately (Mi4 fix — avoids fragile quote escaping on MSYS):
```bash
echo "gcloud builds submit --config=cloudbuild.yaml" | grep -q 'gcloud builds submit' && echo "MATCH: OK" && exit 1 || echo "NO MATCH: FAIL"
echo "Exit code: $?"
```
Expected: "MATCH: OK" printed, exit code 1. If exit code is 0, the blocker is broken — update all blocking hooks to use `exit 2`.

- [ ] **Step 2: Document result**

If `exit 1` blocks correctly: no changes needed.
If `exit 1` does NOT block: update all three blocking hooks (deploy, force-push, backup files) to use `exit 2`. This is a separate micro-fix commit.

### Task 2: Create shared library `.claude/hooks/lib/utils.js`

**Files:**
- Create: `.claude/hooks/lib/utils.js`

- [ ] **Step 1: Create the hooks directory structure**

```bash
mkdir -p .claude/hooks/lib
```

- [ ] **Step 2: Write utils.js**

Create `.claude/hooks/lib/utils.js` with:

```javascript
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const MAX_STDIN = 1024 * 1024;

function getHomeDir() {
  return os.homedir();
}

function getClaudeDir() {
  return path.join(getHomeDir(), '.claude');
}

function getSessionsDir() {
  return path.join(getClaudeDir(), 'sessions');
}

function getLearnedSkillsDir() {
  return path.join(getClaudeDir(), 'skills', 'learned');
}

function getTempDir() {
  return os.tmpdir();
}

function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw new Error(`Failed to create directory '${dirPath}': ${err.message}`);
    }
  }
  return dirPath;
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function appendFile(filePath, content) {
  fs.appendFileSync(filePath, content, 'utf8');
}

function findFiles(dir, extension, opts = {}) {
  const maxAge = opts.maxAge || null; // days
  const now = Date.now();

  try {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith(extension))
      .map(f => {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        return { path: fullPath, name: f, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (maxAge) {
      const cutoff = now - maxAge * 24 * 60 * 60 * 1000;
      return files.filter(f => f.mtime >= cutoff);
    }
    return files;
  } catch {
    return [];
  }
}

function getDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getDateTimeString() {
  return `${getDateString()} ${getTimeString()}`;
}

function getSessionIdShort(fallback) {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId && sessionId.length > 0) {
    return sessionId.slice(-8);
  }
  return getProjectName() || fallback || 'default';
}

function getProjectName() {
  try {
    const result = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    }).trim();
    return path.basename(result);
  } catch {
    return path.basename(process.cwd()) || null;
  }
}

function runCommand(cmd) {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000
    }).trim();
    return { success: true, output };
  } catch (err) {
    return { success: false, output: (err.stderr || err.message || '').trim() };
  }
}

function log(msg) {
  process.stderr.write(`${msg}\n`);
}

function output(msg) {
  process.stdout.write(msg);
}

/**
 * Standard stdin reader for hooks.
 * Calls callback(rawInput) when stdin is fully consumed.
 */
function readStdin(callback) {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (data.length < MAX_STDIN) {
      data += chunk.substring(0, MAX_STDIN - data.length);
    }
  });
  process.stdin.on('end', () => {
    callback(data);
  });
}

/**
 * Find project root by walking up from startDir looking for package.json.
 */
function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  let depth = 0;
  while (dir !== root && depth < 20) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
    depth++;
  }
  return null;
}

module.exports = {
  MAX_STDIN,
  getHomeDir,
  getClaudeDir,
  getSessionsDir,
  getLearnedSkillsDir,
  getTempDir,
  ensureDir,
  readFile,
  writeFile,
  appendFile,
  findFiles,
  getDateString,
  getTimeString,
  getDateTimeString,
  getSessionIdShort,
  getProjectName,
  runCommand,
  log,
  output,
  readStdin,
  findProjectRoot
};
```

- [ ] **Step 3: Verify the module loads**

```bash
node -e "const u = require('./.claude/hooks/lib/utils.js'); console.log('Functions:', Object.keys(u).length); console.log('Home:', u.getHomeDir()); console.log('Project:', u.getProjectName())"
```
Expected: Functions: 21, Home: /c/Users/lucas (or equivalent), Project: aica

- [ ] **Step 4: Commit**

```bash
git add .claude/hooks/lib/utils.js
git commit -m "feat(hooks): add shared utils library for Claude Code hooks

Cross-platform Node.js helpers: file I/O, session management,
project detection, stdin reader for hook contract."
```

---

## Chunk 2: Wave 1 — Post-Action Automation (4 hooks)

### Task 3: Create `post-edit-format.js` (ESLint auto-fix)

**Files:**
- Create: `.claude/hooks/post-edit-format.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/post-edit-format.js`:

```javascript
#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format JS/TS files after edits using ESLint --fix.
 * Falls back silently if ESLint is not available.
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readStdin, findProjectRoot, log } = require('./lib/utils');

const UNSAFE_PATH_CHARS = /[&|<>^%!]/;

function resolveEslint(projectRoot) {
  // M5 fix: prefer local binary over npx for speed
  const localBin = path.join(projectRoot, 'node_modules', '.bin',
    process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
  if (fs.existsSync(localBin)) {
    return { bin: localBin, args: ['--fix', '--no-warn-ignored'] };
  }
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return { bin: npxBin, args: ['eslint', '--fix', '--no-warn-ignored'] };
}

function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.(ts|tsx|js|jsx)$/.test(filePath)) {
      try {
        const resolvedPath = path.resolve(filePath);
        const projectRoot = findProjectRoot(path.dirname(resolvedPath));
        if (!projectRoot) return;

        if (process.platform === 'win32' && UNSAFE_PATH_CHARS.test(resolvedPath)) return;

        const eslint = resolveEslint(projectRoot);
        const result = spawnSync(eslint.bin, [...eslint.args, resolvedPath], {
          cwd: projectRoot,
          shell: process.platform === 'win32',
          stdio: 'pipe',
          timeout: 15000
        });
        if (result.error) throw result.error;
      } catch {
        // ESLint not available or failed — silent pass-through
      }
    }
  } catch {
    // Invalid input — pass through
  }
}

if (require.main === module) {
  readStdin(data => {
    run(data);
    process.stdout.write(data);
    process.exit(0);
  });
}

module.exports = { run };
```

- [ ] **Step 2: Test standalone**

```bash
echo '{"tool_input":{"file_path":"src/App.tsx"}}' | node .claude/hooks/post-edit-format.js
```
Expected: JSON echoed back to stdout, no errors. If eslint ran, any fixable issues in App.tsx were fixed.

- [ ] **Step 3: Commit**

```bash
git add .claude/hooks/post-edit-format.js
git commit -m "feat(hooks): add post-edit ESLint auto-fix hook"
```

### Task 4: Create `post-edit-typecheck.js` (async tsc)

**Files:**
- Create: `.claude/hooks/post-edit-typecheck.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/post-edit-typecheck.js`:

```javascript
#!/usr/bin/env node
/**
 * PostToolUse Hook: TypeScript check after editing .ts/.tsx files.
 * Runs async (non-blocking). Uses --incremental for fast subsequent runs.
 * Filters output to only errors in the edited file.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readStdin, log } = require('./lib/utils');

function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.(ts|tsx)$/.test(filePath)) {
      const resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) return;

      // Find nearest tsconfig.json
      let dir = path.dirname(resolvedPath);
      const root = path.parse(dir).root;
      let depth = 0;
      while (dir !== root && depth < 20) {
        if (fs.existsSync(path.join(dir, 'tsconfig.json'))) break;
        dir = path.dirname(dir);
        depth++;
      }

      if (!fs.existsSync(path.join(dir, 'tsconfig.json'))) return;

      // M1 fix: truly async — spawn tsc in background, don't block
      const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const child = spawn(npxBin, ['tsc', '--noEmit', '--incremental', '--pretty', 'false'], {
        cwd: dir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      });

      let stderr = '';
      let stdout = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });

      child.on('close', (code) => {
        if (code !== 0) {
          const output = stdout + stderr;
          const relPath = path.relative(dir, resolvedPath);
          const candidates = new Set([filePath, resolvedPath, relPath]);
          const relevantLines = output
            .split('\n')
            .filter(line => {
              for (const candidate of candidates) {
                if (line.includes(candidate)) return true;
              }
              return false;
            })
            .slice(0, 10);

          if (relevantLines.length > 0) {
            log(`[Hook] TypeScript errors in ${path.basename(filePath)}:`);
            relevantLines.forEach(line => log(line));
          }
        }
      });

      // Kill after 30s to prevent zombie processes
      setTimeout(() => { try { child.kill(); } catch {} }, 30000);
    }
  } catch {
    // Invalid input — pass through
  }
}

if (require.main === module) {
  readStdin(data => {
    run(data);
    // M1 fix: write data and exit immediately — tsc runs in background
    process.stdout.write(data);
    // Don't exit(0) immediately — let the child process finish logging
    // The process will exit naturally when tsc completes
  });
}

module.exports = { run };
```

- [ ] **Step 2: Test standalone**

```bash
echo '{"tool_input":{"file_path":"src/App.tsx"}}' | node .claude/hooks/post-edit-typecheck.js
```
Expected: JSON on stdout. Any TS errors in App.tsx show on stderr.

- [ ] **Step 3: Ensure .tsbuildinfo is gitignored**

```bash
# Mi3 fix: --incremental creates .tsbuildinfo — ensure it's ignored
grep -q 'tsbuildinfo' .gitignore || echo '*.tsbuildinfo' >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add .claude/hooks/post-edit-typecheck.js .gitignore
git commit -m "feat(hooks): add async TypeScript check hook with --incremental"
```

### Task 5: Create `post-edit-console-warn.js`

**Files:**
- Create: `.claude/hooks/post-edit-console-warn.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/post-edit-console-warn.js`:

```javascript
#!/usr/bin/env node
/**
 * PostToolUse Hook: Warn about console.log statements after edits.
 * Reports line numbers to help remove debug statements before committing.
 */
'use strict';

const fs = require('fs');
const { readStdin, log } = require('./lib/utils');

function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.(ts|tsx|js|jsx)$/.test(filePath)) {
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        return;
      }

      const lines = content.split('\n');
      const matches = [];

      lines.forEach((line, idx) => {
        if (/console\.log/.test(line)) {
          matches.push(`${idx + 1}: ${line.trim()}`);
        }
      });

      if (matches.length > 0) {
        log(`[Hook] WARNING: console.log found in ${filePath}`);
        matches.slice(0, 5).forEach(m => log(m));
        log('[Hook] Remove console.log before committing');
      }
    }
  } catch {
    // Invalid input — pass through
  }
}

if (require.main === module) {
  readStdin(data => {
    run(data);
    process.stdout.write(data);
    process.exit(0);
  });
}

module.exports = { run };
```

- [ ] **Step 2: Commit**

```bash
git add .claude/hooks/post-edit-console-warn.js
git commit -m "feat(hooks): add console.log warning hook"
```

### Task 6: Create `quality-gate.js` (Write-only)

**Files:**
- Create: `.claude/hooks/quality-gate.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/quality-gate.js`:

```javascript
#!/usr/bin/env node
/**
 * PostToolUse Hook: Quality gate for Write tool.
 * Runs ESLint --fix on JS/TS files created via Write tool.
 * Validates JSON syntax for .json files.
 * Async (non-blocking).
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readStdin, findProjectRoot, log } = require('./lib/utils');

const UNSAFE_PATH_CHARS = /[&|<>^%!]/;

// M5 fix: prefer local binary over npx for speed
function resolveEslint(projectRoot) {
  const localBin = path.join(projectRoot, 'node_modules', '.bin',
    process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
  if (fs.existsSync(localBin)) {
    return { bin: localBin, args: ['--fix', '--no-warn-ignored'] };
  }
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return { bin: npxBin, args: ['eslint', '--fix', '--no-warn-ignored'] };
}

function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const filePath = input.tool_input?.file_path;
    if (!filePath || !fs.existsSync(filePath)) return;

    const ext = path.extname(filePath).toLowerCase();
    const resolvedPath = path.resolve(filePath);

    // JSON syntax validation
    if (ext === '.json') {
      try {
        JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      } catch (err) {
        log(`[QualityGate] Invalid JSON in ${filePath}: ${err.message}`);
      }
      return;
    }

    // M2 fix: async ESLint for JS/TS files (non-blocking)
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      const projectRoot = findProjectRoot(path.dirname(resolvedPath));
      if (!projectRoot) return;

      if (process.platform === 'win32' && UNSAFE_PATH_CHARS.test(resolvedPath)) return;

      const eslint = resolveEslint(projectRoot);
      const child = spawn(eslint.bin, [...eslint.args, resolvedPath], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      });

      child.on('close', (code) => {
        if (code !== 0) {
          log(`[QualityGate] ESLint exited with code ${code} on ${filePath}`);
        }
      });

      setTimeout(() => { try { child.kill(); } catch {} }, 15000);
    }
  } catch {
    // Invalid input — pass through
  }
}

if (require.main === module) {
  readStdin(data => {
    run(data);
    process.stdout.write(data);
    process.exit(0);
  });
}

module.exports = { run };
```

- [ ] **Step 2: Commit**

```bash
git add .claude/hooks/quality-gate.js
git commit -m "feat(hooks): add quality gate hook for Write tool"
```

---

## Chunk 3: Wave 2 — Session Persistence (3 hooks)

### Task 7: Create `pre-compact.js`

**Files:**
- Create: `.claude/hooks/pre-compact.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/pre-compact.js`:

```javascript
#!/usr/bin/env node
/**
 * PreCompact Hook: Save state before context compaction.
 * Logs compaction event and marks active session file.
 * Creates a minimal session file if none exists.
 */
'use strict';

const path = require('path');
const {
  getSessionsDir,
  getDateTimeString,
  getTimeString,
  getDateString,
  getSessionIdShort,
  getProjectName,
  findFiles,
  ensureDir,
  appendFile,
  writeFile,
  readStdin,
  log
} = require('./lib/utils');

function run() {
  const sessionsDir = getSessionsDir();
  const compactionLog = path.join(sessionsDir, 'compaction-log.txt');
  ensureDir(sessionsDir);

  const timestamp = getDateTimeString();
  appendFile(compactionLog, `[${timestamp}] Context compaction triggered\n`);

  const sessions = findFiles(sessionsDir, '-session.tmp');

  if (sessions.length > 0) {
    const activeSession = sessions[0].path;
    const timeStr = getTimeString();
    appendFile(activeSession, `\n---\n**[Compaction occurred at ${timeStr}]** - Context was summarized\n`);
  } else {
    // Mi3 fix: create minimal session file so compaction is always recorded
    const today = getDateString();
    const shortId = getSessionIdShort();
    const project = getProjectName() || 'unknown';
    const sessionFile = path.join(sessionsDir, `${today}-${shortId}-session.tmp`);
    writeFile(sessionFile, `# Session: ${today}\n**Project:** ${project}\n\n---\n**[Compaction occurred at ${getTimeString()}]** - Context was summarized\n`);
  }

  log('[PreCompact] State saved before compaction');
}

if (require.main === module) {
  readStdin(data => {
    run();
    process.stdout.write(data);
    process.exit(0);
  });
}

module.exports = { run };
```

- [ ] **Step 2: Commit**

```bash
git add .claude/hooks/pre-compact.js
git commit -m "feat(hooks): add pre-compact state preservation hook"
```

### Task 8: Create `session-end.js`

**Files:**
- Create: `.claude/hooks/session-end.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/session-end.js`:

```javascript
#!/usr/bin/env node
/**
 * Stop Hook: Persist session summary after each response.
 * Reads transcript_path from stdin JSON, extracts tasks/files/tools,
 * writes to ~/.claude/sessions/ for cross-session continuity.
 * Idempotent: summary block is replaced on each invocation.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const {
  getSessionsDir,
  getDateString,
  getTimeString,
  getSessionIdShort,
  getProjectName,
  ensureDir,
  readFile,
  writeFile,
  runCommand,
  readStdin,
  log
} = require('./lib/utils');

const SUMMARY_START = '<!-- AICA:SUMMARY:START -->';
const SUMMARY_END = '<!-- AICA:SUMMARY:END -->';
const SEPARATOR = '\n---\n';

function extractSummary(transcriptPath) {
  const content = readFile(transcriptPath);
  if (!content) return null;

  // Mi1: Transcript format is undocumented and may change.
  // Gracefully handle unexpected structures — skip unparseable lines.
  const lines = content.split('\n').filter(Boolean);
  const userMessages = [];
  const toolsUsed = new Set();
  const filesModified = new Set();

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // User messages
      const rawContent = entry.message?.content ?? entry.content;
      if ((entry.type === 'user' || entry.role === 'user' || entry.message?.role === 'user') && rawContent) {
        const text = typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent.map(c => (c && c.text) || '').join(' ')
            : '';
        if (text.trim()) userMessages.push(text.trim().slice(0, 200));
      }

      // Tool uses from assistant content blocks
      if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'tool_use') {
            if (block.name) toolsUsed.add(block.name);
            if (block.input?.file_path && (block.name === 'Edit' || block.name === 'Write')) {
              filesModified.add(block.input.file_path);
            }
          }
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }

  if (userMessages.length === 0) return null;

  return {
    userMessages: userMessages.slice(-10),
    toolsUsed: Array.from(toolsUsed).slice(0, 20),
    filesModified: Array.from(filesModified).slice(0, 30),
    totalMessages: userMessages.length
  };
}

function buildSummaryBlock(summary) {
  let section = '## Session Summary\n\n';
  section += '### Tasks\n';
  for (const msg of summary.userMessages) {
    section += `- ${msg.replace(/\n/g, ' ').replace(/`/g, '\\`')}\n`;
  }
  section += '\n';
  if (summary.filesModified.length > 0) {
    section += '### Files Modified\n';
    for (const f of summary.filesModified) section += `- ${f}\n`;
    section += '\n';
  }
  if (summary.toolsUsed.length > 0) {
    section += `### Tools Used\n${summary.toolsUsed.join(', ')}\n\n`;
  }
  section += `### Stats\n- Total user messages: ${summary.totalMessages}\n`;
  return `${SUMMARY_START}\n${section.trim()}\n${SUMMARY_END}`;
}

function buildHeader(today, currentTime, metadata, existingContent) {
  const started = existingContent
    ? (existingContent.match(/\*\*Started:\*\*\s*(.+)$/m) || [])[1] || currentTime
    : currentTime;

  return [
    `# Session: ${today}`,
    `**Date:** ${today}`,
    `**Started:** ${started}`,
    `**Last Updated:** ${currentTime}`,
    `**Project:** ${metadata.project}`,
    `**Branch:** ${metadata.branch}`,
    metadata.worktree ? `**Worktree:** ${metadata.worktree}` : null,
    ''
  ].filter(Boolean).join('\n');
}

function run(rawInput) {
  let transcriptPath = null;
  try {
    const input = JSON.parse(rawInput);
    transcriptPath = input.transcript_path;
  } catch {
    // No transcript path available
  }

  const sessionsDir = getSessionsDir();
  const today = getDateString();
  const shortId = getSessionIdShort();
  const sessionFile = path.join(sessionsDir, `${today}-${shortId}-session.tmp`);
  ensureDir(sessionsDir);

  const currentTime = getTimeString();
  const branchResult = runCommand('git rev-parse --abbrev-ref HEAD');
  // M4 fix: detect worktree for session context
  const worktreeResult = runCommand('git rev-parse --show-toplevel');
  const topLevel = worktreeResult.success ? worktreeResult.output : '';
  const isWorktree = topLevel.includes('.worktrees');
  const metadata = {
    project: getProjectName() || 'unknown',
    branch: branchResult.success ? branchResult.output : 'unknown',
    worktree: isWorktree ? topLevel : null
  };

  let summary = null;
  if (transcriptPath && fs.existsSync(transcriptPath)) {
    summary = extractSummary(transcriptPath);
  }

  const existing = readFile(sessionFile);

  if (existing) {
    let updated = existing;
    // Update Last Updated time
    updated = updated.replace(/\*\*Last Updated:\*\*.*$/m, `**Last Updated:** ${currentTime}`);

    if (summary) {
      const summaryBlock = buildSummaryBlock(summary);
      const re = new RegExp(
        escapeRegExp(SUMMARY_START) + '[\\s\\S]*?' + escapeRegExp(SUMMARY_END)
      );
      if (re.test(updated)) {
        updated = updated.replace(re, summaryBlock);
      } else {
        updated += `\n${summaryBlock}\n`;
      }
    }
    writeFile(sessionFile, updated);
  } else {
    const header = buildHeader(today, currentTime, metadata, null);
    const summarySection = summary
      ? buildSummaryBlock(summary)
      : '## Current State\n\n[Session context goes here]';
    const template = `${header}${SEPARATOR}${summarySection}\n\n### Notes for Next Session\n-\n`;
    writeFile(sessionFile, template);
  }

  log(`[SessionEnd] Session file: ${sessionFile}`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (require.main === module) {
  readStdin(data => {
    run(data);
    process.stdout.write(data);
    process.exit(0);
  });
}

module.exports = { run };
```

- [ ] **Step 2: Test standalone**

```bash
echo '{}' | node .claude/hooks/session-end.js
ls ~/.claude/sessions/
```
Expected: Session file created at `~/.claude/sessions/2026-03-13-<id>-session.tmp`.

- [ ] **Step 3: Commit**

```bash
git add .claude/hooks/session-end.js
git commit -m "feat(hooks): add session-end summary persistence hook"
```

### Task 9: Create `session-start.js`

**Files:**
- Create: `.claude/hooks/session-start.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/session-start.js`:

```javascript
#!/usr/bin/env node
/**
 * SessionStart Hook: Load previous session context on new session.
 * Finds the most recent session file from last 7 days and injects
 * its content into Claude's context via stdout.
 */
'use strict';

const {
  getSessionsDir,
  ensureDir,
  findFiles,
  readFile,
  readStdin,
  log,
  output
} = require('./lib/utils');

function run() {
  const sessionsDir = getSessionsDir();
  ensureDir(sessionsDir);

  const recentSessions = findFiles(sessionsDir, '-session.tmp', { maxAge: 7 });

  if (recentSessions.length > 0) {
    const latest = recentSessions[0];
    log(`[SessionStart] Found ${recentSessions.length} recent session(s)`);
    log(`[SessionStart] Latest: ${latest.path}`);

    const content = readFile(latest.path);
    if (content && !content.includes('[Session context goes here]')) {
      output(`Previous session summary:\n${content}`);
    }
  } else {
    log('[SessionStart] No recent sessions found');
  }
}

if (require.main === module) {
  readStdin(() => {
    // C2 fix: SessionStart hooks inject context via stdout.
    // Do NOT echo stdin back — only output() calls above matter.
    run();
    process.exit(0);
  });
}

module.exports = { run };
```

- [ ] **Step 2: Commit**

```bash
git add .claude/hooks/session-start.js
git commit -m "feat(hooks): add session-start context restoration hook"
```

---

## Chunk 4: Wave 3 — Token Optimization & Cost (2 hooks + contexts)

### Task 10: Create `cost-tracker.js`

**Files:**
- Create: `.claude/hooks/cost-tracker.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/cost-tracker.js`:

```javascript
#!/usr/bin/env node
/**
 * Stop Hook: Track token usage and estimated cost per session.
 * Appends JSONL rows to ~/.claude/metrics/costs.jsonl.
 */
'use strict';

const path = require('path');
const { getClaudeDir, ensureDir, appendFile, readStdin } = require('./lib/utils');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function estimateCost(model, inputTokens, outputTokens) {
  const rates = {
    haiku:  { in: 0.8, out: 4.0 },
    sonnet: { in: 3.0, out: 15.0 },
    opus:   { in: 15.0, out: 75.0 }
  };

  const normalized = String(model || '').toLowerCase();
  let tier = rates.sonnet; // default
  if (/haiku/i.test(normalized)) tier = rates.haiku;
  if (/opus/i.test(normalized)) tier = rates.opus;

  const cost = (inputTokens / 1_000_000) * tier.in + (outputTokens / 1_000_000) * tier.out;
  return Math.round(cost * 1e6) / 1e6;
}

function run(rawInput) {
  try {
    const input = rawInput.trim() ? JSON.parse(rawInput) : {};
    const usage = input.usage || input.token_usage || {};
    const inputTokens = toNumber(usage.input_tokens || usage.prompt_tokens || 0);
    const outputTokens = toNumber(usage.output_tokens || usage.completion_tokens || 0);

    if (inputTokens === 0 && outputTokens === 0) return;

    const model = String(input.model || process.env.CLAUDE_MODEL || 'unknown');
    const sessionId = String(process.env.CLAUDE_SESSION_ID || 'default');

    const metricsDir = path.join(getClaudeDir(), 'metrics');
    ensureDir(metricsDir);

    const row = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimateCost(model, inputTokens, outputTokens)
    };

    appendFile(path.join(metricsDir, 'costs.jsonl'), `${JSON.stringify(row)}\n`);
  } catch {
    // Non-blocking
  }
}

if (require.main === module) {
  readStdin(data => {
    run(data);
    process.stdout.write(data);
    process.exit(0);
  });
}

module.exports = { run };
```

- [ ] **Step 2: Commit**

```bash
git add .claude/hooks/cost-tracker.js
git commit -m "feat(hooks): add cost tracker hook for token/cost metrics"
```

### Task 11: Create `suggest-compact.js`

**Files:**
- Create: `.claude/hooks/suggest-compact.js`

- [ ] **Step 1: Write the hook script**

Create `.claude/hooks/suggest-compact.js`:

```javascript
#!/usr/bin/env node
/**
 * PreToolUse Hook: Suggest /compact at strategic intervals.
 * Tracks tool call count per session, suggests compaction at threshold.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { getTempDir, readStdin, log } = require('./lib/utils');

function run(rawInput) {
  // Get session ID from stdin JSON or environment
  let sessionId = 'default';
  try {
    const input = JSON.parse(rawInput);
    sessionId = input.session_id || process.env.CLAUDE_SESSION_ID || 'default';
  } catch {
    sessionId = process.env.CLAUDE_SESSION_ID || 'default';
  }

  sessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';

  const counterFile = path.join(getTempDir(), `claude-tool-count-${sessionId}`);
  const rawThreshold = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);
  const threshold = (Number.isFinite(rawThreshold) && rawThreshold > 0 && rawThreshold <= 10000)
    ? rawThreshold
    : 50;

  let count = 1;

  try {
    const fd = fs.openSync(counterFile, 'a+');
    try {
      const buf = Buffer.alloc(64);
      const bytesRead = fs.readSync(fd, buf, 0, 64, 0);
      if (bytesRead > 0) {
        const parsed = parseInt(buf.toString('utf8', 0, bytesRead).trim(), 10);
        count = (Number.isFinite(parsed) && parsed > 0 && parsed <= 1000000)
          ? parsed + 1
          : 1;
      }
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, String(count), 0);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    // Fallback silently
  }

  if (count === threshold) {
    log(`[Compact] ${threshold} tool calls reached — consider /compact if transitioning phases`);
  }

  if (count > threshold && (count - threshold) % 25 === 0) {
    log(`[Compact] ${count} tool calls — good checkpoint for /compact if context is stale`);
  }
}

if (require.main === module) {
  readStdin(data => {
    run(data);
    process.stdout.write(data);
    process.exit(0);
  });
}

module.exports = { run };
```

- [ ] **Step 2: Commit**

```bash
git add .claude/hooks/suggest-compact.js
git commit -m "feat(hooks): add strategic compaction suggestion hook"
```

### Task 12: Create context files

**Files:**
- Create: `~/.claude/contexts/dev.md`
- Create: `~/.claude/contexts/review.md`

These are user-level files, NOT committed to the repo.

- [ ] **Step 1: Create dev context**

Create `~/.claude/contexts/dev.md`:

```markdown
# AICA Development Context

You are working on AICA Life OS — a React 18 + TypeScript + Vite + Supabase application.

## Key Patterns
- Ceramic Design System (neumorphic, warm palette) — use `ceramic-*` tokens
- Modules in `src/modules/{atlas,agenda,journey,grants,connections,studio,finance,flux}/`
- Edge Functions in `supabase/functions/` (Deno, never expose API keys)
- GeminiClient singleton for all AI calls
- RLS required on all tables

## Quick Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run typecheck` — tsc --noEmit
- `npm run test` — vitest
```

- [ ] **Step 2: Create review context**

Create `~/.claude/contexts/review.md`:

```markdown
# AICA Code Review Context

Review focus areas:
- Security: No API keys in frontend, RLS on all tables, CORS restricted
- Ceramic compliance: Use semantic tokens (ceramic-*), not Material Design
- Auth: @supabase/ssr only, never refreshSession() unconditionally
- Types: Strict TypeScript, no `any` unless justified
- Tests: TDD cycle followed, coverage for edge cases
```

- [ ] **Step 3: Commit** (skip — user-level files not committed)

---

## Chunk 5: Hook Registration + Final Verification

### Task 13: Update `.claude/settings.json` with new hook entries

**Files:**
- Modify: `.claude/settings.json`

- [ ] **Step 1: Add new PreToolUse entry (suggest-compact)**

Add to the end of the `PreToolUse` array in `.claude/settings.json`:

```json
{
  "matcher": "Edit|Write",
  "hooks": [
    {
      "type": "command",
      "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/suggest-compact.js\""
    }
  ]
}
```

- [ ] **Step 2: Add new PostToolUse entries (Wave 1 hooks)**

Add to the `PostToolUse` array after the existing branch-switch hook:

```json
{
  "matcher": "Edit",
  "hooks": [
    {
      "type": "command",
      "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-format.js\""
    }
  ]
},
{
  "matcher": "Edit",
  "hooks": [
    {
      "type": "command",
      "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-typecheck.js\"",
      "timeout": 30
    }
  ]
},
{
  "matcher": "Edit",
  "hooks": [
    {
      "type": "command",
      "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-console-warn.js\""
    }
  ]
},
{
  "matcher": "Write",
  "hooks": [
    {
      "type": "command",
      "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/quality-gate.js\"",
      "timeout": 15
    }
  ]
}
```

- [ ] **Step 3: Add PreCompact section**

Add new `PreCompact` key to hooks:

```json
"PreCompact": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/pre-compact.js\""
      }
    ]
  }
]
```

- [ ] **Step 4: Add SessionStart section**

```json
"SessionStart": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.js\""
      }
    ]
  }
]
```

- [ ] **Step 5: Add Stop section**

```json
"Stop": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-end.js\"",
        "timeout": 10
      }
    ]
  },
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/cost-tracker.js\"",
        "timeout": 10
      }
    ]
  }
]
```

- [ ] **Step 6: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('Valid JSON')"
```
Expected: `Valid JSON`

- [ ] **Step 7: Commit**

```bash
git add .claude/settings.json
git commit -m "feat(hooks): register all 9 new hooks in settings.json

PostToolUse: format, typecheck (async), console-warn, quality-gate
PreToolUse: suggest-compact
PreCompact: pre-compact
SessionStart: session-start
Stop: session-end, cost-tracker"
```

### Task 14: End-to-end verification

**Files:**
- Read: All `.claude/hooks/*.js`

- [ ] **Step 1: Verify all scripts load without errors**

```bash
# Mi2 fix: use absolute paths to avoid require resolution issues
for f in .claude/hooks/*.js; do echo -n "$f: "; node -e "require(require('path').resolve('$f')); console.log('OK')" 2>&1; done
```
Expected: All 9 scripts print `OK`.

- [ ] **Step 2: Verify settings.json is valid**

```bash
node -e "const s=JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'));const h=s.hooks;console.log('PreToolUse:',h.PreToolUse.length);console.log('PostToolUse:',h.PostToolUse.length);console.log('PreCompact:',h.PreCompact.length);console.log('SessionStart:',h.SessionStart.length);console.log('Stop:',h.Stop.length)"
```
Expected: PreToolUse: 10, PostToolUse: 5, PreCompact: 1, SessionStart: 1, Stop: 2

- [ ] **Step 3: Test session-end → session-start round-trip**

```bash
echo '{}' | node .claude/hooks/session-end.js
echo '{}' | node .claude/hooks/session-start.js 2>&1
```
Expected: session-start outputs previous session content and logs to stderr.

- [ ] **Step 4: Test cost-tracker**

```bash
echo '{"usage":{"input_tokens":1000,"output_tokens":500},"model":"claude-opus-4-6"}' | node .claude/hooks/cost-tracker.js
cat ~/.claude/metrics/costs.jsonl | tail -1
```
Expected: JSONL row with `estimated_cost_usd` > 0 and `model: "claude-opus-4-6"`.

- [ ] **Step 5: Final commit summary**

Verify all commits:
```bash
git log --oneline -10
```
Expected: ~8 commits covering utils, 4 Wave 1 hooks, 3 Wave 2 hooks, 2 Wave 3 hooks, settings.json update.
