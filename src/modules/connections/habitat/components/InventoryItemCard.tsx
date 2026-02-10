/**
 * INVENTORY ITEM CARD
 * Displays individual inventory item with warranty status
 */

import React from 'react';
import type { InventoryItem } from '../types';

interface InventoryItemCardProps {
  item: InventoryItem;
  onClick?: () => void;
}

const categoryIcons: Record<string, string> = {
  eletrodomestico: '🔌',
  moveis: '🪑',
  eletronicos: '💻',
  decoracao: '🎨',
  ferramentas: '🔧',
  outros: '📦',
};

const statusColors: Record<string, string> = {
  active: 'bg-ceramic-success/15 text-ceramic-success border-ceramic-success/30',
  maintenance: 'bg-ceramic-warning/15 text-ceramic-warning border-ceramic-warning/30',
  sold: 'bg-ceramic-info/15 text-ceramic-info border-ceramic-info/30',
  disposed: 'bg-ceramic-cool text-ceramic-text-primary border-ceramic-border',
  lost: 'bg-ceramic-error/15 text-ceramic-error border-ceramic-error/30',
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  maintenance: 'Manutenção',
  sold: 'Vendido',
  disposed: 'Descartado',
  lost: 'Perdido',
};

export const InventoryItemCard: React.FC<InventoryItemCardProps> = ({ item, onClick }) => {
  // Calculate warranty status
  const warrantyDaysRemaining = item.warranty_expiry
    ? Math.ceil(
        (new Date(item.warranty_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const warrantyExpired = warrantyDaysRemaining !== null && warrantyDaysRemaining < 0;
  const warrantyExpiringSoon = warrantyDaysRemaining !== null && warrantyDaysRemaining <= 30;

  return (
    <div
      className={`bg-ceramic-base border-2 border-ceramic-border rounded-lg p-4 hover:border-amber-300 hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{categoryIcons[item.category || 'outros']}</span>
          <div>
            <h4 className="font-semibold text-ceramic-text-primary line-clamp-1">{item.name}</h4>
            {item.brand && <p className="text-xs text-ceramic-text-secondary">{item.brand}</p>}
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
            statusColors[item.status]
          }`}
        >
          {statusLabels[item.status]}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm text-ceramic-text-secondary mb-3">
        {item.model && (
          <div className="flex items-center gap-2">
            <span className="text-ceramic-text-tertiary">📋</span>
            <span className="line-clamp-1">{item.model}</span>
          </div>
        )}
        {item.room && (
          <div className="flex items-center gap-2">
            <span className="text-ceramic-text-tertiary">📍</span>
            <span className="line-clamp-1">{item.room}</span>
          </div>
        )}
        {item.purchase_date && (
          <div className="flex items-center gap-2">
            <span className="text-ceramic-text-tertiary">📅</span>
            <span>Comprado em {new Date(item.purchase_date).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Warranty Status */}
      {item.warranty_expiry && (
        <div
          className={`mt-3 p-2 rounded-lg border-2 ${
            warrantyExpired
              ? 'bg-ceramic-cool border-ceramic-border'
              : warrantyExpiringSoon
              ? 'bg-ceramic-warning/10 border-ceramic-warning/30'
              : 'bg-ceramic-success/10 border-ceramic-success/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">
              {warrantyExpired ? (
                <span className="text-ceramic-text-secondary">Garantia expirada</span>
              ) : (
                <span className="text-ceramic-text-primary">Garantia</span>
              )}
            </div>
            <div className="text-xs font-semibold">
              {warrantyExpired ? (
                <span className="text-ceramic-text-secondary">
                  {new Date(item.warranty_expiry).toLocaleDateString('pt-BR')}
                </span>
              ) : warrantyExpiringSoon ? (
                <span className="text-ceramic-warning">
                  {warrantyDaysRemaining} {warrantyDaysRemaining === 1 ? 'dia' : 'dias'}
                </span>
              ) : (
                <span className="text-ceramic-success">
                  {new Date(item.warranty_expiry).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Price */}
      {item.purchase_price && (
        <div className="mt-3 pt-3 border-t border-ceramic-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ceramic-text-secondary">Valor de compra</span>
            <span className="font-semibold text-ceramic-text-primary">
              R$ {item.purchase_price.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
