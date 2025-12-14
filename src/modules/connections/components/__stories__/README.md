# Connection Components - Storybook Stories

This directory contains Storybook stories for the main Connection components in the Aica application.

## Overview

These stories demonstrate the visual design and interaction patterns for the Connections module, which manages four distinct archetypes:

- **HABITAT** (🏠): Condomínios e residências - earthy terracotta tones
- **VENTURES** (💼): Projetos e empresas - precise slate/blue tones
- **ACADEMIA** (🎓): Cursos e aprendizado - serene blue/purple tones
- **TRIBO** (👥): Clubes e comunidades - warm amber/emerald tones

## Available Stories

### 1. ConnectionSpaceCard.stories.tsx

Stories for the main connection space card component with archetype-specific styling.

**Key Stories:**
- `Default` - Standard card with all features
- `HabitatVariant` - Habitat archetype with terracotta colors
- `VenturesVariant` - Ventures archetype with blue tones
- `AcademiaVariant` - Academia archetype with purple tones
- `TriboVariant` - Tribo archetype with amber tones
- `WithManyMembers` - Demonstrates member count display
- `SelectedState` - Favorite/starred state
- `CompactVariant` - Compact version for sidebars
- `AllArchetypes` - Comparison of all four archetypes

**Props:**
```typescript
{
  space: ConnectionSpace;
  onClick?: () => void;
  onFavoriteToggle?: () => void;
  variant?: 'default' | 'compact';
  memberCount?: number;
  lastActivity?: string;
}
```

### 2. MemberAvatarStack.stories.tsx

Stories for the overlapping avatar stack component with overflow indicators.

**Key Stories:**
- `Default` - 4 members in medium size
- `SmallSize` - Compact 24px avatars
- `MediumSize` - Standard 32px avatars
- `LargeSize` - Prominent 40px avatars
- `WithOverflow` - Shows "+N more" indicator
- `WithImages` - Avatars with image URLs
- `InitialsOnly` - Fallback to initials
- `SizeComparison` - All three sizes side-by-side
- `UsageScenarios` - Real-world usage examples

**Props:**
```typescript
{
  members: Member[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}
```

### 3. InviteMemberForm.stories.tsx

Stories for the member invitation form with validation and states.

**Key Stories:**
- `Default` - Empty form ready for input
- `WithValidationError` - Shows validation error state
- `LoadingState` - During API call
- `SuccessState` - After successful invite
- `WithoutCancel` - Form without cancel button
- `InteractiveWorkflow` - Full workflow with success/error states
- `InModalContext` - Form inside a modal
- `MultipleInvites` - Tracking multiple invitations
- `ArchetypeContexts` - Form styled for each archetype

**Props:**
```typescript
{
  spaceId: string;
  onInvite: (email: string) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}
```

### 4. SpaceDetailsHeader.stories.tsx

Stories for the space detail page header with archetype-specific accents.

**Key Stories:**
- `Default` - Standard habitat header
- `HabitatHeader` - Terracotta accent band
- `VenturesHeader` - Slate blue accent band
- `AcademiaHeader` - Academic blue accent band
- `TriboHeader` - Emerald accent band
- `WithActions` - All action buttons enabled
- `WithoutBackButton` - No back navigation
- `LargeTeam` - Many members display
- `AllArchetypes` - Comparison of all four archetypes
- `Interactive` - Working button handlers

**Props:**
```typescript
{
  space: ConnectionSpace;
  memberCount: number;
  onSettingsClick?: () => void;
  onInviteClick?: () => void;
  onBackClick?: () => void;
}
```

## Setting Up Storybook

If Storybook is not yet installed, follow these steps:

### 1. Install Storybook

```bash
npx storybook@latest init
```

This will:
- Install Storybook dependencies
- Create `.storybook` configuration
- Add Storybook scripts to `package.json`

### 2. Configure Tailwind CSS

Update `.storybook/preview.ts` to include Tailwind:

```typescript
import '../index.css'; // Your main CSS file with Tailwind

export const parameters = {
  backgrounds: {
    default: 'ceramic',
    values: [
      { name: 'ceramic', value: '#F0EFE9' },
      { name: 'white', value: '#ffffff' },
      { name: 'dark', value: '#1a1a1a' },
    ],
  },
};
```

### 3. Configure React Router (if needed)

If components use React Router hooks, add to `.storybook/preview.tsx`:

```typescript
import { BrowserRouter } from 'react-router-dom';

export const decorators = [
  (Story) => (
    <BrowserRouter>
      <Story />
    </BrowserRouter>
  ),
];
```

### 4. Run Storybook

```bash
npm run storybook
```

This will start Storybook on `http://localhost:6006`.

## Ceramic Design System

All stories follow the Ceramic Design System principles:

### Core Classes
- `ceramic-card` - Raised card with soft shadows
- `ceramic-concave` - Inset/pressed appearance
- `ceramic-inset` - Subtle inset for inputs
- `ceramic-pressed` - Active/pressed state

### Color Tokens
- `ceramic-bg` - Background color (#F0EFE9)
- `ceramic-text-primary` - Primary text color
- `ceramic-text-secondary` - Secondary text color
- `ceramic-accent` - Accent color

### Archetype Colors

Each archetype has distinct color palettes:

**Habitat (🏠):**
- Accent: `#8B4513` (warm brown)
- Light: `#D2691E` (terracotta)
- Classes: `bg-orange-50`, `text-orange-900`, `border-orange-200`

**Ventures (💼):**
- Accent: `#1E3A8A` (deep blue)
- Light: `#3B82F6` (bright blue)
- Classes: `bg-blue-50`, `text-blue-900`, `border-blue-200`

**Academia (🎓):**
- Accent: `#4C1D95` (deep purple)
- Light: `#8B5CF6` (bright purple)
- Classes: `bg-purple-50`, `text-purple-900`, `border-purple-200`

**Tribo (👥):**
- Accent: `#D97706` (amber)
- Light: `#F59E0B` (bright amber)
- Classes: `bg-amber-50`, `text-amber-900`, `border-amber-200`

## Best Practices

### When Writing Stories

1. **Use realistic data** - Create mock data that represents real-world usage
2. **Cover edge cases** - Empty states, overflow, long text, etc.
3. **Interactive examples** - Include working handlers for buttons and actions
4. **Comparison views** - Show variants side-by-side for easy comparison
5. **Context examples** - Show components in realistic page layouts

### Story Organization

Each story file should include:
- Default/primary story
- Variant stories (sizes, states, themes)
- Edge case stories
- Comparison stories
- Interactive/working examples
- Real-world context examples

### Documentation

Use JSDoc comments to explain:
- What the story demonstrates
- Key props being used
- Any special behavior or interactions

Example:
```typescript
/**
 * Habitat archetype - Earthy, grounded aesthetic with terracotta colors
 */
export const HabitatVariant: Story = {
  args: { /* ... */ }
};
```

## Testing with Storybook

### Visual Regression Testing

Stories can be used for visual regression testing with tools like:
- Chromatic
- Percy
- Storybook Test Runner

### Accessibility Testing

Enable the a11y addon in `.storybook/main.ts`:

```typescript
addons: [
  '@storybook/addon-a11y',
  // ... other addons
]
```

### Interaction Testing

Use the `play` function for interaction testing:

```typescript
export const WithInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.getByRole('button');
    await userEvent.click(button);
  },
};
```

## Related Documentation

- [Connection Archetypes Documentation](../../docs/CONNECTION_ARCHETYPES_README.md)
- [Ceramic Design System](../../../../docs/CERAMIC_DESIGN_SYSTEM.md)
- [Component Usage Examples](../ConnectionSpaceCard.examples.tsx)

## Contributing

When adding new components or variants:

1. Create a new `.stories.tsx` file in this directory
2. Follow the existing naming convention
3. Include all relevant variants and edge cases
4. Add JSDoc documentation for each story
5. Update this README with the new story file

## Questions?

For questions or issues with these stories, please refer to:
- [Storybook Documentation](https://storybook.js.org/docs)
- [Connections Module Documentation](../../docs/)
- Project maintainers
