import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, Pause, Archive } from 'lucide-react';
import { Project } from '../services/projectService';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

/**
 * ProjectCard - Visual card displaying project overview with progress
 *
 * Features:
 * - Icon/emoji and title
 * - Colored progress bar
 * - Task count (e.g., "5/12 tarefas")
 * - Status badge
 * - Target date
 * - Click to open details
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  // Calculate progress percentage
  const totalTasks = project.total_tasks || 0;
  const completedTasks = project.completed_tasks || 0;
  const progressPercentage = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // Get status configuration
  const getStatusConfig = (status: Project['status']) => {
    const configs = {
      active: {
        label: 'Ativo',
        color: 'bg-green-100 text-green-700 border-green-300',
        icon: CheckCircle2,
      },
      on_hold: {
        label: 'Em Pausa',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: Pause,
      },
      completed: {
        label: 'Concluído',
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: CheckCircle2,
      },
      archived: {
        label: 'Arquivado',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: Archive,
      },
    };

    return configs[status] || configs.active;
  };

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  // Format target date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Check if target date is approaching (within 7 days)
  const isApproaching = () => {
    if (!project.target_date) return false;
    const now = new Date();
    const target = new Date(project.target_date);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  // Check if target date is overdue
  const isOverdue = () => {
    if (!project.target_date) return false;
    const now = new Date();
    const target = new Date(project.target_date);
    return target < now && project.status !== 'completed';
  };

  return (
    <motion.div
      className="ceramic-card p-6 rounded-2xl cursor-pointer transition-all hover:shadow-lg"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Header: Icon + Title + Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon with custom color background */}
          <div
            className="ceramic-concave w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              backgroundColor: project.color ? `${project.color}15` : '#3B82F615',
            }}
          >
            {project.icon || '📋'}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-ceramic-text-primary truncate">
              {project.title}
            </h3>
            {project.description && (
              <p className="text-sm text-ceramic-text-secondary truncate mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.color} flex-shrink-0 ml-2`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ceramic-text-secondary">
            Progresso
          </span>
          <span className="text-sm font-bold text-ceramic-text-primary">
            {progressPercentage}%
          </span>
        </div>

        {/* Progress bar with gradient */}
        <div className="ceramic-inset h-3 rounded-full overflow-hidden bg-ceramic-text-secondary/10">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: project.color
                ? `linear-gradient(90deg, ${project.color}99, ${project.color})`
                : 'linear-gradient(90deg, #3B82F699, #3B82F6)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Task Count and Metadata */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Task count */}
        <div className="flex items-center gap-2">
          <div className="ceramic-concave p-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-ceramic-accent" />
          </div>
          <div>
            <div className="text-sm font-bold text-ceramic-text-primary">
              {completedTasks}/{totalTasks}
            </div>
            <div className="text-xs text-ceramic-text-secondary">
              {totalTasks === 1 ? 'tarefa' : 'tarefas'}
            </div>
          </div>
        </div>

        {/* Target Date */}
        {project.target_date && (
          <div className="flex items-center gap-2">
            <div className={`ceramic-concave p-2 rounded-lg ${
              isOverdue() ? 'bg-red-50' : isApproaching() ? 'bg-yellow-50' : ''
            }`}>
              {isOverdue() ? (
                <Clock className="w-4 h-4 text-red-600" />
              ) : isApproaching() ? (
                <Clock className="w-4 h-4 text-yellow-600" />
              ) : (
                <Calendar className="w-4 h-4 text-ceramic-accent" />
              )}
            </div>
            <div>
              <div className={`text-sm font-bold ${
                isOverdue() ? 'text-red-600' : isApproaching() ? 'text-yellow-600' : 'text-ceramic-text-primary'
              }`}>
                {formatDate(project.target_date)}
              </div>
              <div className="text-xs text-ceramic-text-secondary">
                {isOverdue() ? 'Atrasado' : isApproaching() ? 'Próximo' : 'Meta'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completion indicator for completed projects */}
      {project.status === 'completed' && (
        <motion.div
          className="mt-4 pt-4 border-t border-ceramic-text-secondary/10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">
              Concluído em {project.completed_at ? formatDate(project.completed_at) : 'data desconhecida'}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
