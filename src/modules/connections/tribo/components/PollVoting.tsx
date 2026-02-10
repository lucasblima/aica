import React, { useMemo } from 'react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Discussion, PollOption } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('PollVoting');

interface PollVotingProps {
  discussion: Discussion;
  currentMemberId?: string;
  onVote?: (optionId: string) => Promise<void>;
}

export const PollVoting: React.FC<PollVotingProps> = ({
  discussion,
  currentMemberId,
  onVote,
}) => {
  const userVote = currentMemberId
    ? discussion.pollVotes[currentMemberId]
    : undefined;

  const hasDeadline = !!discussion.pollDeadline;
  const isExpired = hasDeadline && isPast(new Date(discussion.pollDeadline!));
  const canVote = !isExpired && currentMemberId && onVote;

  // Calculate vote stats
  const totalVotes = Object.keys(discussion.pollVotes).length;
  const votesByOption = useMemo(() => {
    return discussion.pollOptions.reduce((acc, option) => {
      acc[option.id] = Object.values(discussion.pollVotes).filter(
        (vote) => vote === option.id
      ).length;
      return acc;
    }, {} as Record<string, number>);
  }, [discussion.pollOptions, discussion.pollVotes]);

  // Find winning option(s)
  const maxVotes = Math.max(...Object.values(votesByOption), 0);
  const winningOptions = discussion.pollOptions.filter(
    (opt) => votesByOption[opt.id] === maxVotes && maxVotes > 0
  );

  const handleVote = async (optionId: string) => {
    if (!canVote) return;

    try {
      await onVote(optionId);
    } catch (error) {
      log.error('Error voting:', error);
    }
  };

  return (
    <div className="bg-ceramic-base rounded-2xl border-2 border-[#9B4D3A]/20 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-ceramic-100 bg-gradient-to-r from-[#9B4D3A]/5 to-transparent">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🗳️</span>
          <span className="px-3 py-1 bg-[#9B4D3A]/10 text-[#9B4D3A] text-xs font-medium rounded-full">
            Enquete
          </span>
          {isExpired && (
            <span className="px-3 py-1 bg-ceramic-500 text-white text-xs font-medium rounded-full">
              Encerrada
            </span>
          )}
        </div>

        <h2 className="text-2xl font-semibold text-ceramic-900 mb-2">
          {discussion.title}
        </h2>

        {discussion.content && (
          <p className="text-ceramic-700">{discussion.content}</p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-4 text-sm text-ceramic-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">{totalVotes}</span>
            <span>{totalVotes === 1 ? 'voto' : 'votos'}</span>
          </div>
          {hasDeadline && (
            <>
              <span>•</span>
              <div className="flex items-center gap-2">
                <span>⏰</span>
                <span>
                  {isExpired ? 'Encerrou em' : 'Encerra em'}{' '}
                  {format(
                    new Date(discussion.pollDeadline!),
                    "d 'de' MMMM 'às' HH:mm",
                    { locale: ptBR }
                  )}
                </span>
              </div>
            </>
          )}
        </div>

        {userVote && (
          <div className="mt-3 p-3 bg-ceramic-info/10 rounded-lg">
            <div className="flex items-center gap-2 text-ceramic-info text-sm">
              <span>✓</span>
              <span>Você já votou nesta enquete</span>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="p-6 space-y-3">
        {discussion.pollOptions.map((option) => {
          const votes = votesByOption[option.id] || 0;
          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          const isWinning = winningOptions.some((w) => w.id === option.id);
          const isUserVote = userVote === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!canVote || !!userVote}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isUserVote
                  ? 'bg-[#9B4D3A]/10 border-[#9B4D3A] shadow-lg'
                  : isWinning && totalVotes > 0
                  ? 'bg-ceramic-success/10 border-ceramic-success/30'
                  : 'bg-ceramic-base border-ceramic-border hover:border-[#9B4D3A]/40 hover:shadow-md'
              } ${
                !canVote || userVote ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  {/* Radio/Check */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isUserVote
                        ? 'border-[#9B4D3A] bg-[#9B4D3A]'
                        : 'border-ceramic-300'
                    }`}
                  >
                    {isUserVote && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>

                  {/* Option Text */}
                  <span
                    className={`font-medium ${
                      isUserVote ? 'text-[#9B4D3A]' : 'text-ceramic-900'
                    }`}
                  >
                    {option.text}
                  </span>

                  {isWinning && totalVotes > 0 && (
                    <span className="text-ceramic-success text-lg">👑</span>
                  )}
                </div>

                {/* Vote Count */}
                {totalVotes > 0 && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#9B4D3A]">
                      {percentage.toFixed(0)}%
                    </div>
                    <div className="text-xs text-ceramic-600">
                      {votes} {votes === 1 ? 'voto' : 'votos'}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {totalVotes > 0 && (
                <div className="relative h-2 bg-ceramic-100 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                      isUserVote
                        ? 'bg-[#9B4D3A]'
                        : isWinning
                        ? 'bg-ceramic-success'
                        : 'bg-ceramic-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Results Summary */}
      {totalVotes > 0 && isExpired && (
        <div className="p-6 border-t border-ceramic-100 bg-ceramic-50">
          <h3 className="text-sm font-medium text-ceramic-700 mb-3">
            Resultado Final
          </h3>
          {winningOptions.length === 1 ? (
            <div className="flex items-center gap-3 p-4 bg-ceramic-success/15 rounded-lg">
              <span className="text-2xl">🎉</span>
              <div>
                <div className="font-semibold text-ceramic-success">
                  Opção vencedora
                </div>
                <div className="text-ceramic-success">
                  "{winningOptions[0].text}" com {maxVotes}{' '}
                  {maxVotes === 1 ? 'voto' : 'votos'} (
                  {((maxVotes / totalVotes) * 100).toFixed(0)}%)
                </div>
              </div>
            </div>
          ) : winningOptions.length > 1 ? (
            <div className="flex items-center gap-3 p-4 bg-ceramic-warning/15 rounded-lg">
              <span className="text-2xl">🤝</span>
              <div>
                <div className="font-semibold text-ceramic-warning">Empate</div>
                <div className="text-ceramic-warning">
                  {winningOptions.length} opções empatadas com {maxVotes}{' '}
                  {maxVotes === 1 ? 'voto' : 'votos'}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Call to Action */}
      {canVote && !userVote && (
        <div className="p-6 border-t border-ceramic-100 bg-gradient-to-r from-[#9B4D3A]/5 to-transparent">
          <div className="flex items-center gap-3 text-sm text-ceramic-700">
            <span className="text-xl">👆</span>
            <span>
              Selecione uma opção acima para registrar seu voto
              {hasDeadline && !isExpired && (
                <span className="font-medium">
                  {' '}
                  até{' '}
                  {format(new Date(discussion.pollDeadline!), 'd/MM HH:mm', {
                    locale: ptBR,
                  })}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
