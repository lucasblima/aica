import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { cleanExpiredOAuthParams, suppressExpiredSessionWarnings } from './src/utils/authUrlCleaner';

// Limpa parâmetros OAuth expirados ANTES de inicializar a aplicação
// Isso previne erros do Supabase ao tentar processar tokens expirados
cleanExpiredOAuthParams();

// Suprime warnings esperados sobre sessões expiradas que já estamos tratando
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