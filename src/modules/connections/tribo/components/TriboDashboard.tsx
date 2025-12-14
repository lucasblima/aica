import React from 'react';
import { useUpcomingOccurrences } from '../hooks/useRituals';
import { useActiveFunds } from '../hooks/useFunds';
import { useDiscussions } from '../hooks/useDiscussions';
import { useAvailableResources } from '../hooks/useResources';
import { RitualCard } from './RitualCard';
import { GroupFundCard } from './GroupFundCard';
import { SharedResourceCard } from './SharedResourceCard';
import { DiscussionCard } from './DiscussionCard';

interface TriboDashboardProps {
  spaceId: string;
}

export const TriboDashboard: React.FC<TriboDashboardProps> = ({ spaceId }) => {
  const { data: upcomingRituals = [], isLoading: ritualsLoading } =
    useUpcomingOccurrences(spaceId, 3);
  const { data: activeFunds = [], isLoading: fundsLoading } = useActiveFunds(spaceId);
  const { data: discussions = [], isLoading: discussionsLoading } =
    useDiscussions(spaceId);
  const { data: availableResources = [], isLoading: resourcesLoading } =
    useAvailableResources(spaceId);

  const recentDiscussions = discussions.slice(0, 5);
  const pinnedDiscussions = discussions.filter((d) => d.isPinned);
  const topFunds = activeFunds.slice(0, 3);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">👥</div>
        <h1 className="text-2xl font-bold text-ceramic-900">Fogueira da Tribo</h1>
        <p className="text-ceramic-600 mt-1">
          O lugar de encontro do grupo
        </p>
      </div>

      {/* Next Rituals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ceramic-900 flex items-center gap-2">
            <span>🔄</span>
            Próximos Rituais
          </h2>
          <button className="text-sm text-[#9B4D3A] hover:underline">
            Ver todos
          </button>
        </div>

        {ritualsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-ceramic-50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : upcomingRituals.length > 0 ? (
          <div className="space-y-3">
            {upcomingRituals.map((occurrence) => (
              <RitualCard key={occurrence.id} occurrence={occurrence} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-ceramic-50 rounded-2xl">
            <div className="text-4xl mb-2">🔄</div>
            <p className="text-ceramic-600">Nenhum ritual agendado</p>
            <button className="mt-3 text-sm text-[#9B4D3A] hover:underline">
              Criar primeiro ritual
            </button>
          </div>
        )}
      </section>

      {/* Active Funds */}
      {topFunds.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-ceramic-900 flex items-center gap-2">
              <span>💰</span>
              Vaquinhas Ativas
            </h2>
            <button className="text-sm text-[#9B4D3A] hover:underline">
              Ver todas
            </button>
          </div>

          <div className="space-y-3">
            {topFunds.map((fund) => (
              <GroupFundCard key={fund.id} fund={fund} />
            ))}
          </div>
        </section>
      )}

      {/* Pinned Discussions */}
      {pinnedDiscussions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-ceramic-900 flex items-center gap-2">
              <span>📌</span>
              Fixados
            </h2>
          </div>

          <div className="space-y-3">
            {pinnedDiscussions.map((discussion) => (
              <DiscussionCard key={discussion.id} discussion={discussion} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Discussions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ceramic-900 flex items-center gap-2">
            <span>💬</span>
            Conversas Recentes
          </h2>
          <button className="text-sm text-[#9B4D3A] hover:underline">
            Ver todas
          </button>
        </div>

        {discussionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-ceramic-50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : recentDiscussions.length > 0 ? (
          <div className="space-y-3">
            {recentDiscussions.map((discussion) => (
              <DiscussionCard key={discussion.id} discussion={discussion} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-ceramic-50 rounded-2xl">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-ceramic-600">Nenhuma conversa ainda</p>
            <button className="mt-3 text-sm text-[#9B4D3A] hover:underline">
              Iniciar conversa
            </button>
          </div>
        )}
      </section>

      {/* Available Resources */}
      {availableResources.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-ceramic-900 flex items-center gap-2">
              <span>📦</span>
              Recursos Disponíveis
            </h2>
            <button className="text-sm text-[#9B4D3A] hover:underline">
              Ver todos
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {availableResources.slice(0, 4).map((resource) => (
              <SharedResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="pt-4 border-t border-ceramic-200">
        <div className="grid grid-cols-2 gap-3">
          <button className="p-4 bg-gradient-to-br from-[#9B4D3A]/10 to-[#9B4D3A]/5 rounded-2xl text-left hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm font-medium text-ceramic-900">
              Criar Ritual
            </div>
          </button>

          <button className="p-4 bg-gradient-to-br from-[#9B4D3A]/10 to-[#9B4D3A]/5 rounded-2xl text-left hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium text-ceramic-900">
              Nova Vaquinha
            </div>
          </button>

          <button className="p-4 bg-gradient-to-br from-[#9B4D3A]/10 to-[#9B4D3A]/5 rounded-2xl text-left hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm font-medium text-ceramic-900">
              Iniciar Conversa
            </div>
          </button>

          <button className="p-4 bg-gradient-to-br from-[#9B4D3A]/10 to-[#9B4D3A]/5 rounded-2xl text-left hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">📦</div>
            <div className="text-sm font-medium text-ceramic-900">
              Cadastrar Recurso
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};
