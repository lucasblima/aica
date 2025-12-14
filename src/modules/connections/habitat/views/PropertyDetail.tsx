/**
 * PROPERTY DETAIL VIEW
 * Detailed view of a single property
 */

import React from 'react';
import { usePropertyById } from '../hooks/useProperty';
import { PropertyCard } from '../components/PropertyCard';
import { CondoContacts } from '../components/CondoContacts';
import { MaintenanceTracker } from '../components/MaintenanceTracker';
import { InventoryGrid } from '../components/InventoryGrid';

interface PropertyDetailProps {
  propertyId: string;
  onBack?: () => void;
}

export const PropertyDetail: React.FC<PropertyDetailProps> = ({ propertyId, onBack }) => {
  const { property, loading, error } = usePropertyById(propertyId);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-200 rounded w-1/4" />
          <div className="h-48 bg-stone-200 rounded-lg" />
          <div className="h-64 bg-stone-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-red-800 mb-2">Erro ao carregar propriedade</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-stone-800 mb-2">Propriedade não encontrada</h3>
          <p className="text-stone-600">A propriedade solicitada não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <span className="text-2xl">←</span>
          </button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Detalhes da Propriedade</h1>
          <p className="text-stone-600 mt-1">Gestão completa do seu imóvel</p>
        </div>
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
