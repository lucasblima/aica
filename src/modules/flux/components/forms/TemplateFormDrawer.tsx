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
import { X, AlertCircle, CheckCircle, Lock, Globe } from 'lucide-react';
import { useTemplateForm } from './useTemplateForm';
import SeriesEditor from './SeriesEditor';
import TimelineVisual from './TimelineVisual';
import type { WorkoutTemplate, TrainingModality } from '../../types/flow';
import type { WorkoutSeries } from '../../types/series';
import { MODALITY_CONFIG } from '../../types/flux';

const MODALITY_OPTIONS: TrainingModality[] = ['swimming', 'running', 'cycling', 'strength', 'walking', 'triathlon'];

interface TemplateFormDrawerProps {
  mode: 'create' | 'edit';
  initialData?: WorkoutTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: WorkoutTemplate) => void;
  /** When true, skip DB save and return form data directly (used by Canvas slot editor) */
  skipServiceSave?: boolean;
}

export default function TemplateFormDrawer({
  mode,
  initialData,
  isOpen,
  onClose,
  onSave,
  skipServiceSave,
}: TemplateFormDrawerProps) {
  const {
    formData,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isDescriptionManuallyEdited,
    setIsDescriptionManuallyEdited,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useTemplateForm({
    mode,
    isOpen,
    initialData,
    onSuccess: (template) => {
      onSave(template);
    },
    skipServiceSave,
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [warmupCharCount, setWarmupCharCount] = useState(0);
  const [cooldownCharCount, setCooldownCharCount] = useState(0);
  const [descCharCount, setDescCharCount] = useState(0);
  const [coachNotesCharCount, setCoachNotesCharCount] = useState(0);

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

  useEffect(() => {
    setDescCharCount(formData.description?.length || 0);
    setCoachNotesCharCount(formData.coach_notes?.length || 0);
  }, [formData.description, formData.coach_notes]);

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
    if (value.length <= 140) {
      handleChange('exercise_structure', {
        ...formData.exercise_structure,
        warmup: value,
        series: formData.exercise_structure?.series || [],
        cooldown: formData.exercise_structure?.cooldown || '',
      });
    }
  };

  const handleCooldownChange = (value: string) => {
    if (value.length <= 140) {
      handleChange('exercise_structure', {
        ...formData.exercise_structure,
        warmup: formData.exercise_structure?.warmup || '',
        series: formData.exercise_structure?.series || [],
        cooldown: value,
      });
    }
  };

  const handleDescriptionChange = (value: string) => {
    if (value.length <= 280) {
      handleChange('description', value);
    }
  };

  // #426: Whether to show post-modality sections (progressive disclosure)
  const isModalitySelected = !!formData.modality;

  const handleCoachNotesChange = (value: string) => {
    if (value.length <= 500) {
      handleChange('coach_notes', value);
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

            {/* Timeline Visual — sticky above form (#465), hidden for strength (#551) */}
            {formData.modality !== 'strength' && formData.exercise_structure?.series && formData.exercise_structure.series.length > 0 && (
              <div className="px-6 py-3 border-b border-ceramic-text-secondary/10 bg-ceramic-base/95 backdrop-blur-sm">
                <TimelineVisual series={formData.exercise_structure.series} />
              </div>
            )}

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
                    className="flex items-start gap-3 p-4 bg-ceramic-success/10 border border-ceramic-success/20 rounded-lg"
                  >
                    <CheckCircle className="w-5 h-5 text-ceramic-success mt-0.5" />
                    <p className="text-sm font-medium text-ceramic-success">
                      Exercício salvo com sucesso!
                    </p>
                  </motion.div>
                )}

                {/* Modality Selection (always visible, no accordion) */}
                <div>
                  <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                    Modalidade
                  </label>
                  <p className="text-xs text-ceramic-text-secondary mb-3">
                    Clique na modalidade para iniciar a criação do exercicio
                  </p>
                  <div className={`grid grid-cols-3 sm:grid-cols-5 gap-2 ${
                    !formData.modality ? 'ring-2 ring-ceramic-accent/30 rounded-lg p-1' : ''
                  }`}>
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

                {/* #426: Progressive disclosure — show remaining fields only after modality is selected */}
                <AnimatePresence>
                  {isModalitySelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="space-y-6 overflow-hidden"
                    >
                      {/* #426: Prompt removed — fields revealed smoothly */}

                      {/* #458: Public/Private visibility toggle */}
                      <div>
                        <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                          Visibilidade
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleChange('is_public', false)}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                              !formData.is_public
                                ? 'bg-ceramic-text-primary text-white shadow-md'
                                : 'ceramic-inset hover:bg-white/50 text-ceramic-text-secondary'
                            }`}
                          >
                            <Lock className="w-4 h-4" />
                            <div className="text-left">
                              <span className="block">Privado</span>
                              <span className={`block text-xs font-normal ${!formData.is_public ? 'text-white/70' : 'text-ceramic-text-secondary/70'}`}>
                                Você e seus atletas
                              </span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChange('is_public', true)}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                              formData.is_public
                                ? 'bg-ceramic-accent text-white shadow-md'
                                : 'ceramic-inset hover:bg-white/50 text-ceramic-text-secondary'
                            }`}
                          >
                            <Globe className="w-4 h-4" />
                            <div className="text-left">
                              <span className="block">Publico</span>
                              <span className={`block text-xs font-normal ${formData.is_public ? 'text-white/70' : 'text-ceramic-text-secondary/70'}`}>
                                Marketplace da Aica
                              </span>
                            </div>
                          </button>
                        </div>
                        <p className="text-xs text-ceramic-text-secondary mt-2">
                          {formData.is_public
                            ? 'Este exercicio ficara disponível na biblioteca publica para outros treinadores.'
                            : 'Apenas você e seus atletas terao acesso a este exercicio.'}
                        </p>
                      </div>

                      {/* Name & Description (#421: show in both modes for consistency) */}
                      {mode === 'edit' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
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
                            <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                              Descrição
                              {isDescriptionManuallyEdited && (
                                <span className="ml-2 text-xs text-ceramic-text-secondary font-normal">(editada manualmente)</span>
                              )}
                            </label>
                            <textarea
                              value={formData.description || ''}
                              onChange={(e) => handleDescriptionChange(e.target.value)}
                              placeholder="Gerada automaticamente ao salvar"
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none text-sm"
                            />
                            <span className="text-xs text-ceramic-text-secondary">
                              {descCharCount}/280
                            </span>
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
                          {warmupCharCount}/140
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
                          {cooldownCharCount}/140
                        </span>
                      </div>

                      {/* Coach Notes */}
                      <div>
                        <label className="block text-sm font-medium text-ceramic-text-primary mb-1">
                          Notas do Coach <span className="text-ceramic-text-secondary text-xs">(opcional)</span>
                        </label>
                        <textarea
                          value={formData.coach_notes || ''}
                          onChange={(e) => handleCoachNotesChange(e.target.value)}
                          placeholder="Observações, orientações ou lembretes para este exercício..."
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-ceramic-text-secondary/20 bg-white/50 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none text-sm"
                        />
                        <span className="text-xs text-ceramic-text-secondary">
                          {coachNotesCharCount}/500
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* #426: Hint when no modality is selected */}
                {!isModalitySelected && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-ceramic-text-secondary text-center py-8"
                  >
                    Selecione uma modalidade acima para montar o exercício
                  </motion.p>
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
