/**
 * TaskListView — Flat sorted list of tasks grouped by due date
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Calendar, Inbox } from 'lucide-react';
import type { Task } from '@/types';
import { SwipeableTaskCard } from '@/modules/agenda/components/cards/TaskCard';
import { staggerContainer, staggerItem } from '@/lib/animations/ceramic-motion';

interface TaskListViewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  isLoading: boolean;
}

/** Group tasks by due date into sections */
function groupTasksByDate(tasks: Task[]): { label: string; tasks: Task[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const groups: Record<string, Task[]> = {
    'Hoje': [],
    'Amanhã': [],
    'Esta Semana': [],
    'Sem Data': [],
  };

  tasks.forEach(task => {
    if (!task.due_date) {
      groups['Sem Data'].push(task);
    } else if (task.due_date === todayStr) {
      groups['Hoje'].push(task);
    } else if (task.due_date === tomorrowStr) {
      groups['Amanhã'].push(task);
    } else {
      const taskDate = new Date(task.due_date);
      if (taskDate >= today && taskDate <= endOfWeek) {
        groups['Esta Semana'].push(task);
      } else {
        groups['Sem Data'].push(task);
      }
    }
  });

  return Object.entries(groups)
    .filter(([, tasks]) => tasks.length > 0)
    .map(([label, tasks]) => ({ label, tasks }));
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  onOpenTask,
  onCompleteTask,
  isLoading,
}) => {
  const groups = groupTasksByDate(tasks);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="ceramic-card p-4 animate-pulse">
            <div className="h-4 bg-ceramic-text-secondary/10 rounded w-3/4 mb-2" />
            <div className="h-3 bg-ceramic-text-secondary/10 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="w-12 h-12 text-ceramic-text-secondary/30 mb-4" />
        <p className="text-sm font-medium text-ceramic-text-secondary">Nenhuma tarefa encontrada</p>
        <p className="text-xs text-ceramic-text-secondary/60 mt-1">Tente ajustar os filtros ou criar uma nova tarefa</p>
      </div>
    );
  }

  return (
    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {groups.map(group => (
          <div key={group.label}>
            {/* Sticky date header */}
            <div className="sticky top-0 z-10 bg-ceramic-base/95 backdrop-blur-sm py-2 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-widest">
                  {group.label}
                </h3>
                <span className="text-[10px] text-ceramic-text-secondary/60 font-medium">
                  {group.tasks.length}
                </span>
              </div>
            </div>

            {/* Task cards */}
            {group.tasks.map(task => (
              <motion.div key={task.id} variants={staggerItem}>
                <SwipeableTaskCard
                  task={task}
                  onOpen={onOpenTask}
                  onComplete={onCompleteTask}
                  showQuadrantBorder={true}
                />
              </motion.div>
            ))}
          </div>
        ))}
      </motion.div>
    </SortableContext>
  );
};
