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

import React, { useState, useCallback } from 'react';
import { usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import { User, Users, UserCircle, Search, CheckCircle, AlertCircle, Mic, MicOff } from 'lucide-react';
// Calendar, Clock, MapPin, Sparkles moved to ThemeSelector and SchedulingSection sub-components
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { searchGuestProfile } from '@/services/podcastProductionService';
import { findOrCreateContact } from '@/services/platformContactService';
import { createNamespacedLogger } from '@/lib/logger';
import ThemeSelector from './ThemeSelector';
import SchedulingSection from './SchedulingSection';

const log = createNamespacedLogger('SetupStage');

export default function SetupStage() {
  const { state, actions } = usePodcastWorkspace();
  const { setup } = state;
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);

  // Voice input hooks
  const voiceName = useSpeechRecognition({
    onResult: (text) => actions.updateSetup({ guestName: (setup.guestName + ' ' + text).trim() }),
  });
  const voiceBio = useSpeechRecognition({
    onResult: (text) => actions.updateSetup({ guestBio: ((setup.guestBio || '') + ' ' + text).trim() }),
  });
  const voiceTheme = useSpeechRecognition({
    onResult: (text) => actions.updateSetup({ theme: (setup.theme + ' ' + text).trim() }),
  });

  // Sync guest to platform_contacts (find or create)
  const syncGuestContact = useCallback(async () => {
    if (!setup.guestName.trim()) return;

    try {
      const { data, error } = await findOrCreateContact(
        setup.guestName.trim(),
        setup.email?.trim() || null,
        setup.phone?.trim() || null,
        'studio',
        {
          guestType: setup.guestType,
          guestReference: setup.guestReference || undefined,
        }
      );

      if (error) {
        log.error('Failed to sync guest contact:', error);
        return;
      }

      if (data?.id && data.id !== setup.guestContactId) {
        actions.updateSetup({ guestContactId: data.id });
        log.debug('Guest synced to platform_contacts:', data.id);
      }
    } catch (err) {
      log.error('Error syncing guest contact:', err);
    }
  }, [setup.guestName, setup.email, setup.phone, setup.guestType, setup.guestReference, setup.guestContactId, actions]);

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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto" role="main">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <User className="w-6 h-6 sm:w-8 sm:h-8 text-ceramic-text-primary" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-ceramic-text-primary">Configuração do Episódio</h1>
        </div>
        <p className="text-sm sm:text-base text-ceramic-secondary">
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
            className="block text-sm font-medium text-ceramic-text-primary mb-4"
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
                focus:outline-none focus:ring-4 focus:ring-ceramic-accent/20
                ${setup.guestType === 'public_figure'
                  ? 'border-ceramic-accent bg-ceramic-warm shadow-md'
                  : 'border-ceramic-border hover:border-ceramic-accent/50 hover:bg-ceramic-surface-hover'
                }
              `}
            >
              <Users className={`w-12 h-12 mb-3 ${
                setup.guestType === 'public_figure' ? 'text-ceramic-accent' : 'text-ceramic-tertiary'
              }`} aria-hidden="true" />
              <h3 className="font-semibold text-ceramic-text-primary mb-1">Figura Pública</h3>
              <p className="text-sm text-ceramic-secondary text-center">
                Buscar perfil automaticamente usando IA
              </p>
              {setup.guestType === 'public_figure' && (
                <div className="absolute top-3 right-3" aria-hidden="true">
                  <div className="w-6 h-6 bg-ceramic-accent rounded-full flex items-center justify-center">
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
                focus:outline-none focus:ring-4 focus:ring-ceramic-accent/20
                ${setup.guestType === 'common_person'
                  ? 'border-ceramic-accent bg-ceramic-warm shadow-md'
                  : 'border-ceramic-border hover:border-ceramic-accent/50 hover:bg-ceramic-surface-hover'
                }
              `}
            >
              <UserCircle className={`w-12 h-12 mb-3 ${
                setup.guestType === 'common_person' ? 'text-ceramic-accent' : 'text-ceramic-tertiary'
              }`} aria-hidden="true" />
              <h3 className="font-semibold text-ceramic-text-primary mb-1">Pessoa Comum</h3>
              <p className="text-sm text-ceramic-secondary text-center">
                Inserir informações manualmente
              </p>
              {setup.guestType === 'common_person' && (
                <div className="absolute top-3 right-3" aria-hidden="true">
                  <div className="w-6 h-6 bg-ceramic-accent rounded-full flex items-center justify-center">
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
              className="text-lg font-semibold text-ceramic-text-primary flex items-center space-x-2"
            >
              <User className="w-5 h-5 text-ceramic-text-primary" aria-hidden="true" />
              <span>Informações do Convidado</span>
            </h2>

            {/* Guest Name */}
            <div>
              <label
                htmlFor="guest-name-input"
                className="block text-sm font-medium text-ceramic-text-primary mb-2"
              >
                Nome do Convidado <span className="text-ceramic-error" aria-label="obrigatório">*</span>
              </label>
              <div className="relative">
                <input
                  id="guest-name-input"
                  type="text"
                  value={setup.guestName}
                  onChange={(e) => actions.updateSetup({ guestName: e.target.value })}
                  placeholder="Digite o nome do convidado"
                  required
                  aria-required="true"
                  className="w-full px-4 py-2 pr-12 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
                />
                {voiceName.isSupported && (
                  <button
                    type="button"
                    onClick={voiceName.toggle}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                      voiceName.isListening
                        ? 'text-ceramic-error animate-pulse'
                        : 'text-ceramic-text-secondary hover:text-ceramic-accent'
                    }`}
                    aria-label={voiceName.isListening ? 'Parar gravação de voz' : 'Ditar nome por voz'}
                  >
                    {voiceName.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Public Figure: Reference/Title field */}
            {setup.guestType === 'public_figure' && (
              <>
                <div>
                  <label
                    htmlFor="guest-reference-input"
                    className="block text-sm font-medium text-ceramic-text-primary mb-2"
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
                    className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
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

                {/* Search Loading Indicator (#661) */}
                {isSearching && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-4 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm animate-pulse flex-shrink-0">
                        <Search className="w-5 h-5 text-white" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">Buscando perfil com IA...</p>
                        <p className="text-xs text-amber-600 mt-0.5">Analisando informacoes sobre {setup.guestName}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="h-1 flex-1 bg-amber-200 rounded-full overflow-hidden"
                        >
                          <div
                            className="h-full bg-amber-500 rounded-full animate-pulse"
                            style={{ animationDelay: `${i * 0.4}s` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Error */}
                {searchError && !isSearching && (
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
                        <h3 className="font-semibold text-ceramic-text-primary mb-1">
                          Perfil encontrado — é essa pessoa?
                        </h3>
                        {profileData.full_name && (
                          <p className="text-sm text-ceramic-text-primary">
                            <strong>Nome completo:</strong> {profileData.full_name}
                          </p>
                        )}
                        {profileData.occupation && (
                          <p className="text-sm text-ceramic-text-primary">
                            <strong>Ocupação:</strong> {profileData.occupation}
                          </p>
                        )}
                        {profileData.known_for && (
                          <p className="text-sm text-ceramic-text-primary">
                            <strong>Conhecido por:</strong> {profileData.known_for}
                          </p>
                        )}
                        {profileData.bio_summary && (
                          <p className="text-sm text-ceramic-text-secondary mt-2 italic">
                            &ldquo;{profileData.bio_summary}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-ceramic-text-secondary mb-3">
                      Confirme se este é o convidado que você procura, ou busque novamente com outro nome/referência.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleConfirmProfile}
                        className="px-4 py-2 bg-ceramic-success text-white rounded-lg hover:bg-ceramic-success/90 transition-colors text-sm focus:outline-none focus:ring-4 focus:ring-ceramic-success/20"
                      >
                        Sim, é essa pessoa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileData(null);
                          setSearchError(null);
                        }}
                        className="px-4 py-2 bg-ceramic-surface-hover text-ceramic-text-primary rounded-lg hover:bg-ceramic-disabled transition-colors text-sm focus:outline-none focus:ring-4 focus:ring-ceramic-accent/20"
                      >
                        Não, buscar novamente
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
                    className="block text-sm font-medium text-ceramic-text-primary mb-2"
                  >
                    Ocupação/Cargo
                  </label>
                  <input
                    id="guest-occupation-input"
                    type="text"
                    value={setup.guestReference}
                    onChange={(e) => actions.updateSetup({ guestReference: e.target.value })}
                    placeholder="Ex: Empreendedor, Professor, Atleta"
                    className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="guest-bio-input"
                      className="block text-sm font-medium text-ceramic-text-primary"
                    >
                      Notas/Bio Resumida (Opcional)
                    </label>
                    {voiceBio.isSupported && (
                      <button
                        type="button"
                        onClick={voiceBio.toggle}
                        className={`p-1.5 rounded-lg transition-colors ${
                          voiceBio.isListening
                            ? 'text-ceramic-error animate-pulse'
                            : 'text-ceramic-text-secondary hover:text-ceramic-accent'
                        }`}
                        aria-label={voiceBio.isListening ? 'Parar gravação de voz' : 'Ditar bio por voz'}
                      >
                        {voiceBio.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  <textarea
                    id="guest-bio-input"
                    value={setup.guestBio || ''}
                    onChange={(e) => actions.updateSetup({ guestBio: e.target.value })}
                    placeholder="Informações relevantes sobre o convidado, experiências, projetos..."
                    rows={4}
                    className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent resize-none bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
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
                  className="block text-sm font-medium text-ceramic-text-primary mb-2"
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
                  className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
                />
              </div>
              <div>
                <label
                  htmlFor="guest-email-input"
                  className="block text-sm font-medium text-ceramic-text-primary mb-2"
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
                  className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
                />
              </div>
            </div>
          </section>
        )}

        {/* Episode Theme */}
        {setup.guestType && (
          <ThemeSelector
            theme={setup.theme}
            themeMode={setup.themeMode}
            guestName={setup.guestName}
            guestType={setup.guestType}
            guestBio={setup.guestBio}
            guestReference={setup.guestReference}
            profileData={profileData}
            voiceTheme={voiceTheme}
            onThemeChange={(theme) => actions.updateSetup({ theme })}
            onThemeModeChange={(themeMode) => actions.updateSetup({ themeMode })}
          />
        )}

        {/* Scheduling */}
        {setup.guestType && (
          <SchedulingSection
            data={{
              scheduledDate: setup.scheduledDate,
              scheduledTime: setup.scheduledTime,
              location: setup.location,
              season: setup.season,
            }}
            onUpdate={(updates) => actions.updateSetup(updates)}
          />
        )}

        {/* Action Buttons */}
        {setup.guestType && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { syncGuestContact(); actions.setStage('research'); }}
              disabled={!setup.guestName}
              aria-label={!setup.guestName ? 'Preencha o nome do convidado para continuar' : 'Ir para próxima etapa: Pesquisa'}
              className="w-full sm:w-auto px-6 py-3 bg-ceramic-accent text-white rounded-lg hover:bg-ceramic-accent-dark disabled:bg-ceramic-cool disabled:text-ceramic-text-primary disabled:cursor-not-allowed disabled:border disabled:border-ceramic-border transition-colors flex items-center justify-center space-x-2 shadow-sm focus:outline-none focus:ring-4 focus:ring-ceramic-accent/20"
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
