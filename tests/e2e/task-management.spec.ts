import { test, expect } from '@playwright/test';

test.describe('Core Task Management', () => {
  test.beforeEach(async ({ page }) => {
    /**
     * Authentication is handled globally via playwright.config.ts
     * which uses storageState to inject pre-authenticated session.
     * No need for manual login here.
     */

    // Wait for app to load and ensure we're authenticated
    await page.goto('/');
    // If still on login page, tests will fail with clear auth error
    // This is expected if auth setup didn't work (missing TEST_EMAIL/TEST_PASSWORD)
  });

  test('Test 2.1: Create Task', async ({ page }) => {
    // Go to Agenda View
    await page.goto('/meu-dia');

    // Find task input
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await expect(taskInput).toBeVisible();

    // Type task
    await taskInput.fill('Revisar contrato importante');

    // Submit
    await taskInput.press('Enter');

    // Wait for task to appear
    const taskElement = page.locator('text=Revisar contrato importante');
    await expect(taskElement).toBeVisible();
  });

  test('Test 2.2: Update Task Title', async ({ page }) => {
    // Go to Agenda View
    await page.goto('/meu-dia');

    // Create a task first
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await taskInput.fill('Original Task Title');
    await taskInput.press('Enter');

    // Find and click the task
    const taskElement = page.locator('text=Original Task Title').first();
    await taskElement.click();

    // Wait for task details to open
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toBeVisible();

    // Update title
    await titleInput.clear();
    await titleInput.fill('Updated Task Title');

    // Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Verify update
    const updatedTask = page.locator('text=Updated Task Title');
    await expect(updatedTask).toBeVisible();
  });

  test('Test 2.3: Change Task Priority', async ({ page }) => {
    // Create task
    await page.goto('/meu-dia');
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await taskInput.fill('Priority Test Task');
    await taskInput.press('Enter');

    // Click task to open details
    const taskElement = page.locator('text=Priority Test Task').first();
    await taskElement.click();

    // Change priority dropdown
    const prioritySelect = page.locator('select[name="priority"]');
    await prioritySelect.selectOption('high');

    // Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Verify change
    await page.goto('/meu-dia'); // Refresh view
    const highPriorityTask = page.locator('[data-priority="high"]:has-text("Priority Test Task")');
    await expect(highPriorityTask).toBeVisible();
  });

  test('Test 2.4: Set Due Date', async ({ page }) => {
    // Create task
    await page.goto('/meu-dia');
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await taskInput.fill('Due Date Test');
    await taskInput.press('Enter');

    // Click task
    const taskElement = page.locator('text=Due Date Test').first();
    await taskElement.click();

    // Set due date
    const dueDateInput = page.locator('input[name="due_date"]');
    await dueDateInput.fill('2025-12-15');

    // Save
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Verify
    const taskWithDate = page.locator('[data-due-date="2025-12-15"]');
    await expect(taskWithDate).toBeVisible();
  });

  test('Test 2.5: Complete Task', async ({ page }) => {
    // Create task
    await page.goto('/meu-dia');
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await taskInput.fill('Task to Complete');
    await taskInput.press('Enter');

    // Find and click task checkbox
    const taskCheckbox = page.locator('[data-testid="task-checkbox"]:near(text=Task to Complete)');
    await taskCheckbox.click();

    // Wait for task to be marked complete
    const completedTask = page.locator('[data-completed="true"]:has-text("Task to Complete")');
    await expect(completedTask).toBeVisible({ timeout: 5000 });

    // Verify notification/toast
    const successToast = page.locator('text=Task completed');
    await expect(successToast).toBeVisible();
  });

  test('Test 2.6: Archive Task', async ({ page }) => {
    // Create task
    await page.goto('/meu-dia');
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await taskInput.fill('Task to Archive');
    await taskInput.press('Enter');

    // Click task menu
    const taskMenu = page.locator('[data-testid="task-menu"]:near(text=Task to Archive)');
    await taskMenu.click();

    // Click archive option
    const archiveOption = page.locator('[data-testid="archive-option"]');
    await archiveOption.click();

    // Verify task disappears from active view
    const archivedTask = page.locator('text=Task to Archive');
    await expect(archivedTask).not.toBeVisible();
  });

  test('Test 2.7: Drag Task Between Quadrants', async ({ page }) => {
    // Create multiple tasks
    await page.goto('/meu-dia');

    // Create low priority task
    const taskInput = page.locator('input[placeholder*="Adicionar nova tarefa"]');
    await taskInput.fill('Task to Drag');
    await taskInput.press('Enter');

    // Find task in low quadrant
    const taskElement = page.locator('[data-quadrant="low"] >> text=Task to Drag');
    await expect(taskElement).toBeVisible();

    // Drag to important quadrant
    const importantQuadrant = page.locator('[data-quadrant="important"]');
    await taskElement.dragTo(importantQuadrant);

    // Wait for task to appear in new quadrant
    const movedTask = page.locator('[data-quadrant="important"] >> text=Task to Drag');
    await expect(movedTask).toBeVisible({ timeout: 5000 });
  });
});
