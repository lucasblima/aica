/**
 * VideoWorkspace - 4-stage workflow for video content
 *
 * Stages: Upload -> Transcricao -> Edicao -> Review
 * Uses blue accent to differentiate from podcast (amber) and article (emerald).
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  FileText,
  Scissors,
  Eye,
  Film,
} from 'lucide-react';
import type { StudioProject } from '../../types/studio';
import { VideoUploadPanel } from '../video';
import { VideoTranscriptionPanel } from '../video';
import { VideoClipPanel } from '../video';

interface VideoWorkspaceProps {
  project: StudioProject;
  onBack: () => void;
}

type VideoStage = 'upload' | 'transcricao' | 'edicao' | 'review';

const STAGES: { key: VideoStage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'transcricao', label: 'Transcricao', icon: FileText },
  { key: 'edicao', label: 'Edicao', icon: Scissors },
  { key: 'review', label: 'Review', icon: Eye },
];

export default function VideoWorkspace({ project, onBack }: VideoWorkspaceProps) {
  const [currentStage, setCurrentStage] = useState<VideoStage>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url?: string } | undefined>();
  const [hasTranscription, setHasTranscription] = useState(false);

  const currentStageIndex = STAGES.findIndex(s => s.key === currentStage);

  const handleFileSelected = useCallback((file: File) => {
    // Simulate upload progress — real implementation would upload to storage
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFile({ name: file.name, size: file.size });
      }
      setUploadProgress(Math.min(Math.round(progress), 100));
    }, 300);
  }, []);

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
            className="h-full"
          >
            {currentStage === 'upload' && (
              <VideoUploadPanel
                onFileSelected={handleFileSelected}
                uploadProgress={uploadProgress}
                uploadedFile={uploadedFile}
              />
            )}

            {currentStage === 'transcricao' && (
              <VideoTranscriptionPanel
                projectId={project.id}
                hasVideo={!!uploadedFile}
              />
            )}

            {currentStage === 'edicao' && (
              <VideoClipPanel
                projectId={project.id}
                hasTranscription={hasTranscription}
              />
            )}

            {currentStage === 'review' && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
                  <Film className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-ceramic-text-primary mb-2">
                  Revisao do Video
                </h2>
                <p className="text-sm text-ceramic-text-secondary max-w-sm">
                  Revise o video editado, clips selecionados e transcricao antes de publicar.
                </p>
                {uploadedFile && (
                  <div className="mt-6 p-4 rounded-xl border border-ceramic-border bg-ceramic-cool">
                    <p className="text-xs text-ceramic-text-secondary">Arquivo:</p>
                    <p className="text-sm font-medium text-ceramic-text-primary">{uploadedFile.name}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
