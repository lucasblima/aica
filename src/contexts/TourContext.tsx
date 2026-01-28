import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import JoyRide, { ACTIONS, EVENTS, STATUS, type CallBackProps, type Styles, type Step } from 'react-joyride';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('TourContext');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tour step configuration matching react-joyride format
 */
export interface TourStep {
  target: string; // CSS selector or data-tour attribute
  content: React.ReactNode;
  title?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'center' | 'auto';
  disableBeacon?: boolean;
  spotlightClicks?: boolean;
}

/**
 * Tour configuration object
 */
export interface TourConfig {
  key: string; // Unique identifier (e.g., 'atlas-first-visit')
  name: string; // Human readable name
  steps: TourStep[];
  autoStart?: boolean; // Whether to auto-start on first visit
  autoStartDelay?: number; // Delay in ms before auto-starting (default: 500)
  module?: 'atlas' | 'journey' | 'studio' | 'finance' | 'grants' | 'connections' | 'general';
  onComplete?: () => void;
  onSkip?: () => void;
}

/**
 * Tour progress status
 */
export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/**
 * Tour progress record from database
 */
export interface TourProgress {
  id: string;
  user_id: string;
  tour_id: string;
  status: TourStatus;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  current_step: number;
  total_steps: number;
  metadata: Record<string, unknown>;
}

/**
 * Context type
 */
interface TourContextType {
  startTour: (tourKey: string, forceStart?: boolean) => Promise<void>;
  completeTour: (tourKey: string) => Promise<void>;
  skipTour: (tourKey: string) => Promise<void>;
  hasTourCompleted: (tourKey: string) => boolean;
  shouldShowTour: (tourKey: string) => boolean;
  getTourProgress: (tourKey: string) => TourProgress | undefined;
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

// ============================================================================
// DEFAULT STYLES (Digital Ceramic Design System)
// ============================================================================

const DEFAULT_TOUR_STYLES: Partial<Styles> = {
  options: {
    arrowColor: '#FFFBF5',
    backgroundColor: '#FFFBF5',
    primaryColor: '#F59E0B',
    textColor: '#1F2937',
    zIndex: 10000,
  },
  buttonNext: {
    backgroundColor: '#F59E0B',
    borderRadius: '12px',
    color: '#FFFFFF',
    fontSize: '14px',
    padding: '10px 20px',
  },
  buttonBack: {
    color: '#6B7280',
    marginRight: '10px',
  },
  buttonSkip: {
    color: '#9CA3AF',
  },
  tooltip: {
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    padding: '20px',
  },
  tooltipContent: {
    padding: '10px 0',
  },
  spotlight: {
    borderRadius: '12px',
  },
};

export const TourProvider: React.FC<TourProviderProps> = ({ children, tours = [] }) => {
  const [tourProgress, setTourProgress] = useState<Map<string, TourProgress>>(new Map());
  const [activeTourKey, setActiveTourKey] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's tour progress from Supabase on mount
  useEffect(() => {
    const loadTourProgress = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('user_tour_progress')
          .select('*');

        if (fetchError) {
          // Table might not exist yet - that's ok
          if (fetchError.code === '42P01') {
            log.debug('Tour progress table does not exist yet');
            setIsLoading(false);
            return;
          }
          log.error('Failed to load tour progress:', fetchError);
          setError(fetchError.message);
          return;
        }

        if (data) {
          const progressMap = new Map<string, TourProgress>();
          data.forEach((row) => {
            progressMap.set(row.tour_id, row as TourProgress);
          });
          setTourProgress(progressMap);
        }
      } catch (err) {
        log.error('Unexpected error loading tours:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadTourProgress();
  }, []);

  /**
   * Check if a tour has been completed
   */
  const hasTourCompleted = useCallback((tourKey: string): boolean => {
    const progress = tourProgress.get(tourKey);
    return progress?.status === 'completed';
  }, [tourProgress]);

  /**
   * Check if a tour should be shown (not completed or skipped)
   */
  const shouldShowTour = useCallback((tourKey: string): boolean => {
    const progress = tourProgress.get(tourKey);
    if (!progress) return true; // Never started
    return progress.status === 'not_started' || progress.status === 'in_progress';
  }, [tourProgress]);

  /**
   * Get progress for a specific tour
   */
  const getTourProgress = useCallback((tourKey: string): TourProgress | undefined => {
    return tourProgress.get(tourKey);
  }, [tourProgress]);

  /**
   * Start a tour by key
   * @param tourKey - The unique identifier of the tour
   * @param forceStart - If true, start even if tour is already completed (allows re-watching)
   */
  const startTour = useCallback(async (tourKey: string, forceStart?: boolean) => {
    // Don't start if already started
    if (activeTourKey) {
      return;
    }

    // Don't start if already completed or skipped, unless forceStart is true
    if (!forceStart && !shouldShowTour(tourKey)) {
      return;
    }

    const tourConfig = tours.find(t => t.key === tourKey);

    // Record tour start in database (only if user is authenticated)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.rpc('start_tour', {
          p_user_id: user.id,
          p_tour_id: tourKey,
          p_total_steps: tourConfig?.steps.length || 1,
        });
      } else {
        log.debug('Skipping tour DB record - user not authenticated');
      }
    } catch (err) {
      log.error('Error starting tour in database:', err);
    }

    setActiveTourKey(tourKey);
    setCurrentStepIndex(0);
  }, [activeTourKey, shouldShowTour, tours]);

  /**
   * Mark a tour as completed and persist to database
   */
  const completeTour = useCallback(async (tourKey: string) => {
    const tourConfig = tours.find(t => t.key === tourKey);

    try {
      setError(null);

      // Use RPC function for completion (only if user is authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.rpc('complete_tour', {
          p_user_id: user.id,
          p_tour_id: tourKey,
        });
      }

      // Update local state
      setTourProgress(prev => {
        const newMap = new Map(prev);
        const existing = prev.get(tourKey);
        newMap.set(tourKey, {
          id: existing?.id || '',
          user_id: existing?.user_id || '',
          tour_id: tourKey,
          status: 'completed',
          started_at: existing?.started_at || null,
          completed_at: new Date().toISOString(),
          skipped_at: existing?.skipped_at || null,
          current_step: existing?.current_step || 0,
          total_steps: existing?.total_steps || 0,
          metadata: existing?.metadata || {},
        });
        return newMap;
      });

      // Call onComplete callback
      tourConfig?.onComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save tour progress';
      log.error('Error completing tour:', message);
      setError(message);
    } finally {
      setActiveTourKey(null);
      setCurrentStepIndex(0);
    }
  }, [tours]);

  /**
   * Skip a tour and persist to database
   */
  const skipTour = useCallback(async (tourKey: string) => {
    const tourConfig = tours.find(t => t.key === tourKey);

    try {
      setError(null);

      // Use RPC function for skipping (only if user is authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.rpc('skip_tour', {
          p_user_id: user.id,
          p_tour_id: tourKey,
        });
      }

      // Update local state
      setTourProgress(prev => {
        const newMap = new Map(prev);
        const existing = prev.get(tourKey);
        newMap.set(tourKey, {
          id: existing?.id || '',
          user_id: existing?.user_id || '',
          tour_id: tourKey,
          status: 'skipped',
          started_at: existing?.started_at || null,
          completed_at: existing?.completed_at || null,
          skipped_at: new Date().toISOString(),
          current_step: existing?.current_step || 0,
          total_steps: existing?.total_steps || 0,
          metadata: existing?.metadata || {},
        });
        return newMap;
      });

      // Call onSkip callback
      tourConfig?.onSkip?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save tour progress';
      log.error('Error skipping tour:', message);
      setError(message);
    } finally {
      setActiveTourKey(null);
      setCurrentStepIndex(0);
    }
  }, [tours]);

  /**
   * Handle tour callback from react-joyride
   */
  const handleTourCallback = useCallback(
    (data: CallBackProps) => {
      const { action, status, type, index } = data;

      // Handle tour end
      if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
        if (activeTourKey) {
          if (status === STATUS.FINISHED) {
            completeTour(activeTourKey);
          } else if (status === STATUS.SKIPPED) {
            skipTour(activeTourKey);
          }
        }
        return;
      }

      // Handle step changes
      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
          setCurrentStepIndex(prev => prev + 1);
        } else if (action === ACTIONS.PREV) {
          setCurrentStepIndex(prev => Math.max(0, prev - 1));
        }
      }

      // Handle close button
      if (action === ACTIONS.CLOSE && activeTourKey) {
        skipTour(activeTourKey);
      }

      // Update step index in database (fire and forget with proper user_id)
      if (type === EVENTS.STEP_AFTER && activeTourKey) {
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            supabase.rpc('update_tour_step', {
              p_user_id: user.id,
              p_tour_id: activeTourKey,
              p_current_step: index + 1,
            }).catch(err => log.error('Error updating tour step:', err));
          }
        })();
      }
    },
    [activeTourKey, completeTour, skipTour]
  );

  /**
   * Find the active tour configuration
   */
  const activeTourConfig = tours.find(tour => tour.key === activeTourKey);

  const value: TourContextType = {
    startTour,
    completeTour,
    skipTour,
    hasTourCompleted,
    shouldShowTour,
    getTourProgress,
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
          steps={activeTourConfig.steps.map((step): Step => ({
            target: step.target,
            content: step.content,
            title: step.title,
            placement: step.placement,
            disableBeacon: step.disableBeacon,
            spotlightClicks: step.spotlightClicks,
          }))}
          stepIndex={currentStepIndex}
          run={true}
          continuous={true}
          showProgress={true}
          showSkipButton={true}
          disableOverlayClose
          spotlightClicks
          callback={handleTourCallback}
          styles={DEFAULT_TOUR_STYLES}
          locale={{
            back: 'Voltar',
            close: 'Fechar',
            last: 'Concluir',
            next: 'Próximo',
            open: 'Abrir',
            skip: 'Pular tour',
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
