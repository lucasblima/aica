import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Briefcase, GraduationCap, Users, Plus } from 'lucide-react';
import { useCardSelection } from '../hooks/useCardSelection';

interface Archetype {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  action: string;
  gradient: string;
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'habitat',
    name: 'Habitat',
    description: 'Condomínio e residência',
    icon: Home,
    action: 'Conectar',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'ventures',
    name: 'Ventures',
    description: 'Projetos e empresas',
    icon: Briefcase,
    action: 'Iniciar',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'academia',
    name: 'Academia',
    description: 'Cursos e mentorias',
    icon: GraduationCap,
    action: 'Explorar',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 'tribo',
    name: 'Tribo',
    description: 'Clubes e grupos',
    icon: Users,
    action: 'Participar',
    gradient: 'from-green-500 to-emerald-500'
  }
];

interface ConnectionArchetypesProps {
  onSelectArchetype: (archetypeId: string) => void;
  onCreateCustom: () => void;
  multiSelect?: boolean;
}

export const ConnectionArchetypes: React.FC<ConnectionArchetypesProps> = ({
  onSelectArchetype,
  onCreateCustom,
  multiSelect = true
}) => {
  const navigate = useNavigate();

  // Hook de seleção com elevação ceramic
  const {
    selectedIds,
    toggle,
    isSelected,
    getCardMotionProps,
    hasSelection
  } = useCardSelection({
    multiple: multiSelect,
    onChange: (ids) => {
      // Se não for multi-select e houver seleção, navega para a página do arquétipo
      if (!multiSelect && ids.length > 0) {
        const archetypeId = ids[0];
        console.log('[ConnectionArchetypes] Navegando para:', `/connections/${archetypeId}`);
        navigate(`/connections/${archetypeId}`);
        // Não chama callback - navegação é suficiente (evita abrir modal)
      }
    }
  });

  // Handler para clique em card - navega diretamente
  const handleCardClick = (archetypeId: string) => {
    if (!multiSelect) {
      // Modo single-select: navega diretamente (não chama callback para evitar abrir modal)
      console.log('[ConnectionArchetypes] Navegando para:', `/connections/${archetypeId}`);
      navigate(`/connections/${archetypeId}`);
    } else {
      // Modo multi-select: usa o toggle
      toggle(archetypeId);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-black text-ceramic-text-primary mb-2">
          Suas redes ganham forma
        </h2>
        <p className="text-sm text-ceramic-text-secondary max-w-md mx-auto">
          Escolha onde começar
        </p>
      </motion.div>

      {/* Grid de Arquétipos */}
      <motion.div
        className="grid grid-cols-2 gap-4 max-w-lg mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {ARCHETYPES.map((archetype) => {
          const Icon = archetype.icon;
          const selected = isSelected(archetype.id);

          return (
            <motion.button
              key={archetype.id}
              variants={cardVariants}
              {...getCardMotionProps(archetype.id)}
              onClick={() => handleCardClick(archetype.id)}
              className={`
                ${selected ? 'ceramic-elevated bg-ceramic-warm' : 'ceramic-inset-deep bg-ceramic-cool'}
                p-4 text-left rounded-xl
                transition-all duration-300
                hover:${selected ? 'bg-ceramic-warm-hover' : 'bg-ceramic-cool-hover'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Icon - Engraved Effect */}
                <Icon className={`flex-shrink-0 transition-all duration-300 ${
                  selected
                    ? 'w-7 h-7 text-ceramic-accent opacity-100'
                    : 'w-8 h-8 icon-engraved'
                }`} />

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-ceramic-text-primary mb-0.5">
                    {archetype.name}
                  </h4>
                  <p className="text-xs text-ceramic-text-secondary line-clamp-1">
                    {archetype.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Botão de confirmação (multi-select) */}
      {multiSelect && hasSelection && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <button
            onClick={() => selectedIds.forEach(id => onSelectArchetype(id))}
            className="ceramic-card px-6 py-3 text-sm font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform"
          >
            Continuar ({selectedIds.length})
          </button>
        </motion.div>
      )}

      {/* Opção Custom */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-4 justify-center mb-4">
          <div className="h-px w-16 bg-ceramic-text-secondary/20" />
          <span className="text-xs text-ceramic-text-secondary">ou</span>
          <div className="h-px w-16 bg-ceramic-text-secondary/20" />
        </div>

        <button
          onClick={onCreateCustom}
          className="inline-flex items-center gap-2 text-sm text-ceramic-text-secondary hover:text-ceramic-accent transition-colors"
        >
          <Plus className="w-4 h-4" />
          Criar personalizado
        </button>
      </motion.div>

      {/* Código de Convite */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button className="text-xs text-ceramic-text-secondary/60 hover:text-ceramic-text-secondary transition-colors">
          Código de convite
        </button>
      </motion.div>
    </div>
  );
};
