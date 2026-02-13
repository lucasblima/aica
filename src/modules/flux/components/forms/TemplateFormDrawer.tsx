/**
 * TemplateFormDrawer Component
 *
 * Drawer lateral (desktop) / bottom (mobile) para criação/edição de exercícios.
 * Inspirado no design da Apple - transições suaves, contexto preservado.
 *
 * Features:
 * - Desktop: Slide-in da direita (40% width)
 * - Mobile: Slide-in de baixo (full-height)
 * - Backdrop translúcido (preserva contexto)
 * - Swipe to dismiss (mobile)
 * - 2 seções: Basic Info + Exercise Structure
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { useTemplateForm } from './useTemplateForm';
import BasicInfoSection from './BasicInfoSection';
import ExerciseStructureSection from './ExerciseStructureSection';
import type { WorkoutTemplate } from '../../types/flow';

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

  // Accordion state
  const [openSections, setOpenSections] = useState({
    basic: true,
    structure: false,
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Swipe to dismiss (mobile)
  const y = useMotionValue(0);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
      // Auto-close after 1 second
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
    // Close drawer if dragged down >150px on mobile
    if (info.offset.y > 150) {
      handleCloseClick();
    }
  };

  const errorCount = Object.keys(errors).length;
  const isFormValid = errorCount === 0 && formData.modality && formData.category;

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
                    ? 'Configure os detalhes do exercício'
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
              <div className="p-6 space-y-4">
                {/* Error Summary */}
                {submitError && (
                  <div className="flex items-start gap-3 p-4 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-ceramic-error mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ceramic-error">{submitError}</p>
                    </div>
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
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-600">
                        Exercício salvo com sucesso!
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Section 1: Basic Info */}
                <BasicInfoSection
                  formData={formData}
                  errors={errors}
                  touched={touched}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  isOpen={openSections.basic}
                  onToggle={() => toggleSection('basic')}
                />

                {/* Section 2: Exercise Structure */}
                <ExerciseStructureSection
                  formData={formData}
                  errors={errors}
                  touched={touched}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  isOpen={openSections.structure}
                  onToggle={() => toggleSection('structure')}
                />
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
