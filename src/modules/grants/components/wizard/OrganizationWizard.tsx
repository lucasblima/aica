/**
 * OrganizationWizard Component
 * Issue #100 - Wizard gamificado para cadastro completo de organizacoes
 *
 * Main compound component that orchestrates the entire wizard flow.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Sparkles, AlertCircle } from 'lucide-react';
import { useOrganizationWizard } from '../../hooks/useOrganizationWizard';
import { useOrganizationDocumentUpload } from '../../hooks/useOrganizationDocumentUpload';
import { WizardProgress } from './WizardProgress';
import { WizardStep } from './WizardStep';
import { DocumentDropZone } from './DocumentDropZone';
import { FieldReward, LevelUpCelebration, XPCounter } from './FieldReward';
import { CompletionBadge, LevelProgressCard } from './CompletionBadge';
import { WIZARD_STEPS, STEP_COMPLETION_BONUS, type WizardField, type CompletionLevelConfig } from '../../types/wizard';
import type { Organization } from '../../types/organizations';
import { validateField, formatCNPJ, formatPhone, formatCEP } from '../../utils/fieldValidators';
import { WhatsAppStepContent } from './WhatsAppStepContent';

// =============================================================================
// Types
// =============================================================================

interface OrganizationWizardProps {
  organizationId?: string;
  onComplete?: (organization: Partial<Organization>) => void;
  onClose?: () => void;
}

interface FieldInputProps {
  field: WizardField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFocus?: () => void;
  showReward: boolean;
  onRewardComplete: () => void;
  validationError?: string | null;
  onBlur?: () => void;
}

// =============================================================================
// Field Input Component
// =============================================================================

function FieldInput({
  field,
  value,
  onChange,
  onFocus,
  showReward,
  onRewardComplete,
  validationError,
  onBlur,
}: FieldInputProps) {
  const hasError = !!validationError;

  const baseClasses = `
    w-full px-4 py-3 border rounded-xl
    focus:outline-none focus:ring-2 focus:border-transparent
    transition-all duration-200
    placeholder:text-gray-400
    ${hasError
      ? 'border-red-300 focus:ring-red-500 bg-red-50'
      : 'border-gray-200 focus:ring-amber-500'
    }
  `;

  // Apply formatting on blur for specific fields
  const handleBlur = useCallback(() => {
    onBlur?.();

    // Auto-format specific fields
    if (value && typeof value === 'string') {
      const fieldName = field.name as string;
      if (fieldName === 'document_number') {
        const formatted = formatCNPJ(value);
        if (formatted !== value) onChange(formatted);
      } else if (fieldName === 'phone') {
        const formatted = formatPhone(value);
        if (formatted !== value) onChange(formatted);
      } else if (fieldName === 'address_zip') {
        const formatted = formatCEP(value);
        if (formatted !== value) onChange(formatted);
      }
    }
  }, [field.name, value, onChange, onBlur]);

  const renderInput = () => {
    switch (field.type) {
      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={handleBlur}
            className={baseClasses}
          >
            <option value="">Selecione...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {field.options?.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const newValues = isSelected
                        ? selectedValues.filter((v) => v !== opt.value)
                        : [...selectedValues, opt.value];
                      onChange(newValues);
                    }}
                    onFocus={onFocus}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${isSelected
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {opt.label}
                  </motion.button>
                );
              })}
            </div>
            {selectedValues.length > 0 && (
              <p className="text-xs text-gray-500">
                {selectedValues.length} selecionado(s)
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={handleBlur}
            placeholder={field.placeholder}
            rows={4}
            className={`${baseClasses} resize-none`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
            onFocus={onFocus}
            onBlur={handleBlur}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        );

      case 'image':
        return (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-amber-300 transition-colors cursor-pointer">
            <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{field.placeholder || 'Clique para fazer upload'}</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG ate 5MB</p>
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={handleBlur}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        );
    }
  };

  return (
    <div className="relative">
      <label className="block mb-2">
        <span className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <span className="float-right text-xs text-amber-500">
          +{field.xpValue} XP
        </span>
      </label>
      {renderInput()}

      {/* Validation Error */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-1.5 mt-1.5 text-red-600"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs">{validationError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <FieldReward xp={field.xpValue} show={showReward} onComplete={onRewardComplete} />
    </div>
  );
}

// =============================================================================
// Step Content Components
// =============================================================================

interface StepContentProps {
  fields: WizardField[];
  formData: Partial<Organization>;
  fieldXpMap: Record<string, boolean>;
  onFieldChange: (field: keyof Organization, value: unknown) => void;
}

function StepContent({ fields, formData, fieldXpMap, onFieldChange }: StepContentProps) {
  const [rewardingField, setRewardingField] = useState<string | null>(null);
  const [previousValues, setPreviousValues] = useState<Record<string, unknown>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Calculate validation errors for all fields
  const validationErrors = useMemo(() => {
    const errors: Record<string, string | null> = {};
    fields.forEach(field => {
      const fieldName = field.name as string;
      // Only show error if field has been touched
      if (touchedFields.has(fieldName)) {
        errors[fieldName] = validateField(fieldName, formData[field.name]);
      } else {
        errors[fieldName] = null;
      }
    });
    return errors;
  }, [fields, formData, touchedFields]);

  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  }, []);

  const handleFieldChange = useCallback((field: WizardField, value: unknown) => {
    const fieldName = field.name as string;
    const prevValue = previousValues[fieldName];
    const wasEmpty = prevValue === undefined || prevValue === null || prevValue === '' ||
      (Array.isArray(prevValue) && prevValue.length === 0);
    const isNowFilled = value !== undefined && value !== null && value !== '' &&
      !(Array.isArray(value) && value.length === 0);

    // Show reward if field just became filled and hasn't been rewarded yet
    if (wasEmpty && isNowFilled && !fieldXpMap[fieldName]) {
      setRewardingField(fieldName);
    }

    setPreviousValues(prev => ({ ...prev, [fieldName]: value }));
    onFieldChange(field.name, value);
  }, [previousValues, fieldXpMap, onFieldChange]);

  // Initialize previousValues from formData
  useEffect(() => {
    const initialValues: Record<string, unknown> = {};
    fields.forEach(field => {
      initialValues[field.name as string] = formData[field.name];
    });
    setPreviousValues(initialValues);
  }, [fields, formData]);

  if (fields.length === 0) {
    return (
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl mb-4"
        >
          {String.fromCodePoint(0x1F389)}
        </motion.div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Revisao Final
        </h3>
        <p className="text-gray-500">
          Revise os dados e clique em Finalizar para salvar sua organizacao.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <FieldInput
          key={field.name as string}
          field={field}
          value={formData[field.name]}
          onChange={(value) => handleFieldChange(field, value)}
          onBlur={() => handleFieldBlur(field.name as string)}
          showReward={rewardingField === field.name}
          onRewardComplete={() => setRewardingField(null)}
          validationError={validationErrors[field.name as string]}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OrganizationWizard({
  organizationId,
  onComplete,
  onClose,
}: OrganizationWizardProps) {
  const {
    state,
    progress,
    currentStep,
    isFirstStep,
    isLastStep,
    goToStep,
    goToNextStep,
    goToPrevStep,
    updateField,
    awardFieldXp,
    completeStep,
    save,
    isLoading,
    error,
  } = useOrganizationWizard(organizationId);

  const {
    isProcessing: isDocumentProcessing,
    autoFilledFields,
    handleFieldsExtracted,
    setProcessing: setDocumentProcessing,
    setError: setDocumentError,
  } = useOrganizationDocumentUpload();

  const [direction, setDirection] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousLevel, setPreviousLevel] = useState<CompletionLevelConfig | null>(null);
  const [showAutoFillSuccess, setShowAutoFillSuccess] = useState(false);

  // Track level changes for celebration
  useEffect(() => {
    if (previousLevel && previousLevel.level !== progress.completionLevel.level) {
      if (progress.completionLevel.level > previousLevel.level) {
        setShowLevelUp(true);
      }
    }
    setPreviousLevel(progress.completionLevel);
  }, [progress.completionLevel, previousLevel]);

  // Handle document auto-fill success
  useEffect(() => {
    if (autoFilledFields.length > 0) {
      setShowAutoFillSuccess(true);
      const timer = setTimeout(() => setShowAutoFillSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [autoFilledFields]);

  // Handle document fields extracted
  const handleDocumentFieldsExtracted = useCallback((
    fields: Parameters<typeof handleFieldsExtracted>[0],
    confidence: Parameters<typeof handleFieldsExtracted>[1]
  ) => {
    handleFieldsExtracted(fields, confidence, state.formData, updateField);
  }, [handleFieldsExtracted, state.formData, updateField]);

  const handleNext = useCallback(() => {
    setDirection(1);
    if (isLastStep) {
      save().then((success) => {
        if (success) {
          onComplete?.(state.formData);
        }
      });
    } else {
      goToNextStep();
    }
  }, [isLastStep, save, goToNextStep, onComplete, state.formData]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    goToPrevStep();
  }, [goToPrevStep]);

  const handleStepClick = useCallback((index: number) => {
    setDirection(index > state.currentStepIndex ? 1 : -1);
    goToStep(index);
  }, [state.currentStepIndex, goToStep]);

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="organization-wizard" className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Cadastro de Organizacao
              </h1>
              <p className="text-sm text-gray-500">
                Complete seu perfil para ganhar XP e desbloquear recursos
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Document Upload Zone */}
        <div className="mb-6">
          <DocumentDropZone
            onFieldsExtracted={handleDocumentFieldsExtracted}
            onUploadStart={() => setDocumentProcessing(true)}
            onUploadComplete={() => setDocumentProcessing(false)}
            onError={(error) => setDocumentError(error)}
            isProcessing={isDocumentProcessing}
            compact={progress.completionPercentage > 50}
          />

          {/* Auto-fill success notification */}
          <AnimatePresence>
            {showAutoFillSuccess && autoFilledFields.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-700">
                    {autoFilledFields.length} campo(s) preenchido(s) automaticamente!
                  </p>
                  <p className="text-xs text-green-600">
                    +{autoFilledFields.reduce((sum, f) => {
                      const field = WIZARD_STEPS.flatMap(s => s.fields).find(fl => fl.name === f.fieldName);
                      return sum + (field?.xpValue || 0);
                    }, 0)} XP ganhos
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress */}
        <WizardProgress
          currentStepIndex={state.currentStepIndex}
          completedSteps={state.completedSteps}
          completionPercentage={progress.completionPercentage}
          completionLevel={progress.completionLevel}
          xpEarned={progress.xpEarned}
          xpPotential={progress.xpPotential}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Wizard Step */}
        <div className="lg:col-span-2">
          <WizardStep
            step={currentStep}
            stepIndex={state.currentStepIndex}
            totalSteps={WIZARD_STEPS.length}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            isSaving={state.isSaving}
            direction={direction}
            onNext={handleNext}
            onPrev={handlePrev}
            onSave={save}
          >
            {currentStep.id === 'whatsapp' ? (
              <WhatsAppStepContent
                organizationPhone={state.formData.phone as string | undefined}
                onConnectionSuccess={() => {
                  completeStep('whatsapp');
                }}
                onAwardXP={(xp) => {
                  awardFieldXp('whatsapp_connected', xp);
                }}
                isAlreadyConnected={state.fieldXpMap['whatsapp_connected'] || false}
              />
            ) : (
              <StepContent
                fields={currentStep.fields}
                formData={state.formData}
                fieldXpMap={state.fieldXpMap}
                onFieldChange={updateField}
              />
            )}
          </WizardStep>

          {/* Error Display */}
          {error && (
            <motion.div
              className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Sidebar - Progress Card */}
        <div className="space-y-6">
          <CompletionBadge
            level={progress.completionLevel}
            percentage={progress.completionPercentage}
            size="lg"
          />

          <LevelProgressCard
            currentLevel={progress.completionLevel}
            nextLevel={progress.nextLevel}
            percentage={progress.completionPercentage}
            percentageToNext={progress.percentageToNextLevel}
          />

          {/* Stats */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Seu Progresso
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Campos preenchidos</span>
                <span className="font-medium">
                  {progress.filledFieldsCount}/{progress.totalFieldsCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Obrigatorios</span>
                <span className="font-medium">
                  {progress.filledRequiredCount}/{progress.requiredFieldsCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Etapas concluidas</span>
                <span className="font-medium">
                  {progress.completedStepsCount}/{progress.totalStepsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Auto-save indicator */}
          {state.lastSavedAt && (
            <p className="text-xs text-gray-400 text-center">
              Salvo automaticamente as {new Date(state.lastSavedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Level Up Celebration */}
      <LevelUpCelebration
        show={showLevelUp}
        levelName={progress.completionLevel.name}
        levelIcon={progress.completionLevel.icon}
        levelColor={progress.completionLevel.color}
        onClose={() => setShowLevelUp(false)}
      />
    </div>
  );
}

export default OrganizationWizard;
