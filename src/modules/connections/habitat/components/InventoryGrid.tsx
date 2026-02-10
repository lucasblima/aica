/**
 * INVENTORY GRID
 * Displays inventory items in a grid layout with filters
 */

import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { InventoryItemCard } from './InventoryItemCard';
import type { InventoryCategory, InventoryStatus } from '../types';

interface InventoryGridProps {
  propertyId: string;
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
  maintenance: 'Manutenção',
  sold: 'Vendido',
  disposed: 'Descartado',
  lost: 'Perdido',
};

export const InventoryGrid: React.FC<InventoryGridProps> = ({ propertyId }) => {
  const {
    items,
    loading,
    filterByCategory,
    filterByStatus,
    searchItems,
    clearFilters,
  } = useInventory(propertyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      searchItems(term);
    } else {
      clearFilters();
    }
  };

  const handleCategoryFilter = (category: string) => {
    if (category === selectedCategory) {
      setSelectedCategory(null);
      clearFilters();
    } else {
      setSelectedCategory(category);
      setSelectedStatus(null);
      filterByCategory(category);
    }
  };

  const handleStatusFilter = (status: string) => {
    if (status === selectedStatus) {
      setSelectedStatus(null);
      clearFilters();
    } else {
      setSelectedStatus(status);
      setSelectedCategory(null);
      filterByStatus(status);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-12 bg-ceramic-border rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-ceramic-border rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-ceramic-text-primary">Inventário</h3>
        <button className="px-4 py-2 bg-amber-700 text-white font-medium rounded-lg hover:bg-amber-800 transition-colors">
          + Adicionar Item
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar itens..."
          className="w-full px-4 py-3 pl-10 border-2 border-ceramic-border rounded-lg focus:border-amber-500 focus:outline-none"
        />
        <span className="absolute left-3 top-3.5 text-ceramic-text-tertiary">🔍</span>
      </div>

      {/* Category Filters */}
      <div>
        <div className="text-sm font-medium text-ceramic-text-secondary mb-2">Categoria</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(categoryLabels) as InventoryCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryFilter(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
                selectedCategory === category
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-ceramic-cool text-ceramic-text-primary border-ceramic-border hover:bg-ceramic-cool'
              }`}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filters */}
      <div>
        <div className="text-sm font-medium text-ceramic-text-secondary mb-2">Status</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(statusLabels) as InventoryStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
                selectedStatus === status
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-ceramic-cool text-ceramic-text-primary border-ceramic-border hover:bg-ceramic-cool'
              }`}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-ceramic-text-secondary text-lg">Nenhum item encontrado</p>
          <p className="text-ceramic-text-secondary text-sm mt-2">
            {searchTerm || selectedCategory || selectedStatus
              ? 'Tente ajustar os filtros'
              : 'Comece adicionando itens ao seu inventário'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <InventoryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Results Count */}
      {items.length > 0 && (
        <div className="text-center text-sm text-ceramic-text-secondary">
          {items.length} {items.length === 1 ? 'item encontrado' : 'itens encontrados'}
        </div>
      )}
    </div>
  );
};
