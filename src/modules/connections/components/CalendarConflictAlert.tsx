import { useEffect, useState } from 'react';
import { CalendarConflict } from '../services/calendarSyncService';

/**
 * Props for CalendarConflictAlert component
 */
interface CalendarConflictAlertProps {
  conflicts: CalendarConflict[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onClose?: () => void;
  suggestedTimes?: Array<{ start: string; end: string; label: string }>;
  className?: string;
}

/**
 * Alert component for displaying calendar conflicts
 *
 * Features:
 * - Shows list of conflicting events
 * - Displays conflicting time ranges
 * - Shows suggested alternative times
 * - Dismissible alert with clear error messages
 * - Color-coded conflict severity indicators
 *
 * @example
 * ```tsx
 * const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
 *
 * const handleCheckConflicts = async () => {
 *   const foundConflicts = await checkConflicts(startTime, endTime);
 *   setConflicts(foundConflicts);
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleCheckConflicts}>Check Conflicts</button>
 *     <CalendarConflictAlert
 *       conflicts={conflicts}
 *       onClose={() => setConflicts([])}
 *     />
 *   </>
 * );
 * ```
 */
export function CalendarConflictAlert({
  conflicts,
  isLoading = false,
  isError = false,
  error = null,
  onClose,
  suggestedTimes = [],
  className = '',
}: CalendarConflictAlertProps) {
  const [isVisible, setIsVisible] = useState(conflicts.length > 0);

  useEffect(() => {
    setIsVisible(conflicts.length > 0);
  }, [conflicts.length]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`
          bg-ceramic-info-bg border-l-4 border-ceramic-info p-4 rounded
          ${className}
        `}
      >
        <div className="flex items-start">
          <span className="text-2xl mr-3">⏳</span>
          <div>
            <h3 className="text-sm font-medium text-ceramic-info">Verificando conflitos...</h3>
            <p className="text-xs text-ceramic-info/80 mt-1">Aguarde enquanto analisamos seu calendário</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError && error) {
    return (
      <div
        className={`
          bg-ceramic-error-bg border-l-4 border-ceramic-error p-4 rounded
          ${className}
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <span className="text-2xl mr-3">🚨</span>
            <div>
              <h3 className="text-sm font-medium text-ceramic-error">Erro ao verificar conflitos</h3>
              <p className="text-xs text-ceramic-error/80 mt-1">{error.message}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-ceramic-error hover:text-ceramic-error/80 font-bold text-lg leading-none"
            aria-label="Fechar alerta"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // No conflicts
  if (!isVisible || conflicts.length === 0) {
    return null;
  }

  // Calculate conflict severity
  const severityLevel = conflicts.length > 2 ? 'high' : conflicts.length > 0 ? 'medium' : 'low';

  const severityColors = {
    high: 'bg-ceramic-error/10 border-ceramic-error',
    medium: 'bg-ceramic-warning/10 border-ceramic-warning',
    low: 'bg-ceramic-warning/10 border-ceramic-warning',
  };

  const severityIcons = {
    high: '⚠️',
    medium: '⚡',
    low: '⏱️',
  };

  return (
    <div
      className={`
        border-l-4 p-4 rounded
        ${severityColors[severityLevel]}
        ${className}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start flex-1">
          <span className="text-2xl mr-3">{severityIcons[severityLevel]}</span>
          <div>
            <h3 className="text-sm font-bold text-ceramic-text-primary">
              Conflito de horário detectado
            </h3>
            <p className="text-xs text-ceramic-text-secondary mt-1">
              {conflicts.length} evento{conflicts.length > 1 ? 's' : ''} sobrepondo no calendário
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-ceramic-text-secondary hover:text-ceramic-text-primary font-bold text-lg leading-none"
          aria-label="Fechar alerta"
        >
          ×
        </button>
      </div>

      {/* Conflicting Events List */}
      <div className="mt-4 space-y-2 bg-white/60 p-3 rounded border border-ceramic-border">
        <p className="text-xs font-semibold text-ceramic-text-primary uppercase tracking-wide">
          Eventos em conflito
        </p>
        {conflicts.map((conflict) => (
          <div key={conflict.eventId} className="flex items-start space-x-2 text-xs">
            <span className="text-lg flex-shrink-0">📌</span>
            <div className="flex-1">
              <p className="font-medium text-ceramic-text-primary">{conflict.title}</p>
              <p className="text-ceramic-text-secondary">
                {new Date(conflict.starts_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {new Date(conflict.ends_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {conflict.duration_minutes && (
                <p className="text-ceramic-text-secondary">
                  Duração: {conflict.duration_minutes} minutos
                </p>
              )}
            </div>
            <span className="text-xs px-2 py-1 bg-ceramic-cool rounded text-ceramic-text-primary">
              {conflict.source === 'google' ? 'Google' : 'Conexão'}
            </span>
          </div>
        ))}
      </div>

      {/* Suggested Times */}
      {suggestedTimes.length > 0 && (
        <div className="mt-4 bg-white/60 p-3 rounded border border-ceramic-border">
          <p className="text-xs font-semibold text-ceramic-text-primary uppercase tracking-wide mb-2">
            Horários disponíveis sugeridos
          </p>
          <div className="space-y-2">
            {suggestedTimes.map((time, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-xs">
                <span className="text-lg">✓</span>
                <span className="text-ceramic-text-primary">
                  {time.label}:{' '}
                  <span className="font-medium">
                    {new Date(time.start).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(time.end).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Message */}
      <p className="text-xs text-ceramic-text-secondary mt-4 bg-white/40 p-2 rounded">
        Escolha um horário alternativo ou resolva o conflito antes de sincronizar com Google
        Calendar.
      </p>
    </div>
  );
}
