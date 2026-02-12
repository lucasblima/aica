/**
 * WorkoutBlockEditor - Drawer panel for editing workout details
 *
 * Slides in from right, allows editing:
 * - Basic details (name, duration, intensity)
 * - Specific parameters (FTP%, Pace zones, Sets/Reps)
 * - Coach notes (free text)
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Activity, Target, MessageSquare } from 'lucide-react';
import type { WorkoutBlockData } from './WorkoutBlock';
import type { WorkoutIntensity } from '../../mockData/workoutTemplates';

interface WorkoutBlockEditorProps {
  workout: WorkoutBlockData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: WorkoutBlockData) => void;
}

export const WorkoutBlockEditor: React.FC<WorkoutBlockEditorProps> = ({
  workout,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<WorkoutBlockData | null>(null);

  // Sync form data when workout changes
  useEffect(() => {
    if (workout) {
      setFormData(workout);
    }
  }, [workout]);

  if (!isOpen || !formData) return null;

  const handleSave = () => {
    console.log('Saving workout:', formData);
    onSave(formData);
    onClose();
  };

  const updateField = <K extends keyof WorkoutBlockData>(
    field: K,
    value: WorkoutBlockData[K]
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-96 bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col animate-slide-in-right"
        style={{
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
                Editando Treino
              </p>
              <h2 className="text-xl font-bold text-ceramic-text-primary">
                {formData.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="ceramic-inset p-2 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5 text-stone-600" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Details */}
          <Section icon={Activity} title="Detalhes Básicos">
            <div className="space-y-4">
              <InputField
                label="Nome do Treino"
                value={formData.name}
                onChange={(value) => updateField('name', value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Duração (min)"
                  type="number"
                  value={formData.duration.toString()}
                  onChange={(value) => updateField('duration', parseInt(value) || 0)}
                />

                <SelectField
                  label="Intensidade"
                  value={formData.intensity}
                  onChange={(value) => updateField('intensity', value as WorkoutIntensity)}
                  options={[
                    { value: 'low', label: 'Leve' },
                    { value: 'medium', label: 'Média' },
                    { value: 'high', label: 'Alta' },
                  ]}
                />
              </div>

              {/* Sets/Reps/Rest */}
              <div className="grid grid-cols-3 gap-3">
                <InputField
                  label="Séries"
                  type="number"
                  value={formData.sets?.toString() || ''}
                  onChange={(value) => updateField('sets', parseInt(value) || undefined)}
                  placeholder="Ex: 5"
                />
                <InputField
                  label="Repetições"
                  value={formData.reps || ''}
                  onChange={(value) => updateField('reps', value)}
                  placeholder="Ex: 400m"
                />
                <InputField
                  label="Descanso"
                  value={formData.rest || ''}
                  onChange={(value) => updateField('rest', value)}
                  placeholder="Ex: 30s"
                />
              </div>
            </div>
          </Section>

          {/* Section 2: Specific Parameters (FTP/Pace) */}
          <Section icon={Target} title="Parâmetros de Carga">
            <div className="space-y-4">
              {/* Show different inputs based on modality */}
              {formData.modality === 'cycling' && (
                <div className="ceramic-inset p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    FTP Target (%)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-info"
                    placeholder="Ex: 85 (para 85% do FTP)"
                    min="0"
                    max="150"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Percentual do FTP (Functional Threshold Power)
                  </p>
                </div>
              )}

              {formData.modality === 'running' && (
                <div className="ceramic-inset p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    Pace Zone
                  </label>
                  <select className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-info">
                    <option value="">Selecione...</option>
                    <option value="Z1">Z1 - Recovery</option>
                    <option value="Z2">Z2 - Aeróbico</option>
                    <option value="Z3">Z3 - Tempo</option>
                    <option value="Z4">Z4 - Threshold</option>
                    <option value="VO2Max">VO2 Max</option>
                    <option value="Sprint">Sprint</option>
                  </select>
                  <p className="text-xs text-stone-500 mt-1">
                    Zona de ritmo baseada no limiar
                  </p>
                </div>
              )}

              {formData.modality === 'swimming' && (
                <div className="ceramic-inset p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    CSS Target (%)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-info"
                    placeholder="Ex: 90 (para 90% do CSS)"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Percentual do CSS (Critical Swim Speed)
                  </p>
                </div>
              )}

              {formData.modality === 'strength' && (
                <div className="ceramic-inset p-4 rounded-lg">
                  <p className="text-xs text-stone-600">
                    Parâmetros de carga para musculação serão configurados por exercício individual.
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* Section 3: Coach Notes */}
          <Section icon={MessageSquare} title="Notas do Coach">
            <textarea
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-info resize-none"
              rows={6}
              placeholder="Instruções específicas, dicas técnicas, ajustes personalizados..."
            />
          </Section>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-ceramic-success hover:bg-ceramic-success/90 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

// ============================================
// Helper Components
// ============================================

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon: Icon, title, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <div className="ceramic-inset p-1.5">
        <Icon className="w-4 h-4 text-ceramic-info" />
      </div>
      <h3 className="text-sm font-bold text-ceramic-text-primary uppercase tracking-wider">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}) => (
  <div>
    <label className="block text-xs font-semibold text-stone-700 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-info"
    />
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-semibold text-stone-700 mb-1.5">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ceramic-info"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
