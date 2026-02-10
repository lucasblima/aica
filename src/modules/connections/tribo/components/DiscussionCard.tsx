import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Clock } from 'lucide-react';
import type { Discussion } from '../types';

interface DiscussionCardProps {
  discussion: Discussion;
  onClick?: () => void;
}

const categoryColors: Record<string, string> = {
  announcement: 'bg-ceramic-info/10 text-ceramic-info border-ceramic-info/30',
  question: 'bg-ceramic-accent/10 text-ceramic-accent border-ceramic-accent/30',
  decision: 'bg-ceramic-warning/10 text-ceramic-warning border-ceramic-warning/30',
  general: 'bg-ceramic-success/10 text-ceramic-success border-ceramic-success/20',
};

const categoryLabels: Record<string, string> = {
  announcement: 'Anúncio',
  question: 'Pergunta',
  decision: 'Decisão',
  general: 'Geral',
};

export const DiscussionCard: React.FC<DiscussionCardProps> = ({
  discussion,
  onClick,
}) => {
  const categoryColor = categoryColors[discussion.category] || categoryColors.general;
  const categoryLabel = categoryLabels[discussion.category] || 'Geral';

  const lastActivity = discussion.lastReplyAt || discussion.createdAt;
  const timeAgo = formatDistanceToNow(new Date(lastActivity), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      onClick={onClick}
      className="ceramic-card p-5 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all duration-200 border-2 border-ceramic-success/15 hover:border-ceramic-success/30 hover:shadow-lg"
    >
      {/* Header: Author & Category */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {discussion.author?.avatarUrl ? (
            <img
              src={discussion.author.avatarUrl}
              alt={discussion.author.displayName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-ceramic-success/15"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ceramic-success to-ceramic-success/80 flex items-center justify-center ring-2 ring-ceramic-success/15">
              <span className="text-white text-xs font-bold">
                {discussion.author?.displayName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <span className="text-sm font-medium text-ceramic-text-primary">
            {discussion.author?.displayName || 'Anônimo'}
          </span>
        </div>

        {/* Category Badge */}
        <div className={`ceramic-inset px-3 py-1 rounded-full text-xs font-bold border ${categoryColor}`}>
          {categoryLabel}
        </div>
      </div>

      {/* Discussion Title */}
      <h3 className="text-etched text-base font-bold text-ceramic-text-primary mb-3 line-clamp-2 leading-snug">
        {discussion.title}
      </h3>

      {/* Footer: Reply Count & Last Activity */}
      <div className="flex items-center justify-between text-xs text-ceramic-text-secondary">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-ceramic-success" />
          <span className="font-medium text-ceramic-success">
            {discussion.replyCount} {discussion.replyCount === 1 ? 'resposta' : 'respostas'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-ceramic-text-secondary" />
          <span>{timeAgo}</span>
        </div>
      </div>
    </div>
  );
};
