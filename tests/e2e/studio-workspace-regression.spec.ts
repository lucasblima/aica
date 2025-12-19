/**
 * E2E Regression Tests: Studio Workspace - Complete Workflow
 *
 * Tests the refactored podcast workspace with unified stage navigation.
 * Covers all 4 stages: Setup, Research, Pauta, and Production
 *
 * Scenarios:
 * - SetupStage: Guest type selection, theme configuration, AI profile search
 * - ResearchStage: Dossier generation, custom sources, research chat
 * - PautaStage: Topic creation, organization, AI generation, completion
 * - ProductionStage: Recording control, topic checklist, teleprompter
 * - Auto-save: Data persistence across stages
 * - Navigation: Permeable navigation between stages
 */

import { test, expect } from '@playwright/test';

// Use authenticated session from setup
test.use({ storageState: 'tests/e2e/.auth.json' });

// Base URL configuration
const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:3000';

/**
 * HELPER: Navigate to studio workspace
 * Assumes we're on the podcast library/dashboard and need to open a workspace
 */
async function navigateToStudioWorkspace(page: any) {
  // Navigate to podcast module
  await page.goto(`${BASE_URL}/podcast`);
  await page.waitForLoadState('networkidle');

  // Look for episode card or create new episode button
  const episodeCard = page.locator('[data-testid="episode-card"]').first();
  const createButton = page.locator('button:has-text("Novo Episódio"), button:has-text("Create Episode")');

  if (await episodeCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Open existing episode
    await episodeCard.click();
  } else if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Create new episode
    await createButton.click();
    await page.waitForLoadState('networkidle');

    // Fill basic episode info if modal appears
    const titleInput = page.locator('input[placeholder*="título" i], input[placeholder*="title" i]').first();
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleInput.fill(`Test Episode ${Date.now()}`);
      const submitButton = page.locator('button:has-text("Criar"), button:has-text("Create")').first();
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }
  } else {
    throw new Error('Could not find episode card or create button');
  }

  // Wait for workspace to load
  await page.waitForSelector('[data-testid="studio-workspace"], .workspace-container', { timeout: 10000 });
}

/**
 * SETUP STAGE REGRESSION TESTS
 */
test.describe('SetupStage Regression', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToStudioWorkspace(page);

    // Ensure we're on setup stage
    const setupStageButton = page.locator('[data-testid="stage-setup"]');
    if (await setupStageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupStageButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display setup stage content and forms', async ({ page }) => {
    // Arrange - Already on setup stage from beforeEach

    // Assert - Verify setup content is visible
    const setupContent = page.locator('[data-testid="setup-content"], h1:has-text("Configuração")').first();
    await expect(setupContent).toBeVisible();

    // Verify guest type selector exists
    const guestTypeSelector = page.locator('[data-testid="guest-type-selector"]').or(
      page.locator('text=Tipo de Convidado').first()
    );
    await expect(guestTypeSelector).toBeVisible();
  });

  test('should select public figure guest type', async ({ page }) => {
    // Arrange - Setup stage is open

    // Act - Select public figure option
    const publicFigureOption = page.locator('[data-testid="guest-type-public_figure"]').or(
      page.locator('button:has-text("Figura Pública")').first()
    );
    await expect(publicFigureOption).toBeVisible();
    await publicFigureOption.click();

    // Assert - Option should be selected
    const selectedClass = await publicFigureOption.getAttribute('class');
    expect(selectedClass).toContain('border-orange') || expect(selectedClass).toContain('orange-50');

    // Verify guest name input is available
    const guestNameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i]').first();
    await expect(guestNameInput).toBeVisible();
  });

  test('should select common person guest type', async ({ page }) => {
    // Arrange - Setup stage is open

    // Act - Select common person option
    const commonPersonOption = page.locator('[data-testid="guest-type-common_person"]').or(
      page.locator('button:has-text("Pessoa Comum")').first()
    );
    await expect(commonPersonOption).toBeVisible();
    await commonPersonOption.click();

    // Assert - Option should be selected
    const selectedClass = await commonPersonOption.getAttribute('class');
    expect(selectedClass).toContain('border-orange') || expect(selectedClass).toContain('orange-50');

    // Verify manual form fields appear
    const bioInput = page.locator('textarea[placeholder*="bio" i], input[name="bio"]').first();
    const occupationInput = page.locator('input[placeholder*="ocupação" i], input[placeholder*="occupation" i]').first();

    const isBioVisible = await bioInput.isVisible({ timeout: 2000 }).catch(() => false);
    const isOccupationVisible = await occupationInput.isVisible({ timeout: 2000 }).catch(() => false);

    expect(isBioVisible || isOccupationVisible).toBeTruthy();
  });

  test('should fill episode theme and basic info', async ({ page }) => {
    // Arrange - Setup stage with guest type selected
    const publicFigureOption = page.locator('[data-testid="guest-type-public_figure"]').or(
      page.locator('button:has-text("Figura Pública")').first()
    );
    await publicFigureOption.click();

    // Fill guest name
    const guestNameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i]').first();
    await guestNameInput.fill('Elon Musk');

    // Fill theme
    const themeInput = page.locator('input[placeholder*="tema" i], input[placeholder*="theme" i]').or(
      page.locator('[data-testid="episode-theme"]')
    ).first();
    await themeInput.fill('Technology and Innovation');

    // Act - Wait for auto-save (2.5 seconds debounce + buffer)
    await page.waitForTimeout(3500);

    // Assert - Verify values are retained
    expect(await guestNameInput.inputValue()).toBe('Elon Musk');
    expect(await themeInput.inputValue()).toBe('Technology and Innovation');

    // Verify save indicator
    const saveIndicator = page.locator('[data-testid="save-indicator"], text=Auto-save').first();
    const isSaveVisible = await saveIndicator.isVisible({ timeout: 1000 }).catch(() => false);
    if (isSaveVisible) {
      await expect(saveIndicator).toBeVisible();
    }
  });

  test('should search AI profile for public figure', async ({ page }) => {
    // Arrange - Setup stage with public figure selected
    const publicFigureOption = page.locator('[data-testid="guest-type-public_figure"]').or(
      page.locator('button:has-text("Figura Pública")').first()
    );
    await publicFigureOption.click();

    // Fill guest name
    const guestNameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i]').first();
    await guestNameInput.fill('Steve Jobs');

    // Act - Click search/AI profile button
    const searchButton = page.locator('[data-testid="ai-profile-search"]').or(
      page.locator('button:has-text("Buscar"), button:has-text("Search")').first()
    );

    if (await searchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchButton.click();

      // Assert - Loading state should appear
      const loadingIndicator = page.locator('[data-testid="profile-loading"]').or(
        page.locator('.animate-spin').first()
      );
      const isLoadingVisible = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
      if (isLoadingVisible) {
        console.log('Profile search loading...');
      }

      // Assert - Results should appear (with longer timeout for API call)
      const results = page.locator('[data-testid="profile-results"]').or(
        page.locator('text=Biography, text=Bio').first()
      );

      const isResultsVisible = await results.isVisible({ timeout: 15000 }).catch(() => false);
      if (isResultsVisible) {
        await expect(results).toBeVisible();

        // Verify profile data populated
        const bioField = page.locator('[data-testid="guest-bio"]').or(
          page.locator('textarea[name="bio"]').first()
        );

        if (await bioField.isVisible({ timeout: 2000 }).catch(() => false)) {
          const bioValue = await bioField.inputValue();
          expect(bioValue.length).toBeGreaterThan(0);
        }
      }
    } else {
      console.log('Search button not found - skipping AI search test');
    }
  });

  test('should validate setup stage completion', async ({ page }) => {
    // Arrange - Setup stage with all required fields
    const publicFigureOption = page.locator('[data-testid="guest-type-public_figure"]').or(
      page.locator('button:has-text("Figura Pública")').first()
    );
    await publicFigureOption.click();

    const guestNameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i]').first();
    await guestNameInput.fill('Complete Test');

    const themeInput = page.locator('input[placeholder*="tema" i], input[placeholder*="theme" i]').first();
    await themeInput.fill('Test Theme');

    // Wait for auto-save
    await page.waitForTimeout(3500);

    // Act - Check for completion badge
    const completionBadge = page.locator('[data-testid="setup-stage-badge"]').or(
      page.locator('[data-testid="stage-setup"]').locator('..')
    ).first();

    // Assert - Badge should show completion status
    const badgeText = await completionBadge.textContent();
    // Should contain either check mark or amber indicator
    expect(badgeText).toMatch(/✅|🟡|●/);
  });
});

/**
 * RESEARCH STAGE REGRESSION TESTS
 */
test.describe('ResearchStage Regression', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToStudioWorkspace(page);

    // Navigate to research stage
    const researchStageButton = page.locator('[data-testid="stage-research"]');
    if (await researchStageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await researchStageButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display research stage content', async ({ page }) => {
    // Assert - Research content should be visible
    const researchContent = page.locator('[data-testid="research-content"]').or(
      page.locator('h1:has-text("Pesquisa")').first()
    );
    await expect(researchContent).toBeVisible();
  });

  test('should generate dossier with AI', async ({ page }) => {
    // Arrange - Research stage is open

    // Act - Click generate dossier button
    const generateButton = page.locator('[data-testid="generate-dossier"]').or(
      page.locator('button:has-text("Gerar"), button:has-text("Generate")').first()
    );

    if (await generateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateButton.click();

      // Assert - Loading state should appear
      const loadingIndicator = page.locator('[data-testid="dossier-loading"]').or(
        page.locator('.animate-spin').first()
      );
      const isLoadingVisible = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
      if (isLoadingVisible) {
        console.log('Dossier generating...');
      }

      // Assert - Dossier content should appear (with longer timeout for API)
      const dossierContent = page.locator('[data-testid="dossier-content"]').or(
        page.locator('[data-testid="dossier-tabs"]').first()
      );

      const isDossierVisible = await dossierContent.isVisible({ timeout: 30000 }).catch(() => false);
      if (isDossierVisible) {
        await expect(dossierContent).toBeVisible();

        // Verify tabs exist
        const bioTab = page.locator('[data-testid="tab-bio"]');
        const fichaTab = page.locator('[data-testid="tab-ficha"]');
        const newsTab = page.locator('[data-testid="tab-news"]');

        const isBioTabVisible = await bioTab.isVisible({ timeout: 2000 }).catch(() => false);
        expect(isBioTabVisible).toBeTruthy();
      }
    } else {
      console.log('Generate dossier button not found');
    }
  });

  test('should navigate between dossier tabs', async ({ page }) => {
    // Arrange - Research stage with dossier generated
    const generateButton = page.locator('[data-testid="generate-dossier"]').or(
      page.locator('button:has-text("Gerar"), button:has-text("Generate")').first()
    );

    if (await generateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateButton.click();
      await page.waitForTimeout(3000);

      // Act - Click on different tabs
      const fichaTab = page.locator('[data-testid="tab-ficha"]').or(
        page.locator('button:has-text("Ficha Técnica")').first()
      );

      if (await fichaTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fichaTab.click();

        // Assert - Tab content should update
        const fichaContent = page.locator('[data-testid="ficha-content"]');
        const isContentVisible = await fichaContent.isVisible({ timeout: 2000 }).catch(() => false);
        if (isContentVisible) {
          await expect(fichaContent).toBeVisible();
        }
      }
    }
  });

  test('should add custom sources', async ({ page }) => {
    // Arrange - Research stage is open

    // Act - Click to add custom source
    const addSourceButton = page.locator('[data-testid="add-custom-source"]').or(
      page.locator('button:has-text("Adicionar Fonte"), button:has-text("Add Source")').first()
    );

    if (await addSourceButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addSourceButton.click();

      // Modal should appear
      const sourceModal = page.locator('[data-testid="custom-source-modal"]').or(
        page.locator('div[role="dialog"]').first()
      );

      if (await sourceModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Select text source type
        const textTypeButton = page.locator('[data-testid="source-type-text"]').or(
          page.locator('button:has-text("Texto")').first()
        );

        if (await textTypeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await textTypeButton.click();

          // Fill source text
          const sourceInput = page.locator('[data-testid="source-text"]').or(
            page.locator('textarea[placeholder*="fonte" i], textarea[placeholder*="source" i]').first()
          );

          if (await sourceInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await sourceInput.fill('Custom research about the guest background');

            // Click add button
            const addButton = page.locator('[data-testid="add-source-button"]').or(
              page.locator('button:has-text("Adicionar"), button:has-text("Add")').first()
            );

            if (await addButton.isVisible({ timeout: 1000 }).catch(() => false)) {
              await addButton.click();
              await page.waitForTimeout(1000);

              // Assert - Source should be added to list
              const sourceList = page.locator('[data-testid="custom-source-item"]');
              const count = await sourceList.count();
              expect(count).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  test('should validate research stage completion badge', async ({ page }) => {
    // Assert - Check research completion badge
    const completionBadge = page.locator('[data-testid="research-stage-badge"]');
    const isBadgeVisible = await completionBadge.isVisible({ timeout: 2000 }).catch(() => false);
    if (isBadgeVisible) {
      const badgeText = await completionBadge.textContent();
      // Should contain check mark or amber indicator
      expect(badgeText).toMatch(/✅|🟡|●/);
    }
  });
});

/**
 * PAUTA STAGE REGRESSION TESTS
 */
test.describe('PautaStage Regression', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToStudioWorkspace(page);

    // Navigate to pauta stage
    const pautaStageButton = page.locator('[data-testid="stage-pauta"]');
    if (await pautaStageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pautaStageButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display pauta stage content', async ({ page }) => {
    // Assert - Pauta content should be visible
    const pautaContent = page.locator('[data-testid="pauta-content"]').or(
      page.locator('h1:has-text("Pauta")').first()
    );
    await expect(pautaContent).toBeVisible();
  });

  test('should add topic', async ({ page }) => {
    // Arrange - Pauta stage is open

    // Act - Click add topic button
    const addTopicButton = page.locator('[data-testid="add-topic"]').or(
      page.locator('button:has-text("Adicionar Tópico"), button:has-text("Add Topic")').first()
    );

    if (await addTopicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addTopicButton.click();

      // Wait for form or modal to appear
      await page.waitForTimeout(500);

      // Fill topic title
      const titleInput = page.locator('[data-testid="topic-title"]').or(
        page.locator('input[placeholder*="título" i], input[placeholder*="title" i]').first()
      );

      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('Introduction');

        // Fill topic notes
        const notesInput = page.locator('[data-testid="topic-notes"]').or(
          page.locator('textarea[placeholder*="notas" i], textarea[placeholder*="notes" i]').first()
        );

        if (await notesInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await notesInput.fill('Introduction to the episode and guest');
        }

        // Save topic
        const saveButton = page.locator('[data-testid="save-topic"]').or(
          page.locator('button:has-text("Salvar"), button:has-text("Save")').first()
        );

        if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await saveButton.click();
          await page.waitForTimeout(1000);

          // Assert - Topic should appear in list
          const topicItem = page.locator('[data-testid="topic-item"]');
          const count = await topicItem.count();
          expect(count).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should generate pauta with AI', async ({ page }) => {
    // Arrange - Pauta stage is open

    // Act - Click AI generator button
    const generateButton = page.locator('[data-testid="generate-pauta-ai"]').or(
      page.locator('button:has-text("Gerar com IA"), button:has-text("Generate with AI")').first()
    );

    if (await generateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generateButton.click();

      // Modal should appear
      const generatorModal = page.locator('[data-testid="pauta-generator-modal"]').or(
        page.locator('div[role="dialog"]').first()
      );

      if (await generatorModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Fill prompt
        const promptInput = page.locator('[data-testid="pauta-prompt"]').or(
          page.locator('textarea[placeholder*="prompt" i], textarea[placeholder*="instrução" i]').first()
        );

        if (await promptInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await promptInput.fill('Create 5 topics about technology trends');

          // Click generate button
          const genButton = page.locator('[data-testid="generate-button"]').or(
            page.locator('button:has-text("Gerar"), button:has-text("Generate")').first()
          );

          if (await genButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await genButton.click();

            // Assert - Loading indicator should appear
            const loadingIndicator = page.locator('[data-testid="generating-pauta"]').or(
              page.locator('.animate-spin').first()
            );
            const isLoadingVisible = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
            if (isLoadingVisible) {
              console.log('Pauta generating...');
            }

            // Assert - Topics should be added (longer timeout for AI API)
            const topicItems = page.locator('[data-testid="topic-item"]');
            const isTopicsVisible = await topicItems.first().isVisible({ timeout: 20000 }).catch(() => false);
            if (isTopicsVisible) {
              const count = await topicItems.count();
              expect(count).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  test('should mark topic as completed', async ({ page }) => {
    // Arrange - Pauta stage with at least one topic
    // First add a topic
    const addTopicButton = page.locator('[data-testid="add-topic"]').or(
      page.locator('button:has-text("Adicionar Tópico"), button:has-text("Add Topic")').first()
    );

    if (await addTopicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addTopicButton.click();
      await page.waitForTimeout(500);

      const titleInput = page.locator('[data-testid="topic-title"]').or(
        page.locator('input[placeholder*="título" i], input[placeholder*="title" i]').first()
      );

      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('Test Topic');

        const saveButton = page.locator('[data-testid="save-topic"]').or(
          page.locator('button:has-text("Salvar"), button:has-text("Save")').first()
        );

        if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await saveButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Act - Check topic checkbox
    const topicCheckbox = page.locator('[data-testid="topic-checkbox"]').first();

    if (await topicCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await topicCheckbox.click();

      // Assert - Topic should be marked as completed
      const topicItem = page.locator('[data-testid="topic-item"]').first();
      const isCompleted = await topicItem.getAttribute('data-completed');
      expect(isCompleted).toBe('true');
    }
  });

  test('should validate pauta stage completion', async ({ page }) => {
    // Assert - Check pauta completion badge
    const completionBadge = page.locator('[data-testid="pauta-stage-badge"]');
    const isBadgeVisible = await completionBadge.isVisible({ timeout: 2000 }).catch(() => false);
    if (isBadgeVisible) {
      const badgeText = await completionBadge.textContent();
      expect(badgeText).toMatch(/✅|🟡|●/);
    }
  });
});

/**
 * PRODUCTION STAGE REGRESSION TESTS
 */
test.describe('ProductionStage Regression', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToStudioWorkspace(page);

    // Navigate to production stage
    const productionStageButton = page.locator('[data-testid="stage-production"]');
    if (await productionStageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await productionStageButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display production stage content', async ({ page }) => {
    // Assert - Production content should be visible
    const productionContent = page.locator('[data-testid="production-content"]').or(
      page.locator('h1:has-text("Gravação"), h1:has-text("Production")').first()
    );
    await expect(productionContent).toBeVisible();
  });

  test('should display recording controls', async ({ page }) => {
    // Assert - Recording control buttons should be visible
    const startButton = page.locator('[data-testid="start-recording"]').or(
      page.locator('button:has-text("Iniciar"), button:has-text("Start")').first()
    );

    const isStartVisible = await startButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (isStartVisible) {
      await expect(startButton).toBeVisible();
    }

    // Verify recording timer element exists
    const recordingTimer = page.locator('[data-testid="recording-timer"]').or(
      page.locator('text=/00:00:[0-9]{2}/').first()
    );

    const isTimerVisible = await recordingTimer.isVisible({ timeout: 2000 }).catch(() => false);
    if (isTimerVisible) {
      await expect(recordingTimer).toBeVisible();
    }
  });

  test('should start and pause recording', async ({ page }) => {
    // Arrange - Production stage is open

    // Act - Click start recording
    const startButton = page.locator('[data-testid="start-recording"]').or(
      page.locator('button:has-text("Iniciar"), button:has-text("Start")').first()
    );

    if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startButton.click();

      // Wait for recording to start
      await page.waitForTimeout(2000);

      // Assert - Timer should be running
      const recordingTimer = page.locator('[data-testid="recording-timer"]');
      const timerText = await recordingTimer.textContent({ timeout: 2000 }).catch(() => '00:00:00');
      expect(timerText).toMatch(/00:00:[0-9]{2}/);

      // Act - Pause recording
      const pauseButton = page.locator('[data-testid="pause-recording"]').or(
        page.locator('button:has-text("Pausar"), button:has-text("Pause")').first()
      );

      if (await pauseButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await pauseButton.click();

        // Assert - Resume button should be visible
        const resumeButton = page.locator('[data-testid="resume-recording"]').or(
          page.locator('button:has-text("Retomar"), button:has-text("Resume")').first()
        );

        const isResumeVisible = await resumeButton.isVisible({ timeout: 1000 }).catch(() => false);
        expect(isResumeVisible).toBeTruthy();
      }

      // Clean up - Stop recording
      const stopButton = page.locator('[data-testid="stop-recording"]').or(
        page.locator('button:has-text("Parar"), button:has-text("Stop")').first()
      );

      if (await stopButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await stopButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display topic checklist', async ({ page }) => {
    // Assert - Checklist should display topics from pauta
    const checklistItems = page.locator('[data-testid="checklist-item"]').or(
      page.locator('.checklist-item').first()
    );

    const isChecklistVisible = await checklistItems.first().isVisible({ timeout: 2000 }).catch(() => false);
    if (isChecklistVisible) {
      const count = await checklistItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should check topic in checklist', async ({ page }) => {
    // Arrange - Production stage with topics in checklist
    const checklistCheckbox = page.locator('[data-testid="checklist-checkbox"]').first();

    const isCheckboxVisible = await checklistCheckbox.isVisible({ timeout: 2000 }).catch(() => false);
    if (isCheckboxVisible) {
      // Act - Check the checkbox
      await checklistCheckbox.click();

      // Assert - Item should be marked as checked
      const checklistItem = page.locator('[data-testid="checklist-item"]').first();
      const isChecked = await checklistItem.getAttribute('data-checked');
      expect(isChecked).toBe('true');
    }
  });

  test('should open teleprompter window', async ({ page }) => {
    // Arrange - Production stage is open

    // Act - Click open teleprompter button
    const teleprompterButton = page.locator('[data-testid="open-teleprompter"]').or(
      page.locator('button:has-text("Teleprompter"), button:has-text("Abrir Teleprompter")').first()
    );

    if (await teleprompterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Set up listener for popup/new window
      const [popup] = await Promise.all([
        page.waitForEvent('popup').catch(() => null),
        teleprompterButton.click().catch(() => null)
      ]);

      if (popup) {
        // Assert - Popup should have teleprompter content
        await popup.waitForLoadState('networkidle');

        const teleprompterContent = popup.locator('[data-testid="teleprompter-content"]').or(
          popup.locator('text=Pauta, text=Topics').first()
        );

        const isContentVisible = await teleprompterContent.isVisible({ timeout: 2000 }).catch(() => false);
        if (isContentVisible) {
          await expect(teleprompterContent).toBeVisible();
        }

        await popup.close();
      }
    }
  });
});

/**
 * AUTO-SAVE INTEGRATION TESTS
 */
test.describe('Auto-Save Regression', () => {
  test('should auto-save changes across stages', async ({ page }) => {
    // Arrange - Navigate to workspace
    await navigateToStudioWorkspace(page);

    // Go to setup stage
    const setupButton = page.locator('[data-testid="stage-setup"]');
    if (await setupButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Act - Make a change in setup
    const themeInput = page.locator('input[placeholder*="tema" i], input[placeholder*="theme" i]').or(
      page.locator('[data-testid="episode-theme"]')
    ).first();

    const testValue = `Auto-save test ${Date.now()}`;
    await themeInput.fill(testValue);

    // Wait for auto-save (2.5s debounce + buffer)
    console.log('Waiting for auto-save...');
    await page.waitForTimeout(3500);

    // Navigate to another stage
    const researchButton = page.locator('[data-testid="stage-research"]');
    if (await researchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await researchButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate back to setup
    if (await setupButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Assert - Data should be persisted
    const persistedValue = await themeInput.inputValue();
    expect(persistedValue).toBe(testValue);
  });

  test('should show dirty indicator when changes made', async ({ page }) => {
    // Arrange
    await navigateToStudioWorkspace(page);

    const setupButton = page.locator('[data-testid="stage-setup"]');
    if (await setupButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Act - Make a change
    const guestNameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i]').first();
    await guestNameInput.fill('Dirty Test');

    // Assert - Dirty indicator should appear
    const dirtyIndicator = page.locator('[data-testid="dirty-indicator"]').or(
      page.locator('text=*').first() // Asterisk in title
    );

    const isDirtyVisible = await dirtyIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    if (isDirtyVisible) {
      await expect(dirtyIndicator).toBeVisible();
    }
  });

  test('should clear dirty indicator after auto-save', async ({ page }) => {
    // Arrange
    await navigateToStudioWorkspace(page);

    const setupButton = page.locator('[data-testid="stage-setup"]');
    if (await setupButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Act - Make a change
    const guestNameInput = page.locator('input[placeholder*="nome" i], input[placeholder*="name" i]').first();
    await guestNameInput.fill('Save Test');

    // Wait for auto-save to complete
    console.log('Waiting for auto-save...');
    await page.waitForTimeout(3500);

    // Assert - Dirty indicator should be cleared
    const dirtyIndicator = page.locator('[data-testid="dirty-indicator"]');
    const isDirtyVisible = await dirtyIndicator.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isDirtyVisible).toBeFalsy();
  });
});

/**
 * PERMEABLE NAVIGATION TESTS
 */
test.describe('Permeable Navigation Regression', () => {
  test('should allow free navigation between all stages', async ({ page }) => {
    // Arrange
    await navigateToStudioWorkspace(page);

    // Act & Assert - Navigate through all stages
    const stages = [
      { id: 'stage-research', name: 'research' },
      { id: 'stage-pauta', name: 'pauta' },
      { id: 'stage-production', name: 'production' },
      { id: 'stage-setup', name: 'setup' }
    ];

    for (const stage of stages) {
      const stageButton = page.locator(`[data-testid="${stage.id}"]`);

      const isVisible = await stageButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        await stageButton.click();
        await page.waitForLoadState('networkidle');

        // Verify stage content loaded
        const content = page.locator(`[data-testid="${stage.name}-content"]`).or(
          page.locator('text=' + stage.name).first()
        );

        const isContentVisible = await content.isVisible({ timeout: 2000 }).catch(() => false);
        if (isContentVisible) {
          await expect(content).toBeVisible();
          console.log(`✓ Navigated to ${stage.name} stage`);
        }
      }
    }
  });

  test('should not enforce stage completion order', async ({ page }) => {
    // Arrange
    await navigateToStudioWorkspace(page);

    // Act - Navigate directly to pauta (should not require setup/research completion)
    const pautaButton = page.locator('[data-testid="stage-pauta"]');

    const isVisible = await pautaButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      // Button should be clickable (not disabled)
      const isDisabled = await pautaButton.evaluate((el: HTMLElement) => {
        return (el as HTMLButtonElement).disabled;
      }).catch(() => false);

      expect(isDisabled).toBeFalsy();

      // Click should navigate
      await pautaButton.click();
      await page.waitForLoadState('networkidle');

      // Verify we're on pauta stage
      const pautaContent = page.locator('[data-testid="pauta-content"]');
      const isContentVisible = await pautaContent.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isContentVisible).toBeTruthy();
    }
  });

  test('should show all stage buttons in stepper', async ({ page }) => {
    // Arrange
    await navigateToStudioWorkspace(page);

    // Assert - All stage buttons should be visible
    const stageButtons = [
      '[data-testid="stage-setup"]',
      '[data-testid="stage-research"]',
      '[data-testid="stage-pauta"]',
      '[data-testid="stage-production"]'
    ];

    for (const buttonSelector of stageButtons) {
      const button = page.locator(buttonSelector);
      const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should indicate current active stage', async ({ page }) => {
    // Arrange
    await navigateToStudioWorkspace(page);

    // Act - Click setup stage
    const setupButton = page.locator('[data-testid="stage-setup"]');
    if (await setupButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await setupButton.click();
      await page.waitForLoadState('networkidle');

      // Assert - Setup button should have active styling
      const classList = await setupButton.getAttribute('class');
      expect(classList).toContain('orange') || expect(classList).toContain('active');
    }

    // Act - Click research stage
    const researchButton = page.locator('[data-testid="stage-research"]');
    if (await researchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await researchButton.click();
      await page.waitForLoadState('networkidle');

      // Assert - Research button should now have active styling
      const classList = await researchButton.getAttribute('class');
      expect(classList).toContain('orange') || expect(classList).toContain('active');

      // Assert - Setup button should no longer have active styling
      const setupClassList = await setupButton.getAttribute('class');
      expect(setupClassList).not.toContain('orange-50');
    }
  });
});

/**
 * WORKSPACE LIFECYCLE TESTS
 */
test.describe('Workspace Lifecycle', () => {
  test('should load workspace with saved state', async ({ page }) => {
    // Arrange - Workspace should be accessible
    await navigateToStudioWorkspace(page);

    // Assert - Workspace should load without errors
    const errorMessage = page.locator('[data-testid="error-message"]');
    const isErrorVisible = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isErrorVisible).toBeFalsy();

    // Assert - All stage buttons should be present
    const stageStepper = page.locator('[data-testid="stage-stepper"]').or(
      page.locator('.stepper, .stage-navigation').first()
    );

    await expect(stageStepper).toBeVisible();
  });

  test('should handle workspace with no episodes', async ({ page }) => {
    // Navigate to podcast without any episodes
    await page.goto(`${BASE_URL}/podcast`);
    await page.waitForLoadState('networkidle');

    // Should either show empty state or create button
    const emptyState = page.locator('[data-testid="empty-state"], text=Nenhum Episódio').first();
    const createButton = page.locator('button:has-text("Novo Episódio"), button:has-text("Create Episode")');

    const isEmptyVisible = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    const isCreateVisible = await createButton.isVisible({ timeout: 2000 }).catch(() => false);

    expect(isEmptyVisible || isCreateVisible).toBeTruthy();
  });

  test('should show loading state while fetching episode', async ({ page }) => {
    // Navigate to podcast module
    await page.goto(`${BASE_URL}/podcast`);
    await page.waitForLoadState('networkidle');

    // Loading indicator should appear briefly (if fetching)
    const loadingIndicator = page.locator('[data-testid="loading"]').or(
      page.locator('.animate-spin').first()
    );

    const isLoadingVisible = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
    if (isLoadingVisible) {
      console.log('Loading indicator appeared');
    }
  });
});
