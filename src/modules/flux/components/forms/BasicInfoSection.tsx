/**
 * BasicInfoSection Component
 *
 * Accordion section for basic template information:
 * - Name
 * - Description
 * - Category
 * - Modality
 * - Duration
 * - Intensity
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { TemplateFormState } from './useTemplateForm';
import type { TrainingModality } from '../../types/flow';
import type { WorkoutCategorySimplified } from '../../types/series';
import { MODALITY_CONFIG } from '../../types/flux';

interface BasicInfoSectionProps {
  formData: TemplateFormState;
  errors: Partial<Record<keyof TemplateFormState, string>>;
  touched: Set<string>;
  onChange: (name: keyof TemplateFormState, value: any) => void;
  onBlur: (name: keyof TemplateFormState) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CATEGORY_OPTIONS: { value: WorkoutCategorySimplified; label: string }[] = [
  { value: 'warmup', label: 'Aquecimento' },
  { value: 'main', label: 'Principal' },
  { value: 'cooldown', label: 'Desaquecimento' },
];

const MODALITY_OPTIONS: TrainingModality[] = ['swimming', 'running', 'cycling', 'strength', 'walking'];

export default function BasicInfoSection({
  formData,
  errors,
  touched,
  onChange,
  onBlur,
  isOpen,
  onToggle,
}: BasicInfoSectionProps) {
  const hasErrors = ['modality', 'category'].some(
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
          <span className="text-lg font-bold text-ceramic-text-primary">1. Informações Básicas</span>
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
          {/* Modality - PRIMEIRO CAMPO */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              Modalidade <span className="text-ceramic-error">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MODALITY_OPTIONS.map((modality) => {
                const config = MODALITY_CONFIG[modality];
                return (
                  <button
                    key={modality}
                    type="button"
                    onClick={() => onChange('modality', modality)}
                    onBlur={() => onBlur('modality')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.modality === modality
                        ? 'bg-ceramic-accent text-white shadow-md'
                        : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                    }`}
                  >
                    <span>{config?.icon}</span>
                    <span>{config?.label}</span>
                  </button>
                );
              })}
            </div>
            {touched.has('modality') && errors.modality && (
              <p className="mt-1 text-xs text-ceramic-error">{errors.modality}</p>
            )}
          </div>

          {/* Category - Estrutura da Série */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              Estrutura da Série <span className="text-ceramic-error">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange('category', option.value)}
                  onBlur={() => onBlur('category')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.category === option.value
                      ? 'bg-ceramic-accent text-white shadow-md'
                      : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {touched.has('category') && errors.category && (
              <p className="mt-1 text-xs text-ceramic-error">{errors.category}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
