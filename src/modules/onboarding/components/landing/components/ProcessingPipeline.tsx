import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProcessingStage } from '../types';

interface ProcessingPipelineProps {
  stage: ProcessingStage;
  messageCount: number;
}

const stagesArr: ProcessingStage[] = ['analyzing', 'embedding', 'classifying', 'organizing'];

const stageLabels: Record<ProcessingStage, string> = {
  analyzing: 'Analisando mensagens...',
  embedding: 'Gerando vetores semânticos...',
  classifying: 'Classificando categorias...',
  organizing: 'Estruturando Life OS...'
};

export function ProcessingPipeline({ stage, messageCount }: ProcessingPipelineProps) {
  const [progress, setProgress] = useState(0);
  const currentStageIndex = stagesArr.indexOf(stage);
  const stageProgress = (currentStageIndex + 1) * 25;

  useEffect(() => {
    // Reset progress when stage changes
    const targetProgress = Math.min(stageProgress, 100);

    // Animate to target progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) {
          clearInterval(interval);
          return targetProgress;
        }
        return Math.min(prev + 2, targetProgress);
      });
    }, 30);

    return () => clearInterval(interval);
  }, [currentStageIndex, stageProgress]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto mb-12 px-6 w-full"
    >
      <div className="p-8 rounded-3xl ceramic-card">
        {/* Pipeline Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-ceramic-text-primary tracking-tight">
            Destilando {messageCount} mensagens
          </h3>
          <motion.div
            key={stage}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-1.5 rounded-full bg-ceramic-accent/10 border border-ceramic-accent/20 text-ceramic-accent text-sm font-bold uppercase tracking-widest"
          >
            {Math.round(progress)}%
          </motion.div>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm font-bold text-ceramic-text-secondary uppercase tracking-widest opacity-60">
            <span>{stageLabels[stage]}</span>
          </div>

          <div className="h-4 rounded-full overflow-hidden ceramic-groove bg-white/50">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-ceramic-info via-ceramic-accent to-ceramic-warning"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />
          </div>

          {/* Mini Stages Steps */}
          <div className="flex justify-between pt-2">
            {stagesArr.map((s, idx) => {
              const isActive = s === stage;
              const isDone = stagesArr.indexOf(s) < currentStageIndex;

              return (
                <div key={s} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-500 ${isActive ? 'bg-ceramic-accent scale-150 shadow-[0_0_12px_rgba(var(--ceramic-accent-rgb),0.5)]' :
                        isDone ? 'bg-ceramic-warning' : 'bg-ceramic-cool'
                      }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
