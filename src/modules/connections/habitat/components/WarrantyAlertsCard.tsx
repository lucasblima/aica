/**
 * WARRANTY ALERTS CARD
 * Displays items with warranties expiring soon
 */

import React from 'react';
import type { WarrantyAlert } from '../types';

interface WarrantyAlertsCardProps {
  alerts: WarrantyAlert[];
}

export const WarrantyAlertsCard: React.FC<WarrantyAlertsCardProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="bg-ceramic-base border-2 border-ceramic-warning/30 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">📋</span>
        <div>
          <h3 className="text-lg font-bold text-ceramic-warning">Garantias Expirando</h3>
          <p className="text-sm text-ceramic-warning/80">Itens com garantia próxima do vencimento</p>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.item_id}
            className="flex items-center justify-between p-3 bg-ceramic-warning/10 border border-ceramic-warning/30 rounded-lg"
          >
            <div className="flex-1">
              <div className="font-medium text-ceramic-text-primary">{alert.item_name}</div>
              <div className="text-xs text-ceramic-text-secondary">
                Expira em {new Date(alert.warranty_expiry).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                alert.days_remaining <= 7
                  ? 'bg-ceramic-error/15 text-ceramic-error'
                  : alert.days_remaining <= 15
                  ? 'bg-ceramic-warning/15 text-ceramic-warning'
                  : 'bg-ceramic-warning/10 text-ceramic-warning'
              }`}
            >
              {alert.days_remaining} {alert.days_remaining === 1 ? 'dia' : 'dias'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
