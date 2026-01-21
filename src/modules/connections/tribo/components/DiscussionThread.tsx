import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Discussion, DiscussionReply } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('DiscussionThread');

interface DiscussionThreadProps {
  discussion: Discussion;
  replies: DiscussionReply[];
  currentUserId?: string;
  onReply?: (content: string, parentId?: string) => Promise<void>;
  onReact?: (replyId: string, emoji: string) => Promise<void>;
  onPin?: () => Promise<void>;
  onResolve?: () => Promise<void>;
  canModerate?: boolean;
}

export const DiscussionThread: React.FC<DiscussionThreadProps> = ({
  discussion,
  replies,
  currentUserId,
  onReply,
  onReact,
  onPin,
  onResolve,
  canModerate = false,
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryEmojis = {
    announcement: '📢',
    question: '❓',
    decision: '🎯',
    general: '💬',
  };

  const categoryColors = {
    announcement: 'bg-blue-50 text-blue-700 border-blue-200',
    question: 'bg-purple-50 text-purple-700 border-purple-200',
    decision: 'bg-green-50 text-green-700 border-green-200',
    general: 'bg-ceramic-50 text-ceramic-700 border-ceramic-200',
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !onReply) return;

    setIsSubmitting(true);
    try {
      await onReply(replyContent.trim(), replyingTo || undefined);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      log.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReact = async (replyId: string, emoji: string) => {
    if (!onReact) return;
    try {
      await onReact(replyId, emoji);
    } catch (error) {
      log.error('Error adding reaction:', error);
    }
  };

  // Build threaded replies structure
  const threadedReplies = replies.reduce((acc, reply) => {
    if (!reply.parentReplyId) {
      acc.push({ ...reply, children: [] });
    }
    return acc;
  }, [] as Array<DiscussionReply & { children: DiscussionReply[] }>);

  // Add children to parent replies
  replies.forEach((reply) => {
    if (reply.parentReplyId) {
      const parent = threadedReplies.find((r) => r.id === reply.parentReplyId);
      if (parent && parent.children) {
        parent.children.push(reply);
      }
    }
  });

  const renderReply = (
    reply: DiscussionReply & { children?: DiscussionReply[] },
    depth: number = 0
  ) => {
    const isAuthor = reply.authorId === currentUserId;
    const reactions = reply.reactions || {};
    const totalReactions = Object.values(reactions).reduce(
      (sum, users) => sum + users.length,
      0
    );

    return (
      <div
        key={reply.id}
        className={depth > 0 ? 'ml-8 mt-3' : 'mt-4'}
        style={{ maxWidth: depth > 2 ? 'none' : undefined }}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          {reply.author?.avatarUrl ? (
            <img
              src={reply.author.avatarUrl}
              alt={reply.author.displayName}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-[#9B4D3A]/20 rounded-full flex-shrink-0 flex items-center justify-center">
              <span className="text-[#9B4D3A] text-sm font-medium">
                {reply.author?.displayName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border border-ceramic-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-ceramic-900">
                  {reply.author?.displayName || 'Anônimo'}
                </span>
                {isAuthor && (
                  <span className="text-xs px-2 py-0.5 bg-[#9B4D3A]/10 text-[#9B4D3A] rounded-full">
                    Você
                  </span>
                )}
                <span className="text-xs text-ceramic-500">
                  {formatDistanceToNow(new Date(reply.createdAt), {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </span>
              </div>

              <p className="text-ceramic-900 whitespace-pre-wrap">
                {reply.content}
              </p>

              {/* Reactions */}
              {totalReactions > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(reactions).map(([emoji, users]) =>
                    users.length > 0 ? (
                      <button
                        key={emoji}
                        onClick={() => handleReact(reply.id, emoji)}
                        className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                          users.includes(currentUserId || '')
                            ? 'bg-[#9B4D3A]/20 text-[#9B4D3A]'
                            : 'bg-ceramic-100 text-ceramic-700 hover:bg-ceramic-200'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span>{users.length}</span>
                      </button>
                    ) : null
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-2 text-sm">
              <button
                onClick={() => setReplyingTo(reply.id)}
                className="text-ceramic-600 hover:text-[#9B4D3A] transition-colors"
              >
                Responder
              </button>
              <button
                onClick={() => handleReact(reply.id, '👍')}
                className="text-ceramic-600 hover:text-[#9B4D3A] transition-colors"
              >
                👍
              </button>
              <button
                onClick={() => handleReact(reply.id, '❤️')}
                className="text-ceramic-600 hover:text-[#9B4D3A] transition-colors"
              >
                ❤️
              </button>
            </div>

            {/* Nested Replies */}
            {reply.children && reply.children.length > 0 && (
              <div className="mt-2">
                {reply.children.map((child) => renderReply(child, depth + 1))}
              </div>
            )}

            {/* Reply Form */}
            {replyingTo === reply.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                  placeholder="Escreva sua resposta..."
                  className="flex-1 px-3 py-2 border border-ceramic-200 rounded-lg focus:ring-2 focus:ring-[#9B4D3A]/20 focus:border-[#9B4D3A] transition-colors"
                  autoFocus
                />
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || isSubmitting}
                  className="px-4 py-2 bg-[#9B4D3A] text-white rounded-lg font-medium hover:bg-[#9B4D3A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar
                </button>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="px-4 py-2 bg-ceramic-100 text-ceramic-700 rounded-lg hover:bg-ceramic-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-ceramic-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-ceramic-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                  categoryColors[discussion.category]
                }`}
              >
                {categoryEmojis[discussion.category]} {discussion.category}
              </span>
              {discussion.isPinned && (
                <span className="text-[#9B4D3A]">📌 Fixado</span>
              )}
              {discussion.isResolved && (
                <span className="text-green-600">✓ Resolvido</span>
              )}
            </div>

            <h2 className="text-2xl font-semibold text-ceramic-900 mb-2">
              {discussion.title}
            </h2>

            <div className="flex items-center gap-3 text-sm text-ceramic-600">
              {discussion.author && (
                <div className="flex items-center gap-2">
                  {discussion.author.avatarUrl && (
                    <img
                      src={discussion.author.avatarUrl}
                      alt={discussion.author.displayName}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span>{discussion.author.displayName}</span>
                </div>
              )}
              <span>•</span>
              <span>
                {format(new Date(discussion.createdAt), "d 'de' MMMM 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
              <span>•</span>
              <span>{discussion.replyCount} respostas</span>
            </div>
          </div>

          {/* Moderator Actions */}
          {canModerate && (
            <div className="flex gap-2">
              {onPin && (
                <button
                  onClick={onPin}
                  className="px-3 py-1 text-sm bg-ceramic-100 hover:bg-ceramic-200 rounded-lg transition-colors"
                >
                  {discussion.isPinned ? 'Desafixar' : 'Fixar'}
                </button>
              )}
              {onResolve && !discussion.isResolved && (
                <button
                  onClick={onResolve}
                  className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                >
                  Marcar como resolvido
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {discussion.content && (
          <p className="text-ceramic-900 whitespace-pre-wrap">
            {discussion.content}
          </p>
        )}
      </div>

      {/* Replies */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-ceramic-900 mb-4">
          Respostas ({discussion.replyCount})
        </h3>

        {threadedReplies.length === 0 && (
          <div className="text-center py-12 text-ceramic-500">
            Nenhuma resposta ainda. Seja o primeiro a comentar!
          </div>
        )}

        {threadedReplies.map((reply) => renderReply(reply))}

        {/* New Reply */}
        {onReply && !replyingTo && (
          <div className="mt-6 pt-6 border-t border-ceramic-100">
            <div className="flex gap-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Escreva sua resposta..."
                className="flex-1 px-4 py-3 border border-ceramic-200 rounded-lg focus:ring-2 focus:ring-[#9B4D3A]/20 focus:border-[#9B4D3A] transition-colors resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmitting}
                className="px-6 py-2 bg-[#9B4D3A] text-white rounded-lg font-medium hover:bg-[#9B4D3A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Responder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
