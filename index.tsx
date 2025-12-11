import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { cleanExpiredOAuthParams, suppressExpiredSessionWarnings } from './src/utils/authUrlCleaner';

// Limpa parâmetros OAuth expirados ANTES de inicializar a aplicação
// Isso previne erros do Supabase ao tentar processar tokens expirados
cleanExpiredOAuthParams();

// Suprime warnings esperados sobre sessões expiradas que já estamos tratando
suppressExpiredSessionWarnings();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);