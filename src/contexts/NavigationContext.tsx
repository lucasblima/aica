/**
 * NavigationContext
 *
 * Unified navigation state management for the Aica app.
 * Tracks navigation depth (spatial metaphor) and focused mode (contextual descent).
 *
 * Key Principles:
 * - Depth tracking: 0 = top-level, 1+ = nested views
 * - Focused mode: Hides global navigation (BottomNav) for immersive experiences
 * - Explicit return paths: Never rely on browser history (navigate(-1))
 * - Parent path computation: Always compute parent from current route
 *
 * Usage:
 * ```tsx
 * const { depth, isFocusedMode, enterFocusedMode, exitFocusedMode } = useNavigation();
 *
 * // Enter focused mode (e.g., from a detail view)
 * enterFocusedMode('/connections/habitat');
 *
 * // Exit focused mode and return to parent
 * exitFocusedMode();
 * ```
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationContextValue {
  /** Current navigation depth (0 = top-level, 1+ = nested) */
  depth: number;

  /** Increment navigation depth */
  pushDepth: () => void;

  /** Decrement navigation depth */
  popDepth: () => void;

  /** Whether we're in focused mode (hides BottomNav) */
  isFocusedMode: boolean;

  /** Enter focused mode with explicit return path */
  enterFocusedMode: (returnPath: string) => void;

  /** Exit focused mode and navigate to return path */
  exitFocusedMode: () => void;

  /** Stored return path for back navigation */
  returnPath: string | null;

  /** Compute parent path from current route (never use navigate(-1)) */
  computeParentPath: (currentPath: string) => string;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

/**
 * Navigation Provider
 * Manages global navigation state including depth and focused mode
 */
export function NavigationProvider({ children }: NavigationProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [depth, setDepth] = useState<number>(0);
  const [isFocusedMode, setIsFocusedMode] = useState<boolean>(false);
  const [returnPath, setReturnPath] = useState<string | null>(null);

  /**
   * Increment navigation depth
   */
  const pushDepth = useCallback(() => {
    setDepth(prev => prev + 1);
  }, []);

  /**
   * Decrement navigation depth (minimum 0)
   */
  const popDepth = useCallback(() => {
    setDepth(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Enter focused mode
   * Stores return path and hides global navigation
   */
  const enterFocusedMode = useCallback((path: string) => {
    setIsFocusedMode(true);
    setReturnPath(path);
  }, []);

  /**
   * Exit focused mode
   * Returns to stored path and shows global navigation
   */
  const exitFocusedMode = useCallback(() => {
    setIsFocusedMode(false);

    if (returnPath) {
      navigate(returnPath);
      setReturnPath(null);
    }
  }, [returnPath, navigate]);

  /**
   * Compute parent path from current route
   * This ensures reliable back navigation without browser history
   *
   * Examples:
   * - /connections/habitat/space-123/inventory -> /connections/habitat/space-123
   * - /connections/habitat/space-123 -> /connections/habitat
   * - /connections/habitat -> /connections
   * - /connections -> /
   */
  const computeParentPath = useCallback((currentPath: string): string => {
    // Remove trailing slashes
    const cleanPath = currentPath.replace(/\/$/, '');

    // Split path into segments
    const segments = cleanPath.split('/').filter(s => s.length > 0);

    // If we're at root or only one level deep, return root
    if (segments.length <= 1) {
      return '/';
    }

    // Remove last segment and reconstruct path
    segments.pop();
    return '/' + segments.join('/');
  }, []);

  const value: NavigationContextValue = {
    depth,
    pushDepth,
    popDepth,
    isFocusedMode,
    enterFocusedMode,
    exitFocusedMode,
    returnPath,
    computeParentPath,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Hook to access navigation context
 * Must be used within NavigationProvider
 */
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }

  return context;
}

export default NavigationContext;
