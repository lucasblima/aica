#!/usr/bin/env node
/**
 * Logger Migration Script - Connections Module
 *
 * Migrates all console statements in the Connections module to use the centralized logger.
 * Excludes: .stories.tsx, .example.tsx, .examples.tsx, .test.ts, EXAMPLES.tsx, *.md files
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Namespace mapping based on file type
const getNamespace = (filePath) => {
  const filename = path.basename(filePath, path.extname(filePath));

  // Services
  if (filePath.includes('/services/')) {
    const base = filename.replace(/Service$/, '');
    return base.charAt(0).toUpperCase() + base.slice(1) + 'Service';
  }

  // Hooks
  if (filePath.includes('/hooks/')) {
    return filename; // keep as-is (e.g., useSpace)
  }

  // Components
  if (filePath.includes('/components/')) {
    return filename;
  }

  // Views
  if (filePath.includes('/views/')) {
    return filename;
  }

  // Default
  return filename;
};

// Check if file should be excluded
const shouldExclude = (filePath) => {
  const excludePatterns = [
    '.stories.tsx',
    '.example.tsx',
    '.examples.tsx',
    '.test.ts',
    'EXAMPLES.tsx',
    '.md',
    'connectionSpaceService.ts' // This file only has console in comments
  ];

  return excludePatterns.some(pattern => filePath.includes(pattern));
};

// Check if file already has logger import
const hasLoggerImport = (content) => {
  return content.includes('createNamespacedLogger');
};

// Add logger import to file
const addLoggerImport = (content, namespace) => {
  const lines = content.split('\n');

  // Find the last import statement
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  // Insert after last import or at the beginning
  const insertIndex = lastImportIndex + 1;
  const loggerImport = `import { createNamespacedLogger } from '@/lib/logger';`;
  const loggerInit = `\nconst log = createNamespacedLogger('${namespace}');`;

  lines.splice(insertIndex, 0, loggerImport + loggerInit);

  return lines.join('\n');
};

// Replace console statements with logger
const replaceConsoleStatements = (content) => {
  let updated = content;

  // Replace console.log -> log.debug
  updated = updated.replace(/(\s+)console\.log\(/g, '$1log.debug(');

  // Replace console.error -> log.error
  updated = updated.replace(/(\s+)console\.error\(/g, '$1log.error(');

  // Replace console.warn -> log.warn
  updated = updated.replace(/(\s+)console\.warn\(/g, '$1log.warn(');

  // Replace console.info -> log.info
  updated = updated.replace(/(\s+)console\.info\(/g, '$1log.info(');

  return updated;
};

// Process a single file
const processFile = (filePath) => {
  if (shouldExclude(filePath)) {
    return 'skipped';
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if file has console statements (excluding comments and JSDoc)
    const hasConsole = /^\s*console\.(log|error|warn|info)\(/m.test(content);

    if (!hasConsole) {
      return 'no-console';
    }

    // Add logger import if not present
    if (!hasLoggerImport(content)) {
      const namespace = getNamespace(filePath);
      content = addLoggerImport(content, namespace);
    }

    // Replace console statements
    content = replaceConsoleStatements(content);

    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath}`);
    return 'migrated';

  } catch (error) {
    console.error(`❌ ${filePath}: ${error.message}`);
    return 'error';
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Starting logger migration for Connections module...\n');

  const patterns = [
    'src/modules/connections/**/*.ts',
    'src/modules/connections/**/*.tsx'
  ];

  const files = await glob(patterns, {
    ignore: [
      '**/*.stories.tsx',
      '**/*.example.tsx',
      '**/*.examples.tsx',
      '**/*.test.ts',
      '**/EXAMPLES.tsx'
    ]
  });

  console.log(`📁 Found ${files.length} files to check\n`);

  const results = {
    migrated: 0,
    skipped: 0,
    noConsole: 0,
    error: 0
  };

  for (const file of files) {
    const result = processFile(file);
    if (result === 'migrated') results.migrated++;
    else if (result === 'skipped') results.skipped++;
    else if (result === 'no-console') results.noConsole++;
    else if (result === 'error') results.error++;
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${results.migrated} files`);
  console.log(`   ⏭️  Skipped: ${results.skipped} files`);
  console.log(`   ℹ️  No console: ${results.noConsole} files`);
  console.log(`   ❌ Errors: ${results.error} files`);
  console.log(`   📁 Total checked: ${files.length} files`);

  console.log('\n✨ Migration complete!');

  process.exit(results.error > 0 ? 1 : 0);
};

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
