/**
 * CompletedTasksSection — Collapsible section showing today's completed tasks
 *
 * Default: collapsed. Expanded shows completed tasks with green celebration style.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Undo2 } from 'lucide-react';
import type { Task } from '@/types';

interface CompletedTasksSectionProps {
  tasks: Task[];
  onUncomplete: (taskId: string) => void | Promise<void>;
  isLoading?: boolean;
}

const itemSpring = {
  type: "spring" as const,
  stiffness: 280,
  damping: 22,
};

export const CompletedTasksSection: React.FC<CompletedTasksSectionProps> = ({
  tasks,
  onUncomplete,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0 && !isLoading) return null;

  // Natural language label
  const countLabel = tasks.length === 1
    ? '1 tarefa concluida'
    : `${tasks.length} tarefas concluidas`;

  return (
    <div className="mt-4">
      {/* Header toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl transition-colors ${
          isExpanded ? 'bg-ceramic-success/5' : 'hover:bg-ceramic-cool/50'
        }`}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={`w-4 h-4 ${isExpanded ? 'text-ceramic-success' : 'text-ceramic-text-secondary'}`} />
        </motion.div>

        {/* Green accent checkmark */}
        <div className="w-5 h-5 rounded-full bg-ceramic-success/15 flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-ceramic-success" />
        </div>

        <span className="text-sm font-medium text-ceramic-text-secondary">
          {countLabel}
        </span>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 px-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-ceramic-border border-t-ceramic-info rounded-full animate-spin" />
                </div>
              ) : (
                tasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ ...itemSpring, delay: idx * 0.03 }}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-ceramic-success/5 hover:bg-ceramic-success/10 transition-colors"
                  >
                    {/* Animated green check icon */}
                    <motion.div
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-ceramic-success/20 flex items-center justify-center"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={itemSpring}
                    >
                      <Check className="w-3.5 h-3.5 text-ceramic-success" />
                    </motion.div>

                    {/* Task title (strikethrough) */}
                    <span className="flex-1 text-sm text-ceramic-text-secondary line-through truncate">
                      {task.title}
                    </span>

                    {/* Completion time */}
                    {task.completed_at && !isNaN(new Date(task.completed_at).getTime()) && (
                      <span className="text-[11px] tabular-nums text-ceramic-text-secondary/50 flex-shrink-0">
                        {new Date(task.completed_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}

                    {/* Undo button: visible on hover (desktop), always visible (mobile) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUncomplete(task.id);
                      }}
                      className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-ceramic-info
                        opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                        hover:bg-ceramic-info/10 transition-all duration-150"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Desfazer</span>
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
