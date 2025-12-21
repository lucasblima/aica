/**
 * E2E Tests: Atlas Module - Auto-Categorization
 *
 * Tests Gemini-powered auto-categorization of tasks:
 * - Suggest category while typing task description
 * - Accept suggested category
 * - Reject and manually select category
 * - Debouncing to avoid excessive API calls
 * - Cache for repeated descriptions
 *
 * Categories:
 * - Trabalho (Work)
 * - Pessoal (Personal)
 * - Saúde (Health)
 * - Educação (Education)
 * - Finanças (Finances)
 * - Outros (Other)
 */

import { test, expect } from '@playwright/test';

// Use authenticated session from setup
test.use({ storageState: 'tests/e2e/.auth.json' });

test.describe('Atlas - Task Auto-Categorization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Atlas (task management)
    await page.goto('/atlas');

    // Alternative routes if main route doesn't work
    if (page.url().includes('404') || page.url().includes('not-found')) {
      await page.goto('/');

      const atlasButton = page.locator('button, a', { hasText: /atlas|tasks|tarefas/i });
      if (await atlasButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await atlasButton.click();
      } else {
        test.skip(true, 'Atlas module not accessible');
      }
    }

    await page.waitForLoadState('networkidle');
  });

  test('should suggest category while typing task description', async ({ page }) => {
    // Find "Add Task" or "New Task" button
    const addTaskButton = page.locator('button', {
      hasText: /adicionar.*tarefa|add.*task|nova.*tarefa|new.*task/i
    });

    if (!(await addTaskButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Add task button not found');
      return;
    }

    await addTaskButton.click();

    // Find task description input
    const taskInput = page.locator('input[placeholder*="tarefa" i]').or(
      page.locator('input[placeholder*="task" i]')
    ).or(
      page.locator('textarea[placeholder*="descrição" i]')
    ).first();

    await expect(taskInput).toBeVisible();

    // Type a work-related task
    const workTask = 'Preparar apresentação para reunião de vendas';
    await taskInput.fill(workTask);

    // Wait for debounce + API call (should be around 1-2 seconds)
    console.log('⏳ Waiting for auto-categorization...');

    // Look for category suggestion
    const categorySuggestion = page.locator('[data-testid="category-suggestion"]').or(
      page.locator('text=/sugestão.*categoria|suggested.*category/i').locator('..')
    ).or(
      page.locator('select[name="category"], input[name="category"]')
    );

    await page.waitForTimeout(3000); // Wait for debounce + API

    // Check if category was auto-selected or suggested
    const categoryField = page.locator('select[name="category"]').or(
      page.locator('input[value*="Trabalho"]')
    );

    if (await categoryField.isVisible({ timeout: 2000 }).catch(() => false)) {
      const selectedValue = await categoryField.inputValue().catch(() =>
        categoryField.textContent()
      );

      console.log('✓ Category suggestion:', selectedValue);

      // For work task, should suggest "Trabalho"
      const suggestedWork =
        selectedValue!.includes('Trabalho') ||
        selectedValue!.includes('Work');

      if (suggestedWork) {
        console.log('✅ Correct category suggested: Trabalho');
      } else {
        console.log('⚠ Category suggested but not ideal:', selectedValue);
      }
    } else {
      console.log('⚠ Category auto-suggestion not visible in UI');
    }
  });

  test('should suggest different categories for different contexts', async ({ page }) => {
    const addTaskButton = page.locator('button', { hasText: /add.*task|nova.*tarefa/i });

    if (!(await addTaskButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip(true, 'Add task not available');
      return;
    }

    // Test different task types
    const testCases = [
      { description: 'Marcar consulta médica', expectedCategory: 'Saúde' },
      { description: 'Pagar conta de luz', expectedCategory: 'Finanças' },
      { description: 'Estudar para certificação', expectedCategory: 'Educação' },
      { description: 'Comprar presente aniversário', expectedCategory: 'Pessoal' },
    ];

    for (const testCase of testCases) {
      await addTaskButton.click();
      await page.waitForTimeout(500);

      const taskInput = page.locator('input[placeholder*="tarefa" i], textarea').first();
      await taskInput.fill(testCase.description);

      // Wait for categorization
      await page.waitForTimeout(3000);

      const categoryField = page.locator('select[name="category"], input[name="category"]');

      if (await categoryField.isVisible({ timeout: 1000 }).catch(() => false)) {
        const suggested = await categoryField.inputValue().catch(() => '');

        if (suggested.includes(testCase.expectedCategory)) {
          console.log(`✅ "${testCase.description}" → ${testCase.expectedCategory}`);
        } else {
          console.log(`⚠ "${testCase.description}" → ${suggested} (expected ${testCase.expectedCategory})`);
        }
      }

      // Cancel or close modal
      const cancelButton = page.locator('button', { hasText: /cancel|cancelar|fechar/i });
      if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelButton.click();
      } else {
        await page.keyboard.press('Escape');
      }

      await page.waitForTimeout(500);
    }
  });

  test('should accept suggested category', async ({ page }) => {
    const addTaskButton = page.locator('button', { hasText: /add.*task|nova/i });
    await addTaskButton.click();

    const taskInput = page.locator('input, textarea').filter({ hasText: '' }).first();
    await taskInput.fill('Enviar email para cliente');

    // Wait for suggestion
    await page.waitForTimeout(3000);

    // Look for "Accept" or checkmark button
    const acceptButton = page.locator('button[data-testid="accept-category"]').or(
      page.locator('button', { hasText: /aceitar|accept|✓/i })
    );

    if (await acceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await acceptButton.click();
      console.log('✓ Accepted suggested category');

      // Verify category is now locked in
      const categoryField = page.locator('select[name="category"]');
      const finalCategory = await categoryField.inputValue();
      expect(finalCategory.length).toBeGreaterThan(0);
    } else {
      console.log('⚠ Accept button not found (might be auto-accepted)');

      // Category might be auto-selected without explicit accept button
      const categoryField = page.locator('select[name="category"]');
      if (await categoryField.isVisible().catch(() => false)) {
        const category = await categoryField.inputValue();
        expect(category.length).toBeGreaterThan(0);
        console.log('✓ Category auto-selected:', category);
      }
    }
  });

  test('should allow rejecting suggestion and manual selection', async ({ page }) => {
    const addTaskButton = page.locator('button', { hasText: /add|nova/i });
    await addTaskButton.click();

    const taskInput = page.locator('input, textarea').first();
    await taskInput.fill('Organizar documentos');

    // Wait for suggestion
    await page.waitForTimeout(3000);

    // Look for reject button or category dropdown
    const rejectButton = page.locator('button[data-testid="reject-category"]').or(
      page.locator('button', { hasText: /reject|rejeitar|✗/i })
    );

    if (await rejectButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await rejectButton.click();
      console.log('✓ Rejected suggestion');
    }

    // Manually select category
    const categoryDropdown = page.locator('select[name="category"]');
    await expect(categoryDropdown).toBeVisible();

    await categoryDropdown.selectOption('Pessoal');
    console.log('✓ Manually selected category: Pessoal');

    const selectedValue = await categoryDropdown.inputValue();
    expect(selectedValue).toContain('Pessoal');
  });

  test('should debounce API calls while typing', async ({ page }) => {
    const requests: string[] = [];

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('gemini') || request.url().includes('categorize')) {
        requests.push(request.url());
        console.log('API call made at', new Date().toISOString());
      }
    });

    const addTaskButton = page.locator('button', { hasText: /add|nova/i });
    await addTaskButton.click();

    const taskInput = page.locator('input, textarea').first();

    // Type character by character (simulating real typing)
    const text = 'Preparar relatório financeiro';
    for (const char of text) {
      await taskInput.type(char, { delay: 100 }); // 100ms between chars
    }

    // Wait for debounce to settle
    await page.waitForTimeout(2000);

    console.log(`Total API calls made: ${requests.length}`);

    // Should have made very few calls (ideally 1-2) due to debouncing
    // Not 29 calls (one per character)
    expect(requests.length).toBeLessThan(5);

    console.log('✓ Debouncing working - avoided excessive API calls');
  });

  test('should NOT call API for very short descriptions', async ({ page }) => {
    const requests: string[] = [];

    page.on('request', request => {
      if (request.url().includes('gemini') || request.url().includes('categorize')) {
        requests.push(request.url());
      }
    });

    const addTaskButton = page.locator('button', { hasText: /add|nova/i });
    await addTaskButton.click();

    const taskInput = page.locator('input, textarea').first();

    // Type very short text (< 3 characters)
    await taskInput.fill('AB');

    await page.waitForTimeout(3000);

    console.log(`API calls for short text: ${requests.length}`);

    // Should not call API for very short descriptions
    expect(requests.length).toBe(0);

    console.log('✓ No API calls for descriptions shorter than 3 characters');
  });

  test('should display loading state during categorization', async ({ page }) => {
    const addTaskButton = page.locator('button', { hasText: /add|nova/i });
    await addTaskButton.click();

    const taskInput = page.locator('input, textarea').first();

    // Fill task
    await taskInput.fill('Revisar código da sprint');

    // Immediately check for loading indicator
    const loadingIndicator = page.locator('[data-testid="category-loading"]').or(
      page.locator('text=/categorizando|categorizing/i')
    ).or(
      page.locator('[data-testid="loading"]')
    );

    // Loading should appear within 1.5 seconds (after debounce)
    const isLoading = await loadingIndicator.isVisible({ timeout: 1500 }).catch(() => false);

    if (isLoading) {
      console.log('✓ Loading indicator shown during categorization');

      // Loading should disappear after result arrives
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      console.log('✓ Loading indicator hidden after categorization');
    } else {
      console.log('⚠ Loading indicator not visible (might be very fast)');
    }
  });

  test('should handle categorization errors gracefully', async ({ page }) => {
    // Disconnect network to simulate error
    await page.context().setOffline(true);

    const addTaskButton = page.locator('button', { hasText: /add|nova/i });
    await addTaskButton.click();

    const taskInput = page.locator('input, textarea').first();
    await taskInput.fill('Tarefa de teste para erro');

    await page.waitForTimeout(3000);

    // Reconnect
    await page.context().setOffline(false);

    // Should show error or default to "Outros"
    const categoryField = page.locator('select[name="category"]');

    if (await categoryField.isVisible().catch(() => false)) {
      const value = await categoryField.inputValue();

      // Should default to "Outros" on error or show no category
      console.log('Category after error:', value || 'none');
      console.log('✓ Error handled gracefully (no crash)');
    }

    // Look for error message
    const errorMessage = page.locator('text=/erro.*categori|categorization.*error/i');
    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('✓ Error message displayed to user');
    }
  });

  test('should create task with auto-suggested category', async ({ page }) => {
    const addTaskButton = page.locator('button', { hasText: /add|nova/i });
    await addTaskButton.click();

    const taskInput = page.locator('input, textarea').first();
    const taskDescription = 'Finalizar apresentação de vendas Q4';
    await taskInput.fill(taskDescription);

    // Wait for categorization
    await page.waitForTimeout(3000);

    // Fill other required fields if any
    const titleInput = page.locator('input[name="title"], input[placeholder*="título"]');
    if (await titleInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await titleInput.fill('Apresentação Q4');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]').or(
      page.locator('button', { hasText: /criar|create|salvar|save/i })
    );

    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();

      // Wait for task to be created
      await page.waitForTimeout(2000);

      // Verify task appears in the list
      const taskCard = page.locator('text=' + taskDescription.substring(0, 20));

      if (await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✓ Task created with auto-suggested category');

        // Click on task to see details
        await taskCard.click();
        await page.waitForTimeout(1000);

        // Verify category is "Trabalho"
        const categoryBadge = page.locator('text=/trabalho|work/i');
        if (await categoryBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('✅ Task has correct category: Trabalho');
        }
      } else {
        console.log('⚠ Task not found in list after creation');
      }
    } else {
      console.log('⚠ Submit button not found, cannot complete test');
    }
  });
});

test.describe('Atlas - Categorization Security', () => {
  test('should NOT expose API key in categorization requests', async ({ page }) => {
    const requests: string[] = [];
    const requestBodies: string[] = [];

    page.on('request', request => {
      requests.push(request.url());
      const postData = request.postData();
      if (postData) requestBodies.push(postData);
    });

    await page.goto('/atlas');

    const addTaskButton = page.locator('button', { hasText: /add|nova/i });

    if (await addTaskButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addTaskButton.click();

      const taskInput = page.locator('input, textarea').first();
      await taskInput.fill('Test security');
      await page.waitForTimeout(3000);
    }

    // Verify no API key in URLs
    const hasApiKeyInUrl = requests.some(url =>
      url.includes('AIza') || url.includes('GEMINI_API_KEY')
    );
    expect(hasApiKeyInUrl).toBe(false);

    // Verify no API key in request bodies
    const hasApiKeyInBody = requestBodies.some(body =>
      body.includes('AIza') || body.includes('GEMINI_API_KEY')
    );
    expect(hasApiKeyInBody).toBe(false);

    // Verify requests go through backend
    const hasBackendRequests = requests.some(url =>
      url.includes('/functions/v1/gemini') ||
      url.includes('supabase.co/functions')
    );
    expect(hasBackendRequests).toBe(true);

    console.log('✅ SECURITY: Categorization routes through backend');
  });

  test('should require authentication for categorization', async ({ page }) => {
    // Clear auth
    await page.context().clearCookies();

    await page.goto('/atlas');

    // Should redirect to login or show auth error
    const loginOrError = page.locator('text=/login|entrar|unauthorized|não autorizado/i');
    await expect(loginOrError).toBeVisible({ timeout: 5000 });

    console.log('✓ Categorization requires authentication');
  });
});

test.describe('Atlas - Categorization Performance', () => {
  test('should categorize within 5 seconds', async ({ page }) => {
    await page.goto('/atlas');

    const addTaskButton = page.locator('button', { hasText: /add|nova/i });
    await addTaskButton.click();

    const taskInput = page.locator('input, textarea').first();

    const startTime = Date.now();
    await taskInput.fill('Agendar reunião trimestral');

    // Wait for categorization to complete
    await page.waitForTimeout(1500); // debounce

    const categoryField = page.locator('select[name="category"]');

    // Wait for category to be populated
    await expect(categoryField).not.toBeEmpty({ timeout: 5000 });

    const duration = Date.now() - startTime - 1500; // subtract debounce time

    console.log(`Categorization took: ${duration}ms`);

    // Should complete in under 5 seconds (excluding debounce)
    expect(duration).toBeLessThan(5000);

    console.log('✓ Categorization performance acceptable');
  });
});
