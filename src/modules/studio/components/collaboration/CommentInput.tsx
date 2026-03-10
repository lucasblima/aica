import React, { useState, useRef, useCallback } from 'react';
import { Send, Loader2, Clock } from 'lucide-react';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('CommentInput');

interface CommentInputProps {
  /** Called when the user submits a comment. May throw on error. */
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  /** Parent comment ID for replies */
  parentId?: string;
  /** Optional timestamp in seconds to link the comment to a media position */
  timestampSeconds?: number;
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Compact mode for inline reply inputs */
  compact?: boolean;
}

/**
 * Format seconds into mm:ss display string.
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  parentId,
  timestampSeconds,
  placeholder = 'Adicionar comentario...',
  compact = false,
}) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || sending) return;

    try {
      setSending(true);
      setError(null);
      await onSubmit(content.trim(), parentId);
      setContent('');
    } catch (err) {
      log.error('Failed to submit comment:', err);
      setError('Falha ao enviar comentario. Tente novamente.');
    } finally {
      setSending(false);
    }
  }, [content, sending, onSubmit, parentId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        {/* Timestamp badge */}
        {timestampSeconds != null && (
          <div className="flex-shrink-0 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold">
              <Clock className="w-2.5 h-2.5" />
              em {formatTimestamp(timestampSeconds)}
            </span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={compact ? 1 : 2}
          className={`flex-1 rounded-xl bg-ceramic-cool border border-ceramic-border px-3 py-2 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
            compact ? 'my-2' : ''
          }`}
        />

        <button
          onClick={handleSubmit}
          disabled={sending || !content.trim()}
          className="ceramic-card p-2.5 rounded-xl hover:scale-105 transition-transform disabled:opacity-50 flex-shrink-0"
          aria-label="Enviar comentario"
          title="Ctrl+Enter para enviar"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-amber-500" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-ceramic-error px-1">{error}</p>
      )}

      {!compact && (
        <p className="text-[10px] text-ceramic-text-secondary px-1">
          Ctrl+Enter para enviar
        </p>
      )}
    </div>
  );
};
