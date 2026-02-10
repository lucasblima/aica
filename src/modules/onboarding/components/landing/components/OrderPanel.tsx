import { motion } from 'framer-motion';
import type { ProcessedModules, AtlasTask, JourneyMoment, StudioEpisode, Connection } from '../types';

interface OrderPanelProps {
  modules: ProcessedModules | null;
  isProcessing: boolean;
}

export function OrderPanel({ modules, isProcessing }: OrderPanelProps) {
  const isEmpty = !modules;

  return (
    <div
      className="relative min-h-[700px] p-8 rounded-3xl ceramic-tray"
      role="region"
      aria-label="Informacoes organizadas"
      aria-live="assertive"
      aria-busy={isProcessing}
    >
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-4xl font-black text-ceramic-text-primary mb-4 tracking-tighter">
          A destilação
        </h3>
        <p className="text-lg text-ceramic-text-secondary font-medium">
          A essência extraída, pronta para a vida.
        </p>
      </div>

      {/* Empty State */}
      {isEmpty && !isProcessing && (
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              ⏳
            </motion.div>
            <p className="text-xl text-ceramic-text-secondary">
              Aguardando processamento...
            </p>
            <p className="text-sm text-[#A39E91] mt-2">
              Clique em "Organizar meu WhatsApp" para começar
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isProcessing && (
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="h-[200px] rounded-2xl ceramic-card"
            />
          ))}
        </div>
      )}

      {/* Modules Grid */}
      {modules && !isProcessing && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15
              }
            }
          }}
        >
          <ModuleCardWrapper index={0}>
            <AtlasCard tasks={modules.atlas} />
          </ModuleCardWrapper>

          <ModuleCardWrapper index={1}>
            <JourneyCard moments={modules.journey} />
          </ModuleCardWrapper>

          <ModuleCardWrapper index={2}>
            <StudioCard episodes={modules.studio} />
          </ModuleCardWrapper>

          <ModuleCardWrapper index={3}>
            <ConnectionsCard connections={modules.connections} />
          </ModuleCardWrapper>
        </motion.div>
      )}
    </div>
  );
}

function ModuleCardWrapper({
  children,
  index
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={{
        hidden: { scale: 0.8, opacity: 0, y: 30 },
        visible: {
          scale: 1,
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
          }
        }
      }}
      whileHover={{
        scale: 1.03,
        transition: { duration: 0.2 }
      }}
      className="cursor-pointer"
    >
      {children}
    </motion.div>
  );
}

// Module Cards

function AtlasCard({ tasks }: { tasks: AtlasTask[] }) {
  const priorityLabels: Record<string, string> = {
    urgent_important: 'Urgente',
    not_urgent_important: 'Importante',
    urgent_not_important: 'Delegavel',
    not_urgent_not_important: 'Baixa'
  };

  return (
    <div className="p-8 rounded-[24px] h-full bg-white/60 backdrop-blur-sm border border-white/40 shadow-[4px_4px_20px_rgba(163,158,145,0.12)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-ceramic-info/10 border border-ceramic-info/20 shadow-inner">
          📋
        </div>
        <div>
          <h4 className="text-lg font-black text-ceramic-text-primary tracking-tight">Atlas</h4>
          <p className="text-xs font-bold text-ceramic-text-secondary/60 uppercase tracking-widest">{tasks.length} Tarefas</p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {tasks.slice(0, 2).map((task) => (
          <div
            key={task.id}
            className="p-3 rounded-xl bg-white/50 border border-white/60"
          >
            <p className="text-sm text-ceramic-text-primary font-medium line-clamp-1">
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'urgent_important'
                  ? 'bg-ceramic-error/10 text-ceramic-error'
                  : 'bg-ceramic-accent/10 text-ceramic-accent'
                  }`}
              >
                {priorityLabels[task.priority]}
              </span>
              {task.scheduled_time && (
                <span className="text-xs text-ceramic-text-secondary">
                  {new Date(task.scheduled_time).toLocaleDateString('pt-BR', { weekday: 'short' })}
                </span>
              )}
            </div>
          </div>
        ))}
        {tasks.length > 2 && (
          <p className="text-xs text-ceramic-text-secondary text-center pt-2">
            +{tasks.length - 2} mais tarefas
          </p>
        )}
      </div>
    </div>
  );
}

function JourneyCard({ moments }: { moments: JourneyMoment[] }) {
  const sentimentEmoji: Record<string, string> = {
    positive: '😊',
    neutral: '😐',
    negative: '😔'
  };

  return (
    <div className="p-8 rounded-[24px] h-full bg-white/60 backdrop-blur-sm border border-white/40 shadow-[4px_4px_20px_rgba(163,158,145,0.12)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-ceramic-accent/10 border border-ceramic-accent/20 shadow-inner">
          ✨
        </div>
        <div>
          <h4 className="text-lg font-black text-ceramic-text-primary tracking-tight">Journey</h4>
          <p className="text-xs font-bold text-ceramic-text-secondary/60 uppercase tracking-widest">{moments.length} Momentos</p>
        </div>
      </div>

      {/* Moments List */}
      <div className="space-y-2">
        {moments.slice(0, 2).map((moment) => (
          <div
            key={moment.id}
            className="p-3 rounded-xl bg-white/50 border border-white/60"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{sentimentEmoji[moment.sentiment]}</span>
              <p className="text-sm text-ceramic-text-primary line-clamp-2 flex-1">
                {moment.content}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-ceramic-accent font-medium">
                +{moment.consciousness_points} PC
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudioCard({ episodes }: { episodes: StudioEpisode[] }) {
  return (
    <div className="p-8 rounded-[24px] h-full bg-white/60 backdrop-blur-sm border border-white/40 shadow-[4px_4px_20px_rgba(163,158,145,0.12)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-ceramic-accent/10 border border-ceramic-accent/20 shadow-inner">
          🎙️
        </div>
        <div>
          <h4 className="text-lg font-black text-ceramic-text-primary tracking-tight">Studio</h4>
          <p className="text-xs font-bold text-ceramic-text-secondary/60 uppercase tracking-widest">{episodes.length} Ideias</p>
        </div>
      </div>

      {/* Episodes List */}
      <div className="space-y-2">
        {episodes.slice(0, 2).map((episode) => (
          <div
            key={episode.id}
            className="p-3 rounded-xl bg-white/50 border border-white/60"
          >
            <p className="text-sm text-ceramic-text-primary font-medium line-clamp-1">
              {episode.title}
            </p>
            {episode.potential_guests.length > 0 && (
              <p className="text-xs text-ceramic-text-secondary mt-1">
                🎤 {episode.potential_guests.join(', ')}
              </p>
            )}
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-ceramic-accent/10 text-ceramic-accent">
                Ideia
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionsCard({ connections }: { connections: Connection[] }) {
  const healthEmoji: Record<string, string> = {
    strong: '💚',
    moderate: '💛',
    declining: '🔴'
  };

  const healthLabel: Record<string, string> = {
    strong: 'Ativo',
    moderate: 'Moderado',
    declining: 'Requer atencao'
  };

  return (
    <div className="p-8 rounded-[24px] h-full bg-white/60 backdrop-blur-sm border border-white/40 shadow-[4px_4px_20px_rgba(163,158,145,0.12)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-ceramic-success/10 border border-ceramic-success/20 shadow-inner">
          🤝
        </div>
        <div>
          <h4 className="text-lg font-black text-ceramic-text-primary tracking-tight">Connections</h4>
          <p className="text-xs font-bold text-ceramic-text-secondary/60 uppercase tracking-widest">{connections.length} Redes</p>
        </div>
      </div>

      {/* Connections List */}
      <div className="space-y-2">
        {connections.slice(0, 2).map((connection, index) => (
          <div
            key={index}
            className="p-3 rounded-xl bg-white/50 border border-white/60"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-ceramic-text-primary font-medium">
                {connection.name}
              </p>
              <span className="text-lg">
                {healthEmoji[connection.relationship_health]}
              </span>
            </div>
            <p className="text-xs text-ceramic-text-secondary mt-1">
              {healthLabel[connection.relationship_health]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
