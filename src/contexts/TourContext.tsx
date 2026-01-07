import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import JoyRide from 'react-joyride';
import { supabase } from '@/services/supabaseClient';

/**
 * Tour step configuration matching react-joyride format
 */
export interface TourStep {
  target: string; // CSS selector or data-tour attribute
  content: string;
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  disableBeacon?: boolean;
}

/**
 * Tour configuration object
 */
export interface TourConfig {
  key: string; // Unique identifier (e.g., 'atlas-first-visit')
  name: string; // Human readable name
  steps: TourStep[];
  autoStart?: boolean; // Whether to auto-start on first visit
}

/**
 * Context type
 */
interface TourContextType {
  startTour: (tourKey: string) => Promise<void>;
  completeTour: (tourKey: string) => Promise<void>;
  hasTourCompleted: (tourKey: string) => boolean;
  activeTourKey: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Create the context
 */
const TourContext = createContext<TourContextType | undefined>(undefined);

/**
 * TourProvider component
 * Wraps the app and manages tour state
 */
export interface TourProviderProps {
  children: ReactNode;
  tours?: TourConfig[];
}

export const TourProvider: React.FC<TourProviderProps> = ({ children, tours = [] }) => {
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());
  const [activeTourKey, setActiveTourKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's completed tours from Supabase on mount
  useEffect(() => {
    const loadCompletedTours = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('user_tour_progress')
          .select('tour_key');

        if (fetchError) {
          console.error('[TourProvider] Failed to load completed tours:', fetchError);
          setError(fetchError.message);
          return;
        }

        if (data) {
          const completed = new Set(data.map(row => row.tour_key));
          setCompletedTours(completed);
        }
      } catch (err) {
        console.error('[TourProvider] Unexpected error loading tours:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCompletedTours();
  }, []);

  /**
   * Check if a tour has been completed
   */
  const hasTourCompleted = useCallback((tourKey: string): boolean => {
    return completedTours.has(tourKey);
  }, [completedTours]);

  /**
   * Start a tour by key
   */
  const startTour = useCallback(async (tourKey: string) => {
    // Don't start if already started or already completed
    if (activeTourKey || hasTourCompleted(tourKey)) {
      return;
    }

    setActiveTourKey(tourKey);
  }, [activeTourKey, hasTourCompleted]);

  /**
   * Mark a tour as completed and persist to database
   */
  const completeTour = useCallback(async (tourKey: string) => {
    try {
      setError(null);

      // Insert tour completion record
      const { error: insertError } = await supabase
        .from('user_tour_progress')
        .insert({
          tour_key: tourKey,
        });

      if (insertError) {
        // Handle unique constraint violation (already completed)
        if (insertError.code === '23505') {
          console.debug('[TourProvider] Tour already completed:', tourKey);
        } else {
          throw insertError;
        }
      }

      // Update local state
      setCompletedTours(prev => new Set([...prev, tourKey]));
      setActiveTourKey(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save tour progress';
      console.error('[TourProvider] Error completing tour:', message);
      setError(message);
    }
  }, []);

  /**
   * Handle tour callback from react-joyride
   */
  const handleTourCallback = useCallback(
    (data: any) => {
      const { action, type, tour } = data;

      // When user finishes or skips the tour
      if (type === 'tour:end' || action === 'skip' || action === 'close') {
        if (activeTourKey) {
          completeTour(activeTourKey);
        }
      }
    },
    [activeTourKey, completeTour]
  );

  /**
   * Find the active tour configuration
   */
  const activeTourConfig = tours.find(tour => tour.key === activeTourKey);

  const value: TourContextType = {
    startTour,
    completeTour,
    hasTourCompleted,
    activeTourKey,
    isLoading,
    error,
  };

  return (
    <TourContext.Provider value={value}>
      {children}

      {/* Render react-joyride if there's an active tour */}
      {activeTourConfig && (
        <JoyRide
          steps={activeTourConfig.steps as any}
          run={true}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          callback={handleTourCallback}
          styles={{
            beaconInner: {
              backgroundColor: '#6B9EFF',
            },
            beaconOuter: {
              backgroundColor: 'rgba(107, 158, 255, 0.2)',
              border: '2px solid #6B9EFF',
            },
            tooltip: {
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              color: '#2d3748',
              fontSize: '14px',
              padding: '12px 16px',
            },
            buttonNext: {
              backgroundColor: '#6B9EFF',
              color: '#fff',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
            },
            buttonSkip: {
              color: '#6B9EFF',
              fontSize: '14px',
            },
          }}
        />
      )}
    </TourContext.Provider>
  );
};

/**
 * Hook to use tour context
 */
export const useTour = (): TourContextType => {
  const context = useContext(TourContext);

  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }

  return context;
};
