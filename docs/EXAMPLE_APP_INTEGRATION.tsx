/**
 * EXAMPLE: App.tsx Integration with Daily Reports Generation
 *
 * This file shows how to integrate the daily report generation
 * into your existing App.tsx authentication flow.
 *
 * Choose the pattern that matches your current code structure.
 */

// ============================================================================
// PATTERN A: Inline in useEffect (Simplest)
// ============================================================================

/**
 * Use this if you have a single useEffect with onAuthStateChange
 */
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';
import { generateMissingDailyReports } from './services/dailyReportService';

export function AppPatternA() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        if (session?.user) {
          setUser(session.user);

          // Generate missing daily reports (fire-and-forget)
          generateMissingDailyReports(session.user.id)
            .then(result => {
              if (result.success) {
                console.log(`[Daily Reports] Generated ${result.daysGenerated} reports`);
              } else if (result.error) {
                console.warn('[Daily Reports] Generation failed:', result.error);
              }
            })
            .catch(err => console.error('[Daily Reports] Unexpected error:', err));
        }
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        if (session?.user) {
          setUser(session.user);

          // Generate reports on each auth change
          await generateMissingDailyReports(session.user.id)
            .catch(err => console.warn('Daily reports failed:', err));
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) return <LoadingScreen />;

  return user ? <MainApp user={user} /> : <LoginPage />;
}

// ============================================================================
// PATTERN B: Separate Function (Cleaner)
// ============================================================================

/**
 * Use this if you want to keep auth logic separate
 */
async function handleAuthSuccess(user: User) {
  console.log(`[Auth] User logged in: ${user.email}`);

  // Your existing auth logic here...

  // Generate daily reports
  const result = await generateMissingDailyReports(user.id);

  if (result.success) {
    console.log(`[Daily Reports] Ready - ${result.daysGenerated} days updated`);
  } else {
    // Log but don't block - reports are not critical
    console.warn('[Daily Reports] Failed to generate:', result.error);
  }
}

export function AppPatternB() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await handleAuthSuccess(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  return user ? <MainApp user={user} /> : <LoginPage />;
}

// ============================================================================
// PATTERN C: Custom Hook (Most Reusable)
// ============================================================================

/**
 * Custom hook that handles auth + daily reports
 * Import and use: const { user, loading } = useAuthWithDailyReports()
 */
import { useCallback } from 'react';

interface UseAuthWithDailyReportsReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuthWithDailyReports(): UseAuthWithDailyReportsReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Separate function to handle auth state changes
  const handleAuthStateChange = useCallback(async (newUser: User | null) => {
    try {
      setError(null);

      if (newUser) {
        setUser(newUser);

        // Generate daily reports asynchronously
        const result = await generateMissingDailyReports(newUser.id);

        if (!result.success && result.error) {
          // Log error but don't crash app
          console.warn('Daily reports failed:', result.error);
          // Optionally set error state for UI:
          // setError(result.error);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Auth state change error:', errorMsg);
      setError(errorMsg);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        handleAuthStateChange(session?.user || null);
        setLoading(false);
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        await handleAuthStateChange(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [handleAuthStateChange]);

  return { user, loading, error };
}

// Usage:
export function AppPatternC() {
  const { user, loading } = useAuthWithDailyReports();

  if (loading) return <LoadingScreen />;
  return user ? <MainApp user={user} /> : <LoginPage />;
}

// ============================================================================
// PATTERN D: Service Layer (Enterprise)
// ============================================================================

/**
 * Use this if you have a dedicated auth service
 */
class AuthService {
  private currentUser: User | null = null;

  async initialize() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      this.currentUser = session.user;
      await this.onUserLoggedIn(session.user);
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        this.currentUser = session.user;
        await this.onUserLoggedIn(session.user);
      } else {
        this.currentUser = null;
        this.onUserLoggedOut();
      }
    });
  }

  private async onUserLoggedIn(user: User) {
    console.log(`Auth: User logged in ${user.email}`);

    // Generate daily reports
    try {
      const result = await generateMissingDailyReports(user.id);
      console.log(`Daily Reports: ${result.daysGenerated} generated`);
    } catch (err) {
      console.warn('Daily reports failed (non-critical):', err);
    }
  }

  private onUserLoggedOut() {
    console.log('Auth: User logged out');
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}

// Use in App:
const authService = new AuthService();

export function AppPatternD() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    authService.initialize().catch(console.error);
    setUser(authService.getCurrentUser());
  }, []);

  return user ? <MainApp user={user} /> : <LoginPage />;
}

// ============================================================================
// ERROR HANDLING EXAMPLES
// ============================================================================

/**
 * If you want to handle errors more explicitly
 */
export function AppWithErrorHandling() {
  const [user, setUser] = useState<User | null>(null);
  const [dailyReportsError, setDailyReportsError] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);

        try {
          const result = await generateMissingDailyReports(session.user.id);

          if (!result.success) {
            setDailyReportsError(result.error || 'Unknown error');

            // Send error to monitoring (e.g., Sentry)
            // captureException(new Error(result.error));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setDailyReportsError(message);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <>
      {dailyReportsError && (
        <ErrorBanner message={`Failed to load efficiency data: ${dailyReportsError}`} />
      )}
      {user ? <MainApp user={user} /> : <LoginPage />}
    </>
  );
}

// ============================================================================
// RETRY LOGIC EXAMPLE
// ============================================================================

/**
 * If you want to retry generation with exponential backoff
 */
async function generateReportsWithRetry(
  userId: string,
  maxRetries: number = 3
): Promise<boolean> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await generateMissingDailyReports(userId);

      if (result.success) {
        console.log(`Daily reports generated (attempt ${attempt + 1})`);
        return true;
      }

      // If failed but non-critical, don't retry
      if (result.error?.includes('timeout')) {
        // Retry on timeout
        attempt++;
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Don't retry on other errors
        console.warn('Daily reports failed (non-retryable):', result.error);
        return false;
      }
    } catch (err) {
      console.error('Exception generating reports:', err);
      return false;
    }
  }

  return false;
}

// ============================================================================
// MONITORING EXAMPLE
// ============================================================================

/**
 * If you want to track metrics
 */
async function generateReportsWithMetrics(userId: string) {
  const startTime = performance.now();

  try {
    const result = await generateMissingDailyReports(userId);
    const duration = performance.now() - startTime;

    // Send metrics
    // analytics.track('daily_reports_generated', {
    //   userId,
    //   success: result.success,
    //   daysGenerated: result.daysGenerated,
    //   duration,
    //   error: result.error
    // });

    console.log(
      `Daily reports: ${result.success ? 'success' : 'failed'} (${duration.toFixed(0)}ms)`
    );
  } catch (err) {
    const duration = performance.now() - startTime;
    console.error(`Daily reports: exception (${duration.toFixed(0)}ms)`, err);

    // Send error metric
    // analytics.track('daily_reports_error', {
    //   userId,
    //   error: err instanceof Error ? err.message : 'Unknown',
    //   duration
    // });
  }
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * RECOMMENDATION: Start with Pattern A or B
 *
 * Pattern A: Quick integration, minimal changes
 * Pattern B: Cleaner separation of concerns
 * Pattern C: Most reusable across components
 * Pattern D: Enterprise-grade service architecture
 *
 * Key Points:
 * 1. Call generateMissingDailyReports() after user is authenticated
 * 2. Use fire-and-forget (don't wait) to avoid blocking login
 * 3. Handle errors gracefully (log but don't crash)
 * 4. No UI blocking - reports generate in background
 * 5. Reports are ready immediately after login
 */
