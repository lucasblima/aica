/**
 * InventoryItemForm — Adaptive form by category.
 * Base fields + extra JSONB attributes per category.
 */

import React, { useState } from 'react';
import type { InventoryCategory } from '../../types/liferpg';

interface InventoryItemFormProps {
  initialValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => Promise<boolean>;
  onCancel: () => void;
  isEditing?: boolean;
}

export interface FormValues {
  name: string;
  category: string;
  subcategory: string;
  location: string;
  condition: number;
  quantity: number;
  unit: string;
  purchase_price: number | undefined;
  current_value: number | undefined;
  purchase_date: string;
  notes: string;
  attributes: Record<string, unknown>;
}

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'appliance', label: 'Eletrodomestico' },
  { value: 'furniture', label: 'Movel' },
  { value: 'electronics', label: 'Eletronico' },
  { value: 'food', label: 'Alimento' },
  { value: 'document', label: 'Documento' },
  { value: 'tool', label: 'Ferramenta' },
  { value: 'clothing', label: 'Roupa' },
  { value: 'decoration', label: 'Decoracao' },
  { value: 'vehicle_part', label: 'Peca de Veiculo' },
  { value: 'other', label: 'Outro' },
];

const DEFAULT_VALUES: FormValues = {
  name: '',
  category: '',
  subcategory: '',
  location: '',
  condition: 100,
  quantity: 1,
  unit: 'un',
  purchase_price: undefined,
  current_value: undefined,
  purchase_date: '',
  notes: '',
  attributes: {},
};

export const InventoryItemForm: React.FC<InventoryItemFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isEditing = false,
}) => {
  const [values, setValues] = useState<FormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const updateAttribute = (key: string, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    setSubmitting(true);
    const ok = await onSubmit(values);
    setSubmitting(false);
    if (ok && !isEditing) {
      setValues(DEFAULT_VALUES);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Base fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-ceramic-text-secondary block mb-1">Nome *</label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
            required
          />
        </div>

        <div>
          <label className="text-xs text-ceramic-text-secondary block mb-1">Categoria</label>
          <select
            value={values.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
          >
            <option value="">Selecione</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-ceramic-text-secondary block mb-1">Local</label>
          <input
            type="text"
            value={values.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="Ex: Cozinha, Garagem..."
            className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="text-xs text-ceramic-text-secondary block mb-1">
            Condicao: {values.condition}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={values.condition}
            onChange={(e) => updateField('condition', parseInt(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-ceramic-text-secondary block mb-1">Qtd</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={values.quantity}
              onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
              className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="w-20">
            <label className="text-xs text-ceramic-text-secondary block mb-1">Unid.</label>
            <input
              type="text"
              value={values.unit}
              onChange={(e) => updateField('unit', e.target.value)}
              className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-ceramic-text-secondary block mb-1">Preco compra (R$)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={values.purchase_price ?? ''}
            onChange={(e) => updateField('purchase_price', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="text-xs text-ceramic-text-secondary block mb-1">Valor atual (R$)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={values.current_value ?? ''}
            onChange={(e) => updateField('current_value', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="text-xs text-ceramic-text-secondary block mb-1">Data compra</label>
          <input
            type="date"
            value={values.purchase_date}
            onChange={(e) => updateField('purchase_date', e.target.value)}
            className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Category-specific fields */}
      {values.category === 'appliance' && (
        <div className="border-t border-ceramic-border pt-3 space-y-3">
          <h4 className="text-xs font-medium text-ceramic-text-primary">Detalhes do Eletrodomestico</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Marca</label>
              <input
                type="text"
                value={(values.attributes.brand as string) || ''}
                onChange={(e) => updateAttribute('brand', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Modelo</label>
              <input
                type="text"
                value={(values.attributes.model as string) || ''}
                onChange={(e) => updateAttribute('model', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Garantia ate</label>
              <input
                type="date"
                value={(values.attributes.warranty_until as string) || ''}
                onChange={(e) => updateAttribute('warranty_until', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Potencia (W)</label>
              <input
                type="number"
                value={(values.attributes.power_watts as number) || ''}
                onChange={(e) => updateAttribute('power_watts', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      )}

      {values.category === 'food' && (
        <div className="border-t border-ceramic-border pt-3 space-y-3">
          <h4 className="text-xs font-medium text-ceramic-text-primary">Detalhes do Alimento</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Validade</label>
              <input
                type="date"
                value={(values.attributes.expiry_date as string) || ''}
                onChange={(e) => updateAttribute('expiry_date', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Armazenamento</label>
              <select
                value={(values.attributes.storage_type as string) || ''}
                onChange={(e) => updateAttribute('storage_type', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              >
                <option value="">Selecione</option>
                <option value="fridge">Geladeira</option>
                <option value="freezer">Freezer</option>
                <option value="pantry">Despensa</option>
                <option value="counter">Bancada</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {values.category === 'document' && (
        <div className="border-t border-ceramic-border pt-3 space-y-3">
          <h4 className="text-xs font-medium text-ceramic-text-primary">Detalhes do Documento</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Tipo</label>
              <input
                type="text"
                value={(values.attributes.document_type as string) || ''}
                onChange={(e) => updateAttribute('document_type', e.target.value)}
                placeholder="Ex: Escritura, IPTU..."
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Vencimento</label>
              <input
                type="date"
                value={(values.attributes.expiry_date as string) || ''}
                onChange={(e) => updateAttribute('expiry_date', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-ceramic-text-secondary block mb-1">Emissor</label>
              <input
                type="text"
                value={(values.attributes.issuer as string) || ''}
                onChange={(e) => updateAttribute('issuer', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      )}

      {values.category === 'furniture' && (
        <div className="border-t border-ceramic-border pt-3 space-y-3">
          <h4 className="text-xs font-medium text-ceramic-text-primary">Detalhes do Movel</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Largura (cm)</label>
              <input
                type="number"
                value={(values.attributes.width as number) || ''}
                onChange={(e) => updateAttribute('width', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Altura (cm)</label>
              <input
                type="number"
                value={(values.attributes.height as number) || ''}
                onChange={(e) => updateAttribute('height', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Prof. (cm)</label>
              <input
                type="number"
                value={(values.attributes.depth as number) || ''}
                onChange={(e) => updateAttribute('depth', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Material</label>
              <input
                type="text"
                value={(values.attributes.material as string) || ''}
                onChange={(e) => updateAttribute('material', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs text-ceramic-text-secondary block mb-1">Cor</label>
              <input
                type="text"
                value={(values.attributes.color as string) || ''}
                onChange={(e) => updateAttribute('color', e.target.value)}
                className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs text-ceramic-text-secondary block mb-1">Notas</label>
        <textarea
          value={values.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
          className="w-full text-sm py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || !values.name.trim()}
          className="flex-1 text-sm py-2 px-4 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm py-2 px-4 rounded-lg bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-border transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
