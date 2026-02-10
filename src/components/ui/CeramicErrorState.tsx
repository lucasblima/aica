import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CeramicErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
}

export function CeramicErrorState({
  title = 'Algo deu errado',
  message = 'Tente novamente em alguns instantes.',
  onRetry,
  icon,
}: CeramicErrorStateProps) {
  return (
    <div className="bg-ceramic-error-bg border-l-4 border-ceramic-error rounded-[20px] p-6 space-y-3">
      <div className="flex items-center gap-3">
        {icon || <AlertTriangle className="w-5 h-5 text-ceramic-error flex-shrink-0" />}
        <h3 className="text-ceramic-error font-semibold">{title}</h3>
      </div>
      <p className="text-ceramic-text-secondary text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ceramic-button-secondary text-sm px-4 py-2 mt-2"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
