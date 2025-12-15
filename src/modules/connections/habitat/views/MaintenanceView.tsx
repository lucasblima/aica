/**
 * MAINTENANCE VIEW
 * Dedicated view for managing maintenance records
 * UX: Jony Ive minimalist style with consistent navigation
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Wrench, Package } from 'lucide-react';
import { useMaintenance, useMaintenanceSummary } from '../hooks/useMaintenance';
import { useProperty } from '../hooks/useProperty';
import type { MaintenanceStatus, MaintenanceUrgency } from '../types';

interface MaintenanceViewProps {
  spaceId: string;
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

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ spaceId }) => {
  const navigate = useNavigate();

  // Fetch primary property for this space
  const { properties, loading: propertiesLoading } = useProperty(spaceId);
  const primaryProperty = properties[0] || null;
  const propertyId = primaryProperty?.id || '';

  const {
    records,
    loading,
    filterByStatus,
    getUrgent,
    getUpcoming,
    clearFilters,
    completeRecord,
  } = useMaintenance(propertyId);

  const { summary, loading: summaryLoading } = useMaintenanceSummary(propertyId);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleFilter = async (type: string, value?: string) => {
    if (activeFilter === type) {
      setActiveFilter(null);
      await clearFilters();
      return;
    }

    setActiveFilter(type);
    switch (type) {
      case 'urgent':
        await getUrgent();
        break;
      case 'upcoming':
        await getUpcoming(7);
        break;
      case 'status':
        if (value) await filterByStatus(value);
        break;
      default:
        await clearFilters();
    }
  };

  const handleComplete = async (recordId: string) => {
    if (confirm('Marcar esta manutenção como concluída?')) {
      await completeRecord(recordId);
    }
  };

  // Loading state for properties
  if (propertiesLoading || (loading && !records.length)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-stone-200 rounded-lg w-1/3" />
          <div className="h-10 bg-stone-200 rounded-lg w-2/3" />
          <div className="h-40 bg-stone-200 rounded-lg mt-6" />
        </div>
      </div>
    );
  }

  // No property found
  if (!primaryProperty) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 p-6">
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`/connections/habitat/${spaceId}`)}
            className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <h1 className="text-2xl font-bold text-stone-800">Manutencao</h1>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-stone-800 mb-2">
            Nenhuma propriedade cadastrada
          </h3>
          <p className="text-stone-600 mb-4">
            Cadastre uma propriedade primeiro para gerenciar manutencoes.
          </p>
          <button
            onClick={() => navigate(`/connections/habitat/${spaceId}`)}
            className="px-6 py-3 bg-amber-700 text-white font-medium rounded-lg hover:bg-amber-800 transition-colors"
          >
            Ir para Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate(`/connections/habitat/${spaceId}`)}
          className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-stone-800">Manutencao</h1>
          <p className="text-stone-600 mt-1">Gerencie todas as manutencoes da propriedade</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => navigate(`/connections/habitat/${spaceId}`)}
          className="flex items-center gap-2 px-4 py-2 hover:bg-stone-100 text-stone-600 rounded-lg font-medium transition-colors"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium"
        >
          <Wrench className="w-4 h-4" />
          Manutencao
        </button>
        <button
          onClick={() => navigate(`/connections/habitat/${spaceId}/inventory`)}
          className="flex items-center gap-2 px-4 py-2 hover:bg-stone-100 text-stone-600 rounded-lg font-medium transition-colors"
        >
          <Package className="w-4 h-4" />
          Inventario
        </button>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-end">
        <button className="px-6 py-3 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition-colors shadow-lg">
          + Nova Manutencao
        </button>
      </div>

      {/* Summary Cards */}
      {!summaryLoading && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => handleFilter('status', 'pending')}
            className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
              activeFilter === 'status'
                ? 'bg-amber-100 border-amber-400'
                : 'bg-white border-stone-200'
            }`}
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="text-2xl font-bold text-stone-800">{summary.total_pending}</div>
            <div className="text-sm text-stone-600">Pendentes</div>
          </button>

          <button
            onClick={() => handleFilter('status', 'scheduled')}
            className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
              activeFilter === 'status'
                ? 'bg-amber-100 border-amber-400'
                : 'bg-white border-stone-200'
            }`}
          >
            <div className="text-3xl mb-2">📅</div>
            <div className="text-2xl font-bold text-stone-800">{summary.total_scheduled}</div>
            <div className="text-sm text-stone-600">Agendadas</div>
          </button>

          <button
            onClick={() => handleFilter('urgent')}
            className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
              activeFilter === 'urgent'
                ? 'bg-red-100 border-red-400'
                : summary.urgent_count > 0
                ? 'bg-red-50 border-red-300'
                : 'bg-white border-stone-200'
            }`}
          >
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-2xl font-bold text-red-800">{summary.urgent_count}</div>
            <div className="text-sm text-red-700">Urgentes</div>
          </button>

          <div className="p-4 bg-white rounded-lg border-2 border-stone-200">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold text-green-800">
              R$ {summary.total_estimated_cost.toFixed(2)}
            </div>
            <div className="text-sm text-stone-600">Custo Total Estimado</div>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleFilter('upcoming')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeFilter === 'upcoming'
              ? 'bg-amber-700 text-white'
              : 'bg-white text-stone-700 border-2 border-stone-300 hover:bg-stone-50'
          }`}
        >
          Próximos 7 dias
        </button>
        <button
          onClick={() => clearFilters()}
          className="px-4 py-2 rounded-lg font-medium bg-white text-stone-700 border-2 border-stone-300 hover:bg-stone-50 transition-colors"
        >
          Limpar Filtros
        </button>
      </div>

      {/* Records List */}
      {records.length === 0 ? (
        <div className="bg-white border-2 border-stone-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold text-stone-800 mb-2">
            Nenhuma manutenção encontrada
          </h3>
          <p className="text-stone-600">
            {activeFilter ? 'Tente ajustar os filtros' : 'Comece adicionando uma manutenção'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="bg-white border-2 border-stone-200 rounded-lg p-6 hover:border-amber-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-stone-800">{record.title}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        urgencyColors[record.urgency]
                      }`}
                    >
                      {urgencyLabels[record.urgency]}
                    </span>
                  </div>
                  {record.description && (
                    <p className="text-stone-600 mb-3">{record.description}</p>
                  )}

                  {/* Meta Information */}
                  <div className="flex flex-wrap gap-4 text-sm text-stone-500">
                    <div className="flex items-center gap-1">
                      <span>📊</span>
                      <span className="font-medium">{statusLabels[record.status]}</span>
                    </div>
                    {record.scheduled_date && (
                      <div className="flex items-center gap-1">
                        <span>📅</span>
                        <span>{new Date(record.scheduled_date).toLocaleDateString('pt-BR')}</span>
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

                {/* Actions and Cost */}
                <div className="ml-6 text-right">
                  {record.estimated_cost && (
                    <div className="text-lg font-bold text-green-700 mb-2">
                      R$ {record.estimated_cost.toFixed(2)}
                    </div>
                  )}
                  {record.status !== 'completed' && record.status !== 'cancelled' && (
                    <button
                      onClick={() => handleComplete(record.id)}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Marcar como Concluída
                    </button>
                  )}
                </div>
              </div>

              {/* Provider Info */}
              {record.provider_name && (
                <div className="border-t-2 border-stone-100 pt-4 mt-4">
                  <div className="text-sm font-medium text-stone-700 mb-2">Prestador de Serviço</div>
                  <div className="flex flex-wrap gap-4 text-sm text-stone-600">
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>{record.provider_name}</span>
                    </div>
                    {record.provider_phone && (
                      <div className="flex items-center gap-1">
                        <span>📞</span>
                        <span>{record.provider_phone}</span>
                      </div>
                    )}
                    {record.provider_email && (
                      <div className="flex items-center gap-1">
                        <span>✉️</span>
                        <span>{record.provider_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
