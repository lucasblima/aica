# Storybook Setup Guide - Connection Components

This guide will help you set up and use the Storybook stories created for the Connection components.

## What Was Created

Four comprehensive Storybook story files have been created in `src/modules/connections/components/__stories__/`:

### 1. ConnectionSpaceCard.stories.tsx (9.3 KB)
- **15 stories** covering all archetype variants and states
- Default, Compact, and archetype-specific variants (Habitat, Ventures, Academia, Tribo)
- Edge cases: many members, selected state, activity indicators
- Comparison views: all archetypes, variant comparison

### 2. MemberAvatarStack.stories.tsx (11.3 KB)
- **17 stories** demonstrating avatar display patterns
- Three size variants: sm (24px), md (32px), lg (40px)
- Overflow indicators, image handling, initials fallback
- Real-world usage scenarios in cards

### 3. InviteMemberForm.stories.tsx (13.6 KB)
- **12 stories** showing form states and workflows
- Validation, loading, success, and error states
- Interactive workflows with multiple invites
- Archetype-specific contexts

### 4. SpaceDetailsHeader.stories.tsx (14.9 KB)
- **18 stories** for space detail page headers
- All four archetype variants with distinct accent colors
- Action button configurations
- Content variations and edge cases

**Total: 62 stories** covering the main Connection components with comprehensive examples.

## Installation Steps

### Step 1: Install Storybook

```bash
npx storybook@latest init
```

This will:
- Detect your Vite + React setup
- Install necessary dependencies (`@storybook/react`, `@storybook/addon-*`)
- Create `.storybook/` configuration directory
- Add scripts to `package.json`

### Step 2: Install Required Type Definitions

```bash
npm install --save-dev @storybook/react @storybook/addon-essentials @storybook/addon-interactions @storybook/testing-library
```

### Step 3: Configure Tailwind CSS in Storybook

Create or update `.storybook/preview.ts`:

```typescript
import type { Preview } from "@storybook/react";
import '../index.css'; // Import your main CSS file with Tailwind

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'ceramic',
      values: [
        {
          name: 'ceramic',
          value: '#F0EFE9',
        },
        {
          name: 'white',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
      ],
    },
  },
};

export default preview;
```

### Step 4: Configure Vite Builder

Update `.storybook/main.ts`:

```typescript
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.@(js|jsx|ts|tsx)",
    "../src/**/__stories__/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;
```

### Step 5: Add React Router Support (if needed)

If components use `useNavigate` or other React Router hooks, add to `.storybook/preview.tsx`:

```typescript
import { BrowserRouter } from 'react-router-dom';
import type { Preview } from "@storybook/react";

export const decorators = [
  (Story) => (
    <BrowserRouter>
      <Story />
    </BrowserRouter>
  ),
];

// ... rest of preview config
```

### Step 6: Update package.json Scripts

The init command should have added these, but verify:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### Step 7: Run Storybook

```bash
npm run storybook
```

Storybook will open at `http://localhost:6006`

## Story Coverage

### ConnectionSpaceCard Stories

| Story Name | Description |
|------------|-------------|
| Default | Standard card with all features |
| HabitatVariant | Terracotta colors, earthy aesthetic |
| VenturesVariant | Blue tones, dashboard-like |
| AcademiaVariant | Purple tones, contemplative |
| TriboVariant | Amber tones, warm aesthetic |
| WithManyMembers | Demonstrates member count display |
| SelectedState | Favorite/starred indicator |
| CompactVariant | Sidebar/list version |
| CompactFavorite | Compact with favorite state |
| WithRecentActivity | Activity timestamp display |
| WithoutDescription | Cleaner minimal look |
| WithoutSubtitle | Title only |
| AllArchetypes | Grid comparison of all 4 archetypes |
| VariantComparison | Default vs Compact side-by-side |

### MemberAvatarStack Stories

| Story Name | Description |
|------------|-------------|
| Default | 4 members, medium size |
| SmallSize | 24px avatars |
| MediumSize | 32px avatars (default) |
| LargeSize | 40px avatars |
| WithOverflow | Shows "+5 more" indicator |
| LargeOverflow | Large overflow count |
| SingleMember | No stack needed |
| TwoMembers | Minimal stack |
| WithImages | Avatar URLs instead of initials |
| WithImagesAndOverflow | Images + overflow indicator |
| InitialsOnly | Fallback behavior |
| MixedContent | Some images, some initials |
| Clickable | With onClick handler |
| Empty | No members edge case |
| SizeComparison | All sizes side-by-side |
| MaxVisibleComparison | Different maxVisible values |
| InCardContext | Inside card header |
| UsageScenarios | Real-world examples |

### InviteMemberForm Stories

| Story Name | Description |
|------------|-------------|
| Default | Empty form ready for input |
| WithValidationError | Error state displayed |
| LoadingState | During API call |
| SubmittingState | Spinner animation |
| SuccessState | After successful invite |
| WithoutCancel | No cancel button |
| InteractiveWorkflow | Full workflow demo |
| InModalContext | Form inside modal |
| CustomValidation | Domain blocking example |
| MultipleInvites | Tracking multiple sends |
| StatesComparison | Default vs Loading |
| ArchetypeContexts | All 4 archetype styles |

### SpaceDetailsHeader Stories

| Story Name | Description |
|------------|-------------|
| Default | Standard habitat header |
| HabitatHeader | Terracotta accent band |
| VenturesHeader | Slate blue accent band |
| AcademiaHeader | Academic blue accent band |
| TriboHeader | Emerald accent band |
| WithActions | All buttons enabled |
| WithoutBackButton | No back navigation |
| WithoutActions | View-only mode |
| InviteOnly | Only invite button |
| SettingsOnly | Only settings button |
| LargeTeam | Many members (127) |
| SoloSpace | 1 member only |
| WithoutSubtitle | Minimal content |
| WithoutDescription | Title only |
| LongContent | Text wrapping |
| NewlyCreated | Created today |
| OldSpace | Created years ago |
| AllArchetypes | All 4 archetypes comparison |
| CustomIcons | Different emoji icons |
| Interactive | Working button handlers |
| InPageContext | With content below |

## Ceramic Design System Reference

### Core Classes

```css
/* Elevation States */
.ceramic-card       /* Raised card with soft shadows */
.ceramic-concave    /* Inset/pressed appearance */
.ceramic-inset      /* Subtle inset for inputs */
.ceramic-pressed    /* Active/pressed state */

/* Color Tokens */
.bg-ceramic-bg                  /* Background #F0EFE9 */
.text-ceramic-text-primary      /* Primary text */
.text-ceramic-text-secondary    /* Secondary text */
.text-ceramic-accent            /* Accent color */
```

### Archetype Color Palettes

```typescript
// Habitat (🏠) - Earthy Terracotta
accent: '#8B4513'      // warm brown
light: '#D2691E'       // terracotta
classes: 'bg-orange-50 text-orange-900 border-orange-200'

// Ventures (💼) - Precise Blue
accent: '#1E3A8A'      // deep blue
light: '#3B82F6'       // bright blue
classes: 'bg-blue-50 text-blue-900 border-blue-200'

// Academia (🎓) - Serene Purple
accent: '#4C1D95'      // deep purple
light: '#8B5CF6'       // bright purple
classes: 'bg-purple-50 text-purple-900 border-purple-200'

// Tribo (👥) - Warm Amber
accent: '#D97706'      // amber
light: '#F59E0B'       // bright amber
classes: 'bg-amber-50 text-amber-900 border-amber-200'
```

## Using the Stories

### Viewing Stories

1. Start Storybook: `npm run storybook`
2. Navigate to "Connections" folder in the sidebar
3. Select a component to view its stories
4. Use the Controls panel to adjust props interactively
5. Toggle between Canvas and Docs views

### Testing Components

1. **Visual Testing**: Use stories to verify visual design
2. **Interaction Testing**: Click buttons and test handlers in interactive stories
3. **Responsive Testing**: Resize viewport to test responsive behavior
4. **Accessibility**: Enable a11y addon to check accessibility
5. **State Testing**: Toggle between different states (loading, error, success)

### Documentation

Each story includes:
- **JSDoc comments** explaining what the story demonstrates
- **Args table** showing all available props
- **Source code** for easy copy-paste
- **Controls** for interactive prop adjustment

### Exporting Stories

To generate static Storybook build:

```bash
npm run build-storybook
```

Output will be in `storybook-static/` directory.

## Troubleshooting

### Stories not showing up
- Check that story files end with `.stories.tsx`
- Verify `.storybook/main.ts` stories glob pattern includes `__stories__/` directory
- Restart Storybook server

### Tailwind styles not working
- Ensure `index.css` is imported in `.storybook/preview.ts`
- Check that Tailwind config includes Storybook paths
- Rebuild Storybook

### Type errors
- Install `@storybook/react` types: `npm install --save-dev @storybook/react`
- Ensure `tsconfig.json` includes story files
- Check TypeScript version compatibility

### React Router errors
- Add BrowserRouter decorator to `.storybook/preview.tsx`
- Mock navigation functions if needed

## Additional Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Storybook for React](https://storybook.js.org/docs/react/get-started/introduction)
- [Storybook Addons](https://storybook.js.org/addons)
- [Connection Components README](src/modules/connections/components/__stories__/README.md)

## Next Steps

1. **Install Storybook** using the steps above
2. **Run Storybook** and explore the stories
3. **Customize** stories as needed for your use case
4. **Add more stories** for other Connection components
5. **Integrate with CI/CD** for visual regression testing

## Questions?

For questions or issues:
- Check the [README](src/modules/connections/components/__stories__/README.md) in the `__stories__` directory
- Review [Connection Archetypes Documentation](docs/CONNECTION_ARCHETYPES_README.md)
- Consult the Storybook documentation
