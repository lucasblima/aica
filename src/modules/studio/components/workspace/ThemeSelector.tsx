/**
 * ThemeSelector - Episode theme selection and AI suggestions
 *
 * Extracted from SetupStage for better modularity.
 * Handles both manual theme input and AI-powered theme suggestions.
 *
 * @module studio/components/workspace
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, User, AlertCircle, Mic, MicOff } from 'lucide-react';
import { GeminiClient } from '@/lib/gemini/client';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ThemeSelector');

interface ThemeSelectorProps {
  theme: string;
  themeMode: 'auto' | 'manual';
  guestName: string;
  guestType: string;
  guestBio?: string;
  guestReference?: string;
  profileData: any | null;
  voiceTheme: {
    isSupported: boolean;
    isListening: boolean;
    toggle: () => void;
  };
  onThemeChange: (theme: string) => void;
  onThemeModeChange: (mode: 'auto' | 'manual') => void;
}

export default function ThemeSelector({
  theme,
  themeMode,
  guestName,
  guestType,
  guestBio,
  guestReference,
  profileData,
  voiceTheme,
  onThemeChange,
  onThemeModeChange,
}: ThemeSelectorProps) {
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>([]);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const hasGeneratedRef = useRef(false);

  const handleGenerateThemeSuggestions = async () => {
    if (!guestName.trim()) {
      setThemeError('Por favor, insira o nome do convidado primeiro');
      return;
    }

    setIsGeneratingThemes(true);
    setThemeError(null);
    setThemeSuggestions([]);

    try {
      let messageContent = `Sugira 3-5 temas atraentes e específicos para um episódio de podcast com ${guestName}`;
      if (guestReference) {
        messageContent += ` (${guestReference})`;
      }
      if (guestType === 'common_person' && guestBio) {
        messageContent += `\n\nInformações adicionais: ${guestBio}`;
      }
      if (profileData) {
        messageContent += `\n\nPerfil do convidado:`;
        if (profileData.occupation) messageContent += `\nOcupação: ${profileData.occupation}`;
        if (profileData.known_for) messageContent += `\nConhecido por: ${profileData.known_for}`;
        if (profileData.bio_summary) messageContent += `\nBiografia: ${profileData.bio_summary}`;
      }

      const geminiClient = GeminiClient.getInstance();
      const result = await geminiClient.call({
        action: 'chat_aica',
        payload: {
          message: messageContent,
          systemPrompt: `Você é um assistente especializado em sugerir temas para episódios de podcast.
Baseado nas informações fornecidas sobre o convidado, sugira 3-5 temas específicos, envolventes e relevantes.
Cada tema deve ser curto (máximo 10 palavras), direto e adequado para um episódio de podcast.
Retorne APENAS um array JSON de strings com os temas sugeridos, sem nenhum texto adicional.
Exemplo: ["Tema 1", "Tema 2", "Tema 3"]`,
        },
        model: 'fast',
      });

      let suggestions: string[] = [];
      const responseText = typeof result.result === 'string' ? result.result :
        (result.result?.response || result.result?.text || JSON.stringify(result.result));

      if (Array.isArray(responseText)) {
        suggestions = responseText;
      } else if (typeof responseText === 'string') {
        try {
          const parsed = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim());
          if (Array.isArray(parsed)) {
            suggestions = parsed;
          }
        } catch {
          suggestions = responseText
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'))
            .map((line: string) => line.replace(/^["'-]\s*|["'-]$/g, '').replace(/^-\s*/, ''))
            .slice(0, 5);
        }
      }

      if (suggestions.length === 0) {
        throw new Error('Nenhuma sugestão foi gerada');
      }

      setThemeSuggestions(suggestions);
      setThemeError(null);
    } catch (error: any) {
      log.error('Error generating theme suggestions:', error);
      setThemeError(error.message || 'Erro ao gerar sugestões de tema. Tente novamente.');
      setThemeSuggestions([]);
    } finally {
      setIsGeneratingThemes(false);
    }
  };

  const handleSelectThemeSuggestion = (selectedTheme: string) => {
    onThemeChange(selectedTheme);
    setThemeSuggestions([]);
  };

  const handleThemeModeAuto = () => {
    onThemeModeChange('auto');
    if (guestName.trim()) {
      handleGenerateThemeSuggestions();
    }
  };

  // Auto-generate theme suggestions when guest name is filled in auto mode
  useEffect(() => {
    if (
      themeMode === 'auto' &&
      guestName.trim() &&
      !isGeneratingThemes &&
      themeSuggestions.length === 0 &&
      !themeError &&
      !hasGeneratedRef.current
    ) {
      hasGeneratedRef.current = true;
      handleGenerateThemeSuggestions();
    }

    if (themeMode !== 'auto' || themeSuggestions.length > 0) {
      hasGeneratedRef.current = false;
    }
  }, [themeMode, guestName, isGeneratingThemes, themeSuggestions.length, themeError]);

  return (
    <section
      className="bg-ceramic-surface rounded-lg shadow-sm p-4 sm:p-6 space-y-6"
      aria-labelledby="episode-theme-heading"
    >
      <h2
        id="episode-theme-heading"
        className="text-lg font-semibold text-ceramic-text-primary flex items-center space-x-2"
      >
        <Sparkles className="w-5 h-5 text-ceramic-text-primary" aria-hidden="true" />
        <span>Tema do Episódio</span>
      </h2>

      {/* Theme Mode Selector */}
      <div>
        <h3
          id="theme-mode-heading"
          className="block text-sm font-medium text-ceramic-text-primary mb-3"
        >
          Modo de Seleção
        </h3>
        <div
          className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          role="radiogroup"
          aria-labelledby="theme-mode-heading"
        >
          <button
            type="button"
            role="radio"
            aria-checked={themeMode === 'auto'}
            onClick={handleThemeModeAuto}
            disabled={isGeneratingThemes}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 transition-all
              focus:outline-none focus:ring-4 focus:ring-ceramic-accent/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${themeMode === 'auto'
                ? 'border-ceramic-accent bg-ceramic-accent text-ceramic-text-primary'
                : 'border-ceramic-border hover:border-ceramic-accent/50 text-ceramic-secondary'
              }
            `}
          >
            <div className="flex items-center justify-center space-x-2">
              {isGeneratingThemes ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" role="status" aria-label="Gerando sugestões" />
              ) : (
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              )}
              <span className="font-medium">
                {isGeneratingThemes ? 'Gerando sugestões...' : 'Auto-sugerir com IA'}
              </span>
            </div>
            <p className="text-xs mt-1">
              {isGeneratingThemes ? 'Aguarde...' : 'Gerar sugestões baseadas no convidado'}
            </p>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={themeMode === 'manual'}
            onClick={() => onThemeModeChange('manual')}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 transition-all
              focus:outline-none focus:ring-4 focus:ring-ceramic-accent/20
              ${themeMode === 'manual'
                ? 'border-ceramic-accent bg-ceramic-accent text-ceramic-text-primary'
                : 'border-ceramic-border hover:border-ceramic-accent/50 text-ceramic-secondary'
              }
            `}
          >
            <div className="flex items-center justify-center space-x-2">
              <User className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">Inserir Manualmente</span>
            </div>
            <p className="text-xs mt-1">
              Digitar o tema diretamente
            </p>
          </button>
        </div>
      </div>

      {/* Theme Input */}
      <div>
        <label
          htmlFor="episode-theme-input"
          className="block text-sm font-medium text-ceramic-text-primary mb-2"
        >
          Tema
        </label>
        <div className="relative">
          <input
            id="episode-theme-input"
            type="text"
            value={theme}
            onChange={(e) => onThemeChange(e.target.value)}
            placeholder={themeMode === 'auto' ? 'Tema será sugerido pela IA' : 'Digite o tema do episódio'}
            required
            aria-required="true"
            className="w-full px-4 py-2 pr-12 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
          />
          {voiceTheme.isSupported && (
            <button
              type="button"
              onClick={voiceTheme.toggle}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                voiceTheme.isListening
                  ? 'text-ceramic-error animate-pulse'
                  : 'text-ceramic-text-secondary hover:text-ceramic-accent'
              }`}
              aria-label={voiceTheme.isListening ? 'Parar gravação de voz' : 'Ditar tema por voz'}
            >
              {voiceTheme.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* AI Theme Suggestions - Waiting for guest name */}
      {themeMode === 'auto' && !guestName.trim() && !isGeneratingThemes && themeSuggestions.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium text-ceramic-text-primary mb-1">Preencha o nome do convidado</p>
              <p className="text-sm text-ceramic-secondary">
                Assim que você preencher o nome do convidado acima, a IA gerará automaticamente sugestões de temas relevantes para o episódio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Theme Suggestions - Loading State (Skeleton) */}
      {themeMode === 'auto' && isGeneratingThemes && (
        <div className="space-y-3" role="status" aria-label="Gerando sugestoes de tema">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-ceramic-info animate-pulse" aria-hidden="true" />
            <p className="text-sm font-medium text-ceramic-secondary">Gerando sugestoes...</p>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="w-full px-4 py-3 bg-ceramic-base border-2 border-ceramic-border rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-ceramic-cool animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 bg-ceramic-cool animate-pulse rounded-lg ${i === 1 ? 'w-full' : i === 2 ? 'w-4/5' : 'w-3/5'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Theme Suggestions - Error State */}
      {themeMode === 'auto' && themeError && !isGeneratingThemes && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-ceramic-error-bg border border-ceramic-error/30 rounded-lg flex items-start space-x-3"
        >
          <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium text-ceramic-error mb-1">Erro ao gerar sugestões</p>
            <p className="text-sm text-ceramic-error/80 mb-3">{themeError}</p>
            <button
              type="button"
              onClick={handleGenerateThemeSuggestions}
              className="px-4 py-2 bg-ceramic-error text-white rounded-lg hover:bg-ceramic-error/90 transition-colors text-sm inline-flex items-center space-x-2 focus:outline-none focus:ring-4 focus:ring-ceramic-error/20"
            >
              <span>Tentar Novamente</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Theme Suggestions - Results */}
      {themeMode === 'auto' && themeSuggestions.length > 0 && !isGeneratingThemes && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ceramic-text-primary flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-ceramic-info" aria-hidden="true" />
              <span>Selecione um tema sugerido pela IA:</span>
            </p>
            <button
              type="button"
              onClick={() => setThemeSuggestions([])}
              className="text-xs text-ceramic-tertiary hover:text-ceramic-secondary underline focus:outline-none focus:ring-2 focus:ring-ceramic-accent rounded px-2 py-1"
            >
              Gerar novamente
            </button>
          </div>
          <div
            role="status"
            aria-live="polite"
            className="space-y-2"
          >
            {themeSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectThemeSuggestion(suggestion)}
                className="w-full text-left px-4 py-3 bg-ceramic-base border-2 border-ceramic-info/30 rounded-lg hover:border-ceramic-info hover:bg-ceramic-info-bg transition-all focus:outline-none focus:ring-4 focus:ring-amber-500/20 group"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-ceramic-info-bg flex items-center justify-center text-ceramic-info text-xs font-semibold group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-sm text-ceramic-text-primary group-hover:text-amber-600 transition-colors">
                    {suggestion}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
