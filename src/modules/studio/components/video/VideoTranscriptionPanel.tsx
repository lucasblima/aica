/**
 * VideoTranscriptionPanel - Transcription display for vídeo projects
 *
 * Reuses the podcast TranscriptionPanel patterns:
 * - Calls studio-transcribe Edge Function
 * - Displays speaker-segmented transcription with timestamps
 * - Copy-to-clipboard per segment and full text
 * - CeramicLoadingState during generation
 * - Error state with retry
 * - Portuguese UI text
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Copy,
  CheckCircle,
  Clock,
  User,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { CeramicLoadingState } from '@/components/ui';
import type { StudioTranscription } from '../../types/studio';

interface VideoTranscriptionPanelProps {
  projectId: string;
  hasVideo: boolean;
  transcription?: StudioTranscription | null;
  onTranscriptionGenerated: (transcription: StudioTranscription) => void;
}

const SPEAKER_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
  'bg-purple-100 text-purple-800',
  'bg-rose-100 text-rose-800',
  'bg-cyan-100 text-cyan-800',
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoTranscriptionPanel({
  projectId,
  hasVideo,
  transcription,
  onTranscriptionGenerated,
}: VideoTranscriptionPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!hasVideo || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('studio-transcribe', {
        body: { projectId },
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Falha ao gerar transcricao');

      onTranscriptionGenerated(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao transcrever vídeo.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, hasVideo, isGenerating, onTranscriptionGenerated]);

  const handleCopy = useCallback(async (text: string, sectionId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  }, []);

  // No vídeo uploaded yet
  if (!hasVideo) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ceramic-info/10 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-ceramic-info/40" />
        </div>
        <p className="text-sm text-ceramic-text-secondary">
          Faca upload de um video primeiro para gerar a transcricao.
        </p>
      </div>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <div className="p-6">
        <CeramicLoadingState
          module="studio"
          variant="list"
          lines={5}
          message="Transcrevendo vídeo... Isso pode levar alguns minutos."
        />
      </div>
    );
  }

  // No transcription yet - show generate button
  if (!transcription) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-ceramic-info/10 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-ceramic-info" />
        </div>
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">
          Nenhuma transcricao disponível
        </h3>
        <p className="text-sm text-ceramic-text-secondary text-center mb-6 max-w-sm">
          Gere a transcricao automatica do video para desbloquear clips e legendas.
        </p>

        {error && (
          <div className="text-center mb-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30 max-w-sm mb-3">
              <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
              <p className="text-xs text-ceramic-error">{error}</p>
            </div>
            <button
              onClick={() => { setError(null); handleGenerate(); }}
              className="flex items-center gap-2 px-4 py-2 mx-auto text-sm text-ceramic-error hover:bg-ceramic-error/10 rounded-lg transition-colors"
              aria-label="Tentar gerar transcricao novamente"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>
        )}

        {!error && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-3 bg-ceramic-info text-white rounded-lg hover:bg-ceramic-info/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Transcrever Video
          </button>
        )}
      </motion.div>
    );
  }

  // Build speaker color map
  const speakerColorMap = new Map<string, string>();
  transcription.speakers.forEach((speaker, i) => {
    speakerColorMap.set(speaker.name, SPEAKER_COLORS[i % SPEAKER_COLORS.length]);
  });

  // Build flat timeline (chapters + segments sorted by time)
  type TimelineItem =
    | { type: 'chapter'; title: string; startSeconds: number }
    | { type: 'segment'; speaker: string; start: number; end: number; text: string };

  const timeline: TimelineItem[] = [];
  for (const chapter of transcription.chapters) {
    timeline.push({ type: 'chapter', title: chapter.title, startSeconds: chapter.startSeconds });
  }
  for (const speaker of transcription.speakers) {
    for (const seg of speaker.segments) {
      timeline.push({ type: 'segment', speaker: speaker.name, start: seg.start, end: seg.end, text: seg.text });
    }
  }
  timeline.sort((a, b) => {
    const timeA = a.type === 'chapter' ? a.startSeconds : a.start;
    const timeB = b.type === 'chapter' ? b.startSeconds : b.start;
    return timeA - timeB;
  });

  const fullText = transcription.speakers
    .flatMap(s => s.segments.map(seg => `[${s.name}] ${seg.text}`))
    .join('\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-ceramic-text-secondary">
          <Clock className="w-4 h-4" />
          <span>{formatTime(transcription.durationSeconds)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-ceramic-text-secondary">
          <User className="w-4 h-4" />
          <span>{transcription.speakers.length} falantes</span>
        </div>
        <div className="text-sm text-ceramic-text-secondary">
          {transcription.wordCount.toLocaleString('pt-BR')} palavras
        </div>
        <button
          onClick={() => handleCopy(fullText, 'full')}
          className="ml-auto flex items-center gap-1.5 text-sm text-ceramic-info hover:text-ceramic-info/80 transition-colors"
        >
          {copiedSection === 'full' ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar tudo
            </>
          )}
        </button>
      </div>

      {/* Regenerate button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          className="text-xs text-ceramic-info hover:text-ceramic-info/80 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Transcrever novamente
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {timeline.map((item, idx) => {
          if (item.type === 'chapter') {
            return (
              <div key={`ch-${idx}`} className="flex items-center gap-3 py-3">
                <div className="h-px flex-1 bg-ceramic-border" />
                <span className="text-xs font-semibold text-ceramic-info uppercase tracking-wide">
                  {item.title}
                </span>
                <span className="text-xs text-ceramic-text-secondary">
                  {formatTime(item.startSeconds)}
                </span>
                <div className="h-px flex-1 bg-ceramic-border" />
              </div>
            );
          }

          const colorClass = speakerColorMap.get(item.speaker) || SPEAKER_COLORS[0];
          const segId = `seg-${idx}`;

          return (
            <div
              key={segId}
              className="group flex gap-3 p-3 rounded-lg hover:bg-ceramic-cool transition-colors"
            >
              <div className="flex-shrink-0 pt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                  {item.speaker}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ceramic-text-primary leading-relaxed">
                  {item.text}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-start gap-2">
                <span className="text-xs text-ceramic-text-secondary tabular-nums mt-0.5">
                  {formatTime(item.start)}
                </span>
                <button
                  onClick={() => handleCopy(item.text, segId)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-ceramic-text-secondary hover:text-ceramic-info"
                  title="Copiar segmento"
                  aria-label="Copiar segmento da transcricao"
                >
                  {copiedSection === segId ? (
                    <CheckCircle className="w-3.5 h-3.5 text-ceramic-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
