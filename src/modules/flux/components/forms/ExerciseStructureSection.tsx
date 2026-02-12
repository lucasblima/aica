/**
 * ExerciseStructureSection Component
 *
 * Orchestrates the display of correct exercise structure editor based on category:
 * - strength → SetsRepsEditor
 * - cardio_intervals → IntervalsEditor (currently mapped to 'main' or 'test')
 * - base_endurance/recovery → DistanceTimeEditor
 *
 * Note: WorkoutCategory doesn't have 'cardio_intervals' explicitly,
 * so we'll use heuristics: 'main' + endurance modality → intervals option
 */

import React, { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import type { TemplateFormState } from './useTemplateForm';
import type { ExerciseStructure } from '../../types/flow';
import SetsRepsEditor from './SetsRepsEditor';
import IntervalsEditor from './IntervalsEditor';
import DistanceTimeEditor from './DistanceTimeEditor';

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
  const [editorMode, setEditorMode] = useState<'sets' | 'intervals' | 'continuous'>(() => {
    // Determine initial mode based on category and modality
    if (formData.category === 'warmup' || formData.category === 'cooldown') {
      return 'continuous';
    }
    if (formData.modality === 'strength') {
      return 'sets';
    }
    if (formData.category === 'recovery') {
      return 'continuous';
    }
    // Default to intervals for main workouts in endurance modalities
    return 'intervals';
  });

  const handleStructureChange = (structure: ExerciseStructure) => {
    onChange('exercise_structure', structure);
  };

  const hasErrors = ['exercise_structure'].some(
    (field) => errors[field as keyof TemplateFormState]
  );

  // Determine which editors are available based on category and modality
  const availableEditors = (() => {
    const editors: Array<{ mode: typeof editorMode; label: string }> = [];

    if (formData.modality === 'strength') {
      editors.push({ mode: 'sets', label: 'Séries/Reps' });
    } else {
      // Endurance modalities can use either intervals or continuous
      if (formData.category === 'main' || formData.category === 'test') {
        editors.push({ mode: 'intervals', label: 'Intervalos' });
      }
      if (
        formData.category !== 'test' ||
        formData.category === 'recovery' ||
        formData.category === 'warmup' ||
        formData.category === 'cooldown'
      ) {
        editors.push({ mode: 'continuous', label: 'Contínuo' });
      }
    }

    return editors;
  })();

  // Summary text
  const getSummary = (): string => {
    if (!formData.exercise_structure) return 'Não configurado';

    const { sets, reps, intervals, distance, target_time } = formData.exercise_structure;

    if (sets && reps) {
      return `${sets} × ${reps} reps`;
    }
    if (intervals && intervals.length > 0) {
      return `${intervals.length} intervalos`;
    }
    if (distance && target_time) {
      const km = distance / 1000;
      return `${km >= 1 ? `${km.toFixed(1)}km` : `${distance}m`}`;
    }

    return 'Configurado';
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
            3. Estrutura do Exercício
          </span>
          {!isOpen && (
            <span className="text-xs text-ceramic-text-secondary">{getSummary()}</span>
          )}
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
          {/* Editor Mode Selector (if multiple available) */}
          {availableEditors.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                Tipo de Estrutura
              </label>
              <div className="flex items-center gap-2">
                {availableEditors.map((editor) => (
                  <button
                    key={editor.mode}
                    type="button"
                    onClick={() => setEditorMode(editor.mode)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      editorMode === editor.mode
                        ? 'bg-ceramic-accent text-white shadow-md'
                        : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                    }`}
                  >
                    {editor.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editor Content */}
          <div className="p-4 bg-white/20 rounded-lg">
            {editorMode === 'sets' && (
              <SetsRepsEditor
                structure={formData.exercise_structure}
                onChange={handleStructureChange}
              />
            )}

            {editorMode === 'intervals' && (
              <IntervalsEditor
                structure={formData.exercise_structure}
                onChange={handleStructureChange}
              />
            )}

            {editorMode === 'continuous' && (
              <DistanceTimeEditor
                structure={formData.exercise_structure}
                onChange={handleStructureChange}
                modality={formData.modality as string}
              />
            )}
          </div>

          {/* Common Description Field */}
          {editorMode !== 'continuous' && (
            <div>
              <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                Instruções Adicionais{' '}
                <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
              </label>
              <textarea
                value={formData.exercise_structure?.description || ''}
                onChange={(e) =>
                  handleStructureChange({
                    ...formData.exercise_structure,
                    description: e.target.value,
                  })
                }
                placeholder="Observações técnicas, foco do treino, etc..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
              />
            </div>
          )}

          {/* Preview Card */}
          {formData.exercise_structure && (
            <div className="flex items-center gap-2 p-3 ceramic-inset rounded-lg">
              <Eye className="w-4 h-4 text-ceramic-accent" />
              <div className="flex-1">
                <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider mb-0.5">
                  Preview Rápido
                </p>
                <p className="text-sm font-medium text-ceramic-text-primary">{getSummary()}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
