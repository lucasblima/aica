/**
 * OrganizationSection Component
 *
 * Accordion section for template organization:
 * - Tags (add/remove)
 * - Athlete levels (multi-select)
 * - Public visibility toggle
 * - Favorite toggle
 */

import React, { useState } from 'react';
import { ChevronDown, X, Plus } from 'lucide-react';
import type { TemplateFormState } from './useTemplateForm';
import type { AthleteLevel } from '../../types/flow';

interface OrganizationSectionProps {
  formData: TemplateFormState;
  errors: Partial<Record<keyof TemplateFormState, string>>;
  touched: Set<string>;
  onChange: (name: keyof TemplateFormState, value: any) => void;
  onBlur: (name: keyof TemplateFormState) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const LEVEL_OPTIONS: { value: AthleteLevel; label: string }[] = [
  { value: 'iniciante_1', label: 'Iniciante 1' },
  { value: 'iniciante_2', label: 'Iniciante 2' },
  { value: 'iniciante_3', label: 'Iniciante 3' },
  { value: 'intermediario_1', label: 'Intermediário 1' },
  { value: 'intermediario_2', label: 'Intermediário 2' },
  { value: 'intermediario_3', label: 'Intermediário 3' },
  { value: 'avancado', label: 'Avançado' },
];

export default function OrganizationSection({
  formData,
  errors,
  touched,
  onChange,
  onBlur,
  isOpen,
  onToggle,
}: OrganizationSectionProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !formData.tags?.includes(trimmed)) {
      onChange('tags', [...(formData.tags || []), trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(
      'tags',
      (formData.tags || []).filter((tag) => tag !== tagToRemove)
    );
  };

  const handleToggleLevel = (level: AthleteLevel) => {
    const currentLevels = formData.level || [];
    if (currentLevels.includes(level)) {
      onChange(
        'level',
        currentLevels.filter((l) => l !== level)
      );
    } else {
      onChange('level', [...currentLevels, level]);
    }
  };

  const hasErrors = ['tags', 'level', 'is_public', 'is_favorite'].some(
    (field) => errors[field as keyof TemplateFormState]
  );

  return (
    <div className="ceramic-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-ceramic-text-primary">4. Organização</span>
          {hasErrors && (
            <span className="w-2 h-2 bg-ceramic-error rounded-full" title="Seção com erros" />
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="p-4 pt-0 space-y-4 border-t border-ceramic-text-secondary/10">
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              Tags <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
            </label>

            {/* Tag Input */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Digite uma tag..."
                className="flex-1 px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-ceramic-accent text-white hover:bg-ceramic-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Adicionar</span>
              </button>
            </div>

            {/* Tag List */}
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-ceramic-cool rounded-lg text-sm font-medium text-ceramic-text-primary"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-ceramic-error/10 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3 text-ceramic-text-secondary hover:text-ceramic-error" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Athlete Levels */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              Níveis de Atleta <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
            </label>
            <p className="text-xs text-ceramic-text-secondary mb-2">
              Selecione para quais níveis este template é adequado
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LEVEL_OPTIONS.map((option) => {
                const isSelected = (formData.level || []).includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggleLevel(option.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-ceramic-accent text-white shadow-md'
                        : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-3 border-t border-ceramic-text-secondary/10">
            {/* Public */}
            <label className="flex items-center justify-between p-3 ceramic-inset rounded-lg cursor-pointer hover:bg-white/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-ceramic-text-primary">Template Público</p>
                <p className="text-xs text-ceramic-text-secondary mt-0.5">
                  Compartilhar com outros coaches
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.is_public || false}
                  onChange={(e) => onChange('is_public', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-ceramic-text-secondary/20 rounded-full peer-checked:bg-ceramic-accent transition-all"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>

            {/* Favorite */}
            <label className="flex items-center justify-between p-3 ceramic-inset rounded-lg cursor-pointer hover:bg-white/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-ceramic-text-primary">Favorito</p>
                <p className="text-xs text-ceramic-text-secondary mt-0.5">
                  Adicionar aos favoritos para acesso rápido
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.is_favorite || false}
                  onChange={(e) => onChange('is_favorite', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-ceramic-text-secondary/20 rounded-full peer-checked:bg-ceramic-warning transition-all"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
