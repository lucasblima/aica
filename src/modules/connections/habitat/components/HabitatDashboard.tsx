/**
 * HABITAT DASHBOARD
 * Main dashboard for property management
 * Design: Earthy tones, heavy cards, stable foundation aesthetic
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Wrench, Package, ArrowLeft, Plus } from 'lucide-react';
import { useProperty } from '../hooks/useProperty';
import { useMaintenanceSummary } from '../hooks/useMaintenance';
import { useWarrantyAlerts } from '../hooks/useInventory';
import { PropertyCard } from './PropertyCard';
import { MaintenanceTracker } from './MaintenanceTracker';
import { WarrantyAlertsCard } from './WarrantyAlertsCard';
import { SpaceFinanceSummary } from '../../components/SpaceFinanceSummary';
import { MemberBalanceCard } from '../../components/MemberBalanceCard';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('HabitatDashboard');

interface HabitatDashboardProps {
  spaceId: string;
}

export const HabitatDashboard: React.FC<HabitatDashboardProps> = ({ spaceId }) => {
  const navigate = useNavigate();
  const { properties, loading: propertiesLoading, createNewProperty } = useProperty(spaceId);
  const primaryProperty = properties[0] || null;
  const [isCreating, setIsCreating] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');

  const { summary: maintenanceSummary, loading: summaryLoading } = useMaintenanceSummary(
    primaryProperty?.id || ''
  );

  const { alerts: warrantyAlerts, loading: alertsLoading } = useWarrantyAlerts(
    primaryProperty?.id || '',
    30
  );

  if (propertiesLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-stone-200 rounded-lg" />
          <div className="h-60 bg-stone-200 rounded-lg" />
        </div>
      </div>
    );
  }

  // Handler para criar propriedade
  const handleCreateProperty = async () => {
    if (!newPropertyName.trim()) return;

    setIsCreating(true);
    try {
      await createNewProperty({
        space_id: spaceId,
        name: newPropertyName.trim(),
        property_type: 'apartment',
      });
      setNewPropertyName('');
    } catch (error) {
      log.error('Erro ao criar propriedade:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!primaryProperty) {
    return (
      <div className="p-6">
        {/* Navegação */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/connections/habitat')}
            className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <h1 className="text-2xl font-bold text-stone-800">Habitat</h1>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-stone-800 mb-2">Nenhuma propriedade cadastrada</h3>
          <p className="text-stone-600 mb-6">
            Comece adicionando informações sobre sua residência ou condomínio
          </p>

          {/* Formulário inline para criar propriedade */}
          <div className="max-w-md mx-auto space-y-4">
            <input
              type="text"
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              placeholder="Nome da propriedade (ex: Meu Apartamento)"
              className="w-full px-4 py-3 border-2 border-stone-300 rounded-lg focus:border-amber-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProperty()}
            />
            <button
              onClick={handleCreateProperty}
              disabled={!newPropertyName.trim() || isCreating}
              className="w-full px-6 py-3 bg-amber-700 text-white font-medium rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {isCreating ? 'Criando...' : 'Adicionar Propriedade'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-stone-50 min-h-screen">
      {/* Header com navegação */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/connections/habitat')}
          className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-stone-800">Habitat</h1>
          <p className="text-stone-600 mt-1">Gestão da sua propriedade</p>
        </div>
      </div>

      {/* Navigation Tabs - Tactile ceramic states */}
      <div className="ceramic-tray flex gap-1.5 p-1.5 rounded-full inline-flex">
        <button
          className="flex items-center gap-2 px-5 py-2.5 ceramic-concave text-ceramic-text-primary rounded-full font-bold text-sm"
          aria-selected="true"
        >
          <Home className="w-4 h-4" />
          <span className="uppercase tracking-wide text-xs">Dashboard</span>
        </button>
        <button
          onClick={() => navigate(`/connections/habitat/${spaceId}/maintenance`)}
          className="flex items-center gap-2 px-5 py-2.5 ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary rounded-full font-bold text-sm transition-colors"
          aria-selected="false"
        >
          <Wrench className="w-4 h-4" />
          <span className="uppercase tracking-wide text-xs">Manutenção</span>
        </button>
        <button
          onClick={() => navigate(`/connections/habitat/${spaceId}/inventory`)}
          className="flex items-center gap-2 px-5 py-2.5 ceramic-card text-ceramic-text-secondary hover:text-ceramic-text-primary rounded-full font-bold text-sm transition-colors"
          aria-selected="false"
        >
          <Package className="w-4 h-4" />
          <span className="uppercase tracking-wide text-xs">Inventário</span>
        </button>
      </div>

      {/* Property Info Card */}
      <PropertyCard property={primaryProperty} />

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Urgent Maintenance */}
        {!summaryLoading && maintenanceSummary && maintenanceSummary.urgent_count > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <div className="text-2xl font-bold text-red-800">
                  {maintenanceSummary.urgent_count}
                </div>
                <div className="text-sm text-red-700">Manutenções urgentes</div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Maintenance */}
        {!summaryLoading && maintenanceSummary && maintenanceSummary.total_pending > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔧</div>
              <div>
                <div className="text-2xl font-bold text-amber-800">
                  {maintenanceSummary.total_pending}
                </div>
                <div className="text-sm text-amber-700">Manutenções pendentes</div>
              </div>
            </div>
          </div>
        )}

        {/* Warranty Alerts */}
        {!alertsLoading && warrantyAlerts.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📋</div>
              <div>
                <div className="text-2xl font-bold text-orange-800">{warrantyAlerts.length}</div>
                <div className="text-sm text-orange-700">Garantias expirando</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warranty Alerts Detail */}
      {warrantyAlerts.length > 0 && <WarrantyAlertsCard alerts={warrantyAlerts} />}

      {/* Finance Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpaceFinanceSummary spaceId={spaceId} />
        <MemberBalanceCard spaceId={spaceId} />
      </div>

      {/* Maintenance Tracker */}
      <MaintenanceTracker propertyId={primaryProperty.id} />

      {/* Quick Stats */}
      {!summaryLoading && maintenanceSummary && (
        <div className="bg-white border-2 border-stone-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-stone-800 mb-4">Resumo de Manutenção</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-stone-700">
                {maintenanceSummary.total_scheduled}
              </div>
              <div className="text-sm text-stone-500">Agendadas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-700">
                {maintenanceSummary.total_in_progress}
              </div>
              <div className="text-sm text-stone-500">Em andamento</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">
                R$ {maintenanceSummary.total_estimated_cost.toFixed(2)}
              </div>
              <div className="text-sm text-stone-500">Custo estimado</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
