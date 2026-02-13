/**
 * ExerciseStructureSection Component (V2)
 *
 * Complete rebuild of exercise structure editor with simplified UX.
 *
 * New structure:
 * 1. Warmup (textarea, 280 char limit)
 * 2. Series Editor (dynamic add/remove, modality-specific forms, zone selection)
 * 3. Timeline Visual (horizontal bar showing zone distribution)
 * 4. Cooldown (textarea, 280 char limit)
 *
 * Removed from V1:
 * - Standalone intensity section (embedded in series)
 * - Three separate editors (Sets/Intervals/Distance) → unified SeriesEditor
 * - Organization section (tags, levels, public/favorite flags)
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import SeriesEditor from './SeriesEditor';
import TimelineVisual from './TimelineVisual';
import type { TemplateFormState } from './useTemplateForm';
import type { WorkoutSeries } from '../../types/series';

interface ExerciseStructureSectionProps {
  formData: TemplateFormState;
  errors: Partial<Record<keyof TemplateFormState, string>>;
  touched: Set<string>;
  onChange: (name: keyof TemplateFormState, value: any) => void;
  onBlur: (name: keyof TemplateFormState) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ExerciseStructureSection({
  formData,
  errors,
  touched,
  onChange,
  onBlur,
  isOpen,
  onToggle,
}: ExerciseStructureSectionProps) {
  const [warmupCharCount, setWarmupCharCount] = useState(0);
  const [cooldownCharCount, setCooldownCharCount] = useState(0);

  // Update char counts on mount and when exercise_structure changes
  useEffect(() => {
    setWarmupCharCount(formData.exercise_structure?.warmup?.length || 0);
    setCooldownCharCount(formData.exercise_structure?.cooldown?.length || 0);
  }, [formData.exercise_structure?.warmup, formData.exercise_structure?.cooldown]);

  const hasErrors = ['exercise_structure'].some(
    (field) => errors[field as keyof TemplateFormState]
  );

  const handleWarmupChange = (value: string) => {
    if (value.length <= 280) {
      setWarmupCharCount(value.length);
      onChange('exercise_structure', {
        ...formData.exercise_structure,
        warmup: value,
        series: formData.exercise_structure?.series || [],
        cooldown: formData.exercise_structure?.cooldown || '',
      });
    }
  };

  const handleCooldownChange = (value: string) => {
    if (value.length <= 280) {
      setCooldownCharCount(value.length);
      onChange('exercise_structure', {
        ...formData.exercise_structure,
        warmup: formData.exercise_structure?.warmup || '',
        series: formData.exercise_structure?.series || [],
        cooldown: value,
      });
    }
  };

  const handleSeriesChange = (series: WorkoutSeries[]) => {
    onChange('exercise_structure', {
      ...formData.exercise_structure,
      warmup: formData.exercise_structure?.warmup || '',
      series,
      cooldown: formData.exercise_structure?.cooldown || '',
    });
  };

  return (
    <div className="ceramic-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-ceramic-text-primary">
            2. Estrutura do Exercício
          </span>
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
        <div className="p-4 pt-0 space-y-6 border-t border-ceramic-text-secondary/10">
          {/* Warmup */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Aquecimento <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
            </label>
            <textarea
              value={formData.exercise_structure?.warmup || ''}
              onChange={(e) => handleWarmupChange(e.target.value)}
              onBlur={() => onBlur('exercise_structure')}
              placeholder="Descreva o aquecimento... (máx. 280 caracteres)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-xs ${
                  warmupCharCount > 280
                    ? 'text-ceramic-error font-medium'
                    : 'text-ceramic-text-secondary'
                }`}
              >
                {warmupCharCount}/280 caracteres
              </span>
            </div>
          </div>

          {/* Series Editor */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              Séries <span className="text-ceramic-error">*</span>
            </label>
            <SeriesEditor
              modality={formData.modality}
              series={formData.exercise_structure?.series || []}
              onChange={handleSeriesChange}
            />
            {touched.has('exercise_structure') && errors.exercise_structure && (
              <p className="mt-2 text-xs text-ceramic-error">{errors.exercise_structure}</p>
            )}
          </div>

          {/* Timeline Visual */}
          {formData.exercise_structure?.series && formData.exercise_structure.series.length > 0 && (
            <TimelineVisual series={formData.exercise_structure.series} />
          )}

          {/* Cooldown */}
          <div>
            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
              Desaquecimento <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
            </label>
            <textarea
              value={formData.exercise_structure?.cooldown || ''}
              onChange={(e) => handleCooldownChange(e.target.value)}
              onBlur={() => onBlur('exercise_structure')}
              placeholder="Descreva o desaquecimento... (máx. 280 caracteres)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-xs ${
                  cooldownCharCount > 280
                    ? 'text-ceramic-error font-medium'
                    : 'text-ceramic-text-secondary'
                }`}
              >
                {cooldownCharCount}/280 caracteres
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
