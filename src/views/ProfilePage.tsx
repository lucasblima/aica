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
import { Cog, ChevronLeft, Lightbulb } from 'lucide-react';
import TrailSelectionFlow from '@/modules/onboarding/components/TrailSelectionFlow';

interface ProfilePageProps {
  userId: string;
  userEmail?: string;
}

type ProfileTab = 'profile' | 'trails' | 'settings';

export function ProfilePage({ userId, userEmail }: ProfilePageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>('trails');

  const handleTrailsComplete = () => {
    // When user completes trails from profile, just stay on page
    console.log('[Profile] User completed trails from optional section');
    setActiveTab('profile');
  };

  const handleTrailsError = (error: string) => {
    console.error('[Profile] Trail error:', error);
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
          <div className="max-w-2xl">
            <div className="ceramic-card p-8">
              <p className="text-sm text-[#948D82]">
                Configurações de conta em desenvolvimento...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
