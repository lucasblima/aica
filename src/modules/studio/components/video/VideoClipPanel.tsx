/**
 * VideoClipPanel - Clip suggestion with aspect ratio selection
 *
 * Shows suggested clips from transcription with platform-specific
 * aspect ratio options.
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Scissors,
  Loader2,
  Sparkles,
  AlertCircle,
  Smartphone,
  Square,
  Monitor,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

interface VideoClipPanelProps {
  projectId: string;
  hasTranscription: boolean;
}

interface ClipSuggestion {
  title: string;
  startSeconds: number;
  endSeconds: number;
  transcriptSegment: string;
  platform: string;
}

type AspectRatio = '9:16' | '1:1' | '16:9';

const ASPECT_RATIOS: { value: AspectRatio; label: string; platform: string; icon: React.FC<{ className?: string }> }[] = [
  { value: '9:16', label: '9:16', platform: 'Reels / TikTok', icon: Smartphone },
  { value: '1:1', label: '1:1', platform: 'Feed', icon: Square },
  { value: '16:9', label: '16:9', platform: 'YouTube', icon: Monitor },
];

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function VideoClipPanel({
  projectId,
  hasTranscription,
}: VideoClipPanelProps) {
  const [clips, setClips] = useState<ClipSuggestion[]>([]);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('9:16');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateClips = useCallback(async () => {
    if (!hasTranscription || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('studio-suggest-clips', {
        body: { projectId, aspectRatio: selectedRatio },
      });

      if (fnError) throw fnError;

      if (data?.clips) {
        setClips(data.clips);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar sugestoes de clips.');
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, hasTranscription, isGenerating, selectedRatio]);

  if (!hasTranscription) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Scissors className="w-10 h-10 text-ceramic-text-secondary/30 mb-3" />
        <p className="text-sm text-ceramic-text-secondary">
          Gere a transcricao primeiro para obter sugestoes de clips.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Aspect Ratio Selector */}
      <div className="px-4 py-3 border-b border-ceramic-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            Sugestoes de Clips
          </h3>
          <button
            onClick={handleGenerateClips}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isGenerating ? 'Gerando...' : 'Gerar Clips'}
          </button>
        </div>

        {/* Aspect Ratio Radio Buttons */}
        <div className="flex gap-2">
          {ASPECT_RATIOS.map(({ value, label, platform, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedRatio(value)}
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                selectedRatio === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-ceramic-border bg-ceramic-base text-ceramic-text-secondary hover:bg-ceramic-cool'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <div className="text-left">
                <div>{label}</div>
                <div className="text-[10px] opacity-70">{platform}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30"
        >
          <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" />
          <p className="text-xs text-ceramic-error">{error}</p>
        </motion.div>
      )}

      {/* Clips List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {clips.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Scissors className="w-10 h-10 text-ceramic-text-secondary/20 mb-3" />
            <p className="text-sm text-ceramic-text-secondary">
              Nenhum clip sugerido ainda.
            </p>
            <p className="text-xs text-ceramic-text-secondary/60 mt-1">
              Clique em "Gerar Clips" para obter sugestoes baseadas na transcricao.
            </p>
          </div>
        )}

        {clips.map((clip, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-xl border border-ceramic-border bg-ceramic-base p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-ceramic-text-primary">
                {clip.title}
              </h4>
              <span className="text-xs text-blue-500 font-mono flex-shrink-0 ml-2">
                {formatTimestamp(clip.startSeconds)} - {formatTimestamp(clip.endSeconds)}
              </span>
            </div>
            <p className="text-xs text-ceramic-text-secondary leading-relaxed line-clamp-3">
              {clip.transcriptSegment}
            </p>
            {clip.platform && (
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-medium">
                {clip.platform}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
