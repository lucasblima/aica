import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TriboDashboard } from '../components/TriboDashboard';
import { RitualCard } from '../components/RitualCard';
import { GroupFundCard } from '../components/GroupFundCard';
import { useUpcomingOccurrences } from '../hooks/useRituals';
import { useActiveFunds } from '../hooks/useFunds';
import { useRecentDiscussions } from '../hooks/useDiscussions';

interface TriboHomeProps {
  spaceId: string;
  memberId?: string;
}

export const TriboHome: React.FC<TriboHomeProps> = ({ spaceId, memberId }) => {
  const navigate = useNavigate();

  const { data: upcomingOccurrences, isLoading: loadingOccurrences } =
    useUpcomingOccurrences(spaceId, 3);
  const { data: activeFunds, isLoading: loadingFunds } = useActiveFunds(spaceId);
  const { data: recentDiscussions, isLoading: loadingDiscussions } =
    useRecentDiscussions(spaceId, 5);

  const isLoading = loadingOccurrences || loadingFunds || loadingDiscussions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9B4D3A]/20 border-t-[#9B4D3A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ceramic-600">Carregando comunidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9B4D3A]/5 via-ceramic-base to-ceramic-50">
      {/* Header */}
      <div className="bg-ceramic-base border-b border-ceramic-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🔥</span>
            <h1 className="text-3xl font-bold text-ceramic-900">Tribo</h1>
          </div>
          <p className="text-ceramic-600">
            Sua fogueira digital - pertencimento e coordenação comunitária
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dashboard */}
            <TriboDashboard spaceId={spaceId} memberId={memberId} />

            {/* Upcoming Rituals */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-ceramic-900">
                  📅 Próximos Encontros
                </h2>
                <button
                  onClick={() => navigate(`/connections/tribo/${spaceId}/rituals`)}
                  className="text-[#9B4D3A] hover:text-[#9B4D3A]/80 font-medium text-sm"
                >
                  Ver todos →
                </button>
              </div>

              {upcomingOccurrences && upcomingOccurrences.length > 0 ? (
                <div className="space-y-4">
                  {upcomingOccurrences.map((occurrence) => (
                    <RitualCard
                      key={occurrence.id}
                      occurrence={occurrence}
                      memberId={memberId}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-ceramic-base rounded-2xl border-2 border-dashed border-ceramic-border p-12 text-center">
                  <span className="text-6xl mb-4 block">📅</span>
                  <h3 className="text-lg font-semibold text-ceramic-900 mb-2">
                    Nenhum encontro agendado
                  </h3>
                  <p className="text-ceramic-600 mb-4">
                    Crie rituais recorrentes para manter o grupo conectado
                  </p>
                  <button
                    onClick={() =>
                      navigate(`/connections/tribo/${spaceId}/rituals/new`)
                    }
                    className="px-6 py-3 bg-[#9B4D3A] text-white rounded-xl font-medium hover:bg-[#9B4D3A]/90 transition-colors"
                  >
                    Criar Ritual
                  </button>
                </div>
              )}
            </section>

            {/* Recent Discussions */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-ceramic-900">
                  💬 Discussões Recentes
                </h2>
                <button
                  onClick={() =>
                    navigate(`/connections/tribo/${spaceId}/discussions`)
                  }
                  className="text-[#9B4D3A] hover:text-[#9B4D3A]/80 font-medium text-sm"
                >
                  Ver todas →
                </button>
              </div>

              {recentDiscussions && recentDiscussions.length > 0 ? (
                <div className="bg-ceramic-base rounded-2xl border-2 border-ceramic-border divide-y divide-ceramic-100">
                  {recentDiscussions.map((discussion) => (
                    <button
                      key={discussion.id}
                      onClick={() =>
                        navigate(
                          `/connections/tribo/${spaceId}/discussions/${discussion.id}`
                        )
                      }
                      className="w-full p-4 text-left hover:bg-ceramic-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {discussion.isPinned && (
                              <span className="text-[#9B4D3A]">📌</span>
                            )}
                            <h3 className="font-medium text-ceramic-900 truncate">
                              {discussion.title}
                            </h3>
                          </div>
                          <p className="text-sm text-ceramic-600">
                            {discussion.replyCount}{' '}
                            {discussion.replyCount === 1
                              ? 'resposta'
                              : 'respostas'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-ceramic-base rounded-2xl border-2 border-dashed border-ceramic-border p-8 text-center">
                  <p className="text-ceramic-600">
                    Nenhuma discussão ainda. Inicie uma conversa!
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Funds */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-ceramic-900">
                  💰 Vaquinhas Ativas
                </h2>
                <button
                  onClick={() => navigate(`/connections/tribo/${spaceId}/funds`)}
                  className="text-[#9B4D3A] hover:text-[#9B4D3A]/80 font-medium text-sm"
                >
                  Ver todas →
                </button>
              </div>

              {activeFunds && activeFunds.length > 0 ? (
                <div className="space-y-4">
                  {activeFunds.slice(0, 2).map((fund) => (
                    <GroupFundCard key={fund.id} fund={fund} compact />
                  ))}
                </div>
              ) : (
                <div className="bg-ceramic-base rounded-xl border border-ceramic-border p-6 text-center">
                  <p className="text-sm text-ceramic-600">
                    Nenhuma vaquinha ativa
                  </p>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-xl font-semibold text-ceramic-900 mb-4">
                ⚡ Ações Rápidas
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    navigate(`/connections/tribo/${spaceId}/discussions/new`)
                  }
                  className="w-full p-3 bg-ceramic-base border-2 border-ceramic-border rounded-xl text-left hover:border-[#9B4D3A]/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <span className="font-medium text-ceramic-900">
                      Nova Discussão
                    </span>
                  </div>
                </button>

                <button
                  onClick={() =>
                    navigate(`/connections/tribo/${spaceId}/resources`)
                  }
                  className="w-full p-3 bg-ceramic-base border-2 border-ceramic-border rounded-xl text-left hover:border-[#9B4D3A]/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛠️</span>
                    <span className="font-medium text-ceramic-900">
                      Ver Recursos
                    </span>
                  </div>
                </button>

                <button
                  onClick={() =>
                    navigate(`/connections/tribo/${spaceId}/funds/new`)
                  }
                  className="w-full p-3 bg-ceramic-base border-2 border-ceramic-border rounded-xl text-left hover:border-[#9B4D3A]/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <span className="font-medium text-ceramic-900">
                      Nova Vaquinha
                    </span>
                  </div>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
