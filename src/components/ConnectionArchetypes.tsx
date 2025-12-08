import React from 'react';
import { motion } from 'framer-motion';
import { Home, Briefcase, GraduationCap, Users, Plus } from 'lucide-react';

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
    description: 'Gerencie seu condomínio e residência',
    icon: Home,
    action: 'Conectar',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'ventures',
    name: 'Ventures',
    description: 'Seus projetos e empresas',
    icon: Briefcase,
    action: 'Iniciar',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'academia',
    name: 'Academia',
    description: 'Cursos, mentorias e aprendizado',
    icon: GraduationCap,
    action: 'Explorar',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 'tribo',
    name: 'Tribo',
    description: 'Clubes e comunidades',
    icon: Users,
    action: 'Participar',
    gradient: 'from-green-500 to-emerald-500'
  }
];

interface ConnectionArchetypesProps {
  onSelectArchetype: (archetypeId: string) => void;
  onCreateCustom: () => void;
}

export const ConnectionArchetypes: React.FC<ConnectionArchetypesProps> = ({
  onSelectArchetype,
  onCreateCustom
}) => {
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
        type: "spring",
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
          Suas Esferas de Influência
        </h2>
        <p className="text-sm text-ceramic-text-secondary max-w-md mx-auto">
          Cada área da sua vida pode ter seu próprio espaço. Escolha onde começar.
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

          return (
            <motion.button
              key={archetype.id}
              variants={cardVariants}
              onClick={() => onSelectArchetype(archetype.id)}
              className="ceramic-card p-6 text-left hover:scale-[1.03] active:scale-[0.97] transition-transform duration-200 group relative overflow-hidden"
              whileHover={{ y: -4 }}
            >
              {/* Gradient Background (subtle) */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${archetype.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Icon Container */}
                <div className="ceramic-concave w-14 h-14 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Icon className="w-7 h-7 text-ceramic-text-secondary group-hover:text-ceramic-accent transition-colors" />
                </div>

                {/* Text */}
                <h3 className="text-lg font-black text-ceramic-text-primary mb-1">
                  {archetype.name}
                </h3>
                <p className="text-xs text-ceramic-text-secondary mb-4">
                  {archetype.description}
                </p>

                {/* CTA */}
                <span className="text-xs font-bold text-ceramic-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {archetype.action}
                </span>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

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
          Criar espaço personalizado
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
          Tem um código de convite?
        </button>
      </motion.div>
    </div>
  );
};
