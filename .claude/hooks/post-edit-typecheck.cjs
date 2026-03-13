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
const { readStdin, log } = require('./lib/utils.cjs');

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

      setTimeout(() => { try { child.kill(); } catch {} }, 30000);
    }
  } catch {
    // Invalid input — pass through
  }
}

if (require.main === module) {
  readStdin(data => {
    run(data);
    process.stdout.write(data);
  });
}

module.exports = { run };
