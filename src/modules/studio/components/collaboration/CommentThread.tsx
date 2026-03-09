import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { StudioComment } from '../../types/studio';

interface CommentThreadProps {
  projectId: string;
  assetId?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ projectId, assetId }) => {
  const [comments, setComments] = useState<StudioComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

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

  const handleSend = async () => {
    if (!newComment.trim()) return;
    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('studio_comments')
        .insert({
          project_id: projectId,
          asset_id: assetId || null,
          user_id: user.id,
          content: newComment.trim(),
          resolved: false,
        });

      if (error) throw error;
      setNewComment('');
      loadComments();
    } catch (err) {
      console.error('Failed to send comment:', err);
    } finally {
      setSending(false);
    }
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
        <div className={`flex items-start gap-3 py-3 ${comment.resolved ? 'opacity-60' : ''}`}>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold flex-shrink-0">
            {getInitials(comment.id)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-ceramic-text-secondary">
                {comment.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              {comment.timestampSeconds != null && (
                <button className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold hover:bg-amber-200 transition-colors" aria-label={`Ir para ${formatTime(comment.timestampSeconds)}`}>
                  <Clock className="w-2.5 h-2.5" />
                  {formatTime(comment.timestampSeconds)}
                </button>
              )}
            </div>
            <p className={`text-sm text-ceramic-text-primary ${comment.resolved ? 'line-through' : ''}`}>
              {comment.content}
            </p>
          </div>

          {/* Resolve checkbox */}
          <button
            onClick={() => handleResolve(comment.id, !comment.resolved)}
            className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
              comment.resolved ? 'text-green-600' : 'text-ceramic-text-secondary hover:text-green-600'
            }`}
            title={comment.resolved ? 'Reabrir' : 'Resolver'}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Replies */}
        {replies.map(reply => renderComment(reply, true))}
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
        <div className="ceramic-card rounded-2xl px-4 divide-y divide-ceramic-border/50">
          {rootComments.map(c => renderComment(c))}
        </div>
      )}

      {/* New Comment Input */}
      <div className="flex items-end gap-2 pt-2">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Escreva um comentario..."
          rows={2}
          className="flex-1 rounded-xl bg-ceramic-cool border border-ceramic-border px-3 py-2 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !newComment.trim()}
          className="ceramic-card p-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
          aria-label="Enviar comentario"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-amber-500" />
          )}
        </button>
      </div>
    </div>
  );
};
