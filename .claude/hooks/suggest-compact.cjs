#!/usr/bin/env node
/**
 * PreToolUse Hook: Suggest /compact at strategic intervals.
 * Tracks tool call count per session, suggests compaction at threshold.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { getTempDir, readStdin, log } = require('./lib/utils.cjs');

function run(rawInput) {
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

  // Read current count
  try {
    const raw = fs.readFileSync(counterFile, 'utf8').trim();
    const parsed = parseInt(raw, 10);
    count = (Number.isFinite(parsed) && parsed > 0 && parsed <= 1000000)
      ? parsed + 1
      : 1;
  } catch {
    // File doesn't exist yet — start at 1
  }

  // Write updated count
  try {
    fs.writeFileSync(counterFile, String(count), 'utf8');
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
