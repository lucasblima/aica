/**
 * Exemplo de integração do File Search Analytics Dashboard
 *
 * Este arquivo mostra como integrar o dashboard de analytics
 * em diferentes contextos da aplicação.
 */

import React from 'react';
import { FileSearchAnalyticsDashboard } from './FileSearchAnalyticsDashboard';
import { useFileSearchQuickStats } from '../../hooks/useFileSearchAnalytics';

/**
 * EXEMPLO 1: Dashboard completo em uma página dedicada
 *
 * Ideal para Settings ou Admin
 */
export const FileSearchAnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <FileSearchAnalyticsDashboard />
      </div>
    </div>
  );
};

/**
 * EXEMPLO 2: Dashboard em um modal/dialog
 *
 * Útil para exibir stats sem sair da página atual
 */
export const FileSearchAnalyticsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">File Search Analytics</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <FileSearchAnalyticsDashboard className="p-0" />
      </div>
    </div>
  );
};

/**
 * EXEMPLO 3: Card de stats rápidas
 *
 * Pequeno widget para exibir em dashboards ou sidebars
 */
export const FileSearchQuickStatsCard: React.FC<{
  userId?: string;
}> = ({ userId }) => {
  const { totalDocuments, totalCorpora, totalSize, mostUsedModule, isLoading } =
    useFileSearchQuickStats(userId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">File Search</h3>
        <span className="text-2xl">📊</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Documentos</span>
          <span className="text-lg font-bold text-blue-600">{totalDocuments}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Corpus</span>
          <span className="text-lg font-bold text-green-600">{totalCorpora}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Tamanho</span>
          <span className="text-lg font-bold text-purple-600">{totalSize} MB</span>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Módulo mais usado: <span className="font-semibold">{mostUsedModule}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * EXEMPLO 4: Integração no Settings Menu
 *
 * Adicionar link para visualizar analytics
 */
export const FileSearchAnalyticsMenuItem: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const { totalDocuments, isLoading } = useFileSearchQuickStats();

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">📊</span>
        <div>
          <p className="font-medium text-gray-900">File Search Analytics</p>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Carregando...' : `${totalDocuments} documentos indexados`}
          </p>
        </div>
      </div>
      <span className="text-gray-400">→</span>
    </button>
  );
};

/**
 * EXEMPLO 5: Uso em página de módulo específico
 *
 * Exibir stats filtradas por módulo (ex: apenas Grants)
 */
export const ModuleFileSearchStats: React.FC<{
  moduleType: string;
  moduleName: string;
}> = ({ moduleType, moduleName }) => {
  // Você pode criar uma variante do hook que filtra por módulo
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          File Search - {moduleName}
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {moduleType}
        </span>
      </div>

      <p className="text-sm text-gray-600">
        Estatísticas específicas do módulo {moduleName} serão exibidas aqui.
      </p>

      {/* Você pode usar o dashboard completo mas filtrado */}
      <FileSearchAnalyticsDashboard className="mt-4" />
    </div>
  );
};

/**
 * EXEMPLO 6: Integração completa em Settings
 *
 * Como adicionar o dashboard na página de configurações
 */
export const SettingsWithFileSearchAnalytics: React.FC = () => {
  const [showAnalytics, setShowAnalytics] = React.useState(false);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Configurações</h1>

      {/* Outras seções de settings... */}

      {/* Seção de File Search Analytics */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">File Search</h2>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie e visualize estatísticas de busca semântica
            </p>
          </div>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAnalytics ? 'Ocultar' : 'Ver Analytics'}
          </button>
        </div>

        {showAnalytics && (
          <div className="mt-6 border-t pt-6">
            <FileSearchAnalyticsDashboard className="p-0" />
          </div>
        )}
      </div>

      {/* Quick Stats Card como preview */}
      {!showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FileSearchQuickStatsCard />

          {/* Outros cards de stats... */}
        </div>
      )}
    </div>
  );
};

/**
 * INSTRUÇÕES DE USO:
 *
 * 1. Para exibir dashboard completo em uma página:
 *    ```tsx
 *    import { FileSearchAnalyticsDashboard } from './components/fileSearch/FileSearchAnalyticsDashboard';
 *
 *    <FileSearchAnalyticsDashboard />
 *    ```
 *
 * 2. Para exibir dashboard para um usuário específico:
 *    ```tsx
 *    <FileSearchAnalyticsDashboard userId="user-123" />
 *    ```
 *
 * 3. Para card de stats rápidas:
 *    ```tsx
 *    import { FileSearchQuickStatsCard } from './components/fileSearch/FileSearchAnalyticsDashboard.example';
 *
 *    <FileSearchQuickStatsCard userId="user-123" />
 *    ```
 *
 * 4. Para adicionar ao menu de settings:
 *    ```tsx
 *    import { FileSearchAnalyticsMenuItem } from './components/fileSearch/FileSearchAnalyticsDashboard.example';
 *
 *    <FileSearchAnalyticsMenuItem onClick={() => navigate('/analytics')} />
 *    ```
 *
 * 5. Para criar uma página dedicada de analytics:
 *    ```tsx
 *    // Em App.tsx ou routes:
 *    <Route path="/analytics/file-search" element={<FileSearchAnalyticsPage />} />
 *    ```
 */
