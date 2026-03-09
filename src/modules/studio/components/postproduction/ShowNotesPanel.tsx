import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, Copy, CheckCircle, Sparkles, Tag, RefreshCw } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { CeramicLoadingState } from '@/components/ui';
import type { StudioShowNotes, StudioTranscription } from '../../types/studio';

interface ShowNotesPanelProps {
  projectId: string;
  showNotes?: StudioShowNotes | null;
  transcription?: StudioTranscription | null;
  onShowNotesGenerated: (notes: StudioShowNotes) => void;
}

export default function ShowNotesPanel({
  projectId,
  showNotes,
  transcription,
  onShowNotesGenerated,
}: ShowNotesPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!transcription) return;
    setIsGenerating(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('studio-show-notes', {
        body: { projectId, transcription: transcription.content },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Falha ao gerar show notes');
      onShowNotesGenerated(data.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar show notes');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, sectionId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => handleCopy(text, id)}
      className="flex items-center gap-1 text-xs text-ceramic-text-secondary hover:text-amber-600 transition-colors"
      title="Copiar secao"
    >
      {copiedSection === id ? (
        <>
          <CheckCircle className="w-3.5 h-3.5 text-ceramic-success" />
          <span>Copiado</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copiar</span>
        </>
      )}
    </button>
  );

  if (!showNotes) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">
          Show Notes nao geradas
        </h3>
        <p className="text-sm text-ceramic-text-secondary text-center mb-6 max-w-sm">
          {transcription
            ? 'Gere as show notes automaticamente a partir da transcricao do episodio.'
            : 'Gere a transcricao primeiro para desbloquear as show notes.'}
        </p>
        {error && (
          <div className="text-center mb-4">
            <p className="text-sm text-ceramic-error mb-3">{error}</p>
            <button
              onClick={() => { setError(null); handleGenerate(); }}
              className="flex items-center gap-2 px-4 py-2 mx-auto text-sm text-ceramic-error hover:bg-ceramic-error/10 rounded-lg transition-colors"
              aria-label="Tentar gerar show notes novamente"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>
        )}
        {!error && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !transcription}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando show notes...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar Show Notes
              </>
            )}
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="bg-ceramic-cool rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-ceramic-text-primary">Resumo</h4>
          <CopyButton text={showNotes.summary} id="summary" />
        </div>
        <p className="text-sm text-ceramic-text-secondary leading-relaxed">
          {showNotes.summary}
        </p>
      </div>

      {/* Highlights */}
      {showNotes.highlights.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-ceramic-text-primary">Destaques</h4>
            <CopyButton text={showNotes.highlights.join('\n')} id="highlights" />
          </div>
          <ul className="space-y-2">
            {showNotes.highlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ceramic-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Quotes */}
      {showNotes.keyQuotes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-ceramic-text-primary">Citacoes Principais</h4>
            <CopyButton text={showNotes.keyQuotes.join('\n')} id="quotes" />
          </div>
          <div className="space-y-3">
            {showNotes.keyQuotes.map((quote, i) => (
              <div
                key={i}
                className="border-l-2 border-amber-400 pl-4 py-2 bg-ceramic-cool/50 rounded-r-lg"
              >
                <p className="text-sm text-ceramic-text-primary italic">"{quote}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-ceramic-text-primary">Descricao SEO</h4>
          <CopyButton text={showNotes.seoDescription} id="seo" />
        </div>
        <div className="bg-ceramic-cool rounded-lg p-3">
          <p className="text-sm text-ceramic-text-secondary">{showNotes.seoDescription}</p>
        </div>
      </div>

      {/* Tags */}
      {showNotes.tags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-ceramic-text-secondary" />
            <h4 className="text-sm font-semibold text-ceramic-text-primary">Tags</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {showNotes.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
