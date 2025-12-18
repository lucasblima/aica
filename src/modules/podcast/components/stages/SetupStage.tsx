/**
 * SetupStage - Episode setup and guest configuration
 * Allows selecting guest type and configuring episode details
 */

import React, { useState } from 'react';
import { usePodcastWorkspace } from '../../context/PodcastWorkspaceContext';
import { User, Users, UserCircle, Sparkles, Calendar, MapPin, Clock, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { searchGuestProfile } from '../../../../services/podcastProductionService';

export default function SetupStage() {
  const { state, actions } = usePodcastWorkspace();
  const { setup } = state;
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);

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
      console.error('Error searching profile:', error);
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
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <User className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">Configuração do Episódio</h1>
        </div>
        <p className="text-gray-600">
          Defina as informações básicas do episódio e do convidado
        </p>
      </div>

      <div className="space-y-6">
        {/* Guest Type Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Tipo de Convidado
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Public Figure Option */}
            <button
              onClick={() => handleGuestTypeSelect('public_figure')}
              className={`
                relative flex flex-col items-center p-6 rounded-lg border-2 transition-all
                ${setup.guestType === 'public_figure'
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                }
              `}
            >
              <Users className={`w-12 h-12 mb-3 ${
                setup.guestType === 'public_figure' ? 'text-orange-500' : 'text-gray-400'
              }`} />
              <h3 className="font-semibold text-gray-900 mb-1">Figura Pública</h3>
              <p className="text-sm text-gray-600 text-center">
                Buscar perfil automaticamente usando IA
              </p>
              {setup.guestType === 'public_figure' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>

            {/* Common Person Option */}
            <button
              onClick={() => handleGuestTypeSelect('common_person')}
              className={`
                relative flex flex-col items-center p-6 rounded-lg border-2 transition-all
                ${setup.guestType === 'common_person'
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                }
              `}
            >
              <UserCircle className={`w-12 h-12 mb-3 ${
                setup.guestType === 'common_person' ? 'text-orange-500' : 'text-gray-400'
              }`} />
              <h3 className="font-semibold text-gray-900 mb-1">Pessoa Comum</h3>
              <p className="text-sm text-gray-600 text-center">
                Inserir informações manualmente
              </p>
              {setup.guestType === 'common_person' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Guest Information - Only show after type is selected */}
        {setup.guestType && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <User className="w-5 h-5 text-orange-500" />
              <span>Informações do Convidado</span>
            </h3>

            {/* Guest Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Convidado *
              </label>
              <input
                type="text"
                value={setup.guestName}
                onChange={(e) => actions.updateSetup({ guestName: e.target.value })}
                placeholder="Digite o nome do convidado"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Public Figure: Reference/Title field */}
            {setup.guestType === 'public_figure' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo/Referência (Opcional)
                  </label>
                  <input
                    type="text"
                    value={setup.guestReference}
                    onChange={(e) => actions.updateSetup({ guestReference: e.target.value })}
                    placeholder="Ex: CEO da Empresa X, Autor do Livro Y"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ajuda a IA a encontrar a pessoa certa durante a pesquisa
                  </p>
                </div>

                {/* Search Button */}
                <div>
                  <button
                    onClick={handleSearchProfile}
                    disabled={isSearching || !setup.guestName.trim()}
                    className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {isSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        <span>Buscando perfil...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        <span>Buscar Perfil com IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Search Error */}
                {searchError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800">{searchError}</p>
                      <button
                        onClick={handleSearchProfile}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                )}

                {/* Profile Results */}
                {profileData && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">Perfil encontrado!</h4>
                        {profileData.full_name && (
                          <p className="text-sm text-gray-700">
                            <strong>Nome completo:</strong> {profileData.full_name}
                          </p>
                        )}
                        {profileData.occupation && (
                          <p className="text-sm text-gray-700">
                            <strong>Ocupação:</strong> {profileData.occupation}
                          </p>
                        )}
                        {profileData.known_for && (
                          <p className="text-sm text-gray-700">
                            <strong>Conhecido por:</strong> {profileData.known_for}
                          </p>
                        )}
                        {profileData.bio_summary && (
                          <p className="text-sm text-gray-600 mt-2">{profileData.bio_summary}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleConfirmProfile}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        Confirmar Perfil
                      </button>
                      <button
                        onClick={() => {
                          setProfileData(null);
                          setSearchError(null);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ocupação/Cargo
                  </label>
                  <input
                    type="text"
                    value={setup.guestReference}
                    onChange={(e) => actions.updateSetup({ guestReference: e.target.value })}
                    placeholder="Ex: Empreendedor, Professor, Atleta"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas/Bio Resumida (Opcional)
                  </label>
                  <textarea
                    value={setup.guestBio || ''}
                    onChange={(e) => actions.updateSetup({ guestBio: e.target.value })}
                    placeholder="Informações relevantes sobre o convidado, experiências, projetos..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone (Opcional)
                </label>
                <input
                  type="tel"
                  value={setup.phone}
                  onChange={(e) => actions.updateSetup({ phone: e.target.value })}
                  placeholder="+55 11 99999-9999"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Opcional)
                </label>
                <input
                  type="email"
                  value={setup.email}
                  onChange={(e) => actions.updateSetup({ email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Episode Theme */}
        {setup.guestType && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span>Tema do Episódio</span>
            </h3>

            {/* Theme Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Modo de Seleção
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => actions.updateSetup({ themeMode: 'auto' })}
                  className={`
                    flex-1 px-4 py-3 rounded-lg border-2 transition-all
                    ${setup.themeMode === 'auto'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-orange-300 text-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">Auto-sugerir com IA</span>
                  </div>
                  <p className="text-xs mt-1">
                    Gerar sugestões baseadas no convidado
                  </p>
                </button>
                <button
                  onClick={() => actions.updateSetup({ themeMode: 'manual' })}
                  className={`
                    flex-1 px-4 py-3 rounded-lg border-2 transition-all
                    ${setup.themeMode === 'manual'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-orange-300 text-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <User className="w-5 h-5" />
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tema *
              </label>
              <input
                type="text"
                value={setup.theme}
                onChange={(e) => actions.updateSetup({ theme: e.target.value })}
                placeholder={setup.themeMode === 'auto' ? 'Tema será sugerido pela IA' : 'Digite o tema do episódio'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* AI Theme Suggestions (when auto mode is active) */}
            {setup.themeMode === 'auto' && setup.guestName && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3 mb-3">
                  <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Sugestões de Tema</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Baseado nas informações do convidado, a IA pode sugerir temas relevantes para o episódio.
                    </p>
                    <button
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm inline-flex items-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Gerar Sugestões de Tema</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  💡 Dica: Preencha mais informações sobre o convidado para obter sugestões mais precisas
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scheduling */}
        {setup.guestType && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  <span>Agendamento</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Agende quando será gravado o episódio (opcional)
                </p>
              </div>
            </div>

            {/* Date and Time - Highlighted */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span>Data da Gravação</span>
                  </label>
                  <input
                    type="date"
                    value={setup.scheduledDate}
                    onChange={(e) => actions.updateSetup({ scheduledDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all"
                  />
                  {!setup.scheduledDate && (
                    <p className="text-xs text-gray-500 mt-1">Selecione a data</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span>Horário</span>
                  </label>
                  <input
                    type="time"
                    value={setup.scheduledTime}
                    onChange={(e) => actions.updateSetup({ scheduledTime: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all"
                  />
                  {!setup.scheduledTime && (
                    <p className="text-xs text-gray-500 mt-1">Defina o horário</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location and Season - Secondary Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>Local da Gravação</span>
                </label>
                <input
                  type="text"
                  value={setup.location}
                  onChange={(e) => actions.updateSetup({ location: e.target.value })}
                  placeholder="Ex: Estúdio A, Remoto (Zoom), Casa do convidado"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporada / Número do Episódio
                </label>
                <input
                  type="text"
                  value={setup.season}
                  onChange={(e) => actions.updateSetup({ season: e.target.value })}
                  placeholder="Ex: T1 E05, Temporada 1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all hover:border-gray-400"
                />
              </div>
            </div>

            {/* Visual Summary when scheduled */}
            {(setup.scheduledDate || setup.scheduledTime || setup.location) && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">RESUMO</p>
                <div className="flex flex-wrap gap-2">
                  {setup.scheduledDate && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(setup.scheduledDate + 'T00:00').toLocaleDateString('pt-BR')}</span>
                    </span>
                  )}
                  {setup.scheduledTime && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">
                      <Clock className="w-3 h-3" />
                      <span>{setup.scheduledTime}</span>
                    </span>
                  )}
                  {setup.location && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">
                      <MapPin className="w-3 h-3" />
                      <span>{setup.location}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {setup.guestType && (
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => actions.setStage('research')}
              disabled={!setup.guestName || !setup.theme}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 shadow-sm"
            >
              <span>Próximo: Pesquisa</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
