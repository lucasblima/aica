#!/usr/bin/env node
/**
 * PostToolUse Hook: Knowledge nudges after editing .ts/.tsx files.
 * Detects common patterns and provides micro-lessons inline (1-2 lines).
 * Non-blocking — outputs to stderr. Max 1 nudge per file.
 */
'use strict';

const { readStdin, log } = require('./lib/utils.cjs');

const NUDGES = [
  {
    pattern: /:\s*any\b/,
    message: '💡 `any` detectado — defina o tipo esperado (ex: `Record<string, unknown>` ou interface). `any` desliga o TypeScript nessa variavel.'
  },
  {
    pattern: /supabase\.from\(/,
    guard: /\{\s*data\s*,\s*error\s*\}/,
    message: '💡 Sempre desestruture `{ data, error }` em queries Supabase — erros silenciosos causam bugs dificeis de rastrear.'
  },
  {
    pattern: /console\.log\(/,
    skipPath: /(__tests__|\.test\.|\.spec\.|test\/)/,
    message: '💡 console.log em production code — remover ou trocar por logger estruturado antes do deploy.'
  },
  {
    pattern: /\bfetch\(/,
    guard: /try\s*\{/,
    message: '💡 fetch() pode falhar (rede, timeout, CORS) — envolva em try/catch com error handling.'
  },
  {
    pattern: /VITE_.*(?:KEY|SECRET|TOKEN)/i,
    message: '💡 Chave de API no frontend? Use Edge Function — VITE_ vars ficam expostas no bundle do browser.'
  }
];

function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const filePath = input.tool_input?.file_path;

    if (!filePath || !/\.(ts|tsx)$/.test(filePath)) return;

    const newString = input.tool_input?.new_string;
    if (!newString) return;

    for (const nudge of NUDGES) {
      // Skip if path matches skipPath
      if (nudge.skipPath && nudge.skipPath.test(filePath)) continue;

      if (nudge.pattern.test(newString)) {
        // If there's a guard pattern, only nudge when guard is NOT present
        if (nudge.guard && nudge.guard.test(newString)) continue;

        log(`\n${nudge.message}\n`);
        return; // Max 1 nudge per edit
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
