/**
 * AthleteFormDrawer Component
 *
 * Drawer lateral (desktop) / bottom (mobile) para criacao/edicao de atletas.
 * Inspirado no design da Apple - transicoes suaves, contexto preservado.
 *
 * Features:
 * - Desktop: Slide-in da direita (600-700px width)
 * - Mobile: Slide-in de baixo (full-height)
 * - Backdrop translucido (preserva contexto)
 * - Swipe to dismiss (mobile)
 * - 3 secoes: Basic Info + Modalities + Health Config
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import {
  X,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Target,
  Heart,
  Info,
  Copy,
  Link2,
  User as UserIcon,
  Mail,
  Loader2,
} from 'lucide-react';
import type { Athlete, ModalityLevel } from '../../types/flux';
import { AthleteService } from '../../services/athleteService';
import {
  useAthleteForm,
  MODALITY_OPTIONS,
  LEVEL_OPTIONS,
} from '../../hooks/useAthleteForm';

interface AthleteFormDrawerProps {
  mode: 'create' | 'edit';
  initialData?: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onSave: (athlete: Partial<Athlete> & { modalityLevels?: ModalityLevel[] }) => Promise<string | void>;
}

export default function AthleteFormDrawer({
  mode,
  initialData,
  isOpen,
  onClose,
  onSave,
}: AthleteFormDrawerProps) {
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
    lastCreatedId,
  } = useAthleteForm({ mode, initialData, isOpen, onSave, onClose, autoCloseDelayMs: 1000 });

  // Invite link state
  const [copyToast, setCopyToast] = useState(false);
  const createdAthleteId = lastCreatedId;

  // Accordion state — in create mode, open modalities first (no basic info section)
  const [openSections, setOpenSections] = useState({
    basic: mode === 'edit',
    modalities: mode === 'create',
    health: false,
  });

  // Swipe to dismiss (mobile)
  const y = useMotionValue(0);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getInviteLink = (athleteId: string) =>
    `https://aica.guru/onboarding/${athleteId}`;

  const handleCopyInviteLink = async (athleteId: string) => {
    try {
      await navigator.clipboard.writeText(getInviteLink(athleteId));
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 150) {
      handleClose();
    }
  };

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
            onClick={handleClose}
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
                  {mode === 'create' ? 'Novo Atleta' : 'Editar Atleta'}
                </h2>
                <p className="text-sm text-ceramic-text-secondary mt-1">
                  {mode === 'create'
                    ? 'Configure e gere um link de cadastro'
                    : 'Atualize as informacoes do atleta'}
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

            {/* Form Content (scrollable) */}
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

                {/* Create mode: Invite link explanation */}
                {mode === 'create' && !submitSuccess && (
                  <div className="flex items-start gap-3 p-4 bg-ceramic-info/10 border border-ceramic-info/20 rounded-xl">
                    <Link2 className="w-5 h-5 text-ceramic-info mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-ceramic-info mb-1">
                        Como funciona
                      </p>
                      <p className="text-sm text-ceramic-text-primary leading-relaxed">
                        Selecione as modalidades e requisitos de saude. Ao criar, voce
                        recebera um <strong>link de cadastro</strong> para enviar ao atleta.
                        Ele preenchera nome, email e telefone durante o onboarding.
                      </p>
                    </div>
                  </div>
                )}

                {/* Create mode: Show invite link after success */}
                {mode === 'create' && submitSuccess && createdAthleteId && (
                  <div className="ceramic-card p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-ceramic-success/15 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-ceramic-success" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ceramic-text-primary">
                          Atleta criado!
                        </p>
                        <p className="text-xs text-ceramic-text-secondary">
                          Envie o link abaixo para seu atleta se cadastrar
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getInviteLink(createdAthleteId)}
                        className="flex-1 ceramic-inset px-3 py-2.5 rounded-lg text-xs text-ceramic-text-secondary font-mono select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(createdAthleteId)}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        {copyToast ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 1: Basic Info (edit mode only) */}
                {mode === 'edit' && (
                  <div className="ceramic-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection('basic')}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="ceramic-inset p-2">
                          <UserIcon className="w-4 h-4 text-ceramic-text-primary" />
                        </div>
                        <span className="text-sm font-bold text-ceramic-text-primary">
                          1. Informacoes Basicas
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
                )}

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
                        {mode === 'create' ? '1' : '2'}. Modalidades
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
                        Selecione uma ou mais modalidades e defina o nivel para cada uma
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
                                    Nivel
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
                        {mode === 'create' ? '2' : '3'}. Dados de Saude
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
                            Configuracao de Onboarding de Saude
                          </p>
                          <p className="text-sm text-ceramic-text-primary leading-relaxed">
                            Defina as regras de documentacao e onboarding para este atleta.
                            Dados detalhados de anamnese serao coletados via IA no modulo
                            Flux.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                          Documentacao Exigida
                        </label>

                        <div className="flex items-center justify-between p-3 ceramic-inset rounded-lg mb-2">
                          <div>
                            <p className="text-sm font-medium text-ceramic-text-primary">
                              Exame Cardiologico
                            </p>
                            <p className="text-xs text-ceramic-text-secondary">
                              Laudo medico cardiologico
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
                              Atestado de Liberacao
                            </p>
                            <p className="text-xs text-ceramic-text-secondary">
                              Liberacao medica para atividade fisica
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
                          Permissoes de Onboarding
                        </label>

                        <div className="flex items-center justify-between p-3 ceramic-inset rounded-lg">
                          <div className="flex-1 mr-4">
                            <p className="text-sm font-medium text-ceramic-text-primary">
                              Liberar Questionario PAR-Q
                            </p>
                            <p className="text-xs text-ceramic-text-secondary">
                              Atleta podera responder PAR-Q + Termo de Responsabilidade no
                              Flux
                            </p>
                            {formData.allow_parq_onboarding && (
                              <p className="text-xs text-ceramic-warning mt-1 font-medium">
                                Prescricao tecnica sera liberada apenas apos assinatura
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
                  <span className="text-xs text-ceramic-text-secondary">
                    Alteracoes nao salvas
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
                  className="flex items-center gap-2 px-6 py-2 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>
                      {mode === 'create' ? 'Gerar Link de Cadastro' : 'Salvar Alteracoes'}
                    </span>
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
