import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Home,
  Briefcase,
  GraduationCap,
  Users,
  Upload,
  Mail,
  UserPlus
} from 'lucide-react';
import type {
  Archetype,
  CreateSpacePayload,
  MemberRole
} from '../types';
import { ARCHETYPE_CONFIG } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('CreateConnectionModal');

/**
 * CreateConnectionModal Component
 * 4-step wizard for creating new Connection Spaces in Aica Life OS
 *
 * Steps:
 * 1. Choose Archetype (Habitat, Ventures, Academia, Tribo)
 * 2. Basic Info (name, description, color theme)
 * 3. Archetype-Specific Settings
 * 4. Invite Members
 */

interface CreateConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (space: CreateSpacePayload, invites?: MemberInvite[]) => void;
}

interface MemberInvite {
  email: string;
  role: MemberRole;
}

type WizardStep = 1 | 2 | 3 | 4;

// Color palettes for each archetype
const ARCHETYPE_COLORS = {
  habitat: [
    { name: 'Terra Cotta', value: '#9B4D3A' },
    { name: 'Sage Moss', value: '#6B7B5C' },
    { name: 'Clay Brown', value: '#8B7355' },
    { name: 'Stone Gray', value: '#8B8579' }
  ],
  ventures: [
    { name: 'Amber Alert', value: '#D97706' },
    { name: 'Precision Blue', value: '#3B82F6' },
    { name: 'Steel Gray', value: '#64748B' },
    { name: 'Carbon Black', value: '#1F2937' }
  ],
  academia: [
    { name: 'Parchment', value: '#E6D5C3' },
    { name: 'Ink Blue', value: '#1E3A8A' },
    { name: 'Library Green', value: '#065F46' },
    { name: 'Wisdom Purple', value: '#6B21A8' }
  ],
  tribo: [
    { name: 'Warm Terracotta', value: '#DC2626' },
    { name: 'Community Gold', value: '#F59E0B' },
    { name: 'Connection Teal', value: '#14B8A6' },
    { name: 'Belonging Purple', value: '#A855F7' }
  ]
};

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'condo', label: 'Condomínio' },
  { value: 'room', label: 'Quarto' }
] as const;

const BUSINESS_TYPES = [
  { value: 'startup', label: 'Startup' },
  { value: 'agency', label: 'Agência' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'partnership', label: 'Parceria' },
  { value: 'corporation', label: 'Corporação' }
] as const;

const GROUP_TYPES = [
  { value: 'club', label: 'Clube' },
  { value: 'community', label: 'Comunidade' },
  { value: 'family', label: 'Família' },
  { value: 'friends', label: 'Amigos' },
  { value: 'sports', label: 'Esportes' },
  { value: 'faith', label: 'Fé' }
] as const;

const MEETING_FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'irregular', label: 'Irregular' }
] as const;

export const CreateConnectionModal: React.FC<CreateConnectionModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Archetype selection
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);

  // Step 2: Basic info
  const [spaceName, setSpaceName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Step 3: Archetype-specific settings
  const [habitatSettings, setHabitatSettings] = useState<Record<string, any>>({});
  const [venturesSettings, setVenturesSettings] = useState<Record<string, any>>({});
  const [academiaSettings, setAcademiaSettings] = useState<Record<string, any>>({});
  const [triboSettings, setTriboSettings] = useState<Record<string, any>>({});

  // Step 4: Member invites
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentRole, setCurrentRole] = useState<MemberRole>('member');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Reset form when modal closes
   */
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedArchetype(null);
    setSpaceName('');
    setDescription('');
    setSelectedColor('');
    setCoverImage(null);
    setHabitatSettings({});
    setVenturesSettings({});
    setAcademiaSettings({});
    setTriboSettings({});
    setInvites([]);
    setCurrentEmail('');
    setCurrentRole('member');
  };

  /**
   * Navigate between steps
   */
  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  /**
   * Check if current step is valid
   */
  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 1:
        return selectedArchetype !== null;
      case 2:
        return spaceName.trim().length > 0;
      case 3:
        return true; // Archetype settings are optional
      case 4:
        return true; // Invites are optional
      default:
        return false;
    }
  };

  /**
   * Add member invite
   */
  const addInvite = () => {
    if (currentEmail.trim() && !invites.find(i => i.email === currentEmail.trim())) {
      setInvites([...invites, { email: currentEmail.trim(), role: currentRole }]);
      setCurrentEmail('');
    }
  };

  /**
   * Remove member invite
   */
  const removeInvite = (email: string) => {
    setInvites(invites.filter(i => i.email !== email));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!selectedArchetype || !spaceName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Build archetype-specific settings
      let settings: any = {};
      switch (selectedArchetype) {
        case 'habitat':
          settings = habitatSettings;
          break;
        case 'ventures':
          settings = venturesSettings;
          break;
        case 'academia':
          settings = academiaSettings;
          break;
        case 'tribo':
          settings = triboSettings;
          break;
      }

      const payload: CreateSpacePayload = {
        archetype: selectedArchetype,
        name: spaceName.trim(),
        description: description.trim() || undefined,
        color_theme: selectedColor || undefined,
        icon: ARCHETYPE_CONFIG[selectedArchetype].icon
      };

      await onComplete(payload, invites.length > 0 ? invites : undefined);
      onClose();
    } catch (error) {
      log.error('Error creating connection space:', error);
      alert('Erro ao criar espaço de conexão');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const archetypeIcon = selectedArchetype ? {
    habitat: Home,
    ventures: Briefcase,
    academia: GraduationCap,
    tribo: Users
  }[selectedArchetype] : null;

  const Icon = archetypeIcon || Home;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[4px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-ceramic-base w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl relative border border-ceramic-text-secondary/10 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
          <div className="flex items-center gap-3">
            <div className="ceramic-concave w-12 h-12 flex items-center justify-center">
              <Icon className="w-6 h-6 text-ceramic-text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ceramic-text-primary">
                Novo Espaço de Conexão
              </h2>
              {selectedArchetype && (
                <p className="text-sm text-ceramic-text-secondary">
                  {ARCHETYPE_CONFIG[selectedArchetype].label}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-6">
          <div className="ceramic-trough h-2 mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-ceramic-accent to-amber-500 rounded-full"
              initial={{ width: '25%' }}
              animate={{ width: `${(currentStep / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-xs text-ceramic-text-secondary">
            <span className={currentStep >= 1 ? 'text-ceramic-text-primary font-bold' : ''}>
              Arquétipo
            </span>
            <span className={currentStep >= 2 ? 'text-ceramic-text-primary font-bold' : ''}>
              Informações
            </span>
            <span className={currentStep >= 3 ? 'text-ceramic-text-primary font-bold' : ''}>
              Configuração
            </span>
            <span className={currentStep >= 4 ? 'text-ceramic-text-primary font-bold' : ''}>
              Membros
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Choose Archetype */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                    Escolha o Arquétipo
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary">
                    Cada arquétipo representa um tipo diferente de espaço de conexão
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.keys(ARCHETYPE_CONFIG) as Archetype[]).map((archetype) => {
                    const meta = ARCHETYPE_CONFIG[archetype];
                    const ArchIcon = {
                      habitat: Home,
                      ventures: Briefcase,
                      academia: GraduationCap,
                      tribo: Users
                    }[archetype];

                    return (
                      <button
                        key={archetype}
                        type="button"
                        onClick={() => setSelectedArchetype(archetype)}
                        className={`ceramic-card p-6 text-left transition-all hover:scale-[1.02] ${
                          selectedArchetype === archetype
                            ? 'ring-2 ring-ceramic-accent shadow-xl'
                            : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="ceramic-concave w-14 h-14 flex items-center justify-center flex-shrink-0">
                            <ArchIcon className="w-7 h-7 text-ceramic-text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-ceramic-text-primary mb-1">
                              {meta.label}
                            </h4>
                            <p className="text-xs font-medium text-ceramic-accent mb-2">
                              {meta.subtitle}
                            </p>
                            <p className="text-sm text-ceramic-text-secondary leading-relaxed">
                              {meta.description}
                            </p>
                          </div>
                        </div>
                        {selectedArchetype === archetype && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-4 right-4 ceramic-concave w-8 h-8 flex items-center justify-center"
                          >
                            <Check className="w-5 h-5 text-ceramic-accent" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Basic Info */}
            {currentStep === 2 && selectedArchetype && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                    Informações Básicas
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary">
                    Defina o nome e a aparência do seu espaço
                  </p>
                </div>

                {/* Space Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Nome do Espaço *
                  </label>
                  <input
                    type="text"
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    placeholder={
                      selectedArchetype === 'habitat' ? 'Ex: Apartamento Centro' :
                      selectedArchetype === 'ventures' ? 'Ex: Startup Tech' :
                      selectedArchetype === 'academia' ? 'Ex: Mestrado em IA' :
                      'Ex: Grupo de Corrida'
                    }
                    className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva brevemente este espaço..."
                    rows={3}
                    className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent resize-none"
                  />
                </div>

                {/* Color Theme */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Cor do Tema
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {ARCHETYPE_COLORS[selectedArchetype].map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setSelectedColor(color.value)}
                        className={`ceramic-card p-3 flex flex-col items-center gap-2 transition-all hover:scale-105 ${
                          selectedColor === color.value ? 'ring-2 ring-ceramic-accent' : ''
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full border-2 border-ceramic-text-secondary/20"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="text-xs text-ceramic-text-secondary font-medium">
                          {color.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Imagem de Capa (opcional)
                  </label>
                  <div className="ceramic-tray p-8 text-center">
                    <Upload className="w-12 h-12 text-ceramic-text-secondary/50 mx-auto mb-3" />
                    <p className="text-sm font-medium text-ceramic-text-secondary mb-2">
                      Upload de Imagem
                    </p>
                    <p className="text-xs text-ceramic-text-secondary/70">
                      Funcionalidade em desenvolvimento
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Archetype-Specific Settings */}
            {currentStep === 3 && selectedArchetype && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                    Configurações Específicas
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary">
                    Personalize as configurações para {ARCHETYPE_CONFIG[selectedArchetype].label}
                  </p>
                </div>

                {/* HABITAT Settings */}
                {selectedArchetype === 'habitat' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Tipo de Propriedade
                      </label>
                      <select
                        value={habitatSettings.property_type || ''}
                        onChange={(e) => setHabitatSettings({
                          ...habitatSettings,
                          property_type: e.target.value as any
                        })}
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      >
                        <option value="">Selecione...</option>
                        {PROPERTY_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={habitatSettings.address || ''}
                        onChange={(e) => setHabitatSettings({
                          ...habitatSettings,
                          address: e.target.value
                        })}
                        placeholder="Rua, número, bairro, cidade"
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Moeda Padrão
                      </label>
                      <select
                        value={habitatSettings.default_currency || 'BRL'}
                        onChange={(e) => setHabitatSettings({
                          ...habitatSettings,
                          default_currency: e.target.value
                        })}
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      >
                        <option value="BRL">BRL - Real Brasileiro</option>
                        <option value="USD">USD - Dólar Americano</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* VENTURES Settings */}
                {selectedArchetype === 'ventures' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Tipo de Negócio
                      </label>
                      <select
                        value={venturesSettings.business_type || ''}
                        onChange={(e) => setVenturesSettings({
                          ...venturesSettings,
                          business_type: e.target.value as any
                        })}
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      >
                        <option value="">Selecione...</option>
                        {BUSINESS_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Data de Fundação
                      </label>
                      <input
                        type="date"
                        value={venturesSettings.founding_date || ''}
                        onChange={(e) => setVenturesSettings({
                          ...venturesSettings,
                          founding_date: e.target.value
                        })}
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Alerta de Runway (meses)
                      </label>
                      <input
                        type="number"
                        value={venturesSettings.runway_alert_months || ''}
                        onChange={(e) => setVenturesSettings({
                          ...venturesSettings,
                          runway_alert_months: parseInt(e.target.value) || undefined
                        })}
                        placeholder="6"
                        min="1"
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      />
                    </div>
                  </div>
                )}

                {/* ACADEMIA Settings */}
                {selectedArchetype === 'academia' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Áreas de Foco
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Inteligência Artificial, Machine Learning"
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value) {
                              setAcademiaSettings({
                                ...academiaSettings,
                                learning_focus: [...(academiaSettings.learning_focus || []), value]
                              });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      {academiaSettings.learning_focus && academiaSettings.learning_focus.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {academiaSettings.learning_focus.map((focus, idx) => (
                            <span
                              key={idx}
                              className="ceramic-card px-3 py-1 text-sm text-ceramic-text-primary"
                            >
                              {focus}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Horas de Estudo/Semana
                      </label>
                      <input
                        type="number"
                        value={academiaSettings.weekly_study_hours || ''}
                        onChange={(e) => setAcademiaSettings({
                          ...academiaSettings,
                          weekly_study_hours: parseInt(e.target.value) || undefined
                        })}
                        placeholder="10"
                        min="1"
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      />
                    </div>
                  </div>
                )}

                {/* TRIBO Settings */}
                {selectedArchetype === 'tribo' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Tipo de Grupo
                      </label>
                      <select
                        value={triboSettings.group_type || ''}
                        onChange={(e) => setTriboSettings({
                          ...triboSettings,
                          group_type: e.target.value as any
                        })}
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      >
                        <option value="">Selecione...</option>
                        {GROUP_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Frequência de Encontros
                      </label>
                      <select
                        value={triboSettings.meeting_frequency || ''}
                        onChange={(e) => setTriboSettings({
                          ...triboSettings,
                          meeting_frequency: e.target.value as any
                        })}
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      >
                        <option value="">Selecione...</option>
                        {MEETING_FREQUENCIES.map(freq => (
                          <option key={freq.value} value={freq.value}>{freq.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Local Padrão de Encontro
                      </label>
                      <input
                        type="text"
                        value={triboSettings.default_meeting_location || ''}
                        onChange={(e) => setTriboSettings({
                          ...triboSettings,
                          default_meeting_location: e.target.value
                        })}
                        placeholder="Ex: Parque da Cidade"
                        className="w-full p-4 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Invite Members */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                    Convidar Membros
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary">
                    Adicione pessoas ao seu espaço (você pode pular esta etapa)
                  </p>
                </div>

                {/* Add Invite Form */}
                <div className="ceramic-card p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Email
                      </label>
                      <input
                        type="email"
                        value={currentEmail}
                        onChange={(e) => setCurrentEmail(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addInvite();
                          }
                        }}
                        placeholder="nome@exemplo.com"
                        className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                        Papel
                      </label>
                      <select
                        value={currentRole}
                        onChange={(e) => setCurrentRole(e.target.value as MemberRole)}
                        className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      >
                        <option value="member">Membro</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addInvite}
                    disabled={!currentEmail.trim()}
                    className="w-full ceramic-card py-3 rounded-xl font-medium text-ceramic-text-primary hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Adicionar Convite
                  </button>
                </div>

                {/* Invites List */}
                {invites.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-ceramic-text-secondary">
                      {invites.length} {invites.length === 1 ? 'Convite' : 'Convites'}
                    </p>
                    {invites.map((invite) => (
                      <div
                        key={invite.email}
                        className="ceramic-card p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-ceramic-text-secondary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ceramic-text-primary">
                              {invite.email}
                            </p>
                            <p className="text-xs text-ceramic-text-secondary capitalize">
                              {invite.role}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeInvite(invite.email)}
                          className="p-2 text-ceramic-negative hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ceramic-tray p-8 text-center">
                    <UserPlus className="w-12 h-12 text-ceramic-text-secondary/50 mx-auto mb-3" />
                    <p className="text-sm text-ceramic-text-secondary">
                      Nenhum convite adicionado ainda
                    </p>
                    <p className="text-xs text-ceramic-text-secondary/70 mt-1">
                      Você pode adicionar membros depois
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex gap-4 p-6 border-t border-ceramic-text-secondary/10">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="ceramic-card px-6 py-3 rounded-xl font-bold text-ceramic-text-secondary hover:scale-105 transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}

          <div className="flex-1" />

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={goToNextStep}
              disabled={!isStepValid()}
              className="ceramic-card px-6 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isStepValid()}
              className="ceramic-card px-8 py-3 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Criar Espaço
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CreateConnectionModal;
