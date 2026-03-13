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
} = require('./lib/utils.cjs');

const SUMMARY_START = '<!-- AICA:SUMMARY:START -->';
const SUMMARY_END = '<!-- AICA:SUMMARY:END -->';
const SEPARATOR = '\n---\n';

function extractSummary(transcriptPath) {
  const content = readFile(transcriptPath);
  if (!content) return null;

  // Transcript format is undocumented and may change.
  // Gracefully handle unexpected structures — skip unparseable lines.
  const lines = content.split('\n').filter(Boolean);
  const userMessages = [];
  const toolsUsed = new Set();
  const filesModified = new Set();

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      const rawContent = entry.message?.content ?? entry.content;
      if ((entry.type === 'user' || entry.role === 'user' || entry.message?.role === 'user') && rawContent) {
        const text = typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent.map(c => (c && c.text) || '').join(' ')
            : '';
        if (text.trim()) userMessages.push(text.trim().slice(0, 200));
      }

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
    updated = updated.replace(/\*\*Last Updated:\*\*.*\r?$/m, `**Last Updated:** ${currentTime}`);

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
    // Stop hooks: no stdout echo needed (no downstream consumer)
    process.exit(0);
  });
}

module.exports = { run };
