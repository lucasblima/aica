/**
 * AthleteFormModal Component (Refactored v3.0)
 *
 * Modal for creating/editing athletes with:
 * - 3 Accordion sections (BasicInfo, Modalities, Health Config)
 * - Integrated modality + level selection
 * - Health documentation configuration (coach perspective)
 * - Form validation and submission via useAthleteForm hook
 * - Dirty state warning on close
 * - Ceramic design system styling
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  User,
  Target,
  Heart,
  Info,
} from 'lucide-react';
import type { Athlete, ModalityLevel } from '../../types/flux';
import {
  useAthleteForm,
  MODALITY_OPTIONS,
  LEVEL_OPTIONS,
} from '../../hooks/useAthleteForm';

interface AthleteFormModalProps {
  mode: 'create' | 'edit';
  initialData?: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onSave: (athlete: Partial<Athlete> & { modalityLevels?: ModalityLevel[] }) => Promise<void>;
}

export default function AthleteFormModal({
  mode,
  initialData,
  isOpen,
  onClose,
  onSave,
}: AthleteFormModalProps) {
  const {
    formData,
    errors,
    isDirty,
    isSubmitting,
    submitError,
    submitSuccess,
    isFormValid,
    errorCount,
    handleChange,
    handleModalityToggle,
    handleLevelChange,
    handleSubmit,
    handleClose,
  } = useAthleteForm({ mode, initialData, isOpen, onSave, onClose, autoCloseDelayMs: 1500 });

  // Accordion state
  const [openSections, setOpenSections] = useState({
    basic: true,
    modalities: false,
    health: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
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
                {mode === 'create' ? 'Novo Atleta' : 'Editar Atleta'}
              </h2>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                {mode === 'create'
                  ? 'Cadastre um novo atleta no sistema'
                  : 'Atualize as informações do atleta'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-white/30 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
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
                  className="flex items-start gap-3 p-4 bg-ceramic-success/10 border border-ceramic-success/20 rounded-lg"
                >
                  <CheckCircle className="w-5 h-5 text-ceramic-success mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ceramic-success">
                      Atleta salvo com sucesso!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Section 1: Basic Info */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('basic')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <User className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      1. Informações Básicas
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.basic ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.basic && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        placeholder="Nome completo do atleta"
                      />
                      {errors.name && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        disabled={initialData?.invitation_status === 'connected'}
                        className={`w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 ${
                          initialData?.invitation_status === 'connected'
                            ? 'opacity-60 cursor-not-allowed'
                            : ''
                        }`}
                        placeholder="email@exemplo.com"
                      />
                      {errors.email && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.email}</p>
                      )}
                      {formData.email &&
                        initialData?.invitation_status === 'connected' && (
                          <p className="text-xs text-ceramic-success mt-1.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-ceramic-success" />
                            Conectado
                          </p>
                        )}
                      {formData.email &&
                        !initialData?.invitation_status?.includes('connected') &&
                        formData.email.includes('@') && (
                          <p className="text-xs text-ceramic-text-secondary mt-1.5">
                            Quando {formData.name || 'o atleta'} criar conta AICA, será
                            conectado automaticamente
                          </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Telefone (WhatsApp) *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        placeholder="+5511987654321"
                      />
                      {errors.phone && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Modalities */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('modalities')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <Target className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      2. Modalidades *
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.modalities ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.modalities && (
                  <div className="p-4 pt-0 space-y-4">
                    <p className="text-xs text-ceramic-text-secondary italic">
                      Selecione uma ou mais modalidades e defina o nível para cada uma
                    </p>

                    {MODALITY_OPTIONS.map((modality) => {
                      const modalityLevel = formData.modalityLevels.find(
                        (ml) => ml.modality === modality.value
                      );
                      const isSelected = !!modalityLevel;

                      return (
                        <div key={modality.value} className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleModalityToggle(modality.value)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all border-2 ${
                              isSelected
                                ? 'bg-ceramic-success/10 border-ceramic-success shadow-md'
                                : 'ceramic-inset border-transparent hover:border-ceramic-border'
                            }`}
                          >
                            <span className="text-2xl">{modality.icon}</span>
                            <span
                              className={`text-sm font-bold flex-1 text-left ${
                                isSelected
                                  ? 'text-ceramic-success'
                                  : 'text-ceramic-text-secondary'
                              }`}
                            >
                              {modality.label}
                            </span>
                            {isSelected && (
                              <CheckCircle className="w-6 h-6 text-ceramic-success flex-shrink-0" />
                            )}
                          </button>

                          {isSelected && (
                            <AnimatePresence>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pl-12 pr-4 space-y-1"
                              >
                                <label className="block text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1">
                                  Nível
                                </label>
                                <div className="flex gap-2">
                                  {LEVEL_OPTIONS.map((level) => (
                                    <button
                                      key={level.value}
                                      type="button"
                                      onClick={() =>
                                        handleLevelChange(modality.value, level.value)
                                      }
                                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                        modalityLevel?.level === level.value
                                          ? 'bg-ceramic-accent text-white shadow-md'
                                          : 'ceramic-inset text-ceramic-text-secondary hover:bg-white/50'
                                      }`}
                                    >
                                      {level.label}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </AnimatePresence>
                          )}
                        </div>
                      );
                    })}

                    {errors.modalityLevels && (
                      <p className="text-xs text-ceramic-error mt-1">
                        {errors.modalityLevels}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Health Configuration */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('health')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <Heart className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      3. Dados de Saúde
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.health ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.health && (
                  <div className="p-4 pt-0 space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-ceramic-info/10 border border-ceramic-info/20 rounded-lg">
                      <Info className="w-5 h-5 text-ceramic-info mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-ceramic-info mb-2">
                          Configuração de Onboarding de Saúde
                        </p>
                        <p className="text-sm text-ceramic-text-primary leading-relaxed">
                          Defina as regras de documentação e onboarding para este atleta.
                          Dados detalhados de anamnese serão coletados via IA no módulo Flux.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                        Documentação Exigida
                      </label>

                      <div className="flex items-center justify-between p-3 ceramic-inset rounded-lg mb-2">
                        <div>
                          <p className="text-sm font-medium text-ceramic-text-primary">
                            Exame Cardiológico
                          </p>
                          <p className="text-xs text-ceramic-text-secondary">
                            Laudo médico cardiológico
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleChange(
                              'requires_cardio_exam',
                              !formData.requires_cardio_exam
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.requires_cardio_exam
                              ? 'bg-ceramic-success'
                              : 'bg-ceramic-text-secondary/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.requires_cardio_exam
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 ceramic-inset rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-ceramic-text-primary">
                            Atestado de Liberação
                          </p>
                          <p className="text-xs text-ceramic-text-secondary">
                            Liberação médica para atividade física
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleChange(
                              'requires_clearance_cert',
                              !formData.requires_clearance_cert
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.requires_clearance_cert
                              ? 'bg-ceramic-success'
                              : 'bg-ceramic-text-secondary/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.requires_clearance_cert
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                        Permissões de Onboarding
                      </label>

                      <div className="flex items-center justify-between p-3 ceramic-inset rounded-lg">
                        <div className="flex-1 mr-4">
                          <p className="text-sm font-medium text-ceramic-text-primary">
                            Liberar Questionário PAR-Q
                          </p>
                          <p className="text-xs text-ceramic-text-secondary">
                            Atleta poderá responder PAR-Q + Termo de Responsabilidade no Flux
                          </p>
                          {formData.allow_parq_onboarding && (
                            <p className="text-xs text-ceramic-warning mt-1 font-medium">
                              Prescrição técnica será liberada apenas após assinatura
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleChange(
                              'allow_parq_onboarding',
                              !formData.allow_parq_onboarding
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.allow_parq_onboarding
                              ? 'bg-ceramic-success'
                              : 'bg-ceramic-text-secondary/30'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.allow_parq_onboarding
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                <span className="text-xs text-ceramic-text-secondary">
                  Alterações não salvas
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-ceramic-text-primary hover:bg-white/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>
                    {mode === 'create' ? 'Criar Atleta' : 'Salvar Alterações'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
