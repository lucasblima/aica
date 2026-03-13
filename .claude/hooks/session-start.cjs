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
} = require('./lib/utils.cjs');

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
    // SessionStart hooks inject context via stdout.
    // Do NOT echo stdin back — only output() calls above matter.
    run();
    process.exit(0);
  });
}

module.exports = { run };
