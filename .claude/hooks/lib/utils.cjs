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
  // Project-scoped sessions when CLAUDE_PROJECT_DIR is available
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    const safeName = path.basename(projectDir).replace(/[^a-zA-Z0-9_-]/g, '-');
    const projectSessions = path.join(getClaudeDir(), 'projects', safeName, 'sessions');
    ensureDir(projectSessions);
    return projectSessions;
  }
  // Fallback to global
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
