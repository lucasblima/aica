import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './src/providers/AppProviders';
import { AppRouter } from './src/router/AppRouter';

/**
 * App - Root Component
 *
 * Architecture:
 * - BrowserRouter: Enables React Router
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
      <BrowserRouter>
         <AppProviders>
            <AppRouter />
         </AppProviders>
      </BrowserRouter>
   );
}
