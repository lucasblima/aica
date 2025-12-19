# Empty States Guide - Law of Guidance

This document establishes the pattern for creating warm, inviting empty states across the Aica platform.

## Philosophy

**An empty state is not a void; it is a call to action.**

Empty states should feel warm and inviting, never cold or dead-end. They represent an opportunity to guide users toward meaningful action.

## Design Principles

### 1. Warm & Inviting
- Use ceramic design system styling (ceramic-tray, ceramic-inset)
- Include welcoming language that speaks to user aspirations
- Animate elements smoothly to create delight

### 2. Always Provide a Call-to-Action
- Primary CTA is **mandatory** - it must guide users to create/add content
- Secondary CTA is optional - it may suggest exploration or navigation
- CTAs should feel "inevitable" - the natural next step in the user's journey

### 3. Visual Hierarchy
- Use ceramic-inset for icon containers (creates tactile depth)
- Use ceramic-tray for larger container areas
- Icons should be large (80-120px) and contextual
- Headlines should be bold and clear

### 4. Contextual Messaging
- Acknowledge the current state ("Sem registros hoje")
- Suggest the next action ("Registre um momento para começar")
- Keep tone warm and supportive

## Implementation Pattern

### Using EmptyState Component

The reusable `EmptyState` component provides four preset types:

```tsx
import { EmptyState } from '@/components/EmptyState';

// New user onboarding
<EmptyState
  type="new_user"
  onPrimaryAction={() => createMoment()}
  onSecondaryAction={() => learnMore()}
/>

// No data for current day
<EmptyState
  type="no_data_today"
  onPrimaryAction={() => captureNow()}
/>

// Insufficient data for analytics
<EmptyState
  type="insufficient_data"
  onPrimaryAction={() => captureNow()}
/>

// No data in selected period
<EmptyState
  type="no_data_period"
  selectedDays={30}
  onPrimaryAction={() => changePeriod()}
  onSecondaryAction={() => captureNow()}
/>

// Custom empty state
<EmptyState
  type="custom"
  customTitle="Sua Biblioteca Está Vazia"
  customMessage="Comece adicionando seus primeiros materiais de aprendizagem"
  primaryCTALabel="Adicionar Primeiro Item"
  onPrimaryAction={() => createItem()}
  useCeramicInset={true}
/>
```

### Custom Implementation

For custom empty states not covered by presets, follow this pattern:

```tsx
<motion.div
  className="ceramic-tray p-8 text-center"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {/* Icon Section - Ceramic Inset */}
  <motion.div
    className="ceramic-inset w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-blue-50"
    initial={{ scale: 0.8 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
  >
    <YourIcon className="w-10 h-10 text-ceramic-accent" />
  </motion.div>

  {/* Content */}
  <h2 className="text-2xl font-black text-ceramic-text-primary text-etched mb-3">
    Main Headline
  </h2>
  <p className="text-base text-ceramic-text-secondary max-w-md mx-auto mb-8">
    Supporting message that contextualizes the empty state
  </p>

  {/* Primary CTA - Required */}
  <motion.button
    onClick={handlePrimaryAction}
    className="ceramic-card px-6 py-3 text-base font-bold text-white bg-ceramic-accent hover:scale-105 active:scale-95 transition-transform inline-flex items-center gap-2"
  >
    <PlusIcon className="w-5 h-5" />
    Clear Action Label
  </motion.button>

  {/* Secondary CTA - Optional */}
  <button
    onClick={handleSecondaryAction}
    className="ceramic-card ml-3 px-6 py-3 text-base font-bold text-ceramic-accent border-2 border-ceramic-accent/20 hover:scale-105 active:scale-95 transition-transform"
  >
    Alternative Action
  </button>
</motion.div>
```

## Ceramic Design System Integration

### Key Classes to Use

1. **ceramic-tray** - Container for empty state (inset effect)
   - Use as wrapper for entire empty state
   - Creates receptive, depressed surface

2. **ceramic-inset** - For icon containers
   - Pill-shaped (border-radius: 9999px)
   - Creates interactive, tactile feeling
   - Good for 20px - 120px containers

3. **ceramic-card** - For CTA buttons
   - Elevated, pressable appearance
   - Good visual feedback on interaction

### Color Palette

Use contextual colors for icons:
- Blue (#667eea or #1e40af) - Default, information
- Green (#10b981) - Success, completion
- Amber (#f59e0b) - Caution, pending
- Purple (#8b5cf6) - Special, highlighted

```css
/* Custom accent colors */
.ceramic-inset.bg-blue-50 { /* Light background */ }
.ceramic-accent { /* Primary call-to-action color */ }
```

## Interaction Design

### Animations

1. **Container entrance** - Fade in + slight up movement
   ```tsx
   initial={{ opacity: 0, y: 20 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.5 }}
   ```

2. **Icon animation** - Spring bounce entrance
   ```tsx
   initial={{ scale: 0.8 }}
   animate={{ scale: 1 }}
   transition={{ type: 'spring', stiffness: 200, damping: 20 }}
   ```

3. **Button interactions**
   - Hover: `scale-105` + lifted shadow
   - Active: `scale-95` + pressed state
   - Focus: Visible outline for accessibility

### Hover States

CTA buttons should provide visual feedback:

```tsx
className="hover:scale-105 active:scale-95 transition-transform"
// or
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

## Accessibility Requirements

### ARIA Labels
- All empty state containers should have `role="status"` and `aria-live="polite"`
- Buttons must have descriptive `aria-label` attributes
- Icon containers should have `aria-hidden="true"` if decorative

### Keyboard Navigation
- All CTAs must be keyboard accessible (Tab key)
- Focus indicators must be visible
- Click handlers must work for both click and Enter/Space keys

### Color Contrast
- Text must meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Ceramic design system colors already meet this standard
- Test with high contrast mode enabled

### Motion Preferences
- Respect `prefers-reduced-motion` media query
- Disable animations for users who request reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

## Common Empty State Scenarios

### 1. First Time User (New User Onboarding)
- **Title**: "Comece sua jornada"
- **Message**: "Registre seu primeiro momento e acompanhe sua evolução"
- **Primary CTA**: "Registrar momento"
- **Secondary CTA**: "Conhecer sistema"
- **Icon**: Sparkles, TrendingUp
- **Color**: Blue or purple

### 2. No Activity Today
- **Title**: "Sem registros hoje"
- **Message**: "Registre um momento e evolua"
- **Primary CTA**: "Registrar momento"
- **Secondary CTA**: "Ver histórico"
- **Icon**: Plus, Calendar
- **Color**: Green (hopeful)

### 3. Insufficient Data (Analytics)
- **Title**: "Poucos dados"
- **Message**: "Mínimo 2 dias para ver tendências"
- **Primary CTA**: "Registrar momento"
- **Icon**: TrendingUp, BarChart
- **Color**: Amber (caution)

### 4. No Data in Filter/Period
- **Title**: "Sem dados"
- **Message**: "Sem registros neste período"
- **Primary CTA**: "Mudar período"
- **Secondary CTA**: "Registrar momento"
- **Icon**: Calendar, Search
- **Color**: Purple (informational)

### 5. Collection Empty (Lists, Grids)
- **Title**: "Nenhum [item] ainda"
- **Message**: "Crie seu primeiro [item] para começar"
- **Primary CTA**: "Criar [item]"
- **Icon**: Plus, category icon
- **Color**: Contextual

## Implementation Checklist

When implementing an empty state, ensure:

- [ ] Empty state container uses `ceramic-tray` or custom ceramic styling
- [ ] Icon uses `ceramic-inset` container for tactile appearance
- [ ] Primary CTA is always present and obvious
- [ ] Secondary CTA is optional but helpful when relevant
- [ ] All text is warm and supportive in tone
- [ ] Animations are smooth but not distracting
- [ ] Component is responsive (mobile/tablet/desktop)
- [ ] ARIA labels and roles are present
- [ ] Color contrast meets WCAG AA
- [ ] Focus states are visible
- [ ] Reduced motion preferences are respected
- [ ] Component tested with keyboard navigation

## Files Updated

1. **src/components/EmptyState.tsx** - Enhanced with ceramic support
2. **src/components/EmptyState.css** - Added ceramic integration styles
3. **src/modules/connections/views/ConnectionsView.tsx** - Improved empty states
4. **src/modules/podcast/views/PodcastDashboard.tsx** - Added ceramic empty state

## Testing Empty States

### Visual Testing
```tsx
// Use EmptyStateDemoPage from EmptyState.example.tsx
import { EmptyStateDemoPage } from '@/components/EmptyState.example';

// Renders all 4 empty state types for comparison
<EmptyStateDemoPage />
```

### Accessibility Testing
- Use screen reader (NVDA, JAWS) to verify ARIA labels
- Test keyboard navigation with Tab key
- Verify focus indicators are visible
- Check color contrast with Lighthouse or WAVE

### Responsive Testing
- Test on mobile (320px, 375px)
- Test on tablet (768px, 1024px)
- Test on desktop (1440px+)
- Verify layouts don't break

## Future Enhancements

1. **Progressive disclosure** - Show optional secondary actions only on hover
2. **Contextual help** - Link to relevant documentation
3. **Illustration animations** - SVG illustrations with custom animations
4. **Smart suggestions** - AI-powered recommendations for next actions
5. **Skeleton states** - Smooth loading to empty state transitions
