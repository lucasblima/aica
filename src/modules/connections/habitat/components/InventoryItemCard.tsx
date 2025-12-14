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
  active: 'bg-green-100 text-green-800 border-green-300',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  sold: 'bg-blue-100 text-blue-800 border-blue-300',
  disposed: 'bg-gray-100 text-gray-800 border-gray-300',
  lost: 'bg-red-100 text-red-800 border-red-300',
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
      className={`bg-white border-2 border-stone-200 rounded-lg p-4 hover:border-amber-300 hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{categoryIcons[item.category || 'outros']}</span>
          <div>
            <h4 className="font-semibold text-stone-800 line-clamp-1">{item.name}</h4>
            {item.brand && <p className="text-xs text-stone-500">{item.brand}</p>}
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
      <div className="space-y-1 text-sm text-stone-600 mb-3">
        {item.model && (
          <div className="flex items-center gap-2">
            <span className="text-stone-400">📋</span>
            <span className="line-clamp-1">{item.model}</span>
          </div>
        )}
        {item.room && (
          <div className="flex items-center gap-2">
            <span className="text-stone-400">📍</span>
            <span className="line-clamp-1">{item.room}</span>
          </div>
        )}
        {item.purchase_date && (
          <div className="flex items-center gap-2">
            <span className="text-stone-400">📅</span>
            <span>Comprado em {new Date(item.purchase_date).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Warranty Status */}
      {item.warranty_expiry && (
        <div
          className={`mt-3 p-2 rounded-lg border-2 ${
            warrantyExpired
              ? 'bg-gray-50 border-gray-200'
              : warrantyExpiringSoon
              ? 'bg-orange-50 border-orange-200'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">
              {warrantyExpired ? (
                <span className="text-gray-600">Garantia expirada</span>
              ) : (
                <span className="text-stone-700">Garantia</span>
              )}
            </div>
            <div className="text-xs font-semibold">
              {warrantyExpired ? (
                <span className="text-gray-600">
                  {new Date(item.warranty_expiry).toLocaleDateString('pt-BR')}
                </span>
              ) : warrantyExpiringSoon ? (
                <span className="text-orange-700">
                  {warrantyDaysRemaining} {warrantyDaysRemaining === 1 ? 'dia' : 'dias'}
                </span>
              ) : (
                <span className="text-green-700">
                  {new Date(item.warranty_expiry).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Price */}
      {item.purchase_price && (
        <div className="mt-3 pt-3 border-t border-stone-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-500">Valor de compra</span>
            <span className="font-semibold text-stone-800">
              R$ {item.purchase_price.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
