/**
 * CompletedTasksSection — Collapsible section showing today's completed tasks
 *
 * Default: collapsed. Expanded shows strikethrough tasks with "Desfazer" button.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Undo2 } from 'lucide-react';
import type { Task } from '@/types';

interface CompletedTasksSectionProps {
  tasks: Task[];
  onUncomplete: (taskId: string) => void;
  isLoading?: boolean;
}

export const CompletedTasksSection: React.FC<CompletedTasksSectionProps> = ({
  tasks,
  onUncomplete,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0 && !isLoading) return null;

  return (
    <div className="mt-4">
      {/* Header toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-ceramic-cool/50 transition-colors"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
        </motion.div>
        <span className="text-sm font-medium text-ceramic-text-secondary">
          Concluidas <span className="text-ceramic-success font-bold">({tasks.length})</span>
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
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-ceramic-cool/30 opacity-60"
                  >
                    {/* Green check icon */}
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-ceramic-success/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-ceramic-success" />
                    </div>

                    {/* Task title (strikethrough) */}
                    <span className="flex-1 text-sm text-ceramic-text-secondary line-through truncate">
                      {task.title}
                    </span>

                    {/* Completed time */}
                    {task.completed_at && !isNaN(new Date(task.completed_at).getTime()) && (
                      <span className="text-xs text-ceramic-text-secondary/60 flex-shrink-0">
                        {new Date(task.completed_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}

                    {/* Undo button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUncomplete(task.id);
                      }}
                      className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-ceramic-info hover:bg-ceramic-info/10 transition-colors"
                    >
                      <Undo2 className="w-3 h-3" />
                      Desfazer
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
