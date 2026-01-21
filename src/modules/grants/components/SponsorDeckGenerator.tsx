/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * SponsorDeckGenerator - Wizard component for generating sponsor decks
 * Issue #98 - Gerador de Deck de Patrocinio
 *
 * A multi-step wizard that guides users through creating a PowerPoint
 * presentation for sponsorship proposals.
 *
 * @module modules/grants/components/SponsorDeckGenerator
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Presentation,
  Palette,
  Settings,
  Eye,
  Loader2,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  X,
  Languages,
  DollarSign,
  Star,
  Layers,
} from 'lucide-react';
import { useSponsorDeck } from '../hooks/useSponsorDeck';
import { useSponsorshipTiers } from '../hooks/useSponsorship';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Sponsordeckgenerator');
import type {
  DeckTemplate,
  DeckOptions,
  DeckWizardStep,
  SlidePreview,
} from '../types/sponsorDeck';
import {
  DECK_TEMPLATES,
  DECK_WIZARD_STEPS,
  DEFAULT_SLIDE_STRUCTURE,
} from '../types/sponsorDeck';

// =============================================================================
// TYPES
// =============================================================================

interface SponsorDeckGeneratorProps {
  /** Project ID to generate deck for */
  projectId: string;
  /** Optional project name for display */
  projectName?: string;
  /** Callback when wizard is closed */
  onClose?: () => void;
  /** Callback when deck is generated successfully */
  onGenerated?: (downloadUrl: string, filename: string) => void;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

interface TemplateCardProps {
  template: DeckTemplate;
  selected: boolean;
  onClick: () => void;
}

function TemplateCard({ template, selected, onClick }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-full p-4 rounded-xl border-2 text-left
        transition-all duration-200
        ${selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300'
        }
      `}
    >
      {/* Color preview */}
      <div className="flex gap-1.5 mb-3">
        <div
          className="w-8 h-8 rounded-lg shadow-inner"
          style={{ backgroundColor: template.colors.primary }}
        />
        <div
          className="w-8 h-8 rounded-lg shadow-inner"
          style={{ backgroundColor: template.colors.secondary }}
        />
        <div
          className="w-8 h-8 rounded-lg shadow-inner"
          style={{ backgroundColor: template.colors.accent }}
        />
      </div>

      {/* Template info */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
        {template.name}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {template.description}
      </p>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </button>
  );
}

interface OptionsSectionProps {
  options: DeckOptions;
  onOptionsChange: (options: DeckOptions) => void;
  highlightTierOptions: Array<{ id: string; name: string }>;
}

function OptionsSection({ options, onOptionsChange, highlightTierOptions }: OptionsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Language */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Languages className="w-4 h-4" />
          Idioma
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onOptionsChange({ ...options, language: 'pt-BR' })}
            className={`
              flex-1 py-2.5 px-4 rounded-lg border-2 font-medium text-sm
              transition-colors
              ${options.language === 'pt-BR'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }
            `}
          >
            Portugues (BR)
          </button>
          <button
            type="button"
            onClick={() => onOptionsChange({ ...options, language: 'en-US' })}
            className={`
              flex-1 py-2.5 px-4 rounded-lg border-2 font-medium text-sm
              transition-colors
              ${options.language === 'en-US'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }
            `}
          >
            Ingles (EUA)
          </button>
        </div>
      </div>

      {/* Include financials */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <DollarSign className="w-4 h-4" />
          Informacoes Financeiras
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOptionsChange({ ...options, includeFinancials: true })}
            className={`
              flex-1 py-2.5 px-4 rounded-lg border-2 font-medium text-sm
              transition-colors
              ${options.includeFinancials
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }
            `}
          >
            Incluir valores e cotas
          </button>
          <button
            type="button"
            onClick={() => onOptionsChange({ ...options, includeFinancials: false })}
            className={`
              flex-1 py-2.5 px-4 rounded-lg border-2 font-medium text-sm
              transition-colors
              ${!options.includeFinancials
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }
            `}
          >
            Apenas informacoes gerais
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {options.includeFinancials
            ? 'O deck incluira valores aprovados, cotas de patrocinio e precos.'
            : 'O deck focara no projeto e contrapartidas, sem mencionar valores.'
          }
        </p>
      </div>

      {/* Highlight tier */}
      {highlightTierOptions.length > 0 && (
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Star className="w-4 h-4" />
            Destacar Cota (opcional)
          </label>
          <select
            value={options.highlightTierId || ''}
            onChange={(e) => onOptionsChange({
              ...options,
              highlightTierId: e.target.value || undefined,
            })}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Nenhuma cota em destaque</option>
            {highlightTierOptions.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1.5">
            A cota selecionada sera visualmente destacada na apresentacao.
          </p>
        </div>
      )}

      {/* Color scheme override */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Palette className="w-4 h-4" />
          Cor Personalizada (opcional)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={options.colorScheme || '#1a365d'}
            onChange={(e) => onOptionsChange({
              ...options,
              colorScheme: e.target.value,
            })}
            className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
          />
          <input
            type="text"
            value={options.colorScheme || ''}
            onChange={(e) => onOptionsChange({
              ...options,
              colorScheme: e.target.value || undefined,
            })}
            placeholder="#1a365d"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
          {options.colorScheme && (
            <button
              type="button"
              onClick={() => onOptionsChange({ ...options, colorScheme: undefined })}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Usar cor padrao do template"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Sobrescreve a cor primaria do template selecionado.
        </p>
      </div>
    </div>
  );
}

interface PreviewSectionProps {
  slides: SlidePreview[];
  includeFinancials: boolean;
}

function PreviewSection({ slides, includeFinancials }: PreviewSectionProps) {
  // Filter slides based on options
  const visibleSlides = useMemo(() => {
    return slides.filter((slide) => {
      if (!includeFinancials && (slide.type === 'tiers' || slide.type === 'deliverables')) {
        return false;
      }
      return true;
    });
  }, [slides, includeFinancials]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Layers className="w-4 h-4" />
        <span>{visibleSlides.length} slides na apresentacao</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {visibleSlides.map((slide, index) => (
          <div
            key={slide.type}
            className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 aspect-[16/9] flex flex-col justify-between"
          >
            {/* Slide number */}
            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {index + 1}
              </span>
            </div>

            {/* Slide info */}
            <div className="pt-4">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {slide.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {slide.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface GeneratingSectionProps {
  progress: number;
  progressStep: string;
}

function GeneratingSection({ progress, progressStep }: GeneratingSectionProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Animated icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-indigo-500 animate-pulse" />
        </div>
        <div className="absolute -inset-1 rounded-full border-2 border-indigo-500/30 animate-ping" />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-4">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Progress text */}
      <p className="text-gray-600 dark:text-gray-400 text-center">
        {progressStep || 'Iniciando geracao...'}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
        {progress}% concluido
      </p>
    </div>
  );
}

interface DoneSectionProps {
  filename: string | null;
  onDownload: () => void;
  onReset: () => void;
}

function DoneSection({ filename, onDownload, onReset }: DoneSectionProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-green-500" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Deck Gerado com Sucesso!
      </h3>

      <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
        Sua apresentacao esta pronta para download.
      </p>

      {filename && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
          {filename}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium
                     hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
        >
          <Download className="w-5 h-5" />
          Baixar Apresentacao
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                     rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Gerar Novo
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SponsorDeckGenerator({
  projectId,
  projectName,
  onClose,
  onGenerated,
  className = '',
}: SponsorDeckGeneratorProps) {
  // State
  const [currentStep, setCurrentStep] = useState<DeckWizardStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('professional');
  const [options, setOptions] = useState<DeckOptions>({
    includeFinancials: true,
    language: 'pt-BR',
  });

  // Hooks
  const {
    generateDeck,
    isGenerating,
    progress,
    progressStep,
    downloadUrl,
    filename,
    error,
    reset,
    download,
  } = useSponsorDeck({ projectId });

  const { tiers } = useSponsorshipTiers(projectId);

  // Tier options for highlight dropdown
  const tierOptions = useMemo(() => {
    return tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
    }));
  }, [tiers]);

  // Current step index
  const currentStepIndex = DECK_WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  // Navigation
  const canGoBack = currentStepIndex > 0 && currentStep !== 'generating' && currentStep !== 'done';
  const canGoNext = currentStep !== 'generating' && currentStep !== 'done';

  const goBack = useCallback(() => {
    if (canGoBack) {
      setCurrentStep(DECK_WIZARD_STEPS[currentStepIndex - 1].id);
    }
  }, [canGoBack, currentStepIndex]);

  const goNext = useCallback(() => {
    if (currentStep === 'preview') {
      // Start generation
      setCurrentStep('generating');
      generateDeck(selectedTemplate, options).then(() => {
        setCurrentStep('done');
      }).catch((err) => {
        // Error is handled in the hook, but log for debugging
        log.error(Generation failed:', err);
        setCurrentStep('options');
      });
    } else if (currentStepIndex < DECK_WIZARD_STEPS.length - 3) {
      setCurrentStep(DECK_WIZARD_STEPS[currentStepIndex + 1].id);
    }
  }, [currentStep, currentStepIndex, generateDeck, selectedTemplate, options]);

  // Reset handler
  const handleReset = useCallback(() => {
    reset();
    setCurrentStep('template');
    setSelectedTemplate('professional');
    setOptions({
      includeFinancials: true,
      language: 'pt-BR',
    });
  }, [reset]);

  // Download handler
  const handleDownload = useCallback(() => {
    download();
    if (downloadUrl && filename && onGenerated) {
      onGenerated(downloadUrl, filename);
    }
  }, [download, downloadUrl, filename, onGenerated, projectId]);

  // Get next button text
  const getNextButtonText = () => {
    switch (currentStep) {
      case 'template':
        return 'Personalizar';
      case 'options':
        return 'Visualizar';
      case 'preview':
        return 'Gerar Deck';
      default:
        return 'Proximo';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Presentation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Gerar Deck de Patrocinio
            </h2>
            {projectName && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{projectName}</p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          {DECK_WIZARD_STEPS.slice(0, 4).map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = currentStepIndex > index ||
              (currentStep === 'done' && index < 4);
            const isGeneratingOrDone = currentStep === 'generating' || currentStep === 'done';

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      transition-colors
                      ${isActive
                        ? 'bg-indigo-600 text-white'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }
                    `}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="w-4 h-4" />
                    ) : isGeneratingOrDone && step.id === 'generating' ? (
                      isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`
                      text-xs mt-1 hidden sm:block
                      ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 dark:text-gray-400'}
                    `}
                  >
                    {step.title}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={`
                      flex-1 h-0.5 mx-2
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px]">
        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">Erro ao gerar deck</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Step content */}
        {currentStep === 'template' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Escolha um Template
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DECK_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplate === template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                />
              ))}
            </div>
          </div>
        )}

        {currentStep === 'options' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Personalize seu Deck
            </h3>
            <OptionsSection
              options={options}
              onOptionsChange={setOptions}
              highlightTierOptions={tierOptions}
            />
          </div>
        )}

        {currentStep === 'preview' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Estrutura da Apresentacao
            </h3>
            <PreviewSection
              slides={DEFAULT_SLIDE_STRUCTURE}
              includeFinancials={options.includeFinancials}
            />
          </div>
        )}

        {currentStep === 'generating' && (
          <GeneratingSection progress={progress} progressStep={progressStep} />
        )}

        {currentStep === 'done' && (
          <DoneSection
            filename={filename}
            onDownload={handleDownload}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Footer */}
      {currentStep !== 'generating' && currentStep !== 'done' && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-colors
              ${canGoBack
                ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext || isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm
                       hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                {getNextButtonText()}
                {currentStep === 'preview' ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default SponsorDeckGenerator;
