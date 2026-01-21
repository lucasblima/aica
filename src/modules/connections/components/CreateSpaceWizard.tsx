import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Home, Briefcase, GraduationCap, Users, Mail, Loader2 } from 'lucide-react';
import { Archetype, ConnectionSpace, ARCHETYPE_CONFIG, CreateSpacePayload } from '../types';
import { useCardSelection } from '@/hooks/useCardSelection';
import { spaceService } from '../services/spaceService';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('CreateSpaceWizard');

interface CreateSpaceWizardProps {
  /** Whether the wizard is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Completion handler */
  onComplete: (space: ConnectionSpace) => void;
  /** Pre-selected archetype (skips step 1) */
  initialArchetype?: Archetype;
}

type WizardStep = 'archetype' | 'info' | 'config' | 'invite';

interface InviteMember {
  id: string;
  email: string;
}

/**
 * CreateSpaceWizard - Multi-step wizard for creating a connection space
 *
 * Steps:
 * 1. Choose archetype (if not provided)
 * 2. Basic information (name, description)
 * 3. Archetype-specific configuration
 * 4. Invite members (optional)
 *
 * @example
 * ```tsx
 * <CreateSpaceWizard
 *   isOpen={showWizard}
 *   onClose={() => setShowWizard(false)}
 *   onComplete={(space) => {
 *     log.debug('Created space:', space);
 *     navigate(`/connections/${space.id}`);
 *   }}
 *   initialArchetype="habitat"
 * />
 * ```
 */
export function CreateSpaceWizard({
  isOpen,
  onClose,
  onComplete,
  initialArchetype,
}: CreateSpaceWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialArchetype ? 'info' : 'archetype');
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | undefined>(initialArchetype);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    description: '',
    icon: '',
    color_theme: '',
    // Archetype-specific fields
    customFields: {} as Record<string, any>,
  });

  const [invites, setInvites] = useState<InviteMember[]>([]);
  const [emailInput, setEmailInput] = useState('');

  const { toggle, isSelected } = useCardSelection({
    multiple: false,
    onChange: (ids) => {
      if (ids.length > 0) {
        setSelectedArchetype(ids[0] as Archetype);
      }
    },
  });

  // Archetype configuration
  // Note: Using 'Icon' (capital I) to avoid conflict with emoji 'icon' from ARCHETYPE_CONFIG
  const archetypes = [
    { id: 'habitat', Icon: Home, ...ARCHETYPE_CONFIG.habitat },
    { id: 'ventures', Icon: Briefcase, ...ARCHETYPE_CONFIG.ventures },
    { id: 'academia', Icon: GraduationCap, ...ARCHETYPE_CONFIG.academia },
    { id: 'tribo', Icon: Users, ...ARCHETYPE_CONFIG.tribo },
  ];

  // Get current archetype config
  const currentArchetypeConfig = selectedArchetype ? ARCHETYPE_CONFIG[selectedArchetype] : null;

  // Step progression
  const steps: WizardStep[] = initialArchetype
    ? ['info', 'config', 'invite']
    : ['archetype', 'info', 'config', 'invite'];

  const currentStepIndex = steps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Validation
  const canProceed = () => {
    switch (currentStep) {
      case 'archetype':
        return !!selectedArchetype;
      case 'info':
        return formData.name.trim().length > 0;
      case 'config':
        return true; // Optional fields
      case 'invite':
        return true; // Optional step
      default:
        return false;
    }
  };

  // Navigation
  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  // Form handlers
  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const addInvite = () => {
    const email = emailInput.trim();
    if (email && email.includes('@')) {
      setInvites((prev) => [...prev, { id: Date.now().toString(), email }]);
      setEmailInput('');
    }
  };

  const removeInvite = (id: string) => {
    setInvites((prev) => prev.filter((inv) => inv.id !== id));
  };

  // Submit
  const handleSubmit = async () => {
    if (!selectedArchetype) return;

    setIsLoading(true);

    try {
      // Create payload
      const payload: CreateSpacePayload = {
        archetype: selectedArchetype,
        name: formData.name,
        subtitle: formData.subtitle || currentArchetypeConfig?.subtitle,
        description: formData.description,
        icon: formData.icon || currentArchetypeConfig?.icon || '🏠',
        color_theme: formData.color_theme || currentArchetypeConfig?.color_theme,
      };

      // Call real service to persist in database
      const createdSpace = await spaceService.createSpace(payload);

      // Show success state
      setIsSuccess(true);

      // Wait a bit to show success animation
      setTimeout(() => {
        onComplete(createdSpace);
        handleClose();
      }, 1000);
    } catch (error) {
      log.error('Error creating space:', error);
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep(initialArchetype ? 'info' : 'archetype');
    setSelectedArchetype(initialArchetype);
    setFormData({
      name: '',
      subtitle: '',
      description: '',
      icon: '',
      color_theme: '',
      customFields: {},
    });
    setInvites([]);
    setEmailInput('');
    setIsLoading(false);
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          className="ceramic-card relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
            <h2 className="text-xl font-black text-ceramic-text-primary">
              {isSuccess ? 'Espaço criado!' : 'Criar novo espaço'}
            </h2>
            <button
              onClick={handleClose}
              className="ceramic-concave w-8 h-8 flex items-center justify-center hover:scale-95 transition-transform"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
          </div>

          {/* Progress indicator */}
          {!isSuccess && (
            <div className="px-6 pt-4">
              <div className="flex items-center gap-2">
                {steps.map((step, index) => (
                  <React.Fragment key={step}>
                    <div
                      className={`flex-1 h-1.5 rounded-full transition-all ${
                        index <= currentStepIndex
                          ? 'bg-ceramic-accent'
                          : 'bg-ceramic-text-secondary/20'
                      }`}
                    />
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-2 text-xs text-ceramic-text-secondary text-center">
                Passo {currentStepIndex + 1} de {steps.length}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <SuccessView key="success" />
              ) : (
                <>
                  {currentStep === 'archetype' && (
                    <ArchetypeStep
                      key="archetype"
                      archetypes={archetypes}
                      selectedArchetype={selectedArchetype}
                      onSelect={(id) => {
                        toggle(id);
                        setSelectedArchetype(id as Archetype);
                      }}
                      isSelected={isSelected}
                    />
                  )}

                  {currentStep === 'info' && (
                    <InfoStep
                      key="info"
                      formData={formData}
                      onChange={updateFormData}
                      archetypeConfig={currentArchetypeConfig}
                    />
                  )}

                  {currentStep === 'config' && (
                    <ConfigStep
                      key="config"
                      archetype={selectedArchetype}
                      formData={formData}
                      onChange={updateFormData}
                    />
                  )}

                  {currentStep === 'invite' && (
                    <InviteStep
                      key="invite"
                      invites={invites}
                      emailInput={emailInput}
                      onEmailChange={setEmailInput}
                      onAddInvite={addInvite}
                      onRemoveInvite={removeInvite}
                    />
                  )}
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!isSuccess && (
            <div className="flex items-center justify-between p-6 border-t border-ceramic-text-secondary/10">
              <button
                onClick={isFirstStep ? handleClose : handleBack}
                className="ceramic-inset text-ceramic-text-primary hover:text-ceramic-accent rounded-full px-6 py-3 flex items-center gap-2 font-medium transition-all"
              >
                {isFirstStep ? (
                  <>
                    <X className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Cancelar
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Voltar
                    </span>
                  </>
                )}
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                className="ceramic-shadow bg-ceramic-accent text-[#1F1710] rounded-full px-8 py-3 flex items-center gap-2 font-semibold hover:bg-[#C2850A] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-ceramic-accent"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-bold">Criando...</span>
                  </>
                ) : isLastStep ? (
                  <>
                    <span className="text-sm font-bold">Criar espaço</span>
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold">Continuar</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Step Components

function ArchetypeStep({
  archetypes,
  selectedArchetype,
  onSelect,
  isSelected,
}: {
  archetypes: any[];
  selectedArchetype?: Archetype;
  onSelect: (id: string) => void;
  isSelected: (id: string) => boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
          Escolha um arquétipo
        </h3>
        <p className="text-sm text-ceramic-text-secondary">
          Selecione o tipo de espaço que deseja criar
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {archetypes.map((archetype) => {
          const Icon = archetype.Icon;
          const selected = isSelected(archetype.id);

          return (
            <motion.button
              key={archetype.id}
              onClick={() => onSelect(archetype.id)}
              className={`
                p-4 rounded-2xl text-left transition-all
                ${selected ? 'ceramic-elevated bg-ceramic-warm' : 'ceramic-inset-deep bg-ceramic-cool'}
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className={`w-8 h-8 mb-3 ${selected ? 'text-ceramic-accent' : 'text-ceramic-text-secondary'}`} />
              <h4 className="font-bold text-sm text-ceramic-text-primary mb-1">
                {archetype.label}
              </h4>
              <p className="text-xs text-ceramic-text-secondary line-clamp-2">
                {archetype.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function InfoStep({
  formData,
  onChange,
  archetypeConfig,
}: {
  formData: any;
  onChange: (updates: any) => void;
  archetypeConfig: any;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
          Informações básicas
        </h3>
        <p className="text-sm text-ceramic-text-secondary">
          Como você quer chamar seu espaço?
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
            Nome *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={`Meu ${archetypeConfig?.label || 'espaço'}`}
            className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/20"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
            Subtítulo
          </label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder={archetypeConfig?.subtitle || 'Opcional'}
            className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Descreva seu espaço..."
            rows={4}
            className="w-full ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/20 resize-none"
          />
        </div>
      </div>
    </motion.div>
  );
}

function ConfigStep({
  archetype,
  formData,
  onChange,
}: {
  archetype?: Archetype;
  formData: any;
  onChange: (updates: any) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
          Configurações
        </h3>
        <p className="text-sm text-ceramic-text-secondary">
          Personalize seu espaço (opcional)
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
            Ícone
          </label>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => onChange({ icon: e.target.value })}
            placeholder="🏠"
            className="w-full ceramic-inset px-4 py-3 text-2xl text-center focus:outline-none focus:ring-2 focus:ring-ceramic-accent/20"
            maxLength={2}
          />
          <p className="mt-1 text-xs text-ceramic-text-secondary/60 text-center">
            Use um emoji para representar seu espaço
          </p>
        </div>

        {/* Archetype-specific fields could go here */}
        <div className="ceramic-tray p-4 text-center">
          <p className="text-xs text-ceramic-text-secondary italic">
            Configurações específicas de {typeof archetype === 'string' ? archetype : 'espaço'} virão aqui
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function InviteStep({
  invites,
  emailInput,
  onEmailChange,
  onAddInvite,
  onRemoveInvite,
}: {
  invites: InviteMember[];
  emailInput: string;
  onEmailChange: (email: string) => void;
  onAddInvite: () => void;
  onRemoveInvite: (id: string) => void;
}) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddInvite();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
          Convidar membros
        </h3>
        <p className="text-sm text-ceramic-text-secondary">
          Adicione pessoas ao seu espaço (você pode fazer isso depois também)
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => onEmailChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="email@exemplo.com"
            className="flex-1 ceramic-inset px-4 py-3 text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/20"
          />
          <button
            onClick={onAddInvite}
            disabled={!emailInput.trim() || !emailInput.includes('@')}
            className="ceramic-shadow bg-ceramic-accent text-[#1F1710] rounded-full px-4 py-3 hover:bg-[#C2850A] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-ceramic-accent"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>

        {invites.length > 0 && (
          <div className="ceramic-tray p-4 space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-2 bg-ceramic-base rounded-lg"
              >
                <span className="text-sm text-ceramic-text-primary">{invite.email}</span>
                <button
                  onClick={() => onRemoveInvite(invite.id)}
                  className="ceramic-concave w-6 h-6 flex items-center justify-center hover:scale-95 transition-transform"
                  aria-label="Remover"
                >
                  <X className="w-3 h-3 text-ceramic-text-secondary" />
                </button>
              </div>
            ))}
          </div>
        )}

        {invites.length === 0 && (
          <div className="ceramic-tray p-8 text-center">
            <Users className="w-12 h-12 text-ceramic-text-secondary/30 mx-auto mb-2" />
            <p className="text-xs text-ceramic-text-secondary italic">
              Nenhum convite adicionado ainda
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SuccessView() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <motion.div
        className="w-20 h-20 rounded-full bg-ceramic-positive/20 flex items-center justify-center mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <Check className="w-10 h-10 text-ceramic-positive" />
      </motion.div>
      <motion.h3
        className="text-xl font-bold text-ceramic-text-primary mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Espaço criado com sucesso!
      </motion.h3>
      <motion.p
        className="text-sm text-ceramic-text-secondary"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        Redirecionando...
      </motion.p>
    </motion.div>
  );
}

export default CreateSpaceWizard;
