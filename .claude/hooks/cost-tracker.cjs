#!/usr/bin/env node
/**
 * Stop Hook: Track token usage and estimated cost per session.
 * Appends JSONL rows to ~/.claude/metrics/costs.jsonl.
 */
'use strict';

const path = require('path');
const { getClaudeDir, ensureDir, appendFile, readStdin } = require('./lib/utils.cjs');

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
