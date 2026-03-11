/**
 * InventoryPage — Grid with photo/icon, name, condition, location.
 * Filters by room/category/condition. Search and sort.
 */

import React, { useState, useMemo } from 'react';
import { useEntityInventory } from '../../hooks/useEntityInventory';
import { InventoryItemForm, type FormValues } from './InventoryItemForm';
import { InventoryStats } from './InventoryStats';
import { InventoryAISuggest } from './InventoryAISuggest';
import type { InventoryItem } from '../../types/liferpg';

interface InventoryPageProps {
  personaId: string;
  personaName: string;
}

type SortBy = 'name' | 'condition' | 'value' | 'updated';

export const InventoryPage: React.FC<InventoryPageProps> = ({ personaId, personaName }) => {
  const {
    items,
    loading,
    stats,
    filters,
    setFilters,
    createItem,
    updateItem,
    deleteItem,
  } = useEntityInventory({ personaId });

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [suggestedDefaults, setSuggestedDefaults] = useState<{ name: string; category: string } | null>(null);

  const filteredAndSorted = useMemo(() => {
    let filtered = items;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          (i.category || '').toLowerCase().includes(term) ||
          (i.location || '').toLowerCase().includes(term)
      );
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'condition':
          return (a.condition || 100) - (b.condition || 100);
        case 'value':
          return (b.current_value || 0) - (a.current_value || 0);
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [items, searchTerm, sortBy]);

  const handleCreate = async (values: FormValues): Promise<boolean> => {
    const ok = await createItem({
      name: values.name,
      category: values.category || undefined,
      subcategory: values.subcategory || undefined,
      location: values.location || undefined,
      condition: values.condition,
      quantity: values.quantity,
      unit: values.unit || undefined,
      purchase_price: values.purchase_price,
      current_value: values.current_value,
      purchase_date: values.purchase_date || undefined,
      notes: values.notes || undefined,
      attributes: values.attributes,
      photo_urls: values.photo_urls.length > 0 ? values.photo_urls : undefined,
    });
    if (ok) {
      setShowForm(false);
      setSuggestedDefaults(null);
    }
    return ok;
  };

  const handleUpdate = async (values: FormValues): Promise<boolean> => {
    if (!editingItem) return false;
    const ok = await updateItem(editingItem.id, {
      name: values.name,
      category: values.category || undefined,
      subcategory: values.subcategory || undefined,
      location: values.location || undefined,
      condition: values.condition,
      quantity: values.quantity,
      unit: values.unit || undefined,
      purchase_price: values.purchase_price,
      current_value: values.current_value,
      purchase_date: values.purchase_date || undefined,
      notes: values.notes || undefined,
      attributes: values.attributes,
      photo_urls: values.photo_urls,
    });
    if (ok) setEditingItem(null);
    return ok;
  };

  const handleAddSuggested = (name: string, category: string) => {
    setSuggestedDefaults({ name, category });
    setEditingItem(null);
    setShowForm(true);
  };

  const conditionColor = (c: number) => {
    if (c >= 70) return 'bg-emerald-500';
    if (c >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ceramic-text-primary">
          Inventario de {personaName}
        </h2>
        <button
          onClick={() => { setShowForm(true); setEditingItem(null); }}
          className="text-sm py-2 px-4 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        >
          + Adicionar
        </button>
      </div>

      {/* Stats */}
      <InventoryStats {...stats} />

      {/* AI Suggestions */}
      <InventoryAISuggest personaId={personaId} onAddSuggested={handleAddSuggested} />

      {/* Search + Filters + Sort */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar item..."
          className="flex-1 min-w-[150px] text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
        />
        <select
          value={filters.category || ''}
          onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
          className="text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border"
        >
          <option value="">Todas categorias</option>
          {stats.categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filters.location || ''}
          onChange={(e) => setFilters({ ...filters, location: e.target.value || undefined })}
          className="text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border"
        >
          <option value="">Todos locais</option>
          {stats.locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border"
        >
          <option value="updated">Recentes</option>
          <option value="name">Nome</option>
          <option value="condition">Condicao</option>
          <option value="value">Valor</option>
        </select>
      </div>

      {/* Add/Edit Form */}
      {(showForm || editingItem) && (
        <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss">
          <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">
            {editingItem ? 'Editar Item' : 'Novo Item'}
          </h3>
          <InventoryItemForm
            initialValues={editingItem ? {
              name: editingItem.name,
              category: editingItem.category || '',
              subcategory: editingItem.subcategory || '',
              location: editingItem.location || '',
              condition: editingItem.condition,
              quantity: editingItem.quantity,
              unit: editingItem.unit || 'un',
              purchase_price: editingItem.purchase_price ?? undefined,
              current_value: editingItem.current_value ?? undefined,
              purchase_date: editingItem.purchase_date || '',
              notes: editingItem.notes || '',
              attributes: editingItem.attributes || {},
              photo_urls: editingItem.photo_urls || [],
            } : suggestedDefaults ? {
              name: suggestedDefaults.name,
              category: suggestedDefaults.category,
            } : undefined}
            onSubmit={editingItem ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingItem(null); setSuggestedDefaults(null); }}
            isEditing={!!editingItem}
            personaId={personaId}
          />
        </div>
      )}

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-ceramic-cool rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-ceramic-text-secondary">Nenhum item no inventario</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredAndSorted.map((item) => (
            <div
              key={item.id}
              className="bg-ceramic-base rounded-xl p-3 shadow-ceramic-emboss border border-ceramic-border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setEditingItem(item)}
            >
              <div className="flex items-start gap-3">
                {item.photo_urls && item.photo_urls.length > 0 ? (
                  <img
                    src={item.photo_urls[0]}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover border border-ceramic-border flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-ceramic-cool flex items-center justify-center text-lg flex-shrink-0">
                    {item.category === 'food' ? '\u{1F34E}' :
                     item.category === 'appliance' ? '\u{1F50C}' :
                     item.category === 'furniture' ? '\u{1FA91}' :
                     item.category === 'electronics' ? '\u{1F4F1}' :
                     item.category === 'document' ? '\u{1F4C4}' :
                     item.category === 'tool' ? '\u{1F6E0}' :
                     '\u{1F4E6}'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-ceramic-text-primary truncate">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.location && (
                      <span className="text-[10px] text-ceramic-text-secondary">{item.location}</span>
                    )}
                    {item.current_value && (
                      <span className="text-[10px] text-ceramic-text-secondary">
                        R${item.current_value.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  {/* Condition bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${conditionColor(item.condition)}`}
                        style={{ width: `${item.condition}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-ceramic-text-secondary">
                      {item.condition}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remover "${item.name}" do inventario?`)) {
                      deleteItem(item.id, item.name);
                    }
                  }}
                  className="text-ceramic-text-secondary hover:text-ceramic-error text-xs p-1"
                  title="Remover"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
