import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Loader2, CheckCircle, X, Clock, Play } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { StudioClip, StudioTranscription } from '../../types/studio';

interface ClipSuggestionPanelProps {
  projectId: string;
  transcription?: StudioTranscription | null;
  clips: StudioClip[];
  onClipsGenerated: (clips: StudioClip[]) => void;
}

const STATUS_CONFIG: Record<StudioClip['status'], { label: string; className: string }> = {
  suggested: { label: 'Sugerido', className: 'bg-blue-100 text-blue-800' },
  draft: { label: 'Rascunho', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  approved: { label: 'Aprovado', className: 'bg-emerald-100 text-emerald-800' },
  published: { label: 'Publicado', className: 'bg-amber-100 text-amber-800' },
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-100 text-red-800',
  instagram: 'bg-pink-100 text-pink-800',
  tiktok: 'bg-slate-100 text-slate-800',
  linkedin: 'bg-blue-100 text-blue-800',
  twitter: 'bg-sky-100 text-sky-800',
  spotify: 'bg-emerald-100 text-emerald-800',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(startSec: number, endSec: number): string {
  const diff = endSec - startSec;
  const m = Math.floor(diff / 60);
  const s = Math.floor(diff % 60);
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

export default function ClipSuggestionPanel({
  projectId,
  transcription,
  clips,
  onClipsGenerated,
}: ClipSuggestionPanelProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async () => {
    if (!transcription) return;
    setIsDetecting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('studio-clip-extract', {
        body: { projectId, transcription: transcription.content },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Falha ao detectar clips');
      onClipsGenerated(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao detectar clips');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUpdateStatus = (clipId: string, newStatus: StudioClip['status']) => {
    const updated = clips.map(c =>
      c.id === clipId ? { ...c, status: newStatus } : c
    );
    onClipsGenerated(updated);
  };

  if (clips.length === 0 && !isDetecting) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <Scissors className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">
          Detectar Melhores Momentos
        </h3>
        <p className="text-sm text-ceramic-text-secondary text-center mb-6 max-w-sm">
          {transcription
            ? 'Identifique automaticamente os melhores trechos para clips de redes sociais.'
            : 'Gere a transcricao primeiro para detectar clips.'}
        </p>
        {error && (
          <p className="text-sm text-ceramic-error mb-4">{error}</p>
        )}
        <button
          onClick={handleDetect}
          disabled={isDetecting || !transcription}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Scissors className="w-4 h-4" />
          Detectar Melhores Momentos
        </button>
      </motion.div>
    );
  }

  if (isDetecting) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
        <p className="text-sm text-ceramic-text-secondary">Analisando melhores momentos...</p>
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
          {clips.length} clips detectados
        </p>
        <button
          onClick={handleDetect}
          disabled={!transcription}
          className="text-sm text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
        >
          Detectar novamente
        </button>
      </div>

      <div className="space-y-3">
        {clips.map((clip, idx) => {
          const statusCfg = STATUS_CONFIG[clip.status];
          const platformColor = PLATFORM_COLORS[clip.platform] || 'bg-ceramic-cool text-ceramic-text-primary';

          return (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-ceramic-cool rounded-xl p-4 border border-ceramic-border"
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-ceramic-text-primary truncate">
                    {clip.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-ceramic-text-secondary">
                      <Clock className="w-3 h-3" />
                      {formatTime(clip.startTimeSeconds)} - {formatTime(clip.endTimeSeconds)}
                    </span>
                    <span className="text-xs text-ceramic-text-secondary">
                      {formatDuration(clip.startTimeSeconds, clip.endTimeSeconds)}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              </div>

              {/* Transcript preview */}
              <div className="bg-ceramic-base rounded-lg p-3 mb-3">
                <p className="text-xs text-ceramic-text-secondary line-clamp-3 leading-relaxed">
                  {clip.transcriptSegment}
                </p>
              </div>

              {/* Platform tags */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${platformColor}`}>
                  {clip.platform}
                </span>
                {clip.hashtags.map((tag, i) => (
                  <span key={i} className="text-xs text-ceramic-text-secondary">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              {clip.status === 'suggested' && (
                <div className="flex items-center gap-2 pt-2 border-t border-ceramic-border">
                  <button
                    onClick={() => handleUpdateStatus(clip.id, 'approved')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(clip.id, 'draft')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ceramic-error bg-ceramic-error/10 rounded-lg hover:bg-ceramic-error/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rejeitar
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ceramic-text-secondary bg-ceramic-base rounded-lg hover:bg-ceramic-cool transition-colors ml-auto"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Preview
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
