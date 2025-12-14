/**
 * INVENTORY GRID - OPTIMIZED
 * Displays inventory items in a grid layout with filters
 * Optimized with virtual scrolling for large inventories (50+ items)
 */

import React, { useState, useMemo } from 'react';
import { useInventory } from '../hooks/useInventory';
import { InventoryItemCard } from './InventoryItemCard';
import { VirtualGrid } from '../../components/VirtualList';
import { GridItemSkeleton } from '../../components/skeletons';
import { useDebouncedValue } from '../../hooks/useDebouncedSearch';
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

// Threshold para ativar virtualização (50+ itens)
const VIRTUAL_SCROLL_THRESHOLD = 50;

export const InventoryGridOptimized: React.FC<InventoryGridProps> = ({ propertyId }) => {
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

  // Debounce search para evitar chamadas excessivas
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Aplicar busca com debounce
  useMemo(() => {
    if (debouncedSearchTerm.trim()) {
      searchItems(debouncedSearchTerm);
    } else if (!selectedCategory && !selectedStatus) {
      clearFilters();
    }
  }, [debouncedSearchTerm, selectedCategory, selectedStatus]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleCategoryFilter = (category: string) => {
    if (category === selectedCategory) {
      setSelectedCategory(null);
      clearFilters();
    } else {
      setSelectedCategory(category);
      setSelectedStatus(null);
      setSearchTerm('');
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
      setSearchTerm('');
      filterByStatus(status);
    }
  };

  // Usar virtualização apenas para listas grandes
  const useVirtualization = items.length > VIRTUAL_SCROLL_THRESHOLD;

  if (loading) {
    return (
      <div className="space-y-4">
        <GridItemSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-stone-800">Inventário</h3>
          {items.length > 0 && (
            <p className="text-sm text-stone-500 mt-1">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
              {useVirtualization && ' (virtualização ativa)'}
            </p>
          )}
        </div>
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
          className="w-full px-4 py-3 pl-10 border-2 border-stone-300 rounded-lg focus:border-amber-500 focus:outline-none"
        />
        <span className="absolute left-3 top-3.5 text-stone-400">🔍</span>
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              clearFilters();
            }}
            className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div>
        <div className="text-sm font-medium text-stone-600 mb-2">Categoria</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(categoryLabels) as InventoryCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryFilter(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
                selectedCategory === category
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filters */}
      <div>
        <div className="text-sm font-medium text-stone-600 mb-2">Status</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(statusLabels) as InventoryStatus[]).map((status) => (
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
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-stone-600 text-lg">Nenhum item encontrado</p>
          <p className="text-stone-500 text-sm mt-2">
            {searchTerm || selectedCategory || selectedStatus
              ? 'Tente ajustar os filtros'
              : 'Comece adicionando itens ao seu inventário'}
          </p>
        </div>
      ) : useVirtualization ? (
        // Virtual Grid para listas grandes (50+ items)
        <VirtualGrid
          items={items}
          renderItem={(item) => <InventoryItemCard item={item} />}
          columns={3}
          gap={16}
          itemHeight={240}
          className="h-[800px]"
          emptyMessage="Nenhum item encontrado"
        />
      ) : (
        // Grid regular para listas pequenas (< 50 items)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <InventoryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryGridOptimized;
