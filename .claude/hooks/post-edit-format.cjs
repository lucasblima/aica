#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format JS/TS files after edits using ESLint --fix.
 * Falls back silently if ESLint is not available.
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readStdin, findProjectRoot, log } = require('./lib/utils.cjs');

const UNSAFE_PATH_CHARS = /[&|<>^%!]/;

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
