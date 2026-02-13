/**
 * AthleteFormModal Component
 *
 * Modal for creating/editing athletes with:
 * - 4 Accordion sections (BasicInfo, Account, Health, Performance)
 * - Form validation and submission
 * - Dirty state warning on close
 * - Ceramic design system styling
 * - Phone number formatting with IMask
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, ChevronDown, User, Settings, Heart, Zap } from 'lucide-react';
import type { Athlete, AthleteLevel, AthleteStatus, TrainingModality, AnamnesisData } from '../../types/flux';

interface AthleteFormModalProps {
  mode: 'create' | 'edit';
  initialData?: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onSave: (athlete: Partial<Athlete>) => Promise<void>;
}

// Form data type
interface FormData {
  name: string;
  email: string;
  phone: string;
  modalities: TrainingModality[]; // Multiple modalities
  level: AthleteLevel | '';
  status: AthleteStatus;
  trial_expires_at: string;
  // Health data
  sleep_quality: 'poor' | 'fair' | 'good' | 'excellent' | '';
  stress_level: 'low' | 'medium' | 'high' | '';
  chronic_pain: string;
  injuries: string;
  medications: string;
  // Performance thresholds
  ftp: string;
  pace_threshold: string;
  swim_css: string;
}

// Simplified level options (3 levels)
const LEVEL_OPTIONS: { value: AthleteLevel; label: string }[] = [
  { value: 'iniciante_1', label: 'Iniciante' },
  { value: 'intermediario_1', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

// Modality options
const MODALITY_OPTIONS: { value: TrainingModality; label: string; icon: string }[] = [
  { value: 'swimming', label: 'Natação', icon: '🏊' },
  { value: 'running', label: 'Corrida', icon: '🏃' },
  { value: 'cycling', label: 'Ciclismo', icon: '🚴' },
  { value: 'strength', label: 'Musculação', icon: '🏋️' },
  { value: 'walking', label: 'Caminhada', icon: '🚶' },
];

// Status options
const STATUS_OPTIONS: { value: AthleteStatus; label: string; description: string; color: string }[] = [
  { value: 'active', label: 'Ativo', description: 'Atleta está treinando normalmente', color: 'text-ceramic-success' },
  { value: 'trial', label: 'Período de Teste', description: 'Atleta em período experimental', color: 'text-ceramic-info' },
  { value: 'paused', label: 'Pausado', description: 'Treinos temporariamente suspensos', color: 'text-ceramic-warning' },
  { value: 'churned', label: 'Desistente', description: 'Não está mais treinando', color: 'text-ceramic-error' },
];

export default function AthleteFormModal({
  mode,
  initialData,
  isOpen,
  onClose,
  onSave,
}: AthleteFormModalProps) {
  // Initial form state
  const getInitialFormData = (): FormData => {
    if (initialData) {
      return {
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        modalities: initialData.modality ? [initialData.modality] : [], // Convert single to array
        level: initialData.level || '',
        status: initialData.status || 'active',
        trial_expires_at: initialData.trial_expires_at || '',
        sleep_quality: initialData.anamnesis?.sleep_quality || '',
        stress_level: initialData.anamnesis?.stress_level || '',
        chronic_pain: initialData.anamnesis?.chronic_pain?.join(', ') || '',
        injuries: initialData.anamnesis?.injuries?.join(', ') || '',
        medications: initialData.anamnesis?.nutrition_notes || '',
        ftp: initialData.ftp?.toString() || '',
        pace_threshold: initialData.pace_threshold || '',
        swim_css: initialData.swim_css || '',
      };
    }
    return {
      name: '',
      email: '',
      phone: '',
      modalities: [],
      level: '',
      status: 'active',
      trial_expires_at: '',
      sleep_quality: '',
      stress_level: '',
      chronic_pain: '',
      injuries: '',
      medications: '',
      ftp: '',
      pace_threshold: '',
      swim_css: '',
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Accordion state
  const [openSections, setOpenSections] = useState({
    basic: true,
    account: false,
    health: false,
    performance: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle input change
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Required fields
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Nome é obrigatório (min. 2 caracteres)';
    }

    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Telefone inválido (formato: +5511987654321)';
    }

    if (!formData.modalities || formData.modalities.length === 0) {
      newErrors.modalities = 'Selecione pelo menos uma modalidade';
    }

    if (!formData.level) {
      newErrors.level = 'Selecione um nível';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Trial expiration required if status is trial
    if (formData.status === 'trial' && !formData.trial_expires_at) {
      newErrors.trial_expires_at = 'Data de expiração obrigatória para período de teste';
    }

    // FTP validation (optional but must be positive if provided)
    if (formData.ftp && (isNaN(Number(formData.ftp)) || Number(formData.ftp) <= 0)) {
      newErrors.ftp = 'FTP deve ser um número positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Build anamnesis data
      const anamnesis: AnamnesisData = {};
      if (formData.sleep_quality) anamnesis.sleep_quality = formData.sleep_quality;
      if (formData.stress_level) anamnesis.stress_level = formData.stress_level;
      if (formData.chronic_pain) anamnesis.chronic_pain = formData.chronic_pain.split(',').map(s => s.trim()).filter(Boolean);
      if (formData.injuries) anamnesis.injuries = formData.injuries.split(',').map(s => s.trim()).filter(Boolean);
      if (formData.medications) anamnesis.nutrition_notes = formData.medications;

      // Build athlete data
      const athleteData: Partial<Athlete> = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        modality: formData.modalities[0], // Use first selected modality (backend expects single value)
        // TODO: When backend supports multiple modalities, save as: modalities: formData.modalities
        level: formData.level as AthleteLevel,
        status: formData.status,
        trial_expires_at: formData.status === 'trial' ? formData.trial_expires_at : undefined,
        anamnesis: Object.keys(anamnesis).length > 0 ? anamnesis : undefined,
        ftp: formData.ftp ? Number(formData.ftp) : undefined,
        pace_threshold: formData.pace_threshold.trim() || undefined,
        swim_css: formData.swim_css.trim() || undefined,
      };

      await onSave(athleteData);

      setSubmitSuccess(true);
      setIsDirty(false);

      // Reset form data after successful save
      setFormData(getInitialFormData());
      setErrors({});

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving athlete:', error);

      // Show detailed error message
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else if (typeof error === 'string') {
        setSubmitError(error);
      } else if (error && typeof error === 'object' && 'message' in error) {
        setSubmitError(String(error.message));
      } else {
        setSubmitError('Erro desconhecido ao salvar atleta. Verifique o console para mais detalhes.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close with dirty check
  const handleCloseClick = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'Você tem alterações não salvas. Deseja realmente sair?'
      );
      if (!confirmed) return;
    }

    // Reset form on close
    setFormData(getInitialFormData());
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsDirty(false);

    onClose();
  };

  const errorCount = Object.keys(errors).length;
  const isFormValid = errorCount === 0 && formData.name && formData.phone && formData.modalities.length > 0 && formData.level;

  if (!isOpen) return null;

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
              onClick={handleCloseClick}
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
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        placeholder="email@exemplo.com"
                      />
                      {errors.email && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.email}</p>
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

                    {/* Modalities (multiple selection) */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Modalidades * <span className="text-[10px] normal-case font-normal">(selecione uma ou mais)</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {MODALITY_OPTIONS.map((option) => {
                          const isSelected = formData.modalities.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                const newModalities = isSelected
                                  ? formData.modalities.filter(m => m !== option.value)
                                  : [...formData.modalities, option.value];
                                handleChange('modalities', newModalities as any);
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                                isSelected
                                  ? 'ceramic-card bg-ceramic-base shadow-md'
                                  : 'ceramic-inset hover:bg-white/50'
                              }`}
                            >
                              <span className="text-lg">{option.icon}</span>
                              <span className={`text-xs font-bold ${
                                isSelected
                                  ? 'text-ceramic-text-primary'
                                  : 'text-ceramic-text-secondary'
                              }`}>
                                {option.label}
                              </span>
                              {isSelected && (
                                <CheckCircle className="w-3 h-3 text-ceramic-success ml-auto" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {errors.modalities && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.modalities}</p>
                      )}
                    </div>

                    {/* Level */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Nível *
                      </label>
                      <select
                        value={formData.level}
                        onChange={(e) => handleChange('level', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                      >
                        <option value="">Selecione o nível</option>
                        {LEVEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.level && (
                        <p className="text-xs text-ceramic-error mt-1">{errors.level}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Account Settings */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('account')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <Settings className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      2. Configurações de Conta
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.account ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.account && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Status
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleChange('status', option.value)}
                            className={`px-3 py-3 rounded-lg transition-all text-left ${
                              formData.status === option.value
                                ? 'ceramic-card bg-ceramic-base shadow-md'
                                : 'ceramic-inset hover:bg-white/50'
                            }`}
                            title={option.description}
                          >
                            <div className="space-y-1">
                              <span className={`text-xs font-bold block ${
                                formData.status === option.value
                                  ? option.color
                                  : 'text-ceramic-text-secondary'
                              }`}>
                                {option.label}
                              </span>
                              <span className="text-[10px] text-ceramic-text-secondary block">
                                {option.description}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trial Expiration (only if status is trial) */}
                    {formData.status === 'trial' && (
                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                          Data de Expiração do Trial *
                        </label>
                        <input
                          type="date"
                          value={formData.trial_expires_at}
                          onChange={(e) => handleChange('trial_expires_at', e.target.value)}
                          className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        />
                        {errors.trial_expires_at && (
                          <p className="text-xs text-ceramic-error mt-1">{errors.trial_expires_at}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Health Data */}
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
                      3. Dados de Saúde (Opcional)
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
                    {/* Anamnesis Info Notice */}
                    <div className="flex items-start gap-3 p-4 bg-ceramic-info/10 border border-ceramic-info/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-ceramic-info mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-ceramic-info mb-2">
                          💡 Anamnese Inteligente
                        </p>
                        <p className="text-sm text-ceramic-text-primary mb-2 leading-relaxed">
                          Estes dados serão enriquecidos automaticamente quando o atleta responder a anamnese completa.
                        </p>
                        <p className="text-xs text-ceramic-text-secondary leading-relaxed">
                          O atleta poderá responder via <span className="font-semibold text-ceramic-text-primary">voz</span> (transcrição automática) ou{' '}
                          <span className="font-semibold text-ceramic-text-primary">texto</span>, tanto na interface web quanto por WhatsApp/Telegram.
                          A Aica preenche os campos e esclarece dúvidas até completar.
                        </p>
                      </div>
                    </div>

                    {/* Sleep Quality */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Qualidade do Sono
                      </label>
                      <select
                        value={formData.sleep_quality}
                        onChange={(e) => handleChange('sleep_quality', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                      >
                        <option value="">Não informado</option>
                        <option value="poor">Ruim</option>
                        <option value="fair">Regular</option>
                        <option value="good">Bom</option>
                        <option value="excellent">Excelente</option>
                      </select>
                    </div>

                    {/* Stress Level */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Nível de Estresse
                      </label>
                      <select
                        value={formData.stress_level}
                        onChange={(e) => handleChange('stress_level', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                      >
                        <option value="">Não informado</option>
                        <option value="low">Baixo</option>
                        <option value="medium">Médio</option>
                        <option value="high">Alto</option>
                      </select>
                    </div>

                    {/* Chronic Pain */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Áreas de Dor Crônica
                      </label>
                      <input
                        type="text"
                        value={formData.chronic_pain}
                        onChange={(e) => handleChange('chronic_pain', e.target.value)}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                        placeholder="Ex: joelho esquerdo, lombar (separar por vírgula)"
                      />
                    </div>

                    {/* Injuries */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Histórico de Lesões
                      </label>
                      <textarea
                        value={formData.injuries}
                        onChange={(e) => handleChange('injuries', e.target.value)}
                        rows={3}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
                        placeholder="Descreva lesões anteriores ou atuais (separar por vírgula)"
                      />
                    </div>

                    {/* Medications/Nutrition */}
                    <div>
                      <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                        Medicamentos / Notas de Nutrição
                      </label>
                      <textarea
                        value={formData.medications}
                        onChange={(e) => handleChange('medications', e.target.value)}
                        rows={3}
                        className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50 resize-none"
                        placeholder="Medicamentos em uso ou notas sobre nutrição"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Performance Thresholds */}
              <div className="ceramic-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('performance')}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="ceramic-inset p-2">
                      <Zap className="w-4 h-4 text-ceramic-text-primary" />
                    </div>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      4. Thresholds de Performance (Opcional)
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
                      openSections.performance ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSections.performance && (
                  <div className="p-4 pt-0 space-y-4">
                    <p className="text-xs text-ceramic-text-secondary italic">
                      Configure os valores de threshold de acordo com as modalidades selecionadas
                    </p>

                    {/* FTP (for cycling) */}
                    {formData.modalities.includes('cycling') && (
                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                          🚴 FTP (Functional Threshold Power)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={formData.ftp}
                            onChange={(e) => handleChange('ftp', e.target.value)}
                            className="flex-1 ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                            placeholder="250"
                            min="0"
                          />
                          <span className="text-xs text-ceramic-text-secondary font-medium">watts</span>
                        </div>
                        {errors.ftp && (
                          <p className="text-xs text-ceramic-error mt-1">{errors.ftp}</p>
                        )}
                      </div>
                    )}

                    {/* Pace Threshold (for running) */}
                    {formData.modalities.includes('running') && (
                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                          🏃 Pace Limiar
                        </label>
                        <input
                          type="text"
                          value={formData.pace_threshold}
                          onChange={(e) => handleChange('pace_threshold', e.target.value)}
                          className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                          placeholder="4:30/km"
                        />
                      </div>
                    )}

                    {/* CSS (for swimming) */}
                    {formData.modalities.includes('swimming') && (
                      <div>
                        <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                          🏊 CSS (Critical Swim Speed)
                        </label>
                        <input
                          type="text"
                          value={formData.swim_css}
                          onChange={(e) => handleChange('swim_css', e.target.value)}
                          className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                          placeholder="1:30/100m"
                        />
                      </div>
                    )}

                    {formData.modalities.length === 0 && (
                      <p className="text-xs text-ceramic-text-secondary italic">
                        Selecione pelo menos uma modalidade para configurar os thresholds
                      </p>
                    )}

                    {formData.modalities.length > 0 &&
                     !formData.modalities.some(m => ['cycling', 'running', 'swimming'].includes(m)) && (
                      <p className="text-xs text-ceramic-text-secondary italic">
                        Thresholds específicos não aplicáveis para as modalidades selecionadas
                      </p>
                    )}
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
                  <span>{mode === 'create' ? 'Criar Atleta' : 'Salvar Alterações'}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
