/**
 * ShareTargetPage - PWA Share Target Handler
 *
 * Receives files shared from other apps (primarily WhatsApp "Export Chat")
 * via the Web Share Target API. Extracts the file from the FormData POST
 * and redirects to the WhatsApp import tab with the file ready.
 *
 * Flow: WhatsApp → Export → Share → AICA PWA → this page → /contacts?import=shared
 *
 * Related: Issue #211 - Universal Input Funnel, Phase 2
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, AlertCircle } from 'lucide-react';

export const ShareTargetPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleShareTarget() {
    try {
      // The Share Target API sends a POST with multipart/form-data
      // In the service worker, we cache the shared file and redirect here
      // We check for the file in the SW cache or formData

      // For service worker-based approach: read from Cache API
      if ('caches' in window) {
        const cache = await caches.open('share-target-cache');
        const cachedResponse = await cache.match('/share-target-file');

        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          const filename = cachedResponse.headers.get('X-Filename') || 'whatsapp-export.txt';

          // Clean up cache
          await cache.delete('/share-target-file');

          // Store file in sessionStorage reference and navigate
          // We use a global variable since File objects can't be serialized
          (window as any).__sharedWhatsAppFile = new File([blob], filename, { type: blob.type });

          navigate('/contacts?import=shared', { replace: true });
          return;
        }
      }

      // Fallback: if no cached file, redirect to manual import
      navigate('/contacts?tab=import', { replace: true });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar arquivo compartilhado');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleShareTarget();
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-6">
        <div className="ceramic-card p-8 rounded-3xl text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-ceramic-error mx-auto mb-4" />
          <h2 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Erro ao importar
          </h2>
          <p className="text-sm text-ceramic-text-secondary mb-4">{errorMsg}</p>
          <button
            onClick={() => navigate('/contacts?tab=import', { replace: true })}
            className="bg-ceramic-accent text-white px-6 py-3 rounded-xl font-bold"
          >
            Importar manualmente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ceramic-base flex items-center justify-center p-6">
      <div className="ceramic-card p-8 rounded-3xl text-center max-w-sm">
        <Loader2 className="w-12 h-12 animate-spin text-ceramic-accent mx-auto mb-4" />
        <h2 className="text-lg font-bold text-ceramic-text-primary mb-2">
          Recebendo arquivo...
        </h2>
        <p className="text-sm text-ceramic-text-secondary">
          Preparando importação da conversa do WhatsApp
        </p>
      </div>
    </div>
  );
};

export default ShareTargetPage;
