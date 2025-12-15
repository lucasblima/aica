# Dead End Audit - E2E Test Cases
**Testing Critical Navigation Paths**

---

## Test Setup

### Prerequisites
```bash
# Start application
npm run dev

# Run Playwright tests
npm run test:e2e
npm run test:e2e:ui  # Interactive mode
```

### Test User Data
- Email: `test@example.com`
- Password: `password123`
- Pre-populated associations (Vida Pessoal)
- Pre-populated podcast show

---

## PATH 1: Minha Vida → Association Details

### Test Case 1.1: Back Button from Association Detail
**Objective**: Verify user can return to Minha Vida from association detail without browser back button

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { AssociationPage } from './pages/AssociationPage';

test('should navigate back to Minha Vida when clicking back button from association detail', async ({ page }) => {
  // Arrange
  const login = new LoginPage(page);
  const home = new HomePage(page);
  const association = new AssociationPage(page);

  await login.goto();
  await login.login('test@example.com', 'password123');

  // Verify we're at home
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-testid="minha-vida-header"]')).toBeVisible();

  // Act: Click on first association card
  const firstAssociation = page.locator('[data-testid="association-card"]').first();
  const associationName = await firstAssociation.locator('[data-testid="association-name"]').textContent();
  await firstAssociation.click();

  // Assert: Verify we're in association detail view
  await expect(page.locator('[data-testid="association-detail-header"]')).toBeVisible();
  await expect(page.locator('text=' + associationName)).toBeVisible();

  // Act: Click back button
  const backButton = page.locator('[data-testid="association-back-button"]');
  await expect(backButton).toBeVisible();
  await backButton.click();

  // Assert: Verify we returned to home without browser back
  await expect(page.locator('[data-testid="minha-vida-header"]')).toBeVisible();
  await expect(page.locator('[data-testid="association-detail-header"]')).not.toBeVisible();
});
```

### Test Case 1.2: Multiple Back Navigations
**Objective**: Verify consistent back button behavior across multiple visits

```typescript
test('should maintain correct back navigation through multiple association visits', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Visit first association
  await page.locator('[data-testid="association-card"]').first().click();
  await expect(page.locator('[data-testid="association-detail-header"]')).toBeVisible();

  // Go back
  await page.locator('[data-testid="association-back-button"]').click();
  await expect(page.locator('[data-testid="minha-vida-header"]')).toBeVisible();

  // Visit second association
  await page.locator('[data-testid="association-card"]').nth(1).click();
  await expect(page.locator('[data-testid="association-detail-header"]')).toBeVisible();

  // Go back again
  await page.locator('[data-testid="association-back-button"]').click();
  await expect(page.locator('[data-testid="minha-vida-header"]')).toBeVisible();
});
```

### Test Case 1.3: Bottom Navigation Works from Association Detail
**Objective**: Verify user can switch views via bottom nav from association detail

```typescript
test('should navigate to different view via bottom nav from association detail', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to association detail
  await page.locator('[data-testid="association-card"]').first().click();
  await expect(page.locator('[data-testid="association-detail-header"]')).toBeVisible();

  // Click agenda in bottom nav
  await page.locator('[data-testid="bottom-nav-agenda"]').click();

  // Assert: Verify we're at agenda
  await expect(page.locator('[data-testid="agenda-header"]')).toBeVisible();
});
```

---

## PATH 2: Podcast Wizard Navigation

### Test Case 2.1: Cancel Wizard Without Data
**Objective**: Verify user can cancel empty wizard without confirmation

```typescript
test('should cancel wizard without confirmation when no data entered', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to Podcast Studio
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  await expect(page.locator('[data-testid="podcast-library"]')).toBeVisible();

  // Select a podcast show
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();

  // Verify dashboard
  await expect(page.locator('[data-testid="podcast-dashboard"]')).toBeVisible();

  // Click create episode
  await page.locator('[data-testid="create-episode-button"]').click();

  // Verify wizard modal
  await expect(page.locator('[data-testid="guest-wizard"]')).toBeVisible();

  // Act: Click cancel on step 0 without entering data
  const cancelButton = page.locator('[data-testid="guest-wizard-cancel"]');
  await cancelButton.click();

  // Assert: No confirmation modal should appear
  await expect(page.locator('[data-testid="cancel-confirmation-modal"]')).not.toBeVisible();

  // Assert: Should return to dashboard immediately
  await expect(page.locator('[data-testid="guest-wizard"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="podcast-dashboard"]')).toBeVisible();
});
```

### Test Case 2.2: Cancel Wizard With Data Shows Confirmation
**Objective**: Verify confirmation modal appears when canceling with entered data

```typescript
test('should show confirmation modal when canceling wizard with entered data', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to wizard
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();

  // Enter guest name
  await page.locator('[data-testid="guest-wizard-name"]').fill('John Doe');

  // Act: Try to cancel
  const cancelButton = page.locator('[data-testid="guest-wizard-cancel"]');
  await cancelButton.click();

  // Assert: Confirmation modal should appear
  const confirmationModal = page.locator('[data-testid="cancel-confirmation-modal"]');
  await expect(confirmationModal).toBeVisible();
  await expect(confirmationModal.locator('text=Cancelar cadastro?')).toBeVisible();

  // Options: Confirm or continue editing
  await expect(page.locator('[data-testid="cancel-confirm-yes"]')).toBeVisible();
  await expect(page.locator('[data-testid="cancel-confirm-no"]')).toBeVisible();
});
```

### Test Case 2.3: Confirmation Modal Actions
**Objective**: Verify confirmation modal routes correctly

```typescript
test('should return to wizard when clicking "Continuar editando" in confirmation', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to wizard and enter data
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();
  await page.locator('[data-testid="guest-wizard-name"]').fill('John Doe');

  // Trigger confirmation
  await page.locator('[data-testid="guest-wizard-cancel"]').click();
  await expect(page.locator('[data-testid="cancel-confirmation-modal"]')).toBeVisible();

  // Act: Click "Continuar editando"
  await page.locator('[data-testid="cancel-confirm-no"]').click();

  // Assert: Return to wizard with data preserved
  await expect(page.locator('[data-testid="guest-wizard"]')).toBeVisible();
  await expect(page.locator('[data-testid="guest-wizard-name"]')).toHaveValue('John Doe');
});

test('should return to dashboard when confirming cancel', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to wizard and enter data
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();
  await page.locator('[data-testid="guest-wizard-name"]').fill('John Doe');

  // Trigger and confirm cancel
  await page.locator('[data-testid="guest-wizard-cancel"]').click();
  await page.locator('[data-testid="cancel-confirm-yes"]').click();

  // Assert: Return to dashboard
  await expect(page.locator('[data-testid="guest-wizard"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="podcast-dashboard"]')).toBeVisible();
});
```

### Test Case 2.4: ESC Key Closes Wizard
**Objective**: Verify ESC key triggers appropriate cancel flow

```typescript
test('should show confirmation when pressing ESC with data', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to wizard and enter data
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();
  await page.locator('[data-testid="guest-wizard-name"]').fill('John Doe');

  // Act: Press ESC
  await page.keyboard.press('Escape');

  // Assert: Confirmation modal appears
  await expect(page.locator('[data-testid="cancel-confirmation-modal"]')).toBeVisible();
});

test('should close wizard immediately when pressing ESC without data', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to wizard (no data)
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();

  // Act: Press ESC
  await page.keyboard.press('Escape');

  // Assert: Wizard closes immediately, confirmation doesn't appear
  await expect(page.locator('[data-testid="guest-wizard"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="cancel-confirmation-modal"]')).not.toBeVisible();
});
```

### Test Case 2.5: Wizard Step Back Navigation
**Objective**: Verify user can navigate backwards through wizard steps

```typescript
test('should navigate backwards through wizard steps', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to wizard
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();

  // Step 0: Guest Type - Select Public Figure
  const publicFigureButton = page.locator('[data-testid="guest-type-public-figure"]');
  await publicFigureButton.click();

  // Step 1: Name & Reference
  // Verify step 1 content
  await expect(page.locator('[data-testid="guest-wizard-name"]')).toBeVisible();

  // Act: Go back to step 0
  const backButton = page.locator('[data-testid="guest-wizard-back-step1"]');
  await backButton.click();

  // Assert: Back at step 0
  await expect(publicFigureButton).toBeVisible();
  await expect(page.locator('[data-testid="guest-wizard-name"]')).not.toBeVisible();
});
```

### Test Case 2.6: Wizard Complete Flow
**Objective**: Verify successful wizard completion navigates to pre-production

```typescript
test('should complete wizard and navigate to pre-production', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to wizard
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();

  // Step 0: Select public figure
  await page.locator('[data-testid="guest-type-public-figure"]').click();

  // Step 1: Enter name and search
  await page.locator('[data-testid="guest-wizard-name"]').fill('Eduardo Paes');
  await page.locator('[data-testid="guest-wizard-reference"]').fill('Prefeito do Rio');
  await page.locator('[data-testid="guest-wizard-search"]').click();

  // Wait for search to complete
  await page.waitForTimeout(2000);

  // Step 2: Confirm profile (should auto-select first result)
  await expect(page.locator('[data-testid="guest-profile-card"]').first()).toBeVisible();
  await page.locator('[data-testid="guest-profile-card"]').first().click();

  // Step 3: Theme & Scheduling
  await expect(page.locator('[data-testid="theme-mode-auto"]')).toBeVisible();
  await page.locator('[data-testid="guest-wizard-complete"]').click();

  // Wait for episode creation
  await page.waitForTimeout(2000);

  // Assert: Navigate to pre-production
  await expect(page.locator('[data-testid="podcast-preproduction"]')).toBeVisible();
});
```

---

## PATH 3: Connections Navigation

### Test Case 3.1: Back Button from Archetype List
**Objective**: Verify back button returns to connections home

```typescript
test('should navigate back to connections home from archetype list', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to connections
  await page.locator('[data-testid="bottom-nav-connections"]').click();
  await expect(page.locator('[data-testid="connections-home"]')).toBeVisible();

  // Click on archetype (e.g., Habitat)
  await page.locator('[data-testid="archetype-habitat-card"]').click();

  // Verify we're at archetype list
  await expect(page).toHaveURL('/connections/habitat');
  await expect(page.locator('[data-testid="archetype-list-header"]')).toBeVisible();

  // Act: Click back button
  const backButton = page.locator('[data-testid="connections-back-button"]');
  await expect(backButton).toBeVisible();
  await backButton.click();

  // Assert: Return to connections home
  await expect(page).toHaveURL('/connections');
  await expect(page.locator('[data-testid="connections-home"]')).toBeVisible();
});
```

### Test Case 3.2: Breadcrumb Navigation
**Objective**: Verify breadcrumbs allow jumping between levels

```typescript
test('should navigate using breadcrumbs from archetype list', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to archetype list
  await page.locator('[data-testid="bottom-nav-connections"]').click();
  await page.locator('[data-testid="archetype-habitat-card"]').click();
  await expect(page).toHaveURL('/connections/habitat');

  // Act: Click connections breadcrumb
  const connectionsBreadcrumb = page.locator('[data-testid="breadcrumb-connections"]');
  await expect(connectionsBreadcrumb).toBeVisible();
  await connectionsBreadcrumb.click();

  // Assert: Navigate to connections home
  await expect(page).toHaveURL('/connections');
});
```

### Test Case 3.3: Space Detail Navigation
**Objective**: Verify complete navigation path for space detail

```typescript
test('should navigate to space detail and back correctly', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to archetype list
  await page.locator('[data-testid="bottom-nav-connections"]').click();
  await page.locator('[data-testid="archetype-habitat-card"]').click();

  // Click on first space
  const spaceCard = page.locator('[data-testid="space-card"]').first();
  const spaceName = await spaceCard.locator('[data-testid="space-name"]').textContent();
  await spaceCard.click();

  // Verify we're at space detail
  const spaceUrl = `/connections/habitat/${await page.url().split('/').pop()}`;
  await expect(page).toHaveURL(new RegExp('/connections/habitat/.*'));
  await expect(page.locator('text=' + spaceName)).toBeVisible();

  // Act: Click back button
  const backButton = page.locator('[data-testid="connections-back-button"]');
  await expect(backButton).toBeVisible();
  await backButton.click();

  // Assert: Return to archetype list
  await expect(page).toHaveURL('/connections/habitat');
});
```

### Test Case 3.4: Section Detail Navigation Chain
**Objective**: Verify navigation through all levels from section detail

```typescript
test('should navigate back through all levels from section detail', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to connections → archetype → space
  await page.locator('[data-testid="bottom-nav-connections"]').click();
  await page.locator('[data-testid="archetype-habitat-card"]').click();
  const spaceCard = page.locator('[data-testid="space-card"]').first();
  await spaceCard.click();

  // Navigate to section (e.g., inventory)
  const inventoryLink = page.locator('[data-testid="section-link-inventory"]');
  await expect(inventoryLink).toBeVisible();
  await inventoryLink.click();

  // Verify we're at section detail
  await expect(page).toHaveURL(new RegExp('/connections/habitat/.*/inventory'));
  await expect(page.locator('[data-testid="section-detail-header"]')).toBeVisible();

  // Act: Navigate back step by step
  // Back 1: Section → Space
  const backButton = page.locator('[data-testid="connections-back-button"]');
  await backButton.click();
  await expect(page).toHaveURL(new RegExp('/connections/habitat/[^/]*$'));

  // Back 2: Space → Archetype
  await backButton.click();
  await expect(page).toHaveURL('/connections/habitat');

  // Back 3: Archetype → Home
  await backButton.click();
  await expect(page).toHaveURL('/connections');
});
```

### Test Case 3.5: Breadcrumb Multi-Level Jump
**Objective**: Verify user can jump from section to home via breadcrumbs

```typescript
test('should jump multiple levels using breadcrumbs', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate deep: connections → habitat → space → inventory
  await page.locator('[data-testid="bottom-nav-connections"]').click();
  await page.locator('[data-testid="archetype-habitat-card"]').click();
  await page.locator('[data-testid="space-card"]').first().click();
  await page.locator('[data-testid="section-link-inventory"]').click();

  // Verify we're at section
  await expect(page).toHaveURL(new RegExp('/connections/habitat/.*/inventory'));

  // Act: Click connections breadcrumb to jump directly home
  const connectionsBreadcrumb = page.locator('[data-testid="breadcrumb-connections"]');
  await connectionsBreadcrumb.click();

  // Assert: Jump directly to home
  await expect(page).toHaveURL('/connections');
});
```

### Test Case 3.6: Bottom Navigation Hidden in Focused Modes
**Objective**: Verify bottom nav is hidden at space detail level

```typescript
test('should hide bottom navigation in space detail view', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to connections home
  await page.locator('[data-testid="bottom-nav-connections"]').click();
  await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();

  // Navigate to space detail
  await page.locator('[data-testid="archetype-habitat-card"]').click();
  await page.locator('[data-testid="space-card"]').first().click();

  // Assert: Bottom nav should be hidden
  const bottomNav = page.locator('[data-testid="bottom-nav"]');
  await expect(bottomNav).not.toBeVisible();

  // Back to archetype list
  await page.locator('[data-testid="connections-back-button"]').click();

  // Assert: Bottom nav reappears
  await expect(bottomNav).toBeVisible();
});
```

---

## Accessibility Tests

### Test Case A.1: Keyboard Navigation Through Wizard
**Objective**: Verify wizard is fully navigable via keyboard

```typescript
test('should navigate wizard completely using keyboard', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Open wizard
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();

  // Tab to public figure button and press enter
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // Verify we advanced
  await expect(page.locator('[data-testid="guest-wizard-name"]')).toBeVisible();
});
```

### Test Case A.2: Modal Focus Trap
**Objective**: Verify focus doesn't escape wizard modal

```typescript
test('should keep focus within wizard modal', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Open wizard
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();

  // Get first and last focusable elements in modal
  const focusableElements = await page.locator('[data-testid="guest-wizard"] button, [data-testid="guest-wizard"] input').all();
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Focus last element and press Tab
  await lastElement.focus();
  await page.keyboard.press('Tab');

  // Assert: Focus moved to first element
  const activeElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  await expect(firstElement).toBeFocused();
});
```

### Test Case A.3: ARIA Labels Present
**Objective**: Verify all interactive elements have ARIA labels

```typescript
test('should have accessible labels on back buttons', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to archetype list
  await page.locator('[data-testid="bottom-nav-connections"]').click();
  await page.locator('[data-testid="archetype-habitat-card"]').click();

  // Check back button has label
  const backButton = page.locator('[data-testid="connections-back-button"]');
  const ariaLabel = await backButton.getAttribute('aria-label');

  expect(ariaLabel).toBeTruthy();
  expect(ariaLabel).toMatch(/voltar|back/i);
});
```

---

## Edge Cases & Error Scenarios

### Test Case E.1: Rapid Back Button Clicks
**Objective**: Verify application handles rapid back navigation

```typescript
test('should handle rapid back button clicks', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Navigate to space detail
  await page.locator('[data-testid="bottom-nav-connections"]').click();
  await page.locator('[data-testid="archetype-habitat-card"]').click();
  await page.locator('[data-testid="space-card"]').first().click();

  // Rapidly click back button
  const backButton = page.locator('[data-testid="connections-back-button"]');
  await backButton.click();
  await backButton.click();
  await backButton.click();

  // Should end up at home without errors
  await expect(page).toHaveURL('/connections');
  await expect(page.locator('[data-testid="connections-home"]')).toBeVisible();
});
```

### Test Case E.2: Wizard State After Cancel
**Objective**: Verify wizard state is properly reset after cancel

```typescript
test('should reset wizard state completely after cancel', async ({ page }) => {
  const login = new LoginPage(page);
  await login.login('test@example.com', 'password123');

  // Open wizard and fill some data
  await page.locator('[data-testid="bottom-nav-studio"]').click();
  const podcastCard = page.locator('[data-testid="podcast-show-card"]').first();
  await podcastCard.click();
  await page.locator('[data-testid="create-episode-button"]').click();

  const guestNameInput = page.locator('[data-testid="guest-wizard-name"]');
  await guestNameInput.fill('John Doe');

  // Cancel
  await page.locator('[data-testid="guest-wizard-cancel"]').click();
  await page.locator('[data-testid="cancel-confirm-yes"]').click();

  // Open wizard again
  await page.locator('[data-testid="create-episode-button"]').click();

  // Assert: Wizard starts fresh
  const newGuestNameInput = page.locator('[data-testid="guest-wizard-name"]');
  await expect(newGuestNameInput).toHaveValue('');
});
```

---

## Test Fixture Setup

```typescript
// fixtures.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('test@example.com', 'password123');

    await use(page);
    // Cleanup
    await page.close();
  },
});
```

### Usage:
```typescript
test('example test', async ({ authenticatedPage }) => {
  // authenticatedPage is already logged in
  await expect(authenticatedPage.locator('[data-testid="minha-vida-header"]')).toBeVisible();
});
```

---

## Required Page Object Models

### HomePage
```typescript
export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async selectAssociation(index: number) {
    await this.page.locator('[data-testid="association-card"]').nth(index).click();
  }

  async clickBackButton() {
    await this.page.locator('[data-testid="association-back-button"]').click();
  }
}
```

### ConnectionsPage
```typescript
export class ConnectionsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/connections');
  }

  async selectArchetype(archetype: 'habitat' | 'ventures' | 'academia' | 'tribo') {
    await this.page.locator(`[data-testid="archetype-${archetype}-card"]`).click();
  }

  async selectSpace(index: number) {
    await this.page.locator('[data-testid="space-card"]').nth(index).click();
  }

  async navigateToSection(section: string) {
    await this.page.locator(`[data-testid="section-link-${section}"]`).click();
  }

  async clickBackButton() {
    await this.page.locator('[data-testid="connections-back-button"]').click();
  }

  async clickBreadcrumb(label: string) {
    await this.page.locator(`[data-testid="breadcrumb-${label}"]`).click();
  }
}
```

---

## Data-TestID Checklist

Required data-testid attributes for tests to pass:

### Path 1: Association
- ✅ `[data-testid="association-card"]`
- ✅ `[data-testid="association-name"]`
- ✅ `[data-testid="association-detail-header"]`
- ✅ `[data-testid="association-back-button"]`
- ✅ `[data-testid="minha-vida-header"]`

### Path 2: Podcast Wizard
- ✅ `[data-testid="podcast-library"]`
- ✅ `[data-testid="podcast-show-card"]`
- ✅ `[data-testid="podcast-dashboard"]`
- ✅ `[data-testid="create-episode-button"]`
- ✅ `[data-testid="guest-wizard"]`
- ✅ `[data-testid="guest-wizard-cancel"]`
- ✅ `[data-testid="guest-wizard-back-step1"]`
- ✅ `[data-testid="guest-wizard-name"]`
- ✅ `[data-testid="guest-wizard-reference"]`
- ✅ `[data-testid="guest-wizard-search"]`
- ✅ `[data-testid="guest-wizard-complete"]`
- ✅ `[data-testid="guest-profile-card"]`
- ✅ `[data-testid="guest-type-public-figure"]`
- ✅ `[data-testid="cancel-confirmation-modal"]`
- ✅ `[data-testid="cancel-confirm-yes"]`
- ✅ `[data-testid="cancel-confirm-no"]`
- ✅ `[data-testid="theme-mode-auto"]`
- ✅ `[data-testid="podcast-preproduction"]`

### Path 3: Connections
- ✅ `[data-testid="connections-home"]`
- ✅ `[data-testid="archetype-habitat-card"]`
- ✅ `[data-testid="archetype-ventures-card"]`
- ✅ `[data-testid="archetype-academia-card"]`
- ✅ `[data-testid="archetype-tribo-card"]`
- ✅ `[data-testid="archetype-list-header"]`
- ✅ `[data-testid="space-card"]`
- ✅ `[data-testid="space-name"]`
- ✅ `[data-testid="section-link-inventory"]`
- ✅ `[data-testid="section-link-maintenance"]`
- ✅ `[data-testid="section-link-property"]`
- ✅ `[data-testid="section-detail-header"]`
- ✅ `[data-testid="connections-back-button"]`
- ✅ `[data-testid="breadcrumb-connections"]`
- ✅ `[data-testid="breadcrumb-habitat"]`
- ✅ `[data-testid="bottom-nav"]`
- ✅ `[data-testid="bottom-nav-connections"]`

---

## Test Execution Order

```bash
# Run tests in specific order
npm run test:e2e -- --grep "Path 1"  # Minha Vida tests
npm run test:e2e -- --grep "Path 2"  # Podcast tests
npm run test:e2e -- --grep "Path 3"  # Connections tests
npm run test:e2e -- --grep "accessibility"  # A11y tests
npm run test:e2e -- --grep "edge"  # Edge cases
```

---

**Test Document Version**: 1.0
**Last Updated**: December 14, 2025
**Total Test Cases**: 35+
**Estimated Runtime**: ~45 minutes
