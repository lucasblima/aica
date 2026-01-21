#!/usr/bin/env node
/**
 * Bulk migration script: Migrate all services to centralized logger
 *
 * This script:
 * 1. Finds all service files without logger import
 * 2. Adds logger import and initialization
 * 3. Replaces console.* calls with log.* calls
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const SERVICES_DIR = path.join(__dirname, '..', 'src', 'services');

// Service name mapping (filename -> namespace)
const serviceNames = {
  'aicaAutoService.ts': 'AicaAutoService',
  'aiCostAnalyticsService.ts': 'AICostAnalyticsService',
  'aiUsageTrackingService.ts': 'AIUsageTrackingService',
  'contactNetworkService.ts': 'ContactNetworkService',
  'contactSearchService.ts': 'ContactSearchService',
  'contactSyncService.ts': 'ContactSyncService',
  'dailyReportService.ts': 'DailyReportService',
  'edgeFunctionService.ts': 'EdgeFunctionService',
  'efficiencyService.ts': 'EfficiencyService',
  'feedbackLoopService.ts': 'FeedbackLoopService',
  'fileSearchApiClient.ts': 'FileSearchApiClient',
  'fileSearchCacheService.ts': 'FileSearchCacheService',
  'geminiMemoryService.ts': 'GeminiMemoryService',
  'googleCalendarTokenService.ts': 'GoogleCalendarTokenService',
  'googleContactsService.ts': 'GoogleContactsService',
  'guestApprovalService.ts': 'GuestApprovalService',
  'journeyService.ts': 'JourneyService',
  'journeyValidator.ts': 'JourneyValidator',
  'mediaUploadService.ts': 'MediaUploadService',
  'modelRouterService.ts': 'ModelRouterService',
  'notificationSchedulerService.ts': 'NotificationSchedulerService',
  'notificationService.ts': 'NotificationService',
  'onboardingService.ts': 'OnboardingService',
  'pairingCodeService.ts': 'PairingCodeService',
  'podcastProductionService.ts': 'PodcastProductionService',
  'pythonApiService.ts': 'PythonApiService',
  'rateLimiterService.ts': 'RateLimiterService',
  'recommendationEngine.ts': 'RecommendationEngine',
  'secureFileSearchService.ts': 'SecureFileSearchService',
  'supabaseService.ts': 'SupabaseService',
  'taskRecurrenceService.ts': 'TaskRecurrenceService',
  'unifiedChatService.ts': 'UnifiedChatService',
  'userSettingsService.ts': 'UserSettingsService',
  'whatsappAnalyticsService.ts': 'WhatsAppAnalyticsService',
  'whatsappConsentService.ts': 'WhatsAppConsentService',
  'whatsappContactSyncService.ts': 'WhatsAppContactSyncService',
};

function migrateService(filePath, serviceName) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already migrated
  if (content.includes('createNamespacedLogger')) {
    console.log(`SKIP: ${path.basename(filePath)} (already migrated)`);
    return false;
  }

  // Skip if no console statements
  if (!content.match(/console\.(log|error|warn|info|debug)/)) {
    console.log(`SKIP: ${path.basename(filePath)} (no console statements)`);
    return false;
  }

  console.log(`Migrating: ${path.basename(filePath)} -> ${serviceName}`);

  // Step 1: Add logger import after first import block
  const lines = content.split('\n');
  let insertIndex = 0;
  let inImportBlock = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      inImportBlock = true;
    } else if (inImportBlock && lines[i].trim() === '') {
      insertIndex = i;
      break;
    }
  }

  if (insertIndex === 0) {
    // No imports found, add at top
    insertIndex = 0;
  }

  const loggerImport = `import { createNamespacedLogger } from '@/lib/logger';\n\nconst log = createNamespacedLogger('${serviceName}');\n`;
  lines.splice(insertIndex, 0, loggerImport);
  content = lines.join('\n');

  // Step 2: Replace console statements
  // console.log -> log.debug
  content = content.replace(/console\.log\(/g, 'log.debug(');

  // console.error(..., error) -> log.error(..., { error })
  content = content.replace(/console\.error\(([^,]+),\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g, 'log.error($1, { error: $2 })');
  content = content.replace(/console\.error\(/g, 'log.error(');

  // console.warn -> log.warn
  content = content.replace(/console\.warn\(/g, 'log.warn(');

  // console.info -> log.info
  content = content.replace(/console\.info\(/g, 'log.info(');

  // console.debug -> log.debug
  content = content.replace(/console\.debug\(/g, 'log.debug(');

  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

// Main execution
let migratedCount = 0;
const files = fs.readdirSync(SERVICES_DIR);

files.forEach(file => {
  if (!file.endsWith('.ts') || file.endsWith('.test.ts') || file.endsWith('.OLD')) {
    return;
  }

  if (!serviceNames[file]) {
    return; // Skip services not in our list (already migrated or not needed)
  }

  const filePath = path.join(SERVICES_DIR, file);
  if (migrateService(filePath, serviceNames[file])) {
    migratedCount++;
  }
});

console.log(`\n✓ Migrated ${migratedCount} services to centralized logger`);
console.log('\nRun `npm run typecheck` to verify');
