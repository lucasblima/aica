/**
 * SetupStage - Episode Setup and Guest Configuration
 *
 * Allows selecting guest type and configuring episode details.
 * Migrated from _deprecated/modules/podcast/components/stages/SetupStage.tsx
 *
 * Wave 5 - Stream 1: Setup Stage Components Migration
 * - Updated imports to new module structure
 * - Applied Ceramic Design System patterns
 * - Enhanced accessibility (WCAG 2.1 AA)
 * - Preserved all business logic
 *
 * @module studio/components/workspace
 */

import React, { useState, useEffect, useRef } from 'react';
import { usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import { User, Users, UserCircle, Sparkles, Calendar, MapPin, Clock, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { searchGuestProfile } from '@/services/podcastProductionService';
import { GeminiClient } from '@/lib/gemini/client';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('SetupStage');

export default function SetupStage() {
  const { state, actions } = usePodcastWorkspace();
  const { setup } = state;
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);

  // Theme suggestion state
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>([]);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const hasGeneratedRef = useRef(false);

  // Handle guest type selection
  const handleGuestTypeSelect = (type: 'public_figure' | 'common_person') => {
    actions.setGuestType(type);
    // Reset search-related fields when switching types
    actions.updateSetup({
      guestReference: '',
      searchResults: null,
    });
    setProfileData(null);
    setSearchError(null);
  };

  // Handle theme mode change to auto
  const handleThemeModeAuto = () => {
    actions.updateSetup({ themeMode: 'auto' });

    // If guest name is filled, auto-generate suggestions
    if (setup.guestName.trim()) {
      handleGenerateThemeSuggestions();
    }
  };

  // Handle AI profile search
  const handleSearchProfile = async () => {
    if (!setup.guestName.trim()) {
      setSearchError('Por favor, insira o nome do convidado');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await searchGuestProfile(
        setup.guestName,
        setup.guestReference || undefined
      );

      if (result.success && result.data) {
        setProfileData(result.data);
        setSearchError(null);
      } else {
        setSearchError(result.error || 'Não foi possível encontrar o perfil');
        setProfileData(null);
      }
    } catch (error) {
      log.error('Error searching profile:', error);
      setSearchError('Erro ao buscar perfil. Tente novamente.');
      setProfileData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle profile confirmation
  const handleConfirmProfile = () => {
    if (profileData) {
      // Update workspace with profile data
      actions.updateSetup({
        searchResults: profileData,
      });
      // Could also pre-populate research stage here if needed
    }
  };

  // Handle theme suggestion generation
  const handleGenerateThemeSuggestions = async () => {
    if (!setup.guestName.trim()) {
      setThemeError('Por favor, insira o nome do convidado primeiro');
      return;
    }

    setIsGeneratingThemes(true);
    setThemeError(null);
    setThemeSuggestions([]);

    try {
      // Build the message for theme suggestion
      let messageContent = `Sugira 3-5 temas atraentes e específicos para um episódio de podcast com ${setup.guestName}`;
      if (setup.guestReference) {
        messageContent += ` (${setup.guestReference})`;
      }
      if (setup.guestType === 'common_person' && setup.guestBio) {
        messageContent += `\n\nInformações adicionais: ${setup.guestBio}`;
      }
      if (profileData) {
        messageContent += `\n\nPerfil do convidado:`;
        if (profileData.occupation) messageContent += `\nOcupação: ${profileData.occupation}`;
        if (profileData.known_for) messageContent += `\nConhecido por: ${profileData.known_for}`;
        if (profileData.bio_summary) messageContent += `\nBiografia: ${profileData.bio_summary}`;
      }

      // Call Gemini API via GeminiClient
      const geminiClient = GeminiClient.getInstance();
      const result = await geminiClient.call({
        action: 'chat_aica', // Use chat_aica action which supports custom systemPrompt
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

      // Parse the response - expecting array of strings
      let suggestions: string[] = [];
      const responseText = typeof result.result === 'string' ? result.result :
        (result.result?.response || result.result?.text || JSON.stringify(result.result));

      if (Array.isArray(responseText)) {
        suggestions = responseText;
      } else if (typeof responseText === 'string') {
        // Try to parse as JSON array
        try {
          const parsed = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim());
          if (Array.isArray(parsed)) {
            suggestions = parsed;
          }
        } catch {
          // If parsing fails, split by newlines and clean up
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

  // Handle selecting a theme suggestion
  const handleSelectThemeSuggestion = (theme: string) => {
    actions.updateSetup({ theme });
    setThemeSuggestions([]); // Clear suggestions after selection
  };

  // Auto-generate theme suggestions when guest name is filled in auto mode
  useEffect(() => {
    if (
      setup.themeMode === 'auto' &&
      setup.guestName.trim() &&
      !isGeneratingThemes &&
      themeSuggestions.length === 0 &&
      !themeError &&
      !hasGeneratedRef.current
    ) {
      hasGeneratedRef.current = true;
      handleGenerateThemeSuggestions();
    }

    // Reset the ref when mode changes or suggestions are cleared
    if (setup.themeMode !== 'auto' || themeSuggestions.length > 0) {
      hasGeneratedRef.current = false;
    }
  }, [setup.themeMode, setup.guestName, isGeneratingThemes, themeSuggestions.length, themeError]);

  return (
    <div className="p-8 max-w-4xl mx-auto" role="main">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <User className="w-8 h-8 text-ceramic-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-ceramic-primary">Configuração do Episódio</h1>
        </div>
        <p className="text-ceramic-secondary">
          Defina as informações básicas do episódio e do convidado
        </p>
      </header>

      <div className="space-y-6">
        {/* Guest Type Selector */}
        <section
          className="bg-ceramic-surface rounded-lg shadow-sm p-6"
          aria-labelledby="guest-type-heading"
        >
          <h2
            id="guest-type-heading"
            className="block text-sm font-medium text-ceramic-primary mb-4"
          >
            Tipo de Convidado
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            role="radiogroup"
            aria-labelledby="guest-type-heading"
          >
            {/* Public Figure Option */}
            <button
              type="button"
              role="radio"
              aria-checked={setup.guestType === 'public_figure'}
              aria-label="Figura Pública - Buscar perfil automaticamente usando IA"
              onClick={() => handleGuestTypeSelect('public_figure')}
              className={`
                relative flex flex-col items-center p-6 rounded-lg border-2 transition-all
                focus:outline-none focus:ring-4 focus:ring-ceramic-primary/20
                ${setup.guestType === 'public_figure'
                  ? 'border-ceramic-primary bg-ceramic-accent shadow-md'
                  : 'border-ceramic-border hover:border-ceramic-primary/50 hover:bg-ceramic-surface-hover'
                }
              `}
            >
              <Users className={`w-12 h-12 mb-3 ${
                setup.guestType === 'public_figure' ? 'text-ceramic-primary' : 'text-ceramic-tertiary'
              }`} aria-hidden="true" />
              <h3 className="font-semibold text-ceramic-primary mb-1">Figura Pública</h3>
              <p className="text-sm text-ceramic-secondary text-center">
                Buscar perfil automaticamente usando IA
              </p>
              {setup.guestType === 'public_figure' && (
                <div className="absolute top-3 right-3" aria-hidden="true">
                  <div className="w-6 h-6 bg-ceramic-primary rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>

            {/* Common Person Option */}
            <button
              type="button"
              role="radio"
              aria-checked={setup.guestType === 'common_person'}
              aria-label="Pessoa Comum - Inserir informações manualmente"
              onClick={() => handleGuestTypeSelect('common_person')}
              className={`
                relative flex flex-col items-center p-6 rounded-lg border-2 transition-all
                focus:outline-none focus:ring-4 focus:ring-ceramic-primary/20
                ${setup.guestType === 'common_person'
                  ? 'border-ceramic-primary bg-ceramic-accent shadow-md'
                  : 'border-ceramic-border hover:border-ceramic-primary/50 hover:bg-ceramic-surface-hover'
                }
              `}
            >
              <UserCircle className={`w-12 h-12 mb-3 ${
                setup.guestType === 'common_person' ? 'text-ceramic-primary' : 'text-ceramic-tertiary'
              }`} aria-hidden="true" />
              <h3 className="font-semibold text-ceramic-primary mb-1">Pessoa Comum</h3>
              <p className="text-sm text-ceramic-secondary text-center">
                Inserir informações manualmente
              </p>
              {setup.guestType === 'common_person' && (
                <div className="absolute top-3 right-3" aria-hidden="true">
                  <div className="w-6 h-6 bg-ceramic-primary rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          </div>
        </section>

        {/* Guest Information - Only show after type is selected */}
        {setup.guestType && (
          <section
            className="bg-ceramic-surface rounded-lg shadow-sm p-6 space-y-6"
            aria-labelledby="guest-info-heading"
          >
            <h2
              id="guest-info-heading"
              className="text-lg font-semibold text-ceramic-primary flex items-center space-x-2"
            >
              <User className="w-5 h-5 text-ceramic-primary" aria-hidden="true" />
              <span>Informações do Convidado</span>
            </h2>

            {/* Guest Name */}
            <div>
              <label
                htmlFor="guest-name-input"
                className="block text-sm font-medium text-ceramic-primary mb-2"
              >
                Nome do Convidado <span className="text-ceramic-error" aria-label="obrigatório">*</span>
              </label>
              <input
                id="guest-name-input"
                type="text"
                value={setup.guestName}
                onChange={(e) => actions.updateSetup({ guestName: e.target.value })}
                placeholder="Digite o nome do convidado"
                required
                aria-required="true"
                className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
              />
            </div>

            {/* Public Figure: Reference/Title field */}
            {setup.guestType === 'public_figure' && (
              <>
                <div>
                  <label
                    htmlFor="guest-reference-input"
                    className="block text-sm font-medium text-ceramic-primary mb-2"
                  >
                    Cargo/Referência (Opcional)
                  </label>
                  <input
                    id="guest-reference-input"
                    type="text"
                    value={setup.guestReference}
                    onChange={(e) => actions.updateSetup({ guestReference: e.target.value })}
                    placeholder="Ex: CEO da Empresa X, Autor do Livro Y"
                    aria-describedby="guest-reference-help"
                    className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
                  />
                  <p
                    id="guest-reference-help"
                    className="mt-1 text-xs text-ceramic-tertiary"
                  >
                    Ajuda a IA a encontrar a pessoa certa durante a pesquisa
                  </p>
                </div>

                {/* Search Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleSearchProfile}
                    disabled={isSearching || !setup.guestName.trim()}
                    aria-label={isSearching ? 'Buscando perfil com IA' : 'Buscar perfil com IA'}
                    className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-ceramic-disabled disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-4 focus:ring-amber-500/20"
                  >
                    {isSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" role="status" aria-label="Carregando" />
                        <span>Buscando perfil...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" aria-hidden="true" />
                        <span>Buscar Perfil com IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Search Error */}
                {searchError && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="p-4 bg-ceramic-error-bg border border-ceramic-error/30 rounded-lg flex items-start space-x-3"
                  >
                    <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-ceramic-error">{searchError}</p>
                      <button
                        type="button"
                        onClick={handleSearchProfile}
                        className="mt-2 text-sm text-ceramic-error hover:text-ceramic-error/80 underline focus:outline-none focus:ring-2 focus:ring-ceramic-error rounded"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                )}

                {/* Profile Results */}
                {profileData && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-4 bg-ceramic-success-bg border border-ceramic-success/30 rounded-lg"
                  >
                    <div className="flex items-start space-x-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-ceramic-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-ceramic-primary mb-1">Perfil encontrado!</h3>
                        {profileData.full_name && (
                          <p className="text-sm text-ceramic-primary">
                            <strong>Nome completo:</strong> {profileData.full_name}
                          </p>
                        )}
                        {profileData.occupation && (
                          <p className="text-sm text-ceramic-primary">
                            <strong>Ocupação:</strong> {profileData.occupation}
                          </p>
                        )}
                        {profileData.known_for && (
                          <p className="text-sm text-ceramic-primary">
                            <strong>Conhecido por:</strong> {profileData.known_for}
                          </p>
                        )}
                        {profileData.bio_summary && (
                          <p className="text-sm text-ceramic-secondary mt-2">{profileData.bio_summary}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleConfirmProfile}
                        className="px-4 py-2 bg-ceramic-success text-white rounded-lg hover:bg-ceramic-success/90 transition-colors text-sm focus:outline-none focus:ring-4 focus:ring-ceramic-success/20"
                      >
                        Confirmar Perfil
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileData(null);
                          setSearchError(null);
                        }}
                        className="px-4 py-2 bg-ceramic-surface-hover text-ceramic-primary rounded-lg hover:bg-ceramic-disabled transition-colors text-sm focus:outline-none focus:ring-4 focus:ring-ceramic-primary/20"
                      >
                        Buscar Novamente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Common Person: Manual information entry */}
            {setup.guestType === 'common_person' && (
              <div className="space-y-4" role="group" aria-labelledby="manual-info-heading">
                <h3 id="manual-info-heading" className="sr-only">Informações manuais do convidado</h3>
                <div>
                  <label
                    htmlFor="guest-occupation-input"
                    className="block text-sm font-medium text-ceramic-primary mb-2"
                  >
                    Ocupação/Cargo
                  </label>
                  <input
                    id="guest-occupation-input"
                    type="text"
                    value={setup.guestReference}
                    onChange={(e) => actions.updateSetup({ guestReference: e.target.value })}
                    placeholder="Ex: Empreendedor, Professor, Atleta"
                    className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="guest-bio-input"
                    className="block text-sm font-medium text-ceramic-primary mb-2"
                  >
                    Notas/Bio Resumida (Opcional)
                  </label>
                  <textarea
                    id="guest-bio-input"
                    value={setup.guestBio || ''}
                    onChange={(e) => actions.updateSetup({ guestBio: e.target.value })}
                    placeholder="Informações relevantes sobre o convidado, experiências, projetos..."
                    rows={4}
                    className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent resize-none bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
                  />
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="group" aria-labelledby="contact-info-heading">
              <h3 id="contact-info-heading" className="sr-only">Informações de contato</h3>
              <div>
                <label
                  htmlFor="guest-phone-input"
                  className="block text-sm font-medium text-ceramic-primary mb-2"
                >
                  Telefone (Opcional)
                </label>
                <input
                  id="guest-phone-input"
                  type="tel"
                  value={setup.phone}
                  onChange={(e) => actions.updateSetup({ phone: e.target.value })}
                  placeholder="+55 11 99999-9999"
                  autoComplete="tel"
                  className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
                />
              </div>
              <div>
                <label
                  htmlFor="guest-email-input"
                  className="block text-sm font-medium text-ceramic-primary mb-2"
                >
                  Email (Opcional)
                </label>
                <input
                  id="guest-email-input"
                  type="email"
                  value={setup.email}
                  onChange={(e) => actions.updateSetup({ email: e.target.value })}
                  placeholder="email@exemplo.com"
                  autoComplete="email"
                  className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
                />
              </div>
            </div>
          </section>
        )}

        {/* Episode Theme */}
        {setup.guestType && (
          <section
            className="bg-ceramic-surface rounded-lg shadow-sm p-6 space-y-6"
            aria-labelledby="episode-theme-heading"
          >
            <h2
              id="episode-theme-heading"
              className="text-lg font-semibold text-ceramic-primary flex items-center space-x-2"
            >
              <Sparkles className="w-5 h-5 text-ceramic-primary" aria-hidden="true" />
              <span>Tema do Episódio</span>
            </h2>

            {/* Theme Mode Selector */}
            <div>
              <h3
                id="theme-mode-heading"
                className="block text-sm font-medium text-ceramic-primary mb-3"
              >
                Modo de Seleção
              </h3>
              <div
                className="flex space-x-4"
                role="radiogroup"
                aria-labelledby="theme-mode-heading"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={setup.themeMode === 'auto'}
                  onClick={handleThemeModeAuto}
                  disabled={isGeneratingThemes}
                  className={`
                    flex-1 px-4 py-3 rounded-lg border-2 transition-all
                    focus:outline-none focus:ring-4 focus:ring-ceramic-primary/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${setup.themeMode === 'auto'
                      ? 'border-ceramic-primary bg-ceramic-accent text-ceramic-primary'
                      : 'border-ceramic-border hover:border-ceramic-primary/50 text-ceramic-secondary'
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
                  aria-checked={setup.themeMode === 'manual'}
                  onClick={() => actions.updateSetup({ themeMode: 'manual' })}
                  className={`
                    flex-1 px-4 py-3 rounded-lg border-2 transition-all
                    focus:outline-none focus:ring-4 focus:ring-ceramic-primary/20
                    ${setup.themeMode === 'manual'
                      ? 'border-ceramic-primary bg-ceramic-accent text-ceramic-primary'
                      : 'border-ceramic-border hover:border-ceramic-primary/50 text-ceramic-secondary'
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
                className="block text-sm font-medium text-ceramic-primary mb-2"
              >
                Tema
              </label>
              <input
                id="episode-theme-input"
                type="text"
                value={setup.theme}
                onChange={(e) => actions.updateSetup({ theme: e.target.value })}
                placeholder={setup.themeMode === 'auto' ? 'Tema será sugerido pela IA' : 'Digite o tema do episódio'}
                required
                aria-required="true"
                className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
              />
            </div>

            {/* AI Theme Suggestions - Waiting for guest name */}
            {setup.themeMode === 'auto' && !setup.guestName.trim() && !isGeneratingThemes && themeSuggestions.length === 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-ceramic-primary mb-1">Preencha o nome do convidado</p>
                    <p className="text-sm text-ceramic-secondary">
                      Assim que você preencher o nome do convidado acima, a IA gerará automaticamente sugestões de temas relevantes para o episódio.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Theme Suggestions - Loading State (Skeleton) */}
            {setup.themeMode === 'auto' && isGeneratingThemes && (
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
            {setup.themeMode === 'auto' && themeError && !isGeneratingThemes && (
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
            {setup.themeMode === 'auto' && themeSuggestions.length > 0 && !isGeneratingThemes && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ceramic-primary flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-ceramic-info" aria-hidden="true" />
                    <span>Selecione um tema sugerido pela IA:</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setThemeSuggestions([])}
                    className="text-xs text-ceramic-tertiary hover:text-ceramic-secondary underline focus:outline-none focus:ring-2 focus:ring-ceramic-primary rounded px-2 py-1"
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
                        <p className="flex-1 text-sm text-ceramic-primary group-hover:text-amber-600 transition-colors">
                          {suggestion}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Scheduling */}
        {setup.guestType && (
          <section
            className="bg-ceramic-surface rounded-lg shadow-sm p-6 space-y-6"
            aria-labelledby="scheduling-heading"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2
                  id="scheduling-heading"
                  className="text-lg font-semibold text-ceramic-primary flex items-center space-x-2"
                >
                  <Calendar className="w-5 h-5 text-ceramic-primary" aria-hidden="true" />
                  <span>Agendamento</span>
                </h2>
                <p className="text-sm text-ceramic-secondary mt-1">
                  Agende quando será gravado o episódio (opcional)
                </p>
              </div>
            </div>

            {/* Date and Time - Highlighted */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="scheduled-date-input"
                    className="block text-sm font-semibold text-ceramic-primary mb-2 flex items-center space-x-2"
                  >
                    <Calendar className="w-4 h-4 text-orange-600" aria-hidden="true" />
                    <span>Data da Gravação</span>
                  </label>
                  <input
                    id="scheduled-date-input"
                    type="date"
                    value={setup.scheduledDate}
                    onChange={(e) => actions.updateSetup({ scheduledDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-ceramic-base transition-all text-ceramic-primary"
                  />
                  {!setup.scheduledDate && (
                    <p className="text-xs text-ceramic-tertiary mt-1">Selecione a data</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="scheduled-time-input"
                    className="block text-sm font-semibold text-ceramic-primary mb-2 flex items-center space-x-2"
                  >
                    <Clock className="w-4 h-4 text-orange-600" aria-hidden="true" />
                    <span>Horário</span>
                  </label>
                  <input
                    id="scheduled-time-input"
                    type="time"
                    value={setup.scheduledTime}
                    onChange={(e) => actions.updateSetup({ scheduledTime: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-ceramic-base transition-all text-ceramic-primary"
                  />
                  {!setup.scheduledTime && (
                    <p className="text-xs text-ceramic-tertiary mt-1">Defina o horário</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location and Season - Secondary Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="location-input"
                  className="block text-sm font-medium text-ceramic-primary mb-2 flex items-center space-x-2"
                >
                  <MapPin className="w-4 h-4 text-ceramic-tertiary" aria-hidden="true" />
                  <span>Local da Gravação</span>
                </label>
                <input
                  id="location-input"
                  type="text"
                  value={setup.location}
                  onChange={(e) => actions.updateSetup({ location: e.target.value })}
                  placeholder="Ex: Estúdio A, Remoto (Zoom), Casa do convidado"
                  className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent transition-all hover:border-ceramic-primary/50 bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
                />
              </div>
              <div>
                <label
                  htmlFor="season-input"
                  className="block text-sm font-medium text-ceramic-primary mb-2"
                >
                  Temporada / Número do Episódio
                </label>
                <input
                  id="season-input"
                  type="text"
                  value={setup.season}
                  onChange={(e) => actions.updateSetup({ season: e.target.value })}
                  placeholder="Ex: T1 E05, Temporada 1"
                  className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-primary focus:border-transparent transition-all hover:border-ceramic-primary/50 bg-ceramic-base text-ceramic-primary placeholder:text-ceramic-tertiary"
                />
              </div>
            </div>

            {/* Visual Summary when scheduled */}
            {(setup.scheduledDate || setup.scheduledTime || setup.location) && (
              <div
                className="p-3 bg-ceramic-surface-hover rounded-lg border border-ceramic-border"
                role="status"
                aria-label="Resumo do agendamento"
              >
                <p className="text-xs font-medium text-ceramic-tertiary mb-1">RESUMO</p>
                <div className="flex flex-wrap gap-2">
                  {setup.scheduledDate && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-ceramic-base border border-ceramic-border rounded text-xs text-ceramic-primary">
                      <Calendar className="w-3 h-3" aria-hidden="true" />
                      <span>{new Date(setup.scheduledDate + 'T00:00').toLocaleDateString('pt-BR')}</span>
                    </span>
                  )}
                  {setup.scheduledTime && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-ceramic-base border border-ceramic-border rounded text-xs text-ceramic-primary">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      <span>{setup.scheduledTime}</span>
                    </span>
                  )}
                  {setup.location && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-ceramic-base border border-ceramic-border rounded text-xs text-ceramic-primary">
                      <MapPin className="w-3 h-3" aria-hidden="true" />
                      <span>{setup.location}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Action Buttons */}
        {setup.guestType && (
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => actions.setStage('research')}
              disabled={!setup.guestName}
              aria-label={!setup.guestName ? 'Preencha o nome do convidado para continuar' : 'Ir para próxima etapa: Pesquisa'}
              className="px-6 py-3 bg-ceramic-primary text-white rounded-lg hover:bg-ceramic-primary-hover disabled:bg-ceramic-cool disabled:text-ceramic-text-secondary disabled:cursor-not-allowed disabled:border disabled:border-ceramic-border transition-colors flex items-center space-x-2 shadow-sm focus:outline-none focus:ring-4 focus:ring-ceramic-primary/20"
            >
              <span>Próximo: Pesquisa</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
