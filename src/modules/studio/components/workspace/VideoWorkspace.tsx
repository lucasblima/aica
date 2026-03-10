/**
 * VideoWorkspace - 4-stage workflow for video content
 *
 * Stages: Upload -> Transcricao -> Clips -> Review
 * Uses blue accent to differentiate from podcast (amber) and article (emerald).
 *
 * Manages shared state across panels:
 * - uploadedFile flows from Upload to Transcription (hasVideo)
 * - transcription flows from Transcription to Clips (hasTranscription)
 * - clips are loaded from DB and shared between Clips and Review
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  FileText,
  Scissors,
  Eye,
  Film,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { StudioProject, StudioTranscription, StudioClip } from '../../types/studio';

import { VideoUploadPanel } from '../video';
import type { UploadedVideoFile } from '../video/VideoUploadPanel';
import { VideoTranscriptionPanel } from '../video';
import { VideoClipPanel } from '../video';

const log = createNamespacedLogger('VideoWorkspace');

interface VideoWorkspaceProps {
  project: StudioProject;
  onBack: () => void;
}

type VideoStage = 'upload' | 'transcricao' | 'clips' | 'review';

const STAGES: { key: VideoStage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'transcricao', label: 'Transcricao', icon: FileText },
  { key: 'clips', label: 'Clips', icon: Scissors },
  { key: 'review', label: 'Review', icon: Eye },
];

export default function VideoWorkspace({ project, onBack }: VideoWorkspaceProps) {
  const [currentStage, setCurrentStage] = useState<VideoStage>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedVideoFile | undefined>();
  const [transcription, setTranscription] = useState<StudioTranscription | null>(null);
  const [clips, setClips] = useState<StudioClip[]>([]);

  const currentStageIndex = STAGES.findIndex(s => s.key === currentStage);

  // Load existing data from DB on mount (if project already has assets/transcription/clips)
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const [assetRes, transcRes, clipsRes] = await Promise.all([
          supabase
            .from('studio_assets')
            .select('*')
            .eq('project_id', project.id)
            .eq('asset_type', 'video')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('studio_transcriptions')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('studio_clips')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false }),
        ]);

        // Restore uploaded file from asset
        if (assetRes.data) {
          const meta = (assetRes.data.metadata || {}) as Record<string, unknown>;
          setUploadedFile({
            name: (meta.original_name as string) || 'video',
            size: assetRes.data.file_size || 0,
            format: (meta.format as string) || 'Desconhecido',
            assetId: assetRes.data.id,
          });
        }

        // Restore transcription
        if (transcRes.data) {
          setTranscription({
            id: transcRes.data.id,
            userId: transcRes.data.user_id,
            projectId: transcRes.data.project_id,
            content: transcRes.data.content,
            language: transcRes.data.language,
            durationSeconds: transcRes.data.duration_seconds,
            speakers: transcRes.data.speakers || [],
            chapters: transcRes.data.chapters || [],
            wordCount: transcRes.data.word_count,
            createdAt: new Date(transcRes.data.created_at),
          });
        }

        // Restore clips
        if (clipsRes.data && clipsRes.data.length > 0) {
          setClips(
            clipsRes.data.map((c: Record<string, unknown>) => ({
              id: c.id as string,
              userId: c.user_id as string,
              projectId: c.project_id as string,
              title: c.title as string,
              startTimeSeconds: c.start_time_seconds as number,
              endTimeSeconds: c.end_time_seconds as number,
              transcriptSegment: c.transcript_segment as string,
              platform: c.platform as string,
              status: c.status as StudioClip['status'],
              caption: (c.caption as string) || '',
              hashtags: (c.hashtags as string[]) || [],
              thumbnailUrl: c.thumbnail_url as string | undefined,
              createdAt: new Date(c.created_at as string),
            }))
          );
        }

        // Auto-advance to the furthest completed stage
        if (clipsRes.data && clipsRes.data.length > 0) {
          setCurrentStage('clips');
        } else if (transcRes.data) {
          setCurrentStage('transcricao');
        } else if (assetRes.data) {
          setCurrentStage('upload');
        }
      } catch (err) {
        log.warn('Erro ao carregar dados existentes do video:', err);
      }
    };

    loadExistingData();
  }, [project.id]);

  const handleFileUploaded = useCallback((file: UploadedVideoFile) => {
    setUploadedFile(file);
  }, []);

  const handleTranscriptionGenerated = useCallback((t: StudioTranscription) => {
    setTranscription(t);
  }, []);

  const handleClipsGenerated = useCallback((newClips: StudioClip[]) => {
    setClips(newClips);
  }, []);

  const approvedClips = clips.filter(c => c.status === 'approved');

  return (
    <div className="flex flex-col h-screen bg-ceramic-base">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-ceramic-border bg-ceramic-base">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors"
          aria-label="Voltar para biblioteca"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-ceramic-text-primary truncate">
            {project.title}
          </h1>
          <p className="text-xs text-ceramic-text-secondary">Video</p>
        </div>
      </div>

      {/* Stage Stepper */}
      <div className="flex items-center px-4 py-2 border-b border-ceramic-border bg-ceramic-cool/50 overflow-x-auto">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = stage.key === currentStage;
          const isPast = index < currentStageIndex;

          return (
            <React.Fragment key={stage.key}>
              {index > 0 && (
                <div className={`flex-shrink-0 w-8 h-px mx-1 ${
                  isPast ? 'bg-blue-400' : 'bg-ceramic-border'
                }`} />
              )}
              <button
                onClick={() => setCurrentStage(stage.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : isPast
                      ? 'text-blue-600 hover:bg-blue-50'
                      : 'text-ceramic-text-secondary hover:bg-ceramic-cool'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {stage.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Stage Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-y-auto"
          >
            {currentStage === 'upload' && (
              <VideoUploadPanel
                projectId={project.id}
                onFileUploaded={handleFileUploaded}
                uploadedFile={uploadedFile}
              />
            )}

            {currentStage === 'transcricao' && (
              <div className="p-4">
                <VideoTranscriptionPanel
                  projectId={project.id}
                  hasVideo={!!uploadedFile}
                  transcription={transcription}
                  onTranscriptionGenerated={handleTranscriptionGenerated}
                />
              </div>
            )}

            {currentStage === 'clips' && (
              <div className="p-4">
                <VideoClipPanel
                  projectId={project.id}
                  hasTranscription={!!transcription}
                  transcription={transcription}
                  clips={clips}
                  onClipsGenerated={handleClipsGenerated}
                />
              </div>
            )}

            {currentStage === 'review' && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
                  <Film className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-ceramic-text-primary mb-2">
                  Revisao do Video
                </h2>
                <p className="text-sm text-ceramic-text-secondary max-w-sm mb-6">
                  Revise o video editado, clips selecionados e transcricao antes de publicar.
                </p>

                {/* Summary cards */}
                <div className="w-full max-w-md space-y-3">
                  {uploadedFile && (
                    <div className="p-4 rounded-xl border border-ceramic-border bg-ceramic-cool text-left">
                      <p className="text-xs text-ceramic-text-secondary mb-1">Arquivo</p>
                      <p className="text-sm font-medium text-ceramic-text-primary">{uploadedFile.name}</p>
                      <p className="text-xs text-ceramic-text-secondary">{uploadedFile.format}</p>
                    </div>
                  )}

                  {transcription && (
                    <div className="p-4 rounded-xl border border-ceramic-border bg-ceramic-cool text-left">
                      <p className="text-xs text-ceramic-text-secondary mb-1">Transcricao</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-ceramic-success" />
                        <p className="text-sm font-medium text-ceramic-text-primary">
                          {transcription.wordCount.toLocaleString('pt-BR')} palavras &middot; {transcription.speakers.length} falantes
                        </p>
                      </div>
                    </div>
                  )}

                  {clips.length > 0 && (
                    <div className="p-4 rounded-xl border border-ceramic-border bg-ceramic-cool text-left">
                      <p className="text-xs text-ceramic-text-secondary mb-1">Clips</p>
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-blue-500" />
                        <p className="text-sm font-medium text-ceramic-text-primary">
                          {clips.length} clips &middot; {approvedClips.length} aprovados
                        </p>
                      </div>
                    </div>
                  )}

                  {!uploadedFile && !transcription && clips.length === 0 && (
                    <p className="text-sm text-ceramic-text-secondary/60">
                      Nenhum conteudo para revisar ainda. Comece pelo upload do video.
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
