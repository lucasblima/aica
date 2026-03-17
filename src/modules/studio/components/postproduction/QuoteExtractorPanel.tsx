import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Quote, Loader2, Copy, CheckCircle, ImagePlus, Clock, User, RefreshCw } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { CeramicLoadingState } from '@/components/ui';
import type { StudioTranscription } from '../../types/studio';

interface ExtractedQuote {
  text: string;
  speaker: string;
  timestampSeconds: number;
}

interface QuoteExtractorPanelProps {
  projectId: string;
  transcription?: StudioTranscription | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function QuoteExtractorPanel({
  projectId,
  transcription,
}: QuoteExtractorPanelProps) {
  const [quotes, setQuotes] = useState<ExtractedQuote[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!transcription) return;
    setIsExtracting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('studio-extract-quotes', {
        body: { projectId, transcription: transcription.content },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Falha ao extrair quotes');
      setQuotes(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao extrair quotes');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (quotes.length === 0 && !isExtracting) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <Quote className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">
          Extrair Citacoes
        </h3>
        <p className="text-sm text-ceramic-text-secondary text-center mb-6 max-w-sm">
          {transcription
            ? 'Identifique automaticamente as melhores citações do episódio para redes sociais.'
            : 'Gere a transcricao primeiro para extrair citações.'}
        </p>
        {error && (
          <div className="text-center mb-4">
            <p className="text-sm text-ceramic-error mb-3">{error}</p>
            <button
              onClick={() => { setError(null); handleExtract(); }}
              className="flex items-center gap-2 px-4 py-2 mx-auto text-sm text-ceramic-error hover:bg-ceramic-error/10 rounded-lg transition-colors"
              aria-label="Tentar extrair citações novamente"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>
        )}
        {!error && (
          <button
            onClick={handleExtract}
            disabled={isExtracting || !transcription}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Quote className="w-4 h-4" />
            Extrair Quotes
          </button>
        )}
      </motion.div>
    );
  }

  if (isExtracting) {
    return (
      <div className="py-8">
        <CeramicLoadingState module="studio" variant="list" lines={3} message="Extraindo melhores citações..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-ceramic-text-secondary">
          {quotes.length} citacoes encontradas
        </p>
        <button
          onClick={handleExtract}
          disabled={!transcription}
          className="text-sm text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
        >
          Extrair novamente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quotes.map((quote, idx) => {
          const qId = `quote-${idx}`;
          return (
            <motion.div
              key={qId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-ceramic-cool rounded-xl p-5 border border-ceramic-border flex flex-col"
            >
              <p className="text-base text-ceramic-text-primary italic leading-relaxed flex-1 mb-4">
                "{quote.text}"
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
                    <User className="w-3.5 h-3.5" />
                    {quote.speaker}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(quote.timestampSeconds)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(quote.text, qId)}
                    className="flex items-center gap-1 text-xs text-ceramic-text-secondary hover:text-amber-600 transition-colors"
                    title="Copiar citacao"
                  >
                    {copiedId === qId ? (
                      <CheckCircle className="w-3.5 h-3.5 text-ceramic-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copiar</span>
                  </button>
                  <button
                    className="flex items-center gap-1 text-xs text-ceramic-text-secondary hover:text-amber-600 transition-colors"
                    title="Criar card visual"
                    aria-label="Criar card visual para citacao"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Criar Card</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
