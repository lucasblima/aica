import React from 'react';
import { Mail, Clock, Send, FileText } from 'lucide-react';
import type { StudioNewsletter } from '../../types/studio';

// =============================================================================
// TYPES
// =============================================================================

interface NewsletterPreviewProps {
  newsletter: StudioNewsletter;
  /** Click handler for the card */
  onClick?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  scheduled: { label: 'Agendado', className: 'bg-ceramic-info/10 text-ceramic-info' },
  sending: { label: 'Enviando', className: 'bg-ceramic-warning/10 text-ceramic-warning' },
  sent: { label: 'Enviado', className: 'bg-ceramic-success/10 text-ceramic-success' },
  failed: { label: 'Falhou', className: 'bg-ceramic-error/10 text-ceramic-error' },
};

const TEMPLATE_CONFIG: Record<string, { label: string; className: string }> = {
  minimalista: { label: 'Minimalista', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  editorial: { label: 'Editorial', className: 'bg-violet-100 text-violet-700' },
  destaque: { label: 'Destaque', className: 'bg-amber-100 text-amber-700' },
  resumo: { label: 'Resumo', className: 'bg-ceramic-info/10 text-ceramic-info' },
  default: { label: 'Padrao', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function NewsletterPreview({ newsletter, onClick }: NewsletterPreviewProps) {
  const statusConfig = STATUS_CONFIG[newsletter.status] || STATUS_CONFIG.draft;
  const templateConfig = TEMPLATE_CONFIG[newsletter.template] || TEMPLATE_CONFIG.default;

  const contentPreview = newsletter.content
    ? newsletter.content.replace(/[#*_`\[\]]/g, '').substring(0, 200)
    : '';

  const formattedScheduledAt = newsletter.scheduledAt
    ? new Date(newsletter.scheduledAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const formattedSentAt = newsletter.sentAt
    ? new Date(newsletter.sentAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left ceramic-card rounded-2xl p-4 hover:shadow-lg transition-shadow group"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-violet-100 flex-shrink-0 group-hover:bg-violet-200 transition-colors">
          <Mail className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-ceramic-text-primary truncate">
            {newsletter.subject || 'Sem assunto'}
          </h4>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${templateConfig.className}`}>
              {templateConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content preview */}
      {contentPreview && (
        <div className="mt-3 flex items-start gap-2">
          <FileText className="w-3.5 h-3.5 text-ceramic-text-secondary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-ceramic-text-secondary line-clamp-3 leading-relaxed">
            {contentPreview}
            {newsletter.content && newsletter.content.length > 200 && '...'}
          </p>
        </div>
      )}

      {/* Footer: dates */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-ceramic-text-secondary">
        {formattedScheduledAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Agendado: {formattedScheduledAt}
          </span>
        )}
        {formattedSentAt && (
          <span className="flex items-center gap-1">
            <Send className="w-3 h-3" />
            Enviado: {formattedSentAt}
          </span>
        )}
      </div>
    </button>
  );
}
