/**
 * WorkoutBlockEditor - Drawer panel for editing workout details
 *
 * Slides in from right, allows editing:
 * - Basic details (name, duration, intensity)
 * - Specific parameters (FTP%, Pace zones, Sets/Reps)
 * - Coach notes (free text)
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Activity, Target, MessageSquare, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WorkoutBlockData } from './WorkoutBlock';
import type { WorkoutIntensity } from '../../types';

interface WorkoutBlockEditorProps {
  workout: WorkoutBlockData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: WorkoutBlockData) => void | Promise<void>;
}

export const WorkoutBlockEditor: React.FC<WorkoutBlockEditorProps> = ({
  workout,
  isOpen,
  onClose,
  onSave,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<WorkoutBlockData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Sync form data when workout changes
  useEffect(() => {
    if (workout) {
      setFormData(workout);
      setSaveStatus('idle');
    }
  }, [workout]);

  if (!isOpen || !formData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(formData);
      setSaveStatus('success');
      setTimeout(() => {
        onClose();
        setSaveStatus('idle');
      }, 600);
    } catch (err) {
      console.error('Error saving workout:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
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
        className="fixed right-0 top-0 h-full w-96 bg-ceramic-base border-l border-ceramic-text-secondary/10 shadow-2xl z-50 flex flex-col animate-slide-in-right"
        style={{
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-ceramic-text-secondary/10">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
                {formData.id ? 'Editando Treino' : 'Novo Treino'}
              </p>
              <h2 className="text-xl font-bold text-ceramic-text-primary">
                {formData.name || 'Sem nome'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-[10px] hover:bg-ceramic-text-secondary/10 transition-colors"
              style={{
                boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
              }}
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
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
                  <label className="block text-xs font-semibold text-ceramic-text-secondary mb-2">
                    FTP Target (%)
                  </label>
                  <input
                    type="number"
                    value={formData.ftp_percentage ?? ''}
                    onChange={(e) => updateField('ftp_percentage', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-[10px] text-sm text-ceramic-text-primary bg-ceramic-base focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    style={{
                      boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
                    }}
                    placeholder="Ex: 85 (para 85% do FTP)"
                    min="0"
                    max="150"
                  />
                  <p className="text-xs text-ceramic-text-secondary mt-1">
                    Percentual do FTP (Functional Threshold Power)
                  </p>
                </div>
              )}

              {formData.modality === 'running' && (
                <div className="ceramic-inset p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-ceramic-text-secondary mb-2">
                    Pace Zone
                  </label>
                  <select
                    value={formData.pace_zone ?? ''}
                    onChange={(e) => updateField('pace_zone', e.target.value || undefined)}
                    className="w-full px-3 py-2 rounded-[10px] text-sm text-ceramic-text-primary bg-ceramic-base focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    style={{
                      boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
                    }}
                  >
                    <option value="">Selecione...</option>
                    <option value="Z1">Z1 - Recovery</option>
                    <option value="Z2">Z2 - Aerobico</option>
                    <option value="Z3">Z3 - Tempo</option>
                    <option value="Z4">Z4 - Threshold</option>
                    <option value="Z5">Z5 - VO2 Max</option>
                  </select>
                  <p className="text-xs text-ceramic-text-secondary mt-1">
                    Zona de ritmo baseada no limiar
                  </p>
                </div>
              )}

              {formData.modality === 'swimming' && (
                <div className="ceramic-inset p-4 rounded-lg">
                  <label className="block text-xs font-semibold text-ceramic-text-secondary mb-2">
                    CSS Target (%)
                  </label>
                  <input
                    type="number"
                    value={formData.css_percentage ?? ''}
                    onChange={(e) => updateField('css_percentage', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-[10px] text-sm text-ceramic-text-primary bg-ceramic-base focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    style={{
                      boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
                    }}
                    placeholder="Ex: 90 (para 90% do CSS)"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-ceramic-text-secondary mt-1">
                    Percentual do CSS (Critical Swim Speed)
                  </p>
                </div>
              )}

              {formData.modality === 'strength' && (
                <div className="ceramic-inset p-4 rounded-lg">
                  <p className="text-xs text-ceramic-text-secondary">
                    Parametros de carga para musculacao serao configurados por exercicio individual.
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
              className="w-full px-3 py-2 rounded-[10px] text-sm text-ceramic-text-primary bg-ceramic-base focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
              style={{
                boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
              }}
              rows={6}
              placeholder="Instrucoes especificas, dicas tecnicas, ajustes personalizados..."
            />
          </Section>

          {/* Link to full template editor */}
          {formData.templateId && (
            <div className="ceramic-inset p-4 rounded-xl">
              <p className="text-xs text-ceramic-text-secondary mb-2">
                Este treino foi criado a partir de um exercicio da biblioteca.
              </p>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/flux/templates/edit/${formData.templateId}`);
                }}
                className="flex items-center gap-2 text-sm font-bold text-ceramic-accent hover:text-ceramic-accent/80 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Editar exercicio completo
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-ceramic-text-secondary/10">
          {saveStatus === 'error' && (
            <p className="text-xs text-ceramic-error font-medium mb-3 text-center">
              Erro ao salvar. Tente novamente.
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 rounded-[14px] text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform disabled:opacity-50"
              style={{
                background: '#F0EFE9',
                boxShadow: '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-bold transition-colors ${
                saveStatus === 'success'
                  ? 'bg-ceramic-success text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              } disabled:opacity-70`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Salvo
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar
                </>
              )}
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
    <label className="block text-xs font-semibold text-ceramic-text-secondary mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-[10px] text-sm text-ceramic-text-primary bg-ceramic-base focus:outline-none focus:ring-2 focus:ring-amber-400/40"
      style={{
        boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
      }}
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
    <label className="block text-xs font-semibold text-ceramic-text-secondary mb-1.5">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-[10px] text-sm text-ceramic-text-primary bg-ceramic-base focus:outline-none focus:ring-2 focus:ring-amber-400/40"
      style={{
        boxShadow: 'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
