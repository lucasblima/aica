import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ProcessingPipelineProps {
  stage: string;
  messageCount: number;
}

const PIPELINE_STAGES = [
  { id: 'analyzing', label: 'Analisando mensagens', icon: '🔍', duration: 1000 },
  { id: 'embedding', label: 'Gerando embeddings', icon: '🧠', duration: 1500 },
  { id: 'classifying', label: 'Classificando intencoes', icon: '🎯', duration: 1200 },
  { id: 'organizing', label: 'Organizando modulos', icon: '📊', duration: 800 }
];

export function ProcessingPipeline({ stage, messageCount }: ProcessingPipelineProps) {
  const [progress, setProgress] = useState(0);
  const currentStageIndex = PIPELINE_STAGES.findIndex(s => s.id === stage);

  useEffect(() => {
    // Reset progress when stage changes
    const stageProgress = ((currentStageIndex + 1) / PIPELINE_STAGES.length) * 100;
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
  }, [currentStageIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto mb-12 px-6"
    >
      <div
        className="p-8 rounded-3xl"
        style={{
          background: '#F0EFE9',
          boxShadow: '8px 8px 16px rgba(163, 158, 145, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.9)'
        }}
      >
        {/* Pipeline Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-[#5C554B]">
            Processando {messageCount} mensagens
          </h3>
          <motion.div
            className="text-4xl"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            ⚡
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div
            className="rounded-full h-4 overflow-hidden"
            style={{
              background: '#E5E3DA',
              boxShadow: 'inset 2px 2px 4px rgba(163, 158, 145, 0.3)'
            }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 50%, #F59E0B 100%)'
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <p className="text-right text-sm text-[#8B8378] mt-2">
            {Math.round(progress)}% concluido
          </p>
        </div>

        {/* Pipeline Stages */}
        <div className="grid grid-cols-4 gap-4">
          {PIPELINE_STAGES.map((pipelineStage, index) => {
            const isActive = index === currentStageIndex;
            const isComplete = index < currentStageIndex;

            return (
              <motion.div
                key={pipelineStage.id}
                initial={{ opacity: 0.3, scale: 0.9 }}
                animate={{
                  opacity: isActive ? 1 : isComplete ? 0.7 : 0.4,
                  scale: isActive ? 1.05 : 1
                }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center"
              >
                {/* Icon */}
                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3
                    transition-all duration-300
                  `}
                  style={{
                    background: isActive ? '#F0EFE9' : '#E5E3DA',
                    boxShadow: isActive
                      ? '4px 4px 8px rgba(163, 158, 145, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.9)'
                      : 'inset 2px 2px 4px rgba(163, 158, 145, 0.2)'
                  }}
                >
                  {isComplete ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-600"
                    >
                      ✓
                    </motion.span>
                  ) : (
                    <span className={isActive ? 'animate-pulse' : ''}>
                      {pipelineStage.icon}
                    </span>
                  )}
                </div>

                {/* Label */}
                <p
                  className={`
                    text-sm font-semibold transition-colors duration-300
                    ${isActive ? 'text-[#5C554B]' : 'text-[#8B8378]'}
                  `}
                >
                  {pipelineStage.label}
                </p>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 flex gap-1"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Stage Description */}
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-[#8B8378]">
            {stage === 'analyzing' && 'Lendo e interpretando o conteudo das mensagens...'}
            {stage === 'embedding' && 'Convertendo texto em vetores semanticos para analise profunda...'}
            {stage === 'classifying' && 'Identificando intencoes, tarefas, emocoes e relacionamentos...'}
            {stage === 'organizing' && 'Distribuindo informacoes nos modulos apropriados...'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
