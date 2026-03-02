/**
 * ProfilePage - User Profile Hub
 *
 * Contains:
 * - User profile settings
 * - Contextual trails (optional learning)
 * - Account management
 * - Preferences
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog, ChevronLeft, Lightbulb, MapPin } from 'lucide-react';
import TrailSelectionFlow from '@/modules/onboarding/components/TrailSelectionFlow';
import { useUserLocation } from '@/hooks/useUserLocation';
import { LocationConnectModal } from '@/modules/atlas/components';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ProfilePage');

interface ProfilePageProps {
  userId: string;
  userEmail?: string;
}

type ProfileTab = 'profile' | 'trails' | 'settings';

export function ProfilePage({ userId, userEmail }: ProfilePageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const { location, isLoading: locationLoading } = useUserLocation();
  const [showLocationModal, setShowLocationModal] = useState(false);

  const handleTrailsComplete = () => {
    // When user completes trails from profile, just stay on page
    log.debug(' User completed trails from optional section');
    setActiveTab('profile');
  };

  const handleTrailsError = (error: string) => {
    log.error(' Trail error:', error);
  };

  return (
    <div className="min-h-screen bg-[#F0EFE9]">
      {/* Header */}
      <div className="ceramic-card rounded-none p-6 border-b border-[#A39E91]/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-[#A39E91]/10 rounded-full transition-colors"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-6 h-6 text-[#5C554B]" />
            </button>
            <h1 className="text-3xl font-bold text-etched">Meu Perfil</h1>
          </div>

          <div className="text-sm text-[#948D82]">
            {userEmail && <p>{userEmail}</p>}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-3 mb-8 border-b border-[#A39E91]/10">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'profile'
                ? 'text-[#5C554B]'
                : 'text-[#948D82] hover:text-[#5C554B]'
            }`}
          >
            Perfil
            {activeTab === 'profile' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#6B9EFF] rounded-t"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trails')}
            className={`px-4 py-3 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === 'trails'
                ? 'text-[#5C554B]'
                : 'text-[#948D82] hover:text-[#5C554B]'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Trilhas de Aprendizado
            {activeTab === 'trails' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#6B9EFF] rounded-t"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'text-[#5C554B]'
                : 'text-[#948D82] hover:text-[#5C554B]'
            }`}
          >
            <Cog className="w-4 h-4" />
            Configurações
            {activeTab === 'settings' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#6B9EFF] rounded-t"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <div className="ceramic-card p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#5C554B] mb-2">
                  Email
                </label>
                <p className="text-[#948D82]">{userEmail}</p>
              </div>

              <div className="pt-4 border-t border-[#A39E91]/10">
                <p className="text-sm text-[#948D82]">
                  Mais opções de perfil em desenvolvimento...
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trails' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#5C554B] mb-2">
                Trilhas de Aprendizado Contextualizado
              </h2>
              <p className="text-[#948D82]">
                Explore trilhas opcionais para aprender mais sobre como usar melhor cada funcionalidade do app.
                Essas trilhas ajudam você a descobrir recursos e melhores práticas personalizadas.
              </p>
            </div>

            {/* Trail Selection Flow - Embedded in Profile */}
            <TrailSelectionFlow
              userId={userId}
              onComplete={handleTrailsComplete}
              onError={handleTrailsError}
              minTrailsRequired={0} // Make trails fully optional
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            {/* Location Settings */}
            <div className="ceramic-card p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-[#5C554B]">Localização</h3>
              </div>

              {locationLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-[#A39E91]/20 rounded w-32" />
                  <div className="h-3 bg-[#A39E91]/20 rounded w-48" />
                </div>
              ) : location ? (
                <div className="space-y-2">
                  <p className="text-sm text-[#5C554B]">
                    <span className="font-medium">Cidade:</span> {location.city || 'Não detectada'}
                  </p>
                  <p className="text-sm text-[#948D82]">
                    <span className="font-medium">Fonte:</span>{' '}
                    {location.source === 'browser_geolocation'
                      ? 'Geolocalização do navegador'
                      : location.source === 'ip_lookup'
                        ? 'Detectado por IP'
                        : location.source === 'manual'
                          ? 'Configuração manual'
                          : 'Não configurada'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#948D82]">
                  Localização não configurada. Configure para receber insights de clima.
                </p>
              )}

              <button
                onClick={() => setShowLocationModal(true)}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                {location ? 'Alterar localização' : 'Configurar localização'}
              </button>
            </div>

            {/* Placeholder for future settings */}
            <div className="ceramic-card p-8">
              <p className="text-sm text-[#948D82]">
                Mais configurações em desenvolvimento...
              </p>
            </div>

            {showLocationModal && (
              <LocationConnectModal onClose={() => setShowLocationModal(false)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
