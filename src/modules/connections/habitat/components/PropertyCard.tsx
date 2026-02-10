/**
 * PROPERTY CARD
 * Displays property information with earthy, stable design
 */

import React from 'react';
import type { HabitatProperty } from '../types';
import { formatPropertyAddress, calculateFinancialSummary } from '../services/propertyService';

interface PropertyCardProps {
  property: HabitatProperty;
  onClick?: () => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick }) => {
  const financials = calculateFinancialSummary(property);
  const address = formatPropertyAddress(property);

  const propertyTypeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    condo: 'Condomínio',
    room: 'Quarto',
    other: 'Outro',
  };

  return (
    <div
      className={`bg-gradient-to-br from-amber-50 to-stone-100 border-2 border-ceramic-border rounded-xl p-6 shadow-lg ${
        onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🏠</div>
          <div>
            <h3 className="text-xl font-bold text-ceramic-text-primary">
              {property.building_name || propertyTypeLabels[property.property_type]}
            </h3>
            <p className="text-sm text-ceramic-text-secondary">{address}</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-amber-700 text-white text-xs font-semibold rounded-full">
          {propertyTypeLabels[property.property_type]}
        </div>
      </div>

      {/* Property Specs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {property.area_sqm && (
          <div className="flex items-center gap-2">
            <span className="text-ceramic-text-secondary">📏</span>
            <div>
              <div className="text-lg font-semibold text-ceramic-text-primary">{property.area_sqm}m²</div>
              <div className="text-xs text-ceramic-text-secondary">Área</div>
            </div>
          </div>
        )}

        {property.bedrooms !== undefined && property.bedrooms > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-ceramic-text-secondary">🛏️</span>
            <div>
              <div className="text-lg font-semibold text-ceramic-text-primary">{property.bedrooms}</div>
              <div className="text-xs text-ceramic-text-secondary">Quartos</div>
            </div>
          </div>
        )}

        {property.bathrooms !== undefined && property.bathrooms > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-ceramic-text-secondary">🚿</span>
            <div>
              <div className="text-lg font-semibold text-ceramic-text-primary">{property.bathrooms}</div>
              <div className="text-xs text-ceramic-text-secondary">Banheiros</div>
            </div>
          </div>
        )}

        {property.parking_spots > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-ceramic-text-secondary">🚗</span>
            <div>
              <div className="text-lg font-semibold text-ceramic-text-primary">{property.parking_spots}</div>
              <div className="text-xs text-ceramic-text-secondary">Vagas</div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      {financials.monthly_total > 0 && (
        <div className="border-t-2 border-ceramic-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ceramic-text-secondary">Custos Mensais</span>
            <span className="text-2xl font-bold text-brown-700">
              R$ {financials.monthly_total.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1 text-xs text-ceramic-text-secondary">
            {financials.condominium_fee > 0 && (
              <div className="flex justify-between">
                <span>Condomínio</span>
                <span>R$ {financials.condominium_fee.toFixed(2)}</span>
              </div>
            )}
            {financials.rent_value > 0 && (
              <div className="flex justify-between">
                <span>Aluguel</span>
                <span>R$ {financials.rent_value.toFixed(2)}</span>
              </div>
            )}
            {financials.property_tax_monthly > 0 && (
              <div className="flex justify-between">
                <span>IPTU (mensal)</span>
                <span>R$ {financials.property_tax_monthly.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contacts */}
      {(property.portaria_phone || property.sindico_name) && (
        <div className="border-t-2 border-ceramic-border pt-4 mt-4">
          <h4 className="text-sm font-semibold text-ceramic-text-primary mb-2">Contatos</h4>
          <div className="space-y-1 text-xs text-ceramic-text-secondary">
            {property.portaria_phone && (
              <div className="flex items-center gap-2">
                <span>📞</span>
                <span>Portaria: {property.portaria_phone}</span>
              </div>
            )}
            {property.sindico_name && (
              <div className="flex items-center gap-2">
                <span>👤</span>
                <span>
                  Síndico: {property.sindico_name}
                  {property.sindico_phone && ` - ${property.sindico_phone}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
