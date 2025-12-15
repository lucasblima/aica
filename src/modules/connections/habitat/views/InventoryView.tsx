/**
 * INVENTORY VIEW
 * Dedicated view for managing inventory items
 * Design: Earthy, grounded, grid-based layout
 * UX: Jony Ive minimalist style with consistent navigation
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Wrench, Package } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useProperty } from '../hooks/useProperty';
import { InventoryItemCard } from '../components/InventoryItemCard';
import type { InventoryCategory, InventoryStatus } from '../types';

interface InventoryViewProps {
  spaceId: string;
}

const categoryLabels: Record<InventoryCategory, string> = {
  eletrodomestico: 'Eletrodomésticos',
  moveis: 'Móveis',
  eletronicos: 'Eletrônicos',
  decoracao: 'Decoração',
  ferramentas: 'Ferramentas',
  outros: 'Outros',
};

const statusLabels: Record<InventoryStatus, string> = {
  active: 'Ativo',
  maintenance: 'Em Manutenção',
  sold: 'Vendido',
  disposed: 'Descartado',
  lost: 'Perdido',
};

const categories: InventoryCategory[] = [
  'eletrodomestico',
  'moveis',
  'eletronicos',
  'decoracao',
  'ferramentas',
  'outros',
];

export const InventoryView: React.FC<InventoryViewProps> = ({ spaceId }) => {
  const navigate = useNavigate();

  // Fetch primary property for this space
  const { properties, loading: propertiesLoading } = useProperty(spaceId);
  const primaryProperty = properties[0] || null;
  const propertyId = primaryProperty?.id || '';

  const {
    items,
    loading,
    filterByCategory,
    filterByStatus,
    searchItems,
    clearFilters,
  } = useInventory(propertyId);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCategoryFilter = async (category: InventoryCategory) => {
    if (activeFilter === category) {
      setActiveFilter(null);
      await clearFilters();
    } else {
      setActiveFilter(category);
      await filterByCategory(category);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    setActiveFilter(null);
    await searchItems(term);
  };

  const handleClearFilters = async () => {
    setSearchTerm('');
    setActiveFilter(null);
    await clearFilters();
  };

  // Loading state for properties
  if (propertiesLoading || (loading && !items.length)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-stone-200 rounded-lg w-1/3" />
          <div className="h-10 bg-stone-200 rounded-lg w-2/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <div className="h-48 bg-stone-200 rounded-lg" />
            <div className="h-48 bg-stone-200 rounded-lg" />
            <div className="h-48 bg-stone-200 rounded-lg" />
          </div>
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
          <h1 className="text-2xl font-bold text-stone-800">Inventario</h1>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-stone-800 mb-2">
            Nenhuma propriedade cadastrada
          </h3>
          <p className="text-stone-600 mb-4">
            Cadastre uma propriedade primeiro para gerenciar o inventario.
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
          <h1 className="text-3xl font-bold text-stone-800">Inventario</h1>
          <p className="text-stone-600 mt-1">Gerencie todos os itens da sua propriedade</p>
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
          className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium"
        >
          <Package className="w-4 h-4" />
          Inventario
        </button>
      </div>

      {/* Action Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div />
        <button className="px-6 py-3 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800 transition-colors shadow-lg">
          + Novo Item
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-2 border-stone-200 rounded-lg p-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Buscar itens..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-4 py-2 border-2 border-stone-300 rounded-lg focus:outline-none focus:border-amber-500"
          />
          {(searchTerm || activeFilter) && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-stone-200 text-stone-700 font-medium rounded-lg hover:bg-stone-300 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div className="bg-white border-2 border-stone-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-stone-700 mb-3">Filtrar por Categoria</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryFilter(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeFilter === category
                  ? 'bg-amber-700 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-stone-200 rounded-lg p-4">
          <div className="text-3xl mb-2">📦</div>
          <div className="text-2xl font-bold text-stone-800">{items.length}</div>
          <div className="text-sm text-stone-600">Total de Itens</div>
        </div>

        <div className="bg-white border-2 border-stone-200 rounded-lg p-4">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-green-800">
            {items.filter((i) => i.status === 'active').length}
          </div>
          <div className="text-sm text-stone-600">Ativos</div>
        </div>

        <div className="bg-white border-2 border-stone-200 rounded-lg p-4">
          <div className="text-3xl mb-2">🔧</div>
          <div className="text-2xl font-bold text-orange-800">
            {items.filter((i) => i.status === 'maintenance').length}
          </div>
          <div className="text-sm text-stone-600">Em Manutenção</div>
        </div>

        <div className="bg-white border-2 border-stone-200 rounded-lg p-4">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-2xl font-bold text-blue-800">
            {items.filter((i) => i.warranty_expiry).length}
          </div>
          <div className="text-sm text-stone-600">Com Garantia</div>
        </div>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="bg-white border-2 border-stone-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-stone-800 mb-2">
            Nenhum item encontrado
          </h3>
          <p className="text-stone-600">
            {searchTerm || activeFilter
              ? 'Tente ajustar os filtros ou a busca'
              : 'Comece adicionando itens ao seu inventário'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <InventoryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && items.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-stone-700 font-medium">Carregando...</p>
          </div>
        </div>
      )}
    </div>
  );
};
