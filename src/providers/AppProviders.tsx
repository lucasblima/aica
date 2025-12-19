import React from 'react';
import { NavigationProvider } from '../contexts/NavigationContext';

/**
 * AppProviders - Centralized Provider Management
 *
 * Architectural Principle:
 * - NavigationProvider is outermost (global scope)
 * - StudioProvider is scoped to Studio routes (not here)
 * - Future providers should follow scope-based hierarchy
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
   return (
      <NavigationProvider>
         {children}
      </NavigationProvider>
   );
}
