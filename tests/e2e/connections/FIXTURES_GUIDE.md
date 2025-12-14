# Connection Fixtures Guide

Complete guide to using the shared test fixtures and helper functions.

## Overview

The `fixtures.ts` file provides:
- Pre-configured test function with authentication
- 30+ helper functions for common operations
- Resilient selector strategies
- Error handling and validation

## Basic Usage

### Import Fixtures

```typescript
import {
  test,                        // Extended test function
  navigateToConnections,       // Navigate to /connections
  openCreateSpaceWizard,       // Open space creation modal
  selectArchetypeInWizard,     // Choose an archetype
  fillSpaceCreationForm,       // Fill space details
  submitSpaceWizard,           // Submit the wizard
  createSpace,                 // Complete flow in one call
  expectSuccessMessage,        // Verify success
  expect,                      // Playwright expect
} from './fixtures';

test.describe('My Tests', () => {
  test('My test', async ({ authenticatedPage: page }) => {
    // Your test code here
  });
});
```

## Navigation Helpers

### `navigateToConnections(page)`
Navigate to connections dashboard.

```typescript
test('Navigate to connections', async ({ authenticatedPage: page }) => {
  await navigateToConnections(page);

  // Page is now at /connections with content loaded
  await expect(page.getByText(/Conexões|Connections/i)).toBeVisible();
});
```

### `openSpace(page, spaceName)`
Find and click a space to open its detail page.

```typescript
test('Open space by name', async ({ authenticatedPage: page }) => {
  await openSpace(page, 'My Habitat Space');

  // Now on space detail page
  await expect(page.getByText('My Habitat Space')).toBeVisible();
});
```

### `clickBreadcrumb(page, label)`
Click navigation breadcrumb.

```typescript
test('Navigate via breadcrumb', async ({ authenticatedPage: page }) => {
  await navigateToConnections(page);
  await clickBreadcrumb(page, 'Habitat');

  // Should navigate to habitat section
});
```

## Space Creation Helpers

### Full Space Creation - `createSpace()`

Most common - complete space creation in one call:

```typescript
test('Create habitat space', async ({ authenticatedPage: page }) => {
  await navigateToConnections(page);

  // Create space with all details
  await createSpace(page, 'habitat', {
    name: 'My Apartment',
    subtitle: 'São Paulo, Brazil',
    description: 'My beautiful home',
    icon: '🏠'
  });

  // Automatically waits for success and navigates to space
  await expect(page).toHaveURL(/\/connections\/habitat\/.+/);
});
```

### Step-by-Step Space Creation

For more control, use individual helpers:

```typescript
test('Create space step by step', async ({ authenticatedPage: page }) => {
  await navigateToConnections(page);

  // Step 1: Open wizard
  await openCreateSpaceWizard(page);

  // Step 2: Select archetype
  await selectArchetypeInWizard(page, 'ventures');

  // Step 3: Click next if available
  const nextButton = page.getByRole('button', { name: /next/i });
  if (await nextButton.isVisible()) {
    await nextButton.click();
    await page.waitForTimeout(500);
  }

  // Step 4: Fill form
  await fillSpaceCreationForm(page, {
    name: 'My Startup',
    subtitle: 'Tech Company',
    description: 'Our awesome startup'
  });

  // Step 5: Submit
  await submitSpaceWizard(page);

  // Step 6: Verify success
  await expect(page).toHaveURL(/\/connections\/ventures\/.+/);
});
```

### Individual Helpers

#### `openCreateSpaceWizard(page)`
```typescript
// Open space creation wizard modal
await openCreateSpaceWizard(page);
await expect(page.locator('[role="dialog"]')).toBeVisible();
```

#### `selectArchetypeInWizard(page, archetype)`
```typescript
// Select specific archetype
// Works with: 'habitat', 'ventures', 'academia', 'tribo'
await selectArchetypeInWizard(page, 'academia');
```

#### `fillSpaceCreationForm(page, data)`
```typescript
// Fill space details
await fillSpaceCreationForm(page, {
  name: 'Curso de React',           // Required
  subtitle: 'Desenvolvimento Web',  // Optional
  description: 'Learn React...',    // Optional
  icon: '🎓'                        // Optional
});
```

#### `submitSpaceWizard(page)`
```typescript
// Find and click submit button, waits for navigation
await submitSpaceWizard(page);
// Now at /connections/{archetype}/{spaceId}
```

## Member Management Helpers

### `addMemberToSpace(page, memberData)`
Add a member to space.

```typescript
test('Add member to space', async ({ authenticatedPage: page }) => {
  // Navigate to space
  await page.goto('/connections/habitat/space-id');

  // Add member
  await addMemberToSpace(page, {
    name: 'João Silva',
    email: 'joao@example.com',
    role: 'member'  // Optional: 'admin', 'member', 'viewer'
  });

  // Verify added
  await expect(page.getByText('João Silva')).toBeVisible();
});
```

## Search & Filtering Helpers

### `findSpaceCard(page, spaceName)`
Find space card in list.

```typescript
test('Find space card', async ({ authenticatedPage: page }) => {
  await navigateToConnections(page);

  // Find the space card
  const card = await findSpaceCard(page, 'My Habitat');

  // Can interact with it
  await card.click();
});
```

### `getArchetypeSection(page, archetype)`
Get archetype section heading.

```typescript
test('Find archetype', async ({ authenticatedPage: page }) => {
  await navigateToConnections(page);

  // Get archetype heading
  const section = getArchetypeSection(page, 'Habitat');

  await expect(section).toBeVisible();
});
```

## Utility Helpers

### `getCurrentSpaceId(page)`
Extract space ID from URL.

```typescript
test('Get space ID', async ({ authenticatedPage: page }) => {
  await createSpace(page, 'habitat', {
    name: 'Test Space'
  });

  const spaceId = await getCurrentSpaceId(page);
  console.log('Created space ID:', spaceId);

  // URL is: /connections/habitat/{spaceId}
});
```

### `expectSuccessMessage(page)`
Verify success message appears.

```typescript
test('Verify success', async ({ authenticatedPage: page }) => {
  // Do something that creates success message
  await fillSpaceCreationForm(page, {
    name: 'My Space'
  });

  // Check message appears
  await expectSuccessMessage(page, { timeout: 5000 });
});
```

### `deleteSpace(page)`
Delete current space.

```typescript
test('Delete space', async ({ authenticatedPage: page }) => {
  await page.goto('/connections/habitat/space-id');

  // Delete space
  await deleteSpace(page);

  // Should redirect to /connections
  await expect(page).toHaveURL('/connections');
});
```

## Selector Strategy

All helpers use resilient multi-layer selectors:

### Layer 1: Accessibility-First (Most Resilient)
```typescript
// Get by role (buttons, links, etc)
page.getByRole('button', { name: /create/i })

// Get by label (form fields)
page.getByLabel('Email address')

// Get by placeholder
page.getByPlaceholder('Enter your name')
```

### Layer 2: Visible Text
```typescript
// Get by visible text
page.getByText('Create Space')
page.getByText(/create|criar/i)  // Regex for Portuguese/English
```

### Layer 3: Test IDs (For Complex Elements)
```typescript
// If component has data-testid
page.locator('[data-testid="space-card"]')
```

### Layer 4: Multi-Strategy Fallback (Robust)
```typescript
// Try multiple strategies, use first match
const button = page
  .getByRole('button', { name: /create/i })           // Primary
  .or(page.locator('[data-testid="create-btn"]'))     // Secondary
  .or(page.getByText('Criar'));                       // Fallback

await button.click();
```

## Working with Forms

### Text Input
```typescript
// Fill text field
const nameField = page
  .locator('input[name="name"]')
  .or(page.getByLabel(/nome|name/i).first());

await nameField.fill('My Space');
```

### Select Dropdown
```typescript
// Select option
const roleSelect = page
  .locator('select[name="role"]')
  .or(page.getByLabel(/role|papel/i));

await roleSelect.selectOption('admin');
```

### Date Field
```typescript
// Fill date
const dateField = page
  .locator('input[type="date"]')
  .first();

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 7);
const dateStr = futureDate.toISOString().split('T')[0];

await dateField.fill(dateStr);
```

### Textarea
```typescript
// Fill textarea
const descField = page
  .locator('textarea[name="description"]')
  .or(page.getByLabel(/description|descrição/i));

await descField.fill('My space description');
```

### Checkbox
```typescript
// Check checkbox
const checkbox = page.locator('input[type="checkbox"]').first();

if (!await checkbox.isChecked()) {
  await checkbox.click();
}
```

## Error Handling

### Try/Catch for Optional Features
```typescript
test('Test with fallback', async ({ authenticatedPage: page }) => {
  try {
    // Try to find element that might not exist
    const optionalButton = page.locator('[data-testid="advanced-feature"]');
    const isVisible = await optionalButton.isVisible();

    if (isVisible) {
      await optionalButton.click();
    }
  } catch {
    // Feature not implemented, test skips gracefully
    console.log('Advanced feature not available');
  }
});
```

### Timeout Management
```typescript
// Wait with custom timeout
await expect(page.getByText('Success')).toBeVisible({
  timeout: 10000  // 10 seconds
});

// Increase test timeout
test('Slow operation', async ({ authenticatedPage: page }) => {
  test.setTimeout(60000); // 60 seconds

  // Long running test
});
```

## Advanced Patterns

### Reusing Space ID
```typescript
let testSpaceId: string;

test.beforeEach(async ({ authenticatedPage: page }) => {
  await navigateToConnections(page);
  await createSpace(page, 'habitat', { name: 'Test' });

  const url = page.url();
  const match = url.match(/\/connections\/habitat\/([\w-]+)/);
  testSpaceId = match ? match[1] : '';
});

test('Use space ID', async ({ authenticatedPage: page }) => {
  if (testSpaceId) {
    await page.goto(`/connections/habitat/${testSpaceId}`);
    // Test space-specific functionality
  }
});
```

### Creating Multiple Spaces
```typescript
test('Create spaces for all archetypes', async ({ authenticatedPage: page }) => {
  const archetypes = ['habitat', 'ventures', 'academia', 'tribo'];

  for (const archetype of archetypes) {
    await navigateToConnections(page);

    await createSpace(page, archetype, {
      name: `Test ${archetype}`,
    });

    // Verify created
    await expect(page).toHaveURL(
      new RegExp(`/connections/${archetype}/.+`)
    );
  }
});
```

### Testing All Options in Loop
```typescript
test('Test each role', async ({ authenticatedPage: page }) => {
  const roles = ['admin', 'member', 'viewer'];

  for (const role of roles) {
    await navigateToConnections(page);

    await addMemberToSpace(page, {
      name: `User ${role}`,
      email: `${role}@example.com`,
      role: role as any
    });

    // Verify role assigned
  }
});
```

## Debugging Tests

### Log Values
```typescript
// Get and log element text
const text = await page.locator('h1').textContent();
console.log('Page heading:', text);

// Log current URL
console.log('Current URL:', page.url());

// Log all visible buttons
const buttons = await page.getByRole('button').allTextContents();
console.log('Available buttons:', buttons);
```

### Visual Debugging
```typescript
// Take screenshot at point in test
await page.screenshot({ path: 'debug-screenshot.png' });

// Pause execution
await page.pause();  // Opens debugger

// Show all element matching selector
const elements = await page.locator('[data-testid*="space"]').all();
console.log(`Found ${elements.length} space elements`);
```

### Check Visibility
```typescript
// Check if element is visible before interacting
const element = page.getByText('My Button');
const isVisible = await element.isVisible().catch(() => false);

if (isVisible) {
  await element.click();
} else {
  console.log('Element not visible, might be in different tab');
}
```

## Creating Custom Helpers

Add to `fixtures.ts`:

```typescript
export async function myCustomHelper(page: Page, param: string) {
  // Custom logic
  const element = page.getByText(param);
  await element.click();
  await page.waitForTimeout(500);
}
```

Use in tests:

```typescript
import { myCustomHelper } from './fixtures';

test('Use custom helper', async ({ authenticatedPage: page }) => {
  await myCustomHelper(page, 'My Text');
});
```

## Performance Tips

1. **Use direct navigation** when you know the URL:
   ```typescript
   await page.goto('/connections/habitat/123');  // Faster
   ```

2. **Combine operations** to reduce waits:
   ```typescript
   // Instead of fill then click
   await field.fill('value');
   await button.click();
   // Better - no wait between
   ```

3. **Use `expect()` instead of manual checks**:
   ```typescript
   // Better - built-in retry logic
   await expect(element).toBeVisible();

   // Avoid - manual polling
   while (!visible) { ... }
   ```

4. **Avoid arbitrary delays**:
   ```typescript
   // ❌ Bad
   await page.waitForTimeout(1000);

   // ✅ Good
   await page.waitForLoadState('networkidle');
   ```

---

That's the fixtures guide! Check out the test files for real-world examples.
