/**
 * EmailDetailSheet — slide-over panel showing full email content.
 *
 * Opens from the right when an email row is clicked.
 * Fetches the full body via getMessageBody() on open.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Paperclip, Loader2, Sparkles, Calendar, User } from 'lucide-react';
import { getMessageBody } from '../services/emailIntelligenceService';
import { EmailCategoryBadge } from './EmailCategoryBadge';
import type { GmailMessage } from '@/services/gmailService';
import type { EmailCategory } from '../types';

interface EmailDetailSheetProps {
  email: GmailMessage | null;
  category?: EmailCategory;
  confidence?: number;
  onClose: () => void;
  onExtractTasks?: (messageId: string) => void;
}

function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseSender(sender: string): { name: string; email: string } {
  const match = sender.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: sender, email: '' };
}

export function EmailDetailSheet({
  email,
  category,
  confidence,
  onClose,
  onExtractTasks,
}: EmailDetailSheetProps) {
  const [body, setBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Fetch body when email changes
  useEffect(() => {
    if (!email) {
      setBody(null);
      return;
    }

    let cancelled = false;
    setLoadingBody(true);
    setBody(null);

    getMessageBody(email.id).then((result) => {
      if (!cancelled) {
        setBody(result);
        setLoadingBody(false);
      }
    });

    return () => { cancelled = true; };
  }, [email?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleExtractTasks = useCallback(async () => {
    if (!email || !onExtractTasks) return;
    setExtracting(true);
    await onExtractTasks(email.id);
    setExtracting(false);
  }, [email, onExtractTasks]);

  const senderInfo = email ? parseSender(email.sender || email.senderEmail || 'Desconhecido') : null;

  return (
    <AnimatePresence>
      {email && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-ceramic-base shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-ceramic-border/60">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-base font-semibold text-ceramic-text-primary leading-snug">
                  {email.subject || '(sem assunto)'}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {category && (
                    <EmailCategoryBadge category={category} confidence={confidence} size="md" />
                  )}
                  {email.hasAttachments && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-ceramic-text-secondary">
                      <Paperclip className="w-3 h-3" />
                      Anexos
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ceramic-cool/70 transition-colors flex-shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4 text-ceramic-text-secondary" />
              </button>
            </div>

            {/* Sender + date info */}
            <div className="px-5 py-3 border-b border-ceramic-border/40 space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-ceramic-text-primary">
                    {senderInfo?.name}
                  </span>
                  {senderInfo?.email && (
                    <span className="text-xs text-ceramic-text-secondary ml-1.5">
                      &lt;{senderInfo.email}&gt;
                    </span>
                  )}
                </div>
              </div>
              {email.to && (
                <div className="text-xs text-ceramic-text-secondary truncate">
                  Para: {email.to}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-ceramic-text-secondary">
                <Calendar className="w-3 h-3" />
                {formatFullDate(email.receivedAt || email.date)}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingBody ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-ceramic-cool rounded w-full" />
                  <div className="h-3 bg-ceramic-cool rounded w-5/6" />
                  <div className="h-3 bg-ceramic-cool rounded w-4/5" />
                  <div className="h-3 bg-ceramic-cool/60 rounded w-3/4" />
                  <div className="h-3 bg-ceramic-cool/60 rounded w-full" />
                  <div className="h-3 bg-ceramic-cool/40 rounded w-2/3" />
                </div>
              ) : body ? (
                <div
                  className="text-sm text-ceramic-text-primary leading-relaxed whitespace-pre-wrap break-words"
                >
                  {body}
                </div>
              ) : (
                <div className="text-sm text-ceramic-text-secondary italic">
                  Nao foi possivel carregar o conteudo do email.
                </div>
              )}
            </div>

            {/* Actions footer */}
            <div className="border-t border-ceramic-border/60 p-4">
              <button
                onClick={handleExtractTasks}
                disabled={extracting || !onExtractTasks}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-50 w-full justify-center"
              >
                {extracting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Extrair Tarefas
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
