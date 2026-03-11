/**
 * VideoClipPanel - AI-powered clip suggestion for video projects
 *
 * Features:
 * - "Sugerir Clips" button that calls studio-clip-extract Edge Function
 * - Displays suggested clips with title, timestamps, transcript preview, platform
 * - "Aprovar" / "Descartar" buttons per clip with status tracking
 * - Saves approved clips to studio_clips table
 * - Loading/error states with retry
 * - Ceramic tokens, Portuguese text
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Scissors,
  Sparkles,
  AlertCircle,
  Smartphone,
  Square,
  Monitor,
  CheckCircle,
  X,
  Clock,
  Play,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { CeramicLoadingState } from '@/components/ui';
import type { StudioClip, StudioTranscription } from '../../types/studio';

const log = createNamespacedLogger('VideoClipPanel');

interface VideoClipPanelProps {
  projectId: string;
  hasTranscription: boolean;
  transcription?: StudioTranscription | null;
  clips: StudioClip[];
  onClipsGenerated: (clips: StudioClip[]) => void;
}

type ClipStatus = StudioClip['status'];

const STATUS_CONFIG: Record<ClipStatus, { label: string; className: string }> = {
  suggested: { label: 'Sugerido', className: 'bg-ceramic-info/10 text-ceramic-info' },
  draft: { label: 'Descartado', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  approved: { label: 'Aprovado', className: 'bg-emerald-100 text-emerald-800' },
  published: { label: 'Publicado', className: 'bg-amber-100 text-amber-800' },
};

const PLATFORM_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; className: string }> = {
  instagram: { label: 'Instagram Reels', icon: Smartphone, className: 'bg-pink-100 text-pink-800' },
  tiktok: { label: 'TikTok', icon: Smartphone, className: 'bg-slate-100 text-slate-800' },
  youtube: { label: 'YouTube Shorts', icon: Monitor, className: 'bg-red-100 text-red-800' },
  linkedin: { label: 'LinkedIn', icon: Square, className: 'bg-blue-100 text-blue-800' },
  twitter: { label: 'Twitter/X', icon: Square, className: 'bg-sky-100 text-sky-800' },
  spotify: { label: 'Spotify', icon: Play, className: 'bg-emerald-100 text-emerald-800' },
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

export default function VideoClipPanel({
  projectId,
  hasTranscription,
  transcription,
  clips,
  onClipsGenerated,
}: VideoClipPanelProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingClipId, setUpdatingClipId] = useState<string | null>(null);

  const handleDetect = useCallback(async () => {
    if (!transcription) return;
    setIsDetecting(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('studio-clip-extract', {
        body: { projectId, transcription: transcription.content },
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Falha ao sugerir clips');

      onClipsGenerated(data.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao sugerir clips';
      setError(message);
    } finally {
      setIsDetecting(false);
    }
  }, [projectId, transcription, onClipsGenerated]);

  const handleUpdateStatus = useCallback(async (clipId: string, newStatus: ClipStatus) => {
    setUpdatingClipId(clipId);
    try {
      // Update locally first for instant feedback
      const updated = clips.map(c =>
        c.id === clipId ? { ...c, status: newStatus } : c
      );
      onClipsGenerated(updated);

      // Persist to database
      const { error: dbError } = await supabase
        .from('studio_clips')
        .update({ status: newStatus })
        .eq('id', clipId);

      if (dbError) {
        log.warn('Falha ao atualizar status do clip:', dbError.message);
        // Rollback optimistic update
        onClipsGenerated(clips);
        setError('Falha ao salvar status do clip. Tente novamente.');
      }
    } finally {
      setUpdatingClipId(null);
    }
  }, [clips, onClipsGenerated]);

  // No transcription yet
  if (!hasTranscription) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ceramic-info/10 flex items-center justify-center mb-4">
          <Scissors className="w-8 h-8 text-ceramic-info/40" />
        </div>
        <p className="text-sm text-ceramic-text-secondary">
          Gere a transcricao primeiro para obter sugestoes de clips.
        </p>
      </div>
    );
  }

  // Loading state
  if (isDetecting) {
    return (
      <div className="p-6">
        <CeramicLoadingState
          module="studio"
          variant="list"
          lines={3}
          message="Analisando melhores momentos do video..."
        />
      </div>
    );
  }

  // Empty state - no clips yet
  if (clips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-ceramic-info/10 flex items-center justify-center mb-4">
          <Scissors className="w-8 h-8 text-ceramic-info" />
        </div>
        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">
          Sugerir Clips do Video
        </h3>
        <p className="text-sm text-ceramic-text-secondary text-center mb-6 max-w-sm">
          Identifique automaticamente os melhores trechos para Instagram Reels, TikTok e YouTube Shorts.
        </p>

        {error && (
          <div className="text-center mb-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30 max-w-sm mb-3">
              <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
              <p className="text-xs text-ceramic-error">{error}</p>
            </div>
            <button
              onClick={() => { setError(null); handleDetect(); }}
              className="flex items-center gap-2 px-4 py-2 mx-auto text-sm text-ceramic-error hover:bg-ceramic-error/10 rounded-lg transition-colors"
              aria-label="Tentar sugerir clips novamente"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>
        )}

        {!error && (
          <button
            onClick={handleDetect}
            className="flex items-center gap-2 px-6 py-3 bg-ceramic-info text-white rounded-lg hover:bg-ceramic-info/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Sugerir Clips
          </button>
        )}
      </motion.div>
    );
  }

  // Clips list with status counts
  const suggestedCount = clips.filter(c => c.status === 'suggested').length;
  const approvedCount = clips.filter(c => c.status === 'approved').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-ceramic-text-secondary">
            {clips.length} clips detectados
          </p>
          {approvedCount > 0 && (
            <span className="text-xs text-emerald-600 font-medium">
              {approvedCount} aprovados
            </span>
          )}
          {suggestedCount > 0 && (
            <span className="text-xs text-ceramic-info font-medium">
              {suggestedCount} pendentes
            </span>
          )}
        </div>
        <button
          onClick={handleDetect}
          className="text-sm text-ceramic-info hover:text-ceramic-info/80 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Sugerir novamente
        </button>
      </div>

      {/* Error after regeneration */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30"
        >
          <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
          <p className="text-xs text-ceramic-error">{error}</p>
        </motion.div>
      )}

      {/* Clips grid */}
      <div className="space-y-3">
        {clips.map((clip, idx) => {
          const statusCfg = STATUS_CONFIG[clip.status];
          const platformCfg = PLATFORM_CONFIG[clip.platform];
          const isUpdating = updatingClipId === clip.id;

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

              {/* Platform tag */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {platformCfg ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${platformCfg.className}`}>
                    <platformCfg.icon className="w-3 h-3" />
                    {platformCfg.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ceramic-cool text-ceramic-text-primary">
                    {clip.platform}
                  </span>
                )}
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
                    disabled={isUpdating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(clip.id, 'draft')}
                    disabled={isUpdating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ceramic-error bg-ceramic-error/10 rounded-lg hover:bg-ceramic-error/20 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Descartar
                  </button>
                </div>
              )}

              {/* Approved state action */}
              {clip.status === 'approved' && (
                <div className="flex items-center gap-2 pt-2 border-t border-ceramic-border">
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Clip aprovado
                  </span>
                  <button
                    onClick={() => handleUpdateStatus(clip.id, 'suggested')}
                    disabled={isUpdating}
                    className="ml-auto text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                  >
                    Desfazer
                  </button>
                </div>
              )}

              {/* Discarded state */}
              {clip.status === 'draft' && (
                <div className="flex items-center gap-2 pt-2 border-t border-ceramic-border">
                  <span className="text-xs text-ceramic-text-secondary flex items-center gap-1">
                    <X className="w-3.5 h-3.5" />
                    Clip descartado
                  </span>
                  <button
                    onClick={() => handleUpdateStatus(clip.id, 'suggested')}
                    disabled={isUpdating}
                    className="ml-auto text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                  >
                    Restaurar
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
