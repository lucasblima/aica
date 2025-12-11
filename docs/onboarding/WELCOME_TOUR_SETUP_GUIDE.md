# Welcome Tour - Setup & Configuration Guide

This guide walks you through setting up the Welcome Tour in your Aica application.

## Step 1: Import CSS Styles

In your main application file (`main.tsx` or `App.tsx`):

```typescript
import '@/modules/onboarding/styles/welcome-tour.css';
```

Or globally in your CSS/Tailwind config:

```css
@import '@/modules/onboarding/styles/welcome-tour.css';
```

## Step 2: Create the Welcome Tour Page

Create a new file: `src/pages/onboarding/WelcomeTourPage.tsx`

```typescript
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { WelcomeTour } from '@/modules/onboarding';
import type { Pillar } from '@/data/pillarData';

export function WelcomeTourPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markStepComplete } = useOnboarding();

  const handleTourComplete = useCallback(async () => {
    // Mark as completed in database
    await markStepComplete('welcome_tour', {
      method: 'completed',
      completedAt: new Date().toISOString(),
    });

    // Navigate to next phase
    navigate('/onboarding/moment-capture');
  }, [markStepComplete, navigate]);

  const handleSkip = useCallback(async () => {
    // Mark as skipped
    await markStepComplete('welcome_tour', {
      method: 'skipped',
      skippedAt: new Date().toISOString(),
    });

    // Navigate to next phase
    navigate('/onboarding/moment-capture');
  }, [markStepComplete, navigate]);

  const handlePillarExplore = useCallback(
    (pillar: Pillar) => {
      // Navigate to pillar module
      const routes: Record<Pillar['id'], string> = {
        atlas: '/modules/atlas?tutorial=true',
        jornada: '/modules/journey?tutorial=true',
        podcast: '/modules/podcast?tutorial=true',
        financeiro: '/modules/finance?tutorial=true',
      };

      navigate(routes[pillar.id]);
    },
    [navigate]
  );

  return (
    <WelcomeTour
      onComplete={handleTourComplete}
      onSkip={handleSkip}
      onPillarExplore={handlePillarExplore}
      autoPlayEnabled={true}
      autoPlayInterval={5000}
    />
  );
}
```

## Step 3: Add Route

In your router configuration (`src/routes/onboarding.routes.tsx` or similar):

```typescript
import { WelcomeTourPage } from '@/pages/onboarding/WelcomeTourPage';

export const onboardingRoutes = [
  {
    path: 'welcome-tour',
    element: <WelcomeTourPage />,
  },
  // ... other routes
];
```

## Step 4: Update Database Schema

Run this migration in Supabase:

```sql
-- Add welcome_tour columns if they don't exist
ALTER TABLE user_onboarding_status
ADD COLUMN IF NOT EXISTS welcome_tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS welcome_tour_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS welcome_tour_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS welcome_tour_skipped_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_welcome_tour_completed
ON user_onboarding_status(user_id, welcome_tour_completed);
```

## Step 5: Update Onboarding Hook

If you have a `useOnboarding` hook, ensure it handles the welcome_tour step:

```typescript
export function useOnboarding() {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const markStepComplete = useCallback(
    async (step: string, data: Record<string, any>) => {
      if (!user) throw new Error('User not authenticated');

      const updateData = {
        user_id: user.id,
        [`${step}_completed`]: data.method === 'completed',
        [`${step}_skipped`]: data.method === 'skipped',
        [`${step}_completed_at`]: data.completedAt,
        [`${step}_skipped_at`]: data.skippedAt,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_onboarding_status')
        .upsert(updateData);

      if (error) throw error;

      return true;
    },
    [user, supabase]
  );

  return { markStepComplete };
}
```

## Step 6: Configure Analytics (Optional)

If using Google Analytics or similar:

```typescript
const handleTourComplete = useCallback(async () => {
  // Track event
  if (window.gtag) {
    window.gtag('event', 'welcome_tour_completed', {
      user_id: user?.id,
      duration: tourDuration,
    });
  }

  // ... rest of handler
}, []);
```

## Step 7: Test the Integration

### Manual Testing
```bash
# Navigate to the tour
npm run dev
# Open http://localhost:5173/onboarding/welcome-tour
```

### Test Cases
- [ ] Component loads
- [ ] All 4 slides display
- [ ] Navigation works (arrows, dots, keyboard)
- [ ] Skip button works
- [ ] Complete button works
- [ ] Learn More modal opens
- [ ] Explore buttons work
- [ ] Database updates correctly

## Configuration Options

### Auto-play Settings
```typescript
// Always auto-play
<WelcomeTour autoPlayEnabled={true} autoPlayInterval={5000} />

// Never auto-play
<WelcomeTour autoPlayEnabled={false} />

// Conditional auto-play (e.g., desktop only)
const isMobile = useMediaQuery('(max-width: 768px)');
<WelcomeTour autoPlayEnabled={!isMobile} autoPlayInterval={5000} />
```

### Custom Callbacks
```typescript
<WelcomeTour
  onComplete={() => {
    // Do something when tour completes
  }}
  onSkip={() => {
    // Do something when user skips
  }}
  onPillarExplore={(pillar) => {
    // Do something when user explores a pillar
    console.log(`Exploring ${pillar.name}`);
  }}
/>
```

## Environment Variables

Add to `.env` if you want to make settings configurable:

```bash
VITE_WELCOME_TOUR_AUTO_PLAY=true
VITE_WELCOME_TOUR_INTERVAL=5000
VITE_WELCOME_TOUR_ENABLED=true
```

## Tailwind CSS Configuration

Make sure your `tailwind.config.js` includes the necessary utilities:

```javascript
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // The component uses standard Tailwind utilities
      // No special configuration needed
    },
  },
  plugins: [],
};
```

## Troubleshooting

### Styles not applying
- Ensure CSS is imported in main.tsx
- Check browser DevTools for CSS loading
- Verify Tailwind CSS is configured

### Component not rendering
- Check route is correctly configured
- Verify user is authenticated
- Check console for errors
- Ensure all dependencies installed

### Animations not smooth
- Check browser DevTools Performance
- Verify GPU acceleration enabled
- Try different browser
- Check for conflicting CSS

### Navigation not working
- Verify route paths are correct
- Check navigation hook is working
- Test keyboard navigation manually
- Check touch events on mobile

## Performance Optimization

### Code Splitting
```typescript
// Lazy load the welcome tour page
import { lazy, Suspense } from 'react';

const WelcomeTourPage = lazy(() =>
  import('@/pages/onboarding/WelcomeTourPage')
    .then(m => ({ default: m.WelcomeTourPage }))
);

// Use with Suspense
<Suspense fallback={<Loading />}>
  <WelcomeTourPage />
</Suspense>
```

### Preloading
```typescript
// Preload tour on login page
import { preloadComponent } from '@/utils/preload';

preloadComponent(() =>
  import('@/pages/onboarding/WelcomeTourPage')
);
```

## Accessibility Verification

### Keyboard Navigation
- [ ] Tab through all elements
- [ ] Arrow keys navigate slides
- [ ] Enter/Space activates buttons
- [ ] Escape closes modal

### Screen Reader
- [ ] Install NVDA or JAWS
- [ ] Test content is announced
- [ ] Slide changes are announced
- [ ] Modal opening is announced

### Color Contrast
- [ ] Use axe DevTools extension
- [ ] Check all text meets 7:1
- [ ] Verify focus indicators visible

## Quick Reference

### Import Component
```typescript
import { WelcomeTour } from '@/modules/onboarding';
```

### Import Data
```typescript
import { getPillars, PILLARS } from '@/data/pillarData';
```

### Import Types
```typescript
import type { Pillar } from '@/data/pillarData';
import type { TourState, TourCallbacks } from '@/types/welcomeTourTypes';
```

### Minimal Setup
```typescript
// 1. Import CSS (main.tsx)
import '@/modules/onboarding/styles/welcome-tour.css';

// 2. Create page
function WelcomeTourPage() {
  return (
    <WelcomeTour
      onComplete={() => navigate('/next')}
      onSkip={() => navigate('/next')}
    />
  );
}

// 3. Add route
{ path: '/welcome-tour', element: <WelcomeTourPage /> }

// Done!
```

## Next Steps

After setting up the Welcome Tour:

1. Test thoroughly on all browsers and devices
2. Set up analytics tracking
3. Deploy to staging
4. Get team feedback
5. Deploy to production
6. Monitor user behavior

## Support

For detailed information:
- Technical: See `WELCOME_TOUR_IMPLEMENTATION.md`
- Usage: See `WELCOME_TOUR_USAGE_EXAMPLE.md`
- Integration: See `PHASE_2_INTEGRATION.md`
- QA: See `WELCOME_TOUR_QA_CHECKLIST.md`

---

**Setup Time:** ~30 minutes
**Difficulty:** Easy to Moderate
**Status:** ✅ Ready for Production
