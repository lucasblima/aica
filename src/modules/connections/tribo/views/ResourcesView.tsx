import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useResources, useCheckoutResource, useReturnResource } from '../hooks/useResources';
import { SharedResourceCard } from '../components/SharedResourceCard';
import type { ResourceCategory } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('ResourcesView');

interface ResourcesViewProps {
  memberId?: string;
  isAdmin?: boolean;
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  memberId,
  isAdmin = false,
}) => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | 'all'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'in-use'>('all');

  const { data: resources, isLoading } = useResources(spaceId || '');
  const checkoutMutation = useCheckoutResource();
  const returnMutation = useReturnResource();

  const handleReserve = async (resourceId: string) => {
    if (!memberId) return;

    const returnDate = prompt('Data de devolução (opcional, formato: DD/MM/YYYY):');

    try {
      await checkoutMutation.mutateAsync({
        resourceId,
        memberId,
        returnDate: returnDate || undefined,
      });
    } catch (error) {
      log.error('Error reserving resource:', error);
      alert('Erro ao reservar recurso');
    }
  };

  const handleReturn = async (resourceId: string) => {
    if (!confirm('Confirmar devolução deste recurso?')) return;

    try {
      await returnMutation.mutateAsync(resourceId);
    } catch (error) {
      log.error('Error returning resource:', error);
      alert('Erro ao devolver recurso');
    }
  };

  // Filter resources
  const filteredResources = resources?.filter((resource) => {
    const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
    const matchesAvailability =
      availabilityFilter === 'all' ||
      (availabilityFilter === 'available' && resource.isAvailable) ||
      (availabilityFilter === 'in-use' && !resource.isAvailable);

    return matchesCategory && matchesAvailability;
  });

  const categories: Array<{ value: ResourceCategory | 'all'; label: string; icon: string }> = [
    { value: 'all', label: 'Todos', icon: '📦' },
    { value: 'equipment', label: 'Equipamentos', icon: '🛠️' },
    { value: 'space', label: 'Espaços', icon: '🏠' },
    { value: 'vehicle', label: 'Veículos', icon: '🚗' },
    { value: 'other', label: 'Outros', icon: '📦' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9B4D3A]/20 border-t-[#9B4D3A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ceramic-600">Carregando recursos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9B4D3A]/5 via-ceramic-base to-ceramic-50">
      {/* Header */}
      <div className="bg-ceramic-base border-b border-ceramic-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🛠️</span>
            <h1 className="text-3xl font-bold text-ceramic-900">
              Recursos Compartilhados
            </h1>
          </div>
          <p className="text-ceramic-600">
            Equipamentos, espaços e itens disponíveis para o grupo
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-ceramic-base border-b border-ceramic-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div className="flex-1 min-w-[200px]">
              <div className="text-sm font-medium text-ceramic-700 mb-2">
                Categoria
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(cat.value)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      categoryFilter === cat.value
                        ? 'bg-[#9B4D3A] text-white shadow-lg'
                        : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Filter */}
            <div>
              <div className="text-sm font-medium text-ceramic-700 mb-2">
                Disponibilidade
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAvailabilityFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    availabilityFilter === 'all'
                      ? 'bg-[#9B4D3A] text-white'
                      : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setAvailabilityFilter('available')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    availabilityFilter === 'available'
                      ? 'bg-ceramic-success text-white'
                      : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
                  }`}
                >
                  Disponíveis
                </button>
                <button
                  onClick={() => setAvailabilityFilter('in-use')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    availabilityFilter === 'in-use'
                      ? 'bg-ceramic-error text-white'
                      : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
                  }`}
                >
                  Em uso
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredResources && filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <SharedResourceCard
                key={resource.id}
                resource={resource}
                onReserve={
                  resource.isAvailable && memberId
                    ? () => handleReserve(resource.id)
                    : undefined
                }
                onReturn={
                  !resource.isAvailable &&
                  resource.currentHolder?.userId === memberId
                    ? () => handleReturn(resource.id)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="bg-ceramic-base rounded-2xl border-2 border-dashed border-ceramic-border p-12 text-center">
            <span className="text-6xl mb-4 block">📦</span>
            <h2 className="text-2xl font-semibold text-ceramic-900 mb-2">
              Nenhum recurso encontrado
            </h2>
            <p className="text-ceramic-600 mb-6">
              {categoryFilter !== 'all' || availabilityFilter !== 'all'
                ? 'Ajuste os filtros para ver mais recursos'
                : 'Adicione recursos para compartilhar com o grupo'}
            </p>
            {isAdmin && categoryFilter === 'all' && availabilityFilter === 'all' && (
              <button className="px-6 py-3 bg-[#9B4D3A] text-white rounded-xl font-medium hover:bg-[#9B4D3A]/90 transition-colors">
                Adicionar Recurso
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {resources && resources.length > 0 && (
        <div className="bg-ceramic-base border-t border-ceramic-border">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#9B4D3A]">
                  {resources.length}
                </div>
                <div className="text-sm text-ceramic-600">Total de recursos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ceramic-success">
                  {resources.filter((r) => r.isAvailable).length}
                </div>
                <div className="text-sm text-ceramic-600">Disponíveis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ceramic-error">
                  {resources.filter((r) => !r.isAvailable).length}
                </div>
                <div className="text-sm text-ceramic-600">Em uso</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#9B4D3A]">
                  {resources.reduce(
                    (sum, r) => sum + (r.estimatedValue || 0),
                    0
                  ).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
                <div className="text-sm text-ceramic-600">Valor total</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
