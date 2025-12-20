import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit3,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Archive,
  Play,
  Pause,
  MoreVertical,
  Tag,
  Clock,
} from 'lucide-react';
import { Project } from '../services/projectService';
import { useProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { TaskList } from './TaskList';

interface ProjectDetailProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

/**
 * ProjectDetail - Modal/Drawer showing full project details
 *
 * Features:
 * - Header with icon, title, status dropdown
 * - Large progress bar
 * - Task list (reuses TaskList component filtered by project)
 * - Add task to project button
 * - Information section (description, dates)
 * - Actions: edit, archive, delete
 */
export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const { project, tasks, loading, updateProject, deleteProject, refresh } = useProject(projectId);
  const { updateProject: updateProjectMutation } = useUpdateProject(projectId);
  const { deleteProject: deleteProjectMutation } = useDeleteProject();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Initialize edit form when project loads
  useEffect(() => {
    if (project) {
      setEditTitle(project.title);
      setEditDescription(project.description || '');
      setEditIcon(project.icon || '📋');
      setEditColor(project.color || '#3B82F6');
      setEditTargetDate(project.target_date || '');
    }
  }, [project]);

  if (!project) {
    return null;
  }

  // Calculate progress
  const totalTasks = project.total_tasks || 0;
  const completedTasks = project.completed_tasks || 0;
  const progressPercentage = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // Status options
  const statusOptions: Array<{ value: Project['status']; label: string; icon: any; color: string }> = [
    { value: 'active', label: 'Ativo', icon: Play, color: 'text-green-600' },
    { value: 'on_hold', label: 'Em Pausa', icon: Pause, color: 'text-yellow-600' },
    { value: 'completed', label: 'Concluído', icon: CheckCircle2, color: 'text-blue-600' },
    { value: 'archived', label: 'Arquivado', icon: Archive, color: 'text-gray-600' },
  ];

  const currentStatus = statusOptions.find(s => s.value === project.status) || statusOptions[0];
  const StatusIcon = currentStatus.icon;

  // Handle status change
  const handleStatusChange = async (newStatus: Project['status']) => {
    await updateProject({ status: newStatus });
    setShowStatusMenu(false);
    onUpdate?.();
    refresh();
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    const updated = await updateProjectMutation({
      title: editTitle,
      description: editDescription,
      icon: editIcon,
      color: editColor,
      target_date: editTargetDate || undefined,
    });

    if (updated) {
      setIsEditing(false);
      onUpdate?.();
      refresh();
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja arquivar este projeto?')) return;

    const success = await deleteProjectMutation(projectId);
    if (success) {
      onUpdate?.();
      onClose();
    }
  };

  // Color presets
  const colorPresets = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ];

  // Emoji presets
  const emojiPresets = ['📋', '🎯', '🚀', '💼', '🏆', '⭐', '🔥', '💡', '🎨', '📚', '🏠', '💰'];

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não definida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-ceramic-base z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-ceramic-base/95 backdrop-blur-lg border-b border-ceramic-text-secondary/10 z-10">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  {/* Icon + Title */}
                  <div className="flex items-center gap-3 flex-1">
                    {isEditing ? (
                      <>
                        {/* Emoji picker */}
                        <div className="relative">
                          <div
                            className="ceramic-concave w-14 h-14 rounded-xl flex items-center justify-center text-3xl cursor-pointer"
                            style={{ backgroundColor: `${editColor}15` }}
                          >
                            {editIcon}
                          </div>
                          <div className="absolute top-full mt-2 ceramic-card p-2 rounded-xl grid grid-cols-6 gap-1 shadow-lg">
                            {emojiPresets.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => setEditIcon(emoji)}
                                className={`w-8 h-8 text-xl hover:scale-110 transition-transform ${
                                  editIcon === emoji ? 'ceramic-concave' : ''
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Title input */}
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 text-2xl font-bold text-ceramic-text-primary bg-transparent border-b-2 border-ceramic-accent focus:outline-none"
                          placeholder="Nome do projeto"
                        />
                      </>
                    ) : (
                      <>
                        <div
                          className="ceramic-concave w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                          style={{ backgroundColor: `${project.color}15` }}
                        >
                          {project.icon}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-ceramic-text-primary">
                            {project.title}
                          </h2>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-ceramic-text-secondary/10 transition-colors"
                  >
                    <X className="w-6 h-6 text-ceramic-text-secondary" />
                  </button>
                </div>

                {/* Status dropdown + Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusMenu(!showStatusMenu)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl ceramic-card hover:shadow-md transition-all"
                      disabled={isEditing}
                    >
                      <StatusIcon className={`w-4 h-4 ${currentStatus.color}`} />
                      <span className="font-bold text-sm">{currentStatus.label}</span>
                      <MoreVertical className="w-3 h-3 text-ceramic-text-secondary" />
                    </button>

                    <AnimatePresence>
                      {showStatusMenu && (
                        <motion.div
                          className="absolute top-full mt-2 left-0 ceramic-card p-2 rounded-xl shadow-lg min-w-[160px] z-20"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          {statusOptions.map(option => {
                            const Icon = option.icon;
                            return (
                              <button
                                key={option.value}
                                onClick={() => handleStatusChange(option.value)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-ceramic-text-secondary/10 transition-colors ${
                                  option.value === project.status ? 'bg-ceramic-text-secondary/5' : ''
                                }`}
                              >
                                <Icon className={`w-4 h-4 ${option.color}`} />
                                <span className="text-sm font-medium">{option.label}</span>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action buttons */}
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 rounded-xl ceramic-tray font-bold hover:shadow-md transition-all"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 rounded-xl ceramic-card hover:shadow-md transition-all"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4 text-ceramic-accent" />
                      </button>
                      <button
                        onClick={handleDelete}
                        className="p-2 rounded-xl ceramic-card hover:shadow-md hover:bg-red-50 transition-all"
                        title="Arquivar"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-6 pb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ceramic-text-secondary">
                    Progresso Geral
                  </span>
                  <span className="text-lg font-bold text-ceramic-text-primary">
                    {progressPercentage}%
                  </span>
                </div>
                <div className="ceramic-inset h-4 rounded-full overflow-hidden bg-ceramic-text-secondary/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${project.color}99, ${project.color})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="mt-2 text-sm text-ceramic-text-secondary text-center">
                  {completedTasks} de {totalTasks} {totalTasks === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div className="ceramic-card p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-ceramic-text-primary mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-ceramic-accent" />
                  Descrição
                </h3>
                {isEditing ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-ceramic-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-ceramic-accent resize-none"
                    placeholder="Adicione uma descrição para o projeto..."
                    rows={4}
                  />
                ) : (
                  <p className="text-ceramic-text-secondary">
                    {project.description || 'Nenhuma descrição adicionada.'}
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="ceramic-card p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-ceramic-text-primary mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-ceramic-accent" />
                  Informações
                </h3>

                {/* Color picker in edit mode */}
                {isEditing && (
                  <div>
                    <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                      Cor do Projeto
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {colorPresets.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            editColor === color ? 'ring-2 ring-ceramic-accent ring-offset-2' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Target date */}
                <div>
                  <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                    Data Alvo
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editTargetDate}
                      onChange={(e) => setEditTargetDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-ceramic-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-ceramic-text-primary">
                      <Calendar className="w-4 h-4 text-ceramic-accent" />
                      {formatDate(project.target_date)}
                    </div>
                  )}
                </div>

                {/* Started date */}
                <div>
                  <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                    Iniciado em
                  </label>
                  <div className="text-ceramic-text-primary">
                    {formatDate(project.started_at)}
                  </div>
                </div>

                {/* Completed date (if completed) */}
                {project.status === 'completed' && project.completed_at && (
                  <div>
                    <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                      Concluído em
                    </label>
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {formatDate(project.completed_at)}
                    </div>
                  </div>
                )}
              </div>

              {/* Tasks section */}
              <div className="ceramic-card p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-ceramic-text-primary mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-ceramic-accent" />
                  Tarefas do Projeto
                </h3>

                {/* Task list filtered by project */}
                {loading ? (
                  <div className="text-center py-8 text-ceramic-text-secondary">
                    Carregando tarefas...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="ceramic-inset w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-8 h-8 text-ceramic-accent" />
                    </div>
                    <p className="text-ceramic-text-secondary mb-4">
                      Nenhuma tarefa neste projeto ainda
                    </p>
                    <p className="text-xs text-ceramic-text-tertiary">
                      Crie tarefas e vincule-as a este projeto
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <div key={task.id} className="ceramic-tray p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Circle className="w-5 h-5 text-ceramic-text-secondary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-ceramic-text-primary truncate">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-ceramic-text-secondary truncate">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
