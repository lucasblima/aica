import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { cleanExpiredOAuthParams, suppressExpiredSessionWarnings } from './src/utils/authUrlCleaner';
import { validateEnv, logEnvStatus } from './src/lib/envCheck';

// =============================================================================
// ENVIRONMENT VALIDATION
// Validates that required VITE_* environment variables are set.
// This catches configuration issues early in production deployments.
// =============================================================================
const envValidation = validateEnv();

// In development mode, log detailed environment status for debugging
if (import.meta.env.DEV) {
  logEnvStatus();
}

// In production, warn if critical environment variables are missing
if (import.meta.env.PROD && !envValidation.isValid) {
  console.error(
    '%c[AICA] CRITICAL: Production deployment has missing environment variables!',
    'color: red; font-size: 16px; font-weight: bold'
  );
  console.error(
    'This usually means VITE_* variables were not passed during the build process.',
    'Check cloudbuild.yaml and Dockerfile for proper --build-arg configuration.'
  );
}

// Global safety net for uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[AICA] Unhandled promise rejection:', event.reason);
});

// Limpa parametros OAuth expirados ANTES de inicializar a aplicacao
// Isso previne erros do Supabase ao tentar processar tokens expirados
cleanExpiredOAuthParams();

// Suprime warnings esperados sobre sessoes expiradas que ja estamos tratando
suppressExpiredSessionWarnings();

// Cria instância do QueryClient para React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);