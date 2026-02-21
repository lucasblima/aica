/**
 * TaskKanbanView — Kanban board for tasks with 4 status columns
 *
 * Does NOT create its own DndContext — uses parent context from AgendaView.
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import type { Task } from '@/types';
import { SwipeableTaskCard } from '@/components/domain/SwipeableTaskCard';
import { staggerContainer, staggerItem } from '@/lib/animations/ceramic-motion';

interface TaskKanbanViewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onMoveTask: (taskId: string, newStatus: string) => void;
  isLoading: boolean;
}

interface KanbanColumnConfig {
  id: string;
  title: string;
  color: string;
  dotColor: string;
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: 'todo', title: 'A Fazer', color: 'bg-sky-50', dotColor: 'bg-sky-500' },
  { id: 'in_progress', title: 'Em Progresso', color: 'bg-amber-50', dotColor: 'bg-amber-500' },
  { id: 'completed', title: 'Concluído', color: 'bg-emerald-50', dotColor: 'bg-emerald-500' },
  { id: 'cancelled', title: 'Cancelado', color: 'bg-stone-50', dotColor: 'bg-stone-400' },
];

/** Single Kanban column with drop zone */
const KanbanColumn: React.FC<{
  column: KanbanColumnConfig;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  isLoading: boolean;
}> = ({ column, tasks, onOpenTask, onCompleteTask, isLoading }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `kanban-${column.id}` });

  return (
    <div
      ref={setNodeRef}
      data-container-type="kanban-column"
      className={`flex flex-col min-w-[280px] max-w-[320px] rounded-2xl transition-all ${
        isOver ? 'ring-2 ring-amber-400 bg-amber-50/50' : 'bg-ceramic-cool/30'
      }`}
    >
      {/* Column header */}
      <div className={`p-3 rounded-t-2xl ${column.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
            <h3 className="text-xs font-bold text-ceramic-text-primary uppercase tracking-wide">
              {column.title}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-ceramic-text-secondary bg-white/60 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-320px)]">
        <SortableContext
          id={`kanban-${column.id}`}
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="ceramic-card p-3 animate-pulse">
                  <div className="h-4 bg-ceramic-text-secondary/10 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-ceramic-text-secondary/10 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="w-6 h-6 text-ceramic-text-secondary/20 mb-2" />
              <p className="text-[10px] text-ceramic-text-secondary/50">Vazio</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              {tasks.map(task => (
                <motion.div key={task.id} variants={staggerItem}>
                  <SwipeableTaskCard
                    task={task}
                    onOpen={onOpenTask}
                    onComplete={onCompleteTask}
                    showQuadrantBorder={true}
                    compact
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export const TaskKanbanView: React.FC<TaskKanbanViewProps> = ({
  tasks,
  onOpenTask,
  onCompleteTask,
  onMoveTask,
  isLoading,
}) => {
  // Group tasks by status
  const columns = KANBAN_COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => {
      const status = t.status || 'todo';
      // Map 'pending' to 'todo' for consistency
      const normalized = status === 'pending' ? 'todo' : status;
      return normalized === col.id;
    }),
  }));

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={col.tasks}
            onOpenTask={onOpenTask}
            onCompleteTask={onCompleteTask}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
};
