/**
 * FileSearchAnalyticsView - Página dedicada para Analytics do File Search
 *
 * View standalone que pode ser usada em:
 * - Modal/Dialog
 * - Página dedicada
 * - Seção dentro de Settings
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { FileSearchAnalyticsDashboard } from './FileSearchAnalyticsDashboard';

export interface FileSearchAnalyticsViewProps {
  /** Callback para voltar */
  onBack?: () => void;
  /** ID do usuário (opcional, usa contexto se não fornecido) */
  userId?: string;
  /** Modo de exibição */
  mode?: 'fullpage' | 'embedded';
}

export const FileSearchAnalyticsView: React.FC<FileSearchAnalyticsViewProps> = ({
  onBack,
  userId,
  mode = 'fullpage',
}) => {
  if (mode === 'embedded') {
    // Modo embedded: sem header, apenas dashboard
    return (
      <div className="p-6">
        <FileSearchAnalyticsDashboard userId={userId} />
      </div>
    );
  }

  // Modo fullpage: com header e navegação
  return (
    <div className="min-h-screen bg-[#F0EFE9]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E3DC] px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-[#EBE9E4] transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ceramic-text-primary">
              File Search Analytics
            </h1>
            <p className="text-sm text-ceramic-text-secondary">
              Estatísticas e métricas de uso do sistema de busca semântica
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        <FileSearchAnalyticsDashboard userId={userId} />
      </main>
    </div>
  );
};

export default FileSearchAnalyticsView;
