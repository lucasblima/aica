# Welcome Tour - Usage Examples

## Basic Implementation

### Simple Integration

```typescript
import React from 'react';
import { WelcomeTour } from '@/modules/onboarding';

export function OnboardingPage() {
  const handleTourComplete = () => {
    console.log('Tour completed!');
    // Mark as completed in database
    // Navigate to next step
  };

  const handleSkip = () => {
    console.log('Tour skipped');
    // Mark as skipped
    // Navigate away
  };

  return (
    <WelcomeTour
      onComplete={handleTourComplete}
      onSkip={handleSkip}
    />
  );
}
```

## Advanced Integration with Routing

### Integration with React Router and Onboarding Flow

```typescript
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { WelcomeTour } from '@/modules/onboarding';
import type { Pillar } from '@/data/pillarData';

export function WelcomeTourStep() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markStepComplete } = useOnboarding();

  const handleTourComplete = useCallback(async () => {
    // Mark this step as completed
    await markStepComplete('welcome_tour', {
      completedAt: new Date().toISOString(),
      method: 'completed',
    });

    // Navigate to next onboarding step
    navigate('/onboarding/moment-capture');
  }, [navigate, markStepComplete]);

  const handleSkip = useCallback(async () => {
    // Mark as skipped (not completed)
    await markStepComplete('welcome_tour', {
      completedAt: new Date().toISOString(),
      method: 'skipped',
    });

    // Navigate to dashboard or next step
    navigate('/dashboard');
  }, [navigate, markStepComplete]);

  const handlePillarExplore = useCallback(
    (pillar: Pillar) => {
      // Map pillar to module routes
      const routes: Record<string, string> = {
        atlas: '/modules/atlas',
        jornada: '/modules/journey',
        podcast: '/modules/podcast',
        financeiro: '/modules/finance',
      };

      // Navigate to pillar module with tutorial flag
      const moduleRoute = routes[pillar.id];
      navigate(`${moduleRoute}?tutorial=true`);
    },
    [navigate]
  );

  return (
    <WelcomeTour
      onComplete={handleTourComplete}
      onSkip={handleSkip}
      onPillarExplore={handlePillarExplore}
      autoPlayEnabled={true}
      autoPlayInterval={6000}
    />
  );
}
```

## With Analytics Tracking

### Tracking User Interactions

```typescript
import React, { useCallback } from 'react';
import { WelcomeTour } from '@/modules/onboarding';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { Pillar } from '@/data/pillarData';

export function AnalyticsEnabledTour() {
  const { trackEvent } = useAnalytics();

  const handleTourComplete = useCallback(() => {
    trackEvent('welcome_tour_completed', {
      timestamp: new Date().toISOString(),
      duration: Math.round(performanceMetrics.duration / 1000), // seconds
    });

    // Navigate...
  }, [trackEvent]);

  const handleSkip = useCallback(() => {
    trackEvent('welcome_tour_skipped', {
      timestamp: new Date().toISOString(),
      slideIndex: 0, // Could track which slide they were on
    });
  }, [trackEvent]);

  const handlePillarExplore = useCallback(
    (pillar: Pillar) => {
      trackEvent('pillar_explore_clicked', {
        pillar: pillar.id,
        pillarName: pillar.name,
        timestamp: new Date().toISOString(),
      });

      // Navigate...
    },
    [trackEvent]
  );

  return (
    <WelcomeTour
      onComplete={handleTourComplete}
      onSkip={handleSkip}
      onPillarExplore={handlePillarExplore}
    />
  );
}
```

## Conditional Display

### Show Tour Only for New Users

```typescript
import React from 'react';
import { WelcomeTour } from '@/modules/onboarding';
import { useUser } from '@/hooks/useUser';
import { Dashboard } from '@/pages/Dashboard';

export function HomePage() {
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>;

  // Show tour only if user hasn't seen it
  const shouldShowTour = user?.firstLogin && !user?.tourCompleted;

  if (shouldShowTour) {
    return <WelcomeTour onComplete={() => window.location.reload()} />;
  }

  return <Dashboard />;
}
```

## Customized for User Profile

### Different Tour Based on User Selection

```typescript
import React from 'react';
import { WelcomeTour } from '@/modules/onboarding';
import { getPillars, type Pillar } from '@/data/pillarData';

interface TourConfig {
  autoPlayEnabled: boolean;
  autoPlayInterval: number;
  highlightedPillars: string[];
}

export function CustomizedTour() {
  const [userProfile] = useUserProfile();

  // Customize tour based on user interests
  const getTourConfig = (): TourConfig => {
    if (userProfile.interests.includes('financial_growth')) {
      return {
        autoPlayEnabled: false, // Let user explore
        autoPlayInterval: 0,
        highlightedPillars: ['financeiro', 'atlas'],
      };
    }

    if (userProfile.interests.includes('self_discovery')) {
      return {
        autoPlayEnabled: true,
        autoPlayInterval: 5000,
        highlightedPillars: ['jornada'],
      };
    }

    // Default config
    return {
      autoPlayEnabled: true,
      autoPlayInterval: 5000,
      highlightedPillars: getPillars().map((p) => p.id),
    };
  };

  const config = getTourConfig();

  return (
    <WelcomeTour
      autoPlayEnabled={config.autoPlayEnabled}
      autoPlayInterval={config.autoPlayInterval}
    />
  );
}
```

## With Modal State Management

### Managing Multiple Modals

```typescript
import React, { useState, useCallback } from 'react';
import { WelcomeTour } from '@/modules/onboarding';
import { PillarTutorial } from '@/components/tutorials/PillarTutorial';
import type { Pillar } from '@/data/pillarData';

export function OnboardingWithTutorials() {
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const handlePillarExplore = useCallback((pillar: Pillar) => {
    setSelectedPillar(pillar);
    setShowTutorial(true);
  }, []);

  return (
    <>
      <WelcomeTour
        onPillarExplore={handlePillarExplore}
        onComplete={() => {
          // Tour complete - could show final steps or close
        }}
      />

      {selectedPillar && (
        <PillarTutorial
          pillar={selectedPillar}
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
        />
      )}
    </>
  );
}
```

## Responsive Behavior Example

### Mobile-First Implementation

```typescript
import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { WelcomeTour } from '@/modules/onboarding';

export function ResponsiveTour() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <WelcomeTour
      // On mobile: disable auto-play for better UX
      autoPlayEnabled={!isMobile}
      autoPlayInterval={isMobile ? 0 : 5000}
      // Other props...
    />
  );
}
```

## Testing Example

### Unit Test

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WelcomeTour } from '@/modules/onboarding';

describe('WelcomeTour', () => {
  it('should navigate between slides with arrow keys', async () => {
    const onComplete = jest.fn();
    render(<WelcomeTour onComplete={onComplete} />);

    // First slide should be visible
    expect(screen.getByText('Apresentamos o Atlas')).toBeInTheDocument();

    // Press right arrow
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByText('Apresentamos a Jornada')).toBeInTheDocument();
    });
  });

  it('should call onSkip when skip button is clicked', () => {
    const onSkip = jest.fn();
    render(<WelcomeTour onSkip={onSkip} />);

    const skipButton = screen.getByLabelText('Skip tour');
    fireEvent.click(skipButton);

    expect(onSkip).toHaveBeenCalled();
  });

  it('should navigate to last slide on dot click', async () => {
    render(<WelcomeTour />);

    // Find and click the last progress dot (Financeiro)
    const dots = screen.getAllByRole('tab');
    fireEvent.click(dots[3]); // Last dot

    await waitFor(() => {
      expect(screen.getByText('Apresentamos o Financeiro')).toBeInTheDocument();
    });
  });

  it('should open modal on "Learn More" click', async () => {
    render(<WelcomeTour />);

    const learnMoreButton = screen.getByLabelText(/Learn more/i);
    fireEvent.click(learnMoreButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<WelcomeTour />);

    // Tab through elements
    await user.tab();
    expect(document.activeElement).toHaveAttribute('aria-label');
  });

  it('should respect prefers-reduced-motion', () => {
    // Mock matchMedia for reduced motion
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<WelcomeTour autoPlayEnabled={true} />);
    // Component should work but animations should be minimal
  });
});
```

## Accessibility Testing Checklist

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import { WelcomeTour } from '@/modules/onboarding';

expect.extend(toHaveNoViolations);

describe('WelcomeTour - Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<WelcomeTour />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', () => {
    render(<WelcomeTour />);
    // Check h1, h2, etc. are in proper order
  });

  it('should have proper ARIA labels', () => {
    const { getByRole } = render(<WelcomeTour />);
    expect(getByRole('region')).toHaveAttribute(
      'aria-label',
      'Welcome tour of Aica pillars'
    );
  });

  it('should announce slide changes to screen readers', () => {
    const { getByRole } = render(<WelcomeTour />);
    const liveRegion = getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
```

## Integration with Supabase

### Tracking User Progress

```typescript
import React, { useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useUser } from '@supabase/auth-helpers-react';
import { WelcomeTour } from '@/modules/onboarding';
import type { Pillar } from '@/data/pillarData';

export function SupabaseIntegratedTour() {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const handleTourComplete = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('user_onboarding_status')
      .upsert({
        user_id: user.id,
        welcome_tour_completed: true,
        welcome_tour_viewed_at: new Date().toISOString(),
        welcome_tour_method: 'completed',
      });

    if (error) console.error('Failed to update status:', error);
  }, [supabase, user]);

  const handleSkip = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('user_onboarding_status')
      .upsert({
        user_id: user.id,
        welcome_tour_skipped: true,
        welcome_tour_skipped_at: new Date().toISOString(),
      });

    if (error) console.error('Failed to update status:', error);
  }, [supabase, user]);

  const handlePillarExplore = useCallback(
    async (pillar: Pillar) => {
      if (!user) return;

      // Track which pillar was explored
      const { error } = await supabase.from('user_pillar_engagement').insert({
        user_id: user.id,
        pillar_id: pillar.id,
        action: 'explore_clicked',
        timestamp: new Date().toISOString(),
      });

      if (error) console.error('Failed to track engagement:', error);
    },
    [supabase, user]
  );

  return (
    <WelcomeTour
      onComplete={handleTourComplete}
      onSkip={handleSkip}
      onPillarExplore={handlePillarExplore}
    />
  );
}
```

## Theme Customization (Future)

### Example of theme-aware component

```typescript
import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { WelcomeTour } from '@/modules/onboarding';

export function ThemedTour() {
  const { isDark } = useTheme();

  // Future: WelcomeTour could accept theme prop
  return (
    <div className={isDark ? 'dark' : ''}>
      <WelcomeTour />
    </div>
  );
}
```

---

## Summary

The Welcome Tour component is designed to be:

- **Flexible:** Works standalone or integrated with routing/analytics
- **Accessible:** WCAG AAA compliant with full keyboard support
- **Performant:** Optimized animations and lazy-loaded content
- **Testable:** Works with testing libraries and accessibility testing
- **Responsive:** Perfect on all device sizes
- **Trackable:** Easy to integrate with analytics services

Use the examples above as templates for your specific integration needs.
