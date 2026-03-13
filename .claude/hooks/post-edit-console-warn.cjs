#!/usr/bin/env node
/**
 * PostToolUse Hook: Warn about console.log statements after edits.
 * Reports line numbers to help remove debug statements before committing.
 */
'use strict';

const fs = require('fs');
const { readStdin, log } = require('./lib/utils.cjs');

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
