/**
 * PodcastWizardForm Component — Multi-Step AI-Assisted Flow
 *
 * Step 1: Guest Info (name + context) → "Pesquisar Convidado"
 * Step 2: AI Research Loading (animated phases)
 * Step 3: AI Suggestions (theme + title selection)
 * Step 4: Confirm & Create (summary + optional details)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  Hash,
} from 'lucide-react';
import type { DeepResearchResult } from '../../types/studio';
import { ResearchLoadingState } from './ResearchLoadingState';
import { AISuggestionCard } from './AISuggestionCard';

// ============================================================================
// TYPES
// ============================================================================

export interface PodcastWizardFormProps {
  formData: {
    title: string;
    guestName: string;
    guestContext: string;
    theme: string;
    description: string;
    scheduledDate: string;
    scheduledTime: string;
    location: string;
    season: string;
  };
  onChange: (field: string, value: string) => void;
  currentStep: number;
  onStepChange: (step: number) => void;
  researchResults: DeepResearchResult | null;
  onStartResearch: () => void;
  isResearching: boolean;
  researchError: string | null;
  inputClasses: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCATIONS = [
  'Radio Tupi',
  'Estudio Remoto',
  'Podcast House',
  'Outro',
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

// ============================================================================
// COMPONENT
// ============================================================================

export const PodcastWizardForm: React.FC<PodcastWizardFormProps> = ({
  formData,
  onChange,
  currentStep,
  onStepChange,
  researchResults,
  onStartResearch,
  isResearching,
  researchError,
  inputClasses,
}) => {
  const [direction, setDirection] = useState(1);
  const [showDossier, setShowDossier] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [customTheme, setCustomTheme] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    onStepChange(step);
  };

  // ==========================================================================
  // STEP 1 — Guest Info
  // ==========================================================================

  const renderStep1 = () => {
    const canResearch = formData.guestName.trim().length > 0 && formData.guestContext.trim().length > 0;

    return (
      <div className="space-y-4">
        {/* Guest Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
            <User className="w-3 h-3 inline mr-1" />
            Nome do Convidado *
          </label>
          <input
            data-testid="guest-name"
            type="text"
            value={formData.guestName}
            onChange={(e) => onChange('guestName', e.target.value)}
            placeholder="Ex: Joao Silva"
            autoFocus
            className={inputClasses}
          />
        </div>

        {/* Guest Context */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
            Contexto do Convidado *
          </label>
          <input
            data-testid="guest-context"
            type="text"
            value={formData.guestContext}
            onChange={(e) => onChange('guestContext', e.target.value)}
            placeholder="Ex: CEO da Startup X, professor de IA na USP, autor do livro Y"
            className={inputClasses}
          />
        </div>

        {/* Research Button */}
        <div className="pt-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              onStartResearch();
              goToStep(2);
            }}
            disabled={!canResearch}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Pesquisar Convidado
          </button>

          <button
            type="button"
            onClick={() => goToStep(4)}
            disabled={!canResearch}
            className="w-full text-sm text-ceramic-text-secondary hover:text-amber-600 transition-colors disabled:opacity-50"
          >
            Pular pesquisa — preencher manualmente
          </button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // STEP 2 — AI Research Loading
  // ==========================================================================

  const renderStep2 = () => {
    if (researchError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="p-4 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 text-center max-w-sm">
            <p className="text-sm text-ceramic-error">{researchError}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onStartResearch();
              }}
              className="py-2 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => goToStep(4)}
              className="text-sm text-ceramic-text-secondary hover:text-amber-600 transition-colors"
            >
              Preencher manualmente
            </button>
          </div>
        </div>
      );
    }

    return <ResearchLoadingState guestName={formData.guestName} />;
  };

  // ==========================================================================
  // STEP 3 — AI Suggestions
  // ==========================================================================

  const renderStep3 = () => {
    if (!researchResults) return null;

    const themes = researchResults.suggestedThemes || [];
    const isCustomThemeSelected = formData.theme !== '' && !themes.includes(formData.theme) && formData.theme === customTheme;
    const selectedThemeTitles = formData.theme && researchResults.suggestedTitles
      ? researchResults.suggestedTitles[formData.theme] || []
      : [];
    const isCustomTitleSelected = formData.title !== '' && !selectedThemeTitles.includes(formData.title) && formData.title === customTitle;

    return (
      <div className="space-y-6">
        {/* Back to Step 1 */}
        <button
          type="button"
          onClick={() => goToStep(1)}
          className="flex items-center gap-1 text-sm text-ceramic-text-secondary hover:text-amber-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Guest Bio Preview */}
        {researchResults.dossier?.biography && (
          <div className="rounded-2xl border border-ceramic-border bg-ceramic-cool p-4">
            <button
              type="button"
              onClick={() => setShowDossier(!showDossier)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-bold text-ceramic-text-primary">
                Sobre {formData.guestName}
              </span>
              <motion.div animate={{ rotate: showDossier ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
              </motion.div>
            </button>

            <p className="text-sm text-ceramic-text-secondary mt-2 line-clamp-2">
              {researchResults.dossier.biography}
            </p>

            <AnimatePresence>
              {showDossier && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-3 border-t border-ceramic-border text-sm text-ceramic-text-secondary whitespace-pre-line">
                    {researchResults.dossier.biography}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Theme Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-3">
            Selecione um Tema *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {themes.map((theme) => (
              <AISuggestionCard
                key={theme}
                text={theme}
                isSelected={formData.theme === theme}
                onSelect={() => {
                  onChange('theme', theme);
                  // Reset title when theme changes so user picks a new one
                  onChange('title', '');
                  setCustomTitle('');
                }}
              />
            ))}
            <AISuggestionCard
              text="Outro tema"
              isSelected={isCustomThemeSelected}
              onSelect={() => {
                onChange('theme', customTheme);
                onChange('title', '');
                setCustomTitle('');
              }}
              isCustom
              customValue={customTheme}
              onCustomChange={(v) => {
                setCustomTheme(v);
                onChange('theme', v);
                onChange('title', '');
                setCustomTitle('');
              }}
            />
          </div>
        </div>

        {/* Title Selection — appears after theme is selected */}
        <AnimatePresence>
          {formData.theme.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-3">
                Selecione um Titulo *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedThemeTitles.map((title) => (
                  <AISuggestionCard
                    key={title}
                    text={title}
                    isSelected={formData.title === title}
                    onSelect={() => onChange('title', title)}
                  />
                ))}
                <AISuggestionCard
                  text="Outro titulo"
                  isSelected={isCustomTitleSelected}
                  onSelect={() => onChange('title', customTitle)}
                  isCustom
                  customValue={customTitle}
                  onCustomChange={(v) => {
                    setCustomTitle(v);
                    onChange('title', v);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sources */}
        {researchResults.sources && researchResults.sources.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              <motion.div animate={{ rotate: showSources ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3 h-3" />
              </motion.div>
              {researchResults.sources.length} fontes encontradas
            </button>

            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-2 space-y-1">
                    {researchResults.sources.map((source, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-amber-600 truncate"
                        >
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Next button */}
        {formData.theme.trim() && formData.title.trim() && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2">
            <button
              type="button"
              onClick={() => goToStep(4)}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // STEP 4 — Confirm & Create
  // ==========================================================================

  const renderStep4 = () => {
    const hasResearch = !!researchResults;

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          type="button"
          onClick={() => goToStep(hasResearch ? 3 : 1)}
          className="flex items-center gap-1 text-sm text-ceramic-text-secondary hover:text-amber-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Summary card */}
        <div className="rounded-2xl border border-ceramic-border bg-ceramic-cool p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-ceramic-text-primary">Convidado:</span>
            <span className="text-ceramic-text-secondary">{formData.guestName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-ceramic-text-primary">Contexto:</span>
            <span className="text-ceramic-text-secondary">{formData.guestContext}</span>
          </div>
          {formData.theme && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-ceramic-text-primary">Tema:</span>
              <span className="text-ceramic-text-secondary">{formData.theme}</span>
            </div>
          )}
          {formData.title && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-ceramic-text-primary">Titulo:</span>
              <span className="text-ceramic-text-secondary">{formData.title}</span>
            </div>
          )}
        </div>

        {/* Manual entry fields if no research */}
        {!hasResearch && (
          <>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                Tema *
              </label>
              <input
                type="text"
                value={formData.theme}
                onChange={(e) => onChange('theme', e.target.value)}
                placeholder="Ex: Politicas Publicas, Inovacao"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                Titulo *
              </label>
              <input
                data-testid="episode-title"
                type="text"
                value={formData.title}
                onChange={(e) => onChange('title', e.target.value)}
                placeholder="Ex: Conversa com Eduardo Paes"
                className={inputClasses}
              />
            </div>
          </>
        )}

        {/* Optional Details — Collapsible */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowOptionalDetails(!showOptionalDetails)}
            className="flex items-center gap-2 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <motion.div
              animate={{ rotate: showOptionalDetails ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
            Detalhes opcionais
          </button>

          <AnimatePresence>
            {showOptionalDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-4">
                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      Descricao
                    </label>
                    <textarea
                      data-testid="episode-description"
                      value={formData.description}
                      onChange={(e) => onChange('description', e.target.value)}
                      placeholder="Adicione detalhes sobre o episodio..."
                      rows={3}
                      className={`${inputClasses} resize-none`}
                    />
                  </div>

                  {/* Scheduling Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Data
                      </label>
                      <input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => onChange('scheduledDate', e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                        Hora
                      </label>
                      <input
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => onChange('scheduledTime', e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Local
                      </label>
                      <select
                        value={formData.location}
                        onChange={(e) => onChange('location', e.target.value)}
                        className={inputClasses}
                      >
                        {LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                        <Hash className="w-3 h-3 inline mr-1" />
                        Temporada
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.season}
                        onChange={(e) => onChange('season', e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentStep}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </motion.div>
    </AnimatePresence>
  );
};
