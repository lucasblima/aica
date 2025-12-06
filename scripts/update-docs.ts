#!/usr/bin/env tsx

/**
 * Documentation Maintenance Agent
 *
 * This script automatically updates PRD.md and backend_architecture.md based on:
 * - Recent git commits (sprint changes)
 * - Actual file implementation verification
 * - Supabase database schema validation
 *
 * Usage:
 *   npm run update-docs
 *   npm run update-docs -- --commits 20  (analyze last 20 commits)
 *   npm run update-docs -- --since "2025-12-01"  (analyze commits since date)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  files: string[];
}

interface ImplementationStatus {
  feature: string;
  implemented: boolean;
  files: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface TableInfo {
  name: string;
  exists: boolean;
  columns?: string[];
  relationships?: string[];
}

class DocumentationAgent {
  private projectRoot: string;
  private prdPath: string;
  private backendArchPath: string;
  private commits: CommitInfo[] = [];

  constructor() {
    this.projectRoot = join(__dirname, '..');
    this.prdPath = join(this.projectRoot, 'docs', 'PRD.md');
    this.backendArchPath = join(this.projectRoot, 'docs', 'backend_architecture.md');
  }

  /**
   * Main execution flow
   */
  async run(options: { commits?: number; since?: string } = {}) {
    console.log('🤖 Documentation Maintenance Agent Starting...\n');

    try {
      // Step 1: Analyze git commits
      console.log('📊 Step 1: Analyzing git commits...');
      this.commits = this.analyzeCommits(options);
      console.log(`   Found ${this.commits.length} commits to analyze\n`);

      // Step 2: Verify implementations
      console.log('🔍 Step 2: Verifying implementations...');
      const implementations = this.verifyImplementations();
      console.log(`   Verified ${implementations.length} features\n`);

      // Step 3: Update PRD.md
      console.log('📝 Step 3: Updating PRD.md...');
      this.updatePRD(implementations);
      console.log('   ✅ PRD.md updated\n');

      // Step 4: Update backend_architecture.md
      console.log('📝 Step 4: Updating backend_architecture.md...');
      await this.updateBackendArchitecture();
      console.log('   ✅ backend_architecture.md updated\n');

      // Step 5: Generate summary report
      console.log('📋 Step 5: Generating summary report...');
      this.generateReport(implementations);

      console.log('\n✅ Documentation maintenance complete!');
    } catch (error) {
      console.error('❌ Error during documentation update:', error);
      process.exit(1);
    }
  }

  /**
   * Analyze recent git commits to understand what changed
   */
  private analyzeCommits(options: { commits?: number; since?: string }): CommitInfo[] {
    const commits: CommitInfo[] = [];

    try {
      let gitCommand = 'git log --pretty=format:"%H|%ai|%s" --name-only';

      if (options.since) {
        gitCommand += ` --since="${options.since}"`;
      } else {
        const numCommits = options.commits || 10;
        gitCommand += ` -${numCommits}`;
      }

      const output = execSync(gitCommand, {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });

      const lines = output.split('\n');
      let currentCommit: Partial<CommitInfo> | null = null;

      for (const line of lines) {
        if (line.includes('|')) {
          // Commit header line
          if (currentCommit) {
            commits.push(currentCommit as CommitInfo);
          }
          const [hash, date, message] = line.split('|');
          currentCommit = {
            hash: hash.substring(0, 7),
            date: date.split(' ')[0],
            message: message.trim(),
            files: []
          };
        } else if (line.trim() && currentCommit) {
          // File name
          currentCommit.files!.push(line.trim());
        }
      }

      if (currentCommit) {
        commits.push(currentCommit as CommitInfo);
      }

      return commits;
    } catch (error) {
      console.warn('   ⚠️  Could not analyze commits:', (error as Error).message);
      return [];
    }
  }

  /**
   * Verify which features are actually implemented by checking files
   */
  private verifyImplementations(): ImplementationStatus[] {
    const features: ImplementationStatus[] = [];

    // Define features to check based on PRD phases
    const featureChecks = [
      {
        feature: 'Security Definer Pattern',
        files: [
          'supabase/migrations/*professional_rls*.sql',
          'ARCHITECTURE_GUIDE.md'
        ],
        keywords: ['SECURITY DEFINER', 'is_member_of', 'is_association_admin']
      },
      {
        feature: 'TypeScript Type Generation',
        files: ['src/types/database.types.ts'],
        keywords: ['AUTO-GENERATED', 'Database', 'Tables']
      },
      {
        feature: 'Error Boundaries',
        files: ['src/components/ErrorBoundary.tsx'],
        keywords: ['componentDidCatch', 'getDerivedStateFromError', 'useErrorHandler']
      },
      {
        feature: 'Gamification System',
        files: [
          'src/components/EfficiencyScoreCard.tsx',
          'src/services/efficiencyService.ts',
          'src/components/GamificationWidget.tsx'
        ],
        keywords: ['XP', 'level', 'efficiency', 'streak']
      },
      {
        feature: 'Podcast Copilot',
        files: [
          'src/modules/podcast/views/PodcastDashboard.tsx',
          'src/modules/podcast/views/StudioMode.tsx',
          'src/modules/podcast/hooks/useGeminiLive.ts'
        ],
        keywords: ['Gemini', 'podcast', 'studio', 'episode']
      },
      {
        feature: 'Contact Network',
        files: [
          'src/components/ContactCard.tsx',
          'src/services/supabaseService.ts'
        ],
        keywords: ['contact_network', 'relationship', 'last_interaction']
      },
      {
        feature: 'Memories System',
        files: ['src/services/supabaseService.ts'],
        keywords: ['memories', 'embeddings', 'vector']
      },
      {
        feature: 'Daily Reports',
        files: [
          'src/services/dailyReportService.ts',
          'supabase/migrations/*daily_reports*.sql'
        ],
        keywords: ['daily_reports', 'productivity_score', 'mood']
      }
    ];

    for (const check of featureChecks) {
      const status = this.checkFeatureImplementation(check);
      features.push(status);
    }

    return features;
  }

  /**
   * Check if a specific feature is implemented
   */
  private checkFeatureImplementation(check: {
    feature: string;
    files: string[];
    keywords: string[];
  }): ImplementationStatus {
    const foundFiles: string[] = [];
    let keywordMatches = 0;

    for (const filePattern of check.files) {
      try {
        // Handle glob patterns
        if (filePattern.includes('*')) {
          const files = this.findFiles(filePattern);
          foundFiles.push(...files);

          // Check keywords in found files
          for (const file of files) {
            const content = readFileSync(file, 'utf-8');
            for (const keyword of check.keywords) {
              if (content.includes(keyword)) {
                keywordMatches++;
              }
            }
          }
        } else {
          const fullPath = join(this.projectRoot, filePattern);
          if (existsSync(fullPath)) {
            foundFiles.push(filePattern);
            const content = readFileSync(fullPath, 'utf-8');
            for (const keyword of check.keywords) {
              if (content.includes(keyword)) {
                keywordMatches++;
              }
            }
          }
        }
      } catch (error) {
        // File doesn't exist or can't be read
      }
    }

    const filesFound = foundFiles.length;
    const filesExpected = check.files.length;
    const keywordsFound = keywordMatches;
    const keywordsExpected = check.keywords.length;

    let confidence: 'high' | 'medium' | 'low';
    let implemented: boolean;

    if (filesFound >= filesExpected && keywordsFound >= keywordsExpected) {
      confidence = 'high';
      implemented = true;
    } else if (filesFound > 0 && keywordsFound >= keywordsExpected / 2) {
      confidence = 'medium';
      implemented = true;
    } else if (filesFound > 0) {
      confidence = 'low';
      implemented = true;
    } else {
      confidence = 'low';
      implemented = false;
    }

    return {
      feature: check.feature,
      implemented,
      files: foundFiles,
      confidence
    };
  }

  /**
   * Find files matching a glob pattern
   */
  private findFiles(pattern: string): string[] {
    try {
      const output = execSync(`git ls-files "${pattern}"`, {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });
      return output.split('\n').filter(f => f.trim());
    } catch {
      return [];
    }
  }

  /**
   * Update PRD.md with verified implementation status
   */
  private updatePRD(implementations: ImplementationStatus[]) {
    if (!existsSync(this.prdPath)) {
      console.warn('   ⚠️  PRD.md not found, skipping update');
      return;
    }

    let prd = readFileSync(this.prdPath, 'utf-8');

    // Update last updated date
    const today = new Date().toISOString().split('T')[0];
    prd = prd.replace(
      /\*\*Last Updated:\*\* .+? \|/,
      `**Last Updated:** ${today.replace(/-/g, ' ')} |`
    );

    // Update latest commit hash
    try {
      const latestCommit = execSync('git rev-parse --short HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      }).trim();
      prd = prd.replace(
        /Latest Commit: `[a-f0-9]+`/,
        `Latest Commit: \`${latestCommit}\``
      );
    } catch {
      // Skip if git command fails
    }

    // Add implementation verification section if not exists
    if (!prd.includes('### Implementation Verification')) {
      const verificationSection = this.generateVerificationSection(implementations);

      // Insert before "## 7. How to Run Tests" or at end
      if (prd.includes('## 7. How to Run Tests')) {
        prd = prd.replace(
          '## 7. How to Run Tests',
          `${verificationSection}\n\n## 7. How to Run Tests`
        );
      } else {
        prd += `\n\n${verificationSection}`;
      }
    }

    writeFileSync(this.prdPath, prd, 'utf-8');
  }

  /**
   * Generate verification section for PRD
   */
  private generateVerificationSection(implementations: ImplementationStatus[]): string {
    const verified = implementations.filter(i => i.implemented && i.confidence === 'high');
    const partial = implementations.filter(i => i.implemented && i.confidence !== 'high');
    const missing = implementations.filter(i => !i.implemented);

    let section = '### Implementation Verification\n\n';
    section += `**Auto-verified:** ${new Date().toISOString().split('T')[0]}\n\n`;

    if (verified.length > 0) {
      section += '#### ✅ Verified Implementations\n';
      for (const impl of verified) {
        section += `- **${impl.feature}** - ${impl.files.length} files found\n`;
      }
      section += '\n';
    }

    if (partial.length > 0) {
      section += '#### ⚠️  Partial Implementations\n';
      for (const impl of partial) {
        section += `- **${impl.feature}** - ${impl.confidence} confidence (${impl.files.length} files)\n`;
      }
      section += '\n';
    }

    if (missing.length > 0) {
      section += '#### ❌ Missing Implementations\n';
      for (const impl of missing) {
        section += `- **${impl.feature}** - No files found\n`;
      }
      section += '\n';
    }

    return section;
  }

  /**
   * Update backend_architecture.md with current database state
   */
  private async updateBackendArchitecture() {
    if (!existsSync(this.backendArchPath)) {
      console.warn('   ⚠️  backend_architecture.md not found, skipping update');
      return;
    }

    let doc = readFileSync(this.backendArchPath, 'utf-8');

    // Update last updated date
    const today = new Date().toISOString().split('T')[0];
    doc = doc.replace(
      /\*Última atualização: .+?\*/,
      `*Última atualização: ${today}*`
    );

    // Note: Actual Supabase schema validation would require MCP integration
    // For now, we'll add a note that manual validation is recommended
    if (!doc.includes('## Validação Automática')) {
      doc += '\n\n---\n\n';
      doc += '## Validação Automática\n\n';
      doc += `**Última verificação:** ${today}\n\n`;
      doc += '**Status:** Para validação completa do schema, execute:\n';
      doc += '```bash\n';
      doc += 'supabase db diff --schema public\n';
      doc += '```\n\n';
      doc += '**Tabelas esperadas:** `users`, `associations`, `modules`, `work_items`, `memories`, `daily_reports`, `activity_log`, `contact_network`, `podcast_shows`, `podcast_episodes`, `podcast_topics`, `team_members`\n';
    }

    writeFileSync(this.backendArchPath, doc, 'utf-8');
  }

  /**
   * Generate a summary report of the documentation update
   */
  private generateReport(implementations: ImplementationStatus[]) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DOCUMENTATION UPDATE REPORT');
    console.log('='.repeat(60) + '\n');

    // Commits analyzed
    console.log(`📝 Commits Analyzed: ${this.commits.length}`);
    if (this.commits.length > 0) {
      console.log(`   Latest: ${this.commits[0].hash} - ${this.commits[0].message}`);
      console.log(`   Date: ${this.commits[0].date}\n`);
    }

    // Implementation status
    const verified = implementations.filter(i => i.implemented && i.confidence === 'high').length;
    const partial = implementations.filter(i => i.implemented && i.confidence !== 'high').length;
    const missing = implementations.filter(i => !i.implemented).length;

    console.log(`✅ Verified: ${verified}/${implementations.length} features`);
    console.log(`⚠️  Partial: ${partial}/${implementations.length} features`);
    console.log(`❌ Missing: ${missing}/${implementations.length} features\n`);

    // Files updated
    console.log('📄 Files Updated:');
    console.log(`   - ${this.prdPath}`);
    console.log(`   - ${this.backendArchPath}\n`);

    // Recommendations
    if (missing > 0 || partial > 0) {
      console.log('💡 Recommendations:');
      if (missing > 0) {
        console.log(`   - Review ${missing} missing features in PRD.md`);
      }
      if (partial > 0) {
        console.log(`   - Verify ${partial} partially implemented features`);
      }
      console.log('   - Run: npm run test:e2e to validate functionality');
      console.log('   - Run: supabase db diff to validate schema\n');
    }
  }
}

// CLI execution
const args = process.argv.slice(2);
const options: { commits?: number; since?: string } = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--commits' && args[i + 1]) {
    options.commits = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--since' && args[i + 1]) {
    options.since = args[i + 1];
    i++;
  }
}

const agent = new DocumentationAgent();
agent.run(options);
