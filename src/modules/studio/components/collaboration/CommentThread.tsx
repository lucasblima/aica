import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, MessageSquare, Reply } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { StudioComment } from '../../types/studio';
import { CommentInput } from './CommentInput';

interface CommentThreadProps {
  projectId: string;
  assetId?: string;
}

/**
 * Format a Date as a relative time string in Portuguese.
 * Examples: "agora", "5min atras", "2h atras", "3d atras"
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'agora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min atras`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atras`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d atras`;
  // Fallback to localized date
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export const CommentThread: React.FC<CommentThreadProps> = ({ projectId, assetId }) => {
  const [comments, setComments] = useState<StudioComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('studio_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (assetId) query = query.eq('asset_id', assetId);

      const { data, error } = await query;
      if (error) throw error;

      setComments((data || []).map((c: any) => ({
        ...c,
        userId: c.user_id,
        projectId: c.project_id,
        assetId: c.asset_id,
        timestampSeconds: c.timestamp_seconds,
        parentCommentId: c.parent_comment_id,
        createdAt: new Date(c.created_at),
      })));
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, assetId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // Auto-scroll to latest comment when comments change
  useEffect(() => {
    if (scrollRef.current && comments.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSubmitComment = async (content: string, parentId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('studio_comments')
      .insert({
        project_id: projectId,
        asset_id: assetId || null,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parentId || null,
        resolved: false,
      });

    if (error) throw error;
    setReplyingTo(null);
    await loadComments();
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      const { error } = await supabase
        .from('studio_comments')
        .update({ resolved })
        .eq('id', commentId);

      if (error) throw error;
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved } : c));
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const getInitials = (userId: string) => userId.slice(0, 2).toUpperCase();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Separate root comments from replies
  const rootComments = comments.filter(c => !c.parentCommentId);
  const repliesMap = new Map<string, StudioComment[]>();
  for (const c of comments) {
    if (c.parentCommentId) {
      if (!repliesMap.has(c.parentCommentId)) repliesMap.set(c.parentCommentId, []);
      repliesMap.get(c.parentCommentId)!.push(c);
    }
  }

  const renderComment = (comment: StudioComment, isReply = false) => {
    const replies = repliesMap.get(comment.id) || [];
    return (
      <div key={comment.id} className={isReply ? 'ml-8 border-l-2 border-ceramic-border pl-4' : ''}>
        <div className={`flex items-start gap-3 py-3 ${comment.resolved ? 'opacity-50' : ''}`}>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold flex-shrink-0">
            {getInitials(comment.userId)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-ceramic-text-secondary">
                {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.timestampSeconds != null && (
                <button
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold hover:bg-amber-200 transition-colors"
                  aria-label={`Ir para ${formatTime(comment.timestampSeconds)}`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {formatTime(comment.timestampSeconds)}
                </button>
              )}
            </div>
            <p className={`text-sm text-ceramic-text-primary ${comment.resolved ? 'line-through text-ceramic-text-secondary' : ''}`}>
              {comment.content}
            </p>

            {/* Action buttons */}
            {!isReply && !comment.resolved && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-ceramic-text-secondary hover:text-amber-600 transition-colors"
              >
                <Reply className="w-3 h-3" />
                Responder
              </button>
            )}
          </div>

          {/* Resolve checkbox */}
          <button
            onClick={() => handleResolve(comment.id, !comment.resolved)}
            className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
              comment.resolved ? 'text-emerald-600' : 'text-ceramic-text-secondary hover:text-emerald-600'
            }`}
            title={comment.resolved ? 'Reabrir' : 'Resolver'}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Replies */}
        {replies.map(reply => renderComment(reply, true))}

        {/* Inline reply input */}
        <AnimatePresence>
          {replyingTo === comment.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-8 pl-4 border-l-2 border-amber-200 overflow-hidden"
            >
              <CommentInput
                onSubmit={(content) => handleSubmitComment(content, comment.id)}
                placeholder="Escrever resposta..."
                compact
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary">Comentarios</h3>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex items-start gap-3 py-3">
              <div className="w-8 h-8 rounded-full bg-ceramic-cool animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-ceramic-cool animate-pulse rounded w-1/4" />
                <div className="h-4 bg-ceramic-cool animate-pulse rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : rootComments.length === 0 ? (
        <div className="ceramic-inset rounded-2xl p-6 text-center">
          <MessageSquare className="w-8 h-8 text-ceramic-text-secondary/40 mx-auto mb-2" />
          <p className="text-sm text-ceramic-text-secondary">Nenhum comentario ainda</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="ceramic-card rounded-2xl px-4 divide-y divide-ceramic-border/50 max-h-[400px] overflow-y-auto"
        >
          {rootComments.map(c => renderComment(c))}
        </div>
      )}

      {/* New Comment Input */}
      <CommentInput
        onSubmit={(content) => handleSubmitComment(content)}
        placeholder="Adicionar comentario..."
      />
    </div>
  );
};
