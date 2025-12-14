/**
 * MAINTENANCE TRACKER
 * Displays and manages maintenance records
 */

import React, { useState } from 'react';
import { useMaintenance } from '../hooks/useMaintenance';
import type { MaintenanceStatus, MaintenanceUrgency } from '../types';

interface MaintenanceTrackerProps {
  propertyId: string;
}

const urgencyColors: Record<MaintenanceUrgency, string> = {
  baixa: 'bg-blue-100 text-blue-800 border-blue-300',
  normal: 'bg-gray-100 text-gray-800 border-gray-300',
  alta: 'bg-orange-100 text-orange-800 border-orange-300',
  emergencia: 'bg-red-100 text-red-800 border-red-300',
};

const urgencyLabels: Record<MaintenanceUrgency, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  emergencia: 'Emergência',
};

const statusLabels: Record<MaintenanceStatus, string> = {
  pending: 'Pendente',
  scheduled: 'Agendada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export const MaintenanceTracker: React.FC<MaintenanceTrackerProps> = ({ propertyId }) => {
  const { records, loading, filterByStatus, clearFilters } = useMaintenance(propertyId);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const handleStatusFilter = async (status: string) => {
    if (status === selectedStatus) {
      setSelectedStatus(null);
      await clearFilters();
    } else {
      setSelectedStatus(status);
      await filterByStatus(status);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border-2 border-stone-200 rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-stone-200 rounded w-1/4" />
          <div className="h-20 bg-stone-200 rounded" />
          <div className="h-20 bg-stone-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-stone-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-stone-800">Manutenções</h3>
        <button className="px-4 py-2 bg-amber-700 text-white font-medium rounded-lg hover:bg-amber-800 transition-colors">
          + Nova Manutenção
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['pending', 'scheduled', 'in_progress'] as MaintenanceStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
              selectedStatus === status
                ? 'bg-amber-700 text-white border-amber-700'
                : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Maintenance List */}
      {records.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <p className="text-stone-600">Nenhuma manutenção registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              className="border-2 border-stone-200 rounded-lg p-4 hover:border-amber-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-stone-800">{record.title}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        urgencyColors[record.urgency]
                      }`}
                    >
                      {urgencyLabels[record.urgency]}
                    </span>
                  </div>
                  {record.description && (
                    <p className="text-sm text-stone-600">{record.description}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-medium text-stone-700">
                    {statusLabels[record.status]}
                  </div>
                  {record.estimated_cost && (
                    <div className="text-xs text-stone-500">
                      R$ {record.estimated_cost.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-4 text-xs text-stone-500 mt-3">
                {record.scheduled_date && (
                  <div className="flex items-center gap-1">
                    <span>📅</span>
                    <span>{new Date(record.scheduled_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {record.provider_name && (
                  <div className="flex items-center gap-1">
                    <span>👤</span>
                    <span>{record.provider_name}</span>
                  </div>
                )}
                {record.category && (
                  <div className="flex items-center gap-1">
                    <span>🏷️</span>
                    <span className="capitalize">{record.category}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
