/**
 * FloatingTaskPanel - Painel flutuante de próximos passos
 *
 * Exibe as próximas 3 tarefas pendentes do projeto, com:
 * - Indicador de prioridade (cores)
 * - Deadline se aplicável
 * - Botão para marcar como concluída
 * - Minimizável/expandível
 * - Dismissível (fecha com X)
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GrantTaskGenerator } from '../services/grantTaskGenerator';
import { syncGrantTasksToAtlas } from '../services/grantTaskSync';
import type { GrantTask } from '../services/grantTaskGenerator';
import type { GrantProject, GrantOpportunity } from '../types';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Floatingtaskpanel');

interface FloatingTaskPanelProps {
  project: GrantProject;
  opportunity: GrantOpportunity;
  documents?: any[];
  userId: string;
  onTaskComplete?: (taskId: string) => void;
  onDismiss?: () => void;
}

export function FloatingTaskPanel({
  project,
  opportunity,
  documents = [],
  userId,
  onTaskComplete,
  onDismiss
}: FloatingTaskPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [tasks, setTasks] = useState<GrantTask[]>([]);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  /**
   * Gera tarefas ao montar o componente
   */
  useEffect(() => {
    const allTasks = GrantTaskGenerator.generateAllTasks(project, opportunity, documents);
    const activeTasks = GrantTaskGenerator.getActiveTasks(allTasks);

    // Mostra apenas as próximas 3 tarefas
    setTasks(activeTasks.slice(0, 3));
  }, [project, opportunity, documents]);

  /**
   * Marca tarefa como concluída
   */
  const handleCompleteTask = async (taskId: string) => {
    setCompletingTask(taskId);

    try {
      // Sincroniza com Atlas (marca como done)
      await syncGrantTasksToAtlas(project.id, userId, true);

      // Remove da lista local
      setTasks(prev => prev.filter(t => t.id !== taskId));

      // Callback
      if (onTaskComplete) {
        onTaskComplete(taskId);
      }
    } catch (error) {
      log.error(Error completing task:', error);
    } finally {
      setCompletingTask(null);
    }
  };

  /**
   * Retorna cor baseada na prioridade
   */
  const getPriorityColor = (priority: GrantTask['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  /**
   * Retorna ícone baseado no tipo de tarefa
   */
  const getTaskIcon = (taskType: GrantTask['task_type']) => {
    switch (taskType) {
      case 'briefing':
        return <Lightbulb className="w-4 h-4" />;
      case 'deadline_reminder':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  /**
   * Formata prazo
   */
  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;

    const date = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Atrasado';
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays <= 7) return `${diffDays} dias`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (!isVisible || tasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
    >
      <div className="ceramic-card border-2 border-green-500/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ceramic-text-secondary/10">
          <div className="flex items-center gap-2">
            <div className="ceramic-concave p-2 rounded-lg">
              <Lightbulb className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ceramic-text-primary">
                Próximos Passos
              </h3>
              <p className="text-xs text-ceramic-text-tertiary">
                {tasks.length} {tasks.length === 1 ? 'tarefa pendente' : 'tarefas pendentes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ceramic-concave p-2 hover:scale-95 active:scale-90 transition-all"
              title={isExpanded ? 'Minimizar' : 'Expandir'}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
              ) : (
                <ChevronUp className="w-4 h-4 text-ceramic-text-secondary" />
              )}
            </button>

            {/* Dismiss */}
            <button
              onClick={() => {
                setIsVisible(false);
                if (onDismiss) onDismiss();
              }}
              className="ceramic-concave p-2 hover:scale-95 active:scale-90 transition-all"
              title="Fechar"
            >
              <X className="w-4 h-4 text-ceramic-text-secondary" />
            </button>
          </div>
        </div>

        {/* Task List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`ceramic-tray rounded-lg p-3 border ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {/* Icon */}
                        <div className="shrink-0 mt-0.5">
                          {getTaskIcon(task.task_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-ceramic-text-primary mb-1 line-clamp-2">
                            {task.title}
                          </h4>
                          <p className="text-xs text-ceramic-text-tertiary line-clamp-2">
                            {task.description}
                          </p>

                          {/* Deadline Badge */}
                          {task.due_date && (
                            <div className="flex items-center gap-1 mt-2">
                              <Clock className="w-3 h-3 text-ceramic-text-tertiary" />
                              <span className="text-xs text-ceramic-text-tertiary">
                                {formatDueDate(task.due_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Complete Button */}
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={completingTask === task.id}
                        className="ceramic-concave p-2 hover:scale-95 active:scale-90 disabled:opacity-50 disabled:hover:scale-100 transition-all shrink-0"
                        title="Marcar como concluída"
                      >
                        {completingTask === task.id ? (
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                    </div>

                    {/* Priority Badge */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="ceramic-concave px-2 py-0.5 rounded-full">
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {task.priority === 'critical' && '🔴 Crítico'}
                          {task.priority === 'high' && '🟠 Alto'}
                          {task.priority === 'medium' && '🔵 Médio'}
                          {task.priority === 'low' && '⚪ Baixo'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Footer */}
                <div className="text-center pt-2 border-t border-ceramic-text-secondary/10">
                  <p className="text-xs text-ceramic-text-tertiary">
                    💡 Tarefas sincronizadas com Atlas (Meu Dia)
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
