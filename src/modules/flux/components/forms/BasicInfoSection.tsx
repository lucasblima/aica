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
import type { WorkoutCategory, WorkoutIntensity, TrainingModality } from '../../types/flow';
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

const CATEGORY_OPTIONS: { value: WorkoutCategory; label: string }[] = [
  { value: 'warmup', label: 'Aquecimento' },
  { value: 'main', label: 'Principal' },
  { value: 'cooldown', label: 'Desaquecimento' },
  { value: 'recovery', label: 'Recuperação' },
  { value: 'test', label: 'Teste' },
];

const INTENSITY_OPTIONS: { value: WorkoutIntensity; label: string; color: string }[] = [
  { value: 'low', label: 'Leve', color: 'bg-ceramic-info/20 text-ceramic-info' },
  { value: 'medium', label: 'Moderada', color: 'bg-ceramic-warning/20 text-ceramic-warning' },
  { value: 'high', label: 'Alta', color: 'bg-ceramic-error/20 text-ceramic-error' },
];

const MODALITY_OPTIONS: TrainingModality[] = ['swimming', 'running', 'cycling', 'strength'];

export default function BasicInfoSection({
  formData,
  errors,
  touched,
  onChange,
  onBlur,
  isOpen,
  onToggle,
}: BasicInfoSectionProps) {
  const hasErrors = ['name', 'description', 'category', 'modality', 'duration', 'intensity'].some(
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Nome do Template <span className="text-ceramic-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onChange('name', e.target.value)}
              onBlur={() => onBlur('name')}
              placeholder="Ex: Fartlek 5km"
              className={`w-full px-3 py-2 rounded-lg border ${
                touched.has('name') && errors.name
                  ? 'border-ceramic-error bg-ceramic-error/5'
                  : 'border-ceramic-text-secondary/20 bg-white/50'
              } text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50`}
            />
            {touched.has('name') && errors.name && (
              <p className="mt-1 text-xs text-ceramic-error">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Descrição <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => onChange('description', e.target.value || undefined)}
              onBlur={() => onBlur('description')}
              placeholder="Objetivo e instruções do treino..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              Categoria <span className="text-ceramic-error">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

          {/* Modality */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              Modalidade <span className="text-ceramic-error">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
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

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Duração (minutos) <span className="text-ceramic-error">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="600"
                step="5"
                value={formData.duration}
                onChange={(e) => onChange('duration', parseInt(e.target.value) || 0)}
                onBlur={() => onBlur('duration')}
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  touched.has('duration') && errors.duration
                    ? 'border-ceramic-error bg-ceramic-error/5'
                    : 'border-ceramic-text-secondary/20 bg-white/50'
                } text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50`}
              />
              <span className="text-sm text-ceramic-text-secondary">min</span>
            </div>
            {touched.has('duration') && errors.duration && (
              <p className="mt-1 text-xs text-ceramic-error">{errors.duration}</p>
            )}
          </div>

          {/* Intensity */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              Intensidade Geral <span className="text-ceramic-error">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INTENSITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange('intensity', option.value)}
                  onBlur={() => onBlur('intensity')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.intensity === option.value
                      ? `${option.color} shadow-md`
                      : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {touched.has('intensity') && errors.intensity && (
              <p className="mt-1 text-xs text-ceramic-error">{errors.intensity}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
