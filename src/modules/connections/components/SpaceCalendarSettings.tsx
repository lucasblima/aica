import { useEffect, useState } from 'react';
import { useCalendarSync } from '../hooks/useCalendarSync';
import { SpaceSyncConfig } from '../services/calendarSyncService';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('SpaceCalendarSettings');

/**
 * Props for SpaceCalendarSettings component
 */
interface SpaceCalendarSettingsProps {
  spaceId: string;
  onSave?: (config: SpaceSyncConfig) => void;
  className?: string;
}

/**
 * Settings component for configuring Google Calendar sync for a Connection Space
 *
 * Features:
 * - Toggle auto-sync on/off
 * - Configure sync interval
 * - Select target Google Calendar
 * - Display last sync status
 * - Save/apply changes
 *
 * @example
 * ```tsx
 * <SpaceCalendarSettings
 *   spaceId="habitat-123"
 *   onSave={(config) => log.debug('Settings saved:', config)}
 * />
 * ```
 */
export function SpaceCalendarSettings({
  spaceId,
  onSave,
  className = '',
}: SpaceCalendarSettingsProps) {
  const { syncStatus, enableAutoSync, disableAutoSync } = useCalendarSync({
    spaceId,
    enabled: true,
  });

  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(
    syncStatus?.auto_sync_enabled ?? false
  );
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(
    syncStatus?.sync_interval_minutes ?? 30
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update state when syncStatus changes
  useEffect(() => {
    if (syncStatus) {
      setIsAutoSyncEnabled(syncStatus.auto_sync_enabled);
      setSyncIntervalMinutes(syncStatus.sync_interval_minutes);
    }
  }, [syncStatus]);

  // Handle auto-sync toggle
  const handleAutoSyncToggle = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (isAutoSyncEnabled) {
        // Disable auto-sync
        await disableAutoSync();
        setIsAutoSyncEnabled(false);
        setSuccessMessage('Auto-sincronização desativada');
      } else {
        // Enable auto-sync with current interval
        await enableAutoSync(syncIntervalMinutes);
        setIsAutoSyncEnabled(true);
        setSuccessMessage('Auto-sincronização ativada');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorMessage(message);
      log.error('[SpaceCalendarSettings] Error toggling auto-sync:', error);
    }
  };

  // Handle sync interval change
  const handleIntervalChange = async (newInterval: number) => {
    try {
      setErrorMessage(null);
      setSyncIntervalMinutes(newInterval);

      // If auto-sync is enabled, update it
      if (isAutoSyncEnabled) {
        setIsSaving(true);
        await enableAutoSync(newInterval);
        setSuccessMessage('Intervalo de sincronização atualizado');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorMessage(message);
      log.error('[SpaceCalendarSettings] Error updating interval:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 p-6
        ${className}
      `}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Configurações de Calendário</h3>
        <p className="text-sm text-gray-600 mt-1">
          Sincronize automaticamente os eventos deste espaço com Google Calendar
        </p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Auto-Sync Toggle */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-gray-900 block">
              Sincronização Automática
            </label>
            <p className="text-xs text-gray-600 mt-1">
              {isAutoSyncEnabled
                ? 'Os eventos serão sincronizados automaticamente em intervalos regulares'
                : 'Ative para sincronizar eventos automaticamente'}
            </p>
          </div>
          <button
            onClick={handleAutoSyncToggle}
            disabled={isSaving}
            className={`
              relative inline-flex h-8 w-14 items-center rounded-full
              transition-colors font-medium
              ${
                isAutoSyncEnabled
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-300 hover:bg-gray-400'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span
              className={`
                inline-block h-6 w-6 transform rounded-full bg-white
                transition-transform
                ${isAutoSyncEnabled ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Sync Interval Settings */}
      {isAutoSyncEnabled && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="text-sm font-semibold text-gray-900 block mb-3">
            Intervalo de Sincronização
          </label>

          <div className="space-y-2">
            {[15, 30, 60, 120].map((minutes) => (
              <label key={minutes} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="sync-interval"
                  value={minutes}
                  checked={syncIntervalMinutes === minutes}
                  onChange={() => handleIntervalChange(minutes)}
                  disabled={isSaving}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-sm text-gray-700">
                  A cada {minutes} minuto{minutes > 1 ? 's' : ''}
                </span>
              </label>
            ))}
          </div>

          <p className="text-xs text-gray-600 mt-3">
            Intervalos menores sincronizam com mais frequência (usa mais bateria e dados)
          </p>
        </div>
      )}

      {/* Last Sync Info */}
      {syncStatus?.last_sync_at && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="text-sm font-semibold text-gray-900 block mb-2">
            Última Sincronização
          </label>
          <p className="text-sm text-gray-600">
            {new Date(syncStatus.last_sync_at).toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {/* Sync Status */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-900 block mb-2">
          Status da Sincronização
        </label>
        <div
          className={`
            inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium
            ${
              isAutoSyncEnabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }
          `}
        >
          <span className="mr-2">
            {isAutoSyncEnabled ? '🟢' : '⚪'}
          </span>
          {isAutoSyncEnabled ? 'Sincronização Ativa' : 'Sincronização Inativa'}
        </div>
      </div>

      {/* Google Calendar Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900 font-medium mb-2">Informações do Google Calendar</p>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>
            • Os eventos serão criados no seu calendário padrão (Primary Calendar)
          </li>
          <li>
            • Cada evento terá um ID único para rastreamento bidirecional
          </li>
          <li>
            • As alterações no espaço sincronizarão com o Google Calendar
          </li>
          <li>
            • O Google Calendar não é o proprietário dos dados, apenas uma cópia
          </li>
        </ul>
      </div>

      {/* Info Text */}
      <p className="text-xs text-gray-500 mt-6">
        Certifique-se de que o Google Calendar está autorizado em suas configurações de conta.
      </p>
    </div>
  );
}
