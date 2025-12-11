# Phase 2 - Welcome Tour Integration Guide

## Overview

Phase 2 of the Aica onboarding flow is the **Welcome Tour**, which presents the 4 pillars of the platform in an interactive carousel. This phase occurs after Phase 1 (Contextual Trails) and before Phase 3 (Moment Capture).

## Onboarding Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Phase 0: Authentication & Initial Setup               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Contextual Trails                            │
│  (User selects preferences & interests)                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 2: Welcome Tour ← YOU ARE HERE                  │
│  (Carousel of 4 pillars - Atlas, Jornada, Podcast,    │
│   Financeiro)                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 3: Moment Capture                              │
│  (User records first personal moment)                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 4: Dashboard Navigation                        │
│  (Guided tour of dashboard features)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Main Application                                      │
└─────────────────────────────────────────────────────────┘
```

## Phase 2 Specifications

### Duration
- **Recommended Time:** 2-3 minutes
- **Auto-play per slide:** 5 seconds (can be disabled by user interaction)
- **Expected Path:** All 4 slides + optional modal explorations

### Flow
1. User arrives at Welcome Tour component
2. First slide (Atlas) displays automatically
3. User can:
   - Navigate with arrow keys or buttons
   - Jump to any slide via progress dots
   - Swipe left/right on mobile
   - Click "Learn More" for detailed modal
   - Click "Explore [Pillar]" to navigate to module
   - Click "Skip" to proceed to Phase 3
4. Auto-play continues unless user interacts
5. Last slide shows completion button
6. Completion updates database and navigates to Phase 3

### Success Criteria
- [ ] User completes tour (reaches last slide)
- [ ] OR user explicitly skips tour
- [ ] onboarding_status.welcome_tour_completed is set to true
- [ ] System records completion timestamp
- [ ] Navigation to next phase succeeds

## Integration Implementation

### 1. Routing Setup

Create a new route for the tour step:

```typescript
// src/routes/onboarding.routes.tsx
import { WelcomeTour } from '@/modules/onboarding';

export const onboardingRoutes = [
  {
    path: 'welcome-tour',
    element: <WelcomeTourPage />,
  },
  // ... other phase routes
];
```

### 2. Welcome Tour Page Component

```typescript
// src/pages/onboarding/WelcomeTourPage.tsx
import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { WelcomeTour } from '@/modules/onboarding';
import type { Pillar } from '@/data/pillarData';

export function WelcomeTourPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markStepComplete, stepStatus } = useOnboarding();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
    }
  }, [user, navigate]);

  // Check if this step has already been completed
  useEffect(() => {
    if (stepStatus.welcome_tour?.completed) {
      navigate('/onboarding/moment-capture');
    }
  }, [stepStatus, navigate]);

  const handleTourComplete = useCallback(async () => {
    try {
      // Mark step as complete
      await markStepComplete('welcome_tour', {
        method: 'completed',
        completedAt: new Date().toISOString(),
      });

      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'welcome_tour_completed', {
          user_id: user?.id,
        });
      }

      // Navigate to next phase
      navigate('/onboarding/moment-capture');
    } catch (error) {
      console.error('Failed to complete tour:', error);
      // Allow user to continue anyway
      navigate('/onboarding/moment-capture');
    }
  }, [user, markStepComplete, navigate]);

  const handleSkip = useCallback(async () => {
    try {
      // Mark as skipped
      await markStepComplete('welcome_tour', {
        method: 'skipped',
        skippedAt: new Date().toISOString(),
      });

      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'welcome_tour_skipped', {
          user_id: user?.id,
        });
      }

      // Navigate to next phase
      navigate('/onboarding/moment-capture');
    } catch (error) {
      console.error('Failed to skip tour:', error);
      navigate('/onboarding/moment-capture');
    }
  }, [user, markStepComplete, navigate]);

  const handlePillarExplore = useCallback(
    (pillar: Pillar) => {
      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'pillar_explore_clicked', {
          user_id: user?.id,
          pillar_id: pillar.id,
        });
      }

      // Map pillar to module routes
      const moduleRoutes: Record<Pillar['id'], string> = {
        atlas: '/modules/atlas/dashboard?tutorial=true',
        jornada: '/modules/journey/dashboard?tutorial=true',
        podcast: '/modules/podcast/studio?tutorial=true',
        financeiro: '/modules/finance/dashboard?tutorial=true',
      };

      // Navigate with tutorial flag
      navigate(moduleRoutes[pillar.id]);
    },
    [user, navigate]
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

### 3. Onboarding Hook Integration

Update `useOnboarding` hook to handle tour step:

```typescript
// src/hooks/useOnboarding.ts
export function useOnboarding() {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const markStepComplete = useCallback(
    async (step: string, data: Record<string, any>) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_onboarding_status')
        .upsert({
          user_id: user.id,
          [`${step}_completed`]: data.method === 'completed',
          [`${step}_skipped`]: data.method === 'skipped',
          [`${step}_completed_at`]: data.completedAt,
          [`${step}_skipped_at`]: data.skippedAt,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return true;
    },
    [user, supabase]
  );

  // ... other functions
}
```

### 4. Database Schema

Ensure your Supabase table has these columns:

```sql
-- user_onboarding_status table
CREATE TABLE user_onboarding_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Phase 1: Contextual Trails
  contextual_trails_completed BOOLEAN DEFAULT FALSE,
  contextual_trails_completed_at TIMESTAMPTZ,

  -- Phase 2: Welcome Tour
  welcome_tour_completed BOOLEAN DEFAULT FALSE,
  welcome_tour_skipped BOOLEAN DEFAULT FALSE,
  welcome_tour_completed_at TIMESTAMPTZ,
  welcome_tour_skipped_at TIMESTAMPTZ,

  -- Phase 3: Moment Capture
  moment_capture_completed BOOLEAN DEFAULT FALSE,
  moment_capture_completed_at TIMESTAMPTZ,

  -- Phase 4: Dashboard Navigation
  dashboard_navigation_completed BOOLEAN DEFAULT FALSE,
  dashboard_navigation_completed_at TIMESTAMPTZ,

  -- Overall tracking
  current_phase VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Pillar engagement tracking
CREATE TABLE user_pillar_engagement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar_id VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'explore_clicked', 'learn_more_opened', etc
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_user_pillar (user_id, pillar_id)
);
```

### 5. Environment Variables

Ensure required configs are set:

```bash
# .env
VITE_APP_NAME=Aica
VITE_ANALYTICS_ENABLED=true
VITE_AUTO_PLAY_DURATION=5000
```

## Pillar-Specific Routes

When user clicks "Explore [Pillar]", navigate to:

### Atlas
```
Route: /modules/atlas/dashboard?tutorial=true
Purpose: Show task management dashboard with tutorial overlay
```

### Jornada
```
Route: /modules/journey/dashboard?tutorial=true
Purpose: Show moment journaling interface with tutorial
```

### Podcast
```
Route: /modules/podcast/studio?tutorial=true
Purpose: Show podcast creation studio with tutorial
```

### Financeiro
```
Route: /modules/finance/dashboard?tutorial=true
Purpose: Show finance dashboard with tutorial
```

## Analytics Tracking

Track these events in your analytics system:

```typescript
// Events to track
- 'welcome_tour_started'
- 'welcome_tour_slide_viewed' (with pillar_id)
- 'welcome_tour_learn_more_clicked' (with pillar_id)
- 'welcome_tour_explore_clicked' (with pillar_id)
- 'welcome_tour_completed'
- 'welcome_tour_skipped'
- 'pillar_explore_navigated' (with pillar_id)

// Sample event data
{
  event: 'welcome_tour_slide_viewed',
  timestamp: '2025-12-11T10:30:00Z',
  user_id: 'uuid',
  pillar_id: 'atlas',
  slide_index: 0,
  view_duration: 2500, // milliseconds
}
```

## Error Handling

Handle these scenarios gracefully:

```typescript
// Scenario 1: Database update fails
// Solution: Allow user to continue anyway, retry on next page load

// Scenario 2: User not authenticated
// Solution: Redirect to login page

// Scenario 3: Network offline
// Solution: Cache status locally, sync when online

// Scenario 4: User clicks browser back button
// Solution: Update database as "abandoned" and redirect to current phase
```

## Testing Checklist

- [ ] Navigation to tour page works
- [ ] All 4 slides display correctly
- [ ] Keyboard navigation (arrows) works
- [ ] Touch swipe works on mobile
- [ ] Progress dots navigation works
- [ ] Skip button completes phase
- [ ] Complete button completes phase
- [ ] Learn More modal opens/closes
- [ ] Explore [Pillar] navigates correctly
- [ ] Database updates correctly
- [ ] Auto-play works and stops on interaction
- [ ] Accessibility: Keyboard navigation complete
- [ ] Accessibility: Screen reader announces slides
- [ ] Responsive: Mobile, tablet, desktop
- [ ] Analytics events fired correctly

## Transition to Phase 3

After Phase 2 completion, the flow continues to **Phase 3: Moment Capture**.

The Moment Capture component should:
1. Check if Phase 2 is completed
2. Display an empty state prompting user to record first moment
3. Provide tutorial/guidance for moment creation
4. Allow user to skip if desired

## Troubleshooting

### Tour doesn't appear
- Check routing configuration
- Verify user is authenticated
- Check if step is marked as already completed

### Navigation fails after completion
- Check if navigation path exists
- Verify error handling in onboarding hook
- Check browser console for errors

### Analytics not firing
- Check if Google Analytics is initialized
- Verify gtag events are configured
- Check if events are reaching analytics dashboard

### Accessibility issues
- Run axe accessibility checker
- Test with keyboard only
- Test with screen reader
- Verify color contrast

## Next Steps

1. Implement WelcomeTourPage component
2. Add routes to onboarding flow
3. Update database schema
4. Set up analytics tracking
5. Test all scenarios
6. Deploy and monitor

---

**Status:** Ready for Implementation
**Last Updated:** 2025-12-11
**Version:** 1.0.0
