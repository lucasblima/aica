import React from 'react';
import { NavigationProvider } from '../contexts/NavigationContext';
import { TourProvider } from '../contexts/TourContext';
import { allTours } from '../config/tours';

// Register cross-module timeline providers (Flux, Finance, Studio) at app startup
import '../modules/agenda/providers/init';

/**
 * AppProviders - Centralized Provider Management
 *
 * Architectural Principle:
 * - TourProvider is next layer (global scope, needs to be high for tour dialogs)
 * - NavigationProvider (global scope)
 * - StudioProvider is scoped to Studio routes (not here)
 * - Future providers should follow scope-based hierarchy
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
   return (
      <TourProvider tours={allTours}>
         <NavigationProvider>
            {children}
         </NavigationProvider>
      </TourProvider>
   );
}
