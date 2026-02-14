/**
 * TemplateFormDrawer Component (V3 - Flat)
 *
 * Drawer lateral for exercise creation/editing.
 * Flat layout — no accordions, modality always visible.
 *
 * Flow: Modality → Aquecimento → Séries → Desaquecimento → Timeline
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { useTemplateForm } from './useTemplateForm';
import SeriesEditor from './SeriesEditor';
import TimelineVisual from './TimelineVisual';
import type { WorkoutTemplate, TrainingModality } from '../../types/flow';
import type { WorkoutSeries } from '../../types/series';
import { MODALITY_CONFIG } from '../../types/flux';

const MODALITY_OPTIONS: TrainingModality[] = ['swimming', 'running', 'cycling', 'strength', 'walking'];

interface TemplateFormDrawerProps {
  mode: 'create' | 'edit';
  initialData?: WorkoutTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: WorkoutTemplate) => void;
}

export default function TemplateFormDrawer({
  mode,
  initialData,
  isOpen,
  onClose,
  onSave,
}: TemplateFormDrawerProps) {
  const {
    formData,
    errors,
    touched,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useTemplateForm({
    initialData,
    onSuccess: (template) => {
      onSave(template);
    },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [warmupCharCount, setWarmupCharCount] = useState(0);
  const [cooldownCharCount, setCooldownCharCount] = useState(0);

  const y = useMotionValue(0);

  // Reset success/error state when drawer opens (prevents stale messages on edit)
  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setWarmupCharCount(formData.exercise_structure?.warmup?.length || 0);
    setCooldownCharCount(formData.exercise_structure?.cooldown?.length || 0);
  }, [formData.exercise_structure?.warmup, formData.exercise_structure?.cooldown]);

  const handleCloseClick = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'Você tem alterações não salvas. Deseja realmente sair?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    const result = await handleSubmit();

    if (result.success) {
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setSubmitError(
        typeof result.error === 'string' ? result.error : 'Erro ao salvar exercício'
      );
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 150) {
      handleCloseClick();
    }
  };

  const handleWarmupChange = (value: string) => {
    if (value.length <= 280) {
      handleChange('exercise_structure', {
        ...formData.exercise_structure,
        warmup: value,
        series: formData.exercise_structure?.series || [],
        cooldown: formData.exercise_structure?.cooldown || '',
      });
    }
  };

  const handleCooldownChange = (value: string) => {
    if (value.length <= 280) {
      handleChange('exercise_structure', {
        ...formData.exercise_structure,
        warmup: formData.exercise_structure?.warmup || '',
        series: formData.exercise_structure?.series || [],
        cooldown: value,
      });
    }
  };

  const handleSeriesChange = (series: WorkoutSeries[]) => {
    handleChange('exercise_structure', {
      ...formData.exercise_structure,
      warmup: formData.exercise_structure?.warmup || '',
      series,
      cooldown: formData.exercise_structure?.cooldown || '',
    });
  };

  const errorCount = Object.keys(errors).length;
  const isFormValid = errorCount === 0 && !!formData.modality;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={handleCloseClick}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[600px] lg:w-[700px] bg-ceramic-base shadow-2xl flex flex-col
                       sm:rounded-l-2xl overflow-hidden"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center py-2 bg-ceramic-base border-b border-ceramic-text-secondary/10">
              <div className="w-12 h-1 rounded-full bg-ceramic-text-secondary/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10 bg-white/20">
              <div>
                <h2 className="text-2xl font-black text-ceramic-text-primary">
                  {mode === 'create' ? 'Novo Exercício' : 'Editar Exercício'}
                </h2>
                <p className="text-sm text-ceramic-text-secondary mt-1">
                  {mode === 'create'
                    ? 'Selecione a modalidade e monte as séries'
                    : 'Atualize as informações'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseClick}
                className="p-2 hover:bg-white/30 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-ceramic-text-secondary" />
              </button>
            </div>

            {/* Form Content (scrollable) */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Error Summary */}
                {submitError && (
                  <div className="flex items-start gap-3 p-4 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-ceramic-error mt-0.5" />
                    <p className="text-sm font-medium text-ceramic-error">{submitError}</p>
                  </div>
                )}

                {/* Success Message */}
                {submitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                  >
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-sm font-medium text-green-600">
                      Exercício salvo com sucesso!
                    </p>
                  </motion.div>
                )}

                {/* Modality Selection (always visible, no accordion) */}
                <div>
                  <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                    Modalidade
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {MODALITY_OPTIONS.map((modality) => {
                      const config = MODALITY_CONFIG[modality];
                      return (
                        <button
                          key={modality}
                          type="button"
                          onClick={() => handleChange('modality', modality)}
                          className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                            formData.modality === modality
                              ? 'bg-ceramic-accent text-white shadow-md scale-105'
                              : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                          }`}
                        >
                          <span className="text-lg">{config?.icon}</span>
                          <span className="text-xs">{config?.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {touched.has('modality') && errors.modality && (
                    <p className="mt-1 text-xs text-ceramic-error">{errors.modality}</p>
                  )}
                </div>

                {/* Name & Description (edit mode only) */}
                {mode === 'edit' && (
                  <div className="space-y-3 p-3 ceramic-inset rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
                        Nome do Exercício
                      </label>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Gerado automaticamente ao salvar"
                        className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
                        Descrição
                      </label>
                      <input
                        type="text"
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Gerada automaticamente ao salvar"
                        className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Aquecimento */}
                <div>
                  <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                    Aquecimento <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
                  </label>
                  <textarea
                    value={formData.exercise_structure?.warmup || ''}
                    onChange={(e) => handleWarmupChange(e.target.value)}
                    placeholder="Descreva o aquecimento..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none text-sm"
                  />
                  <span className="text-xs text-ceramic-text-secondary">
                    {warmupCharCount}/280
                  </span>
                </div>

                {/* Séries */}
                <div>
                  <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                    Séries
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

                {/* Desaquecimento */}
                <div>
                  <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                    Desaquecimento <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
                  </label>
                  <textarea
                    value={formData.exercise_structure?.cooldown || ''}
                    onChange={(e) => handleCooldownChange(e.target.value)}
                    placeholder="Descreva o desaquecimento..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none text-sm"
                  />
                  <span className="text-xs text-ceramic-text-secondary">
                    {cooldownCharCount}/280
                  </span>
                </div>

                {/* Timeline Visual (after cooldown) */}
                {formData.exercise_structure?.series && formData.exercise_structure.series.length > 0 && (
                  <TimelineVisual series={formData.exercise_structure.series} />
                )}
              </div>
            </form>

            {/* Footer (fixed) */}
            <div className="flex items-center justify-between p-6 border-t border-ceramic-text-secondary/10 bg-white/20">
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 text-ceramic-error">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {errorCount} erro{errorCount > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {isDirty && !errorCount && (
                  <span className="text-xs text-ceramic-text-secondary">Alterações não salvas</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseClick}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-ceramic-text-primary hover:bg-white/30 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleFormSubmit}
                  disabled={!isFormValid || isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{mode === 'create' ? 'Criar Exercício' : 'Salvar'}</span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
