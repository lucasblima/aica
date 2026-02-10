import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDiscussions } from '../hooks/useDiscussions';
import { PollVoting } from '../components/PollVoting';
import type { DiscussionCategory } from '../types';

interface DiscussionsViewProps {
  memberId?: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

export const DiscussionsView: React.FC<DiscussionsViewProps> = ({
  memberId,
  currentUserId,
  isAdmin = false,
}) => {
  const { spaceId, discussionId } = useParams<{
    spaceId: string;
    discussionId?: string;
  }>();
  const navigate = useNavigate();

  const [categoryFilter, setCategoryFilter] = useState<DiscussionCategory | 'all'>('all');
  const [showPolls, setShowPolls] = useState(false);

  const { data: discussions, isLoading } = useDiscussions(spaceId || '');

  // Filter discussions
  const filteredDiscussions = discussions?.filter((discussion) => {
    const matchesCategory = categoryFilter === 'all' || discussion.category === categoryFilter;
    const matchesPoll = !showPolls || discussion.isPoll;
    return matchesCategory && matchesPoll;
  });

  // Separate pinned and regular discussions
  const pinnedDiscussions = filteredDiscussions?.filter((d) => d.isPinned) || [];
  const regularDiscussions = filteredDiscussions?.filter((d) => !d.isPinned) || [];

  const categoryIcons: Record<DiscussionCategory | 'all', string> = {
    all: '💬',
    announcement: '📢',
    question: '❓',
    decision: '🎯',
    general: '💭',
  };

  const categoryColors: Record<DiscussionCategory, string> = {
    announcement: 'bg-ceramic-info/10 text-ceramic-info border-ceramic-info/30',
    question: 'bg-ceramic-accent/10 text-ceramic-accent border-ceramic-accent/30',
    decision: 'bg-ceramic-success/10 text-ceramic-success border-ceramic-success/30',
    general: 'bg-ceramic-cool text-ceramic-text-primary border-ceramic-border',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9B4D3A]/20 border-t-[#9B4D3A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ceramic-600">Carregando discussões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9B4D3A]/5 via-ceramic-base to-ceramic-50">
      {/* Header */}
      <div className="bg-ceramic-base border-b border-ceramic-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💬</span>
              <h1 className="text-3xl font-bold text-ceramic-900">Discussões</h1>
            </div>
            <button
              onClick={() => navigate(`/connections/tribo/${spaceId}/discussions/new`)}
              className="px-6 py-3 bg-[#9B4D3A] text-white rounded-xl font-medium hover:bg-[#9B4D3A]/90 transition-colors shadow-lg"
            >
              Nova Discussão
            </button>
          </div>
          <p className="text-ceramic-600">
            Conversas, anúncios e decisões do grupo
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-ceramic-base border-b border-ceramic-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-[#9B4D3A] text-white'
                    : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
                }`}
              >
                {categoryIcons.all} Todas
              </button>
              <button
                onClick={() => setCategoryFilter('announcement')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  categoryFilter === 'announcement'
                    ? 'bg-ceramic-info text-white'
                    : 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-cool'
                }`}
              >
                {categoryIcons.announcement} Anúncios
              </button>
              <button
                onClick={() => setCategoryFilter('question')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  categoryFilter === 'question'
                    ? 'bg-ceramic-accent text-white'
                    : 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-cool'
                }`}
              >
                {categoryIcons.question} Perguntas
              </button>
              <button
                onClick={() => setCategoryFilter('decision')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  categoryFilter === 'decision'
                    ? 'bg-ceramic-success text-white'
                    : 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-cool'
                }`}
              >
                {categoryIcons.decision} Decisões
              </button>
            </div>

            <div className="border-l border-ceramic-200 pl-4 ml-auto">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPolls}
                  onChange={(e) => setShowPolls(e.target.checked)}
                  className="w-4 h-4 text-[#9B4D3A] border-ceramic-300 rounded focus:ring-[#9B4D3A]"
                />
                <span className="text-sm text-ceramic-700">Apenas enquetes</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Pinned Discussions */}
        {pinnedDiscussions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-ceramic-900 mb-4 flex items-center gap-2">
              📌 Fixadas
            </h2>
            <div className="space-y-3">
              {pinnedDiscussions.map((discussion) =>
                discussion.isPoll ? (
                  <PollVoting
                    key={discussion.id}
                    discussion={discussion}
                    currentMemberId={memberId}
                  />
                ) : (
                  <DiscussionCard
                    key={discussion.id}
                    discussion={discussion}
                    onClick={() =>
                      navigate(
                        `/connections/tribo/${spaceId}/discussions/${discussion.id}`
                      )
                    }
                    categoryColors={categoryColors}
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* Regular Discussions */}
        {regularDiscussions.length > 0 ? (
          <div className="space-y-3">
            {regularDiscussions.map((discussion) =>
              discussion.isPoll ? (
                <PollVoting
                  key={discussion.id}
                  discussion={discussion}
                  currentMemberId={memberId}
                />
              ) : (
                <DiscussionCard
                  key={discussion.id}
                  discussion={discussion}
                  onClick={() =>
                    navigate(
                      `/connections/tribo/${spaceId}/discussions/${discussion.id}`
                    )
                  }
                  categoryColors={categoryColors}
                />
              )
            )}
          </div>
        ) : (
          <div className="bg-ceramic-base rounded-2xl border-2 border-dashed border-ceramic-200 p-12 text-center">
            <span className="text-6xl mb-4 block">💬</span>
            <h2 className="text-2xl font-semibold text-ceramic-900 mb-2">
              Nenhuma discussão encontrada
            </h2>
            <p className="text-ceramic-600 mb-6">
              {categoryFilter !== 'all' || showPolls
                ? 'Ajuste os filtros para ver mais discussões'
                : 'Inicie a primeira conversa do grupo'}
            </p>
            {categoryFilter === 'all' && !showPolls && (
              <button
                onClick={() =>
                  navigate(`/connections/tribo/${spaceId}/discussions/new`)
                }
                className="px-6 py-3 bg-[#9B4D3A] text-white rounded-xl font-medium hover:bg-[#9B4D3A]/90 transition-colors"
              >
                Nova Discussão
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {discussions && discussions.length > 0 && (
        <div className="bg-ceramic-base border-t border-ceramic-100">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#9B4D3A]">
                  {discussions.length}
                </div>
                <div className="text-sm text-ceramic-600">Total de discussões</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ceramic-info">
                  {discussions.filter((d) => d.category === 'announcement').length}
                </div>
                <div className="text-sm text-ceramic-600">Anúncios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ceramic-success">
                  {discussions.filter((d) => d.isPoll).length}
                </div>
                <div className="text-sm text-ceramic-600">Enquetes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#9B4D3A]">
                  {discussions.reduce((sum, d) => sum + d.replyCount, 0)}
                </div>
                <div className="text-sm text-ceramic-600">Total de respostas</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for discussion cards
interface DiscussionCardProps {
  discussion: any;
  onClick: () => void;
  categoryColors: Record<DiscussionCategory, string>;
}

const DiscussionCard: React.FC<DiscussionCardProps> = ({
  discussion,
  onClick,
  categoryColors,
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-ceramic-base rounded-xl border-2 border-ceramic-200 p-4 text-left hover:border-[#9B4D3A]/40 hover:shadow-lg transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Author Avatar */}
        {discussion.author?.avatarUrl ? (
          <img
            src={discussion.author.avatarUrl}
            alt={discussion.author.displayName}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 bg-[#9B4D3A]/20 rounded-full flex-shrink-0 flex items-center justify-center">
            <span className="text-[#9B4D3A] font-medium">
              {discussion.author?.displayName?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${
                categoryColors[discussion.category]
              }`}
            >
              {discussion.category}
            </span>
            {discussion.isResolved && (
              <span className="text-ceramic-success text-sm">✓ Resolvido</span>
            )}
          </div>

          <h3 className="font-semibold text-ceramic-900 mb-1 line-clamp-1">
            {discussion.title}
          </h3>

          {discussion.content && (
            <p className="text-sm text-ceramic-600 line-clamp-2 mb-2">
              {discussion.content}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-ceramic-500">
            <span>{discussion.author?.displayName}</span>
            <span>•</span>
            <span>
              {format(new Date(discussion.createdAt), "d 'de' MMM", {
                locale: ptBR,
              })}
            </span>
            <span>•</span>
            <span>
              {discussion.replyCount}{' '}
              {discussion.replyCount === 1 ? 'resposta' : 'respostas'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
