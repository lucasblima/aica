import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SharedResource } from '../types';

interface SharedResourceCardProps {
  resource: SharedResource;
  onReserve?: () => void;
  onReturn?: () => void;
  compact?: boolean;
}

const categoryIcons: Record<string, string> = {
  equipment: '🛠️',
  space: '🏠',
  vehicle: '🚗',
  other: '📦',
};

const categoryLabels: Record<string, string> = {
  equipment: 'Equipamento',
  space: 'Espaço',
  vehicle: 'Veículo',
  other: 'Outro',
};

export const SharedResourceCard: React.FC<SharedResourceCardProps> = ({
  resource,
  onReserve,
  onReturn,
  compact = false,
}) => {
  const isAvailable = resource.isAvailable;
  const hasImage = resource.images && resource.images.length > 0;
  const categoryIcon = categoryIcons[resource.category] || '📦';
  const categoryLabel = categoryLabels[resource.category] || 'Outro';

  if (compact) {
    return (
      <div className="bg-ceramic-base rounded-xl p-3 border border-ceramic-border hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          {/* Icon/Image */}
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#9B4D3A]/20 to-[#9B4D3A]/10 rounded-lg flex items-center justify-center">
            {hasImage ? (
              <img
                src={resource.images[0]}
                alt={resource.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <span className="text-2xl">{categoryIcon}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-ceramic-900 truncate">
              {resource.name}
            </h3>
            <p className="text-xs text-ceramic-600">{categoryLabel}</p>
          </div>

          {/* Status */}
          <div className="flex-shrink-0">
            {isAvailable ? (
              <span className="inline-block w-2 h-2 bg-ceramic-success rounded-full" />
            ) : (
              <span className="inline-block w-2 h-2 bg-ceramic-error rounded-full" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-ceramic-base rounded-2xl overflow-hidden border-2 transition-all ${
        isAvailable
          ? 'border-[#9B4D3A]/20 hover:border-[#9B4D3A]/40 hover:shadow-lg'
          : 'border-ceramic-border'
      }`}
    >
      {/* Image */}
      {hasImage ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={resource.images[0]}
            alt={resource.name}
            className="w-full h-full object-cover"
          />
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-ceramic-base px-4 py-2 rounded-full text-sm font-medium text-ceramic-text-primary">
                Em uso
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-[#9B4D3A]/20 to-[#9B4D3A]/10 flex items-center justify-center">
          <span className="text-6xl">{categoryIcon}</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-ceramic-900 flex-1">
              {resource.name}
            </h3>
            <span className="text-xs px-2 py-1 bg-[#9B4D3A]/10 text-[#9B4D3A] rounded-full">
              {categoryLabel}
            </span>
          </div>
          {resource.description && (
            <p className="text-sm text-ceramic-600 line-clamp-2">
              {resource.description}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isAvailable ? 'bg-ceramic-success' : 'bg-ceramic-error'
            }`}
          />
          <span className="text-sm font-medium text-ceramic-900">
            {isAvailable ? 'Disponível' : 'Em uso'}
          </span>
        </div>

        {/* Current Holder */}
        {!isAvailable && resource.currentHolder && (
          <div className="p-3 bg-ceramic-50 rounded-lg">
            <div className="text-xs font-medium text-ceramic-700 mb-1">
              Em uso por:
            </div>
            <div className="flex items-center gap-2">
              {resource.currentHolder.avatarUrl && (
                <img
                  src={resource.currentHolder.avatarUrl}
                  alt={resource.currentHolder.displayName}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-ceramic-900">
                {resource.currentHolder.displayName}
              </span>
            </div>
            {resource.returnDate && (
              <div className="text-xs text-ceramic-600 mt-1">
                Devolução prevista:{' '}
                {format(new Date(resource.returnDate), "d 'de' MMMM", {
                  locale: ptBR,
                })}
              </div>
            )}
          </div>
        )}

        {/* Usage Notes */}
        {resource.usageNotes && (
          <div className="p-3 bg-ceramic-info/10 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-ceramic-info">ℹ️</span>
              <div>
                <div className="text-xs font-medium text-ceramic-info mb-1">
                  Instruções de uso:
                </div>
                <p className="text-sm text-ceramic-info">{resource.usageNotes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Value */}
        {resource.estimatedValue && (
          <div className="text-sm text-ceramic-600">
            Valor estimado: R$ {resource.estimatedValue.toFixed(2)}
          </div>
        )}

        {/* Action Button */}
        {isAvailable && onReserve && (
          <button
            onClick={onReserve}
            className="w-full py-3 bg-[#9B4D3A] text-white rounded-xl font-medium hover:bg-[#9B4D3A]/90 transition-colors shadow-lg shadow-[#9B4D3A]/20"
          >
            Reservar
          </button>
        )}

        {!isAvailable &&
          onReturn &&
          resource.currentHolder?.userId === 'current-user' && (
            <button
              onClick={onReturn}
              className="w-full py-3 bg-ceramic-success text-white rounded-xl font-medium hover:bg-ceramic-success/90 transition-colors"
            >
              Devolver
            </button>
          )}

        {!isAvailable && !onReturn && (
          <div className="text-center text-sm text-ceramic-500">
            Indisponível no momento
          </div>
        )}
      </div>
    </div>
  );
};
