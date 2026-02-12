/**
 * TemplateFormModal Component
 *
 * Modal wrapper for template creation/editing with:
 * - 4 Accordion sections (BasicInfo, Intensity, ExerciseStructure, Organization)
 * - Form validation and submission
 * - Dirty state warning on close
 * - Loading states
 * - Ceramic design system styling
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { useTemplateForm } from './useTemplateForm';
import BasicInfoSection from './BasicInfoSection';
import IntensitySection from './IntensitySection';
import ExerciseStructureSection from './ExerciseStructureSection';
import OrganizationSection from './OrganizationSection';
import type { WorkoutTemplate } from '../../types/flow';

interface TemplateFormModalProps {
  mode: 'create' | 'edit';
  initialData?: WorkoutTemplate;
  onClose: () => void;
  onSave: (template: WorkoutTemplate) => void;
}

export default function TemplateFormModal({
  mode,
  initialData,
  onClose,
  onSave,
}: TemplateFormModalProps) {
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
    intensity: false,
    structure: false,
    organization: false,
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
        typeof result.error === 'string' ? result.error : 'Erro ao salvar template'
      );
    }
  };

  const errorCount = Object.keys(errors).length;
  const isFormValid = errorCount === 0 && formData.name && formData.category && formData.modality;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseClick();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-3xl max-h-[90vh] bg-ceramic-base rounded-2xl shadow-ceramic-deep overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
            <div>
              <h2 className="text-2xl font-black text-ceramic-text-primary">
                {mode === 'create' ? 'Criar Template' : 'Editar Template'}
              </h2>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                {mode === 'create'
                  ? 'Configure os detalhes do novo template de treino'
                  : 'Atualize as informações do template'}
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

          {/* Form Content */}
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
                      Template salvo com sucesso!
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

              {/* Section 2: Intensity */}
              <IntensitySection
                formData={formData}
                errors={errors}
                touched={touched}
                onChange={handleChange}
                onBlur={handleBlur}
                isOpen={openSections.intensity}
                onToggle={() => toggleSection('intensity')}
              />

              {/* Section 3: Exercise Structure */}
              <ExerciseStructureSection
                formData={formData}
                errors={errors}
                touched={touched}
                onChange={handleChange}
                onBlur={handleBlur}
                isOpen={openSections.structure}
                onToggle={() => toggleSection('structure')}
              />

              {/* Section 4: Organization */}
              <OrganizationSection
                formData={formData}
                errors={errors}
                touched={touched}
                onChange={handleChange}
                onBlur={handleBlur}
                isOpen={openSections.organization}
                onToggle={() => toggleSection('organization')}
              />
            </div>
          </form>

          {/* Footer */}
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
                className="flex items-center gap-2 px-6 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{mode === 'create' ? 'Criar Template' : 'Salvar Alterações'}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
