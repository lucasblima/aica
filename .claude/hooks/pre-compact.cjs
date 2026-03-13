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
} = require('./lib/utils.cjs');

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
