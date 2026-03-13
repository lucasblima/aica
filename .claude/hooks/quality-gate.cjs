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

    // Async ESLint for JS/TS files
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
