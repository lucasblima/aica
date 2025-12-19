import React from 'react';
import { AppProviders } from './src/providers/AppProviders';
import { AppRouter } from './src/router/AppRouter';

/**
 * App - Root Component
 *
 * Architecture:
 * - BrowserRouter: Configured in index.tsx (root entry point)
 * - AppProviders: Manages global context providers (NavigationProvider, etc.)
 * - AppRouter: Handles all routing logic and view rendering
 *
 * Phase C: Architectural Extraction Complete
 * - Providers extracted to src/providers/AppProviders.tsx
 * - Routing logic extracted to src/router/AppRouter.tsx
 * - App.tsx reduced to minimal composition layer
 */
export default function App() {
   return (
      <AppProviders>
         <AppRouter />
      </AppProviders>
   );
}
