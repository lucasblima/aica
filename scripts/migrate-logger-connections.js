#!/usr/bin/env node
/**
 * Logger Migration Script - Connections Module
 *
 * Migrates all console statements in the Connections module to use the centralized logger.
 * Excludes: .stories.tsx, .example.tsx, .examples.tsx, .test.ts, EXAMPLES.tsx, *.md files
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Namespace mapping based on file type
const getNamespace = (filePath) => {
  const filename = path.basename(filePath, path.extname(filePath));

  // Services
  if (filePath.includes('/services/')) {
    return filename.split(/Service|service/)[0] + 'Service';
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
    '.md'
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
  updated = updated.replace(/console\.log\(/g, 'log.debug(');

  // Replace console.error -> log.error
  updated = updated.replace(/console\.error\(/g, 'log.error(');

  // Replace console.warn -> log.warn
  updated = updated.replace(/console\.warn\(/g, 'log.warn(');

  // Replace console.info -> log.info
  updated = updated.replace(/console\.info\(/g, 'log.info(');

  return updated;
};

// Process a single file
const processFile = (filePath) => {
  if (shouldExclude(filePath)) {
    console.log(`⏭️  Skipped: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if file has console statements (excluding comments)
    const hasConsole = /^\s*(console\.(log|error|warn|info)\()/m.test(content);

    if (!hasConsole) {
      console.log(`✓ No console statements: ${filePath}`);
      return false;
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
    console.log(`✅ Migrated: ${filePath}`);
    return true;

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
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

  console.log(`Found ${files.length} files to check\n`);

  let migrated = 0;
  let skipped = 0;
  let noChanges = 0;

  for (const file of files) {
    const result = processFile(file);
    if (result === true) migrated++;
    else if (result === false && shouldExclude(file)) skipped++;
    else noChanges++;
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated} files`);
  console.log(`   ⏭️  Skipped: ${skipped} files`);
  console.log(`   ℹ️  No changes: ${noChanges} files`);
  console.log(`   📁 Total: ${files.length} files`);

  console.log('\n✨ Migration complete!');
};

main().catch(console.error);
