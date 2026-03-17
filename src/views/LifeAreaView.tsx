/**
 * LifeAreaView - Generic view for Life Area modules
 *
 * Renders a consistent view for Health, Education, Legal, and Professional modules.
 * Displays module-specific tasks with Ceramic Design System styling.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, BookOpen, Scale, Briefcase, Plus, CheckCircle2, Clock, LucideIcon } from 'lucide-react';
import { getModuleTasks } from '@/services/supabaseService';

// Module IDs that this view supports
export type LifeAreaModuleId = 'health' | 'education' | 'legal' | 'professional';

interface LifeAreaViewProps {
  moduleId: LifeAreaModuleId;
  onBack: () => void;
}

interface ModuleConfig {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

// Configuration for each life area module
const MODULE_CONFIG: Record<LifeAreaModuleId, ModuleConfig> = {
  health: {
    title: 'Saúde',
    subtitle: 'Habitos, métricas e bem-estar',
    icon: Heart,
    color: 'orange',
    accentBg: 'bg-ceramic-warning/10',
    accentBorder: 'border-ceramic-warning/20',
    accentText: 'text-ceramic-warning'
  },
  education: {
    title: 'Educação',
    subtitle: 'Cursos, aprendizado continuo',
    icon: BookOpen,
    color: 'blue',
    accentBg: 'bg-ceramic-info/10',
    accentBorder: 'border-ceramic-info/20',
    accentText: 'text-ceramic-info'
  },
  legal: {
    title: 'Juridico',
    subtitle: 'Documentos, contratos, processos',
    icon: Scale,
    color: 'slate',
    accentBg: 'bg-ceramic-text-secondary/10',
    accentBorder: 'border-ceramic-text-secondary/20',
    accentText: 'text-ceramic-text-secondary'
  },
  professional: {
    title: 'Profissional',
    subtitle: 'Carreira, projetos, metas',
    icon: Briefcase,
    color: 'indigo',
    accentBg: 'bg-ceramic-accent/10',
    accentBorder: 'border-ceramic-accent/20',
    accentText: 'text-ceramic-accent'
  }
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function LifeAreaView({ moduleId, onBack }: LifeAreaViewProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const config = MODULE_CONFIG[moduleId];
  const Icon = config.icon;

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const data = await getModuleTasks(moduleId);
        setTasks(data);
      } catch (error) {
        console.error(`Error loading tasks for ${moduleId}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [moduleId]);

  const pendingTasks = tasks.filter(t => !t.completed_at);
  const completedTasks = tasks.filter(t => t.completed_at);

  return (
    <div className="min-h-screen bg-ceramic-base pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ceramic-base/95 backdrop-blur-sm border-b border-ceramic-text-secondary/10">
        <div className="px-6 py-4 flex items-center gap-4">
          <motion.button
            onClick={onBack}
            className="w-10 h-10 ceramic-inset rounded-xl flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 text-ceramic-text-secondary" />
          </motion.button>
          <div>
            <p className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Módulo
            </p>
            <h1 className="text-lg font-bold text-ceramic-text-primary">
              {config.title}
            </h1>
          </div>
        </div>
      </div>

      <motion.div
        className="px-6 pt-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div
          variants={itemVariants}
          className={`ceramic-card p-6 relative overflow-hidden ${config.accentBg} ${config.accentBorder} border`}
        >
          {/* Background Icon */}
          <Icon className={`absolute -right-4 -bottom-4 w-32 h-32 ${config.accentText} opacity-10`} />

          <div className="relative z-10 flex items-center gap-4">
            <div className={`w-16 h-16 ceramic-inset rounded-2xl flex items-center justify-center ${config.accentBg}`}>
              <Icon className={`w-8 h-8 ${config.accentText}`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ceramic-text-primary">
                {config.title}
              </h2>
              <p className="text-sm text-ceramic-text-secondary">
                {config.subtitle}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="relative z-10 mt-6 flex gap-6">
            <div>
              <p className="text-2xl font-bold text-ceramic-text-primary">{pendingTasks.length}</p>
              <p className="text-xs text-ceramic-text-secondary">Pendentes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ceramic-text-primary">{completedTasks.length}</p>
              <p className="text-xs text-ceramic-text-secondary">Concluidas</p>
            </div>
          </div>
        </motion.div>

        {/* Tasks Section */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Tarefas Pendentes
            </h3>
            {pendingTasks.length > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.accentBg} ${config.accentText}`}>
                {pendingTasks.length}
              </span>
            )}
          </div>

          {loading ? (
            // Loading Skeleton
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="ceramic-card p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-ceramic-text-secondary/20" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-ceramic-text-secondary/20 rounded w-3/4" />
                      <div className="h-3 bg-ceramic-text-secondary/10 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : pendingTasks.length > 0 ? (
            // Task List
            <div className="space-y-3">
              {pendingTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  className="ceramic-card p-4 hover:scale-[1.01] transition-transform cursor-pointer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 ${config.accentBorder} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ceramic-text-primary line-clamp-2">
                        {task.title}
                      </p>
                      {task.due_date && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-ceramic-text-secondary" />
                          <span className="text-xs text-ceramic-text-secondary">
                            {new Date(task.due_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            // Empty State
            <div className="ceramic-inset p-8 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${config.accentBg} flex items-center justify-center`}>
                <Icon className={`w-8 h-8 ${config.accentText} opacity-50`} />
              </div>
              <h4 className="text-sm font-bold text-ceramic-text-primary mb-1">
                Nenhuma tarefa pendente
              </h4>
              <p className="text-xs text-ceramic-text-secondary mb-4">
                Adicione tarefas para organizar sua area de {config.title.toLowerCase()}
              </p>
              <motion.button
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${config.accentBg} ${config.accentText} font-bold text-sm`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                Adicionar Tarefa
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Completed Tasks Section (if any) */}
        {completedTasks.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Concluidas
              </h3>
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-ceramic-success/10 text-ceramic-success">
                {completedTasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {completedTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="ceramic-inset p-3 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-ceramic-success flex-shrink-0" />
                    <p className="text-sm text-ceramic-text-secondary line-through line-clamp-1">
                      {task.title}
                    </p>
                  </div>
                </div>
              ))}
              {completedTasks.length > 5 && (
                <p className="text-xs text-ceramic-text-secondary text-center py-2">
                  +{completedTasks.length - 5} tarefas concluidas
                </p>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default LifeAreaView;
