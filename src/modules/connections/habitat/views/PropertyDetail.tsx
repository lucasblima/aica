/**
 * PROPERTY DETAIL VIEW
 * Detailed view of a single property
 * UX: Jony Ive minimalist style with consistent navigation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Wrench, Package, Building } from 'lucide-react';
import { useProperty } from '../hooks/useProperty';
import { PropertyCard } from '../components/PropertyCard';
import { CondoContacts } from '../components/CondoContacts';
import { MaintenanceTracker } from '../components/MaintenanceTracker';
import { InventoryGrid } from '../components/InventoryGrid';

interface PropertyDetailProps {
  spaceId: string;
}

export const PropertyDetail: React.FC<PropertyDetailProps> = ({ spaceId }) => {
  const navigate = useNavigate();

  // Fetch primary property for this space
  const { properties, loading } = useProperty(spaceId);
  const property = properties[0] || null;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-stone-200 rounded-lg w-1/3" />
          <div className="h-10 bg-stone-200 rounded-lg w-2/3" />
          <div className="h-48 bg-stone-200 rounded-lg" />
          <div className="h-64 bg-stone-200 rounded-lg" />
        </div>
      </div>
    );
  }

  // No property found
  if (!property) {
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
          <h1 className="text-2xl font-bold text-stone-800">Detalhes da Propriedade</h1>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-stone-800 mb-2">
            Nenhuma propriedade cadastrada
          </h3>
          <p className="text-stone-600 mb-4">
            Cadastre uma propriedade primeiro para ver os detalhes.
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
          <h1 className="text-3xl font-bold text-stone-800">Detalhes da Propriedade</h1>
          <p className="text-stone-600 mt-1">Gestao completa do seu imovel</p>
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
          onClick={() => navigate(`/connections/habitat/${spaceId}/maintenance`)}
          className="flex items-center gap-2 px-4 py-2 hover:bg-stone-100 text-stone-600 rounded-lg font-medium transition-colors"
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
        <button
          className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium"
        >
          <Building className="w-4 h-4" />
          Propriedade
        </button>
      </div>

      {/* Property Info */}
      <PropertyCard property={property} />

      {/* Contacts */}
      <CondoContacts property={property} />

      {/* Maintenance Section */}
      <MaintenanceTracker propertyId={property.id} />

      {/* Inventory Section */}
      <InventoryGrid propertyId={property.id} />
    </div>
  );
};
