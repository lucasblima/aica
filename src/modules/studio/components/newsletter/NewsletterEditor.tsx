import React, { useState, useCallback } from 'react';
import { Mail, Sparkles, Save, Send, Clock, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { StudioNewsletter } from '../../types/studio';

// =============================================================================
// TYPES
// =============================================================================

interface NewsletterEditorProps {
  /** Existing newsletter to edit (null for new) */
  newsletter?: StudioNewsletter | null;
  /** Project ID to associate with */
  projectId?: string;
  /** Episode ID for context */
  episodeId?: string;
  /** Callback on successful save */
  onSave?: (newsletter: StudioNewsletter) => void;
  /** Callback on cancel */
  onCancel?: () => void;
}

interface GeneratedData {
  subject: string;
  content: string;
  highlights: string[];
  callToAction: string;
}

type NewsletterTemplate = 'minimalista' | 'editorial' | 'destaque' | 'resumo';

const TEMPLATE_OPTIONS: { value: NewsletterTemplate; label: string; description: string }[] = [
  { value: 'minimalista', label: 'Minimalista', description: 'Limpo e direto ao ponto' },
  { value: 'editorial', label: 'Editorial', description: 'Estilo revista, mais elaborado' },
  { value: 'destaque', label: 'Destaque', description: 'Foco nos highlights e citações' },
  { value: 'resumo', label: 'Resumo', description: 'Resumo compacto do episódio' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  scheduled: { label: 'Agendado', className: 'bg-ceramic-info/10 text-ceramic-info' },
  sending: { label: 'Enviando', className: 'bg-ceramic-warning/10 text-ceramic-warning' },
  sent: { label: 'Enviado', className: 'bg-ceramic-success/10 text-ceramic-success' },
  failed: { label: 'Falhou', className: 'bg-ceramic-error/10 text-ceramic-error' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function NewsletterEditor({
  newsletter,
  projectId,
  episodeId,
  onSave,
  onCancel,
}: NewsletterEditorProps) {
  const [subject, setSubject] = useState(newsletter?.subject || '');
  const [content, setContent] = useState(newsletter?.content || '');
  const [template, setTemplate] = useState<NewsletterTemplate>(
    (newsletter?.template as NewsletterTemplate) || 'minimalista'
  );
  const [scheduledAt, setScheduledAt] = useState(
    newsletter?.scheduledAt
      ? new Date(newsletter.scheduledAt).toISOString().slice(0, 16)
      : ''
  );
  const [status, setStatus] = useState<StudioNewsletter['status']>(
    newsletter?.status || 'draft'
  );

  // AI generation state
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('profissional e engajador');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // =========================================================================
  // AI GENERATION
  // =========================================================================

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      setGenerateError('Informe um tópico para gerar a newsletter.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const { data, error } = await supabase.functions.invoke('studio-newsletter-generate', {
        body: {
          projectId: projectId || null,
          episodeId: episodeId || null,
          topic: topic.trim(),
          audience: audience.trim() || undefined,
          tone: tone.trim() || undefined,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar newsletter');

      const generated: GeneratedData = data.data;
      setSubject(generated.subject);
      setContent(generated.content);
    } catch (err: any) {
      setGenerateError(err.message || 'Erro inesperado ao gerar newsletter.');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, audience, tone, projectId, episodeId]);

  // =========================================================================
  // SAVE / UPSERT
  // =========================================================================

  const handleSave = useCallback(async () => {
    if (!subject.trim()) {
      setSaveError('O assunto e obrigatório.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const computedStatus = scheduledAt ? 'scheduled' : 'draft';

      const record: Record<string, unknown> = {
        user_id: user.id,
        subject: subject.trim(),
        content: content.trim(),
        template,
        status: computedStatus,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };

      if (projectId) record.project_id = projectId;

      let result;
      if (newsletter?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('studio_newsletters')
          .update(record)
          .eq('id', newsletter.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('studio_newsletters')
          .insert(record)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      setStatus(computedStatus);

      if (onSave && result) {
        onSave({
          id: result.id,
          userId: result.user_id,
          projectId: result.project_id,
          subject: result.subject,
          content: result.content,
          template: result.template,
          scheduledAt: result.scheduled_at ? new Date(result.scheduled_at) : undefined,
          sentAt: result.sent_at ? new Date(result.sent_at) : undefined,
          recipientsCount: result.recipients_count,
          openRate: result.open_rate,
          clickRate: result.click_rate,
          status: result.status,
          createdAt: new Date(result.created_at),
        });
      }
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar newsletter.');
    } finally {
      setIsSaving(false);
    }
  }, [subject, content, template, scheduledAt, projectId, newsletter, onSave]);

  // =========================================================================
  // RENDER
  // =========================================================================

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100">
            <Mail className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ceramic-text-primary">
              {newsletter?.id ? 'Editar Newsletter' : 'Nova Newsletter'}
            </h3>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* AI Generation Section */}
      <div className="ceramic-card rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-ceramic-text-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Gerar com IA
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
              Tópico *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Lancamento do episódio sobre IA generativa"
              className="w-full px-3 py-2 text-sm rounded-xl border border-ceramic-border bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
                Publico-alvo
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Ex: ouvintes de podcast"
                className="w-full px-3 py-2 text-sm rounded-xl border border-ceramic-border bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ceramic-text-secondary mb-1">
                Tom
              </label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Ex: profissional e engajador"
                className="w-full px-3 py-2 text-sm rounded-xl border border-ceramic-border bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
          </div>

          {generateError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-ceramic-error/10 text-ceramic-error text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{generateError}</span>
              <button
                onClick={handleGenerate}
                className="ml-auto flex items-center gap-1 text-xs font-bold hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Tentar novamente
              </button>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar com IA
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Fields */}
      <div className="space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-xs font-bold text-ceramic-text-primary mb-1.5">
            Assunto *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto da newsletter"
            maxLength={200}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-ceramic-border bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
          <p className="text-[10px] text-ceramic-text-secondary mt-1">
            {subject.length}/200 caracteres
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-bold text-ceramic-text-primary mb-1.5">
            Conteúdo
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Conteúdo da newsletter em markdown..."
            rows={12}
            className="w-full px-4 py-3 text-sm rounded-xl border border-ceramic-border bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-y font-mono"
          />
        </div>

        {/* Template */}
        <div>
          <label className="block text-xs font-bold text-ceramic-text-primary mb-1.5">
            Template
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTemplate(opt.value)}
                className={`p-3 rounded-xl text-left transition-all ${
                  template === opt.value
                    ? 'bg-violet-100 border-2 border-violet-400'
                    : 'bg-ceramic-cool border border-ceramic-border hover:border-violet-300'
                }`}
              >
                <span className={`text-xs font-bold ${
                  template === opt.value ? 'text-violet-700' : 'text-ceramic-text-primary'
                }`}>
                  {opt.label}
                </span>
                <p className="text-[10px] text-ceramic-text-secondary mt-0.5">
                  {opt.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Scheduled At */}
        <div>
          <label className="block text-xs font-bold text-ceramic-text-primary mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Agendar envio
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-ceramic-border bg-ceramic-base text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
          {scheduledAt && (
            <button
              onClick={() => setScheduledAt('')}
              className="text-[10px] text-ceramic-text-secondary hover:text-ceramic-error mt-1 transition-colors"
            >
              Remover agendamento
            </button>
          )}
        </div>
      </div>

      {/* Save Error */}
      {saveError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-ceramic-error/10 text-ceramic-error text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving || !subject.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </>
          ) : scheduledAt ? (
            <>
              <Send className="w-4 h-4" />
              Salvar e Agendar
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Rascunho
            </>
          )}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-ceramic-cool transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
