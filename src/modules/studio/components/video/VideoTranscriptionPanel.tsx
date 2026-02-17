/**
 * VideoTranscriptionPanel - Transcription display for video projects
 *
 * Shows transcription content with timestamps and a placeholder for
 * future SRT subtitle generation.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Loader2,
  Sparkles,
  Subtitles,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

interface VideoTranscriptionPanelProps {
  projectId: string;
  hasVideo: boolean;
}

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoTranscriptionPanel({
  projectId,
  hasVideo,
}: VideoTranscriptionPanelProps) {
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [fullText, setFullText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscribe = useCallback(async () => {
    if (!hasVideo || isTranscribing) return;
    setIsTranscribing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('studio-transcribe', {
        body: { projectId },
      });

      if (fnError) throw fnError;

      if (data?.segments) {
        setTranscription(data.segments);
        setFullText(data.fullText || data.segments.map((s: TranscriptionSegment) => s.text).join(' '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao transcrever video.');
    } finally {
      setIsTranscribing(false);
    }
  }, [projectId, hasVideo, isTranscribing]);

  if (!hasVideo) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileText className="w-10 h-10 text-ceramic-text-secondary/30 mb-3" />
        <p className="text-sm text-ceramic-text-secondary">
          Faca upload de um video primeiro para gerar a transcricao.
        </p>
      </div>
    );
  }

  if (transcription.length === 0 && !isTranscribing) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileText className="w-10 h-10 text-blue-500/30 mb-3" />
        <p className="text-sm text-ceramic-text-secondary mb-4">
          Transcricao nao gerada ainda.
        </p>
        <button
          onClick={handleTranscribe}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Transcrever Video
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30 max-w-sm"
          >
            <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ceramic-error">{error}</p>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ceramic-border">
        <h3 className="text-sm font-bold text-ceramic-text-primary">
          Transcricao
        </h3>
        <button
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ceramic-border text-xs text-ceramic-text-secondary opacity-50 cursor-not-allowed"
          title="Em breve"
        >
          <Subtitles className="w-3.5 h-3.5" />
          Gerar Legendas SRT
        </button>
      </div>

      {/* Loading */}
      {isTranscribing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-ceramic-text-secondary">Transcrevendo video...</p>
          </div>
        </div>
      )}

      {/* Transcription Content */}
      {!isTranscribing && transcription.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {transcription.map((segment, index) => (
            <div
              key={index}
              className="flex gap-3 p-2 rounded-lg hover:bg-ceramic-cool transition-colors"
            >
              <span className="text-xs font-mono text-blue-500 flex-shrink-0 pt-0.5 w-14 text-right">
                {formatTimestamp(segment.start)}
              </span>
              <p className="text-sm text-ceramic-text-primary leading-relaxed">
                {segment.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
