import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { getModuleTasks } from '@/services/supabaseService';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';

/**
 * Contextual descriptions for empty states in each module category
 */
const MODULE_DESCRIPTIONS: Record<string, string> = {
  health: 'Hábitos, métricas e bem-estar',
  education: 'Cursos, aprendizado contínuo',
  legal: 'Documentos, contratos, processos',
  professional: 'Carreira, projetos, metas',
  relationships: 'Conexões, família, amizades',
  finance: 'Orçamento, investimentos, planejamento',
};

interface ModuleCardProps {
  /** Unique identifier for the module (e.g., 'health', 'education', 'legal') */
  moduleId: string;
  /** Display title for the module */
  title: string;
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Base color name (e.g., 'emerald', 'orange', 'amber') */
  color: string;
  /** Tailwind classes for accent colors (background, border, text) */
  accentColor: string;
  /** Callback fired when tasks are loaded */
  onTasksLoaded?: (moduleId: string, taskCount: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ModuleCard - Normalized card component with consistent height and visual weight
 *
 * Displays a module's pending tasks with loading states, hover effects,
 * and a beautiful ceramic-style design. Used in the Home page Bento grid to show
 * various life modules like Health, Education, Legal, etc.
 *
 * Design Features:
 * - Consistent min-height (180px) for grid alignment
 * - Uniform padding (p-5) following Ceramic standards
 * - Framer Motion integration with cardElevationVariants
 * - Balanced visual weight with icon, header, and content
 *
 * @example
 * ```tsx
 * <ModuleCard
 *   moduleId="health"
 *   title="Saúde"
 *   icon={Heart}
 *   color="orange"
 *   accentColor="bg-orange-50 border-orange-100 text-orange-600"
 *   onTasksLoaded={(id, count) => console.log(`${id} has ${count} tasks`)}
 * />
 * ```
 */
export function ModuleCard({
  moduleId,
  title,
  icon: Icon,
  color,
  accentColor,
  onTasksLoaded,
  className = ''
}: ModuleCardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModuleTasks(moduleId).then(data => {
      setTasks(data);
      setLoading(false);
      onTasksLoaded?.(moduleId, data.length);
    });
  }, [moduleId, onTasksLoaded]);

  return (
    <motion.div
      className={`ceramic-card relative overflow-hidden p-5 min-h-[180px] flex flex-col cursor-pointer ${className}`}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
    >
      {/* Background decorative icon with engraved effect */}
      <div className="absolute -right-4 -bottom-4 w-32 h-32 icon-engraved">
        <Icon className={`w-full h-full ${accentColor.split(' ')[2]}`} />
      </div>

      {/* Card content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Icon + Title */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="ceramic-inset p-2">
              <Icon className={`w-5 h-5 ${accentColor.split(' ')[2]}`} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
              {title}
            </h3>
          </div>
          {/* Badge slot: Task count */}
          {!loading && tasks.length > 0 && (
            <div className={`ceramic-inset px-2 py-1 rounded-full ${accentColor.split(' ')[0]}`}>
              <span className={`text-[10px] font-bold ${accentColor.split(' ')[2]}`}>
                {tasks.length}
              </span>
            </div>
          )}
        </div>

        {/* Content: Task list (flexible space) */}
        <div className="flex-1 space-y-2 min-h-[60px]">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-ceramic-text-secondary/10 rounded w-3/4"></div>
              <div className="h-4 bg-ceramic-text-secondary/10 rounded w-1/2"></div>
            </div>
          ) : tasks.length > 0 ? (
            tasks.slice(0, 3).map(task => (
              <div key={task.id} className="flex items-start gap-2 group/task">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${accentColor.split(' ')[1]} group-hover/task:scale-125 transition-transform`}></div>
                <span className="text-xs font-medium text-ceramic-text-primary line-clamp-2 group-hover/task:text-ceramic-text-secondary transition-colors">
                  {task.title}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-ceramic-text-secondary text-center leading-relaxed">
                {MODULE_DESCRIPTIONS[moduleId] || 'Organize suas tarefas'}
              </p>
            </div>
          )}
        </div>

        {/* Footer: View all CTA (appears on hover) */}
        <div className="mt-3 pt-3 border-t border-ceramic-text-secondary/10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Ver tudo
          </span>
          <ChevronRight className="w-3 h-3 text-ceramic-text-secondary" />
        </div>
      </div>
    </motion.div>
  );
}

export default ModuleCard;
