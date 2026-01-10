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
      className="relative min-h-[600px] p-8 rounded-3xl"
      style={{
        background: '#F0EFE9',
        boxShadow: 'inset 4px 4px 8px rgba(163, 158, 145, 0.15), inset -4px -4px 8px rgba(255, 255, 255, 0.7)'
      }}
      role="region"
      aria-label="Informacoes organizadas"
      aria-live="assertive"
      aria-busy={isProcessing}
    >
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-3xl font-black text-[#5C554B] mb-2">
          Ordem
        </h3>
        <p className="text-[#8B8378]">
          Informacao estruturada, pronta para acao
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
            <p className="text-xl text-[#8B8378]">
              Aguardando processamento...
            </p>
            <p className="text-sm text-[#A39E91] mt-2">
              Clique em "Processar Meu Caos" para comecar
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
              className="h-[200px] rounded-2xl"
              style={{
                background: '#F0EFE9',
                boxShadow: '4px 4px 8px rgba(163, 158, 145, 0.2), -4px -4px 8px rgba(255, 255, 255, 0.9)'
              }}
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
    <div
      className="p-6 rounded-2xl h-full"
      style={{
        background: '#F0EFE9',
        boxShadow: '6px 6px 12px rgba(163, 158, 145, 0.2), -6px -6px 12px rgba(255, 255, 255, 0.9)'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
        >
          📋
        </div>
        <div>
          <h4 className="font-bold text-[#5C554B]">Atlas</h4>
          <p className="text-xs text-[#8B8378]">{tasks.length} tarefas identificadas</p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {tasks.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className="p-3 rounded-xl bg-white/50 border border-white/60"
          >
            <p className="text-sm text-[#5C554B] font-medium line-clamp-1">
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: task.priority === 'urgent_important' ? '#FEE2E2' : '#E0E7FF',
                  color: task.priority === 'urgent_important' ? '#DC2626' : '#4F46E5'
                }}
              >
                {priorityLabels[task.priority]}
              </span>
              {task.scheduled_time && (
                <span className="text-xs text-[#8B8378]">
                  {new Date(task.scheduled_time).toLocaleDateString('pt-BR', { weekday: 'short' })}
                </span>
              )}
            </div>
          </div>
        ))}
        {tasks.length > 3 && (
          <p className="text-xs text-[#8B8378] text-center pt-2">
            +{tasks.length - 3} mais tarefas
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
    <div
      className="p-6 rounded-2xl h-full"
      style={{
        background: '#F0EFE9',
        boxShadow: '6px 6px 12px rgba(163, 158, 145, 0.2), -6px -6px 12px rgba(255, 255, 255, 0.9)'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
        >
          ✨
        </div>
        <div>
          <h4 className="font-bold text-[#5C554B]">Journey</h4>
          <p className="text-xs text-[#8B8378]">{moments.length} momentos capturados</p>
        </div>
      </div>

      {/* Moments List */}
      <div className="space-y-2">
        {moments.slice(0, 3).map((moment) => (
          <div
            key={moment.id}
            className="p-3 rounded-xl bg-white/50 border border-white/60"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{sentimentEmoji[moment.sentiment]}</span>
              <p className="text-sm text-[#5C554B] line-clamp-2 flex-1">
                {moment.content}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-purple-600 font-medium">
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
    <div
      className="p-6 rounded-2xl h-full"
      style={{
        background: '#F0EFE9',
        boxShadow: '6px 6px 12px rgba(163, 158, 145, 0.2), -6px -6px 12px rgba(255, 255, 255, 0.9)'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
        >
          🎙️
        </div>
        <div>
          <h4 className="font-bold text-[#5C554B]">Studio</h4>
          <p className="text-xs text-[#8B8378]">{episodes.length} ideias de episodio</p>
        </div>
      </div>

      {/* Episodes List */}
      <div className="space-y-2">
        {episodes.slice(0, 3).map((episode) => (
          <div
            key={episode.id}
            className="p-3 rounded-xl bg-white/50 border border-white/60"
          >
            <p className="text-sm text-[#5C554B] font-medium line-clamp-1">
              {episode.title}
            </p>
            {episode.potential_guests.length > 0 && (
              <p className="text-xs text-[#8B8378] mt-1">
                🎤 {episode.potential_guests.join(', ')}
              </p>
            )}
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
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
    <div
      className="p-6 rounded-2xl h-full"
      style={{
        background: '#F0EFE9',
        boxShadow: '6px 6px 12px rgba(163, 158, 145, 0.2), -6px -6px 12px rgba(255, 255, 255, 0.9)'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
        >
          🤝
        </div>
        <div>
          <h4 className="font-bold text-[#5C554B]">Connections</h4>
          <p className="text-xs text-[#8B8378]">{connections.length} relacionamentos</p>
        </div>
      </div>

      {/* Connections List */}
      <div className="space-y-2">
        {connections.slice(0, 3).map((connection, index) => (
          <div
            key={index}
            className="p-3 rounded-xl bg-white/50 border border-white/60"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#5C554B] font-medium">
                {connection.name}
              </p>
              <span className="text-lg">
                {healthEmoji[connection.relationship_health]}
              </span>
            </div>
            <p className="text-xs text-[#8B8378] mt-1">
              {healthLabel[connection.relationship_health]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
